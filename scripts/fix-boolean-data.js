#!/usr/bin/env node
// Script de correction des données booléennes dans PostgreSQL
// Convertit les valeurs 0/1 (INTEGER) en FALSE/TRUE (BOOLEAN)

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://noteflow:noteflow_secure_password_change_me@localhost:5499/noteflow`;

console.log('\n========== CORRECTION DES DONNÉES BOOLÉENNES ==========\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function fixBooleanColumns() {
  const client = await pool.connect();

  try {
    console.log('✓ Connexion PostgreSQL établie\n');

    // Liste des tables et colonnes avec type BOOLEAN
    const booleanColumns = [
      { table: 'users', columns: ['is_admin'] },
      { table: 'notes', columns: ['archived'] },
      { table: 'note_todos', columns: ['completed', 'priority'] },
      { table: 'global_todos', columns: ['completed', 'priority'] },
      { table: 'rss_feeds', columns: ['enabled'] },
      { table: 'calendar_events', columns: ['all_day'] }
    ];

    for (const { table, columns } of booleanColumns) {
      console.log(`📋 Table: ${table}`);

      for (const column of columns) {
        try {
          // Vérifier le type actuel de la colonne
          const typeCheck = await client.query(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, column]);

          if (typeCheck.rows.length === 0) {
            console.log(`  ⏭️  Colonne ${column} n'existe pas, skip`);
            continue;
          }

          const dataType = typeCheck.rows[0].data_type;
          console.log(`  📊 ${column}: type actuel = ${dataType}`);

          if (dataType === 'boolean') {
            // Si la colonne est déjà BOOLEAN, vérifier s'il y a des valeurs INTEGER incorrectes
            // En réalité, PostgreSQL convertit automatiquement lors de l'insertion
            // Mais on peut forcer la conversion pour être sûr
            console.log(`  ✓ ${column} est déjà BOOLEAN`);
          } else if (dataType === 'integer') {
            // Si la colonne est INTEGER, la convertir en BOOLEAN
            console.log(`  🔧 Conversion ${column}: INTEGER → BOOLEAN`);

            await client.query(`
              ALTER TABLE ${table}
              ALTER COLUMN ${column} TYPE BOOLEAN
              USING CASE
                WHEN ${column} = 0 THEN FALSE
                WHEN ${column} = 1 THEN TRUE
                ELSE ${column}::BOOLEAN
              END
            `);

            console.log(`  ✅ ${column} converti en BOOLEAN`);
          }
        } catch (err) {
          console.error(`  ❌ Erreur sur ${column}:`, err.message);
        }
      }
      console.log('');
    }

    console.log('✅ Correction terminée!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixBooleanColumns();
