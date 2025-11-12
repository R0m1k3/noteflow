-- Migration: Add priority column to notes table
-- Date: 2025-01-12

ALTER TABLE notes ADD COLUMN priority INTEGER DEFAULT 0;

-- Create index for better performance when sorting by priority
CREATE INDEX idx_notes_priority ON notes(priority DESC, updated_at DESC);
