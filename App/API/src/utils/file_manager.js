const path = require('path');
const logger = require('../utils/logger');



function validateExtensionFile(filePath) {
  try {
    let validExtension = process.env.FILE_EXTENSIONS_PERMITED;
    logger.debug('Validando extension del archivo...');

    // Remove inline comments after '#' or ';', strip quotes and whitespace
    validExtension = validExtension.split('#')[0].split(';')[0].trim();
    validExtension = validExtension.replace(/['"]/g, '');

    // Build allowed list (support comma-separated values, with or without leading dot)
    const allowed = validExtension
      .split(',')
      .map((s) => s.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean);


    logger.info('Variables de entorno permitidas> ' + allowed);
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');

    if (allowed.length === 0) {
      logger.warn('No hay extensiones configuradas en FILE_EXTENSIONS_PERMITED.');
      throw new Error('No estan configuradas las extensiones permitidas en las variables de entorno.');
    }

    if (allowed.includes(ext)) {
      logger.info('Extension de archivo permitida.');
      return true;
    }

    logger.warn(`Extension no permitida: .${ext} != ${allowed.join(',')}`);
    return false;

  } catch (error) {
    logger.error('Error al validar la extension del archivo,\n Detalles: ' + error);
    return false;
  }
};



module.exports = { validateExtensionFile };