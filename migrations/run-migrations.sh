#!/bin/bash
# Script pour exécuter les migrations SQL sur la base de données

DB_PATH="/app/data/notes.db"

echo "=== Exécution des migrations SQLite ==="

# Migration 001: Ajouter image_filename
echo "Migration 001: Ajout de la colonne image_filename..."
sqlite3 $DB_PATH "ALTER TABLE notes ADD COLUMN image_filename TEXT;" 2>/dev/null && echo "✓ Migration 001 appliquée" || echo "⚠ Migration 001 déjà appliquée ou erreur"

echo "=== Migrations terminées ==="
