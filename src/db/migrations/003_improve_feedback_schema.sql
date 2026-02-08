-- Recreate feedback_events with better columns for our service
DROP TABLE IF EXISTS feedback_events;

CREATE TABLE feedback_events (
    id SERIAL PRIMARY KEY,
    pr_number INTEGER NOT NULL,
    repo_full_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    feedback_type VARCHAR(20) NOT NULL, -- positive, negative
    comment_id BIGINT,
    decision_id INTEGER REFERENCES analysis_decisions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for stats
CREATE INDEX ON feedback_events (repo_full_name, feedback_type);
