import json
import logging

import azure.durable_functions as df
import azure.functions as func

from config import Config
from shared.utils import validate_job_payload

bp = func.Blueprint()


@bp.queue_trigger(
    arg_name="msg",
    queue_name=Config.QUEUE_NAME,
    connection="AzureWebJobsStorage",
)
@bp.durable_client_input(client_name="client")
async def queue_trigger(msg: func.QueueMessage, client: df.DurableOrchestrationClient) -> None:
    """
    Cliente Durable: recibe el mensaje de la queue y arranca la orquestación STT.
    Usa el job_id como instance_id para poder rastrear la orquestación en el portal.
    """
    raw_body = msg.get_body().decode("utf-8")
    logging.info("Queue trigger activado. Message id: %s", msg.id)

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logging.error("Mensaje no es JSON válido: %s", raw_body)
        return

    if not validate_job_payload(payload):
        logging.error("Payload inválido (se esperaba {job_id}): %s", raw_body)
        return

    job_id = payload["job_id"]
    logging.info("Iniciando orquestación para job: %s", job_id)

    instance_id = await client.start_new(
        "stt_live_recording",
        instance_id=job_id,
        client_input=job_id,
    )
    logging.info("Orquestación iniciada. Instance ID: %s", instance_id)
