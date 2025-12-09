const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/js/institution-user-app.js');

let content = fs.readFileSync(filePath, 'utf8');

// Fix specific corrupted emojis by finding exact patterns in context
content = content.replace(/â\s*ï¸\s*Work completed/g, '⚠️ Work completed');
content = content.replace(/📍· \$\{technicianName\}/g, '👷 ${technicianName}');
content = content.replace(/📍 \$\{institutionUserName\}/g, '👤 ${institutionUserName}');
content = content.replace(/📍 \$\{timeAgo\}/g, '🕐 ${timeAgo}');
content = content.replace(/â¢/g, '•');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed emoji encoding in institution-user-app.js');

