-- Migration: Add subtasks support to todos tables
-- Description: Adds parent_id column to enable hierarchical task structure

-- Add parent_id column to note_todos table (note todos)
ALTER TABLE note_todos ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES note_todos(id) ON DELETE CASCADE;

-- Add parent_id column to global_todos table
ALTER TABLE global_todos ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES global_todos(id) ON DELETE CASCADE;

-- Create indexes for faster subtask queries
CREATE INDEX IF NOT EXISTS idx_note_todos_parent_id ON note_todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_global_todos_parent_id ON global_todos(parent_id);

-- Add level column to track depth (optional, for UI optimization)
ALTER TABLE note_todos ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE global_todos ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
