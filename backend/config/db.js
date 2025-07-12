/**
 * Database configuration for Oracle Autonomous Database
 */
const oracledb = require('oracledb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set Oracle connection pool configuration
const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
  poolMin: 10,
  poolMax: 10,
  poolIncrement: 0
};

// Initialize database connection pool
async function initialize() {
  try {
    await oracledb.createPool(dbConfig);
    console.log('Oracle database connection pool initialized');
  } catch (err) {
    console.error('Error initializing Oracle database connection pool:', err);
    process.exit(1);
  }
}

// Get connection from pool
async function getConnection() {
  try {
    const connection = await oracledb.getConnection();
    return connection;
  } catch (err) {
    console.error('Error getting connection from pool:', err);
    throw err;
  }
}

// Execute query with connection handling
async function execute(sql, binds = {}, options = {}) {
  let connection;
  
  try {
    // Get connection from pool
    connection = await getConnection();
    
    // Set default options
    const defaultOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true
    };
    
    // Execute query
    const result = await connection.execute(
      sql, 
      binds, 
      { ...defaultOptions, ...options }
    );
    
    return result;
  } catch (err) {
    console.error('Error executing query:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        // Release connection back to pool
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Close pool and terminate connections
async function close() {
  try {
    await oracledb.getPool().close(0);
    console.log('Oracle connection pool closed');
  } catch (err) {
    console.error('Error closing Oracle connection pool:', err);
    throw err;
  }
}

module.exports = {
  initialize,
  execute,
  close
};