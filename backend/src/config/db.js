const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config');

let dbDriver = null; // 'pg' or 'sqlite'
let pgPool = null;
let sqliteDb = null;

// Initialize connection
async function initDatabase() {
  // If user provided PostgreSQL configuration or DATABASE_URL, attempt PG connection
  const hasPgConfig = Boolean(config.databaseUrl || process.env.PGDATABASE || process.env.PGHOST);

  if (hasPgConfig) {
    try {
      const poolConfig = config.databaseUrl
        ? { connectionString: config.databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
        : {
            host: config.pgHost,
            port: config.pgPort,
            database: config.pgDatabase,
            user: config.pgUser,
            password: config.pgPassword,
            connectionTimeoutMillis: 3000,
          };

      const testPool = new Pool(poolConfig);
      await testPool.query('SELECT 1');
      pgPool = testPool;
      dbDriver = 'pg';
      console.log('✅ [Database] Successfully connected to PostgreSQL database!');
      return;
    } catch (err) {
      console.warn(`⚠️ [Database] Could not connect to PostgreSQL (${err.message}).`);
      console.warn('⚡ [Database] Falling back to Embedded Relational Database (SQLite) for instant 100% functionality without local PG installation.');
    }
  } else {
    console.log('⚡ [Database] No PostgreSQL DATABASE_URL found. Initializing Relational Embedded Database (SQLite) with identical schema.');
  }

  // SQLite Relational Fallback
  dbDriver = 'sqlite';
  const dbPath = path.resolve(__dirname, '../../job_portal.db');
  
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Failed to open SQLite database:', err);
        return reject(err);
      }
      // Enable foreign keys
      sqliteDb.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
        if (pragmaErr) console.warn('Pragma foreign_keys error:', pragmaErr);
        console.log(`✅ [Database] SQLite connected at ${dbPath}`);
        resolve();
      });
    });
  });
}

// Convert PostgreSQL parameterized query ($1, $2) to SQLite format (?) with accurate parameter mapping
function formatQueryAndParamsForSqlite(sql, params) {
  let formatted = sql;
  // Replace ILIKE with LIKE (SQLite LIKE is case-insensitive for ASCII by default)
  formatted = formatted.replace(/\bILIKE\b/gi, 'LIKE');
  // Replace NOW() with CURRENT_TIMESTAMP
  formatted = formatted.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

  const newParams = [];
  formatted = formatted.replace(/\$(\d+)/g, (match, num) => {
    const idx = parseInt(num, 10) - 1;
    newParams.push(params[idx]);
    return '?';
  });

  return { formattedSql: formatted, formattedParams: newParams };
}

// Unified query function
async function query(sql, params = []) {
  if (dbDriver === 'pg') {
    const res = await pgPool.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
    };
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    if (!sqliteDb) {
      return reject(new Error('Database not initialized yet.'));
    }

    const { formattedSql, formattedParams } = formatQueryAndParamsForSqlite(sql, params);
    const trimmed = formattedSql.trim().toUpperCase();

    // SELECT or statements with RETURNING return rows
    if (trimmed.startsWith('SELECT') || trimmed.includes('RETURNING')) {
      sqliteDb.all(formattedSql, formattedParams, function (err, rows) {
        if (err) return reject(err);
        resolve({
          rows: rows || [],
          rowCount: rows ? rows.length : 0,
        });
      });
    } else {
      // INSERT, UPDATE, DELETE
      sqliteDb.run(formattedSql, formattedParams, function (err) {
        if (err) return reject(err);
        resolve({
          rows: [{ id: this.lastID }],
          rowCount: this.changes,
          lastID: this.lastID,
        });
      });
    }
  });
}

// Helper to check DB type
function getDriver() {
  return dbDriver;
}

module.exports = {
  initDatabase,
  query,
  getDriver,
};
