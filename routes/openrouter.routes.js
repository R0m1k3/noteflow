// Routes pour OpenRouter API
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getOne } = require('../config/database');
const logger = require('../config/logger');

// Cache pour les modèles (rafraîchi toutes les heures)
let modelsCache = null;
let modelsCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure

/**
 * GET /api/openrouter/models
 * Récupérer la liste des modèles disponibles depuis OpenRouter
 */
router.get('/models', authenticateToken, async (req, res) => {
  try {
    // Vérifier le cache
    const now = Date.now();
    if (modelsCache && (now - modelsCacheTime) < CACHE_DURATION) {
      return res.json(modelsCache);
    }

    // Récupérer la clé API depuis les paramètres
    const setting = await getOne('SELECT value FROM settings WHERE key = $1', ['openrouter_api_key']);

    if (!setting || !setting.value) {
      // Return 200 with empty array to avoid console errors
      return res.status(200).json([]);
    }

    // Appeler l'API OpenRouter pour récupérer les modèles
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${setting.value}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
        'X-Title': 'NoteFlow'
      }
    });

    if (!response.ok) {
      logger.error(`Erreur API OpenRouter: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Erreur lors de la récupération des modèles',
        models: []
      });
    }

    const data = await response.json();

    // Extraire et formater les modèles
    const models = (data.data || []).map(model => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description || '',
      context_length: model.context_length || 0,
      pricing: model.pricing || {}
    }));

    // Trier par nom
    models.sort((a, b) => a.name.localeCompare(b.name));

    // Mettre en cache
    modelsCache = models;
    modelsCacheTime = now;

    logger.info(`✓ ${models.length} modèles OpenRouter récupérés`);
    res.json(models);
  } catch (error) {
    logger.error('Erreur lors de la récupération des modèles OpenRouter:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      models: []
    });
  }
});

/**
 * POST /api/openrouter/refresh-models
 * Forcer le rafraîchissement du cache des modèles
 */
router.post('/refresh-models', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Invalider le cache
    modelsCache = null;
    modelsCacheTime = 0;

    // Rediriger vers la route GET pour récupérer les modèles
    const setting = await getOne('SELECT value FROM settings WHERE key = $1', ['openrouter_api_key']);

    if (!setting || !setting.value) {
      return res.status(200).json({
        message: 'Clé API OpenRouter non configurée',
        models: []
      });
    }

    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${setting.value}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
        'X-Title': 'NoteFlow'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erreur lors de la récupération des modèles',
        models: []
      });
    }

    const data = await response.json();
    const models = (data.data || []).map(model => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description || '',
      context_length: model.context_length || 0,
      pricing: model.pricing || {}
    }));

    models.sort((a, b) => a.name.localeCompare(b.name));

    modelsCache = models;
    modelsCacheTime = Date.now();

    logger.info(`✓ Cache des modèles OpenRouter rafraîchi (${models.length} modèles)`);
    res.json({ message: 'Cache rafraîchi avec succès', models });
  } catch (error) {
    logger.error('Erreur lors du rafraîchissement des modèles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/openrouter/chat
 * Envoyer un message au modèle IA
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { model, messages } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Modèle et messages requis' });
    }

    // Récupérer la clé API
    const setting = await getOne('SELECT value FROM settings WHERE key = $1', ['openrouter_api_key']);

    if (!setting || !setting.value) {
      return res.status(400).json({ error: 'Clé API OpenRouter non configurée' });
    }

    // Appeler l'API OpenRouter
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${setting.value}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
        'X-Title': 'NoteFlow',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`Erreur API OpenRouter chat: ${response.status}`, errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || 'Erreur lors de la communication avec l\'IA'
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Erreur lors du chat OpenRouter:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
