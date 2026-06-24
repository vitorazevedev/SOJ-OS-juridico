-- STORY-005: Add source column to distinguish AI-extracted vs manually created obligations
ALTER TABLE contract_obligations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
