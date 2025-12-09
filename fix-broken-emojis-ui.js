const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'institution-user-app.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace broken emoji characters
content = content.replace(/📍¨ï¸/g, '🖨️'); // Broken printer emoji
content = content.replace(/â ï¸/g, '⚠️'); // Broken warning
content = content.replace(/â¢/g, '•'); // Broken bullet
content = content.replace(/📍·/g, '👤'); // Broken person with location pin
content = content.replace(/📍¤/g, '👤'); // Broken person with location pin

console.log('Fixed broken emoji characters in institution-user-app.js');

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully');
