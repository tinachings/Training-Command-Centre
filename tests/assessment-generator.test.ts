import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Assessment Generator uses the eight-step assessor workflow', () => {
  const page = readFileSync('src/app/assessment-generator/page.tsx', 'utf8');

  assert.match(page, /Step \{step\} of 8/);
  assert.match(page, /Positive Observations/);
  assert.match(page, /Competency Evaluation/);
  assert.match(page, /Finalise Assessment/);
  assert.match(page, /Copy TL Email/);
  assert.match(page, /Download Competency Assessment Record/);
});

test('Assessment is only saved from the finalisation action', () => {
  const page = readFileSync('src/app/assessment-generator/page.tsx', 'utf8');

  assert.match(page, /async function finaliseAssessment/);
  assert.match(page, /fetch\('\/api\/assessment-generator'/);
  assert.doesNotMatch(page, /Generate Preview/);
});

test('Assessment report helpers preserve positive observation wording', () => {
  const helper = readFileSync('src/lib/assessment-report.ts', 'utf8');
  const exporter = readFileSync('src/lib/export.ts', 'utf8');

  assert.match(helper, /Positive observations:/);
  assert.match(exporter, /Positive Observations/);
});
