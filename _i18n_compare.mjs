import fs from 'fs';
import path from 'path';

const localeDir = 'client/src/i18n/locales';

// Flatten an object into dot-separated keys
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

// Load en.json as reference
const en = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf-8'));
const enKeys = flattenKeys(en);
const enKeySet = new Set(enKeys);

console.log(`=== I18N LOCALE COMPARISON REPORT ===\n`);
console.log(`Reference (en.json): ${enKeys.length} keys\n`);

const localeFiles = [
  { code: 'hi', file: 'hi.json', name: 'Hindi' },
  { code: 'bn', file: 'bn.json', name: 'Bengali' },
  { code: 'gu', file: 'gu.json', name: 'Gujarati' },
  { code: 'kn', file: 'kn.json', name: 'Kannada' },
  { code: 'mr', file: 'mr.json', name: 'Marathi' },
  { code: 'pa', file: 'pa.json', name: 'Punjabi' },
  { code: 'ta', file: 'ta.json', name: 'Tamil' },
  { code: 'te', file: 'te.json', name: 'Telugu' },
  { code: 'ur', file: 'ur.json', name: 'Urdu' }
];

let totalMissing = 0;

for (const locale of localeFiles) {
  const filePath = path.join(localeDir, locale.file);
  const content = fs.readFileSync(filePath, 'utf-8');
  let localeObj;
  try {
    localeObj = JSON.parse(content);
  } catch (e) {
    console.log(`\n❌ ${locale.name} (${locale.file}): FAILED TO PARSE - ${e.message}`);
    continue;
  }
  
  const localeKeys = flattenKeys(localeObj);
  const localeKeySet = new Set(localeKeys);
  
  // Find missing keys (in en.json but not in this locale)
  const missing = enKeys.filter(k => !localeKeySet.has(k));
  const extra = localeKeys.filter(k => !enKeySet.has(k));
  
  console.log(`\n--- ${locale.name} (${locale.file}) ---`);
  console.log(`  Total keys: ${localeKeys.length}`);
  
  if (missing.length > 0) {
    console.log(`  ❌ MISSING KEYS: ${missing.length}`);
    totalMissing += missing.length;
    
    // Group missing keys by namespace
    const byNamespace = {};
    for (const k of missing) {
      const ns = k.includes('.') ? k.split('.')[0] : '(top-level)';
      if (!byNamespace[ns]) byNamespace[ns] = [];
      byNamespace[ns].push(k);
    }
    for (const [ns, keys] of Object.entries(byNamespace).sort()) {
      console.log(`    [${ns}]: ${keys.length} keys`);
      // Only show the first few
      for (const k of keys.slice(0, 6)) {
        console.log(`      - ${k}`);
      }
      if (keys.length > 6) console.log(`      ... and ${keys.length - 6} more`);
    }
  } else {
    console.log(`  ✅ All keys present`);
  }
  
  if (extra.length > 0) {
    console.log(`  ⚠️ EXTRA KEYS (not in en.json): ${extra.length}`);
    for (const k of extra.slice(0, 5)) {
      console.log(`      - ${k}`);
    }
    if (extra.length > 5) console.log(`      ... and ${extra.length - 5} more`);
  }
}

console.log(`\n\n=== SUMMARY ===`);
console.log(`Total keys in en.json: ${enKeys.length}`);
console.log(`Total missing locale keys across all 9 locales: ${totalMissing}`);
console.log(`Average missing per locale: ${(totalMissing / 9).toFixed(0)}`);
