const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'client', 'src', 'i18n', 'locales');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');
  content = content.replace(/"send": "[^"]*"\,?\s*\n(\s+"profile")/g, (match, p1) => {
    const indent = match.match(/^(\s+)/m)?.[1] || '    ';
    return match.replace(p1, '"close": "Close",\n' + indent + p1);
  });
  content = content.replace(/"adminBadge": "[^"]*"\,?\s*\n(\s+\})/g, (match, p1) => {
    const indent = match.match(/^(\s+)/m)?.[1] || '    ';
    return match.replace(p1, '"admin": "Admin",\n' + indent + p1);
  });
  fs.writeFileSync(fp, content, 'utf8');
  console.log('Updated:', file);
}
