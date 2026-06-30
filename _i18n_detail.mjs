import fs from 'fs';
import path from 'path';

const srcDirs = ['client/src/pages', 'client/src/components', 'client/src/hooks', 'client/src/context'];

function findMissingKeyDetails(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = [];
  const regex = /t\(['"`]([^'"`]+)['"`]\)/g;
  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    const line = lines[i];
    let match;
    while ((match = regex.exec(line)) !== null) {
      results.push({ key: match[1], file: filePath.replace(/\\/g, '/').replace('client/src/', ''), line: i + 1, context: line.trim().substring(0, 120) });
    }
  }
  return results;
}

const en = JSON.parse(fs.readFileSync('client/src/i18n/locales/en.json', 'utf-8'));
function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sk of flattenKeys(v, key)) keys.add(sk);
    } else {
      keys.add(key);
    }
  }
  return keys;
}
const allEnKeys = flattenKeys(en);

const allRefs = [];
for (const dir of srcDirs) {
  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        allRefs.push(...findMissingKeyDetails(fullPath));
      }
    }
  }
  walk(dir);
}

// Find missing
const missing = allRefs.filter(r => !allEnKeys.has(r.key) && !r.key.startsWith('statuses.') && !r.key.startsWith('categories.') && !r.key.startsWith('priorities.') && !r.key.startsWith('weekdays.'));

// Group by key
const grouped = {};
missing.forEach(r => {
  if (!grouped[r.key]) grouped[r.key] = [];
  grouped[r.key].push(r);
});

console.log('=== MISSING KEYS WITH CONTEXT ===');
for (const [key, refs] of Object.entries(grouped).sort()) {
  console.log(`\n❌ ${key}`);
  for (const r of refs.slice(0, 3)) {
    console.log(`   ${r.file}:${r.line} → ${r.context}`);
  }
  if (refs.length > 3) console.log(`   ... and ${refs.length - 3} more occurrences`);
}
