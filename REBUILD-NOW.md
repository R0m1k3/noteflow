# 🚀 REBUILD ET REDÉMARRAGE

## Les corrections SQL sont déjà dans le code!

Toutes les requêtes SQL ont été converties de SQLite vers PostgreSQL dans le commit **8007c42**.

## ✅ Il suffit de rebuild Docker

```bash
docker-compose build notes-app
docker-compose restart notes-app
```

## ⏱️ Ce qui va se passer

1. **Build (1-2 minutes)**
   - Docker va reconstruire l'image avec le code corrigé
   - Les 234 requêtes SQL corrigées seront incluses
   - Paramètres: `?` → `$1, $2, $3...`
   - Booléens: `= 1` → `= TRUE`, `= 0` → `= FALSE`

2. **Redémarrage (30 secondes)**
   - PostgreSQL est déjà prêt
   - L'application démarre avec le code corrigé
   - Les tables existent déjà (pas de re-migration)

3. **Résultat**
   - ✅ Connexion `admin`/`admin` fonctionne
   - ✅ Flux RSS fonctionnent
   - ✅ Plus d'erreur SQL dans les logs

## 🔍 Vérifier que ça fonctionne

### Pendant le redémarrage, suivez les logs:

```bash
docker-compose logs -f notes-app
```

### Vous DEVRIEZ voir:

```
✓ PostgreSQL connecté
✓ Tables PostgreSQL créées avec succès
✓ Base de données déjà initialisée
📰 === RSS Scheduler V2 démarré ===
🔄 === Début mise à jour RSS ===
📰 X flux à traiter
✓ Serveur NoteFlow démarré sur le port 2222
```

### Vous NE devriez PLUS voir:

```
❌ "syntax error at end of input"
❌ "operator does not exist: boolean = integer"
```

## 📱 Tester la connexion

1. Ouvrez: **http://localhost:2222**
2. Connectez-vous: `admin` / `admin`
3. ✅ **Succès!** Vous verrez vos notes/tâches/flux RSS

---

## 🎯 COMMANDE UNIQUE

```bash
docker-compose build notes-app && docker-compose restart notes-app && docker-compose logs -f notes-app
```

Cette commande va:
1. Rebuild avec le code corrigé
2. Redémarrer l'application
3. Afficher les logs en temps réel

Appuyez sur **Ctrl+C** pour arrêter de suivre les logs (le serveur continue de tourner).

---

## ✅ Checklist finale

Après le redémarrage:

- [ ] Build terminé sans erreur
- [ ] Logs affichent "✓ Serveur NoteFlow démarré"
- [ ] Pas d'erreur SQL dans les logs
- [ ] http://localhost:2222 accessible
- [ ] Connexion admin/admin réussie
- [ ] Notes visibles
- [ ] Flux RSS fonctionnent

---

**Commit appliqué:** 8007c42 - Fix: Conversion SQL SQLite → PostgreSQL
**234 requêtes SQL corrigées** et prêtes à l'emploi dans l'image Docker.
