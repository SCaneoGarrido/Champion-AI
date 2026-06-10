const mongoose = require('mongoose');
const BaseJob = require('./base_job_model');

const traceProcessSchema = new mongoose.Schema({
    ...BaseJob, // Extiende el esquema base
    userId: { type: Number, required: true }, // Campo adicional específico de MongoDB
    result: { type: String, required: false },
    error: { type: String, required: false }
}, { timestamps: true });


const Trace = mongoose.model('Trace', traceProcessSchema);
module.exports = Trace;