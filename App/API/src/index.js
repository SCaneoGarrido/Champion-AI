const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const getLocalIP = require('./utils/getLocalIP');

const express = require('express');
const cors = require('cors');
const speech_router = require('./routes/speech_routes');
const vision_router = require('./routes/vision_routes');
const auth_router = require('./routes/auth_routes');
const user_router = require('./routes/user_routes');
const transversal_router = require('./routes/transversal_routes');
const morgan = require('morgan');
const DatabaseService = require('./services/database_service');
const HealthService = require('./services/health_service');
const AzureStorageService = require('./services/azure_storage_service');
const database_service = new DatabaseService();
const health_service = new HealthService();
const azure_storage_service = new AzureStorageService();
const REQUIRED_ENV_VARS = ['JWT_KEY', 'REFRESH_SECRET', 'DBUSER', 'DBSERVER', 'DATABASE', 'DBPASSWORD', 'DBPORT'];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error('Variables de entorno requeridas no definidas: ' + missingVars.join(', '));
    process.exit(1);
}

const PORT = process.env.PORT || 5051;
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Guardar instancias en app.locals para acceso desde controladores
app.locals.health_service = health_service;
app.locals.database_service = database_service;
app.locals.azure_storage_service = azure_storage_service;

app.use('/AIServices/Speechv2', speech_router);
app.use('/AIServices/Visionv1', vision_router);
app.use('/API/AUTH', auth_router);
app.use('/API/USER', user_router);
app.use('/API/Transversal', transversal_router);

// Global error handler — captura errores no manejados por controladores
app.use((err, req, res, next) => {
    const logger = require('./utils/logger');
    logger.error('Unhandled error: ' + err.message);
    return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
    });
});

app.listen(PORT, '0.0.0.0', async () => {
    const LOCAL_IP = getLocalIP();
    console.log('Iniciando chequeo de servicios externos...');
    const skipAzure = process.env.SKIP_AZURE_HEALTHCHECK === 'true';
    if (skipAzure) {
        console.warn('SKIP_AZURE_HEALTHCHECK=true: omitiendo chequeo de Azure (solo desarrollo local).');
    }
    // Chequeo inicial de servicios externos con retry y backoff
    const connections = await Promise.all([
        health_service.retryConnection({ serviceKey: 'postgres', testFn: database_service.testPostgres.bind(database_service)}),
        ...(skipAzure ? [] : [
            health_service.retryConnection({ serviceKey: 'azureQueue', testFn: azure_storage_service.testQueueConnection.bind(azure_storage_service)}),
            health_service.retryConnection({ serviceKey: 'azureBlob', testFn: azure_storage_service.testBlobConnection.bind(azure_storage_service)}),
        ]),
    ]);

    // Validar si vale la pena arrancar la API o salir si no se pudieron conectar las dependencias críticas
    if (connections.includes(false)) {
        console.error('No se pudieron conectar todas las dependencias críticas. Saliendo...');
        process.exit(1); 
    }


    console.log(`Arrancando API en http://${LOCAL_IP}:${PORT}`);
})
