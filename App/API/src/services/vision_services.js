require('dotenv').config();
const logger = require('../utils/logger');
const fs = require('fs');

const createClient = require("@azure-rest/ai-vision-image-analysis").default;
const { AzureKeyCredential } = require("@azure/core-auth");



class VisionServices {
    #vision_key
    #vision_endpoint


    constructor() {
        this.#vision_key = process.env.VISION_KEY;
        this.#vision_endpoint = process.env.VISION_ENDPOINT;
    }

    #createVisionClient() {
        try {
            const credential = new AzureKeyCredential(this.#vision_key);
            const client = createClient(this.#vision_endpoint, credential);
            return client
        } catch (error) {
            logger.error("Error al crear la configuracion del servicio VISION \nDetails: " + error.message)
            throw new Error("No se ha podido crear la configuracion del servicio vision");
        }
    }

    async analyzeImageFromUrl(imageUrl) {
        try {
            const features = ["Caption", "DenseCaptions", "Objects", "People", "Read", "SmartCrops", "Tags"];
            const client = this.#createVisionClient();
            const result = await client.path(imageUrl).post({
            body: {
                    url: imageUrl
                },
                queryParameters: {
                    features: features,
                    "model-version": "latest",
                    lenguage: "es",
                    "api-version": "2024-02-01"
                },
                contentType: "application/json"
            });
            
            // Validar la respuesta del servicio
            if (result.status !== "200") {
                logger.error("Error al analizar la imagen. Status: " + result.status);
                throw new Error("Error al analizar la imagen. Status: " + result.status);
            }

            logger.info("Imagen analizada correctamente desde URL.");
            return result;
        } catch (error) {
            logger.error("Error al analizar la imagen desde URL.\nDetails: " + error.message);
            throw new Error("No se ha podido analizar la imagen desde URL");
        }
    }

    async analyzeImageFromFile(imagePath) {
        try {
            const client = this.#createVisionClient();
            const features = ["Caption", "DenseCaptions", "Objects", "People", "Read", "SmartCrops", "Tags"];

            const imageBuffer = fs.readFileSync(imagePath);
            logger.info("Enviando imagen al servicio de Computer vision.");
            const result = await client.path("imageanalysis:analyze").post({
                body: imageBuffer,
                queryParameters: {
                    features: features,
                    "smartCrops-aspect-ratio": [0.9, 1.33],
                },
                contentType: "application/octet-stream"
            });

            // Validar la respuesta del servicio
            if (result.status !== "200") {
                logger.error("Error al analizar la imagen. Status: " + result.status);
                throw new Error("Error al analizar la imagen. Status: " + result.status);
            }

            logger.info("Imagen analizada correctamente desde archivo.");
            return result;

        } catch (error) {
            logger.error("Error al analizar la imagen desde archivo.\nDetails: " + error.message);
            throw new Error("No se ha podido analizar la imagen desde archivo");
        }
    }

    extractTextFromResult(result) {
        try {
            const readResult = result.body.readResult;
            if (!readResult || !readResult.blocks) {
                return [];
            }
            // recorro los bloques y lineas 
            const lines = [];
            for (const block of readResult.blocks) {
                for (const line of block.lines) {
                    lines.push(line.text);
                }
            }

            return lines;

        } catch (error) {
            logger.error('Error al extraer el texto del resultado: ' + error.message);
            throw new Error("No se ha podido extrar el texto desde el resultado");
        }
    }

    extractBestDenseCaption(result) {
        try {
            const denseCaptions = result.body.denseCaptionsResult;
            if (!denseCaptions || !denseCaptions.values || denseCaptions.values.length === 0) {
                return null;
            }

            // Encontrar la caption con mayor confidence
            let bestCaption = denseCaptions.values.reduce((prev, current) => {
                return (current.confidence > prev.confidence) ? current : prev;
            });

            return {
                text: bestCaption.text,
                confidence: bestCaption.confidence,
                boundingPolygon: bestCaption.boundingPolygon
            };
        } catch (error) {
            logger.error("Error al extraer la mejor dense caption.\nDetails: " + error.message);
            throw new Error("No se pudo extraer la mejor dense caption de la imagen");
        }
    }

    
}

module.exports = VisionServices;
