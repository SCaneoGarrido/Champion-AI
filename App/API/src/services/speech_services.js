// speech_services.js 
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const logger = require('../utils/logger');
const axios = require('axios');

class SpeechService {
  #speech_key;
  #speech_endpoint;
  #speech_region;

  constructor() {
    this.#speech_key = process.env.SPEECH_KEY;
    this.#speech_endpoint = process.env.SPEECH_ENDPOINT;
    this.#speech_region = process.env.SPEECH_REGION;
  }
 
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
