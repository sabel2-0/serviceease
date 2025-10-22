const mysql = require('mysql2/promise');

(async () => {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    console.log('\n=== ALL Notifications (latest 10) ===');
    const [notifs] = await db.query('SELECT id, user_id, type, title, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 10');
    console.table(notifs);

    console.log('\n=== User 57 (Razor Axe) ===');
    const [user57] = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = 57');
    console.table(user57);

    console.log('\n=== Notifications for user 57 ===');
    const [user57notifs] = await db.query('SELECT id, type, title, is_read, created_at FROM notifications WHERE user_id = 57 ORDER BY created_at DESC');
    console.table(user57notifs);

    console.log('\n=== Current JWT token user info ===');
    const [currentUser] = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE email = "markivan.storm@gmail.com"');
    console.table(currentUser);

    await db.end();
})();
