#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier le parsing des TIMESTAMPTZ
 * et le décalage horaire dans le calendrier
 */

const { getAll, getOne } = require('../config/database');
const logger = require('../config/logger');

async function checkTimezone() {
  try {
    console.log('\n=== DIAGNOSTIC TIMEZONE CALENDRIER ===\n');

    // 1. Vérifier la timezone de PostgreSQL
    const pgTimezone = await getOne('SHOW timezone');
    console.log('1. Timezone PostgreSQL:', pgTimezone.timezone);

    // 2. Vérifier la timezone système Node.js
    const nodeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('2. Timezone Node.js:', nodeTimezone);
    console.log('3. TZ env var:', process.env.TZ || 'non défini');

    // 3. Récupérer un événement de test
    const event = await getOne(`
      SELECT
        id,
        title,
        start_time,
        end_time,
        all_day,
        pg_typeof(start_time) as type_start
      FROM calendar_events
      ORDER BY start_time DESC
      LIMIT 1
    `);

    if (!event) {
      console.log('\n❌ Aucun événement trouvé dans la base de données');
      console.log('   Veuillez synchroniser avec Google Calendar d\'abord\n');
      return;
    }

    console.log('\n4. Événement récupéré:');
    console.log('   - ID:', event.id);
    console.log('   - Titre:', event.title);
    console.log('   - Type SQL de start_time:', event.type_start);
    console.log('   - start_time (brut):', event.start_time);
    console.log('   - Type JS de start_time:', typeof event.start_time);
    console.log('   - end_time (brut):', event.end_time);
    console.log('   - Type JS de end_time:', typeof event.end_time);
    console.log('   - all_day:', event.all_day);

    // 4. Tester la conversion en Date
    if (typeof event.start_time === 'string') {
      const dateObj = new Date(event.start_time);
      console.log('\n5. Conversion en Date object:');
      console.log('   - new Date(start_time):', dateObj);
      console.log('   - toISOString():', dateObj.toISOString());
      console.log('   - toLocaleString("fr-FR"):', dateObj.toLocaleString('fr-FR'));
      console.log('   - toLocaleString("fr-FR", {timeZone: "Europe/Paris"}):',
        dateObj.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));
      console.log('   - Offset timezone (minutes):', dateObj.getTimezoneOffset());
    } else {
      console.log('\n⚠️  WARNING: start_time n\'est PAS une string!');
      console.log('   Le types.setTypeParser(1184) ne fonctionne pas correctement');
      console.log('   Le container doit être rebuild avec --no-cache');
    }

    // 5. Récupérer la valeur brute SQL
    const rawEvent = await getOne(`
      SELECT
        start_time::text as start_text,
        start_time AT TIME ZONE 'UTC' as start_utc,
        start_time AT TIME ZONE 'Europe/Paris' as start_paris
      FROM calendar_events
      WHERE id = $1
    `, [event.id]);

    console.log('\n6. Valeurs SQL brutes:');
    console.log('   - start_time::text:', rawEvent.start_text);
    console.log('   - start_time AT TIME ZONE \'UTC\':', rawEvent.start_utc);
    console.log('   - start_time AT TIME ZONE \'Europe/Paris\':', rawEvent.start_paris);

    // 6. Compter les événements
    const count = await getOne('SELECT COUNT(*) as count FROM calendar_events');
    console.log('\n7. Nombre total d\'événements:', count.count);

    console.log('\n=== FIN DIAGNOSTIC ===\n');

    // Recommandations
    if (typeof event.start_time !== 'string') {
      console.log('⚠️  ACTION REQUISE:');
      console.log('   1. Rebuild le container avec --no-cache:');
      console.log('      docker-compose build --no-cache notes-app');
      console.log('   2. Restart le container:');
      console.log('      docker-compose restart notes-app');
      console.log('   3. Resynchroniser le calendrier depuis l\'interface web\n');
    } else {
      console.log('✓ types.setTypeParser fonctionne correctement');
      console.log('  Les dates sont retournées comme strings\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

checkTimezone();
