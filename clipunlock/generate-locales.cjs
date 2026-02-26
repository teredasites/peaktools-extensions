#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const en = require('./src/_locales/en/messages.json');
const KEYS = Object.keys(en);

function buildLocale(translations) {
  const result = {};
  for (const key of KEYS) {
    if (key === 'extensionName') { result[key] = { ...en[key] }; continue; }
    const msg = translations[key];
    if (msg) {
      result[key] = { message: msg, description: en[key].description };
      if (en[key].placeholders) result[key].placeholders = JSON.parse(JSON.stringify(en[key].placeholders));
    } else {
      result[key] = JSON.parse(JSON.stringify(en[key]));
    }
  }
  return result;
}

function writeLocale(locale, data) {
  for (const base of ['src/_locales', '_locales']) {
    const dir = path.join(__dirname, base, locale);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'messages.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
}

// Load existing locale if it exists, to preserve already-translated keys
function loadExisting(locale) {
  try { return require(`./src/_locales/${locale}/messages.json`); } catch { return null; }
}

function mergeTranslations(locale, newTranslations) {
  const existing = loadExisting(locale);
  const merged = {};
  if (existing) {
    for (const [k, v] of Object.entries(existing)) { merged[k] = v.message; }
  }
  Object.assign(merged, newTranslations);
  return merged;
}

// Load all translation chunks
const T = {};
const chunksDir = path.join(__dirname, 'locale-data');
if (fs.existsSync(chunksDir)) {
  for (const file of fs.readdirSync(chunksDir).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(chunksDir, file), 'utf8'));
    Object.assign(T, data);
  }
}

console.log('English source:', KEYS.length, 'keys');
console.log('Loaded translations for:', Object.keys(T).length, 'locales');

// Write English
writeLocale('en', en);
console.log('  en ✓');

// Write all translated locales
for (const [locale, trans] of Object.entries(T)) {
  const merged = mergeTranslations(locale, trans);
  writeLocale(locale, buildLocale(merged));
  const count = Object.keys(trans).length;
  console.log(`  ${locale} ✓ (${count} translated keys)`);
}

// Verify
const srcLocales = fs.readdirSync(path.join(__dirname, 'src', '_locales'));
const rootLocales = fs.readdirSync(path.join(__dirname, '_locales'));
console.log(`\nDone! src/_locales: ${srcLocales.length} locales, _locales: ${rootLocales.length} locales`);
console.log('Locales:', srcLocales.sort().join(', '));
