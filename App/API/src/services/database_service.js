require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../utils/logger');
const { generatePasswordHash } = require('../helpers/auth_helpers');
const { capitalizeFirstLetter } = require("../utils/util");
const { JOBSTATUS, STT_LIVE_RECORDING_STEPS, JOB_ACTOR_TYPES, JOB_MESSAGES, UPLOAD_STATUS } = require('../utils/constants');

class DatabaseService {
  #pool // Atributo para un pool mas dinamico

  constructor() {
    this.#pool = new Pool({
      user: process.env.DBUSER,
      host: process.env.DBSERVER,
      database: process.env.DATABASE,
      password: process.env.DBPASSWORD,
      port: process.env.DBPORT
    });

    this.#pool.on('error', (err) => {
      logger.error('[DatabaseService][constructor] Error inesperado en el pool de PG: ' + err.message);
    })
  }
  // Modulos privados
  async query(query, values = [], withData = false) {
    try {
      const res = await this.#pool.query(query, values);
      if (withData) {
        return { success: true, data: res.rows, rowCount: res.rowCount };
      }
      return { success: true };
    } catch (error) {
      logger.error(`[DatabaseService][#query] Error en la consulta SQL:\nQuery: ${query}\nError: ${error.message}`); // Agregar query y error para facilitar debugging
      return { success: false, error: error.message };
    }
  }

  async testPostgres() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('[DatabaseService][testPostgres] Error al probar la conexion a la base de datos: ' + error.message);
      return false;
    }
  }
}

module.exports = DatabaseService;
