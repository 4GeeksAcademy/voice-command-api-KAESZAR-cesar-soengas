from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from groq import Groq

from src.app.core.config import get_settings
from src.app.schemas.voice import TranscriptionResponse

router = APIRouter(tags=["transcribe"])


@router.get("/")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Transcribir audio",
    description="Convierte el audio recibido en texto para que el frontend lo envíe a /instruction.",
    response_description="La transcripción del audio",
    responses={400: {"description": "El archivo de audio está vacío"}},
)
def transcribe_audio(
    file: UploadFile = File(..., description="Archivo de audio grabado"),
    language: str | None = Form(default=None, description="Idioma de transcripción, si se conoce"),
) -> TranscriptionResponse:
    audio = file.file.read()
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded audio file is empty",
        )

    settings = get_settings()
    client = Groq(
        api_key=settings.groq_api_key,
        timeout=settings.request_timeout_seconds,
    )
    transcription = client.audio.transcriptions.create(
        model=settings.groq_transcription_model,
        file=(file.filename or "recording.webm", audio, file.content_type or "application/octet-stream"),
        **({"language": language} if language else {}),
    )

    text = transcription.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Groq returned an empty transcription",
        )

    return TranscriptionResponse(transcription=text)
