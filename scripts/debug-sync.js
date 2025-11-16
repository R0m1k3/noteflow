// Script de debug pour comprendre le flux de synchronisation
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

const pool = new Pool({
  connectionString: DATABASE_URL
});

async function debug() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 DEBUG SYNCHRONISATION CALENDRIER');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Récupérer l'événement problématique
    const result = await pool.query(`
      SELECT
        title,
        start_time,
        pg_typeof(start_time) as type_colonne,
        start_time::text as start_text,
        to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as start_iso_format,
        start_time AT TIME ZONE 'UTC' as start_utc,
        start_time AT TIME ZONE 'Europe/Paris' as start_paris
      FROM calendar_events
      WHERE title LIKE '%Wlodarczak%' OR title LIKE '%Julian%'
      ORDER BY start_time DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ Événement "Wlodarczak" non trouvé dans la base');
      console.log('');

      // Afficher tous les événements
      const allEvents = await pool.query(`
        SELECT id, title, start_time
        FROM calendar_events
        ORDER BY start_time DESC
        LIMIT 5
      `);

      console.log('Derniers événements dans la base:');
      allEvents.rows.forEach(e => {
        console.log(`  - ${e.title}: ${e.start_time}`);
      });

      await pool.end();
      return;
    }

    const event = result.rows[0];

    console.log('1️⃣  ÉVÉNEMENT DANS POSTGRESQL:');
    console.log('   Titre:', event.title);
    console.log('   Type de colonne:', event.type_colonne);
    console.log('   start_time (brut):', event.start_time);
    console.log('   start_time::text:', event.start_text);
    console.log('   Format ISO:', event.start_iso_format);
    console.log('   AT TIME ZONE UTC:', event.start_utc);
    console.log('   AT TIME ZONE Europe/Paris:', event.start_paris);
    console.log('');

    // 2. Simuler ce que reçoit le frontend
    console.log('2️⃣  CE QUE LE FRONTEND REÇOIT:');
    const apiResult = await pool.query(`
      SELECT id, title, start_time, end_time
      FROM calendar_events
      WHERE title LIKE '%Wlodarczak%' OR title LIKE '%Julian%'
      ORDER BY start_time DESC
      LIMIT 1
    `);

    console.log('   JSON API:', JSON.stringify(apiResult.rows[0], null, 2));
    console.log('   Type de start_time:', typeof apiResult.rows[0].start_time);
    console.log('');

    // 3. Simuler ce que fait le frontend
    console.log('3️⃣  SIMULATION FRONTEND:');
    const startTime = apiResult.rows[0].start_time;
    console.log('   start_time reçu:', startTime, '(type:', typeof startTime + ')');

    const dateObj = new Date(startTime);
    console.log('   new Date(start_time):', dateObj);
    console.log('   .toISOString():', dateObj.toISOString());
    console.log('   .toString():', dateObj.toString());

    const parisTime = dateObj.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });
    console.log('   .toLocaleTimeString(...Europe/Paris):', parisTime);
    console.log('');

    // 4. Ce que devrait être l'heure
    console.log('4️⃣  VÉRIFICATION:');
    console.log('   Google Calendar dit: 10:20');
    console.log('   NoteFlow affiche:', parisTime);
    if (parisTime === '10:20') {
      console.log('   ✅ CORRECT');
    } else {
      console.log('   ❌ INCORRECT - Décalage de', Math.abs(10*60+20 - (parseInt(parisTime.split(':')[0])*60 + parseInt(parisTime.split(':')[1]))), 'minutes');
    }
    console.log('');

    // 5. Test avec différentes conversions
    console.log('5️⃣  TESTS DE CONVERSION:');

    // Test si c'est stocké en UTC
    if (typeof startTime === 'string') {
      console.log('   String PostgreSQL:', startTime);

      // Si format "2024-11-17 09:20:00"
      if (!startTime.includes('T') && !startTime.includes('Z') && !startTime.includes('+')) {
        console.log('   ⚠️  Format sans timezone détecté!');
        console.log('   new Date() va interpréter comme heure LOCALE du serveur');

        // Essayer de construire une date ISO UTC
        const isoUTC = startTime.replace(' ', 'T') + 'Z';
        console.log('   Tentative avec "Z": new Date("' + isoUTC + '")');
        const dateUTC = new Date(isoUTC);
        const parisUTC = dateUTC.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Paris'
        });
        console.log('   → Affichage Paris:', parisUTC);
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

debug();
