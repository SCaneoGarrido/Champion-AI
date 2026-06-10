const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const logger = require('../utils/logger');
const axios = require('axios');

require('dotenv').config();


class SpeechService {
  #speech_key;
  #speech_endpoint;
  #speech_region;

  constructor() {
    this.#speech_key = process.env.SPEECH_KEY;
    this.#speech_endpoint = process.env.SPEECH_ENDPOINT;
    this.#speech_region = process.env.SPEECH_REGION;
  }

  // metodos
  #createSpeechConfig() {
    try {

      const speechConfig = sdk.SpeechConfig.fromEndpoint(new URL(this.#speech_endpoint), this.#speech_key);
      logger.info("Configuracion del servicio SPEECH creado correctamente");
      return speechConfig;

    } catch (error) {
      logger.error("Error al crear configuracion del servicio SPEECH \nDetails: " + error.message)
      throw new Error("No se ha podido crear la configuracion del servicio speech");
    }
  };

  #createSpeechRecognizer(audioConfig, language) {
    const speechConfig = this.#createSpeechConfig();
    speechConfig.speechRecognitionLanguage = language; // Configurar el idioma aquí
    return new sdk.SpeechRecognizer(speechConfig, audioConfig);
  };

  #createSpeechSynthesizer(audioConfig, lenguage, voicename) {
    const speechConfig = this.#createSpeechConfig();
    speechConfig.speechSynthesisLanguage = lenguage;
    speechConfig.speechSynthesisVoiceName = voicename;
    return new sdk.SpeechSynthesizer(speechConfig, audioConfig);
  };

  recognizeFromFile(inputFile, language) {
    /**
     * Método para realizar reconocimiento continuo de texto desde un archivo de audio.
     * Además, interpreta el lenguaje hablado para entregar el texto reconocido.1 
     * Permite especificar el idioma para un mejor reconocimiento.
     * @param {string} inputFile
     * @param {string} language - Código del idioma (por ejemplo, 'en-US', 'es-ES').
     */
    return new Promise(async (resolve, reject) => {
      try {
        const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(inputFile));
        const speechRecognizer = this.#createSpeechRecognizer(audioConfig, language); // Pasar el idioma aquí

        let recognizedText = '';

        // Configurar eventos para el reconocimiento continuo
        speechRecognizer.recognized = (s, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            logger.info('Texto reconocido: ' + e.result.text);
            recognizedText += e.result.text + ' ';

          } else if (e.result.reason === sdk.ResultReason.NoMatch) {
            logger.warn('No se reconoció ningún texto en esta parte del audio.');
          }
        };

        speechRecognizer.sessionStopped = (s, e) => {
          logger.info('Sesión de reconocimiento detenida.');
          speechRecognizer.close();
          resolve(recognizedText.trim());
        };

        speechRecognizer.canceled = (s, e) => {
          if (e.reason === sdk.CancellationReason.EndOfStream || e.reason === 1) {
            logger.info('Reconocimiento completado: Fin del archivo de audio alcanzado. Resolviendo con el texto reconocido.');
            speechRecognizer.close();
            resolve(recognizedText.trim());
          } else {
            logger.error(`Reconocimiento cancelado. Razón: ${e.reason}. ErrorDetails: ${e.errorDetails || 'N/A'}`);
            speechRecognizer.close();
            reject(new Error(`El reconocimiento fue cancelado. Razón: ${e.reason}. Detalles: ${e.errorDetails || 'N/A'}`));
          }
        };

        // Iniciar el reconocimiento continuo
        logger.info(`Iniciando reconocimiento continuo desde archivo de audio con idioma: ${language}.`);
        speechRecognizer.startContinuousRecognitionAsync();
      } catch (error) {
        logger.error("Error al realizar reconocimiento continuo desde archivo de audio.\nDetails: " + error.message);
        reject(error);
      }
    });
  }

  async synthesizeToFile(text, outputFileName, lenguage, voicename) {
    /**
     * Metodo para sintetizar texto a un archivo de audio
     * 
     * @param {string} text 
     * @param {string} outputFileName 
     * @param {string} lenguage 
     * @param {string} voicename 
     */

    try {
      const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputFileName);
      const synthesizer = this.#createSpeechSynthesizer(audioConfig, lenguage, voicename);

      // Comenzar el sintetizador y esperar los resultados
      synthesizer.speakTextAsync(text, function (result) {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          logger.info("Sintesis completada para el texto ingresado");
        } else {
          logger.error("La sintesis de texto a audio no se completo correctamente. Reason: " + result.reason + " ErrorDetails: " + (result.errorDetails || 'N/A'));
        }
        synthesizer.close();
      }, function (err) {
        logger.error("Error al sintetizar texto a audio. \nDetails: " + err);
        synthesizer.close();
      });

      logger.info("Sintetizando texto a archivo de audio: " + outputFileName);
    } catch (error) {
      logger.error("Error al sintetizar texto a archivo de audio.\nDetails: " + error.message);
      throw error;
    }
  };

  async getVoicesByLang(lang) {
    const voices = await this.getAvailableLanguages();
    return voices.filter(voice => voice.Locale === lang);
  }

  async getAvailableLanguages() {
    try {
      const url = `https://${this.#speech_region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.#speech_key
        }
      });
      return response.data;  // Axios devuelve data directamente en response.data
    } catch (error) {
      logger.error("Error en 'getAvailableLanguages()'\nDetalles: " + error.message);
      throw error;
    }
  }
}

module.exports = SpeechService;
