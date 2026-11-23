# Instrucciones para agentes

- **Alcance:** Trabaja únicamente en la feature o el paso que indique el usuario. No adelantes tareas ni apliques el plan completo por tu cuenta.
- **Cambios:** No realices cambios adicionales sin consultar al usuario.
- **Entregas:** No realices commits ni push; el usuario gestiona las entregas.
- **Al terminar:** Al finalizar cada paso, detente y espera la siguiente indicación del usuario.
- **Commit sugerido:** Al final de cada feature, proporciona un ejemplo de mensaje de commit, por ejemplo: `feat: descripción de la feature`.

- **Almacenamiento:** No uses bases de datos. Mantén todos los datos en una lista de Python en memoria. La lista se reinicia cada vez que se reinicia el servidor; ese comportamiento es el esperado para este proyecto.
- **Enrutamiento de instrucciones:** No implementes detección manual de intenciones en el endpoint `/instruction` (por ejemplo, `if "añade" in text`). Todas las decisiones de enrutamiento deben provenir de la respuesta del LLM.
- **Tecnologías y dependencias:** Usa FastAPI y Pydantic para la API y la validación. También están permitidos Uvicorn como servidor ASGI y el SDK oficial de Python de Groq para las funciones de LLM/transcripción del proyecto. No añadas otras bibliotecas de terceros ni integres otros servicios externos.
