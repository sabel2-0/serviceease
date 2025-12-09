const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');
const content = fs.readFileSync(filePath, 'utf8');

// Check for actual emojis
console.log('Checking for proper emoji (bell):', content.includes('🔔'));
console.log('Checking for corrupted pattern:', content.includes('ðŸ""'));

// Show a sample line
const lines = content.split('\n');
const line110 = lines[109]; // 0-indexed
console.log('\nLine 110:', line110);
console.log('Line 110 bytes:', Buffer.from(line110).toString('hex').substring(0, 100));
