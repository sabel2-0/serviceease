const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Natusv1ncere.',
    database: 'serviceease',
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

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
        console.error('Connection details:', {
            host: 'localhost',
            user: 'root',
            database: 'serviceease'
        });
    } else {
        console.log('Database connected successfully');
        connection.query('SELECT VERSION()', (error, results) => {
            if (error) {
                console.error('Query error:', error);
            } else {
                console.log('MySQL Version:', results[0]['VERSION()']);
            }
        });
        connection.release();
    }
});

module.exports = promisePool;