-- Script d'initialisation PostgreSQL pour NoteFlow
-- Exécuté automatiquement au premier démarrage du conteneur

-- Extensions utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer les index après création des tables dans database.js
-- Ce script peut rester vide si database.js gère tout
