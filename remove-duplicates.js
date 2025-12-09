const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'maintenance-services.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);
console.log(`\nLine 765: ${lines[764]}`);
console.log(`Line 766: ${lines[765]}`);
console.log(`Line 767: ${lines[766]}`);

// Find the first duplicate approve endpoint (around line 769)
// and first duplicate reject endpoint (around line 883)
// We want to remove lines 765-943

const startLine = 764; // 0-indexed (line 765)
const endLine = 943; // 0-indexed (line 944)

console.log(`\nRemoving lines ${startLine + 1} to ${endLine + 1}`);
console.log(`First line to remove: "${lines[startLine].substring(0, 50)}..."`);
console.log(`Last line to remove: "${lines[endLine].substring(0, 50)}..."`);

// Remove the duplicate lines
const newLines = [
    ...lines.slice(0, startLine),
    ...lines.slice(endLine + 1)
];

console.log(`\nNew total lines: ${newLines.length}`);
console.log(`Removed ${lines.length - newLines.length} lines`);

// Write back
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('\n✅ File updated successfully!');
