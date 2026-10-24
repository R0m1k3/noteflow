// Mot de passe du compte admin créé lors de la première installation
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Retourne le mot de passe initial de l'admin :
 * - ADMIN_PASSWORD s'il est défini dans l'environnement
 * - sinon un mot de passe aléatoire fort
 */
function getInitialAdminPassword() {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) {
    return { password: fromEnv, generated: false };
  }
  return { password: crypto.randomBytes(18).toString('base64url'), generated: true };
}

/**
 * Journaliser la création du compte admin.
 * Un mot de passe généré est affiché une seule fois sur la sortie standard
 * (jamais écrit dans les fichiers de logs).
 */
function logInitialAdmin({ password, generated }) {
  if (generated) {
    logger.info('✓ Utilisateur admin créé (username: admin) avec un mot de passe aléatoire');
    console.log('═════════════════════════════════════════════');
    console.log('  Mot de passe admin initial (affiché une seule fois) :');
    console.log(`  ${password}`);
    console.log('  Changez-le après la première connexion.');
    console.log('═════════════════════════════════════════════');
  } else {
    logger.info('✓ Utilisateur admin créé (username: admin, mot de passe défini par ADMIN_PASSWORD)');
  }
}

module.exports = { getInitialAdminPassword, logInitialAdmin };
