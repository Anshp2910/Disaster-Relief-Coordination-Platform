import fs from 'fs';
import path from 'path';

const localeDir = 'client/src/i18n/locales';
const srcDirs = ['client/src/pages', 'client/src/components', 'client/src/hooks', 'client/src/context'];

// 1. Read en.json and flatten all keys
const en = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf-8'));

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

const allEnKeys = new Set(flattenKeys(en));

// 2. Extract all t() calls from source code
function extractTCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const calls = [];
  // Match: t('key'), t("key"), t(`key`), t('key') || 'fallback'
  const regex = /t\(['"`]([^'"`]+)['"`]\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    calls.push(match[1]);
  }
  return calls;
}

// 3. Find all hardcoded English strings (|| 'Some text') that are fallbacks
function findFallbackStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fallbacks = [];
  // Match: t('key') || 'some text' - extract the fallback text
  const regex = /\|\|\s*['"`]([^'"`]{3,})['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    fallbacks.push(match[1]);
  }
  return fallbacks;
}

// Collect all referenced keys from source
const referencedKeys = new Set();
const hardcodedFallbacks = [];
const sourceFiles = [];

// Walk through all source directories
for (const dir of srcDirs) {
  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
        sourceFiles.push(fullPath);
        try {
          const calls = extractTCalls(fullPath);
          calls.forEach(k => referencedKeys.add(k));
          const fb = findFallbackStrings(fullPath);
          fb.forEach(f => hardcodedFallbacks.push({ file: fullPath, text: f }));
        } catch (e) {
          // skip binary files
        }
      }
    }
  }
  walk(dir);
}

console.log('=== I18N AUDIT REPORT ===\n');

// A. Missing keys: referenced in code but not in en.json
const missingKeys = [...referencedKeys].filter(k => !allEnKeys.has(k) && !k.startsWith('statuses.') && !k.startsWith('categories.') && !k.startsWith('priorities.'));
if (missingKeys.length > 0) {
  console.log(`❌ MISSING KEYS (${missingKeys.length}): Referenced in code but not in en.json`);
  missingKeys.sort().forEach(k => console.log(`   - ${k}`));
} else {
  console.log('✅ No missing keys found.');
}

// B. Unused keys: in en.json but never referenced in code
const unusedKeys = [...allEnKeys].filter(k => !referencedKeys.has(k));
// Filter out keys that are used via dynamic patterns (statuses.*, categories.*, priorities.*)
const dynamicPatternKeys = unusedKeys.filter(k => {
  // These namespaces are accessed dynamically
  if (k.startsWith('statuses.') || k.startsWith('categories.') || k.startsWith('priorities.') || k.startsWith('weekdays.')) return false;
  return true;
});

console.log(`\n📋 POTENTIALLY UNUSED KEYS (${dynamicPatternKeys.length}): In en.json but not directly referenced in code`);
dynamicPatternKeys.sort().forEach(k => console.log(`   - ${k}`));

// C. Hardcoded fallback strings
console.log(`\n🔍 FALLBACK STRINGS (${hardcodedFallbacks.length}): English strings used as fallbacks (|| 'text')`);
hardcodedFallbacks.forEach(({ file, text }) => {
  const shortFile = file.replace(/\\/g, '/').replace('client/src/', '');
  console.log(`   ${shortFile}: "${text}"`);
});

// D. Locale file sync status
console.log('\n=== LOCALE SYNC STATUS ===');
const localeFiles = ['hi.json', 'bn.json', 'gu.json', 'kn.json', 'mr.json', 'pa.json', 'ta.json', 'te.json', 'ur.json'];

// Run the sync script logic to check what would be added
for (const file of localeFiles) {
  const filePath = path.join(localeDir, file);
  try {
    const locale = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const missing = [];
    for (const [k, v] of Object.entries(en)) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        if (!locale[k] || typeof locale[k] !== 'object') {
          missing.push(k);
        }
      } else if (!(k in locale)) {
        missing.push(k);
      }
    }
    if (missing.length > 0) {
      console.log(`❌ ${file}: ${missing.length} missing top-level keys: ${missing.join(', ')}`);
    } else {
      console.log(`✅ ${file}: all keys present (but values may be stale/English)`);
    }
  } catch (e) {
    console.log(`❌ ${file}: failed to parse - ${e.message}`);
  }
}

// E. Specific issues - look for common patterns
console.log('\n=== SPECIFIC ISSUES ===');

// Check for \n in translations (might need escaping)
console.log('\n📋 Keys with \\n in values (review for correctness):');
function findNewlines(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object') {
      findNewlines(v, key);
    } else if (typeof v === 'string' && v.includes('\\n')) {
      console.log(`   ${key}: "${v}"`);
    }
  }
}
findNewlines(en, '');

// Check for duplicate values across namespaces
console.log('\n📋 Potential duplicate strings (same text in different namespaces):');
const valueToKeys = {};
function buildValueMap(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object') {
      buildValueMap(v, key);
    } else if (typeof v === 'string' && v.length > 3) {
      if (!valueToKeys[v]) valueToKeys[v] = [];
      valueToKeys[v].push(key);
    }
  }
}
buildValueMap(en, '');
for (const [val, keys] of Object.entries(valueToKeys)) {
  if (keys.length > 1) {
    console.log(`   "${val}" → ${keys.join(', ')}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total keys in en.json: ${allEnKeys.size}`);
console.log(`Keys referenced in code: ${referencedKeys.size}`);
console.log(`Missing keys: ${missingKeys.length}`);
console.log(`Unused keys (excluding dynamic): ${dynamicPatternKeys.length}`);
console.log(`Fallback strings found: ${hardcodedFallbacks.length}`);
