from fastapi import APIRouter, HTTPException, status
from groq import Groq
from pydantic import ValidationError

from src.app.core.config import get_settings
from src.app.schemas.voice import InstructionPayload, InstructionRequest

router = APIRouter(tags=["instruction"])

INSTRUCTION_SYSTEM_PROMPT = """You route voice-command transcriptions to the task API.
Return only a valid JSON object with exactly these fields: endpoint, method, params.
Do not include markdown or explanatory text.

Available operations:
- List tasks: endpoint "/tasks", method "GET", params {}.
- Create a task: endpoint "/tasks", method "POST", params {"title": string} and optionally "done": boolean.
- Replace a task: endpoint "/tasks/{task_id}", method "PUT", params with integer "task_id", string "title", and boolean "done".
- Partially update a task: endpoint "/tasks/{task_id}", method "PATCH", params with integer "task_id" and only the requested "title" and/or "done" fields.
- Delete a task: endpoint "/tasks/{task_id}", method "DELETE", params with integer "task_id".

Choose the operation and extract its parameters from the user's transcription. Never invent a task ID or task title that the user did not provide. If a required value is missing or the request is unrelated to task management, use endpoint "/tasks", method "GET", params {}.
"""


@router.post(
    "/instruction",
    response_model=InstructionPayload,
    summary="Enrutar una instrucción de voz",
    description="Envía la transcripción a Groq y devuelve la operación de tareas estructurada.",
    response_description="La operación y sus parámetros, en formato JSON",
)
def route_instruction(
    payload: InstructionRequest,
) -> InstructionPayload:
    settings = get_settings()
    client = Groq(
        api_key=settings.groq_api_key,
        timeout=settings.request_timeout_seconds,
    )
    completion = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": INSTRUCTION_SYSTEM_PROMPT},
            {"role": "user", "content": payload.transcription},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    content = completion.choices[0].message.content
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Groq returned an empty instruction response",
        )

    try:
        return InstructionPayload.model_validate_json(content)
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Groq returned an invalid instruction response",
        ) from error
