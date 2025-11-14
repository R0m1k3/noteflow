// Script de migration vers le nouveau système RSS V2
const fs = require('fs');
const path = require('path');

console.log('\n==================== MIGRATION RSS V2 ====================\n');

try {
  // 1. Backup de l'ancien système
  console.log('Backup de l\'ancien systeme...');

  const oldScheduler = path.join(__dirname, '../services/rss-scheduler.js');
  const oldRoutes = path.join(__dirname, '../routes/rss.routes.js');

  if (fs.existsSync(oldScheduler)) {
    fs.copyFileSync(oldScheduler, oldScheduler + '.backup');
    console.log('  OK rss-scheduler.js -> rss-scheduler.js.backup');
  }

  if (fs.existsSync(oldRoutes)) {
    fs.copyFileSync(oldRoutes, oldRoutes + '.backup');
    console.log('  OK rss.routes.js -> rss.routes.js.backup');
  }

  console.log('');

  // 2. Remplacer par les nouvelles versions
  console.log('Installation du nouveau systeme...');

  const newScheduler = path.join(__dirname, '../services/rss-scheduler-v2.js');
  const newRoutes = path.join(__dirname, '../routes/rss.routes-v2.js');

  if (fs.existsSync(newScheduler)) {
    fs.copyFileSync(newScheduler, oldScheduler);
    console.log('  OK rss-scheduler-v2.js -> rss-scheduler.js');
  }

  if (fs.existsSync(newRoutes)) {
    fs.copyFileSync(newRoutes, oldRoutes);
    console.log('  OK rss.routes-v2.js -> rss.routes.js');
  }

  console.log('');

  console.log('Pour nettoyer la base de donnees RSS:');
  console.log('   node scripts/reset-rss.js');
  console.log('');

  console.log('========================================================');
  console.log('Migration terminee!');
  console.log('');
  console.log('Prochaines etapes:');
  console.log('1. Redemarrez le serveur');
  console.log('2. (Optionnel) Nettoyez la DB: node scripts/reset-rss.js');
  console.log('3. Ajoutez vos flux RSS via l\'interface');
  console.log('========================================================\n');

} catch (error) {
  console.error('Erreur migration:', error);
  process.exit(1);
}

process.exit(0);
