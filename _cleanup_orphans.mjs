import fs from 'fs';
import path from 'path';

const localeDir = 'client/src/i18n/locales';
const orphanedKeys = ['selectLocationFirst', 'locationError', 'geolocationNotSupported', 'unableToRetrieve'];
const localeFiles = ['hi.json', 'bn.json', 'gu.json', 'kn.json', 'mr.json', 'pa.json', 'ta.json', 'te.json', 'ur.json'];

for (const file of localeFiles) {
  const filePath = path.join(localeDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse and remove orphaned keys from editRequest section
  const obj = JSON.parse(content);
  if (obj.editRequest) {
    let changed = false;
    for (const key of orphanedKeys) {
      if (key in obj.editRequest) {
        delete obj.editRequest[key];
        changed = true;
      }
    }
    if (changed) {
      const sorted = JSON.stringify(obj, null, 2) + '\n';
      fs.writeFileSync(filePath, sorted);
      console.log(`✅ ${file}: removed ${orphanedKeys.filter(k => k in obj.editRequest || true).length} orphaned keys`);
    } else {
      console.log(`✅ ${file}: already clean`);
    }
  }
}

console.log('\nDone.');
