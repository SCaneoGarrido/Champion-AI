const logger = require('../utils/logger.js');

class HealthService {
    // Estado Inicial en memoria 
    #servicesStatus = {
        postgres: false,
        azureQueue: false,
        azureBlob: false 
    };
    constructor() {};
    getStatus() {
        return this.#servicesStatus;
    }
    // Exponential Backoff con timeout para cada intento, y manejo de estado en memoria
    async retryConnection({
        serviceKey,
        testFn,
        maxAttempts = 5,
        initialDelayMs = 1000,
        maxDelayMs = 10000, // Reducido para no retrasar el inicio de la app demasiado
        factor = 2,
        jitter = true,
        testTimeoutMs = 5000,
    }) {
        let delay = initialDelayMs;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const ok = await this.#withTimeout(
            testFn(),
            testTimeoutMs,
            serviceKey
        ).catch((e) => {
            logger.error(`Error en ${serviceKey}: ${e.message}`);
            return false;
        });

        if (ok) {
            logger.info(`✅ Conexión a ${serviceKey} OK en intento ${attempt}`);
            this.#servicesStatus[serviceKey] = true; // 👈 Actualiza estado en memoria
            logger.info("Actualizando estado de servicio: " + this.#servicesStatus[serviceKey]);
            return true;
        }

        this.#servicesStatus[serviceKey] = false; // 👈 Marca como caído

        if (attempt === maxAttempts) {
            logger.error(`❌ Todos los ${maxAttempts} intentos fallaron para ${serviceKey}.`);
            return false;
        }

        let waitMs = delay;
        if (jitter) {
            waitMs = Math.floor(delay * (0.5 + Math.random()));
        }

        logger.warn(`⚠️ Intento ${attempt} fallido para ${serviceKey}. Reintentando en ${Math.round(waitMs / 1000)}s...`);
        await this.#sleep(waitMs);

        delay = Math.min(delay * factor, maxDelayMs);
        }

        return false;
    }

    async #sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }
    
    async #withTimeout(promise, ms, label) {
        return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms) en ${label}`)), ms)),
        ]);
    }
}

module.exports = HealthService;