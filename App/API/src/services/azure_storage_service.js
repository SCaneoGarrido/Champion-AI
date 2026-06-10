require('dotenv').config();
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const { QueueClient } = require('@azure/storage-queue');
const logger = require('../utils/logger');

class AzureStorageService {
    #account
    #accountKey
    #containerName
    #credential

    constructor() {
        this.#account = process.env.AZURE_STORAGE_ACCOUNT;
        this.#accountKey = process.env.AZURE_STORAGE_KEY;
        this.#containerName = process.env.SPEECH_BLOB_NAME;
        this.#credential = new StorageSharedKeyCredential(this.#account, this.#accountKey);
    }

    async generateUploadUrl(blobPath) {
        try {
            const expiresOn = new Date(new Date().valueOf() + 60 * 60 * 1000); // 1 hora

            const sasToken = generateBlobSASQueryParameters({
                containerName: this.#containerName,
                blobName: blobPath,
                permissions: BlobSASPermissions.parse("cw"), // create + write
                expiresOn
            }, this.#credential).toString();

            return `https://${this.#account}.blob.core.windows.net/${this.#containerName}/${blobPath}?${sasToken}`;
        } catch (error) {
            logger.error('Error al generar Upload URL ' + error.message);
            return null;
        }
    }
    async uploadFileToBlob(file) {
        try {
            if (!file || !file.filename || !file.path) {
                throw new Error('El objeto file no tiene las propiedades necesarias (filename, path).');
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient(this.#containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(file.filename);

            logger.info('Subiendo archivo> ' + (file.originalname || file.filename));

            // subir archivo desde ruta en disco
            await blockBlobClient.uploadFile(file.path);

            const blobUrl = blockBlobClient.url; // Obtener la URL del archivo en el Blob Storage
            logger.info('Archivo subido correctamente. URL: ' + blobUrl);

            return blobUrl; // Retornar la URL del archivo
        } catch (error) {
            logger.error('Error al subir archivo al servicio de Blob Storage.\n Detalles: ' + error.message);
            throw new Error(error);
        }
    }

    async uploadToQueue(message) {

        try {;
            const queueClient = new QueueClient(
                process.env.CONNECTION_STRING,
                process.env.QUEUE_NAME
            );
            const payload = Buffer.from(JSON.stringify(message)).toString('base64');
            await queueClient.sendMessage(payload);
            logger.info('Mensaje encolado correctamente...');
        } catch (error) {
            logger.error('Error al enviar mensaje a la cola: ' + error.message);
            throw error;
        }
    }

    async buildBlobUrl(blobPath) {
        try {
            const account = this.#account;
            const container = this.#containerName;
            if (!account || !container) {
                logger.error('No se han definido las variables de entorno AZURE_STORAGE_ACCOUNT o SPEECH_BLOB_NAME');
                return null;
            }
            return `https://${account}.blob.core.windows.net/${container}/${blobPath}`;
        } catch (error) {
            logger.error('Error al construir URL del blob: ' + error.message);
            return null;
        }
    }

    async testBlobConnection() {
        try {
            const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.CONNECTION_STRING);
            await blobServiceClient.getAccountInfo();
            return true;
        } catch (error) {
            logger.error('Error al probar conexión a Blob Storage: ' + error.message);
            return false;
        }
    }

    async testQueueConnection() {
        try {
            const { QueueClient } = require('@azure/storage-queue');
            const queueClient = new QueueClient(
                process.env.CONNECTION_STRING,
                process.env.QUEUE_NAME
            );
            await queueClient.getProperties();
            return true;
        }
        catch (error) {
            logger.error('Error al probar conexión a Azure Queue Storage: ' + error.message);
            return false;
        }
    }

    validateBlobUrlExpiration(blobUrl) {
        try {
            const parsedUrl = new URL(blobUrl);
            const expiry = parsedUrl.searchParams.get('se');
            if (!expiry) {
                logger.warn("[AzureStorageService][validateBlobUrlExpiration] La URL del blob no contiene un parámetro de expiración (se).");
                return {
                    valid: false,
                    message: "La URL del blob no contiene un parámetro de expiración (se)."
                };
            }
            const expiryDate = new Date(expiry);
            const now = new Date();
            if (isNaN(expiryDate.getTime())){
                logger.warn("[AzureStorageService][validateBlobUrlExpiration] El parámetro de expiración (se) no es una fecha válida: " + expiry);
                return {
                    valid: false,
                    message: "El parámetro de expiración (se) no es una fecha válida."
                };
            }

            if (expiryDate <= now) {
                logger.warn("[AzureStorageService][validateBlobUrlExpiration] La URL del blob ha expirado. Expiración: " + expiryDate.toISOString() + ", Ahora: " + now.toISOString());
                return {
                    valid: false,
                    message: "La URL del blob ha expirado."
                };
            }

            return {
                valid: true,
                message: "La URL del blob es válida."
            };

        } catch (error) {
            logger.error("[AzureStorageService][validateBlobUrlExpiration] Error al validar expiración de URL del blob: " + error.message);
            return {
                valid: false,
                message: "Error al validar URL del blob"
            }
        }
    }

}

module.exports = AzureStorageService;
