const DatabaseService = require('../services/database_service');
const logger = require('../utils/logger')
const UserRepository = require("../repositories/user.repository");
const user_repository = new UserRepository();
const { compareHash, generateJwtToken, generateRefreshToken } = require('../helpers/auth_helpers');

class AuthService {
  constructor() {
    // por el momento no recibe nada
  }

  async ValidateUser(email, password) {
    /**
     * @param {String} email
     * @param {String} password
     * @returns {Object}
     */

    try {
      let user = await user_repository.getUserByEmail(email);
      if (!user) {
        logger.error('[AuthService][ValidateUser] usuario no encontrado');
        return null;
      }
      const password_hash = await user_repository.recoverHashedPassword(user.user_id);
      const comparedhashResult = await compareHash(password, password_hash);
      
      if (!comparedhashResult) {
        logger.error('[AuthService][ValidateUser] Error al comparar hashes, resultado: ' + comparedhashResult);
        return null;
      }

      // Genero los tokens JWT y Refresh token 
      let jwt = generateJwtToken(user);
      //let refreshjwt = generateRefreshToken(user);
    
      const validationResult = {
        success: true,
        data: {
          jwt: jwt,
          //refresh_token: refreshjwt
        }
      }

      return validationResult;

    } catch (error) {
      logger.error('[AuthService][ValidateUser] Error al validar el usuario\nError: ' + error.message);
      return null;
    }
  }
}


module.exports = AuthService;
