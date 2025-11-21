#!/usr/bin/env node

/**
 * Script de migration pour ajouter le champ priority aux tâches
 * - priority (BOOLEAN) pour global_todos
 * - priority (BOOLEAN) pour note_todos
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   MIGRATION: Ajout du champ priority aux tâches          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Ajouter priority à la table global_todos
      console.log('📝 Ajout du champ priority à la table global_todos...');
      await client.query(`
        ALTER TABLE global_todos
        ADD COLUMN IF NOT EXISTS priority BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Champ priority ajouté à global_todos\n');

      // 2. Ajouter priority à la table note_todos
      console.log('📝 Ajout du champ priority à la table note_todos...');
      await client.query(`
        ALTER TABLE note_todos
        ADD COLUMN IF NOT EXISTS priority BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Champ priority ajouté à note_todos\n');

      // 3. Créer un index pour améliorer les performances de tri par priorité
      console.log('🔧 Création des index pour les tâches prioritaires...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_global_todos_priority
        ON global_todos(priority DESC, created_at DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_note_todos_priority
        ON note_todos(priority DESC, position)
      `);
      console.log('✅ Index créés avec succès\n');

      await client.query('COMMIT');

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ MIGRATION TERMINÉE AVEC SUCCÈS            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log('📝 RÉSUMÉ DES CHANGEMENTS:\n');
      console.log('• Champ priority (BOOLEAN) ajouté à global_todos');
      console.log('• Champ priority (BOOLEAN) ajouté à note_todos');
      console.log('• Index créés pour optimiser le tri par priorité');
      console.log('• Valeur par défaut: FALSE (non prioritaire)\n');

      console.log('💡 UTILISATION:\n');
      console.log('Les tâches peuvent maintenant être marquées comme prioritaires');
      console.log('avec une étoile dans l\'interface.\n');

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
