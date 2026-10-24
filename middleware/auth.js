// Middleware d'authentification JWT et API Key
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { getOne, runQuery } = require('../config/database');

// Ancienne valeur par défaut publique : ne doit jamais être utilisée pour signer des tokens
const PUBLIC_DEFAULT_SECRET = 'change_me_in_production_please_use_strong_secret';

// Secret JWT effectif (initialisé au démarrage par initJwtSecret)
let JWT_SECRET = null;

/**
 * Initialiser le secret JWT.
 * - Utilise JWT_SECRET de l'environnement s'il est défini (et différent de l'ancienne valeur publique)
 * - Sinon, génère un secret aléatoire fort et le persiste en base (table app_secrets)
 *   afin qu'il survive aux redémarrages.
 */
async function initJwtSecret() {
  const envSecret = process.env.JWT_SECRET;

  if (envSecret && envSecret !== PUBLIC_DEFAULT_SECRET) {
    if (envSecret.length < 32) {
      logger.warn('⚠️  JWT_SECRET est court (< 32 caractères). Utilisez une valeur longue et aléatoire.');
    }
    JWT_SECRET = envSecret;
    return;
  }

  if (envSecret === PUBLIC_DEFAULT_SECRET) {
    logger.warn('⚠️  JWT_SECRET contient l\'ancienne valeur par défaut publique : elle est ignorée, un secret aléatoire persistant est utilisé à la place.');
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS app_secrets (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await runQuery(
    'INSERT INTO app_secrets (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
    ['jwt_secret', crypto.randomBytes(64).toString('hex')]
  );
  const row = await getOne('SELECT value FROM app_secrets WHERE key = $1', ['jwt_secret']);

  if (!row || !row.value) {
    throw new Error('Impossible d\'initialiser le secret JWT');
  }

  JWT_SECRET = row.value;
  logger.info('✓ Secret JWT chargé depuis la base de données (généré automatiquement)');
}

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('Secret JWT non initialisé');
  }
  return JWT_SECRET;
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

  let secret;
  try {
    secret = getJwtSecret();
  } catch (error) {
    logger.error('Erreur lors de la vérification du token:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }

  jwt.verify(token, secret, (err, user) => {
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
 * Le statut admin est toujours relu en base (jamais depuis le payload du token)
 */
async function requireAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    logger.warn('Tentative d\'accès admin sans utilisateur authentifié');
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }

  try {
    const dbUser = await getOne('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);

    if (!dbUser || !dbUser.is_admin) {
      logger.warn(`Tentative d'accès admin par utilisateur non autorisé: ${req.user?.username || 'unknown'}`);
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    req.user.is_admin = true;
    next();
  } catch (error) {
    logger.error('Erreur lors de la vérification des droits admin:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
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
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

/**
 * Vérifier un token JWT (sans middleware)
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
}

module.exports = {
  initJwtSecret,
  authenticateToken,
  requireAdmin,
  generateToken,
  verifyToken
};