import azure.functions as func
import datetime
import json
import logging

from trigger.queue_trigger import bp as queue_trigger_bp

app = func.FunctionApp()
app.register_functions(queue_trigger_bp)