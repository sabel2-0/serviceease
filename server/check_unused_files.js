const fs = require('fs');
const path = require('path');

// Get all JS files in the current directory
const jsFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'check_unused_files.js');

// Read contents of all JS files
const fileContents = {};
jsFiles.forEach(f => {
  fileContents[f] = fs.readFileSync(path.join(__dirname, f), 'utf8');
});

// Helper to check if a file is used
function isFileUsed(baseName, excludeFile) {
  // Check other JS files
  for (const otherFile of jsFiles) {
    if (otherFile === excludeFile) continue;
    if (fileContents[otherFile].includes(baseName)) return true;
  }
  // Check README.md
  if (fs.existsSync('README.md') && fs.readFileSync('README.md', 'utf8').includes(baseName)) return true;
  // Check package.json
  if (fs.existsSync('package.json') && fs.readFileSync('package.json', 'utf8').includes(baseName)) return true;
  return false;
}

const unusedFiles = [];

jsFiles.forEach(file => {
  const baseName = path.basename(file, '.js');
  if (!isFileUsed(baseName, file)) unusedFiles.push(file);
});

console.log('Unused JS files:', unusedFiles);
