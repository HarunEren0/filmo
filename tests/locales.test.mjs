import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const tr = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/locales/tr.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/locales/en.json'), 'utf8'));

const collectJsFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
};

test('tr.json and en.json have identical keys and non-empty string values', () => {
  const trKeys = Object.keys(tr).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(trKeys, enKeys);

  for (const key of trKeys) {
    assert.equal(typeof tr[key], 'string', `tr.${key} should be a string`);
    assert.ok(tr[key].trim().length > 0, `tr.${key} should not be empty`);
    assert.equal(typeof en[key], 'string', `en.${key} should be a string`);
    assert.ok(en[key].trim().length > 0, `en.${key} should not be empty`);
  }
});

test('all static i18n.t() keys referenced in src/ exist in both tr.json and en.json', () => {
  const files = collectJsFiles(path.join(rootDir, 'src'));
  const keyRegex = /i18n\.t\(\s*['"]([a-z0-9_]+)['"]\s*\)/g;
  const missingInTr = [];
  const missingInEn = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = keyRegex.exec(content)) !== null) {
      const key = match[1];
      if (!(key in tr)) missingInTr.push(`${path.relative(rootDir, file)}: ${key}`);
      if (!(key in en)) missingInEn.push(`${path.relative(rootDir, file)}: ${key}`);
    }
  }

  assert.deepEqual(missingInTr, []);
  assert.deepEqual(missingInEn, []);
});
