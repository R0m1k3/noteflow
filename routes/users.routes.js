// Routes de gestion des utilisateurs (admin uniquement)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

// Toutes les routes nécessitent authentification et droits admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/users
 * Liste tous les utilisateurs
 */
router.get('/', async (req, res) => {
  try {
    const users = await getAll(
      'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/users
 * Créer un nouvel utilisateur
 */
router.post('/',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Le nom d\'utilisateur doit contenir au moins 3 caractères'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('is_admin').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { username, password, is_admin } = req.body;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await getOne('SELECT id FROM users WHERE username = $1', [username]);
      if (existingUser) {
        return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
      }

      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash(password, 12);

      logger.info(`[CREATE USER] Début création - username: "${username}", is_admin: ${is_admin ? 1 : 0}`);

      // Créer l'utilisateur
      const result = await runQuery(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING *',
        [username, passwordHash, is_admin ? 1 : 0]
      );

      logger.info(`[CREATE USER] Utilisateur créé avec succès - ID: ${result.id}, username: "${username}"`);

      res.status(201).json({
        id: result.id,
        username,
        is_admin: is_admin || false
      });
    } catch (error) {
      logger.error('Erreur lors de la création de l\'utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PUT /api/users/:id
 * Modifier un utilisateur
 */
router.put('/:id',
  [
    body('password').optional().isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('is_admin').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const userId = req.params.id;
      const { password, is_admin } = req.body;

      // Vérifier que l'utilisateur existe
      const user = await getOne('SELECT id, username FROM users WHERE id = $1', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Mettre à jour le mot de passe si fourni
      if (password) {
        const passwordHash = await bcrypt.hash(password, 12);
        await runQuery('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
      }

      // Mettre à jour le statut admin si fourni
      if (typeof is_admin !== 'undefined') {
        await runQuery('UPDATE users SET is_admin = $1 WHERE id = $2', [is_admin ? 1 : 0, userId]);
      }

      logger.info(`Utilisateur modifié: ${user.username} (ID: ${userId})`);

      res.json({ message: 'Utilisateur modifié avec succès' });
    } catch (error) {
      logger.error('Erreur lors de la modification de l\'utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Ne pas permettre la suppression de soi-même
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Vérifier que l'utilisateur existe
    const user = await getOne('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Supprimer l'utilisateur (les notes et todos seront supprimés en cascade)
    await runQuery('DELETE FROM users WHERE id = $1', [userId]);

    logger.info(`Utilisateur supprimé: ${user.username} (ID: ${userId})`);

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;