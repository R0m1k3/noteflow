// Script pour voir EXACTEMENT ce qu'il y a dans la DB
const { getAll, initDatabase } = require('../config/database');

async function checkDB() {
  console.log('\n==================== VERIFICATION DB RSS ====================\n');

  try {
    await initDatabase();

    // Compter les flux
    const feedsCount = await getAll('SELECT COUNT(*) as count FROM rss_feeds');
    console.log(`Flux RSS: ${feedsCount[0].count}\n`);

    // Lister les flux
    const feeds = await getAll('SELECT id, title, url, enabled FROM rss_feeds');
    if (feeds.length > 0) {
      console.log('Liste des flux:');
      feeds.forEach(f => {
        console.log(`  ${f.id}. ${f.title} (${f.enabled ? 'actif' : 'inactif'})`);
        console.log(`     ${f.url.substring(0, 80)}...`);
      });
      console.log('');
    }

    // Compter les articles
    const articlesCount = await getAll('SELECT COUNT(*) as count FROM rss_articles');
    console.log(`Articles: ${articlesCount[0].count}\n`);

    if (articlesCount[0].count > 0) {
      // Compter par flux
      const byFeed = await getAll(`
        SELECT f.title, COUNT(a.id) as count, MAX(a.pub_date) as latest
        FROM rss_feeds f
        LEFT JOIN rss_articles a ON f.id = a.feed_id
        GROUP BY f.id
      `);

      console.log('Articles par flux:');
      byFeed.forEach(item => {
        const latest = item.latest ? new Date(item.latest).toLocaleString('fr-FR') : 'aucun';
        console.log(`  ${item.title}: ${item.count} articles`);
        console.log(`    Plus récent: ${latest}`);
      });
      console.log('');

      // Afficher les 10 derniers
      const recent = await getAll(`
        SELECT a.title, a.pub_date, f.title as feed_title
        FROM rss_articles a
        LEFT JOIN rss_feeds f ON a.feed_id = f.id
        ORDER BY a.pub_date DESC
        LIMIT 10
      `);

      console.log('10 derniers articles:');
      recent.forEach((article, i) => {
        const date = new Date(article.pub_date);
        const now = new Date();
        const diffHours = Math.round((now - date) / (1000 * 60 * 60));
        const isToday = date.toDateString() === now.toDateString();

        console.log(`\n${i + 1}. ${article.title}`);
        console.log(`   Source: ${article.feed_title}`);
        console.log(`   Date: ${date.toLocaleString('fr-FR')} ${isToday ? '(AUJOURD\'HUI)' : `(il y a ${diffHours}h)`}`);
      });
    }

    console.log('\n========================================================\n');

  } catch (error) {
    console.error('Erreur:', error);
  }

  process.exit(0);
}

checkDB();
