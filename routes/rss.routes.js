// Routes RSS V2 - Simplifiées et robustes
const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const axios = require('axios');
const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  timeout: 30000
});

router.use(authenticateToken);

/**
 * GET /api/rss/feeds
 * Liste tous les flux RSS
 */
router.get('/feeds', requireAdmin, async (req, res) => {
  try {
    const feeds = await getAll('SELECT * FROM rss_feeds ORDER BY created_at DESC');
    res.json(feeds || []);
  } catch (error) {
    logger.error('Erreur récupération flux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/feeds
 * Ajouter un nouveau flux RSS
 */
router.post('/feeds', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    // Vérifier si existe déjà
    const existing = await getOne('SELECT id FROM rss_feeds WHERE url = $1', [url]);
    if (existing) {
      return res.status(409).json({ error: 'Ce flux existe déjà' });
    }

    // Tester le flux
    try {
      let feed;

      // Essai 1: Parser direct
      try {
        feed = await parser.parseURL(url);
      } catch (directError) {
        logger.warn(`[RSS] Parser direct échoué pour ${url}: ${directError.message}, tentative avec axios...`);

        // Essai 2: Fetch avec axios puis parse le contenu
        const axiosResponse = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
          },
          responseType: 'text',
          validateStatus: () => true
        });

        if (axiosResponse.status !== 200) {
          logger.error(`[RSS] Axios fetch failed with status ${axiosResponse.status} for ${url}`);
          throw new Error(`HTTP ${axiosResponse.status}`);
        }

        // Parser le contenu XML récupéré
        feed = await parser.parseString(axiosResponse.data);
      }

      logger.info(`[CREATE RSS FEED] Ajout flux - url: "${url}", title: "${feed.title || url}"`);

      // Ajouter le flux
      const result = await runQuery(
        'INSERT INTO rss_feeds (url, title, description, enabled) VALUES ($1, $2, $3, TRUE) RETURNING *',
        [url, feed.title || url, feed.description || '']
      );

      logger.info(`[CREATE RSS FEED] Flux créé avec succès - ID: ${result.id}, title: "${feed.title}"`);

      // Déclencher un fetch immédiat
      setTimeout(() => {
        const scheduler = require('../services/rss-scheduler-v2');
        scheduler.fetchAllFeeds().catch(err => logger.error('Erreur fetch après ajout:', err));
      }, 1000);

      res.json({
        id: result.id,
        url,
        title: feed.title || url,
        description: feed.description || '',
        enabled: 1
      });
    } catch (parseError) {
      logger.error('Erreur parsing flux:', parseError);
      return res.status(400).json({ error: 'Impossible de parser ce flux RSS' });
    }
  } catch (error) {
    logger.error('Erreur ajout flux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/rss/feeds/:id
 * Activer/désactiver un flux
 */
router.put('/feeds/:id', requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;

    await runQuery(
      'UPDATE rss_feeds SET enabled = $1 WHERE id = $2',
      [enabled, req.params.id] // BOOLEAN instead of 0/1
    );

    logger.info(`Flux ${enabled ? 'activé' : 'désactivé'}: ${req.params.id}`);
    res.json({ message: 'Flux mis à jour' });
  } catch (error) {
    logger.error('Erreur MAJ flux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/rss/feeds/:id
 * Supprimer un flux
 */
router.delete('/feeds/:id', requireAdmin, async (req, res) => {
  try {
    await runQuery('DELETE FROM rss_feeds WHERE id = $1', [req.params.id]);
    logger.info(`Flux supprimé: ${req.params.id}`);
    res.json({ message: 'Flux supprimé' });
  } catch (error) {
    logger.error('Erreur suppression flux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/rss/articles
 * Récupérer les articles - SIMPLE, sans cache compliqué
 */
router.get('/articles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const articles = await getAll(`
      SELECT
        a.id,
        a.title,
        a.link,
        a.description,
        a.pub_date,
        a.content,
        COALESCE(f.title, f.url) as feed_title,
        f.url as feed_url
      FROM rss_articles a
      LEFT JOIN rss_feeds f ON a.feed_id = f.id
      WHERE a.pub_date IS NOT NULL
      ORDER BY a.pub_date DESC
      LIMIT $1
    `, [limit]);

    logger.debug(`Articles récupérés: ${articles?.length || 0}`);
    res.json(articles || []);

  } catch (error) {
    logger.error('Erreur récupération articles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/refresh
 * Forcer une mise à jour manuelle
 */
router.post('/refresh', requireAdmin, async (req, res) => {
  try {
    logger.info('🔄 Refresh manuel déclenché');

    const scheduler = require('../services/rss-scheduler-v2');
    const result = await scheduler.manualFetch();

    res.json({
      message: 'Mise à jour terminée',
      result
    });
  } catch (error) {
    logger.error('Erreur refresh:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/fetch
 * Alias pour refresh
 */
router.post('/fetch', requireAdmin, async (req, res) => {
  try {
    const scheduler = require('../services/rss-scheduler-v2');
    const result = await scheduler.manualFetch();

    res.json({
      message: 'Mise à jour terminée',
      result
    });
  } catch (error) {
    logger.error('Erreur fetch:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/summarize
 * Générer des résumés (conservé de l'ancien système)
 */
router.post('/summarize', async (req, res) => {
  try {
    const apiKey = await getOne('SELECT value FROM settings WHERE key = $1', ['openrouter_api_key']);
    const model = await getOne('SELECT value FROM settings WHERE key = $1', ['openrouter_model']);

    if (!apiKey || !apiKey.value) {
      return res.status(400).json({ error: 'Clé API OpenRouter non configurée' });
    }

    const articles = await getAll(`
      SELECT
        a.id, a.title, a.description, a.link, a.pub_date, a.content,
        COALESCE(f.title, f.url) as feed_title
      FROM rss_articles a
      LEFT JOIN rss_feeds f ON a.feed_id = f.id
      WHERE a.pub_date IS NOT NULL
      ORDER BY a.pub_date DESC
      LIMIT 5
    `);

    if (articles.length === 0) {
      return res.status(400).json({ error: 'Aucun article à résumer' });
    }

    const selectedModel = model?.value || 'openai/gpt-3.5-turbo';
    logger.info(`Génération de ${articles.length} résumés avec ${selectedModel}`);

    const summaryPromises = articles.map(async (article) => {
      const prompt = `Résume cet article en maximum 100 mots. Sois concis et informatif.

Titre: ${article.title}
Source: ${article.feed_title}
Description: ${article.description || ''}
${article.content ? `Contenu: ${article.content.substring(0, 1000)}` : ''}

Résumé (100 mots max):`;

      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: selectedModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey.value}`,
              'HTTP-Referer': 'https://noteflow.app',
              'X-Title': 'NoteFlow RSS Summarizer',
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const summary = response.data.choices[0].message.content;

        logger.info(`[CREATE RSS SUMMARY] Ajout résumé - article: "${article.title}", model: "${selectedModel}"`);

        await runQuery(
          'INSERT INTO rss_summaries (summary, model, articles_count, feed_title, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
          [`**${article.title}**\n\n${summary}\n\n🔗 [Lire l'article](${article.link})`, selectedModel, 1, article.feed_title]
        );

        logger.info(`[CREATE RSS SUMMARY] Résumé créé avec succès`);

        return {
          article_id: article.id,
          title: article.title,
          link: article.link,
          feed_title: article.feed_title,
          summary: summary,
          pub_date: article.pub_date
        };
      } catch (err) {
        logger.error(`Erreur résumé "${article.title}":`, err.message);
        return {
          article_id: article.id,
          title: article.title,
          link: article.link,
          feed_title: article.feed_title,
          summary: article.description || 'Résumé non disponible',
          pub_date: article.pub_date,
          error: true
        };
      }
    });

    const summaries = await Promise.all(summaryPromises);
    logger.info(`${summaries.length} résumés générés`);

    res.json({
      summaries,
      model: selectedModel,
      articles_count: articles.length
    });
  } catch (error) {
    logger.error('Erreur génération résumés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/rss/summaries
 * Récupérer les résumés
 */
router.get('/summaries', async (req, res) => {
  try {
    const summaries = await getAll(`
      SELECT id, summary, model, articles_count, feed_title, created_at
      FROM rss_summaries
      ORDER BY created_at DESC
      LIMIT 5
    `);
    res.json(summaries || []);
  } catch (error) {
    logger.error('Erreur récupération résumés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/rss/models
 * Liste des modèles OpenRouter
 */
router.get('/models', requireAdmin, async (req, res) => {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'HTTP-Referer': 'https://noteflow.app',
        'X-Title': 'NoteFlow'
      },
      timeout: 10000
    });

    const models = response.data.data.map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: model.id.split('/')[0] || 'Unknown',
      context_length: model.context_length,
      pricing: model.pricing
    }));

    models.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });

    res.json(models);
  } catch (error) {
    logger.error('Erreur récupération modèles:', error);

    const fallbackModels = [
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
      { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' }
    ];

    res.json(fallbackModels);
  }
});

module.exports = router;
