#!/usr/bin/env node

// DIAGNOSTIC COMPLET - Traçage du décalage horaire
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function fullDiagnosis() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     DIAGNOSTIC COMPLET - DÉCALAGE HORAIRE CALENDRIER        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const client = await pool.connect();

    // 1. Vérifier la configuration du driver pg
    console.log('1️⃣  CONFIGURATION DRIVER PG:\n');
    const types = require('pg').types;
    const parser1184 = types.getTypeParser(1184);
    console.log(`   Type parser 1184 (TIMESTAMPTZ): ${typeof parser1184}`);
    console.log(`   Parser renvoie: ${parser1184.name || 'function'}\n`);

    // 2. Test direct avec une date connue
    console.log('2️⃣  TEST INSERTION/LECTURE DIRECTE:\n');

    await client.query('DELETE FROM calendar_events WHERE google_event_id LIKE $1', ['diagnostic-%']);

    const testDates = [
      { name: 'Paris 10h avec offset', value: '2025-11-14T10:00:00+01:00' },
      { name: 'UTC 09h', value: '2025-11-14T09:00:00Z' },
      { name: 'Paris 14h avec offset', value: '2025-11-14T14:30:00+01:00' }
    ];

    for (const test of testDates) {
      const eventId = `diagnostic-${test.name.replace(/\s+/g, '-')}`;

      await client.query(`
        INSERT INTO calendar_events
        (google_event_id, user_id, title, start_time, end_time, all_day)
        VALUES ($1, 1, $2, $3, $4, FALSE)
      `, [eventId, `Test ${test.name}`, test.value, test.value]);

      const result = await client.query(`
        SELECT
          title,
          start_time,
          pg_typeof(start_time) as pg_type,
          start_time::text as text_repr
        FROM calendar_events
        WHERE google_event_id = $1
      `, [eventId]);

      const row = result.rows[0];
      console.log(`   Test: ${test.name}`);
      console.log(`     Inséré: ${test.value}`);
      console.log(`     Type PG: ${row.pg_type}`);
      console.log(`     Texte: ${row.text_repr}`);
      console.log(`     JS type: ${typeof row.start_time}`);
      console.log(`     JS value: ${row.start_time}`);

      if (typeof row.start_time === 'object' && row.start_time instanceof Date) {
        console.log(`     ❌ PROBLÈME: C'est un objet Date! Le parser n'a pas fonctionné!`);
        console.log(`     toISOString(): ${row.start_time.toISOString()}`);
      } else if (typeof row.start_time === 'string') {
        console.log(`     ✅ OK: C'est une string!`);
        const parsed = new Date(row.start_time);
        console.log(`     new Date(): ${parsed.toISOString()}`);
        console.log(`     Heure locale: ${parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`     Heure Paris: ${parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`);
      }
      console.log('');
    }

    // 3. Vérifier événements réels
    console.log('3️⃣  ÉVÉNEMENTS RÉELS GOOGLE CALENDAR:\n');

    const realEvents = await client.query(`
      SELECT
        title,
        start_time,
        pg_typeof(start_time) as pg_type,
        start_time::text as text_repr,
        all_day
      FROM calendar_events
      WHERE google_event_id NOT LIKE 'diagnostic-%'
      ORDER BY start_time ASC
      LIMIT 3
    `);

    if (realEvents.rows.length === 0) {
      console.log('   ⚠️  Aucun événement réel trouvé');
      console.log('   → Synchronisez Google Calendar d\'abord\n');
    } else {
      realEvents.rows.forEach((evt, i) => {
        console.log(`   Événement ${i + 1}: ${evt.title}`);
        console.log(`     Type PG: ${evt.pg_type}`);
        console.log(`     Texte: ${evt.text_repr}`);
        console.log(`     JS type: ${typeof evt.start_time}`);
        console.log(`     JS value: ${evt.start_time}`);

        if (typeof evt.start_time === 'object' && evt.start_time instanceof Date) {
          console.log(`     ❌ Objet Date (parser KO)`);
          console.log(`     Affiché frontend: ${evt.start_time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`);
        } else {
          console.log(`     ✅ String (parser OK)`);
          const d = new Date(evt.start_time);
          console.log(`     Affiché frontend: ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`);
        }
        console.log('');
      });
    }

    // 4. Test de l'API
    console.log('4️⃣  SIMULATION API RESPONSE:\n');

    const apiResult = await client.query(`
      SELECT
        id, google_event_id, title, description,
        start_time, end_time, location, html_link, all_day
      FROM calendar_events
      WHERE google_event_id LIKE 'diagnostic-%'
      LIMIT 1
    `);

    if (apiResult.rows.length > 0) {
      const apiEvent = apiResult.rows[0];
      console.log('   API renvoie (format JSON):');
      console.log(JSON.stringify(apiEvent, null, 2));
      console.log('');
    }

    // 5. Recommandations
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      DIAGNOSTIC RÉSULTAT                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const sampleEvent = realEvents.rows[0] || testDates[0];
    const isDateObject = typeof sampleEvent?.start_time === 'object';

    if (isDateObject) {
      console.log('❌ PROBLÈME TROUVÉ:\n');
      console.log('   Le driver pg renvoie toujours des objets Date');
      console.log('   Le types.setTypeParser(1184) n\'a PAS été appliqué\n');
      console.log('💡 SOLUTION:\n');
      console.log('   1. Vérifier que config/database.js a bien:');
      console.log('      const { Pool, types } = require(\'pg\');');
      console.log('      types.setTypeParser(1184, ...) AVANT le Pool\n');
      console.log('   2. Rebuild: docker-compose build notes-app\n');
      console.log('   3. Restart: docker-compose restart notes-app\n');
    } else {
      console.log('✅ Le parser fonctionne!\n');
      console.log('   Les dates sont renvoyées comme strings');
      console.log('   Le problème doit être ailleurs (frontend?)\n');
    }

    // Cleanup
    await client.query('DELETE FROM calendar_events WHERE google_event_id LIKE $1', ['diagnostic-%']);

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fullDiagnosis();
