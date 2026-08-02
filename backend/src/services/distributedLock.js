const { pool } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Ensures that a scheduled task is run by only one backend replica.
 * PostgreSQL advisory locks are session-scoped and require no extra service.
 */
async function runWithAdvisoryLock(lockName, task) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [lockName]
    );

    if (!result.rows[0].locked) {
      logger.info('Scheduled task skipped because another replica owns the lock', { lockName });
      return false;
    }

    await task();
    return true;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]);
    } catch (error) {
      logger.error('Failed to release scheduled-task lock', { lockName, error: error.message });
    }
    client.release();
  }
}

module.exports = { runWithAdvisoryLock };
