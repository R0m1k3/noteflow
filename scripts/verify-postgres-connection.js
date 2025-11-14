const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://noteflow:noteflow_secure_password_change_me@postgres:5499/noteflow';

async function verifyConnection() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔍 Test de connexion PostgreSQL...');
    console.log('📍 URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL réussie!');

    // Vérifier les tables existantes
    const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 Tables existantes:', tables.rows.length);
    tables.rows.forEach(row => console.log('  -', row.tablename));

    // Vérifier les articles RSS si la table existe
    if (tables.rows.some(r => r.tablename === 'rss_articles')) {
      const count = await client.query('SELECT COUNT(*) FROM rss_articles');
      console.log('\n📰 Articles RSS:', count.rows[0].count);
    }

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifyConnection();
