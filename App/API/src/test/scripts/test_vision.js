const VisionServices = require('../../services/vision_services');
const imagepath = 'E:\\Carpetas Windows\\Escritorio\\WorkSpace\\APIServicesAI\\src\\test\\img\\escrito1.jpg';

const visionServices = new VisionServices();
const result = visionServices.analyzeImageFromFile(imagepath);

console.log(result.body.readResult);