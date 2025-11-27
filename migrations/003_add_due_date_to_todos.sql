-- Migration: Add due_date to todos table
-- Description: Adds a due_date column to track task deadlines

-- Add due_date column to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Create index on due_date for faster queries
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

-- Create index on combination of completed and due_date for efficient queries of pending tasks
CREATE INDEX IF NOT EXISTS idx_todos_completed_due_date ON todos(completed, due_date);
