// Script pour vérifier les dates des articles RSS
const { getAll, initDatabase } = require('../config/database');

async function checkRssDates() {
  console.log('\n==================== VÉRIFICATION DATES RSS ====================\n');

  try {
    await initDatabase();

    // Vérifier le nombre total d'articles
    const total = await getAll('SELECT COUNT(*) as count FROM rss_articles');
    console.log(`📊 Total articles en base: ${total[0]?.count || 0}\n`);

    // Vérifier les 10 derniers articles par date
    const recent = await getAll(`
      SELECT
        a.title,
        a.pub_date,
        a.created_at,
        f.title as feed_title,
        a.link
      FROM rss_articles a
      LEFT JOIN rss_feeds f ON a.feed_id = f.id
      ORDER BY a.pub_date DESC
      LIMIT 10
    `);

    console.log('📅 10 articles les plus récents (par pub_date):');
    recent.forEach((article, i) => {
      const pubDate = new Date(article.pub_date);
      const createdDate = new Date(article.created_at);
      console.log(`\n${i + 1}. ${article.title}`);
      console.log(`   Source: ${article.feed_title || 'Inconnu'}`);
      console.log(`   Date publication: ${pubDate.toLocaleString('fr-FR')}`);
      console.log(`   Date ajout DB: ${createdDate.toLocaleString('fr-FR')}`);
    });

    // Vérifier les flux
    console.log('\n\n📰 Flux RSS configurés:');
    const feeds = await getAll('SELECT * FROM rss_feeds WHERE enabled = 1');
    feeds.forEach(feed => {
      console.log(`\n- ${feed.title || feed.url}`);
      console.log(`  URL: ${feed.url}`);
      console.log(`  Dernière mise à jour: ${feed.last_fetched_at || 'jamais'}`);
    });

    // Compter articles par flux
    console.log('\n\n📈 Articles par flux:');
    const counts = await getAll(`
      SELECT
        f.title,
        COUNT(a.id) as count,
        MAX(a.pub_date) as latest
      FROM rss_feeds f
      LEFT JOIN rss_articles a ON f.id = a.feed_id
      WHERE f.enabled = 1
      GROUP BY f.id
    `);
    counts.forEach(c => {
      const latest = c.latest ? new Date(c.latest).toLocaleString('fr-FR') : 'aucun';
      console.log(`\n${c.title}: ${c.count} articles`);
      console.log(`  Plus récent: ${latest}`);
    });

    console.log('\n\n========================================================\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }

  process.exit(0);
}

checkRssDates();
