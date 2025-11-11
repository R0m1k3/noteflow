-- Migration pour ajouter la colonne image_filename à la table notes
-- À exécuter si vous obtenez l'erreur: "no such column: n.image_filename"

-- Vérifier la structure actuelle
-- SELECT sql FROM sqlite_master WHERE name='notes';

-- Ajouter la colonne image_filename si elle n'existe pas
ALTER TABLE notes ADD COLUMN image_filename TEXT;

-- Vérifier que la colonne a été ajoutée
-- SELECT * FROM notes LIMIT 1;
