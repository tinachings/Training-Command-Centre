import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildRefresherDashboardGroups,
  calculateRefresherSummary,
  countCompletedThisMonth,
  filterRefreshersForDashboard,
  getRefresherSchedulingDisplay,
  getRefresherMeetingDepartment,
  isActivelyScheduledRefresher,
  isCompletedRefresher,
  isNotScheduledRefresher,
  sortRefreshers,
  type RefresherDashboardRecord,
} from '../src/lib/refresher-dashboard';

function refresherRecord(
  overrides: Partial<RefresherDashboardRecord>,
): RefresherDashboardRecord {
  return {
    id: 1,
    traineeId: 10,
    traineeProcessId: 100,
    department: 'Surfacing',
    traineeName: 'Alex Rivera',
    process: 'Lens Inspection',
    lastCompetencyDate: '2025-07-20T00:00:00.000Z',
    refresherDueDate: '2026-07-20T00:00:00.000Z',
    scheduledRefresherDate: null,
    status: 'Due This Month',
    scheduleStatus: null,
    daysUntilDue: null,
    assignedAssessor: null,
    completedDate: null,
    outcome: null,
    ...overrides,
  };
}

test('rolls refresher departments into meeting departments', () => {
  assert.equal(
    getRefresherMeetingDepartment('Machine Setter - Production'),
    'Surfacing',
  );
  assert.equal(
    getRefresherMeetingDepartment('Machine Setter - Coating'),
    'Coating',
  );
  assert.equal(getRefresherMeetingDepartment('Surfacing'), 'Surfacing');
  assert.equal(getRefresherMeetingDepartment('Coating'), 'Coating');
  assert.equal(getRefresherMeetingDepartment('Future Team'), 'Future Team');
});

