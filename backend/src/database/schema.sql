-- Jujutsu Incidents Database Schema

CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    threat TEXT NOT NULL,
    objectives TEXT NOT NULL, -- JSON array
    danger_factors TEXT NOT NULL, -- JSON array
    difficulty TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_missions_difficulty ON missions(difficulty);
CREATE INDEX IF NOT EXISTS idx_missions_custom ON missions(is_custom);

-- Default missions are now loaded from backend/src/data/missions.json
-- This table is used only for custom missions created by users
