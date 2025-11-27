-- Migration: Add due_date to global_todos table
-- Description: Adds a due_date column to track task deadlines for global todos

-- Add due_date column to global_todos table
ALTER TABLE global_todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Create index on due_date for faster queries
CREATE INDEX IF NOT EXISTS idx_global_todos_due_date ON global_todos(due_date);

-- Create index on combination of completed and due_date for efficient queries of pending tasks
CREATE INDEX IF NOT EXISTS idx_global_todos_completed_due_date ON global_todos(completed, due_date);
