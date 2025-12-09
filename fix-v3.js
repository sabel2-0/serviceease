const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');

// Read the file as raw buffer
const buffer = fs.readFileSync(filePath);

// Remove BOM if exists
let startIndex = 0;
if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
  startIndex = 3;
  console.log('Removed UTF-8 BOM');
}

// Convert to string
let content = buffer.toString('utf8', startIndex);

// Replace emoji patterns by searching for hex patterns
// Bell emoji bytes in proper UTF-8: F0 9F 94 94
const bellPattern = String.fromCharCode(0xF0, 0x9F, 0x94, 0x94);
// Check if it exists
console.log('Contains proper bell emoji:', content.includes(bellPattern));

// If not, we need to fix the mangled encoding
// The pattern appears to be reading UTF-8 bytes as if they were Windows-1252/Latin1
// Then those characters were re-encoded as UTF-8

// Direct hex replacement approach
let fixed = content;

// Bell emoji 🔔 (should be F09F9494 in UTF-8)
fixed = fixed.replace(/Ã°Å¸ââ/g, '🔔');
fixed = fixed.replace(/ð\u009F\u0094\u0094/g, '🔔');

// Printer emoji 🖨️
fixed = fixed.replace(/Ã°Å¸â¨Â·ï¸/g, '🖨️');

// Clipboard 📋
fixed = fixed.replace(/Ã°Å¸â/g, '📋');

// Calendar 📅  
fixed = fixed.replace(/Ã°Å¸â¦/g, '📅');

// Warning ⚠️
fixed = fixed.replace(/â ï¸/g, '⚠️');

// Camera 📸
fixed = fixed.replace(/Ã°Å¸â¸/g, '📸');

// Pin 📍
fixed = fixed.replace(/Ã°Å¸â/g, '📍');

// Construction worker 👷
fixed = fixed.replace(/Ã°Å¸â·/g, '👷');

// Person 👤
fixed = fixed.replace(/Ã°Å¸â¤/g, '👤');

// Check mark ✅
fixed = fixed.replace(/â/g, '✅');

// Cross ❌
fixed = fixed.replace(/â/g, '❌');

// Check ✓
fixed = fixed.replace(/â"/g, '✓');

// Bullet •
fixed = fixed.replace(/â¢/g, '•');

// Write without BOM
fs.writeFileSync(filePath, fixed, {encoding: 'utf8', flag: 'w'});
console.log('✅ Fixed encoding');
