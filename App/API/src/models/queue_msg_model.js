const BaseJob = require('./base_job_model');

const QueueMsg = {
    ...BaseJob // Extender la estructura base
};

module.exports = QueueMsg;