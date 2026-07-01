# Flow identifiers — valores almacenados en ai_job.flow
FLOW_LIVE_RECORDING = "flow_live_recording"


class JobStatus:
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStep:
    TRANSCRIPTION = "transcription"
    SUMMARY = "summary"
    NOTES = "notes"
    MIND_MAP = "mind_map"


ACTOR_TYPE = "azure_function"


class ErrorCode:
    STT_ENGINE_UNAVAILABLE = "STT_ENGINE_UNAVAILABLE"
    BLOB_DOWNLOAD_FAILED = "BLOB_DOWNLOAD_FAILED"
    AUDIO_CONVERSION_FAILED = "AUDIO_CONVERSION_FAILED"
    OPENAI_UNAVAILABLE = "OPENAI_UNAVAILABLE"
    CONTEXT_NOT_FOUND = "CONTEXT_NOT_FOUND"
    UNKNOWN_FLOW = "UNKNOWN_FLOW"
    INTERNAL_ERROR = "INTERNAL_ERROR"
