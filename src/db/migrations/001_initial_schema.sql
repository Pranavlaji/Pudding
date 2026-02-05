-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Repository configuration
CREATE TABLE repo_config (
    id SERIAL PRIMARY KEY,
    repo_full_name VARCHAR(255) UNIQUE NOT NULL,     -- "owner/repo"
    enabled BOOLEAN DEFAULT true,
    recency_window_days INTEGER DEFAULT 30,
    cheap_score_threshold NUMERIC(3,2) DEFAULT 0.30,
    semantic_score_threshold NUMERIC(3,2) DEFAULT 0.65,
    high_confidence_threshold NUMERIC(3,2) DEFAULT 0.85,
    bypass_authors TEXT[] DEFAULT '{}',              -- GitHub usernames
    ignore_labels TEXT[] DEFAULT ARRAY['experiment', 'spike', 'exploration', 'wip', 'rfc', 'poc'],
    ignore_files TEXT[] DEFAULT ARRAY['**/package-lock.json', '**/yarn.lock', '**/*.generated.*'],
    is_monorepo BOOLEAN DEFAULT false,
    monorepo_config JSONB DEFAULT '{}',              -- Package detection settings
    air_gapped BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pull request embeddings and metadata
CREATE TABLE pr_embeddings (
    id SERIAL PRIMARY KEY,
    repo_full_name VARCHAR(255) NOT NULL,
    pr_number INTEGER NOT NULL,
    head_sha VARCHAR(40) NOT NULL,
    title TEXT NOT NULL,
    description_snippet TEXT,                        -- First 500 chars
    embedding vector(384),                           -- For all-MiniLM-L6-v2 / bge-small
    is_draft BOOLEAN DEFAULT false,
    state VARCHAR(20) DEFAULT 'open',                -- open, closed, merged
    author VARCHAR(255) NOT NULL,
    files_changed TEXT[] DEFAULT '{}',
    packages_touched TEXT[] DEFAULT '{}',            -- For monorepos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_full_name, pr_number)
);

-- Index for vector similarity search
CREATE INDEX ON pr_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for filtering
CREATE INDEX ON pr_embeddings (repo_full_name, state, created_at);

-- Extracted intents (cached)
CREATE TABLE pr_intents (
    id SERIAL PRIMARY KEY,
    repo_full_name VARCHAR(255) NOT NULL,
    pr_number INTEGER NOT NULL,
    head_sha VARCHAR(40) NOT NULL,
    intent JSONB NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_full_name, pr_number, head_sha)
);

-- Analysis queue / lock table for race condition handling
CREATE TABLE pr_analysis_locks (
    pr_number INTEGER PRIMARY KEY,
    repo_full_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',            -- pending, analyzing, complete
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision audit log
CREATE TABLE analysis_decisions (
    id SERIAL PRIMARY KEY,
    source_pr INTEGER NOT NULL,                      -- The new PR
    target_pr INTEGER NOT NULL,                      -- The candidate duplicate
    repo_full_name VARCHAR(255) NOT NULL,
    cheap_score JSONB,
    semantic_score JSONB,
    final_confidence NUMERIC(3,2) NOT NULL,
    decision VARCHAR(30) NOT NULL,                   -- comment_duplicate, comment_review, label_only, no_action
    target_pr_state VARCHAR(20),                     -- For state-aware decisions
    comment_id BIGINT,                               -- GitHub comment ID if posted
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback tracking
CREATE TABLE feedback_events (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER REFERENCES analysis_decisions(id),
    reaction VARCHAR(10) NOT NULL,                   -- thumbs_up, thumbs_down
    reactor VARCHAR(255) NOT NULL,                   -- GitHub username
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repo-level metrics (computed)
CREATE TABLE repo_metrics (
    id SERIAL PRIMARY KEY,
    repo_full_name VARCHAR(255) UNIQUE NOT NULL,
    total_detections INTEGER DEFAULT 0,
    confirmed_duplicates INTEGER DEFAULT 0,          -- 👍 reactions
    false_positives INTEGER DEFAULT 0,               -- 👎 reactions
    precision NUMERIC(3,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (confirmed_duplicates + false_positives) > 0 
            THEN confirmed_duplicates::NUMERIC / (confirmed_duplicates + false_positives)
            ELSE 0.5
        END
    ) STORED,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File popularity cache (for IDF weighting)
CREATE TABLE file_popularity (
    id SERIAL PRIMARY KEY,
    repo_full_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    touch_count INTEGER DEFAULT 1,
    total_prs_sampled INTEGER DEFAULT 100,
    popularity NUMERIC(4,3) GENERATED ALWAYS AS (
        touch_count::NUMERIC / NULLIF(total_prs_sampled, 0)
    ) STORED,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_full_name, file_path)
);
