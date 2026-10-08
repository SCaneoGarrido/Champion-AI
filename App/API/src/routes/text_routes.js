const express = require('express');
const { sendSuccess, sendError  } = require('../utils/response.helper');

const text_router = express.Router();


text_router.get('/text-to-speech', (req, res) => {
    // Endpoint encargado de convertir texto a voz
    // Recibira un texto de alguna de las secciones
    // Puede ser el resumen, notas, transcripcion, etc.


    sendSuccess(res, 'Text to Speech endpoint');
});