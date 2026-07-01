import os


class Config:
    # Queue
    QUEUE_NAME: str = os.getenv("QUEUE_NAME", "championaiqueue")

    # PostgreSQL
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "champion_db")
    DB_USER: str = os.getenv("DB_USER", "champion_db_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = os.getenv("AzureWebJobsStorage", "")
    AZURE_BLOB_CONTAINER_NAME: str = os.getenv("AZURE_BLOB_CONTAINER_NAME", "audio")
    AZURE_BLOB_TMP_CONTAINER_NAME: str = os.getenv("AZURE_BLOB_TMP_CONTAINER_NAME", "tmp")

    # Azure Speech
    SPEECH_KEY: str = os.getenv("SPEECH_KEY", "")
    SPEECH_ENDPOINT: str = os.getenv("SPEECH_ENDPOINT", "")
    SPEECH_REGION: str = os.getenv("SPEECH_REGION", "")

    # Azure OpenAI
    OPENAI_KEY: str = os.getenv("OPENAI_KEY", "")
    OPENAI_ENDPOINT: str = os.getenv("OPENAI_ENDPOINT", "")
    OPENAI_API_VERSION: str = os.getenv("OPENAI_API_VERSION", "2024-02-01")
    OPENAI_DEPLOYMENT: str = os.getenv("OPENAI_DEPLOYMENT", "gpt-4o")
