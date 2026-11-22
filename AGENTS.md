# Instrucciones para agentes

- **Almacenamiento:** No uses bases de datos. Mantén todos los datos en una lista de Python en memoria. La lista se reinicia cada vez que se reinicia el servidor; ese comportamiento es el esperado para este proyecto.
- **Enrutamiento de instrucciones:** No implementes detección manual de intenciones en el endpoint `/instruction` (por ejemplo, `if "añade" in text`). Todas las decisiones de enrutamiento deben provenir de la respuesta del LLM.
- **Tecnologías y dependencias:** Usa únicamente FastAPI y Pydantic. No añadas otras bibliotecas de terceros ni integres otros servicios.
