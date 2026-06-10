const BaseJob = {
    job_id: "",
    flow: "",
    status: "",
    current_step: "",
    steps: {
        transcription: "",
        summary: "",
        notes: "",
        mind_map: ""
    },
    updated_at: new Date().toISOString()
};

module.exports = BaseJob;