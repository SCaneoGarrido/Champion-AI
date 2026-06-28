const { Pool } = require('pg');
const logger = require('../utils/logger');

let _instance = null;

class DatabaseService {
    #pool

    constructor() {
        if (_instance) return _instance;
        this.#pool = new Pool({
            user: process.env.DBUSER,
            host: process.env.DBSERVER,
            database: process.env.DATABASE,
            password: process.env.DBPASSWORD,
            port: process.env.DBPORT
        });
        this.#pool.on('error', (err) => {
            logger.error('[DatabaseService][constructor] Error inesperado en el pool de PG: ' + err.message);
        });
        _instance = this;
    }

    async query(query, values = [], withData = false) {
        try {
            const res = await this.#pool.query(query, values);
            if (withData) {
                return { success: true, data: res.rows, rowCount: res.rowCount };
            }
            return { success: true };
        } catch (error) {
            logger.error(`[DatabaseService][query] Error:\nQuery: ${query}\nError: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async withTransaction(callback) {
        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[DatabaseService][withTransaction] Rolled back: ' + error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async testPostgres() {
        try {
            await this.query('SELECT 1');
            return true;
        } catch (error) {
            logger.error('[DatabaseService][testPostgres] Error: ' + error.message);
            return false;
        }
    }
}

module.exports = DatabaseService;
