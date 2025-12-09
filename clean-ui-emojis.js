const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'institution-user-app.js');

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

// Remove all broken emoji patterns - using hex codes for problematic characters
const replacements = [
  { from: /\u{1F4CD}\u{00A8}\u{00EF}\u{00B8}/gu, to: '' }, // 📍¨ï¸
  { from: /\u{00E2}\s\u{00EF}\u{00B8}/gu, to: '' }, // â ï¸
  { from: /\u{00E2}\u{00A2}/gu, to: '•' }, // â¢
  { from: /\u{1F4CD}\u{00B7}/gu, to: 'Tech:' }, // 📍·
  { from: /\u{1F4CD}\u{00A4}/gu, to: 'By:' }, // 📍¤
  { from: /\u{1F4CD}\s/gu, to: '' }, // 📍 (with space)
  { from: /\u{2705}\s/gu, to: '' }, // ✅ (with space)
  { from: /\u{1F4CD}/gu, to: '' }, // Any remaining 📍
];

let changes = 0;
replacements.forEach(({ from, to }) => {
  const before = content;
  content = content.replace(from, to);
  if (before !== content) {
    changes++;
    console.log(`Replaced: ${from} -> "${to}"`);
  }
});

if (changes > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\n✓ Fixed ${changes} broken emoji patterns`);
} else {
  console.log('\n✓ No broken emojis found');
}
