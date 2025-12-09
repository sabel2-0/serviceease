const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');
let content = fs.readFileSync(filePath, 'utf8');

// The file contains double-encoded UTF-8 sequences
// We need to treat it as latin1 to decode properly, then re-encode
const buffer = fs.readFileSync(filePath);
const latin1Content = buffer.toString('latin1');

// Now replace the sequences that appear when UTF-8 is mistakenly read as latin1
let fixed = latin1Content;
fixed = fixed.replace(/ðŸ""/g, '🔔');  // Bell
fixed = fixed.replace(/ðŸ–¨ï¸/g, '🖨️'); // Printer  
fixed = fixed.replace(/ðŸ"/g, '📋');  // Clipboard
fixed = fixed.replace(/ðŸ"…/g, '📅');  // Calendar
fixed = fixed.replace(/âš ï¸/g, '⚠️'); // Warning
fixed = fixed.replace(/ðŸ"¸/g, '📸');  // Camera
fixed = fixed.replace(/ðŸ"/g, '📍');  // Pin
fixed = fixed.replace(/ðŸ'·/g, '👷');  // Construction worker
fixed = fixed.replace(/ðŸ'¤/g, '👤');  // Person
fixed = fixed.replace(/âœ…/g, '✅');  // Check mark
fixed = fixed.replace(/âŒ/g, '❌');  // Cross mark
fixed = fixed.replace(/âœ"/g, '✓');   // Check
fixed = fixed.replace(/â€¢/g, '•');   // Bullet

// Write as UTF-8
fs.writeFileSync(filePath, fixed, 'utf8');
console.log('✅ Fixed all encoding issues in requester-app.js');
