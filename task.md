# Tâches - Correction de la persistance des icônes de tâches

## Contexte
Les icônes de priorité et de statut "en cours" des tâches générales disparaissent après un rechargement de la page.

## Mise au point actuelle
Analyse de la structure des données des tâches et de leur persistance.

## Plan Maître
- [x] Analyser le frontend (`src/pages/Index.tsx`) pour identifier les champs de priorité et de statut.
- [x] Analyser le backend (`server.js`, `routes/todos.routes.js`) pour vérifier si ces champs sont sauvegardés en base de données.
- [x] Vérifier le schéma de la base de données et appliquer les migrations.
- [x] Implémenter les corrections nécessaires (migrations ajoutées à `initDatabase` pour PG et SQLite).
- [x] Vérifier la cohérence entre le frontend et le backend (types de données).
- [ ] Vérifier la persistance après rechargement (à valider par l'utilisateur).

## Log de progression
- Initialisation du fichier `task.md`.
