require('dotenv').config();
const bcrypt = require('bcrypt');
const logger = require('../utils/logger.js');
const jwt = require('jsonwebtoken');

const PASSWORD_SALT_ROUNDS = 12; // mover a constantes

async function compareHash(plainPasswd, hashedPasswd) {
    try {
        logger.info('Iniciando comparacion de hash...');
        const result = await bcrypt.compare(plainPasswd, hashedPasswd);
        logger.info('Validacion completa...');
        return result;
    } catch (error) {
        logger.error('Error validando contrasenas: ' + error.message);
        return false;
    }
}

function generateJwtToken(user) {
    try {
        return jwt.sign({ id: user.user_id }, process.env.JWT_KEY, { expiresIn: '15m' });
    } catch (error) {
        logger.error('Error al generar JWT: ' + error.message);
        return null;
    }
}

function generateRefreshToken(user) {

    try {
        return jwt.sign({ id: user.user_id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
    } catch (error) {
        logger.error('Error al generar Refresh Token: ' + error.message);
        return null;
    }
}


async function generatePasswordHash(plainPassword) {
  const passwordHash = await bcrypt.hash(
    plainPassword,
    PASSWORD_SALT_ROUNDS
  );

  return {
    password_hash: passwordHash,
    password_algorithm: "bcrypt"
  };
}


module.exports = { compareHash, generateJwtToken, generateRefreshToken, generatePasswordHash };
