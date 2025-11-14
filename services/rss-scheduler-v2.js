// Service RSS NOUVEAU - Architecture simple et robuste
const Parser = require('rss-parser');
const { getAll, getOne, runQuery } = require('../config/database');
const logger = require('../config/logger');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

let isRunning = false;

// Configuration
const MAX_ARTICLES_PER_FEED = 100; // Garder max 100 articles par flux
const FETCH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const STARTUP_DELAY = 5000; // 5 secondes

/**
 * Récupérer et stocker les articles d'un flux
 */
async function fetchSingleFeed(feed) {
  const startTime = Date.now();
  let newArticlesCount = 0;

  try {
    logger.info(`⏳ Récupération: ${feed.title || feed.url}`);

    // Parser le flux avec timeout
    const parsedFeed = await Promise.race([
      parser.parseURL(feed.url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout après 15s')), 15000)
      )
    ]);

    // Mettre à jour les infos du flux
    await runQuery(
      'UPDATE rss_feeds SET title = $1, description = $2, last_fetched_at = CURRENT_TIMESTAMP WHERE id = $3',
      [parsedFeed.title || feed.url, parsedFeed.description || '', feed.id]
    );

    // Traiter les articles (prendre les 50 premiers)
    const items = parsedFeed.items.slice(0, 50);
    logger.debug(`  ${items.length} articles dans le flux`);

    for (const item of items) {
      try {
        // Validation minimale
        if (!item.title || !item.link) {
          logger.debug(`  ⚠️  Article ignoré: pas de titre ou lien`);
          continue;
        }

        // Normaliser la date
        let pubDate;
        try {
          const dateStr = item.pubDate || item.isoDate;
          pubDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

          // Vérifier que la date est valide
          if (isNaN(new Date(pubDate).getTime())) {
            pubDate = new Date().toISOString();
          }
        } catch (e) {
          pubDate = new Date().toISOString();
        }

        // Vérifier si l'article existe UNIQUEMENT par lien
        // Simple et fiable
        const existing = await getOne(
          'SELECT id FROM rss_articles WHERE link = $1',
          [item.link]
        );

        if (!existing) {
          // Nouvel article - l'ajouter
          await runQuery(
            `INSERT INTO rss_articles (feed_id, title, link, description, pub_date, content)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              feed.id,
              item.title.trim(),
              item.link,
              item.contentSnippet || item.description || '',
              pubDate,
              item.content || item['content:encoded'] || ''
            ]
          );

          newArticlesCount++;
          logger.debug(`  ✓ Ajouté: ${item.title.substring(0, 60)}...`);
        }

      } catch (articleError) {
        // Log mais continue
        if (articleError.message.includes('UNIQUE')) {
          logger.debug(`  - Doublon: ${item.title?.substring(0, 60)}...`);
        } else {
          logger.warn(`  ⚠️  Erreur article: ${articleError.message}`);
        }
      }
    }

    // Nettoyer les vieux articles (garder les N derniers)
    const articlesCount = await getOne(
      'SELECT COUNT(*) as count FROM rss_articles WHERE feed_id = $1',
      [feed.id]
    );

    if (articlesCount.count > MAX_ARTICLES_PER_FEED) {
      const toDelete = articlesCount.count - MAX_ARTICLES_PER_FEED;
      await runQuery(`
        DELETE FROM rss_articles
        WHERE id IN (
          SELECT id FROM rss_articles
          WHERE feed_id = $1
          ORDER BY pub_date ASC
          LIMIT $2
        )
      `, [feed.id, toDelete]);
      logger.debug(`  🗑️  ${toDelete} anciens articles supprimés`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ ${feed.title}: ${newArticlesCount} nouveaux (${duration}s)`);

    return { success: true, newArticles: newArticlesCount };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`❌ ${feed.title || feed.url}: ${error.message} (${duration}s)`);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer tous les flux activés
 */
async function fetchAllFeeds() {
  if (isRunning) {
    logger.debug('⏭️  Fetch déjà en cours, skip');
    return { skipped: true };
  }

  isRunning = true;
  const globalStart = Date.now();

  try {
    logger.info('🔄 === Début mise à jour RSS ===');

    // Récupérer tous les flux activés
    const feeds = await getAll('SELECT * FROM rss_feeds WHERE enabled = TRUE');

    if (!feeds || feeds.length === 0) {
      logger.info('⚠️  Aucun flux RSS activé');
      return { feeds: 0, newArticles: 0 };
    }

    logger.info(`📰 ${feeds.length} flux à traiter`);

    let totalNew = 0;
    let successCount = 0;
    let errorCount = 0;

    // Traiter chaque flux séquentiellement
    for (const feed of feeds) {
      const result = await fetchSingleFeed(feed);

      if (result.success) {
        successCount++;
        totalNew += result.newArticles;
      } else {
        errorCount++;
      }
    }

    const totalDuration = ((Date.now() - globalStart) / 1000).toFixed(2);
    logger.info(`✅ === Fin: ${totalNew} nouveaux articles (${successCount} OK, ${errorCount} erreurs, ${totalDuration}s) ===`);

    return {
      feeds: feeds.length,
      newArticles: totalNew,
      success: successCount,
      errors: errorCount
    };

  } catch (error) {
    logger.error('❌ Erreur globale fetch RSS:', error);
    return { error: error.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Démarrer le scheduler
 */
function startScheduler() {
  logger.info('📰 === RSS Scheduler V2 démarré ===');
  logger.info(`Configuration: fetch toutes les ${FETCH_INTERVAL / 60000} minutes`);
  logger.info(`Max articles par flux: ${MAX_ARTICLES_PER_FEED}`);

  // Premier fetch après le démarrage
  setTimeout(() => {
    logger.info('🚀 Premier fetch RSS...');
    fetchAllFeeds().catch(err => {
      logger.error('Erreur premier fetch:', err);
    });
  }, STARTUP_DELAY);

  // Fetch régulier
  setInterval(() => {
    fetchAllFeeds().catch(err => {
      logger.error('Erreur fetch périodique:', err);
    });
  }, FETCH_INTERVAL);
}

/**
 * Fetch manuel (API)
 */
async function manualFetch() {
  logger.info('🔄 Fetch manuel déclenché');
  return await fetchAllFeeds();
}

module.exports = {
  startScheduler,
  manualFetch,
  fetchAllFeeds
};
