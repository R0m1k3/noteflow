#!/usr/bin/env node

// Script de conversion SQLite → PostgreSQL pour les requêtes SQL
const fs = require('fs');
const path = require('path');

console.log('🔄 Conversion des requêtes SQLite → PostgreSQL\n');

// Fichiers à convertir
const files = [
  'routes/auth.routes.js',
  'routes/calendar.routes.js',
  'routes/notes.routes.js',
  'routes/openrouter.routes.js',
  'routes/rss.routes.js',
  'routes/rss.routes-v2.js',
  'routes/settings.routes.js',
  'routes/todos.routes.js',
  'routes/users.routes.js',
  'services/rss-scheduler.js',
  'services/rss-scheduler-v2.js'
];

let totalChanges = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${file} n'existe pas, skip`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // 1. Convertir les paramètres ? vers $1, $2, $3...
  // Chercher toutes les requêtes SQL entre quotes
  content = content.replace(/(["'`])([^"'`]*?\bWHERE\b[^"'`]*?)(\1)/gi, (match, quote, sql, endQuote) => {
    let newSql = sql;
    let paramCount = 0;

    // Remplacer chaque ? par $N
    newSql = newSql.replace(/\?/g, () => {
      paramCount++;
      return `$${paramCount}`;
    });

    if (paramCount > 0) {
      changes += paramCount;
    }

    return quote + newSql + endQuote;
  });

  // Gérer aussi les requêtes INSERT, UPDATE, DELETE
  content = content.replace(/(["'`])([^"'`]*?\b(?:INSERT|UPDATE|DELETE|SELECT)\b[^"'`]*?)(\1)/gi, (match, quote, sql, endQuote) => {
    if (sql.includes('$')) return match; // Déjà converti

    let newSql = sql;
    let paramCount = 0;

    // Remplacer chaque ? par $N
    newSql = newSql.replace(/\?/g, () => {
      paramCount++;
      return `$${paramCount}`;
    });

    if (paramCount > 0) {
      changes += paramCount;
    }

    return quote + newSql + endQuote;
  });

  // 2. Convertir les booléens 0/1 vers TRUE/FALSE
  // enabled = 1 → enabled = TRUE
  content = content.replace(/\bWHERE\s+(\w+)\s*=\s*1\b/gi, 'WHERE $1 = TRUE');
  content = content.replace(/\bWHERE\s+(\w+)\s*=\s*0\b/gi, 'WHERE $1 = FALSE');
  content = content.replace(/\bAND\s+(\w+)\s*=\s*1\b/gi, 'AND $1 = TRUE');
  content = content.replace(/\bAND\s+(\w+)\s*=\s*0\b/gi, 'AND $1 = FALSE');
  content = content.replace(/\bOR\s+(\w+)\s*=\s*1\b/gi, 'OR $1 = TRUE');
  content = content.replace(/\bOR\s+(\w+)\s*=\s*0\b/gi, 'OR $1 = FALSE');

  // 3. Convertir DEFAULT dans les INSERT
  content = content.replace(/,\s*0\s*\)/g, ', FALSE)'); // Avant la fin de VALUES
  content = content.replace(/,\s*1\s*\)/g, ', TRUE)');
  content = content.replace(/VALUES\s*\(\s*1\s*,/gi, 'VALUES (TRUE,');
  content = content.replace(/VALUES\s*\(\s*0\s*,/gi, 'VALUES (FALSE,');

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${changes} changements`);
    totalChanges += changes;
  } else {
    console.log(`⚪ ${file}: aucun changement`);
  }
});

console.log(`\n✅ Total: ${totalChanges} conversions effectuées`);
console.log('\n📝 Vérifiez manuellement si nécessaire et testez!');
