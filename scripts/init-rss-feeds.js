// Script pour initialiser des flux RSS par défaut
const Parser = require('rss-parser');
const { getAll, runQuery, initDatabase } = require('../config/database');
const logger = require('../config/logger');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NoteFlow RSS Reader'
  }
});

const DEFAULT_FEEDS = [
  'https://news.google.com/rss/search?tbm=nws&q=NBA&oq=NBA&scoring=n&hl=fr&gl=FR&ceid=FR:fr',
  'https://dwh.lequipe.fr/api/edito/rss?path=/Basket/Nba/',
  'https://fresh.vonrodbox.eu/i/?a=rss&user=Michael&token=Lapin2509&hours=168'
];

async function initFeeds() {
  console.log('\n==================== INITIALISATION FLUX RSS ====================\n');

  try {
    await initDatabase();

    // Vérifier les flux existants
    const existing = await getAll('SELECT * FROM rss_feeds');
    console.log(`📰 Flux existants: ${existing.length}\n`);

    for (const url of DEFAULT_FEEDS) {
      try {
        // Vérifier si le flux existe déjà
        const exists = existing.find(f => f.url === url);
        if (exists) {
          console.log(`⏭️  Flux déjà présent: ${exists.title || url}`);
          continue;
        }

        console.log(`⏳ Ajout du flux: ${url}`);

        // Parser le flux
        const feed = await parser.parseURL(url);

        // Ajouter le flux
        const result = await runQuery(
          'INSERT INTO rss_feeds (url, title, description, enabled) VALUES (?, ?, ?, 1)',
          [url, feed.title || url, feed.description || '']
        );

        console.log(`✅ Flux ajouté: ${feed.title}`);
        console.log(`   Articles disponibles: ${feed.items.length}`);

        // Ajouter les articles (limiter à 100)
        const items = feed.items.slice(0, 100);
        let addedCount = 0;

        for (const item of items) {
          try {
            if (!item.link) continue;

            await runQuery(
              'INSERT INTO rss_articles (feed_id, title, link, description, pub_date, content) VALUES (?, ?, ?, ?, ?, ?)',
              [
                result.id,
                item.title || 'Sans titre',
                item.link,
                item.contentSnippet || item.description || '',
                item.pubDate || item.isoDate || new Date().toISOString(),
                item.content || item['content:encoded'] || ''
              ]
            );
            addedCount++;
          } catch (err) {
            // Ignorer les doublons
            if (!err.message.includes('UNIQUE')) {
              console.log(`   ⚠️  Article ignoré: ${err.message}`);
            }
          }
        }

        console.log(`   Articles ajoutés: ${addedCount}\n`);

      } catch (error) {
        console.error(`❌ Erreur avec ${url}:`, error.message, '\n');
      }
    }

    // Résumé final
    const finalFeeds = await getAll('SELECT COUNT(*) as count FROM rss_feeds WHERE enabled = 1');
    const finalArticles = await getAll('SELECT COUNT(*) as count FROM rss_articles');

    console.log('========================================================');
    console.log(`✅ Initialisation terminée!`);
    console.log(`📰 Flux actifs: ${finalFeeds[0].count}`);
    console.log(`📄 Articles en base: ${finalArticles[0].count}`);
    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  }

  process.exit(0);
}

initFeeds();
