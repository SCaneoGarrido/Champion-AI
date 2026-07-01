import logging


def validate_job_payload(payload: dict) -> bool:
    if not payload or not isinstance(payload, dict):
        return False
    job_id = payload.get("job_id")
    if not job_id or not isinstance(job_id, str) or not job_id.strip():
        return False
    return True
