#!/usr/bin/env node

// Test du format de date renvoyé par PostgreSQL
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function testDateFormat() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   TEST FORMAT DATES POSTGRESQL → JAVASCRIPT              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const client = await pool.connect();

    // Insérer un événement de test
    console.log('1️⃣  Insertion d\'un événement de test...\n');

    await client.query('DELETE FROM calendar_events');

    const testDate = '2025-11-14T10:00:00+01:00'; // 10h Paris
    await client.query(`
      INSERT INTO calendar_events
        (google_event_id, user_id, title, description, start_time, end_time, all_day)
      VALUES
        ($1, 1, $2, $3, $4, $5, FALSE)
    `, [
      'test-event-123',
      'Test Événement 10h Paris',
      'Test timezone',
      testDate,
      testDate
    ]);

    console.log(`   Test inséré: ${testDate}`);
    console.log('   (10h heure de Paris avec offset +01:00)\n');

    // Récupérer l'événement
    console.log('2️⃣  Récupération depuis PostgreSQL...\n');

    const result = await client.query(`
      SELECT
        title,
        start_time,
        pg_typeof(start_time) as pg_type,
        to_char(start_time, 'YYYY-MM-DD HH24:MI:SS TZ') as formatted_pg,
        start_time::text as text_representation
      FROM calendar_events
      WHERE google_event_id = 'test-event-123'
    `);

    const event = result.rows[0];
    console.log('   Côté PostgreSQL:');
    console.log(`     Type: ${event.pg_type}`);
    console.log(`     Formaté: ${event.formatted_pg}`);
    console.log(`     Texte: ${event.text_representation}`);

    console.log('\n   Côté JavaScript (driver pg):');
    console.log(`     typeof start_time: ${typeof event.start_time}`);
    console.log(`     start_time instanceof Date: ${event.start_time instanceof Date}`);
    console.log(`     start_time value: ${event.start_time}`);

    if (event.start_time instanceof Date) {
      console.log(`     start_time.toISOString(): ${event.start_time.toISOString()}`);
      console.log(`     start_time.getTime(): ${event.start_time.getTime()}`);
      console.log(`     start_time.toString(): ${event.start_time.toString()}`);
      console.log(`     start_time.toLocaleString('fr-FR'): ${event.start_time.toLocaleString('fr-FR')}`);
      console.log(`     start_time.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}): ${event.start_time.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      console.log(`     start_time.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}): ${event.start_time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`     start_time.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'}): ${event.start_time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`);
    }

    // Tester avec SELECT sans conversion
    console.log('\n3️⃣  Test SELECT raw...\n');

    const rawResult = await client.query(`
      SELECT start_time FROM calendar_events WHERE google_event_id = 'test-event-123'
    `);

    const rawDate = rawResult.rows[0].start_time;
    console.log(`   Raw date from SELECT: ${rawDate}`);
    console.log(`   Type: ${typeof rawDate}`);

    if (rawDate instanceof Date) {
      const hours = rawDate.getHours();
      const minutes = rawDate.getMinutes();
      console.log(`   getHours(): ${hours}`);
      console.log(`   getMinutes(): ${minutes}`);
      console.log(`   UTC hours: ${rawDate.getUTCHours()}`);
      console.log(`   UTC minutes: ${rawDate.getUTCMinutes()}`);
    }

    // Comparer avec la façon dont c'était fait avec SQLite
    console.log('\n4️⃣  Simulation SQLite (string)...\n');

    const sqliteLikeDate = new Date('2025-11-14T10:00:00+01:00');
    console.log(`   new Date('2025-11-14T10:00:00+01:00'):`);
    console.log(`     toLocaleTimeString: ${sqliteLikeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`     getHours(): ${sqliteLikeDate.getHours()}`);

    // Test avec string UTC
    const utcString = '2025-11-14T09:00:00.000Z';
    const dateFromUtc = new Date(utcString);
    console.log(`\n   new Date('${utcString}'):`);
    console.log(`     toLocaleTimeString: ${dateFromUtc.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`     toLocaleTimeString (Europe/Paris): ${dateFromUtc.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`);
    console.log(`     getHours(): ${dateFromUtc.getHours()}`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   DIAGNOSTIC COMPLET                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 RÉSUMÉ:\n');

    if (event.start_time instanceof Date) {
      const pgHour = event.start_time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
      const expectedHour = '10:00';

      if (pgHour === expectedHour) {
        console.log(`   ✅ PostgreSQL renvoie la BONNE heure: ${pgHour}`);
        console.log('   → Le problème est ailleurs (cache frontend?)\n');
      } else {
        console.log(`   ❌ PostgreSQL renvoie une MAUVAISE heure: ${pgHour}`);
        console.log(`   → Attendu: ${expectedHour}`);
        console.log(`   → Problème dans le stockage PostgreSQL\n`);
      }
    }

    // Cleanup
    await client.query('DELETE FROM calendar_events WHERE google_event_id = $1', ['test-event-123']);

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDateFormat();
