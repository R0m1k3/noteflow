// Script de diagnostic RSS
const { getAll, initDatabase } = require('../config/database');
const logger = require('../config/logger');

async function diagnoseRSS() {
  console.log('\n==================== DIAGNOSTIC RSS ====================\n');

  try {
    // Initialize database first
    await initDatabase();
    // Vérifier les flux RSS
    const feeds = await getAll('SELECT * FROM rss_feeds');
    console.log(`📰 Flux RSS en base: ${feeds?.length || 0}`);
    if (feeds && feeds.length > 0) {
      feeds.forEach(feed => {
        console.log(`  - ${feed.title || feed.url} (${feed.enabled ? 'activé' : 'désactivé'})`);
        console.log(`    Dernière mise à jour: ${feed.last_fetched_at || 'jamais'}`);
      });
    } else {
      console.log('  ⚠️  Aucun flux RSS configuré');
      console.log('  💡 Ajoutez un flux via l\'interface admin');
    }

    console.log('');

    // Vérifier les articles
    const articles = await getAll('SELECT COUNT(*) as count FROM rss_articles');
    console.log(`📄 Articles RSS en base: ${articles[0]?.count || 0}`);

    if (articles[0]?.count > 0) {
      const recentArticles = await getAll(`
        SELECT
          a.title,
          a.pub_date,
          f.title as feed_title
        FROM rss_articles a
        LEFT JOIN rss_feeds f ON a.feed_id = f.id
        ORDER BY a.pub_date DESC
        LIMIT 5
      `);

      console.log('\n5 derniers articles:');
      recentArticles.forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title}`);
        console.log(`     Source: ${article.feed_title || 'Inconnu'}`);
        console.log(`     Date: ${article.pub_date}`);
      });
    }

    console.log('');

    // Vérifier les résumés
    const summaries = await getAll('SELECT COUNT(*) as count FROM rss_summaries');
    console.log(`📝 Résumés RSS en base: ${summaries[0]?.count || 0}`);

    console.log('');

    // Vérifier les settings
    const settings = await getAll('SELECT * FROM settings WHERE key LIKE "rss%" OR key LIKE "openrouter%"');
    console.log(`⚙️  Settings RSS/OpenRouter: ${settings?.length || 0}`);
    if (settings && settings.length > 0) {
      settings.forEach(setting => {
        const value = setting.key.includes('api_key')
          ? (setting.value ? '***' + setting.value.slice(-4) : 'non défini')
          : setting.value;
        console.log(`  - ${setting.key}: ${value}`);
      });
    }

    console.log('\n========================================================\n');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }

  process.exit(0);
}

// Exécuter le diagnostic
diagnoseRSS();
