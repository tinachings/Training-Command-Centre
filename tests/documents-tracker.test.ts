import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Documents navigation and tracker page exist', () => {
  const shell = readFileSync('src/components/app-shell.tsx', 'utf8');
  const page = readFileSync('src/app/documents/page.tsx', 'utf8');
  assert.match(shell, /\['Documents', '\/documents'\]/);
  assert.match(page, /Documents Tracker/);
  assert.match(page, /Add Document Request/);
  assert.match(page, /Document Pipeline/);
  assert.match(page, /Document Timeline/);
});

test('New documents include trial while existing updates skip trial', () => {
  const workflow = readFileSync('src/lib/document-workflow.ts', 'utf8');
  assert.match(workflow, /newDocumentStages[\s\S]*Testing \/ Trial Period/);
  const updateBlock = workflow.match(/updateDocumentStages = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
  assert.doesNotMatch(updateBlock, /Testing \/ Trial Period/);
  assert.match(workflow, /Submitted for Approval/);
  assert.match(workflow, /Revision Required/);
});

test('Tracker only uses agreed TA-owned document types', () => {
  const workflow = readFileSync('src/lib/document-workflow.ts', 'utf8');
  assert.match(workflow, /'SOP', 'WI', 'Care Point', 'Visual Aid'/);
});
