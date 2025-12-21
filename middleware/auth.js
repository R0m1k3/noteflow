// Middleware d'authentification JWT et API Key
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { getOne } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production_please_use_strong_secret';

if (JWT_SECRET === 'change_me_in_production_please_use_strong_secret' && process.env.NODE_ENV === 'production') {
  logger.warn('⚠️  ATTENTION: JWT_SECRET par défaut utilisé en production! Changez-le immédiatement!');
}

/**
 * Middleware pour vérifier le token JWT ou la clé API
 * Supporte:
 * - Header "Authorization: Bearer TOKEN" (JWT, expire après 24h)
 * - Header "X-API-Key: API_KEY" (clé permanente)
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  // Option 1: Clé API permanente (prioritaire)
  if (apiKey) {
    try {
      const user = await getOne(
        'SELECT id, username, is_admin FROM users WHERE api_key = $1',
        [apiKey]
      );

      if (!user) {
        logger.warn(`Tentative d'accès avec clé API invalide`);
        return res.status(403).json({ error: 'Clé API invalide' });
      }

      req.user = user;
      req.authType = 'api_key';
      return next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de la clé API:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Option 2: Token JWT
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification ou clé API manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn(`Tentative d'accès avec token invalide: ${err.message}`);
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }

    // Ajouter les informations utilisateur à la requête
    req.user = user;
    req.authType = 'jwt';
    next();
  });
}

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    logger.warn(`Tentative d'accès admin par utilisateur non autorisé: ${req.user?.username || 'unknown'}`);
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

/**
 * Générer un token JWT
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    is_admin: user.is_admin
  };

  // Token valide pour 24 heures
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Vérifier un token JWT (sans middleware)
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  verifyToken
};