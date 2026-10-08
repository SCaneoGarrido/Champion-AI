const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response.helper');
/**
 *  Esto es lo que almacena en LocalStorage el app 
 *  LOG  
 * [KnowledgeWorkspaceScreen][fetchResult] - 
 * [
 *  "job_id",
 *  "user_id",
 *  "language_locale", campo requerido
 *  "language_name",
 *  "audio_format",
 *  "duration_seconds",
 *  "blob_name",
 *  "job_status",
 *  "current_step",
 *  "result_id",
 *  "transcription_text",campo requerido - contenido - (depende de lo elegido)
 *  "summary_text", campo requerido - contenido - (depende de lo elegido)
 *  "notes_text", campo requerido - contenido - (depende de lo elegido)
 *  "notes_json", 
 *  "mind_map_json",
 *  "generated_at"
 * ]
 */
/**
 * Necesito:
 * que idioma se escogio
 * que voz se ha escogido
 * que seccion transformamos? (Identificador para esto requerido)
 * que contenido transformamos? (El contenido crudo de algun campo)
 * 
 */

const ttscontroller = {
    texttospeechv1: async (req, res) => {
        try {
            // obtenemos lo datos de la solicitud.
            // Validamos los datos.
            // Si todo va bien enviamos a procesar a la cola.
            // Respondemos aceptado.
                                                
        } catch (error) {
            logger.error(`[ttscontroller][texttospeechv1] - Error en la conversion: ${error.message}`);
            sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }        
       } // texttospeechv1
}
