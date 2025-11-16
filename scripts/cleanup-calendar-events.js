#!/usr/bin/env node

/**
 * Script pour nettoyer les événements calendar existants
 * À exécuter après la correction du bug timezone pour forcer une resynchronisation
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'postgres'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

async function cleanup() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   NETTOYAGE DES ÉVÉNEMENTS CALENDAR                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const client = await pool.connect();

    // Compter les événements avant
    const countBefore = await client.query('SELECT COUNT(*) FROM calendar_events');
    console.log(`📊 Nombre d'événements actuels: ${countBefore.rows[0].count}\n`);

    if (parseInt(countBefore.rows[0].count) === 0) {
      console.log('✅ Aucun événement à nettoyer\n');
      client.release();
      await pool.end();
      return;
    }

    // Supprimer tous les événements
    console.log('🗑️  Suppression des événements...');
    const deleteResult = await client.query('DELETE FROM calendar_events');
    console.log(`✅ ${deleteResult.rowCount} événement(s) supprimé(s)\n`);

    // Vérifier après
    const countAfter = await client.query('SELECT COUNT(*) FROM calendar_events');
    console.log(`📊 Nombre d'événements après: ${countAfter.rows[0].count}\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ NETTOYAGE TERMINÉ                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📝 PROCHAINES ÉTAPES:\n');
    console.log('1. Redémarrez l\'application avec: docker-compose restart notes-app');
    console.log('2. Ouvrez l\'interface web');
    console.log('3. Allez dans Admin → Google Calendar');
    console.log('4. Cliquez sur "Synchroniser"');
    console.log('5. Vérifiez que les heures sont maintenant correctes\n');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanup();
