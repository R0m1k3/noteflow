#!/usr/bin/env node

// Script de correction forcée du timezone Google Calendar
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie');
  process.exit(1);
}

async function forceFixTimezone() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   CORRECTION FORCÉE TIMEZONE GOOGLE CALENDAR              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const client = await pool.connect();

    // 1. Vérifier l'état actuel
    console.log('📊 ÉTAT ACTUEL:\n');

    const typeCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'calendar_events'
        AND column_name IN ('start_time', 'end_time')
    `);

    console.log('Types de colonnes:');
    typeCheck.rows.forEach(row => {
      const icon = row.data_type.includes('with time zone') ? '✅' : '❌';
      console.log(`  ${icon} ${row.column_name}: ${row.data_type}`);
    });

    const eventCount = await client.query('SELECT COUNT(*) FROM calendar_events');
    console.log(`\nNombre d'événements: ${eventCount.rows[0].count}`);

    if (parseInt(eventCount.rows[0].count) > 0) {
      const sample = await client.query(`
        SELECT
          title,
          start_time,
          pg_typeof(start_time) as type,
          to_char(start_time, 'YYYY-MM-DD HH24:MI:SS TZ') as formatted
        FROM calendar_events
        ORDER BY start_time ASC
        LIMIT 3
      `);

      console.log('\nExemples d\'événements:');
      sample.rows.forEach((evt, i) => {
        console.log(`\n  ${i + 1}. ${evt.title}`);
        console.log(`     Type: ${evt.type}`);
        console.log(`     Valeur brute: ${evt.start_time}`);
        console.log(`     Formaté: ${evt.formatted}`);
      });
    }

    // 2. CORRECTION FORCÉE
    console.log('\n\n🔧 CORRECTION FORCÉE:\n');

    const needsFix = typeCheck.rows.some(row =>
      !row.data_type.includes('with time zone')
    );

    if (!needsFix && parseInt(eventCount.rows[0].count) === 0) {
      console.log('✅ Les colonnes sont déjà en TIMESTAMPTZ');
      console.log('✅ Aucun événement corrompu');
      console.log('\n💡 Resynchronisez Google Calendar depuis l\'interface web\n');
      client.release();
      await pool.end();
      return;
    }

    console.log('Étape 1: Suppression de TOUS les événements...');
    const deleted = await client.query('DELETE FROM calendar_events');
    console.log(`  ✅ ${deleted.rowCount} événement(s) supprimé(s)\n`);

    if (needsFix) {
      console.log('Étape 2: Conversion des colonnes en TIMESTAMPTZ...');

      await client.query('BEGIN');

      try {
        await client.query(`
          ALTER TABLE calendar_events
            ALTER COLUMN start_time TYPE TIMESTAMPTZ
            USING start_time AT TIME ZONE 'Europe/Paris'
        `);
        console.log('  ✅ start_time → TIMESTAMPTZ');

        await client.query(`
          ALTER TABLE calendar_events
            ALTER COLUMN end_time TYPE TIMESTAMPTZ
            USING end_time AT TIME ZONE 'Europe/Paris'
        `);
        console.log('  ✅ end_time → TIMESTAMPTZ');

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('  ❌ Erreur:', error.message);
        throw error;
      }
    }

    // 3. Vérification finale
    console.log('\n📊 VÉRIFICATION FINALE:\n');

    const finalCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'calendar_events'
        AND column_name IN ('start_time', 'end_time')
    `);

    console.log('Types de colonnes après correction:');
    finalCheck.rows.forEach(row => {
      const icon = row.data_type.includes('with time zone') ? '✅' : '❌';
      console.log(`  ${icon} ${row.column_name}: ${row.data_type}`);
    });

    const finalCount = await client.query('SELECT COUNT(*) FROM calendar_events');
    console.log(`\nNombre d'événements: ${finalCount.rows[0].count} (devrait être 0)`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ CORRECTION TERMINÉE                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📝 PROCHAINES ÉTAPES:\n');
    console.log('1. Ouvrez l\'interface web: http://localhost:2222');
    console.log('2. Allez dans Admin → Google Calendar');
    console.log('3. Cliquez sur le bouton "Synchroniser"');
    console.log('4. Vérifiez que les heures correspondent maintenant\n');

    console.log('🔍 POUR VÉRIFIER:\n');
    console.log('- Regardez un événement dans Google Calendar (ex: 10h00)');
    console.log('- Comparez avec l\'affichage dans NoteFlow');
    console.log('- Les heures doivent être IDENTIQUES (pas de +1h ou -1h)\n');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

forceFixTimezone();
