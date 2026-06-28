import azure.functions as func
import azure.durable_functions as df
import logging
import json
from config import Config
from shared.utils import orchestratorResolver, validateJobPayload
from shared.utils.logger import log_with_context, setup_logger

bp = func.Blueprint()


@bp.queue_trigger(
    arg_name="msg",
    queue_name=Config.QUEUE_NAME,
    connection="AzureWebJobsStorage",
)
def queue_trigger(msg: func.QueueMessage) -> None:
    raw_body = msg.get_body().decode("utf-8")
    logging.info("Queue trigger fired. Message id: %s", msg.id)

    try:
        payload = json.loads(raw_body)
        logging.info("Parsed payload: %s", payload)

        if not validateJobPayload(payload):
            log_with_context(setup_logger(), logging.ERROR, "[queue_trigger] validateJobPayload - Payload invalido")
            return None

        orchestrator = orchestratorResolver(payload["req_info"]["flow"])
        if orchestrator is None:
            log_with_context(setup_logger(), logging.ERROR, "[queue_trigger] orchestratorResolver - Flow invalido")
            return None



    except json.JSONDecodeError:
        logging.warning("Message body is not valid JSON: %s", raw_body)
