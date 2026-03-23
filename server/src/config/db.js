const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// We only log the connection, we NEVER call process.exit here
pool.on('connect', () => {
  console.log('🐘 PostgreSQL connected successfully');
});

module.exports = pool;