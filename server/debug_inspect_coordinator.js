const db = require('./config/database');
(async function(){
  try{
    const instId = 'INST-015';
    const [inst] = await db.query('SELECT institution_id,name FROM institutions WHERE institution_id = ? LIMIT 1',[instId]);
    console.log('institution row:', inst[0] || null);

    const [coordsById] = await db.query('SELECT id,first_name,last_name,email,institution_id,institution_name,approval_status,role FROM users WHERE role = "coordinator" AND institution_id = ?', [instId]);
    console.log('coordinators with institution_id=', instId, coordsById);

    const instName = inst && inst[0] ? inst[0].name : null;
    if(instName){
      const [coordsByName] = await db.query('SELECT id,first_name,last_name,email,institution_id,institution_name,approval_status,role FROM users WHERE role = "coordinator" AND institution_name LIKE ? LIMIT 20', [`%${instName}%`]);
      console.log('coordinators with institution_name LIKE', instName, coordsByName);
    }

    const [req] = await db.query('SELECT id,first_name,last_name,email,institution_id,institution_name,role FROM users WHERE id = ? LIMIT 1', [54]);
    console.log('sample requester user id=54:', req[0] || null);

    const [assigns] = await db.query('SELECT * FROM user_printer_assignments WHERE user_id = ?', [54]);
    console.log('assignments for user 54:', assigns);

  } catch(e){ console.error('debug error', e); }
  process.exit(0);
})();
