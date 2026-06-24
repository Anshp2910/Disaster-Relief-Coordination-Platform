const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client', 'src', 'i18n', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'en.json');

function deepMissing(enObj, localeObj) {
  const added = {};
  for (const key of Object.keys(enObj)) {
    if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
      if (!localeObj[key] || typeof localeObj[key] !== 'object') {
        localeObj[key] = {};
      }
      const childAdded = deepMissing(enObj[key], localeObj[key]);
      if (Object.keys(childAdded).length > 0) {
        added[key] = childAdded;
      }
    } else if (!(key in localeObj)) {
      localeObj[key] = enObj[key];
      added[key] = enObj[key];
    }
  }
  return added;
}

let totalAdded = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const added = deepMissing(en, locale);
  const count = Object.keys(added).length;
  totalAdded += count;
  fs.writeFileSync(filePath, JSON.stringify(locale, null, 2) + '\n');
  if (count > 0) {
    console.log(`+${count} keys → ${file}: ${Object.keys(added).join(', ')}`);
  } else {
    console.log(`✓ ${file}: complete`);
  }
}
console.log(`\nTotal keys added: ${totalAdded}`);
