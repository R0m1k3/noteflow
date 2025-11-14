// Routes d'authentification
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const { getOne } = require('../config/database-loader');
const { generateToken, authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Le nom d\'utilisateur est requis'),
    body('password').notEmpty().withMessage('Le mot de passe est requis')
  ],
  async (req, res) => {
    try {
      // Valider les entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { username, password } = req.body;

      // Rechercher l'utilisateur
      const user = await getOne(
        'SELECT id, username, password_hash, is_admin FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        logger.warn(`Tentative de connexion échouée pour l'utilisateur: ${username}`);
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Vérifier le mot de passe
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        logger.warn(`Mot de passe incorrect pour l'utilisateur: ${username}`);
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Générer le token JWT
      const token = generateToken(user);

      logger.info(`Connexion réussie pour l'utilisateur: ${username}`);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          is_admin: user.is_admin
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la connexion:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
  }
);

/**
 * POST /api/auth/logout
 * Déconnexion (côté client uniquement, token invalidé côté client)
 */
router.post('/logout', authenticateToken, (req, res) => {
  logger.info(`Déconnexion de l'utilisateur: ${req.user.username}`);
  res.json({ message: 'Déconnexion réussie' });
});

/**
 * GET /api/auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getOne(
      'SELECT id, username, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Erreur lors de la récupération des informations utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;