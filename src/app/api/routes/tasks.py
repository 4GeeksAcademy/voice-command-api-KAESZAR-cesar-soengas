from fastapi import APIRouter, HTTPException, status

from src.app.schemas.voice import Task, TaskCreate, TaskReplace, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

tasks: list[dict[str, int | str | bool]] = []
next_task_id = 1


@router.get(
    "",
    response_model=list[Task],
    summary="Listar tareas",
    description="Devuelve todas las tareas almacenadas en memoria.",
    response_description="Lista de tareas",
)
def get_tasks() -> list[Task]:
    return [Task.model_validate(task) for task in tasks]


@router.post(
    "",
    response_model=Task,
    status_code=status.HTTP_201_CREATED,
    summary="Crear tarea",
    description="Crea una tarea y le asigna un identificador incremental.",
    response_description="La tarea creada",
)
def create_task(payload: TaskCreate) -> Task:
    global next_task_id

    task = {"id": next_task_id, "title": payload.title, "done": payload.done}
    tasks.append(task)
    next_task_id += 1
    return Task.model_validate(task)


@router.put(
    "/{task_id}",
    response_model=Task,
    summary="Reemplazar tarea",
    description="Reemplaza el título y el estado de una tarea existente.",
    response_description="La tarea reemplazada",
    responses={404: {"description": "Tarea no encontrada"}},
)
def replace_task(
    task_id: int,
    payload: TaskReplace,
) -> Task:
    for index, task in enumerate(tasks):
        if task["id"] == task_id:
            replacement = {"id": task_id, "title": payload.title, "done": payload.done}
            tasks[index] = replacement
            return Task.model_validate(replacement)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found",
    )


@router.patch(
    "/{task_id}",
    response_model=Task,
    summary="Actualizar tarea parcialmente",
    description="Actualiza el título y/o el estado de una tarea existente.",
    response_description="La tarea actualizada",
    responses={404: {"description": "Tarea no encontrada"}},
)
def update_task(
    task_id: int,
    payload: TaskUpdate,
) -> Task:
    for index, task in enumerate(tasks):
        if task["id"] == task_id:
            changes = payload.model_dump(exclude_unset=True, exclude_none=True)
            updated = {**task, **changes}
            tasks[index] = updated
            return Task.model_validate(updated)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found",
    )


@router.delete(
    "/{task_id}",
    response_model=dict[str, str],
    summary="Eliminar tarea",
    description="Elimina una tarea existente de la lista en memoria.",
    response_description="Confirmación de eliminación",
    responses={404: {"description": "Tarea no encontrada"}},
)
def delete_task(task_id: int) -> dict[str, str]:
    for task in tasks:
        if task["id"] == task_id:
            tasks.remove(task)
            return {"message": f"Task {task_id} deleted successfully"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found",
    )
