import logging
from logger import log_with_context, setup_logger
from constants import FLOW_RESOLVER

def orchestratorResolver(flow: str) -> str:
    try:
        orchestrator = FLOW_RESOLVER.get(flow)
        if orchestrator is None:
            log_with_context(setup_logger(), logging.ERROR, f"Flujo de ejecucion no existente, flujo solicitado: {flow}")
            return None
        return orchestrator
        
    except Exception as e:
        log_with_context(setup_logger(), logging.ERROR, "[__init__.py] orchestratorResolver", str(e))
        return None
    
def validateJobPayload(job_payload: dict) -> bool:
    try:
        expected_fields = ["user_id", "req_info", "audio_info"]
        if not job_payload:
            log_with_context(setup_logger(), logging.ERROR, "[__init__.py] validateJobPayload - Job payload es nulo")
            return False
        
        missing_fields = [field for field in expected_fields if field not in job_payload]
        if missing_fields:
            log_with_context(setup_logger(), logging.ERROR, f"[__init__.py] validateJobPayload - Faltan campos: {missing_fields}")
            return False

        for field in expected_fields:
            if not job_payload[field]:
                log_with_context(setup_logger(), logging.ERROR, f"[__init__.py] validateJobPayload - Campo {field} esta vacio")
                return False
    
        return True

    except Exception as e:
        log_with_context(setup_logger(), logging.ERROR, "[__init__.py] validateJobPayload", str(e))
        return False
    