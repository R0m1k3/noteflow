# 🚨 RÉCUPÉRATION DES DONNÉES - Guide d'urgence

## 📋 Qu'est-ce qui s'est passé ?

Vos données ne sont **PAS perdues** ! Le problème était que:

1. Docker était configuré pour utiliser PostgreSQL (`DB_TYPE=postgres`)
2. Mais le code chargeait toujours SQLite
3. Résultat: une nouvelle base SQLite vide était créée
4. Vos vraies données sont restées dans la base SQLite d'origine

## ✅ Solution appliquée

Un système de **détection automatique** a été ajouté (`config/database-loader.js`) qui:
- Détecte `DB_TYPE=postgres` → charge PostgreSQL
- Détecte `DATABASE_URL=postgresql://` → charge PostgreSQL
- Sinon → charge SQLite

## 🔄 Deux options pour récupérer vos données

### Option 1: Utiliser SQLite (RAPIDE - recommandé pour l'instant)

**Revenir temporairement à SQLite le temps de tout vérifier:**

```bash
# 1. Arrêter les containers
docker-compose down

# 2. Modifier docker-compose.yml temporairement
# Commentez ces lignes dans la section notes-app > environment:
#   - DATABASE_URL=postgresql://...
#   - DB_TYPE=postgres

# 3. Relancer
docker-compose build notes-app
docker-compose up -d
```

Vos données réapparaîtront immédiatement car SQLite sera rechargé.

### Option 2: Migrer vers PostgreSQL (PROPRE - recommandé pour production)

**Migration complète de SQLite → PostgreSQL:**

```bash
# 1. Reconstruire avec le nouveau code
docker-compose build notes-app

# 2. Démarrer les containers
docker-compose up -d

# 3. Attendre 30 secondes que PostgreSQL démarre
sleep 30

# 4. Lancer la migration
bash scripts/run-migration.sh
```

Cette option copie toutes vos données de SQLite vers PostgreSQL.

## 🔍 Vérifier que tout fonctionne

### Après Option 1 (SQLite):

```bash
# Vérifier les données
docker exec notes-todo-app node -e "
const { getAll } = require('./config/database-loader');
getAll('SELECT COUNT(*) as count FROM notes').then(r => {
  console.log('Notes:', r[0].count);
  process.exit(0);
});
"
```

### Après Option 2 (PostgreSQL):

```bash
# Vérifier les données dans PostgreSQL
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
  -c "SELECT COUNT(*) FROM notes;"

docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
  -c "SELECT COUNT(*) FROM rss_articles;"
```

## 🎯 Recommandation

**Pour l'instant:**
1. Utilisez **Option 1** (SQLite) pour récupérer immédiatement vos données
2. Vérifiez que tout fonctionne bien
3. Plus tard, quand vous êtes prêt, utilisez **Option 2** pour migrer vers PostgreSQL

## 📂 Où sont vos données ?

- **SQLite actuel:** `./data/notes.db` (vos vraies données sont ici)
- **PostgreSQL:** Container Docker `noteflow-postgres` (vide ou partiellement migré)

## ⚠️ Important

**NE SUPPRIMEZ PAS** le fichier `./data/notes.db` tant que vous n'avez pas:
1. Vérifié que tout fonctionne avec PostgreSQL
2. Confirmé que toutes vos données sont migrées
3. Testé l'application pendant plusieurs jours

## 🆘 En cas de problème

### Voir les logs
```bash
docker-compose logs notes-app | tail -50
```

### Identifier quelle base est utilisée
```bash
docker exec notes-todo-app node -e "
console.log('DB_TYPE:', process.env.DB_TYPE);
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
"
```

### Forcer SQLite même avec Docker
```bash
docker exec -e DB_TYPE=sqlite notes-todo-app node server.js
```

## 📞 Debug rapide

```bash
# Compter les notes dans SQLite
docker exec notes-todo-app node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/notes.db');
db.get('SELECT COUNT(*) as count FROM notes', (err, row) => {
  console.log('Notes SQLite:', row.count);
  db.close();
});
" 2>/dev/null

# Compter les notes dans PostgreSQL
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -t \
  -c "SELECT COUNT(*) FROM notes;" 2>/dev/null || echo "PostgreSQL non accessible"
```

## ✅ Checklist de récupération

- [ ] Containers redémarrés avec nouvelle configuration
- [ ] Base de données accessible (SQLite OU PostgreSQL)
- [ ] Notes visibles dans l'interface
- [ ] Tâches visibles
- [ ] Flux RSS configurés
- [ ] Événements calendrier présents
- [ ] Paramètres restaurés

---

**Date de création:** 2025-11-14
**Commit de correction:** 55a1809 - Fix: Chargement automatique SQLite/PostgreSQL
