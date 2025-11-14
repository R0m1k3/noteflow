# Guide Système RSS V2

## 🚀 Nouveau Système RSS - Plus Simple et Robuste

Le système RSS a été complètement réécrit pour résoudre les problèmes de mise à jour des articles.

### ✅ Problèmes Résolus

- ✓ Articles non mis à jour (bloqués au 12 novembre)
- ✓ Détection de doublons défaillante
- ✓ Cache trop agressif
- ✓ Logique complexe et difficile à déboguer

### 🆕 Nouvelle Architecture

**Simplicité avant tout:**

1. **Détection de doublons simple**: Uniquement par lien (pas de logique complexe titre+date)
2. **Pas de cache**: Requêtes SQL directes à chaque fois
3. **Nettoyage automatique**: Garde les 100 derniers articles par flux
4. **Logs clairs**: Chaque étape est tracée pour faciliter le debug
5. **Robustesse**: Timeout 15s, gestion d'erreurs, fetch séquentiel

### 📋 Migration

#### Étape 1: Nettoyer la Base de Données (Recommandé)

```bash
node scripts/reset-rss.js
```

Ceci supprime TOUS les anciens articles et flux RSS. Vous repartirez de zéro.

#### Étape 2: Redémarrer le Serveur

```bash
npm restart
# ou
pm2 restart noteflow
```

#### Étape 3: Ajouter vos Flux RSS

Via l'interface web, ajoutez vos flux RSS:
- Les articles seront récupérés immédiatement
- Puis toutes les 2 minutes automatiquement

### 🔧 Scripts Utiles

**Diagnostic:**
```bash
# Vérifier l'état du système
node scripts/check-rss-dates.js

# Debug détaillé d'un flux
node scripts/debug-rss-fetch.js

# Analyser les doublons
node scripts/cleanup-duplicates.js
```

**Maintenance:**
```bash
# Reset complet
node scripts/reset-rss.js

# Initialiser des flux par défaut
node scripts/init-rss-feeds.js

# Forcer une mise à jour
node scripts/force-refresh-rss.js
```

### 📊 Configuration

**Constantes (services/rss-scheduler.js):**
- `MAX_ARTICLES_PER_FEED`: 100 (articles max par flux)
- `FETCH_INTERVAL`: 2 minutes (fréquence de mise à jour)
- `STARTUP_DELAY`: 5 secondes (délai avant 1er fetch)

### 🎯 Comportement Attendu

1. **Ajout d'un flux**:
   - Validation immédiate
   - Fetch automatique dans la seconde
   - Articles affichés du plus récent au plus ancien

2. **Mises à jour automatiques**:
   - Toutes les 2 minutes
   - Nouveaux articles détectés par lien
   - Anciens articles nettoyés automatiquement

3. **Affichage**:
   - 50 articles par défaut (limite API)
   - 8 articles par page (pagination frontend)
   - Tri: plus récent en premier

### 🔄 Rollback vers V1

Si besoin de revenir à l'ancien système:

```bash
# Restaurer les backups
cp services/rss-scheduler.js.backup services/rss-scheduler.js
cp routes/rss.routes.js.backup routes/rss.routes.js

# Redémarrer
npm restart
```

### 📝 Logs

Les logs sont maintenant ultra-clairs:

```
[INFO]: 🔄 === Début mise à jour RSS ===
[INFO]: 📰 3 flux à traiter
[INFO]: ⏳ Récupération: NBA - Google Actualités
[INFO]: ✅ NBA - Google Actualités: 27 nouveaux (2.34s)
[INFO]: ✅ === Fin: 27 nouveaux articles (3 OK, 0 erreurs, 7.12s) ===
```

### ❓ Dépannage

**Problème: Aucun article ne s'affiche**
```bash
# Vérifier la DB
node scripts/check-rss-dates.js

# Vérifier qu'il y a des flux activés
# Dans l'interface admin > Flux RSS
```

**Problème: Toujours les mêmes articles**
```bash
# Reset complet
node scripts/reset-rss.js

# Réajouter les flux via l'interface
```

**Problème: Erreurs de fetch**
```bash
# Voir les logs
tail -f data/app.log

# Debug un flux spécifique
node scripts/debug-rss-fetch.js
```

### 🎉 Résultat

Le système devrait maintenant:
- ✅ Récupérer les nouveaux articles dans les 2 minutes
- ✅ Afficher les articles du jour (14 novembre)
- ✅ Éviter les doublons
- ✅ Être simple à maintenir et déboguer
