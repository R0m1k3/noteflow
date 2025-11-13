// Routes de gestion des flux RSS
const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const axios = require('axios');
const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

const parser = new Parser();

// Routes admin (gestion des flux)
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
    logger.error('Erreur lors de la récupération des flux RSS:', error);
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

    // Vérifier si le flux existe déjà
    const existing = await getOne('SELECT id FROM rss_feeds WHERE url = ?', [url]);
    if (existing) {
      return res.status(409).json({ error: 'Ce flux existe déjà' });
    }

    // Tester le flux
    try {
      const feed = await parser.parseURL(url);

      // Ajouter le flux
      const result = await runQuery(
        'INSERT INTO rss_feeds (url, title, description) VALUES (?, ?, ?)',
        [url, feed.title || url, feed.description || '']
      );

      logger.info(`Flux RSS ajouté: ${feed.title} (${url})`);

      res.json({
        id: result.id,
        url,
        title: feed.title || url,
        description: feed.description || '',
        enabled: 1
      });
    } catch (parseError) {
      logger.error('Erreur lors du parsing du flux RSS:', parseError);
      return res.status(400).json({ error: 'Impossible de parser ce flux RSS. Vérifiez l\'URL.' });
    }
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du flux RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/rss/feeds/:id
 * Mettre à jour un flux RSS (activer/désactiver)
 */
