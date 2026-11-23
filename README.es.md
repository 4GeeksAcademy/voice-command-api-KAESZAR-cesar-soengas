# Voice Command API en 4Geeks Academy

<!-- hide -->

Por [@ehiber](https://github.com/ehiber) y [otros contribuidores](https://github.com/4GeeksAcademy/voice-command-api/graphs/contributors) en [4Geeks Academy](https://4geeksacademy.com/)

[![build by developers](https://img.shields.io/badge/build_by-Developers-blue)](https://4geeks.com)
[![4Geeks Academy](https://img.shields.io/twitter/follow/4geeksacademy?style=social&logo=x)](https://x.com/4geeksacademy)

_Lee estas instrucciones en [inglés](./README.md)._

<!-- endhide -->

---

## Descripción

Voice Command API permite gestionar tareas usando comandos de voz. El frontend utiliza la **Web Speech API** del navegador para convertir voz a texto; luego envía la transcripción a `POST /instruction`. El backend usa Groq para devolver una operación estructurada y el frontend ejecuta la llamada correspondiente a `/tasks`.

También se puede escribir una transcripción manualmente si el navegador no admite reconocimiento de voz o no se desea usar el micrófono.

## Flujo de una instrucción

1. El usuario dicta un comando y concede permiso de micrófono al navegador, o escribe el comando manualmente.
2. El navegador transcribe la voz y el frontend envía JSON a `POST /instruction`:

   ```json
   { "transcription": "add buy groceries to my list" }
   ```

3. El backend consulta Groq y responde solo con la instrucción de routing, por ejemplo:

   ```json
   {
     "endpoint": "/tasks",
     "method": "POST",
     "params": { "title": "Buy groceries" }
   }
   ```

4. El frontend envía la solicitud `POST /tasks` indicada y muestra el resultado.

El LLM elige la operación; el backend no debe determinar la intención mediante búsquedas manuales de palabras. El endpoint `POST /transcribe` también está disponible para transcribir archivos de audio con Groq, pero **no forma parte del flujo de voz utilizado actualmente por el frontend**.

## Endpoints

| Método | Ruta | Descripción | Respuesta habitual |
|---|---|---|---|
| `POST` | `/instruction` | Enruta una transcripción usando Groq; no ejecuta la acción de tareas. | `200` |
| `GET` | `/tasks` | Devuelve todas las tareas. | `200` |
| `POST` | `/tasks` | Crea una tarea y le asigna un ID incremental. | `201` |
| `PUT` | `/tasks/{task_id}` | Reemplaza una tarea existente. | `200` |
| `PATCH` | `/tasks/{task_id}` | Actualiza parcialmente una tarea. | `200` |
| `DELETE` | `/tasks/{task_id}` | Elimina una tarea. | `200` |
| `POST` | `/transcribe` | Transcribe un archivo enviado como `multipart/form-data`; ruta opcional no utilizada por el frontend actual. | `200` |

Las operaciones `PUT`, `PATCH` y `DELETE` responden `404` si la tarea no existe. FastAPI devuelve `422` si la petición no satisface la validación del esquema. Las tareas se guardan en una lista en memoria: se pierden al reiniciar el backend y sus IDs no se reutilizan durante la ejecución.

Cada tarea tiene el formato:

```json
{
  "id": 1,
  "title": "Buy groceries",
  "done": false
}
```

## Requisitos

- Python 3.11 o superior.
- [uv](https://docs.astral.sh/uv/) para instalar y ejecutar el backend.
- Node.js y npm para el frontend.
- Una API key de Groq para `POST /instruction`.
- Un navegador compatible con Web Speech API y permiso de micrófono para usar voz. La entrada manual sigue disponible como alternativa.

## Ejecutar localmente

Clona el repositorio y entra en la carpeta del proyecto:

```bash
git clone https://github.com/4GeeksAcademy/voice-command-api
cd voice-command-api
```

### 1. Configurar el backend

Crea `.env` en la raíz del repositorio:

```env
GROQ_API_KEY=tu_clave_de_groq
```

No compartas ni subas este archivo: `.env` está incluido en `.gitignore`. La configuración también admite `GROQ_MODEL`, `GROQ_TRANSCRIPTION_MODEL`, `REQUEST_TIMEOUT_SECONDS` y `ALLOWED_ORIGINS`; si no se especifica `ALLOWED_ORIGINS`, se permiten `http://localhost:5173` y `http://127.0.0.1:5173`.

Instala las dependencias e inicia la API desde la raíz:

```bash
uv sync
uv run uvicorn src.main:app --reload
```

La API estará en `http://localhost:8000`. La documentación interactiva está en [`http://localhost:8000/docs`](http://localhost:8000/docs).

### 2. Configurar el frontend

En otra terminal, crea `frontend/.env` con:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Instala las dependencias y arranca Vite:

```bash
cd frontend
npm install
npm run dev
```

Abre la dirección local que muestre Vite, normalmente `http://localhost:5173`. Si modificas un archivo `.env`, reinicia el servidor correspondiente para que lea la configuración nueva.

### GitHub Codespaces

En Codespaces, configura los mismos archivos `.env`. Para que la API sea accesible desde fuera del contenedor, inicia Uvicorn escuchando en todas las interfaces:

```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

En `frontend/.env`, usa la URL reenviada del puerto `8000`, no `localhost`, por ejemplo `VITE_API_BASE_URL=https://<url-del-puerto-8000>`. Añade el origen reenviado del frontend (puerto `5173`) a `ALLOWED_ORIGINS` en el `.env` del backend. Marca los puertos como accesibles según lo requiera tu entorno. No pongas la API key de Groq en ninguna variable `VITE_*` ni en el frontend.

## Comprobación rápida

Con el backend activo, consulta la lista de tareas:

```bash
curl http://localhost:8000/tasks
```

Crea una tarea directamente para comprobar el endpoint:

```bash
curl -X POST http://localhost:8000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries"}'
```

Para probar el flujo de voz, abre el frontend, acepta el permiso de micrófono y dicta una orden, por ejemplo: “add buy groceries to my list”. La transcripción y la respuesta final aparecen en la conversación. El reconocimiento del navegador puede requerir conexión a internet y depende de la implementación del navegador; también puedes activar la transcripción manual cuando esté disponible.

## Desarrollo y entrega

El frontend se compila con:

```bash
cd frontend
npm run build
```

Antes de publicar el repositorio, confirma que los archivos `.env` con credenciales no estén incluidos. No se deben subir claves de Groq.
