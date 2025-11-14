-- Migration: Convertir calendar_events TIMESTAMP → TIMESTAMPTZ
-- Pour corriger le décalage horaire de 1h dans l'affichage

BEGIN;

-- Convertir start_time de TIMESTAMP à TIMESTAMPTZ
ALTER TABLE calendar_events
  ALTER COLUMN start_time TYPE TIMESTAMPTZ
  USING start_time AT TIME ZONE 'UTC';

-- Convertir end_time de TIMESTAMP à TIMESTAMPTZ
ALTER TABLE calendar_events
  ALTER COLUMN end_time TYPE TIMESTAMPTZ
  USING end_time AT TIME ZONE 'UTC';

COMMIT;

-- Vérification
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'calendar_events'
  AND column_name IN ('start_time', 'end_time');
