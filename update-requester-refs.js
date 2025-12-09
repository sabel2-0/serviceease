const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all REQUESTER references with institution_user
content = content.replace(/\[REQUESTER\]/g, '[institution_user]');
content = content.replace(/window\.RequesterNotifications/g, 'window.institution_userNotifications');
content = content.replace(/RequesterNotifications/g, 'institution_userNotifications');

// Replace container IDs
content = content.replace(/requester-bottomnav-container/g, 'institution-user-bottomnav-container');

// Replace fetch paths for components
content = content.replace(/\/components\/requester-bottomnav\.html/g, '/components/institution-user-bottomnav.html');

// Replace page paths
content = content.replace(/\/pages\/requester\/requester-/g, '/pages/institution_user/institution-user-');

// Fix emoji encoding issues - replace malformed UTF-8 with proper emojis
content = content.replace(/ð\s+\[institution_user\]/g, '🔔 [institution_user]');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated all REQUESTER references to institution_user');
