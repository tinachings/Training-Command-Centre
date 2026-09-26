import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Assessment outcome automatically aligns the default next action', () => {
  const page = readFileSync('src/app/assessment-generator/page.tsx', 'utf8');

  assert.match(page, /defaultNextActionForOutcome/);
  assert.match(page, /Ready for Assessment/);
  assert.match(page, /Proceed to Assessment/);
  assert.match(page, /Further Development Required/);
  assert.match(page, /Continue Development/);
  assert.match(page, /Competent – Recommend Sign-Off/);
  assert.match(page, /Retraining Required/);
});

test('Team Leader email uses assessment-specific wording', () => {
  const helper = readFileSync('src/lib/assessment-report.ts', 'utf8');

  assert.match(helper, /pre-assessment for/);
  assert.match(helper, /assessment for/);
  assert.doesNotMatch(helper, /I've completed assessing/);
});

test('Assessment Generator sits before Assessment Records in navigation', () => {
  const shell = readFileSync('src/components/app-shell.tsx', 'utf8');

  const generator = shell.indexOf("['Assessment Generator', '/assessment-generator']");
  const records = shell.indexOf("['Assessment Records', '/assessment-records']");

  assert.ok(generator > -1);
  assert.ok(records > -1);
  assert.ok(generator < records);
});
