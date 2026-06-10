const fs = require('fs');
const path = require('path');
const multer = require('multer');

/**
 * Crea un middleware de multer que guarda archivos en la carpeta especificada.
 * destPath puede ser absoluto o relativo al directorio del proyecto backend_tmp.
 * Opciones soportadas: preserveOriginal (boolean), limits (multer limits), fileFilter (fn)
 */
function createUploadMiddleware(destPath, options = {}) {
  // resolver a ruta absoluta; si ya es absoluta, la usamos tal cual
  const resolved = path.isAbsolute(destPath)
    ? destPath
    : path.join(__dirname, '..', '..', destPath);

  // asegurar que exista la carpeta destino
  try {
    fs.mkdirSync(resolved, { recursive: true });
  } catch (err) {
    // si falla, lanzar para que el caller lo note
    throw err;
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, resolved);
    },
    filename: function (req, file, cb) {
      // Nombre seguro: opcionalmente preservar nombre original o usar timestamp + extensión
      const original = file.originalname || 'file';
      const safeOriginal = original.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
      const ext = path.extname(safeOriginal) || '';
      const name = options.preserveOriginal ? safeOriginal : `${Date.now()}${ext}`;
      cb(null, name);
    }
  });

  return multer({ storage, limits: options.limits || undefined, fileFilter: options.fileFilter });
}

module.exports = { createUploadMiddleware };