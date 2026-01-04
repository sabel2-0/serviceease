const http = require('http');

const data = JSON.stringify({
    email: 'serviceeaseph@gmail.com', 
    password: 'Admin@123'
});

const req = http.request({
    hostname: 'localhost', 
    port: 3000, 
    path: '/api/login', 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'}
}, (res) => { 
    let body = ''; 
    res.on('data', d => body += d); 
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body);
        process.exit(0);
    }); 
});

req.on('error', e => {
    console.log('Error:', e.message);
    process.exit(1);
});

req.write(data); 
req.end();
