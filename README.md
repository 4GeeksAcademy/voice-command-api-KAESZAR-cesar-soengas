# Voice Command API at 4Geeks Academy

<!-- hide -->

By [@ehiber](https://github.com/ehiber) and [other contributors](https://github.com/4GeeksAcademy/voice-command-api/graphs/contributors) at [4Geeks Academy](https://4geeksacademy.com/)

[![build by developers](https://img.shields.io/badge/build_by-Developers-blue)](https://4geeks.com)
[![4Geeks Academy](https://img.shields.io/twitter/follow/4geeksacademy?style=social&logo=x)](https://x.com/4geeksacademy)

_Lee estas instrucciones en [español](./README.es.md)._

<!-- endhide -->

---

## Overview

Voice Command API lets users manage tasks with voice commands. The frontend uses the browser's **Web Speech API** to turn speech into text, then sends the transcription to `POST /instruction`. The backend uses Groq to return a structured operation, and the frontend calls the corresponding `/tasks` endpoint.

Users can also type a transcription manually if their browser does not support speech recognition or they do not want to use the microphone.

## Instruction flow

1. The user speaks a command and grants microphone access to the browser, or types the command manually.
2. The browser transcribes speech and the frontend sends JSON to `POST /instruction`:

   ```json
   { "transcription": "add buy groceries to my list" }
   ```

3. The backend asks Groq to return only the routing instruction, for example:

   ```json
   {
     "endpoint": "/tasks",
     "method": "POST",
     "params": { "title": "Buy groceries" }
   }
   ```

4. The frontend sends the indicated `POST /tasks` request and displays the result.

The LLM chooses the operation; the backend must not infer intent using manual keyword matching. The `POST /transcribe` endpoint is also available for transcribing uploaded audio files with Groq, but **it is not part of the voice flow currently used by the frontend**.

## Endpoints

| Method | Path | Description | Typical response |
|---|---|---|---|
| `POST` | `/instruction` | Routes a transcription with Groq; does not execute the task operation. | `200` |
| `GET` | `/tasks` | Returns all tasks. | `200` |
| `POST` | `/tasks` | Creates a task and assigns an incremental ID. | `201` |
| `PUT` | `/tasks/{task_id}` | Replaces an existing task. | `200` |
| `PATCH` | `/tasks/{task_id}` | Partially updates a task. | `200` |
| `DELETE` | `/tasks/{task_id}` | Deletes a task. | `200` |
| `POST` | `/transcribe` | Transcribes a `multipart/form-data` audio upload; optional endpoint not used by the current frontend. | `200` |

`PUT`, `PATCH`, and `DELETE` return `404` when the task ID does not exist. FastAPI returns `422` when a request fails schema validation. Tasks are stored in a module-level in-memory list: they are cleared when the backend restarts, and IDs are not reused during a run.

A task has this shape:

```json
{
  "id": 1,
  "title": "Buy groceries",
  "done": false
}
```

## Requirements

- Python 3.11 or later.
- [uv](https://docs.astral.sh/uv/) to install and run the backend.
- Node.js and npm for the frontend.
- A Groq API key for `POST /instruction`.
- A browser that supports Web Speech API and microphone permission for voice input. Manual transcription is available as a fallback.

## Run locally

Clone the repository and change into the project directory:

```bash
git clone https://github.com/4GeeksAcademy/voice-command-api
cd voice-command-api
```

### 1. Configure the backend

Create a `.env` file in the repository root:

```env
GROQ_API_KEY=your_groq_api_key
```

Do not share or commit this file: `.env` is listed in `.gitignore`. Configuration also supports `GROQ_MODEL`, `GROQ_TRANSCRIPTION_MODEL`, `REQUEST_TIMEOUT_SECONDS`, and `ALLOWED_ORIGINS`. If `ALLOWED_ORIGINS` is not set, the API allows `http://localhost:5173` and `http://127.0.0.1:5173`.

Install dependencies and start the API from the repository root:

```bash
uv sync
uv run uvicorn src.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive API documentation is available at [`http://localhost:8000/docs`](http://localhost:8000/docs).

### 2. Configure the frontend

In a separate terminal, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Install dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Restart the relevant server after changing an `.env` file so the new value is loaded.

### GitHub Codespaces

In Codespaces, create the same `.env` files. To make the API reachable outside the container, start Uvicorn on all interfaces:

```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

In `frontend/.env`, use the forwarded URL for port `8000` instead of `localhost`, for example `VITE_API_BASE_URL=https://<forwarded-port-8000-url>`. Add the forwarded frontend origin (port `5173`) to the backend's `ALLOWED_ORIGINS` setting. Set the forwarded ports' visibility as required by your environment. Never put the Groq API key in a `VITE_*` variable or in the frontend.

## Quick check

With the backend running, list the tasks:

```bash
curl http://localhost:8000/tasks
```

Create a task directly to check the endpoint:

```bash
curl -X POST http://localhost:8000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries"}'
```

To try voice input, open the frontend, grant microphone permission, and say a command such as “add buy groceries to my list.” The conversation displays the transcription and final response. Browser speech recognition may require an internet connection and depends on browser support; manual transcription is another option when available.

## Development and delivery

Build the frontend with:

```bash
cd frontend
npm run build
```

Before publishing the repository, make sure credential-bearing `.env` files are not included. Never commit your Groq API key.
