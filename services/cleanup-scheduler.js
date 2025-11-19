// Service de purge automatique de la base de données
const logger = require('../config/logger');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

// Configuration
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_HOURS) || 24; // Par défaut, toutes les 24 heures
const STARTUP_DELAY = 60000; // 1 minute après le démarrage
const CLEANUP_ENABLED = process.env.CLEANUP_ENABLED !== 'false'; // Activé par défaut

const CLEANUP_CONFIG = {
  COMPLETED_TASKS_DAYS: parseInt(process.env.CLEANUP_COMPLETED_TASKS_DAYS) || 90,
  ARCHIVED_NOTES_DAYS: parseInt(process.env.CLEANUP_ARCHIVED_NOTES_DAYS) || 180,
  PAST_EVENTS_DAYS: parseInt(process.env.CLEANUP_PAST_EVENTS_DAYS) || 180
};

let cleanupTimer = null;
let isRunning = false;

/**
 * Exécuter la purge automatique
 */
async function executeCleanup() {
  if (isRunning) {
    logger.warn('Purge déjà en cours, passage ignoré');
    return;
  }

  if (!CLEANUP_ENABLED) {
    logger.debug('Purge automatique désactivée (CLEANUP_ENABLED=false)');
    return;
  }

  isRunning = true;
  const pool = new Pool({ connectionString: DATABASE_URL });
  const stats = {
    rssFeeds: 0,
    globalTodos: 0,
    noteTodos: 0,
    archivedNotes: 0,
    calendarEvents: 0
  };

  try {
    logger.info('═══════════════════════════════════════════════════');
    logger.info('🧹 DÉBUT DE LA PURGE AUTOMATIQUE');
    logger.info('═══════════════════════════════════════════════════');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Flux RSS désactivés
      const disabledFeeds = await client.query(`
        SELECT id, title FROM rss_feeds WHERE enabled = FALSE
      `);

      if (disabledFeeds.rows.length > 0) {
        logger.info(`📡 Suppression de ${disabledFeeds.rows.length} flux RSS désactivé(s)...`);
        const deleteFeeds = await client.query('DELETE FROM rss_feeds WHERE enabled = FALSE');
        stats.rssFeeds = deleteFeeds.rowCount;
        logger.info(`   ✓ ${stats.rssFeeds} flux supprimé(s)`);
      }

      // 2. Tâches globales complétées
      const deleteGlobalTodos = await client.query(`
        DELETE FROM global_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} days'
      `);
      stats.globalTodos = deleteGlobalTodos.rowCount;
      if (stats.globalTodos > 0) {
        logger.info(`✅ Suppression de ${stats.globalTodos} tâche(s) globale(s) complétée(s) > ${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} jours`);
      }

      // 3. Tâches de notes complétées
      const deleteNoteTodos = await client.query(`
        DELETE FROM note_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} days'
      `);
      stats.noteTodos = deleteNoteTodos.rowCount;
      if (stats.noteTodos > 0) {
        logger.info(`📝 Suppression de ${stats.noteTodos} tâche(s) de note(s) complétée(s) > ${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} jours`);
      }

      // 4. Notes archivées
      const deleteNotes = await client.query(`
        DELETE FROM notes
        WHERE archived = TRUE
        AND archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} days'
      `);
      stats.archivedNotes = deleteNotes.rowCount;
      if (stats.archivedNotes > 0) {
        logger.info(`🗄️  Suppression de ${stats.archivedNotes} note(s) archivée(s) > ${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} jours`);
      }

      // 5. Rendez-vous passés
      const deleteEvents = await client.query(`
        DELETE FROM calendar_events
        WHERE end_time < NOW() - INTERVAL '${CLEANUP_CONFIG.PAST_EVENTS_DAYS} days'
      `);
      stats.calendarEvents = deleteEvents.rowCount;
      if (stats.calendarEvents > 0) {
        logger.info(`📅 Suppression de ${stats.calendarEvents} rendez-vous terminé(s) > ${CLEANUP_CONFIG.PAST_EVENTS_DAYS} jours`);
      }

      await client.query('COMMIT');

      const totalDeleted = stats.rssFeeds + stats.globalTodos + stats.noteTodos + stats.archivedNotes + stats.calendarEvents;

      if (totalDeleted > 0) {
        logger.info('═══════════════════════════════════════════════════');
        logger.info(`✅ Purge terminée: ${totalDeleted} élément(s) supprimé(s)`);
        logger.info('═══════════════════════════════════════════════════');
      } else {
        logger.info('✓ Purge terminée: Aucun élément à supprimer');
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    logger.error('❌ Erreur lors de la purge automatique:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Démarrer le scheduler de purge
 */
function startScheduler() {
  if (cleanupTimer) {
    logger.warn('Scheduler de purge déjà démarré');
    return;
  }

  if (!CLEANUP_ENABLED) {
    logger.info('⚠️  Purge automatique désactivée (CLEANUP_ENABLED=false)');
    return;
  }

  logger.info('═══════════════════════════════════════════════════');
  logger.info('🧹 DÉMARRAGE DU SCHEDULER DE PURGE AUTOMATIQUE');
  logger.info('═══════════════════════════════════════════════════');
  logger.info(`Configuration:`);
  logger.info(`  • Intervalle: toutes les ${CLEANUP_INTERVAL} heure(s)`);
  logger.info(`  • Tâches complétées: > ${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} jours`);
  logger.info(`  • Notes archivées: > ${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} jours`);
  logger.info(`  • Rendez-vous passés: > ${CLEANUP_CONFIG.PAST_EVENTS_DAYS} jours`);
  logger.info(`  • Première exécution: dans ${STARTUP_DELAY / 1000} secondes`);
  logger.info('═══════════════════════════════════════════════════');

  // Première exécution après le délai de démarrage
  setTimeout(() => {
    logger.info('🚀 Exécution initiale de la purge...');
    executeCleanup();
  }, STARTUP_DELAY);

  // Exécutions périodiques
  const intervalMs = CLEANUP_INTERVAL * 60 * 60 * 1000; // Convertir heures en millisecondes
  cleanupTimer = setInterval(() => {
    logger.info('⏰ Exécution périodique de la purge...');
    executeCleanup();
  }, intervalMs);

  logger.info('✓ Scheduler de purge démarré');
}

/**
 * Arrêter le scheduler de purge
 */
function stopScheduler() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('✓ Scheduler de purge arrêté');
  }
}

/**
 * Obtenir le statut du scheduler
 */
function getStatus() {
  return {
    enabled: CLEANUP_ENABLED,
    running: isRunning,
    scheduled: !!cleanupTimer,
    config: {
      intervalHours: CLEANUP_INTERVAL,
      completedTasksDays: CLEANUP_CONFIG.COMPLETED_TASKS_DAYS,
      archivedNotesDays: CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS,
      pastEventsDays: CLEANUP_CONFIG.PAST_EVENTS_DAYS
    }
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  executeCleanup,
  getStatus
};
