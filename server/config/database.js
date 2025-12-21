const mysql = require('mysql2');
require('dotenv').config();

// Resolve DB config so we can log exactly what's being used
const resolvedDbConfig = {
    host: process.env.DB_HOST || 'turntable.proxy.rlwy.net',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,  // No fallback - must be in .env
    database: process.env.DB_NAME || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// If a full DATABASE_URL is present (e.g. from Railway), show it (don't expose secrets in logs in production)
if (process.env.DATABASE_URL) {
    try {
        const url = new URL(process.env.DATABASE_URL);
        const urlDbName = url.pathname ? url.pathname.replace(/^\//, '') : '';
        console.log('DATABASE_URL detected. Parsed DB name:', urlDbName);
    } catch (e) {
        console.log('DATABASE_URL present but failed to parse.');
    }
}

console.log('Resolved DB config:', {
    host: resolvedDbConfig.host,
    port: resolvedDbConfig.port,
    user: resolvedDbConfig.user,
    database: resolvedDbConfig.database
});

const pool = mysql.createPool(resolvedDbConfig);

// Convert pool to use promises
const promisePool = pool.promise();

// Helper function to execute multi-statement SQL files with delimiters
promisePool.executeMultiStatementSql = async function(sql) {
    // Extract the SQL statements between DELIMITER statements
    const regex = /DELIMITER\s*\/\/\s*([\s\S]*?)DELIMITER\s*;/g;
    let match;
    let processedSql = sql;

    // Process each DELIMITER block
    while ((match = regex.exec(sql)) !== null) {
        const delimiterBlock = match[0];
        const statements = match[1].trim().split('//').filter(stmt => stmt.trim());
        
        // Remove the DELIMITER block from processedSql
        processedSql = processedSql.replace(delimiterBlock, '');
        
        // Execute each statement in the DELIMITER block
        for (const statement of statements) {
            if (statement.trim()) {
                await promisePool.query(statement);
            }
        }
    }
    
    // Process remaining SQL statements (outside DELIMITER blocks)
    const remainingStatements = processedSql.split(';').filter(stmt => stmt.trim());
    for (const statement of remainingStatements) {
        if (statement.trim()) {
            await promisePool.query(statement);
        }
    }
};

// Test the connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
        console.error('Connection details:', {
            host: process.env.DB_HOST || 'turntable.proxy.rlwy.net',
            user: process.env.DB_USER || 'root',
            database: process.env.DB_NAME || 'railway'
        });
    } else {
        connection.query('SELECT DATABASE() AS db_name', (qErr, results) => {
            if (qErr) {
                console.error('Connected but failed to get database name:', qErr);
            } else if (results && results[0] && results[0].db_name) {
                console.log(`Connected to database: ${results[0].db_name}`);
            } else {
                console.log('Connected to database (name not returned).');
            }
            connection.release();
        });
    }
});

module.exports = promisePool;