test('groups one trainee once per meeting department and keeps same names separate', () => {
  const groups = buildRefresherDashboardGroups([
    refresherRecord({ id: 1, traineeId: 10, process: 'Lens Inspection' }),
    refresherRecord({ id: 2, traineeId: 10, process: 'WI003 - PC 50' }),
    refresherRecord({
      id: 3,
      traineeId: 11,
      traineeProcessId: 101,
      traineeName: 'Alex Rivera',
      process: 'Rejects/Reworks',
    }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].colleagues.length, 2);
  assert.deepEqual(
    groups[0].colleagues.map((group) => group.traineeId),
    [10, 11],
  );
  assert.deepEqual(
    groups[0].colleagues[0].refreshers.map((item) => item.process),
    ['Lens Inspection', 'WI003 - PC 50'],
  );
});

test('places the same trainee in each applicable meeting department', () => {
  const groups = buildRefresherDashboardGroups([
    refresherRecord({
      id: 1,
      traineeId: 10,
      department: 'Machine Setter - Production',
    }),
    refresherRecord({
      id: 2,
      traineeId: 10,
      department: 'Machine Setter - Coating',
    }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.department),
    ['Surfacing', 'Coating'],
  );
  assert.equal(groups[0].colleagues.length, 1);
  assert.equal(groups[1].colleagues.length, 1);
  assert.equal(groups[0].colleagues[0].traineeId, 10);
  assert.equal(groups[1].colleagues[0].traineeId, 10);
});

test('calculates department reporting summaries from records', () => {
  const summary = calculateRefresherSummary([
    refresherRecord({
      id: 1,
      status: 'Overdue',
      scheduledRefresherDate: '2026-07-22T00:00:00.000Z',
      scheduleStatus: 'Scheduled',
    }),
    refresherRecord({
      id: 2,
      status: 'Due This Month',
    }),
    refresherRecord({ id: 3, status: 'Due Next Month' }),
    refresherRecord({ id: 4, status: 'Not Due Yet' }),
  ]);

  assert.deepEqual(summary, {
    totalRefreshers: 4,
    overdue: 1,
    dueThisMonth: 1,
    dueNextMonth: 1,
    scheduled: 1,
    notScheduled: 3,
  });
});

test('excludes completed records from scheduled and not scheduled counts', () => {
  const completed = refresherRecord({
    id: 1,
    scheduledRefresherDate: '2026-05-27T00:00:00.000Z',
    scheduleStatus: 'Completed',
    completedDate: '2026-05-27T00:00:00.000Z',
    outcome: 'Competent',
  });

  const summary = calculateRefresherSummary([completed]);

  assert.equal(isCompletedRefresher(completed), true);
  assert.equal(isActivelyScheduledRefresher(completed), false);
  assert.equal(isNotScheduledRefresher(completed), false);
  assert.equal(summary.totalRefreshers, 1);
  assert.equal(summary.scheduled, 0);
  assert.equal(summary.notScheduled, 0);
});

test('counts active scheduled and active not scheduled obligations', () => {
  const activeScheduled = refresherRecord({
    id: 1,
    scheduledRefresherDate: '2026-07-07T00:00:00.000Z',
    scheduleStatus: 'Scheduled',
    completedDate: null,
    outcome: null,
  });
  const activeNotScheduled = refresherRecord({
    id: 2,
    scheduledRefresherDate: null,
    scheduleStatus: null,
    completedDate: null,
    outcome: null,
  });

  const summary = calculateRefresherSummary([
    activeScheduled,
    activeNotScheduled,
  ]);

  assert.equal(isActivelyScheduledRefresher(activeScheduled), true);
  assert.equal(isNotScheduledRefresher(activeScheduled), false);
  assert.equal(isActivelyScheduledRefresher(activeNotScheduled), false);
  assert.equal(isNotScheduledRefresher(activeNotScheduled), true);
  assert.equal(summary.scheduled, 1);
  assert.equal(summary.notScheduled, 1);
});

test('reconciles scheduling counts to visible non-completed obligations', () => {
  const records = [
    refresherRecord({
      id: 1,
      scheduledRefresherDate: '2026-07-07T00:00:00.000Z',
      scheduleStatus: 'Scheduled',
    }),
    refresherRecord({ id: 2, scheduledRefresherDate: null }),
    refresherRecord({
      id: 3,
      scheduleStatus: 'Completed',
      completedDate: '2026-05-27T00:00:00.000Z',
      outcome: 'Competent',
    }),
  ];
  const summary = calculateRefresherSummary(records);
  const activeObligations = records.filter(
    (record) => !isCompletedRefresher(record),
  ).length;

  assert.equal(summary.totalRefreshers, 3);
  assert.equal(summary.scheduled + summary.notScheduled, activeObligations);
});

test('sorts colleague groups by compliance priority and name', () => {
  const groups = buildRefresherDashboardGroups([
    refresherRecord({
      id: 1,
      traineeId: 1,
      traineeName: 'Zoe',
      status: 'Not Due Yet',
    }),
    refresherRecord({
      id: 2,
      traineeId: 2,
      traineeName: 'Mia',
      status: 'Due Next Month',
    }),
    refresherRecord({
      id: 3,
      traineeId: 3,
      traineeName: 'Ava',
      status: 'Due This Month',
    }),
    refresherRecord({
      id: 4,
      traineeId: 4,
      traineeName: 'Bea',
      status: 'Overdue',
    }),
    refresherRecord({
      id: 5,
      traineeId: 5,
      traineeName: 'Ada',
      status: 'Overdue',
    }),
  ]);

  assert.deepEqual(
    groups[0].colleagues.map((group) => group.traineeName),
    ['Ada', 'Bea', 'Ava', 'Mia', 'Zoe'],
  );
});

test('sorts refreshers by priority, due date and process name', () => {
  const sorted = sortRefreshers([
    refresherRecord({
      id: 1,
      status: 'Due Next Month',
      refresherDueDate: '2026-08-01T00:00:00.000Z',
      process: 'B Process',
    }),
    refresherRecord({
      id: 2,
      status: 'Overdue',
      refresherDueDate: '2026-06-25T00:00:00.000Z',
      process: 'C Process',
    }),
    refresherRecord({
      id: 3,
      status: 'Overdue',
      refresherDueDate: '2026-06-19T23:00:00.000Z',
      process: 'A Process',
    }),
    refresherRecord({
      id: 4,
      status: 'Overdue',
      refresherDueDate: '2026-06-19T23:00:00.000Z',
      process: 'A Earlier Name',
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    [4, 3, 2, 1],
  );
});

test('counts only records completed in the current UTC month', () => {
  const count = countCompletedThisMonth(
    [
      refresherRecord({
        id: 1,
        status: 'Completed',
        completedDate: '2026-07-01T00:30:00.000Z',
      }),
      refresherRecord({
        id: 2,
        status: 'Completed',
        completedDate: '2026-06-30T23:30:00.000Z',
      }),
      refresherRecord({
        id: 3,
        status: 'Overdue',
        completedDate: '2026-07-15T00:00:00.000Z',
      }),
    ],
    new Date('2026-07-21T12:00:00.000Z'),
  );

  assert.equal(count, 1);
});

test('formats scheduling display labels without redundant planned text', () => {
  assert.deepEqual(
    getRefresherSchedulingDisplay(
      refresherRecord({
        scheduledRefresherDate: null,
        scheduleStatus: null,
      }),
    ),
    { label: 'Not Scheduled', tone: 'notScheduled' },
  );
  assert.deepEqual(
    getRefresherSchedulingDisplay(
      refresherRecord({
        scheduledRefresherDate: '2026-07-07T00:00:00.000Z',
        scheduleStatus: 'Scheduled',
      }),
    ),
    { label: 'Scheduled 07 Jul 2026', tone: 'scheduled' },
  );
  assert.deepEqual(
    getRefresherSchedulingDisplay(
      refresherRecord({
        scheduledRefresherDate: '2026-05-27T00:00:00.000Z',
        scheduleStatus: 'Completed',
        completedDate: '2026-05-27T00:00:00.000Z',
      }),
    ),
    { label: 'Completed 27 May 2026', tone: 'completed' },
  );
  assert.doesNotMatch(
    getRefresherSchedulingDisplay(refresherRecord({})).label,
    /Planned -/,
  );
});

test('filters API-shaped ISO records by meeting department without mutation', () => {
  const records = [
    refresherRecord({
      id: 1,
      department: 'Machine Setter - Production',
      refresherDueDate: '2026-07-20T00:00:00.000Z',
    }),
    refresherRecord({
      id: 2,
      department: 'Machine Setter - Coating',
      refresherDueDate: '2026-07-21T00:00:00.000Z',
    }),
  ];

  const filtered = filterRefreshersForDashboard(records, {
    department: 'Surfacing',
    status: 'All',
    trainee: 'All',
  });

  assert.deepEqual(
    filtered.map((item) => item.id),
    [1],
  );
  assert.equal(records[0].department, 'Machine Setter - Production');
});

test('Refresher Dashboard links directly to colleague profiles', () => {
  const source = readFileSync('src/app/refreshers/page.tsx', 'utf8');

  assert.match(source, /View Colleague/);
  assert.match(source, /href=\{`\/trainees\/\$\{colleague\.traineeId\}`\}/);
});

test('Refresher Dashboard source supports collapsed colleague groups', () => {
  const source = readFileSync('src/app/refreshers/page.tsx', 'utf8');

  assert.match(source, /useState<Set<string>>\(\s*\(\) => new Set\(\),/);
  assert.match(
    source,
    /`\$\{departmentGroup\.department\}:\$\{colleague\.traineeId\}`/,
  );
  assert.match(source, /<button\s+type="button"[\s\S]*aria-expanded/);
  assert.match(source, /if \(trainee === 'All'\)/);
  assert.match(source, /colleague\.traineeName === trainee/);
  assert.doesNotMatch(source, /Planned\s*\{/);
});

test('Refresher Dashboard source stays read-only', () => {
  const source = readFileSync('src/app/refreshers/page.tsx', 'utf8');
  const forbiddenLabels = [
    ['Schedule', 'Refresher'].join(' '),
    ['Complete', 'Refresher'].join(' '),
    ['Defer', 'Refresher'].join(' '),
    ['Carry', 'Over', 'Refresher'].join(' '),
  ];

  forbiddenLabels.forEach((label) => {
    assert.equal(source.includes(label), false);
  });
});
