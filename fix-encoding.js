const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace corrupted characters with proper emoji
content = content.replace(/ðŸ""/g, '🔔');
content = content.replace(/ðŸ–¨ï¸/g, '🖨️');
content = content.replace(/ðŸ"/g, '📋');
content = content.replace(/ðŸ"…/g, '📅');
content = content.replace(/âš ï¸/g, '⚠️');
content = content.replace(/ðŸ"¸/g, '📸');
content = content.replace(/ðŸ"/g, '📍');
content = content.replace(/ðŸ'·/g, '👷');
content = content.replace(/ðŸ'¤/g, '👤');
content = content.replace(/âœ…/g, '✅');
content = content.replace(/âŒ/g, '❌');
content = content.replace(/âœ"/g, '✓');
content = content.replace(/â€¢/g, '•');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed all character encoding issues in requester-app.js');
