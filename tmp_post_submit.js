const https = require('https');
const url = new URL('https://serviceease-mkie.onrender.com/api/requester-registration/submit');
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
function formField(name, value) {
  return `--${boundary}\r\nContent-Disposition: form-data; name=\"${name}\"\r\n\r\n${value}\r\n`;
}
const parts = [];
parts.push(formField('first_name','CI'));
parts.push(formField('last_name','Test'));
parts.push(formField('email','ci-test+submit@example.com'));
parts.push(formField('department','IT'));
parts.push(formField('password','TestPass123!'));
parts.push(formField('institution_id','INST1'));
parts.push(formField('institution_type','school'));
parts.push(formField('printer_serial_numbers','[{"serial_number":"S123","brand":"HP"}]'));
parts.push(formField('email_verified','true'));
parts.push(`--${boundary}--\r\n`);
const body = parts.join('');

const options = {
  method: 'POST',
  hostname: url.hostname,
  path: url.pathname,
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': 'node-script'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', data);
  });
});
req.on('error', (e) => console.error('Request error', e));
req.write(body);
req.end();
