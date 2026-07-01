import azure.functions as func

from activities.ai_activity import bp as ai_activity_bp
from activities.completion_activity import bp as completion_activity_bp
from activities.context_activity import bp as context_activity_bp
from activities.transcription_activity import bp as transcription_activity_bp
from orchestrators.stt_live_recording import bp as orchestrator_bp
from trigger.queue_trigger import bp as queue_trigger_bp

app = func.FunctionApp()
app.register_functions(orchestrator_bp)
app.register_functions(context_activity_bp)
app.register_functions(transcription_activity_bp)
app.register_functions(ai_activity_bp)
app.register_functions(completion_activity_bp)
app.register_functions(queue_trigger_bp)
