#!/usr/bin/env node

/**
 * Script de purge automatique de la base de données
 *
 * Purge les éléments suivants :
 * 1. Flux RSS désactivés (enabled = FALSE)
 * 2. Tâches complétées depuis plus de 3 mois
 * 3. Notes archivées depuis plus de 6 mois
 * 4. Rendez-vous terminés depuis plus de 6 mois
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

// Paramètres de purge (en jours)
const CLEANUP_CONFIG = {
  COMPLETED_TASKS_DAYS: 90,    // 3 mois
  ARCHIVED_NOTES_DAYS: 180,    // 6 mois
  PAST_EVENTS_DAYS: 180,       // 6 mois
  DRY_RUN: process.env.DRY_RUN === 'true' // Mode simulation
};

async function cleanup() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const stats = {
    rssFeeds: 0,
    rssArticles: 0,
    globalTodos: 0,
    noteTodos: 0,
    archivedNotes: 0,
    calendarEvents: 0
  };

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         PURGE AUTOMATIQUE DE LA BASE DE DONNÉES          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (CLEANUP_CONFIG.DRY_RUN) {
      console.log('⚠️  MODE SIMULATION (DRY_RUN) - Aucune suppression réelle\n');
    }

    console.log('📊 Configuration de la purge:');
    console.log(`   • Tâches complétées: > ${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} jours`);
    console.log(`   • Notes archivées: > ${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} jours`);
    console.log(`   • Rendez-vous passés: > ${CLEANUP_CONFIG.PAST_EVENTS_DAYS} jours`);
    console.log(`   • Flux RSS désactivés: Tous\n`);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. PURGE DES FLUX RSS DÉSACTIVÉS
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📡 1. FLUX RSS DÉSACTIVÉS');
      console.log('═══════════════════════════════════════════════════════════\n');

      // Compter les flux désactivés
      const disabledFeeds = await client.query(`
        SELECT id, title, url, enabled
        FROM rss_feeds
        WHERE enabled = FALSE
      `);

      console.log(`📊 Flux RSS désactivés trouvés: ${disabledFeeds.rows.length}`);

      if (disabledFeeds.rows.length > 0) {
        console.log('\n📝 Détails des flux à supprimer:');
        disabledFeeds.rows.forEach((feed, index) => {
          console.log(`   ${index + 1}. [ID: ${feed.id}] ${feed.title || 'Sans titre'}`);
          console.log(`      URL: ${feed.url}`);
        });

        if (!CLEANUP_CONFIG.DRY_RUN) {
          // Les articles seront supprimés en CASCADE
          const deleteFeeds = await client.query(`
            DELETE FROM rss_feeds
            WHERE enabled = FALSE
          `);
          stats.rssFeeds = deleteFeeds.rowCount;
          console.log(`\n✅ ${stats.rssFeeds} flux RSS désactivé(s) supprimé(s)`);
        } else {
          console.log(`\n🔍 [SIMULATION] ${disabledFeeds.rows.length} flux seraient supprimés`);
        }
      } else {
        console.log('✅ Aucun flux RSS désactivé à supprimer');
      }

      // 2. PURGE DES TÂCHES GLOBALES COMPLÉTÉES
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ 2. TÂCHES GLOBALES COMPLÉTÉES');
      console.log('═══════════════════════════════════════════════════════════\n');

      const oldGlobalTodos = await client.query(`
        SELECT COUNT(*) as count
        FROM global_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} days'
      `);

      console.log(`📊 Tâches globales complétées > ${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} jours: ${oldGlobalTodos.rows[0].count}`);

      if (parseInt(oldGlobalTodos.rows[0].count) > 0) {
        if (!CLEANUP_CONFIG.DRY_RUN) {
          const deleteGlobalTodos = await client.query(`
            DELETE FROM global_todos
            WHERE completed = TRUE
            AND completed_at IS NOT NULL
            AND completed_at < NOW() - INTERVAL '${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} days'
          `);
          stats.globalTodos = deleteGlobalTodos.rowCount;
          console.log(`✅ ${stats.globalTodos} tâche(s) globale(s) supprimée(s)`);
        } else {
          console.log(`🔍 [SIMULATION] ${oldGlobalTodos.rows[0].count} tâches seraient supprimées`);
        }
      } else {
        console.log('✅ Aucune tâche globale ancienne à supprimer');
      }

      // 3. PURGE DES TÂCHES DE NOTES COMPLÉTÉES
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📝 3. TÂCHES DE NOTES COMPLÉTÉES');
      console.log('═══════════════════════════════════════════════════════════\n');

      const oldNoteTodos = await client.query(`
        SELECT COUNT(*) as count
        FROM note_todos
        WHERE completed = TRUE
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} days'
      `);

      console.log(`📊 Tâches de notes complétées > ${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} jours: ${oldNoteTodos.rows[0].count}`);

      if (parseInt(oldNoteTodos.rows[0].count) > 0) {
        if (!CLEANUP_CONFIG.DRY_RUN) {
          const deleteNoteTodos = await client.query(`
            DELETE FROM note_todos
            WHERE completed = TRUE
            AND completed_at IS NOT NULL
            AND completed_at < NOW() - INTERVAL '${CLEANUP_CONFIG.COMPLETED_TASKS_DAYS} days'
          `);
          stats.noteTodos = deleteNoteTodos.rowCount;
          console.log(`✅ ${stats.noteTodos} tâche(s) de note(s) supprimée(s)`);
        } else {
          console.log(`🔍 [SIMULATION] ${oldNoteTodos.rows[0].count} tâches seraient supprimées`);
        }
      } else {
        console.log('✅ Aucune tâche de note ancienne à supprimer');
      }

      // 4. PURGE DES NOTES ARCHIVÉES
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🗄️  4. NOTES ARCHIVÉES');
      console.log('═══════════════════════════════════════════════════════════\n');

      const oldArchivedNotes = await client.query(`
        SELECT id, title, archived_at
        FROM notes
        WHERE archived = TRUE
        AND archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} days'
      `);

      console.log(`📊 Notes archivées > ${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} jours: ${oldArchivedNotes.rows.length}`);

      if (oldArchivedNotes.rows.length > 0) {
        console.log('\n📝 Détails des notes à supprimer (10 premières):');
        oldArchivedNotes.rows.slice(0, 10).forEach((note, index) => {
          const daysAgo = Math.floor((Date.now() - new Date(note.archived_at).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`   ${index + 1}. [ID: ${note.id}] ${note.title}`);
          console.log(`      Archivée il y a ${daysAgo} jours`);
        });

        if (oldArchivedNotes.rows.length > 10) {
          console.log(`   ... et ${oldArchivedNotes.rows.length - 10} autre(s)`);
        }

        if (!CLEANUP_CONFIG.DRY_RUN) {
          // Les fichiers associés (note_todos, note_images, note_files, note_tags) seront supprimés en CASCADE
          const deleteNotes = await client.query(`
            DELETE FROM notes
            WHERE archived = TRUE
            AND archived_at IS NOT NULL
            AND archived_at < NOW() - INTERVAL '${CLEANUP_CONFIG.ARCHIVED_NOTES_DAYS} days'
          `);
          stats.archivedNotes = deleteNotes.rowCount;
          console.log(`\n✅ ${stats.archivedNotes} note(s) archivée(s) supprimée(s)`);
        } else {
          console.log(`\n🔍 [SIMULATION] ${oldArchivedNotes.rows.length} notes seraient supprimées`);
        }
      } else {
        console.log('✅ Aucune note archivée ancienne à supprimer');
      }

      // 5. PURGE DES RENDEZ-VOUS PASSÉS
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📅 5. RENDEZ-VOUS PASSÉS');
      console.log('═══════════════════════════════════════════════════════════\n');

      const oldEvents = await client.query(`
        SELECT id, title, end_time
        FROM calendar_events
        WHERE end_time < NOW() - INTERVAL '${CLEANUP_CONFIG.PAST_EVENTS_DAYS} days'
      `);

      console.log(`📊 Rendez-vous terminés > ${CLEANUP_CONFIG.PAST_EVENTS_DAYS} jours: ${oldEvents.rows.length}`);

      if (oldEvents.rows.length > 0) {
        console.log('\n📝 Détails des rendez-vous à supprimer (10 premiers):');
        oldEvents.rows.slice(0, 10).forEach((event, index) => {
          const daysAgo = Math.floor((Date.now() - new Date(event.end_time).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`   ${index + 1}. [ID: ${event.id}] ${event.title}`);
          console.log(`      Terminé il y a ${daysAgo} jours`);
        });

        if (oldEvents.rows.length > 10) {
          console.log(`   ... et ${oldEvents.rows.length - 10} autre(s)`);
        }

        if (!CLEANUP_CONFIG.DRY_RUN) {
          const deleteEvents = await client.query(`
            DELETE FROM calendar_events
            WHERE end_time < NOW() - INTERVAL '${CLEANUP_CONFIG.PAST_EVENTS_DAYS} days'
          `);
          stats.calendarEvents = deleteEvents.rowCount;
          console.log(`\n✅ ${stats.calendarEvents} rendez-vous supprimé(s)`);
        } else {
          console.log(`\n🔍 [SIMULATION] ${oldEvents.rows.length} rendez-vous seraient supprimés`);
        }
      } else {
        console.log('✅ Aucun rendez-vous ancien à supprimer');
      }

      // COMMIT ou ROLLBACK selon le mode
      if (!CLEANUP_CONFIG.DRY_RUN) {
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }

      // RÉSUMÉ FINAL
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║                    RÉSUMÉ DE LA PURGE                     ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      const totalDeleted = stats.rssFeeds + stats.globalTodos + stats.noteTodos + stats.archivedNotes + stats.calendarEvents;

      console.log('📊 Éléments supprimés:');
      console.log(`   • Flux RSS désactivés: ${stats.rssFeeds}`);
      console.log(`   • Tâches globales: ${stats.globalTodos}`);
      console.log(`   • Tâches de notes: ${stats.noteTodos}`);
      console.log(`   • Notes archivées: ${stats.archivedNotes}`);
      console.log(`   • Rendez-vous: ${stats.calendarEvents}`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   📈 TOTAL: ${totalDeleted} élément(s)\n`);

      if (CLEANUP_CONFIG.DRY_RUN) {
        console.log('⚠️  MODE SIMULATION - Aucune suppression réelle effectuée');
        console.log('💡 Pour exécuter réellement: DRY_RUN=false npm run cleanup\n');
      } else {
        console.log('✅ Purge terminée avec succès!\n');
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur lors de la purge:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le cleanup
if (require.main === module) {
  cleanup();
}

// Exporter pour utilisation comme module
module.exports = { cleanup, CLEANUP_CONFIG };
