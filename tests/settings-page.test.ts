import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Settings page uses focused management tabs', () => {
  const source = readFileSync('src/app/settings/page.tsx', 'utf8');

  assert.match(source, /Overview/);
  assert.match(source, /Departments/);
  assert.match(source, /Processes/);
  assert.match(source, /People & Roles/);
  assert.match(source, /Workflow Settings/);
  assert.match(source, /Search process/);
  assert.match(source, /Search person/);
  assert.doesNotMatch(source, /Trainee<\/th>/);
});
