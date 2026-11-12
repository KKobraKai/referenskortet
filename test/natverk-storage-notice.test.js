import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('app shows storage_unavailable notice on startup path', () => {
  const app = fs.readFileSync(path.join(process.cwd(), 'natverk/js/app.js'), 'utf-8');
  assert.ok(app.includes("t('storage_unavailable')"));
});
