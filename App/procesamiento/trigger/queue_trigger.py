import azure.functions as func
import logging
import json
from config import Config
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

        # TODO: lógica de procesamiento aquí

    except json.JSONDecodeError:
        logging.warning("Message body is not valid JSON: %s", raw_body)
