// Routes de gestion des paramètres
const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

// Toutes les routes nécessitent authentification admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/settings
 * Récupérer tous les paramètres
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getAll('SELECT key, value FROM settings');

    // Convertir en objet key-value
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json(settingsObj);
  } catch (error) {
    logger.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/settings
 * Mettre à jour plusieurs paramètres en une fois
 */
router.put('/', async (req, res) => {
  try {
    const settings = req.body;

    // Mettre à jour chaque paramètre
    for (const [key, value] of Object.entries(settings)) {
      // Ignorer les valeurs undefined ou null
      if (value === undefined || value === null) continue;

      // Vérifier si le paramètre existe
      const existing = await getOne('SELECT id FROM settings WHERE key = $1', [key]);

      if (existing) {
        await runQuery(
          'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
          [value, key]
        );
      } else {
        await runQuery(
          'INSERT INTO settings (key, value) VALUES ($1, $2)',
          [key, value]
        );
      }
    }

    logger.info(`${Object.keys(settings).length} paramètres mis à jour`);
    res.json({ message: 'Paramètres mis à jour avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/settings/:key
 * Récupérer un paramètre spécifique
 */
router.get('/:key', async (req, res) => {
  try {
    const setting = await getOne('SELECT value FROM settings WHERE key = $1', [req.params.key]);

    if (!setting) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    res.json({ key: req.params.key, value: setting.value });
  } catch (error) {
    logger.error('Erreur lors de la récupération du paramètre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/settings/:key
 * Mettre à jour un paramètre
 */
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;

    // Vérifier si le paramètre existe
    const existing = await getOne('SELECT id FROM settings WHERE key = $1', [req.params.key]);

    if (existing) {
      await runQuery(
        'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
        [value, req.params.key]
      );
    } else {
      await runQuery(
        'INSERT INTO settings (key, value) VALUES ($1, $2)',
        [req.params.key, value]
      );
    }

    logger.info(`Paramètre mis à jour: ${req.params.key}`);
    res.json({ key: req.params.key, value });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du paramètre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/settings/:key
 * Supprimer un paramètre
 */
router.delete('/:key', async (req, res) => {
  try {
    await runQuery('DELETE FROM settings WHERE key = $1', [req.params.key]);

    logger.info(`Paramètre supprimé: ${req.params.key}`);
    res.json({ message: 'Paramètre supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du paramètre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
