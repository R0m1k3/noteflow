// Serveur Express principal pour l'application NoteFlow
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const logger = require('./config/logger');
const { initDatabase } = require('./config/database');

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 2222;

// Configurer Express pour faire confiance au proxy (nginx, etc.)
// Nécessaire pour express-rate-limit et pour obtenir la vraie IP du client
app.set('trust proxy', true);

// Créer les dossiers nécessaires (silencieusement, ils peuvent déjà exister via les volumes Docker)
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');

[dataDir, uploadsDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Dossier créé: ${dir}`);
    }
  } catch (error) {
    // Ignorer les erreurs si les dossiers existent déjà ou sont montés via Docker
    logger.debug(`Dossier déjà existant: ${dir}`);
  }
});

// Configuration de la sécurité avec Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS - À ajuster selon vos besoins
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting sur les endpoints d'authentification
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes par défaut
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requêtes par fenêtre
  message: { error: 'Trop de tentatives, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);

// Servir les fichiers statiques
// Servir les uploads depuis public/uploads
app.use('/uploads', express.static(uploadsDir));
// Servir l'application React depuis dist/
app.use(express.static(path.join(__dirname, 'dist')));

// Healthcheck endpoint pour Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/notes', require('./routes/notes.routes'));
app.use('/api/todos', require('./routes/todos.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/rss', require('./routes/rss.routes'));
app.use('/api/calendar', require('./routes/calendar.routes'));
app.use('/api/openrouter', require('./routes/openrouter.routes'));

// Route de recherche
app.get('/api/search', require('./routes/notes.routes').searchNotes);

// SPA fallback - Servir index.html pour toutes les autres routes
app.get('*', (req, res) => {
  // Ne pas servir index.html pour les requêtes d'API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint non trouvé' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Ne pas exposer les détails de l'erreur en production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Une erreur est survenue'
    : err.message;

  res.status(err.status || 500).json({
    error: errorMessage
  });
});

// Initialiser la base de données et démarrer le serveur
async function startServer() {
  try {
    // Initialiser la base de données
    await initDatabase();
    logger.info('✓ Base de données initialisée avec succès');

    // Démarrer le scheduler RSS
    const rssScheduler = require('./services/rss-scheduler');
    rssScheduler.startScheduler();
    logger.info('✓ Scheduler RSS démarré');

    // Démarrer le serveur
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('═════════════════════════════════════════════');
      logger.info(`✓ Serveur NoteFlow démarré sur le port ${PORT}`);
      logger.info(`✓ Environnement: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ URL: http://localhost:${PORT}`);
      logger.info('═════════════════════════════════════════════');

      if (process.env.NODE_ENV !== 'production') {
        logger.info('Credentials par défaut:');
        logger.info('  Username: admin');
        logger.info('  Password: admin');
        logger.info('═════════════════════════════════════════════');
      }
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});

// Démarrer l'application
startServer();