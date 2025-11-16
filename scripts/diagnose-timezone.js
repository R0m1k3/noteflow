// Script de diagnostic des problèmes de timezone
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

const pool = new Pool({
  connectionString: DATABASE_URL
});

async function diagnose() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 DIAGNOSTIC TIMEZONE CALENDRIER');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Vérifier le timezone de PostgreSQL
    const tzResult = await pool.query('SHOW timezone');
    console.log('1️⃣  TIMEZONE POSTGRESQL:');
    console.log('   Timezone serveur:', tzResult.rows[0].TimeZone);
    console.log('');

    // 2. Récupérer un événement de la base
    const eventResult = await pool.query(`
      SELECT
        id,
        title,
        start_time,
        end_time,
        pg_typeof(start_time) as type_start
      FROM calendar_events
      ORDER BY start_time DESC
      LIMIT 1
    `);

    if (eventResult.rows.length === 0) {
      console.log('⚠️  Aucun événement trouvé dans la base de données');
      process.exit(0);
    }

    const event = eventResult.rows[0];
    console.log('2️⃣  ÉVÉNEMENT RÉCUPÉRÉ DE LA BASE:');
    console.log('   Titre:', event.title);
    console.log('   Type de start_time:', event.type_start);
    console.log('   start_time (brut):', event.start_time);
    console.log('   Type JavaScript:', typeof event.start_time);
    console.log('');

    // 3. Tester différentes représentations de la date
    console.log('3️⃣  CONVERSIONS DE LA DATE:');

    const startTime = event.start_time;

    // Si c'est un objet Date
    if (startTime instanceof Date) {
      console.log('   ❌ start_time est un OBJET DATE (le parser est actif)');
      console.log('   toISOString():', startTime.toISOString());
      console.log('   toLocaleString("fr-FR", {timeZone: "Europe/Paris"}):',
        startTime.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}));
    }
    // Si c'est une string
    else if (typeof startTime === 'string') {
      console.log('   ✅ start_time est une STRING (parser désactivé)');
      console.log('   String brute:', startTime);

      const dateObj = new Date(startTime);
      console.log('   new Date(startTime):', dateObj);
      console.log('   toISOString():', dateObj.toISOString());
      console.log('   toLocaleString("fr-FR", {timeZone: "Europe/Paris"}):',
        dateObj.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}));
      console.log('   toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"}):',
        dateObj.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'}));
    }
    console.log('');

    // 4. Tester les formats de stockage PostgreSQL
    console.log('4️⃣  FORMATS POSTGRESQL:');
    const formatResult = await pool.query(`
      SELECT
        start_time,
        start_time::text as text_format,
        to_char(start_time, 'YYYY-MM-DD HH24:MI:SS TZ') as custom_format,
        start_time AT TIME ZONE 'Europe/Paris' as paris_time,
        start_time AT TIME ZONE 'UTC' as utc_time
      FROM calendar_events
      WHERE id = $1
    `, [event.id]);

    const formats = formatResult.rows[0];
    console.log('   start_time:', formats.start_time);
    console.log('   start_time::text:', formats.text_format);
    console.log('   to_char (custom):', formats.custom_format);
    console.log('   AT TIME ZONE Europe/Paris:', formats.paris_time);
    console.log('   AT TIME ZONE UTC:', formats.utc_time);
    console.log('');

    // 5. Simuler ce que reçoit le frontend
    console.log('5️⃣  SIMULATION FRONTEND:');
    const apiResult = await pool.query(`
      SELECT id, title, start_time, end_time
      FROM calendar_events
      WHERE id = $1
    `, [event.id]);

    console.log('   Ce que l\'API renvoie:', JSON.stringify(apiResult.rows[0], null, 2));
    console.log('');

    // 6. Tester la fonction toParisISO (simulation)
    console.log('6️⃣  TEST FONCTION toParisISO:');
    console.log('   Input exemple: "2024-11-16T14:30"');

    const testInput = "2024-11-16T14:30";
    const [datePart, timePart] = testInput.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    console.log('   Date.UTC créée:', utcDate.toISOString());

    const parisTime = utcDate.toLocaleString('en-US', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    console.log('   toLocaleString avec Europe/Paris:', parisTime);

    const parisDate = new Date(parisTime);
    const diff = utcDate.getTime() - parisDate.getTime();
    const finalDate = new Date(utcDate.getTime() - diff);
    console.log('   Date finale (toParisISO):', finalDate.toISOString());
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Diagnostic terminé');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
