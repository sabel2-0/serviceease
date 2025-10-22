const db = require('./config/database');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
(async ()=>{
  try{
    // user 54 has assignment inventory_item_id 11
    const userId = 54;
    const inventory_item_id = 11;
    const secret = process.env.JWT_SECRET || 'serviceease_dev_secret';
    const token = jwt.sign({ id: userId, email: 'davetriciamae3@gmail.com', role: 'requester' }, secret, { expiresIn: '1h' });
    console.log('token generated');
    const payload = {
      inventory_item_id,
      location: 'Room 123',
      priority: 'high',
      description: 'Automated test request from script',
    };
    const res = await fetch('http://localhost:3000/api/service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
    console.log('status', res.status);
    const body = await res.json().catch(()=>null);
    console.log('body', body);
    // Query latest 3 service_requests for the institution INST-015
    const [rows] = await db.query('SELECT id,request_number,institution_id,coordinator_id,assigned_technician_id,priority,status,location,description,created_at FROM service_requests WHERE institution_id = ? ORDER BY created_at DESC LIMIT 5', ['INST-015']);
    console.log('latest service_requests for INST-015:', rows);
  }catch(e){console.error(e);} process.exit(0);
})();