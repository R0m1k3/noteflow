const { pool } = require('./config/database');
pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error('DB Connection Error:', err);
    process.exit(1);
  } else {
    console.log('DB Connection Success');
    process.exit(0);
  }
});
