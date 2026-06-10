CREATE OR REPLACE FUNCTION fn_can_process_ai_job(
    p_job_id VARCHAR(100)
)
RETURNS TABLE (
    can_process BOOLEAN,
    reason TEXT,
    current_status VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN j.job_id IS NULL THEN FALSE
            WHEN j.status IN ('completed', 'failed') THEN FALSE
            WHEN j.status NOT IN ('queued', 'processing') THEN FALSE
            ELSE TRUE
        END AS can_process,
        CASE
            WHEN j.job_id IS NULL THEN 'JOB_NOT_FOUND'
            WHEN j.status = 'completed' THEN 'JOB_ALREADY_COMPLETED'
            WHEN j.status = 'failed' THEN 'JOB_ALREADY_FAILED'
            WHEN j.status NOT IN ('queued', 'processing') THEN 'INVALID_JOB_STATUS'
            ELSE NULL
        END AS reason,
        j.status AS current_status
    FROM ai_job j
    WHERE j.job_id = p_job_id;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            FALSE,
            'JOB_NOT_FOUND'::TEXT,
            NULL::VARCHAR(50);
    END IF;
END;
$$;