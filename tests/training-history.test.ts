import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Training Records exposes monthly new training history', () => {
  const page = readFileSync('src/app/trainees/page.tsx', 'utf8');

  assert.match(page, /New Trainings This Month/);
  assert.match(page, /View training history/);
  assert.match(page, /type="month"/);
  assert.match(page, /\/api\/training-history\?month=/);
});

test('New training history is based on training start date', () => {
  const api = readFileSync('src/app/api/training-history/route.ts', 'utf8');

  assert.match(api, /trainingStartDate:/);
  assert.match(api, /gte: month\.start/);
  assert.match(api, /lt: month\.end/);
});
