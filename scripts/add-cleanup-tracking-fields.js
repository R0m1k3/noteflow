#!/usr/bin/env node

/**
 * Script de migration pour ajouter les champs de tracking pour la purge automatique
 * - archived_at pour les notes
 * - completed_at pour global_todos et note_todos
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   MIGRATION: Ajout des champs de tracking pour purge     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Ajouter archived_at à la table notes
      console.log('📝 Ajout du champ archived_at à la table notes...');
      await client.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP
      `);
      console.log('✅ Champ archived_at ajouté\n');

      // 2. Mettre à jour les notes déjà archivées avec updated_at comme date approximative
      console.log('🔄 Mise à jour des notes archivées existantes...');
      const archivedNotesUpdate = await client.query(`
        UPDATE notes
        SET archived_at = updated_at
        WHERE archived = TRUE AND archived_at IS NULL
      `);
      console.log(`✅ ${archivedNotesUpdate.rowCount} note(s) archivée(s) mise(s) à jour\n`);

      // 3. Ajouter completed_at à la table global_todos
      console.log('📝 Ajout du champ completed_at à la table global_todos...');
      await client.query(`
        ALTER TABLE global_todos
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
      `);
      console.log('✅ Champ completed_at ajouté à global_todos\n');

      // 4. Mettre à jour les global_todos déjà complétées
      console.log('🔄 Mise à jour des tâches globales complétées existantes...');
      const globalTodosUpdate = await client.query(`
        UPDATE global_todos
        SET completed_at = created_at
        WHERE completed = TRUE AND completed_at IS NULL
      `);
      console.log(`✅ ${globalTodosUpdate.rowCount} tâche(s) globale(s) mise(s) à jour\n`);

      // 5. Ajouter created_at et completed_at à la table note_todos
      console.log('📝 Ajout des champs created_at et completed_at à la table note_todos...');
      await client.query(`
        ALTER TABLE note_todos
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await client.query(`
        ALTER TABLE note_todos
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
      `);
      console.log('✅ Champs created_at et completed_at ajoutés à note_todos\n');

      // 6. Mettre à jour les note_todos déjà complétées
      console.log('🔄 Mise à jour des tâches de notes complétées existantes...');
      const noteTodosUpdate = await client.query(`
        UPDATE note_todos
        SET completed_at = CURRENT_TIMESTAMP
        WHERE completed = TRUE AND completed_at IS NULL
      `);
      console.log(`✅ ${noteTodosUpdate.rowCount} tâche(s) de note(s) mise(s) à jour\n`);

      // 7. Créer les triggers pour mettre à jour automatiquement les dates
      console.log('🔧 Création des triggers pour mise à jour automatique...');

      // Trigger pour notes.archived_at
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

      // Trigger pour global_todos.completed_at
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

      // Trigger pour note_todos.completed_at
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

      console.log('✅ Triggers créés avec succès\n');

      await client.query('COMMIT');

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ MIGRATION TERMINÉE AVEC SUCCÈS            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log('📝 RÉSUMÉ DES CHANGEMENTS:\n');
      console.log('• Champ archived_at ajouté à la table notes');
      console.log('• Champ completed_at ajouté aux tables global_todos et note_todos');
      console.log('• Triggers créés pour mise à jour automatique des dates');
      console.log('• Données existantes migrées avec succès\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrate();
