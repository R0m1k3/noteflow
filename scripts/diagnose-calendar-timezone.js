#!/usr/bin/env node

// Diagnostic complet du décalage horaire Google Calendar
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie');
  process.exit(1);
}

async function diagnose() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSTIC DÉCALAGE HORAIRE GOOGLE CALENDAR');
    console.log('═══════════════════════════════════════════════════════════\n');

    const client = await pool.connect();

    // 1. Timezone PostgreSQL
    console.log('1️⃣  TIMEZONE POSTGRESQL:\n');
    const tz = await client.query('SHOW timezone');
    console.log(`   Server timezone: ${tz.rows[0].TimeZone}`);

    const now = await client.query('SELECT NOW(), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP AT TIME ZONE \'UTC\' as utc_now');
    console.log(`   Server time: ${now.rows[0].now}`);
    console.log(`   UTC time: ${now.rows[0].utc_now}`);

    // 2. Colonnes calendar_events
    console.log('\n2️⃣  COLONNES CALENDAR_EVENTS:\n');
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'calendar_events'
        AND column_name IN ('start_time', 'end_time')
      ORDER BY column_name
    `);
    cols.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 3. Exemple d'événements
    console.log('\n3️⃣  EXEMPLE D\'ÉVÉNEMENTS (3 premiers):\n');
    const events = await client.query(`
      SELECT
        id,
        title,
        start_time,
        start_time AT TIME ZONE 'UTC' as start_time_utc,
        start_time AT TIME ZONE 'Europe/Paris' as start_time_paris,
        all_day
      FROM calendar_events
      ORDER BY start_time ASC
      LIMIT 3
    `);

    if (events.rows.length === 0) {
      console.log('   ⚠️  Aucun événement dans la base de données');
      console.log('   → Synchronisez Google Calendar pour tester\n');
    } else {
      events.rows.forEach((evt, idx) => {
        console.log(`   Événement ${idx + 1}: ${evt.title}`);
        console.log(`     - start_time (brut): ${evt.start_time}`);
        console.log(`     - start_time UTC: ${evt.start_time_utc}`);
        console.log(`     - start_time Paris: ${evt.start_time_paris}`);
        console.log(`     - all_day: ${evt.all_day}`);
        console.log('');
      });
    }

    // 4. Format renvoyé par le driver Node.js pg
    console.log('4️⃣  FORMAT RENVOYÉ PAR LE DRIVER NODE.JS:\n');
    if (events.rows.length > 0) {
      const firstEvent = events.rows[0];
      console.log(`   typeof start_time: ${typeof firstEvent.start_time}`);
      console.log(`   start_time value: ${firstEvent.start_time}`);
      console.log(`   start_time instanceof Date: ${firstEvent.start_time instanceof Date}`);

      if (firstEvent.start_time instanceof Date) {
        console.log(`   start_time.toISOString(): ${firstEvent.start_time.toISOString()}`);
        console.log(`   start_time.toLocaleString('fr-FR'): ${firstEvent.start_time.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      }
    }

    // 5. Diagnostic du problème
    console.log('\n5️⃣  DIAGNOSTIC:\n');

    const hasBadData = await client.query(`
      SELECT COUNT(*) as count
      FROM calendar_events
      WHERE synced_at < NOW() - INTERVAL '1 day'
    `);

    if (parseInt(hasBadData.rows[0].count) > 0) {
      console.log(`   ⚠️  ${hasBadData.rows[0].count} événement(s) synchronisé(s) il y a plus d'1 jour`);
      console.log('   → Ces événements peuvent avoir un mauvais timezone');
      console.log('   → Recommandation: Supprimer et resynchroniser\n');
    }

    // 6. Vérifier si migration timezone a été appliquée
    const migrationCheck = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'calendar_events'
        AND column_name = 'start_time'
    `);

    const isTimestamptz = migrationCheck.rows[0].data_type.includes('timestamp with time zone');

    if (!isTimestamptz) {
      console.log('   ❌ PROBLÈME: Les colonnes sont encore en TIMESTAMP au lieu de TIMESTAMPTZ!');
      console.log('   → La migration timezone n\'a pas été appliquée');
      console.log('   → Lancez: node scripts/migrate-calendar-timezone.js\n');
    } else {
      console.log('   ✅ Les colonnes sont en TIMESTAMPTZ (correct)\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n💡 SOLUTION RECOMMANDÉE:\n');
    console.log('1. Supprimer tous les événements:');
    console.log('   docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "DELETE FROM calendar_events"');
    console.log('');
    console.log('2. Resynchroniser Google Calendar depuis l\'interface web');
    console.log('   Admin → Google Calendar → Bouton Synchroniser');
    console.log('');
    console.log('3. Vérifier que les heures correspondent maintenant');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════\n');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur lors du diagnostic:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnose();
