import sys

# Read the file
with open(r'c:\Users\marki\Desktop\SE\client\src\js\requester-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all corrupted characters
replacements = {
    'ðŸ""': '🔔',
    'ðŸ–¨ï¸': '🖨️',
    'ðŸ"': '📋',
    'ðŸ"…': '📅',
    'âš ï¸': '⚠️',
    'ðŸ"¸': '📸',
    'ðŸ"': '📍',
    'ðŸ'·': '👷',
    'ðŸ'¤': '👤',
    'âœ…': '✅',
    'âŒ': '❌',
    'âœ"': '✓',
    'â€¢': '•'
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Write back
with open(r'c:\Users\marki\Desktop\SE\client\src\js\requester-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed encoding in requester-app.js")
