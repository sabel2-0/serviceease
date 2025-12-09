const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,  // No fallback - must be in .env
    database: process.env.DB_NAME || 'serviceease',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            database: process.env.DB_NAME || 'serviceease'
        });
    } else {
        connection.release();
    }
});

module.exports = promisePool;

