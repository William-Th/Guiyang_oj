/**
 * Database connection pool
 */

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('connect', () => {
  logger.debug('Database client connected');
});

pool.on('error', (err) => {
  logger.error('Database pool error', { error: err.message });
});

/**
 * Query wrapper with logging
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', {
      text: text.substring(0, 100),
      duration,
      rows: result.rowCount
    });
    return result;
  } catch (err) {
    logger.error('Query error', {
      text: text.substring(0, 100),
      error: err.message
    });
    throw err;
  }
}

/**
 * Get client for transactions
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      connected: true,
      timestamp: result.rows[0].now
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message
    };
  }
}

module.exports = {
  pool,
  query,
  getClient,
  healthCheck
};
