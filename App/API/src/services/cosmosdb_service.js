const { CosmosClient } = require('@azure/cosmos');
const logger = require('../utils/logger');

class CosmosService {
    #client
    #database
    #container_stt_job
    #container_tts_job
    constructor() {
        this.#client = new CosmosClient({
            endpoint: process.env.COSMOS_ENDPOINT,
            key: process.env.COSMOS_KEY
        });
        this.#database = this.#client.database(process.env.COSMOS_DB_NAME);
        this.#container_stt_job = this.#database.container(process.env.COSMOS_CONTAINERSTT);
        this.#container_tts_job = this.#database.container(process.env.COSMOS_CONTAINERTTS);
    }

    async uploadSTTJob(jobInformation) {
        try {
            const { resource } = await this.#container_stt_job.items.create(jobInformation);
            return resource;
        } catch (error) {
            logger.error("Error al subir job en cosmosdb: " + error.message);
            return null;
        }
    }

    async connect() {
        const database = this.#client.database("")
    }
}
