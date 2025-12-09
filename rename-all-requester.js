const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all remaining "requester" references with "institution_user" or "institution-user"
// Function names and variables
content = content.replace(/requesterName/g, 'institutionUserName');
content = content.replace(/requester_/g, 'institution_user_');

// Comments
content = content.replace(/requester/g, 'institution_user');
content = content.replace(/Requester/g, 'Institution User');

// Fix any double replacements that might have occurred
content = content.replace(/institution_user-app\.js/g, 'requester-app.js'); // Keep filename reference
content = content.replace(/institution_user-notifications\.js/g, 'requester-notifications.js'); // Keep filename reference
content = content.replace(/institution_user-notifications\.html/g, 'requester-notifications.html'); // Keep filename reference

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Replaced all remaining "requester" references with "institution_user" in requester-app.js');
