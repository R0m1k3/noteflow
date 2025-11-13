// Script de debug approfondi pour la récupération RSS
const Parser = require('rss-parser');
const { getAll, getOne, runQuery, initDatabase } = require('../config/database');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NoteFlow RSS Reader'
  }
});

const TEST_FEED = 'https://news.google.com/rss/search?tbm=nws&q=NBA&oq=NBA&scoring=n&hl=fr&gl=FR&ceid=FR:fr';

async function debugFetch() {
  console.log('\n==================== DEBUG RÉCUPÉRATION RSS ====================\n');

  try {
    await initDatabase();

    console.log('📡 Récupération du flux:', TEST_FEED);
    console.log('');

    const parsedFeed = await parser.parseURL(TEST_FEED);

    console.log(`✅ Flux récupéré: ${parsedFeed.title}`);
    console.log(`📊 Nombre d'articles dans le flux: ${parsedFeed.items.length}\n`);

    // Vérifier les 10 premiers articles
    console.log('🔍 Analyse des 10 premiers articles:\n');

    for (let i = 0; i < Math.min(10, parsedFeed.items.length); i++) {
      const item = parsedFeed.items[i];

      console.log(`${i + 1}. ${item.title}`);
      console.log(`   Date pubDate: ${item.pubDate || 'N/A'}`);
      console.log(`   Date isoDate: ${item.isoDate || 'N/A'}`);

      // Parser la date
      const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
      const parsedDate = new Date(pubDate);
      console.log(`   Date parsée: ${parsedDate.toLocaleString('fr-FR')}`);
      console.log(`   Est valide: ${!isNaN(parsedDate.getTime())}`);

      // Vérifier le lien
      console.log(`   Lien: ${item.link.substring(0, 100)}...`);

      // Vérifier si existe en DB
      const existing = await getOne('SELECT id, pub_date, created_at FROM rss_articles WHERE link = ?', [item.link]);

      if (existing) {
        const dbDate = new Date(existing.pub_date);
        console.log(`   ⚠️  EXISTE DÉJÀ en DB (id: ${existing.id})`);
        console.log(`   Date DB: ${dbDate.toLocaleString('fr-FR')}`);
      } else {
        console.log(`   ✓ NOUVEAU (pas en DB)`);
      }

      console.log('');
    }

    // Statistiques DB
    console.log('📊 Statistiques base de données:\n');

    const totalArticles = await getAll('SELECT COUNT(*) as count FROM rss_articles');
    console.log(`Total articles en DB: ${totalArticles[0]?.count || 0}`);

    const articlesToday = await getAll(`
      SELECT COUNT(*) as count
      FROM rss_articles
      WHERE DATE(pub_date) = DATE('now')
    `);
    console.log(`Articles d'aujourd'hui (13 nov): ${articlesToday[0]?.count || 0}`);

    const articlesYesterday = await getAll(`
      SELECT COUNT(*) as count
      FROM rss_articles
      WHERE DATE(pub_date) = DATE('now', '-1 day')
    `);
    console.log(`Articles d'hier (12 nov): ${articlesYesterday[0]?.count || 0}`);

    // Afficher les 5 plus récents en DB
    console.log('\n📅 5 articles les plus récents en DB:\n');
    const recent = await getAll(`
      SELECT title, pub_date, created_at
      FROM rss_articles
      ORDER BY pub_date DESC
      LIMIT 5
    `);

    recent.forEach((article, i) => {
      const pubDate = new Date(article.pub_date);
      const createdDate = new Date(article.created_at);
      console.log(`${i + 1}. ${article.title}`);
      console.log(`   Publié: ${pubDate.toLocaleString('fr-FR')}`);
      console.log(`   Ajouté: ${createdDate.toLocaleString('fr-FR')}`);
      console.log('');
    });

    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }

  process.exit(0);
}

debugFetch();
