// Script pour réinitialiser complètement le système RSS
const { runQuery, initDatabase } = require('../config/database');

async function resetRSS() {
  console.log('\n==================== RESET SYSTÈME RSS ====================\n');

  try {
    await initDatabase();

    // Supprimer tous les articles
    console.log('🗑️  Suppression de tous les articles RSS...');
    await runQuery('DELETE FROM rss_articles');
    console.log('✓ Articles supprimés\n');

    // Supprimer tous les flux
    console.log('🗑️  Suppression de tous les flux RSS...');
    await runQuery('DELETE FROM rss_feeds');
    console.log('✓ Flux supprimés\n');

    // Supprimer tous les résumés
    console.log('🗑️  Suppression de tous les résumés...');
    await runQuery('DELETE FROM rss_summaries');
    console.log('✓ Résumés supprimés\n');

    // Réinitialiser les séquences
    console.log('🔄 Réinitialisation des compteurs...');
    await runQuery('DELETE FROM sqlite_sequence WHERE name IN ("rss_articles", "rss_feeds", "rss_summaries")');
    console.log('✓ Compteurs réinitialisés\n');

    console.log('========================================================');
    console.log('✅ Système RSS complètement réinitialisé!');
    console.log('Vous pouvez maintenant ajouter de nouveaux flux.');
    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }

  process.exit(0);
}

resetRSS();
