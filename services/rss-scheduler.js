// Service de mise à jour automatique des flux RSS
const Parser = require('rss-parser');
const { getAll, getOne, runQuery } = require('../config/database');
const logger = require('../config/logger');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NoteFlow RSS Reader'
  }
});

let isRunning = false;

/**
 * Récupérer et mettre à jour tous les flux RSS activés
 */
async function fetchAllFeeds() {
  if (isRunning) {
    logger.info('Fetch RSS déjà en cours, skip...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('🔄 Début de la mise à jour des flux RSS...');

    // Récupérer tous les flux activés
    const feeds = await getAll('SELECT * FROM rss_feeds WHERE enabled = 1');

    if (!feeds || feeds.length === 0) {
      logger.info('Aucun flux RSS activé');
      isRunning = false;
      return;
    }

    logger.info(`Mise à jour de ${feeds.length} flux RSS...`);

    let totalArticles = 0;
    let totalErrors = 0;

    // Traiter chaque flux
    for (const feed of feeds) {
      try {
        logger.info(`Fetch: ${feed.url}`);

        // Parser le flux
        const parsedFeed = await parser.parseURL(feed.url);

        // Mettre à jour le titre et description du flux si nécessaire
        await runQuery(
          'UPDATE rss_feeds SET title = ?, description = ?, last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?',
          [parsedFeed.title || feed.url, parsedFeed.description || '', feed.id]
        );

        // Ajouter les articles (limiter à 20 par flux pour ne pas surcharger)
        const items = parsedFeed.items.slice(0, 20);

        for (const item of items) {
          try {
            // Vérifier si l'article existe déjà
            const existing = await getOne('SELECT id FROM rss_articles WHERE link = ?', [item.link]);

            if (!existing) {
              await runQuery(
                'INSERT INTO rss_articles (feed_id, title, link, description, pub_date, content) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  feed.id,
                  item.title || 'Sans titre',
                  item.link || '',
                  item.contentSnippet || item.description || '',
                  item.pubDate || item.isoDate || new Date().toISOString(),
                  item.content || item['content:encoded'] || ''
                ]
              );
              totalArticles++;
            }
          } catch (articleError) {
            // Ignorer les articles en double ou invalides
            logger.debug(`Article ignoré: ${articleError.message}`);
          }
        }

        logger.info(`✓ ${feed.title || feed.url}: ${items.length} articles traités`);

      } catch (feedError) {
        totalErrors++;
        logger.error(`✗ Erreur fetch ${feed.url}:`, feedError.message);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Mise à jour terminée: ${totalArticles} nouveaux articles, ${totalErrors} erreurs (${duration}s)`);

  } catch (error) {
    logger.error('Erreur lors de la mise à jour automatique des flux RSS:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Démarrer le scheduler (toutes les 5 minutes)
 */
function startScheduler() {
  logger.info('📰 Scheduler RSS démarré (mise à jour toutes les 5 minutes)');

  // Première exécution immédiate
  setTimeout(() => {
    fetchAllFeeds().catch(err => {
      logger.error('Erreur lors de la première mise à jour RSS:', err);
    });
  }, 5000); // Attendre 5 secondes après le démarrage du serveur

  // Ensuite toutes les 5 minutes
  setInterval(() => {
    fetchAllFeeds().catch(err => {
      logger.error('Erreur lors de la mise à jour RSS:', err);
    });
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Fetch manuel (utilisé par la route API)
 */
async function manualFetch() {
  return await fetchAllFeeds();
}

module.exports = {
  startScheduler,
  manualFetch,
  fetchAllFeeds
};
