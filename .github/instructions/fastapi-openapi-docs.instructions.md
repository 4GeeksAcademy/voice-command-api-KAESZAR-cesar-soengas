---
applyTo: "**/*.py"
description: "Guía para enriquecer la documentación OpenAPI auto-generada por FastAPI y Pydantic; aplicar al crear o modificar aplicaciones, modelos y endpoints."
---

# Guía para enriquecer la documentación auto-generada de FastAPI (Pydantic)

Guía reutilizable de buenas prácticas para mejorar la documentación OpenAPI que FastAPI genera automáticamente. Al crear o modificar la aplicación, los modelos Pydantic y las rutas, aplica las recomendaciones pertinentes sin cambiar el comportamiento funcional del proyecto.

## Metadatos de la aplicación

Configura el constructor de `FastAPI` para personalizar el título, la descripción y la versión que aparecen en la vista general de la documentación (`/docs` y `/redoc`).

```python
from fastapi import FastAPI

app = FastAPI(
    title="API de Usuarios",
    description="API para gestionar usuarios: creación, consulta y administración.",
    version="1.0.0",
)
```

## Enriquecer modelos Pydantic

Añade descripciones y ejemplos a los campos con `Field()`. Estos metadatos ayudan a documentar el modelo en el esquema de la API.

```python
from pydantic import BaseModel, Field


class User(BaseModel):
    id: int = Field(..., description="Identificador único para el usuario", example=123)
    name: str = Field(..., description="Nombre completo del usuario", example="Jane Doe")
    email: str = Field(
        ...,
        description="Dirección de correo electrónico del usuario",
        example="jane@example.com",
    )
```

## Documentar parámetros de ruta y consulta

Usa `Path()` y `Query()` para añadir descripciones y ejemplos a los parámetros de la URL y de la consulta. Estos metadatos aparecen en la sección de parámetros de cada endpoint.

```python
from fastapi import FastAPI, Path, Query

app = FastAPI()


@app.get("/users/{user_id}", tags=["Usuarios"])
async def read_user(
    user_id: int = Path(..., description="ID del usuario a consultar", example=123),
    verbose: bool = Query(False, description="Incluir información adicional", example=True),
):
    return {"user_id": user_id, "verbose": verbose}
```

## Usa etiquetas para organizar endpoints

Asigna etiquetas con el parámetro `tags` de cada ruta para agrupar los endpoints relacionados en la documentación interactiva de FastAPI.

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/users", tags=["Usuarios"])
async def list_users():
    return []
```

## Resumen y descripción de las rutas

- **`summary`**: una explicación corta, de una línea, que se muestra en la vista general de la documentación.
- **`description`**: una explicación más larga que aparece al ver los detalles del endpoint. Puede incluir Markdown.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class User(BaseModel):
    id: int
    name: str
    email: str


@app.post(
    "/users/",
    tags=["Usuarios"],
    summary="Crear un nuevo usuario",
    description="Crear un usuario con un ID único, nombre y correo electrónico.",
)
async def create_user(user: User):
    return user
```

## Documentar modelos de respuesta y respuestas de error

- **`response_model`**: define el esquema de la respuesta exitosa y valida los datos devueltos.
- **`status_code`**: código HTTP por defecto de la ruta.
- **`response_description`**: descripción de la respuesta exitosa.
- **`responses`**: documenta códigos de error adicionales (por ejemplo, `404` y `422`) con su descripción.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class User(BaseModel):
    id: int
    name: str
    email: str


@app.get(
    "/users/{user_id}",
    tags=["Usuarios"],
    summary="Obtener usuario por ID",
    description="Devuelve el usuario correspondiente al ID indicado.",
    response_model=User,
    response_description="Datos del usuario encontrado",
    responses={404: {"description": "Usuario no encontrado"}},
)
async def read_user(user_id: int):
    if user_id != 123:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return User(id=123, name="Jane Doe", email="jane@example.com")
```

## Marcar endpoints como obsoletos o renombrar operaciones

- **`deprecated=True`**: marca el endpoint como obsoleto y lo muestra tachado en la documentación.
- **`operation_id`**: identificador único de la operación en OpenAPI, útil para generadores de clientes.

```python
from fastapi import FastAPI

app = FastAPI()


@app.get(
    "/legacy/users",
    tags=["Usuarios"],
    deprecated=True,
    operation_id="list_legacy_users",
)
async def list_legacy_users():
    return []
```
