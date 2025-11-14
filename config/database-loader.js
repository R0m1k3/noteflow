// Chargeur automatique de base de données (SQLite ou PostgreSQL)
const logger = require('./logger');

// Détecter le type de base de données
const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DATABASE_URL = process.env.DATABASE_URL;

logger.info(`Configuration de base de données: ${DB_TYPE}`);

// Charger le module approprié
let databaseModule;

if (DB_TYPE === 'postgres' || DATABASE_URL?.startsWith('postgresql://')) {
  logger.info('Chargement de la configuration PostgreSQL');
  databaseModule = require('./database-postgres');
} else {
  logger.info('Chargement de la configuration SQLite');
  databaseModule = require('./database');
}

// Exporter toutes les fonctions du module chargé
module.exports = databaseModule;
