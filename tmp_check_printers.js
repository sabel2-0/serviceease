const db = require('./server/config/database');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
(async ()=>{
  try {
    const [rows] = await db.query('SELECT u.id,u.first_name,u.last_name,u.email,u.institution_id FROM users u JOIN user_printer_assignments upa ON upa.user_id = u.id LIMIT 1');
    if(!rows||rows.length===0){ console.log('No user with assignment found in DB'); process.exit(0); }
    const user=rows[0];
    console.log('Found user:', user);
    const secret = process.env.JWT_SECRET || 'serviceease_dev_secret';
    const token = jwt.sign({ id: user.id, email: user.email, role: 'requester', institution_id: user.institution_id }, secret, { expiresIn: '1h' });
    console.log('Token generated');
    const res = await fetch('http://localhost:3000/api/users/me/printers', { headers: { 'Authorization': 'Bearer ' + token } });
    console.log('status', res.status);
    const j = await res.json().catch(()=>null);
    console.log('body', j);
  } catch (e) { console.error(e); }
  process.exit(0);
})();