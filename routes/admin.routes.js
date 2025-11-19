// Routes d'administration et de maintenance
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');
const { Pool } = require('pg');
const cleanupScheduler = require('../services/cleanup-scheduler');

// Toutes les routes nécessitent authentification admin
router.use(authenticateToken);
router.use(requireAdmin);

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

/**
 * POST /api/admin/cleanup
 * Déclencher la purge de la base de données
 *
 * Body (optionnel):
 * {
 *   "dryRun": true,  // Mode simulation (défaut: false)
 *   "config": {
 *     "completedTasksDays": 90,
 *     "archivedNotesDays": 180,
 *     "pastEventsDays": 180
 *   }
 * }
 */
router.post('/cleanup', async (req, res) => {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const dryRun = req.body.dryRun || false;
  const config = req.body.config || {
    completedTasksDays: 90,
    archivedNotesDays: 180,
    pastEventsDays: 180
  };

  const stats = {
    rssFeeds: 0,
    rssArticles: 0,
    globalTodos: 0,
    noteTodos: 0,
    archivedNotes: 0,
    calendarEvents: 0
  };

  try {
    logger.info(`Début de la purge de la base de données (DRY_RUN: ${dryRun})`);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Flux RSS désactivés
      const disabledFeeds = await client.query(`
        SELECT COUNT(*) as count
        FROM rss_feeds
        WHERE enabled = FALSE
      `);

      if (!dryRun && parseInt(disabledFeeds.rows[0].count) > 0) {
        const deleteFeeds = await client.query(`
          DELETE FROM rss_feeds
          WHERE enabled = FALSE
        `);
        stats.rssFeeds = deleteFeeds.rowCount;
      } else {
        stats.rssFeeds = parseInt(disabledFeeds.rows[0].count);
      }

      // 2. Tâches globales complétées
      const oldGlobalTodos = await client.query(`
        SELECT COUNT(*) as count
        FROM global_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${config.completedTasksDays} days'
      `);

      if (!dryRun && parseInt(oldGlobalTodos.rows[0].count) > 0) {
        const deleteGlobalTodos = await client.query(`
          DELETE FROM global_todos
          WHERE completed = TRUE
          AND completed_at IS NOT NULL
          AND completed_at < NOW() - INTERVAL '${config.completedTasksDays} days'
        `);
        stats.globalTodos = deleteGlobalTodos.rowCount;
      } else {
        stats.globalTodos = parseInt(oldGlobalTodos.rows[0].count);
      }

      // 3. Tâches de notes complétées
      const oldNoteTodos = await client.query(`
        SELECT COUNT(*) as count
        FROM note_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${config.completedTasksDays} days'
      `);

      if (!dryRun && parseInt(oldNoteTodos.rows[0].count) > 0) {
        const deleteNoteTodos = await client.query(`
          DELETE FROM note_todos
          WHERE completed = TRUE
          AND completed_at IS NOT NULL
          AND completed_at < NOW() - INTERVAL '${config.completedTasksDays} days'
        `);
        stats.noteTodos = deleteNoteTodos.rowCount;
      } else {
        stats.noteTodos = parseInt(oldNoteTodos.rows[0].count);
      }

      // 4. Notes archivées
      const oldArchivedNotes = await client.query(`
        SELECT COUNT(*) as count
        FROM notes
        WHERE archived = TRUE
        AND archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '${config.archivedNotesDays} days'
      `);

      if (!dryRun && parseInt(oldArchivedNotes.rows[0].count) > 0) {
        const deleteNotes = await client.query(`
          DELETE FROM notes
          WHERE archived = TRUE
          AND archived_at IS NOT NULL
          AND archived_at < NOW() - INTERVAL '${config.archivedNotesDays} days'
        `);
        stats.archivedNotes = deleteNotes.rowCount;
      } else {
        stats.archivedNotes = parseInt(oldArchivedNotes.rows[0].count);
      }

      // 5. Rendez-vous passés
      const oldEvents = await client.query(`
        SELECT COUNT(*) as count
        FROM calendar_events
        WHERE end_time < NOW() - INTERVAL '${config.pastEventsDays} days'
      `);

      if (!dryRun && parseInt(oldEvents.rows[0].count) > 0) {
        const deleteEvents = await client.query(`
          DELETE FROM calendar_events
          WHERE end_time < NOW() - INTERVAL '${config.pastEventsDays} days'
        `);
        stats.calendarEvents = deleteEvents.rowCount;
      } else {
        stats.calendarEvents = parseInt(oldEvents.rows[0].count);
      }

      // COMMIT ou ROLLBACK selon le mode
      if (!dryRun) {
        await client.query('COMMIT');
        logger.info('Purge de la base de données terminée avec succès', stats);
      } else {
        await client.query('ROLLBACK');
        logger.info('Simulation de purge terminée', stats);
      }

      const totalDeleted = stats.rssFeeds + stats.globalTodos + stats.noteTodos + stats.archivedNotes + stats.calendarEvents;

      res.json({
        success: true,
        dryRun,
        config,
        stats,
        total: totalDeleted,
        message: dryRun
          ? `Simulation terminée: ${totalDeleted} élément(s) seraient supprimés`
          : `Purge terminée avec succès: ${totalDeleted} élément(s) supprimés`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    logger.error('Erreur lors de la purge de la base de données:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la purge de la base de données',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/cleanup/preview
 * Prévisualiser ce qui serait supprimé par la purge
 */
router.get('/cleanup/preview', async (req, res) => {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const config = {
    completedTasksDays: parseInt(req.query.completedTasksDays) || 90,
    archivedNotesDays: parseInt(req.query.archivedNotesDays) || 180,
    pastEventsDays: parseInt(req.query.pastEventsDays) || 180
  };

  try {
    const client = await pool.connect();
    const preview = {};

    try {
      // Compter les éléments à purger
      const disabledFeeds = await client.query(`
        SELECT COUNT(*) as count
        FROM rss_feeds
        WHERE enabled = FALSE
      `);
      preview.rssFeeds = parseInt(disabledFeeds.rows[0].count);

      const oldGlobalTodos = await client.query(`
        SELECT COUNT(*) as count
        FROM global_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${config.completedTasksDays} days'
      `);
      preview.globalTodos = parseInt(oldGlobalTodos.rows[0].count);

      const oldNoteTodos = await client.query(`
        SELECT COUNT(*) as count
        FROM note_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${config.completedTasksDays} days'
      `);
      preview.noteTodos = parseInt(oldNoteTodos.rows[0].count);

      const oldArchivedNotes = await client.query(`
        SELECT COUNT(*) as count
        FROM notes
        WHERE archived = TRUE
        AND archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '${config.archivedNotesDays} days'
      `);
      preview.archivedNotes = parseInt(oldArchivedNotes.rows[0].count);

      const oldEvents = await client.query(`
        SELECT COUNT(*) as count
        FROM calendar_events
        WHERE end_time < NOW() - INTERVAL '${config.pastEventsDays} days'
      `);
      preview.calendarEvents = parseInt(oldEvents.rows[0].count);

      preview.total = preview.rssFeeds + preview.globalTodos + preview.noteTodos + preview.archivedNotes + preview.calendarEvents;

      res.json({
        success: true,
        config,
        preview
      });

    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    logger.error('Erreur lors de la prévisualisation de la purge:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la prévisualisation',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/cleanup/status
 * Obtenir le statut du scheduler de purge
 */
router.get('/cleanup/status', (req, res) => {
  try {
    const status = cleanupScheduler.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut du scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du statut',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/stats
 * Obtenir les statistiques de la base de données
 */
router.get('/stats', async (req, res) => {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    const stats = {};

    try {
      // Statistiques générales
      const users = await client.query('SELECT COUNT(*) as count FROM users');
      stats.users = parseInt(users.rows[0].count);

      const notes = await client.query('SELECT COUNT(*) as count FROM notes');
      stats.notes = parseInt(notes.rows[0].count);

      const archivedNotes = await client.query('SELECT COUNT(*) as count FROM notes WHERE archived = TRUE');
      stats.archivedNotes = parseInt(archivedNotes.rows[0].count);

      const globalTodos = await client.query('SELECT COUNT(*) as count FROM global_todos');
      stats.globalTodos = parseInt(globalTodos.rows[0].count);

      const completedGlobalTodos = await client.query('SELECT COUNT(*) as count FROM global_todos WHERE completed = TRUE');
      stats.completedGlobalTodos = parseInt(completedGlobalTodos.rows[0].count);

      const noteTodos = await client.query('SELECT COUNT(*) as count FROM note_todos');
      stats.noteTodos = parseInt(noteTodos.rows[0].count);

      const completedNoteTodos = await client.query('SELECT COUNT(*) as count FROM note_todos WHERE completed = TRUE');
      stats.completedNoteTodos = parseInt(completedNoteTodos.rows[0].count);

      const rssFeeds = await client.query('SELECT COUNT(*) as count FROM rss_feeds');
      stats.rssFeeds = parseInt(rssFeeds.rows[0].count);

      const enabledFeeds = await client.query('SELECT COUNT(*) as count FROM rss_feeds WHERE enabled = TRUE');
      stats.enabledFeeds = parseInt(enabledFeeds.rows[0].count);

      const rssArticles = await client.query('SELECT COUNT(*) as count FROM rss_articles');
      stats.rssArticles = parseInt(rssArticles.rows[0].count);

      const calendarEvents = await client.query('SELECT COUNT(*) as count FROM calendar_events');
      stats.calendarEvents = parseInt(calendarEvents.rows[0].count);

      res.json({
        success: true,
        stats
      });

    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      message: error.message
    });
  }
});

module.exports = router;
