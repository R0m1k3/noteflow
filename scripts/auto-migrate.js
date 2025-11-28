#!/usr/bin/env node

/**
 * Script de migrations automatiques
 * S'exécute au démarrage de l'application pour mettre à jour le schéma
 */

const { Pool } = require('pg');
const logger = require('../config/logger');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

async function autoMigrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    logger.info('🔄 Vérification des migrations...');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Migration 1: Champs de tracking pour la purge (archived_at, completed_at)
      logger.info('  Vérification: champs de tracking pour purge...');

      // Vérifier si archived_at existe
      const archivedAtExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notes' AND column_name='archived_at'
      `);

      if (archivedAtExists.rows.length === 0) {
        logger.info('  → Ajout du champ archived_at à notes');
        await client.query(`ALTER TABLE notes ADD COLUMN archived_at TIMESTAMP`);
        await client.query(`UPDATE notes SET archived_at = updated_at WHERE archived = TRUE AND archived_at IS NULL`);
      }

      // Vérifier si completed_at existe pour global_todos
      const globalTodosCompletedAtExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='global_todos' AND column_name='completed_at'
      `);

      if (globalTodosCompletedAtExists.rows.length === 0) {
        logger.info('  → Ajout du champ completed_at à global_todos');
        await client.query(`ALTER TABLE global_todos ADD COLUMN completed_at TIMESTAMP`);
        await client.query(`UPDATE global_todos SET completed_at = created_at WHERE completed = TRUE AND completed_at IS NULL`);
      }

      // Vérifier si note_todos a created_at et completed_at
      const noteTodosCreatedAtExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='note_todos' AND column_name='created_at'
      `);

      if (noteTodosCreatedAtExists.rows.length === 0) {
        logger.info('  → Ajout du champ created_at à note_todos');
        await client.query(`ALTER TABLE note_todos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      }

      const noteTodosCompletedAtExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='note_todos' AND column_name='completed_at'
      `);

      if (noteTodosCompletedAtExists.rows.length === 0) {
        logger.info('  → Ajout du champ completed_at à note_todos');
        await client.query(`ALTER TABLE note_todos ADD COLUMN completed_at TIMESTAMP`);
        await client.query(`UPDATE note_todos SET completed_at = CURRENT_TIMESTAMP WHERE completed = TRUE AND completed_at IS NULL`);
      }

      // Créer les triggers pour mise à jour automatique
      await client.query(`
        CREATE OR REPLACE FUNCTION update_notes_archived_at()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.archived = TRUE AND OLD.archived = FALSE THEN
            NEW.archived_at = CURRENT_TIMESTAMP;
          ELSIF NEW.archived = FALSE THEN
            NEW.archived_at = NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS trigger_notes_archived_at ON notes;
        CREATE TRIGGER trigger_notes_archived_at
        BEFORE UPDATE ON notes
        FOR EACH ROW
        EXECUTE FUNCTION update_notes_archived_at();
      `);

      await client.query(`
        CREATE OR REPLACE FUNCTION update_global_todos_completed_at()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
            NEW.completed_at = CURRENT_TIMESTAMP;
          ELSIF NEW.completed = FALSE THEN
            NEW.completed_at = NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS trigger_global_todos_completed_at ON global_todos;
        CREATE TRIGGER trigger_global_todos_completed_at
        BEFORE UPDATE ON global_todos
        FOR EACH ROW
        EXECUTE FUNCTION update_global_todos_completed_at();
      `);

      await client.query(`
        CREATE OR REPLACE FUNCTION update_note_todos_completed_at()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
            NEW.completed_at = CURRENT_TIMESTAMP;
          ELSIF NEW.completed = FALSE THEN
            NEW.completed_at = NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS trigger_note_todos_completed_at ON note_todos;
        CREATE TRIGGER trigger_note_todos_completed_at
        BEFORE UPDATE ON note_todos
        FOR EACH ROW
        EXECUTE FUNCTION update_note_todos_completed_at();
      `);

      // Migration 2: Champ priority pour les tâches
      logger.info('  Vérification: champ priority pour tâches...');

      const globalTodosPriorityExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='global_todos' AND column_name='priority'
      `);

      if (globalTodosPriorityExists.rows.length === 0) {
        logger.info('  → Ajout du champ priority à global_todos');
        await client.query(`ALTER TABLE global_todos ADD COLUMN priority BOOLEAN DEFAULT FALSE`);
      }

      const noteTodosPriorityExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='note_todos' AND column_name='priority'
      `);

      if (noteTodosPriorityExists.rows.length === 0) {
        logger.info('  → Ajout du champ priority à note_todos');
        await client.query(`ALTER TABLE note_todos ADD COLUMN priority BOOLEAN DEFAULT FALSE`);
      }

      // Migration 3: Champ in_progress pour les tâches globales
      logger.info('  Vérification: champ in_progress pour global_todos...');

      const globalTodosInProgressExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='global_todos' AND column_name='in_progress'
      `);

      if (globalTodosInProgressExists.rows.length === 0) {
        logger.info('  → Ajout du champ in_progress à global_todos');
        await client.query('ALTER TABLE global_todos ADD COLUMN in_progress INTEGER DEFAULT 0');
      }

      // Créer les index pour performance
      await client.query(`CREATE INDEX IF NOT EXISTS idx_global_todos_priority ON global_todos(priority DESC, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_note_todos_priority ON note_todos(priority DESC, position)`);

      // Migration 4: Support des subtasks (parent_id, level)
      logger.info('  Vérification: support des subtasks (parent_id, level)...');

      const noteTodosParentIdExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='note_todos' AND column_name='parent_id'
      `);

      if (noteTodosParentIdExists.rows.length === 0) {
        logger.info('  → Ajout du champ parent_id à note_todos');
        await client.query(`ALTER TABLE note_todos ADD COLUMN parent_id INTEGER REFERENCES note_todos(id) ON DELETE CASCADE`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_note_todos_parent_id ON note_todos(parent_id)`);
      }

      const noteTodosLevelExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='note_todos' AND column_name='level'
      `);

      if (noteTodosLevelExists.rows.length === 0) {
        logger.info('  → Ajout du champ level à note_todos');
        await client.query(`ALTER TABLE note_todos ADD COLUMN level INTEGER DEFAULT 0`);
      }

      const globalTodosParentIdExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='global_todos' AND column_name='parent_id'
      `);

      if (globalTodosParentIdExists.rows.length === 0) {
        logger.info('  → Ajout du champ parent_id à global_todos');
        await client.query(`ALTER TABLE global_todos ADD COLUMN parent_id INTEGER REFERENCES global_todos(id) ON DELETE CASCADE`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_global_todos_parent_id ON global_todos(parent_id)`);
      }

      const globalTodosLevelExists = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='global_todos' AND column_name='level'
      `);

      if (globalTodosLevelExists.rows.length === 0) {
        logger.info('  → Ajout du champ level à global_todos');
        await client.query(`ALTER TABLE global_todos ADD COLUMN level INTEGER DEFAULT 0`);
      }

      await client.query('COMMIT');

      logger.info('✅ Migrations automatiques terminées avec succès');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Erreur lors des migrations automatiques:', error);
      throw error;
    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    logger.error('❌ Erreur fatale lors des migrations:', error);
    // Ne pas crasher l'application, juste logger l'erreur
  }
}

// Si appelé directement
if (require.main === module) {
  autoMigrate().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { autoMigrate };
