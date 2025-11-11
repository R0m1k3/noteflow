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
 * Récupérer tous les articles des flux actifs
 */
router.post('/fetch', requireAdmin, async (req, res) => {
  try {
    const feeds = await getAll('SELECT * FROM rss_feeds WHERE enabled = 1');

    let totalArticles = 0;

    for (const feed of feeds) {
      try {
        const parsedFeed = await parser.parseURL(feed.url);

        // Mettre à jour les infos du flux
        await runQuery(
          'UPDATE rss_feeds SET title = ?, description = ?, last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?',
          [parsedFeed.title || feed.url, parsedFeed.description || '', feed.id]
        );

        // Ajouter les articles
        for (const item of parsedFeed.items) {
          try {
            // Vérifier si l'article existe déjà
            const existing = await getOne('SELECT id FROM rss_articles WHERE link = ?', [item.link]);

            if (!existing) {
              await runQuery(
                'INSERT INTO rss_articles (feed_id, title, link, description, pub_date, content) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  feed.id,
                  item.title || '',
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
            logger.warn(`Erreur lors de l'ajout d'un article: ${articleError.message}`);
          }
        }
      } catch (feedError) {
        logger.error(`Erreur lors du fetch du flux ${feed.url}:`, feedError);
      }
    }

    logger.info(`${totalArticles} nouveaux articles récupérés`);
    res.json({ message: `${totalArticles} nouveaux articles récupérés` });
  } catch (error) {
    logger.error('Erreur lors du fetch des flux RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/rss/articles
 * Récupérer les 10 derniers articles
 */
router.get('/articles', async (req, res) => {
  try {
    const articles = await getAll(`
      SELECT
        a.id, a.title, a.link, a.description, a.pub_date, a.content,
        f.title as feed_title, f.url as feed_url
      FROM rss_articles a
      JOIN rss_feeds f ON a.feed_id = f.id
      ORDER BY a.pub_date DESC
      LIMIT 10
    `);

    res.json(articles || []);
  } catch (error) {
    logger.error('Erreur lors de la récupération des articles RSS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/rss/summarize
 * Générer un résumé des 10 derniers articles avec OpenRouter
 */
router.post('/summarize', requireAdmin, async (req, res) => {
  try {
    // Récupérer les paramètres
    const apiKey = await getOne('SELECT value FROM settings WHERE key = ?', ['openrouter_api_key']);
    const model = await getOne('SELECT value FROM settings WHERE key = ?', ['openrouter_model']);
    const prompt = await getOne('SELECT value FROM settings WHERE key = ?', ['rss_summary_prompt']);

    if (!apiKey || !apiKey.value) {
      return res.status(400).json({ error: 'Clé API OpenRouter non configurée' });
    }

    // Récupérer les 10 derniers articles
    const articles = await getAll(`
      SELECT
        a.title, a.description, a.link, a.pub_date,
        f.title as feed_title
      FROM rss_articles a
      JOIN rss_feeds f ON a.feed_id = f.id
      ORDER BY a.pub_date DESC
      LIMIT 10
    `);

    if (articles.length === 0) {
      return res.status(400).json({ error: 'Aucun article à résumer' });
    }

    // Construire le prompt
    const defaultPrompt = prompt?.value || `Tu es un assistant spécialisé dans la synthèse d'actualités. Analyse les articles suivants et crée un résumé structuré et informatif.

Pour chaque article, identifie:
- Le sujet principal
- Les points clés
- L'importance de l'information

Ensuite, génère un résumé global qui:
1. Regroupe les thèmes communs
2. Hiérarchise les informations par importance
3. Présente une vue d'ensemble claire et concise
4. Utilise un style professionnel mais accessible

Format de sortie en Markdown avec des sections claires.`;

    const articlesText = articles.map((a, i) =>
      `## Article ${i + 1}: ${a.title}\n**Source**: ${a.feed_title}\n**Date**: ${new Date(a.pub_date).toLocaleDateString('fr-FR')}\n**Description**: ${a.description}\n**Lien**: ${a.link}\n`
    ).join('\n---\n');

    const fullPrompt = `${defaultPrompt}\n\n# Articles à résumer:\n\n${articlesText}`;

    // Appeler OpenRouter
    const selectedModel = model?.value || 'openai/gpt-3.5-turbo';

    logger.info(`Génération du résumé avec le modèle ${selectedModel}...`);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey.value}`,
          'HTTP-Referer': 'https://noteflow.app',
          'X-Title': 'NoteFlow RSS Summarizer',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const summary = response.data.choices[0].message.content;

    logger.info('Résumé généré avec succès');

    res.json({
      summary,
      model: selectedModel,
      articles_count: articles.length
    });
  } catch (error) {
    logger.error('Erreur lors de la génération du résumé:', error);

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
 * GET /api/rss/models
 * Récupérer la liste des modèles OpenRouter
 */
router.get('/models', requireAdmin, async (req, res) => {
  try {
    // Liste des modèles populaires pour le résumé
    const models = [
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
      { id: 'openai/gpt-4', name: 'GPT-4', provider: 'OpenAI' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
      { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
      { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' },
      { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', provider: 'Meta' },
      { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral AI' },
      { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'Mistral AI' }
    ];

    res.json(models);
  } catch (error) {
    logger.error('Erreur lors de la récupération des modèles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
