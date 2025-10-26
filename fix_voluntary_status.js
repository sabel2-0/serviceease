const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Natusv1ncere.',
    database: 'serviceease'
});

connection.connect((err) => {
    if (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }

    console.log('Connected to database');

    // Update voluntary services that are approved but still showing as pending_requester
    connection.query(
        `UPDATE voluntary_services 
         SET status = 'completed' 
         WHERE coordinator_approval_status = 'approved' 
         AND status = 'pending_requester'`,
        (err, result) => {
            if (err) {
                console.error('Update error:', err);
                process.exit(1);
            }

            console.log('✅ Updated', result.affectedRows, 'voluntary service(s) to completed status');
            connection.end();
        }
    );
});
