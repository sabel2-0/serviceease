const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'js', 'requester-app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the displayHistoryRequests function and add completion photo, printer details, and technician notes
const oldPattern = `            <div class="text-xs text-gray-500 mt-1">Request #\${req.id}</div>
          </div>
          \${statusBadge}
        </div>
        
        \${needsApproval ? \`
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">`;

const newPattern = `            <div class="text-xs text-gray-500 mt-1">Request #\${req.id}</div>
            \${req.serial_number ? \`<div class="text-xs text-gray-400 mt-0.5">SN: \${req.serial_number}</div>\` : ''}
          </div>
          \${statusBadge}
        </div>
        
        \${needsApproval ? \`
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">`;

content = content.replace(oldPattern, newPattern);

// Add completion photo section after needsApproval section
const photoPattern = `          </div>
        \` : ''}
        
        <div class="space-y-2 mb-3">`;

const newPhotoSection = `          </div>
        \` : ''}
        
        \${req.completion_photo_url ? \`
          <div class="mb-3">
            <p class="text-xs font-medium text-gray-700 mb-2">📸 Completion Photo</p>
            <div class="rounded-lg overflow-hidden border-2 border-blue-200 shadow-sm">
              <img src="\${req.completion_photo_url}" 
                   alt="Service completion photo" 
                   class="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                   onclick="window.open('\${req.completion_photo_url}', '_blank')">
            </div>
          </div>
        \` : ''}
        
        \${req.technician_notes ? \`
          <div class="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-xs font-semibold text-blue-800 mb-1">🔧 Technician Notes</p>
            <p class="text-sm text-blue-900">\${req.technician_notes}</p>
          </div>
        \` : ''}
        
        <div class="space-y-2 mb-3">`;

content = content.replace(photoPattern, newPhotoSection);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Added completion photo, printer serial number, and technician notes to institution user history view');
