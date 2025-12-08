-- Script de correction des types booléens PostgreSQL
-- Convertit les colonnes INTEGER en BOOLEAN et les données 0/1 en FALSE/TRUE
-- Ce script est idempotent: il peut être exécuté plusieurs fois sans problème

-- Fonction pour vérifier et corriger le type d'une colonne
DO $$
DECLARE
    column_info RECORD;
BEGIN
    -- Corriger users.is_admin
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting users.is_admin from INTEGER to BOOLEAN';
        ALTER TABLE users ALTER COLUMN is_admin TYPE BOOLEAN
        USING CASE WHEN is_admin = 0 THEN FALSE WHEN is_admin = 1 THEN TRUE ELSE is_admin::BOOLEAN END;
    END IF;

    -- Corriger notes.archived
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'archived';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting notes.archived from INTEGER to BOOLEAN';
        ALTER TABLE notes ALTER COLUMN archived TYPE BOOLEAN
        USING CASE WHEN archived = 0 THEN FALSE WHEN archived = 1 THEN TRUE ELSE archived::BOOLEAN END;
    END IF;

    -- Corriger note_todos.completed
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'note_todos' AND column_name = 'completed';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting note_todos.completed from INTEGER to BOOLEAN';
        ALTER TABLE note_todos ALTER COLUMN completed TYPE BOOLEAN
        USING CASE WHEN completed = 0 THEN FALSE WHEN completed = 1 THEN TRUE ELSE completed::BOOLEAN END;
    END IF;

    -- Corriger note_todos.priority
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'note_todos' AND column_name = 'priority';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting note_todos.priority from INTEGER to BOOLEAN';
        ALTER TABLE note_todos ALTER COLUMN priority TYPE BOOLEAN
        USING CASE WHEN priority = 0 THEN FALSE WHEN priority = 1 THEN TRUE ELSE priority::BOOLEAN END;
    END IF;

    -- Corriger global_todos.completed
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'global_todos' AND column_name = 'completed';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting global_todos.completed from INTEGER to BOOLEAN';
        ALTER TABLE global_todos ALTER COLUMN completed TYPE BOOLEAN
        USING CASE WHEN completed = 0 THEN FALSE WHEN completed = 1 THEN TRUE ELSE completed::BOOLEAN END;
    END IF;

    -- Corriger global_todos.priority
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'global_todos' AND column_name = 'priority';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting global_todos.priority from INTEGER to BOOLEAN';
        ALTER TABLE global_todos ALTER COLUMN priority TYPE BOOLEAN
        USING CASE WHEN priority = 0 THEN FALSE WHEN priority = 1 THEN TRUE ELSE priority::BOOLEAN END;
    END IF;

    -- Corriger rss_feeds.enabled
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'rss_feeds' AND column_name = 'enabled';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting rss_feeds.enabled from INTEGER to BOOLEAN';
        ALTER TABLE rss_feeds ALTER COLUMN enabled TYPE BOOLEAN
        USING CASE WHEN enabled = 0 THEN FALSE WHEN enabled = 1 THEN TRUE ELSE enabled::BOOLEAN END;
    END IF;

    -- Corriger calendar_events.all_day
    SELECT data_type INTO column_info FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'all_day';

    IF FOUND AND column_info.data_type = 'integer' THEN
        RAISE NOTICE 'Converting calendar_events.all_day from INTEGER to BOOLEAN';
        ALTER TABLE calendar_events ALTER COLUMN all_day TYPE BOOLEAN
        USING CASE WHEN all_day = 0 THEN FALSE WHEN all_day = 1 THEN TRUE ELSE all_day::BOOLEAN END;
    END IF;

    RAISE NOTICE 'Boolean type correction completed successfully';
END $$;
