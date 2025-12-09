const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');

// Read as buffer first
const buffer = fs.readFileSync(filePath);
console.log('First 20 bytes:', buffer.slice(0, 20));

// Try reading with different encodings
const asLatin1 = buffer.toString('latin1');
const asUtf8 = buffer.toString('utf8');

console.log('\nSearching for bell emoji pattern in latin1...');
if (asLatin1.includes('ðŸ""')) {
  console.log('Found corrupted pattern in latin1 encoding');
  
  // Fix by replacing in latin1, then save as UTF-8
  let fixed = asLatin1;
  fixed = fixed.replace(/ðŸ""/g, '🔔');
  fixed = fixed.replace(/ðŸ–¨ï¸/g, '🖨️');
  fixed = fixed.replace(/ðŸ"/g, '📋');
  fixed = fixed.replace(/ðŸ"…/g, '📅');
  fixed = fixed.replace(/âš ï¸/g, '⚠️');
  fixed = fixed.replace(/ðŸ"¸/g, '📸');
  fixed = fixed.replace(/ðŸ"/g, '📍');
  fixed = fixed.replace(/ðŸ'·/g, '👷');
  fixed = fixed.replace(/ðŸ'¤/g, '👤');
  fixed = fixed.replace(/âœ…/g, '✅');
  fixed = fixed.replace(/âŒ/g, '❌');
  fixed = fixed.replace(/âœ"/g, '✓');
  fixed = fixed.replace(/â€¢/g, '•');
  
  fs.writeFileSync(filePath, fixed, 'utf8');
  console.log('✅ Fixed and saved as UTF-8');
} else {
  console.log('Pattern not found, file may already be fixed');
}
