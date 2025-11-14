#!/usr/bin/env node

// Migration: Convertir calendar_events TIMESTAMP → TIMESTAMPTZ
// + Supprimer les données existantes et forcer resynchronisation
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie');
  process.exit(1);
}

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n🔄 Migration: calendar_events TIMESTAMP → TIMESTAMPTZ\n');

    const client = await pool.connect();

    // Vérifier le type actuel
    const check = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'calendar_events'
        AND column_name IN ('start_time', 'end_time')
    `);

    console.log('📊 Types actuels:');
    check.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Si déjà TIMESTAMPTZ, skip
    const alreadyMigrated = check.rows.every(row =>
      row.data_type.includes('timestamp with time zone') ||
      row.data_type === 'timestamptz'
    );

    if (alreadyMigrated) {
      console.log('\n✅ Migration déjà effectuée, rien à faire');
      client.release();
      await pool.end();
      return;
    }

    console.log('\n🔄 Conversion en cours...');

    await client.query('BEGIN');

    // SUPPRIMER toutes les données existantes pour éviter les problèmes de timezone
    console.log('  🗑️  Suppression des événements existants (seront resynchronisés)');
    const deleteResult = await client.query('DELETE FROM calendar_events');
    console.log(`  ✅ ${deleteResult.rowCount} événements supprimés`);

    // Convertir start_time
    await client.query(`
      ALTER TABLE calendar_events
        ALTER COLUMN start_time TYPE TIMESTAMPTZ
        USING start_time AT TIME ZONE 'Europe/Paris'
    `);
    console.log('  ✅ start_time → TIMESTAMPTZ');

    // Convertir end_time
    await client.query(`
      ALTER TABLE calendar_events
        ALTER COLUMN end_time TYPE TIMESTAMPTZ
        USING end_time AT TIME ZONE 'Europe/Paris'
    `);
    console.log('  ✅ end_time → TIMESTAMPTZ');

    await client.query('COMMIT');

    // Vérifier après migration
    const verify = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'calendar_events'
        AND column_name IN ('start_time', 'end_time')
    `);

    console.log('\n📊 Types après migration:');
    verify.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Migration terminée avec succès!');
    console.log('');
    console.log('⚠️  IMPORTANT: Resynchronisez Google Calendar pour récupérer');
    console.log('   vos événements avec les bonnes heures.');
    console.log('');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

migrate();
