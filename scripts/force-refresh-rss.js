// Script pour forcer la mise à jour des flux RSS et afficher les résultats
const { fetchAllFeeds } = require('../services/rss-scheduler');
const { getAll } = require('../config/database');
const logger = require('../config/logger');

async function forceRefresh() {
  console.log('\n==================== MISE À JOUR FORCÉE RSS ====================\n');

  try {
    console.log('⏳ Lancement de la mise à jour...\n');

    // Forcer la mise à jour
    await fetchAllFeeds();

    console.log('\n📊 Vérification de la base de données...\n');

    // Afficher les statistiques
    const total = await getAll('SELECT COUNT(*) as count FROM rss_articles');
    console.log(`📄 Total articles: ${total[0]?.count || 0}`);

    // Afficher les 10 derniers
    const recent = await getAll(`
      SELECT
        a.title,
        a.pub_date,
        f.title as feed_title
      FROM rss_articles a
      LEFT JOIN rss_feeds f ON a.feed_id = f.id
      ORDER BY a.pub_date DESC
      LIMIT 10
    `);

    if (recent.length > 0) {
      console.log('\n📅 10 articles les plus récents:\n');
      recent.forEach((article, i) => {
        const pubDate = new Date(article.pub_date);
        const now = new Date();
        const diffHours = Math.round((now - pubDate) / (1000 * 60 * 60));

        console.log(`${i + 1}. ${article.title}`);
        console.log(`   Source: ${article.feed_title || 'Inconnu'}`);
        console.log(`   Date: ${pubDate.toLocaleString('fr-FR')} (il y a ${diffHours}h)`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  Aucun article dans la base de données');
    }

    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }

  process.exit(0);
}

forceRefresh();
