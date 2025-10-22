const db = require('./config/database');
(async ()=>{
  try{
    console.log('Running coordinator -> institution fix');
    const [result] = await db.query(`
      UPDATE users c
      JOIN institutions i ON TRIM(c.institution_name) = TRIM(i.name)
      SET c.institution_id = i.institution_id
      WHERE c.role = 'coordinator' AND (c.institution_id IS NULL OR c.institution_id = '')
    `);
    console.log('Update result:', result);
    // Show sample coordinator rows that should now have institution_id
    const [rows] = await db.query("SELECT id, first_name, last_name, email, institution_name, institution_id FROM users WHERE role='coordinator' AND institution_name IS NOT NULL LIMIT 20");
    console.log('Sample coordinators after update:', rows);
  }catch(e){ console.error('Fix error', e); }
  process.exit(0);
})();