const fs = require('fs');
const path = require('path');

// Update institution-user-app.js to reference the renamed notification file
const appFilePath = path.join(__dirname, 'client', 'src', 'js', 'institution-user-app.js');
let appContent = fs.readFileSync(appFilePath, 'utf8');
appContent = appContent.replace(/\/js\/requester-notifications\.js/g, '/js/institution-user-notifications.js');
appContent = appContent.replace(/\/components\/requester-notifications\.html/g, '/components/institution-user-notifications.html');
fs.writeFileSync(appFilePath, appContent, 'utf8');
console.log('✅ Updated file references in institution-user-app.js');

// Update institution-user.html to reference the renamed app file
const htmlFilePath = path.join(__dirname, 'client', 'src', 'pages', 'institution_user', 'institution-user.html');
let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
htmlContent = htmlContent.replace(/\/js\/requester-app\.js/g, '/js/institution-user-app.js');
fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log('✅ Updated script reference in institution-user.html');

// Rename the component file
const oldComponentPath = path.join(__dirname, 'client', 'src', 'components', 'requester-notifications.html');
const newComponentPath = path.join(__dirname, 'client', 'src', 'components', 'institution-user-notifications.html');
if (fs.existsSync(oldComponentPath)) {
  fs.renameSync(oldComponentPath, newComponentPath);
  console.log('✅ Renamed requester-notifications.html to institution-user-notifications.html');
}

console.log('\n✅ All requester files renamed to institution-user!');
