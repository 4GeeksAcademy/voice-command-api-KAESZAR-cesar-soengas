from typing import Any

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    done: bool = False


class TaskReplace(BaseModel):
    title: str = Field(..., min_length=1)
    done: bool


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    done: bool | None = None


class Task(BaseModel):
    id: int = Field(..., description="Identificador único de la tarea", examples=[1])
    title: str = Field(..., description="Título de la tarea", examples=["Comprar leche"])
    done: bool = Field(
        default=False,
        description="Indica si la tarea está completada",
        examples=[False],
    )


class InstructionRequest(BaseModel):
    transcription: str = Field(..., min_length=1)


class InstructionPayload(BaseModel):
    endpoint: str = Field(..., min_length=1)
    method: str = Field(..., min_length=1)
    params: dict[str, Any] = Field(default_factory=dict)


class TranscribeFlowResponse(BaseModel):
    transcription: str = Field(..., min_length=1)
    instruction: InstructionPayload
    result: Any
