// Script pour nettoyer les doublons et analyser les liens
const { getAll, runQuery, initDatabase } = require('../config/database');

async function cleanupDuplicates() {
  console.log('\n==================== NETTOYAGE DOUBLONS RSS ====================\n');

  try {
    await initDatabase();

    // Afficher les articles avec le même titre mais des liens différents
    console.log('🔍 Recherche de doublons par titre:\n');

    const duplicates = await getAll(`
      SELECT
        title,
        COUNT(*) as count,
        GROUP_CONCAT(link, '|||') as links,
        GROUP_CONCAT(pub_date, '|||') as dates
      FROM rss_articles
      GROUP BY title
      HAVING count > 1
      ORDER BY count DESC
      LIMIT 10
    `);

    if (duplicates.length > 0) {
      console.log(`⚠️  Trouvé ${duplicates.length} titres en double:\n`);

      duplicates.forEach((dup, i) => {
        console.log(`${i + 1}. "${dup.title}"`);
        console.log(`   Nombre de doublons: ${dup.count}`);

        const links = dup.links.split('|||');
        const dates = dup.dates.split('|||');

        links.forEach((link, j) => {
          console.log(`   ${j + 1}. ${link.substring(0, 80)}...`);
          console.log(`      Date: ${new Date(dates[j]).toLocaleString('fr-FR')}`);
        });
        console.log('');
      });

      // Proposer le nettoyage
      console.log('💡 Pour nettoyer, garder uniquement l\'article le plus récent par titre.\n');

    } else {
      console.log('✓ Aucun doublon trouvé par titre\n');
    }

    // Analyser les patterns de liens
    console.log('🔗 Analyse des patterns de liens:\n');

    const sampleLinks = await getAll(`
      SELECT link, title
      FROM rss_articles
      ORDER BY created_at DESC
      LIMIT 5
    `);

    sampleLinks.forEach((article, i) => {
      console.log(`${i + 1}. ${article.title.substring(0, 50)}...`);
      console.log(`   ${article.link}`);

      // Extraire le domaine et les paramètres
      try {
        const url = new URL(article.link);
        console.log(`   Domaine: ${url.hostname}`);
        console.log(`   Params: ${url.search}`);
      } catch (e) {
        console.log(`   ⚠️  URL invalide`);
      }
      console.log('');
    });

    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }

  process.exit(0);
}

cleanupDuplicates();
