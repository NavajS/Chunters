const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => {
  console.log('PostgreSQL connected successfully');
});

// Without this handler an idle-client error from pg becomes an unhandled
// exception that can crash the process when the DB drops mid-run.
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

module.exports = pool;