router.put('/feeds/:id', requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;

    await runQuery(
      'UPDATE rss_feeds SET enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, req.params.id]
    );

    logger.info(`Flux RSS ${enabled ? 'activé' : 'désactivé'}: ${req.params.id}`);
    res.json({ message: 'Flux mis à jour avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du flux RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/rss/feeds/:id
 * Supprimer un flux RSS
 */
router.delete('/feeds/:id', requireAdmin, async (req, res) => {
  try {
    await runQuery('DELETE FROM rss_feeds WHERE id = ?', [req.params.id]);

    logger.info(`Flux RSS supprimé: ${req.params.id}`);
    res.json({ message: 'Flux supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du flux RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/fetch
 * Récupérer manuellement les articles de tous les flux RSS activés
 */
router.post('/fetch', requireAdmin, async (req, res) => {
  try {
    const rssScheduler = require('../services/rss-scheduler');
    await rssScheduler.manualFetch();

    // Invalider le cache
    articlesCache = null;
    articlesCacheTime = 0;

    res.json({ message: 'Mise à jour des flux RSS terminée avec succès' });
  } catch (error) {
    logger.error('Erreur lors du fetch manuel des flux RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/refresh
 * Alias pour fetch (pour compatibilité)
 */
router.post('/refresh', requireAdmin, async (req, res) => {
  try {
    const rssScheduler = require('../services/rss-scheduler');
    await rssScheduler.manualFetch();

    // Invalider le cache
    articlesCache = null;
    articlesCacheTime = 0;

    res.json({ message: 'Mise à jour des flux RSS terminée avec succès' });
  } catch (error) {
    logger.error('Erreur lors du refresh des flux RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Cache pour les articles RSS (30 secondes)
let articlesCache = null;
let articlesCacheTime = 0;
const ARTICLES_CACHE_DURATION = 30000; // 30 secondes

/**
 * Fonction pour invalider le cache (appelée par le scheduler)
 */
function invalidateCache() {
  articlesCache = null;
  articlesCacheTime = 0;
  logger.debug('Cache des articles RSS invalidé');
}

/**
 * GET /api/rss/articles
 * Récupérer les articles RSS (avec cache et paramètres limit et hours)
 * @query limit - Nombre d'articles à récupérer (défaut: 50)
 * @query hours - Récupérer uniquement les articles des X dernières heures (défaut: tous)
 */
router.get('/articles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Augmenté de 5 à 50
    const hours = parseInt(req.query.hours) || null;

    // Construire la requête SQL avec filtre temporel optionnel
    let query = `
      SELECT
        a.id, a.title, a.link, a.description, a.pub_date, a.content,
        COALESCE(f.title, f.url) as feed_title, f.url as feed_url
      FROM rss_articles a
      LEFT JOIN rss_feeds f ON a.feed_id = f.id
      WHERE a.pub_date IS NOT NULL
    `;

    const params = [];

    // Ajouter un filtre temporel si spécifié
    if (hours) {
      query += ` AND datetime(a.pub_date) >= datetime('now', '-${hours} hours')`;
      logger.debug(`Filtre appliqué: articles des ${hours} dernières heures`);
    }

    query += `
      ORDER BY a.pub_date ASC
      LIMIT ?
    `;
    params.push(limit);

    // Ne pas utiliser le cache si un filtre temporel est appliqué
    if (!hours) {
      // Utiliser le cache si disponible et récent
      const now = Date.now();
      if (articlesCache && (now - articlesCacheTime) < ARTICLES_CACHE_DURATION) {
        logger.debug('Articles RSS servis depuis le cache');
        return res.json(articlesCache.slice(0, limit));
      }
    }

    const articles = await getAll(query, params);

    // Mettre en cache uniquement si pas de filtre temporel
    if (!hours) {
      articlesCache = articles || [];
      articlesCacheTime = Date.now();
    }

    logger.info(`Articles RSS récupérés: ${articles?.length || 0} (limit: ${limit}${hours ? `, ${hours}h` : ''})`);
    res.json(articles || []);
  } catch (error) {
    logger.error('Erreur lors de la récupération des articles RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/summarize
 * Générer un résumé PAR ARTICLE (100 mots max) avec lien
 */
router.post('/summarize', async (req, res) => {
  try {
    // Récupérer les paramètres
    const apiKey = await getOne('SELECT value FROM settings WHERE key = ?', ['openrouter_api_key']);
    const model = await getOne('SELECT value FROM settings WHERE key = ?', ['openrouter_model']);

    if (!apiKey || !apiKey.value) {
      return res.status(400).json({ error: 'Clé API OpenRouter non configurée' });
    }

    // Récupérer les 5 derniers articles
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

    // Générer un résumé pour CHAQUE article (en parallèle)
    const selectedModel = model?.value || 'openai/gpt-3.5-turbo';
    logger.info(`Génération de ${articles.length} résumés avec ${selectedModel}...`);

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
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
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

        // Sauvegarder le résumé individuel avec feed_title
        await runQuery(
          'INSERT INTO rss_summaries (summary, model, articles_count, feed_title, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
          [`**${article.title}**\n\n${summary}\n\n🔗 [Lire l'article](${article.link})`, selectedModel, 1, article.feed_title]
        );

        return {
          article_id: article.id,
          title: article.title,
          link: article.link,
          feed_title: article.feed_title,
          summary: summary,
          pub_date: article.pub_date
        };
      } catch (err) {
        logger.error(`Erreur résumé article "${article.title}":`, err.message);
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

    logger.info(`${summaries.length} résumés générés avec succès`);

    res.json({
      summaries,
      model: selectedModel,
      articles_count: articles.length
    });
  } catch (error) {
    logger.error('Erreur lors de la génération des résumés:', error);

    if (error.response) {
      logger.error('Réponse OpenRouter:', error.response.data);
      return res.status(error.response.status).json({
        error: 'Erreur API OpenRouter',
        details: error.response.data
      });
    }

    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/rss/summaries
 * Récupérer les 5 derniers résumés
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
    logger.error('Erreur lors de la récupération des résumés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/rss/models
 * Récupérer la liste des modèles OpenRouter depuis l'API
 */
router.get('/models', requireAdmin, async (req, res) => {
  try {
    // Récupérer les modèles depuis l'API OpenRouter
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'HTTP-Referer': 'https://noteflow.app',
        'X-Title': 'NoteFlow'
      },
      timeout: 10000
    });

    // Transformer les données en format simplifié
    const models = response.data.data.map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: model.id.split('/')[0] || 'Unknown',
      context_length: model.context_length,
      pricing: model.pricing
    }));

    // Trier par provider puis par nom
    models.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });

    res.json(models);
  } catch (error) {
    logger.error('Erreur lors de la récupération des modèles:', error);

    // Fallback sur une liste de modèles populaires si l'API échoue
    const fallbackModels = [
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
      { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
      { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'google' },
      { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', provider: 'meta-llama' },
      { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'mistralai' }
    ];

    res.json(fallbackModels);
  }
});

module.exports = router;
module.exports.invalidateCache = invalidateCache;
