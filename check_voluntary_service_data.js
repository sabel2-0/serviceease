const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Natusv1ncere.',
    database: 'serviceease'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Connection error:', err);
        return;
    }
    console.log('✅ Connected to database\n');

    // Check voluntary services
    connection.query(
        `SELECT 
            vs.*,
            CONCAT(u_tech.firstName, ' ', u_tech.lastName) as technician_name,
            CONCAT(u_req.firstName, ' ', u_req.lastName) as requester_name,
            p.printer_name, p.location, p.brand, p.model,
            i.name as institution_name
        FROM voluntary_services vs
        LEFT JOIN users u_tech ON vs.technician_id = u_tech.id
        LEFT JOIN users u_req ON vs.requester_id = u_req.id
        LEFT JOIN printers p ON vs.printer_id = p.id
        LEFT JOIN institutions i ON vs.institution_id = i.id
        ORDER BY vs.created_at DESC`,
        (err, services) => {
            if (err) {
                console.error('❌ Error fetching voluntary services:', err);
                connection.end();
                return;
            }

            console.log('=== VOLUNTARY SERVICES ===');
            if (services.length === 0) {
                console.log('❌ No voluntary services found\n');
            } else {
                console.log(`✅ Found ${services.length} voluntary service(s):\n`);
                services.forEach(service => {
                    console.log(`--- Service #${service.id} ---`);
                    console.log(`Technician: ${service.technician_name} (ID: ${service.technician_id})`);
                    console.log(`Requester: ${service.requester_name || 'N/A'} (ID: ${service.requester_id})`);
                    console.log(`Printer: ${service.printer_name} - ${service.location}`);
                    console.log(`Institution: ${service.institution_name} (ID: ${service.institution_id})`);
                    console.log(`Status: ${service.status}`);
                    console.log(`Coordinator Approval: ${service.coordinator_approval_status}`);
                    console.log(`Requester Approval: ${service.requester_approval_status}`);
                    console.log(`Description: ${service.service_description || 'N/A'}`);
                    if (service.parts_used) {
                        try {
                            const parts = JSON.parse(service.parts_used);
                            console.log(`Parts Used: ${parts.length} item(s)`);
                            parts.forEach(part => {
                                console.log(`  - ${part.part_name} (${part.quantity} ${part.unit})`);
                            });
                        } catch (e) {
                            console.log(`Parts Used: Invalid JSON`);
                        }
                    }
                    console.log(`Created: ${service.created_at}\n`);
                });
            }

            // Check notifications
            connection.query(
                `SELECT 
                    n.*,
                    CONCAT(u.firstName, ' ', u.lastName) as user_name
                FROM notifications n
                LEFT JOIN users u ON n.user_id = u.id
                WHERE n.type = 'voluntary_service'
                ORDER BY n.created_at DESC
                LIMIT 10`,
                (err, notifications) => {
                    if (err) {
                        console.error('❌ Error fetching notifications:', err);
                    } else {
                        console.log('\n=== VOLUNTARY SERVICE NOTIFICATIONS ===');
                        if (notifications.length === 0) {
                            console.log('❌ No notifications found\n');
                        } else {
                            console.log(`✅ Found ${notifications.length} notification(s):\n`);
                            notifications.forEach(notif => {
                                console.log(`- ID: ${notif.id} | User: ${notif.user_name} (ID: ${notif.user_id})`);
                                console.log(`  Message: ${notif.message}`);
                                console.log(`  Read: ${notif.is_read ? 'Yes' : 'No'}`);
                                console.log(`  Created: ${notif.created_at}\n`);
                            });
                        }
                    }

                    // Check coordinator institution associations
                    connection.query(
                        `SELECT 
                            u.id, u.firstName, u.lastName, u.role,
                            cia.institution_id,
                            i.name as institution_name
                        FROM users u
                        LEFT JOIN coordinator_institution_assignments cia ON u.id = cia.coordinator_id
                        LEFT JOIN institutions i ON cia.institution_id = i.id
                        WHERE u.role = 'coordinator'
                        ORDER BY u.id`,
                        (err, coordinators) => {
                            if (err) {
                                console.error('❌ Error fetching coordinators:', err);
                            } else {
                                console.log('\n=== COORDINATOR ASSIGNMENTS ===');
                                if (coordinators.length === 0) {
                                    console.log('❌ No coordinators found\n');
                                } else {
                                    console.log(`✅ Found ${coordinators.length} coordinator(s):\n`);
                                    coordinators.forEach(coord => {
                                        console.log(`- ${coord.firstName} ${coord.lastName} (ID: ${coord.id})`);
                                        console.log(`  Institution: ${coord.institution_name || 'NONE'} (ID: ${coord.institution_id || 'N/A'})\n`);
                                    });
                                }
                            }
                            connection.end();
                        }
                    );
                }
            );
        }
    );
});
