const { pool } = require('../config/database');
const logger = require('../config/logger');

async function migrate() {
    const client = await pool.connect();
    try {
        logger.info('Starting migration: Add in_progress column to global_todos');

        // Check if column exists
        const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='global_todos' AND column_name='in_progress'
    `);

        if (checkRes.rows.length === 0) {
            await client.query('ALTER TABLE global_todos ADD COLUMN in_progress INTEGER DEFAULT 0');
            logger.info('✓ Column in_progress added successfully');
        } else {
            logger.info('⚠ Column in_progress already exists');
        }

    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
