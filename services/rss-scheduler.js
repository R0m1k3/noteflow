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
 * Initialiser des flux RSS par défaut
 */
async function initializeDefaultFeeds() {
  try {
    const existingFeeds = await getAll('SELECT COUNT(*) as count FROM rss_feeds');

    if (existingFeeds[0].count === 0) {
      logger.info('🔧 Aucun flux RSS trouvé, ajout de flux par défaut...');

      const defaultFeeds = [
        'https://www.lemonde.fr/rss/une.xml',
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.lefigaro.fr/rss/figaro_actualites.xml'
      ];

      for (const url of defaultFeeds) {
        try {
          const feed = await parser.parseURL(url);
          await runQuery(
            'INSERT INTO rss_feeds (url, title, description, enabled) VALUES (?, ?, ?, 1)',
            [url, feed.title || url, feed.description || '']
          );
          logger.info(`✓ Flux ajouté: ${feed.title || url}`);
        } catch (error) {
          logger.warn(`⚠️  Impossible d'ajouter ${url}: ${error.message}`);
        }
      }

      logger.info('✓ Flux RSS par défaut initialisés');
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation des flux par défaut:', error);
    return false;
  }
}

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
      logger.info('⚠️  Aucun flux RSS activé, initialisation...');
      const initialized = await initializeDefaultFeeds();
      if (initialized) {
        // Réessayer avec les nouveaux flux
        isRunning = false;
        return await fetchAllFeeds();
      }
      isRunning = false;
      return;
    }

    logger.info(`📰 Mise à jour de ${feeds.length} flux RSS...`);

    let totalArticles = 0;
    let totalErrors = 0;

    // Traiter chaque flux
    for (const feed of feeds) {
      try {
        logger.info(`⏳ Fetch: ${feed.url}`);

        // Parser le flux avec timeout
        const parsedFeed = await Promise.race([
          parser.parseURL(feed.url),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 15000)
          )
        ]);

        // Mettre à jour le titre et description du flux
        await runQuery(
          'UPDATE rss_feeds SET title = ?, description = ?, last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?',
          [parsedFeed.title || feed.url, parsedFeed.description || '', feed.id]
        );

        // Ajouter les articles (limiter à 20 par flux pour ne pas surcharger)
        const items = parsedFeed.items.slice(0, 20);
        let feedArticles = 0;

        for (const item of items) {
          try {
            if (!item.link) continue; // Skip articles sans lien

            // Vérifier si l'article existe déjà
            const existing = await getOne('SELECT id FROM rss_articles WHERE link = ?', [item.link]);

            if (!existing) {
              await runQuery(
                'INSERT INTO rss_articles (feed_id, title, link, description, pub_date, content) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  feed.id,
                  item.title || 'Sans titre',
                  item.link,
                  item.contentSnippet || item.description || '',
                  item.pubDate || item.isoDate || new Date().toISOString(),
                  item.content || item['content:encoded'] || ''
                ]
              );
              feedArticles++;
              totalArticles++;
            }
          } catch (articleError) {
            // Ignorer les articles en double
            if (!articleError.message.includes('UNIQUE')) {
              logger.debug(`Article ignoré: ${articleError.message}`);
            }
          }
        }

        logger.info(`✓ ${feed.title || feed.url}: ${feedArticles} nouveaux articles`);

      } catch (feedError) {
        totalErrors++;
        logger.error(`✗ Erreur fetch ${feed.url}: ${feedError.message}`);
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

  // Initialiser les flux par défaut si nécessaire, puis première exécution
  setTimeout(async () => {
    await initializeDefaultFeeds();
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
  fetchAllFeeds,
  initializeDefaultFeeds
};
