import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { formatPlannerDate } from '../src/app/weekly-planner/weekly-planner-client';
import {
  buildLifecycleGroups,
  buildWeeklyPlannerSummary,
  dedupeWeeklyPlannerItems,
  deriveWeeklyPlannerStatus,
  getWeeklyPlannerMeetingDepartment,
  type WeeklyPlannerItem,
} from '../src/lib/weekly-planner';

function dateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);

  return next;
}

function currentWeekBeginning() {
  const today = new Date();
  const utcToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const day = utcToday.getUTCDay();
  const daysFromMonday = day === 0 ? -6 : 1 - day;

  return addDays(utcToday, daysFromMonday);
}

function plannerItem(
  overrides: Partial<WeeklyPlannerItem>,
): WeeklyPlannerItem {
  return {
    id: 1,
    weekCommencing: '2026-07-20',
    plannedDate: '2026-07-21',
    department: 'Coating',
    traineeName: 'Alex Rivera',
    process: 'Touch-Up',
    activityType: 'Refresher',
    owner: null,
    status: 'Planned',
    actualDate: null,
    deviationReason: null,
    followUpRequired: false,
    followUpDate: null,
    traineeProcessId: null,
    ...overrides,
  };
}

test('derives planner outcomes without leaking trainee workflow statuses', () => {
  const thisWeek = dateKey(currentWeekBeginning());
  const thisWeekTuesday = dateKey(addDays(currentWeekBeginning(), 1));
  const previousWeek = dateKey(addDays(currentWeekBeginning(), -7));
  const previousWeekTuesday = dateKey(addDays(currentWeekBeginning(), -6));

  assert.equal(
    deriveWeeklyPlannerStatus(
      plannerItem({
        plannedDate: thisWeekTuesday,
        status: 'In Training / Active',
      }),
      thisWeek,
    ),
    'Planned',
  );
  assert.equal(
    deriveWeeklyPlannerStatus(
      plannerItem({
        plannedDate: thisWeekTuesday,
        status: 'Competent',
      }),
      thisWeek,
    ),
    'Planned',
  );
  assert.equal(
    deriveWeeklyPlannerStatus(
      plannerItem({
        plannedDate: thisWeekTuesday,
        actualDate: thisWeekTuesday,
        status: 'In Training / Active',
      }),
      thisWeek,
    ),
    'Completed',
  );
  assert.equal(
    deriveWeeklyPlannerStatus(
      plannerItem({
        plannedDate: previousWeekTuesday,
        status: 'Requested',
      }),
      previousWeek,
    ),
    'Not Completed',
  );
});

test('formats planner dates safely from date-only, ISO and invalid inputs', () => {
  assert.equal(formatPlannerDate('2026-07-20'), '20 Jul 2026');
  assert.equal(formatPlannerDate('2026-07-20T00:00:00.000Z'), '20 Jul 2026');
  assert.doesNotThrow(() => formatPlannerDate('not-a-date'));
  assert.equal(formatPlannerDate('not-a-date'), '-');
  assert.equal(formatPlannerDate(null), '-');
});

test('groups Monday by department and keeps completed planned items visible', () => {
  const weekBeginning = '2026-07-20';
  const items = [
    plannerItem({
      id: 1,
      department: 'Coating',
      activityType: 'New Training',
      actualDate: '2026-07-21',
    }),
    plannerItem({
      id: 2,
      department: 'Coating',
      activityType: 'Refresher',
      traineeName: 'Mina Shah',
    }),
    plannerItem({
      id: 3,
      department: 'Surfacing',
      activityType: 'Assessment',
      traineeName: 'Jamie Poe',
      process: 'Masking',
    }),
  ];

  const groups = buildLifecycleGroups(items, weekBeginning);
  const coating = groups.mondayDepartments.find(
    (group) => group.department === 'Coating',
  );
  const surfacing = groups.mondayDepartments.find(
    (group) => group.department === 'Surfacing',
  );

  assert.ok(coating);
  assert.ok(surfacing);
  assert.equal(coating.summary.totalCount, 2);
  assert.equal(coating.summary.completedCount, 1);
  assert.equal(
    coating.activityGroups.find((group) => group.activity === 'New Training')
      ?.items.length,
    1,
  );
  assert.equal(
    coating.activityGroups.find((group) => group.activity === 'Refresher')
      ?.items.length,
    1,
  );
  assert.equal(
    surfacing.activityGroups.find((group) => group.activity === 'Assessment')
      ?.items.length,
    1,
  );
});

test('handles API-shaped ISO datetime planner items through lifecycle grouping', () => {
  const items = [
    plannerItem({
      id: 1,
      weekCommencing: '2026-07-20T00:00:00.000Z',
      plannedDate: '2026-07-20T00:00:00.000Z',
      actualDate: '2026-07-20T00:00:00.000Z',
      department: 'Surfacing',
      activityType: 'New Training',
    }),
    plannerItem({
      id: 2,
      weekCommencing: '2026-07-20T00:00:00.000Z',
      plannedDate: '2026-07-21T00:00:00.000Z',
      actualDate: null,
      department: 'Surfacing',
      activityType: 'Assessment',
    }),
  ];

  const groups = buildLifecycleGroups(items, '2026-07-20');
  const surfacingMonday = groups.mondayDepartments.find(
    (group) => group.department === 'Surfacing',
  );
  const surfacingFriday = groups.fridayDepartments.find(
    (group) => group.department === 'Surfacing',
  );

  assert.ok(surfacingMonday);
  assert.ok(surfacingFriday);
  assert.equal(surfacingMonday.summary.totalCount, 2);
  assert.equal(surfacingMonday.summary.completedCount, 1);
  assert.equal(surfacingFriday.summary.plannedCount, 2);
  assert.equal(surfacingFriday.summary.completedCount, 1);
  assert.equal(formatPlannerDate(items[0].plannedDate), '20 Jul 2026');
});

test('Friday review uses total planned count and exception detail only', () => {
  const weekBeginning = '2026-07-20';
  const items = [
    plannerItem({
      id: 1,
      department: 'Surfacing',
      activityType: 'New Training',
      actualDate: '2026-07-21',
    }),
    plannerItem({
      id: 2,
      department: 'Surfacing',
      activityType: 'Assessment',
      status: 'Deferred',
      traineeName: 'Janusz Drozd',
      deviationReason: 'Due to staff absences',
    }),
    plannerItem({
      id: 3,
      department: 'Surfacing',
      activityType: 'Refresher',
      status: 'Carry Over',
      traineeName: 'Mohamed Abdul',
    }),
  ];

  const groups = buildLifecycleGroups(items, weekBeginning);
  const surfacing = groups.fridayDepartments.find(
    (group) => group.department === 'Surfacing',
  );

  assert.ok(surfacing);
  assert.equal(surfacing.summary.plannedCount, 3);
  assert.equal(surfacing.summary.completedCount, 1);
  assert.equal(surfacing.completedActivityCounts['New Training'], 1);
  assert.deepEqual(
    surfacing.exceptions.map((group) => group.label),
    ['Deferred', 'Carry Over'],
  );
  assert.deepEqual(
    surfacing.exceptions.flatMap((group) =>
      group.items.map((item) => item.traineeName),
    ),
    ['Janusz Drozd', 'Mohamed Abdul'],
  );
});

test('counts Total Planned and reconciles current-week outcomes', () => {
  const weekBeginning = dateKey(currentWeekBeginning());
  const plannedDate = dateKey(addDays(currentWeekBeginning(), 1));
  const items = [
    plannerItem({
      id: 1,
      plannedDate,
      actualDate: plannedDate,
      activityType: 'New Training',
    }),
    plannerItem({
      id: 2,
      plannedDate,
      status: 'Deferred',
      activityType: 'Assessment',
    }),
    plannerItem({
      id: 3,
      plannedDate,
      status: 'Carry Over',
      activityType: 'Refresher',
    }),
    plannerItem({
      id: 4,
      plannedDate,
      activityType: 'Pre-Assessment',
    }),
  ];

  const summary = buildWeeklyPlannerSummary(items, weekBeginning);

  assert.equal(summary.totalPlanned, 4);
  assert.equal(summary.completed, 1);
  assert.equal(summary.deferred, 1);
  assert.equal(summary.carryOver, 1);
  assert.equal(summary.outstanding, 1);
  assert.equal(
    summary.completed + summary.deferred + summary.carryOver + summary.outstanding,
    summary.totalPlanned,
  );
});

test('reconciles past-week unresolved activity as Not Completed', () => {
  const weekBeginning = dateKey(addDays(currentWeekBeginning(), -7));
  const plannedDate = dateKey(addDays(currentWeekBeginning(), -6));
  const items = [
    plannerItem({
      id: 1,
      plannedDate,
      actualDate: plannedDate,
      activityType: 'New Training',
    }),
    plannerItem({
      id: 2,
      plannedDate,
      status: 'Deferred',
      activityType: 'Assessment',
    }),
    plannerItem({
      id: 3,
      plannedDate,
      status: 'Carry Over',
      activityType: 'Refresher',
    }),
    plannerItem({
      id: 4,
      plannedDate,
      activityType: 'Pre-Assessment',
    }),
  ];

  const summary = buildWeeklyPlannerSummary(items, weekBeginning);

  assert.equal(summary.totalPlanned, 4);
  assert.equal(summary.notCompleted, 1);
  assert.equal(summary.outstanding, 0);
  assert.equal(
    summary.completed + summary.deferred + summary.carryOver + summary.notCompleted,
    summary.totalPlanned,
  );
});

test('rolls Machine Setter departments into Weekly Planner meeting departments', () => {
  assert.equal(
    getWeeklyPlannerMeetingDepartment('Machine Setter - Coating'),
    'Coating',
  );
  assert.equal(
    getWeeklyPlannerMeetingDepartment('Machine Setter - Production'),
    'Surfacing',
  );
  assert.equal(getWeeklyPlannerMeetingDepartment('Future Team'), 'Future Team');
});

test('rolls Coating and Surfacing department groups for Monday and Friday', () => {
  const weekBeginning = '2026-07-20';
  const items = [
    plannerItem({
      id: 1,
      department: 'Coating',
      activityType: 'Assessment',
      actualDate: '2026-07-21',
    }),
    plannerItem({
      id: 2,
      department: 'Machine Setter - Coating',
      activityType: 'Refresher',
      status: 'Deferred',
      deviationReason: 'Due to staff absences',
      traineeName: 'Janusz Drozd',
      process: 'WI012 - Syrus',
    }),
    plannerItem({
      id: 3,
      department: 'Surfacing',
      activityType: 'New Training',
    }),
    plannerItem({
      id: 4,
      department: 'Machine Setter - Production',
      activityType: 'Pre-Assessment',
    }),
  ];

  const groups = buildLifecycleGroups(items, weekBeginning);

  assert.deepEqual(
    groups.mondayDepartments.map((group) => group.department),
    ['Coating', 'Surfacing'],
  );
  assert.deepEqual(
    groups.fridayDepartments.map((group) => group.department),
    ['Coating', 'Surfacing'],
  );

  const coating = groups.mondayDepartments.find(
    (group) => group.department === 'Coating',
  );
  const surfacing = groups.mondayDepartments.find(
    (group) => group.department === 'Surfacing',
  );

  assert.ok(coating);
  assert.ok(surfacing);
  assert.equal(coating.summary.totalCount, 2);
  assert.equal(coating.summary.completedCount, 1);
  assert.equal(coating.summary.activityCounts.Assessment, 1);
  assert.equal(coating.summary.activityCounts.Refresher, 1);
  assert.equal(surfacing.summary.totalCount, 2);
  assert.equal(surfacing.summary.activityCounts['New Training'], 1);
  assert.equal(surfacing.summary.activityCounts['Pre-Assessment'], 1);

  const coatingFriday = groups.fridayDepartments.find(
    (group) => group.department === 'Coating',
  );

  assert.ok(coatingFriday);
  assert.equal(coatingFriday.summary.plannedCount, 2);
  assert.equal(coatingFriday.summary.completedCount, 1);
  assert.equal(coatingFriday.summary.deferredCount, 1);
  assert.equal(coatingFriday.completedActivityCounts.Assessment, 1);
  assert.equal(coatingFriday.exceptions[0].items[0].traineeName, 'Janusz Drozd');
  assert.equal(coatingFriday.exceptions[0].items[0].process, 'WI012 - Syrus');
  assert.equal(
    coatingFriday.exceptions[0].items[0].deviationReason,
    'Due to staff absences',
  );
});

test('roll-up filtering includes raw Machine Setter departments without mutation', () => {
  const items = [
    plannerItem({ id: 1, department: 'Coating' }),
    plannerItem({ id: 2, department: 'Machine Setter - Coating' }),
    plannerItem({ id: 3, department: 'Surfacing' }),
    plannerItem({ id: 4, department: 'Machine Setter - Production' }),
  ];
  const coatingItems = items.filter(
    (item) => getWeeklyPlannerMeetingDepartment(item.department) === 'Coating',
  );
  const surfacingItems = items.filter(
    (item) => getWeeklyPlannerMeetingDepartment(item.department) === 'Surfacing',
  );

  assert.deepEqual(
    coatingItems.map((item) => item.department),
    ['Coating', 'Machine Setter - Coating'],
  );
  assert.deepEqual(
    surfacingItems.map((item) => item.department),
    ['Surfacing', 'Machine Setter - Production'],
  );
  assert.deepEqual(
    items.map((item) => item.department),
    [
      'Coating',
      'Machine Setter - Coating',
      'Surfacing',
      'Machine Setter - Production',
    ],
  );
});

test('deduplicates logical duplicates while preserving distinct activity types', () => {
  const weekBeginning = '2026-07-20';
  const items = [
    plannerItem({
      id: -1,
      traineeProcessId: 42,
      activityType: 'Assessment',
      plannedDate: '2026-07-21',
      status: 'Planned',
    }),
    plannerItem({
      id: 10,
      traineeProcessId: 42,
      activityType: 'Assessment',
      plannedDate: '2026-07-21T00:00:00.000Z',
      status: 'Deferred',
    }),
    plannerItem({
      id: -2,
      traineeProcessId: 42,
      activityType: 'New Training',
      plannedDate: '2026-07-21',
      status: 'Planned',
    }),
  ];

  const deduped = dedupeWeeklyPlannerItems(items);
  const summary = buildWeeklyPlannerSummary(items, weekBeginning);

  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].id, 10);
  assert.equal(summary.totalPlanned, 2);
  assert.equal(summary.deferred, 1);
  assert.equal(summary.outstanding, 1);
});

test('Weekly Planner client has defensive array guards for grouped render data', () => {
  const clientSource = readFileSync(
    'src/app/weekly-planner/weekly-planner-client.tsx',
    'utf8',
  );

  assert.match(clientSource, /mondayDepartments = lifecycleGroups\?\.mondayDepartments \?\? \[\]/);
  assert.match(clientSource, /fridayDepartments = lifecycleGroups\?\.fridayDepartments \?\? \[\]/);
  assert.match(clientSource, /activityGroups = departmentGroup\.activityGroups \?\? \[\]/);
  assert.match(clientSource, /exceptions = departmentGroup\.exceptions \?\? \[\]/);
  assert.match(clientSource, /exceptionItems = group\.items \?\? \[\]/);
});

test('Weekly Planner client exposes two primary sections and no manual Friday controls', () => {
  const clientSource = readFileSync(
    'src/app/weekly-planner/weekly-planner-client.tsx',
    'utf8',
  );

  assert.equal((clientSource.match(/<h3/g) ?? []).length, 2);
  assert.match(clientSource, /Monday Planning/);
  assert.match(clientSource, /Friday Review/);
  assert.doesNotMatch(clientSource, /During-week Progress/);
  assert.doesNotMatch(clientSource, /Save Friday Review/);
  assert.doesNotMatch(clientSource, /Select outcome/);
  assert.doesNotMatch(clientSource, /status dropdown/i);
  assert.doesNotMatch(clientSource, /pending review/i);
});

test('Friday Review keeps outcome metrics in distinct visual cells', () => {
  const clientSource = readFileSync(
    'src/app/weekly-planner/weekly-planner-client.tsx',
    'utf8',
  );

  assert.match(clientSource, /const fridayMetricConfigs/);
  assert.match(clientSource, /label: 'Total Planned'/);
  assert.match(clientSource, /label: 'Completed'/);
  assert.match(clientSource, /label: 'Deferred'/);
  assert.match(clientSource, /label: 'Carry Over'/);
  assert.match(clientSource, /label: 'Not Completed'/);
  assert.match(clientSource, /fridayMetricConfigs\.map/);
  assert.match(clientSource, /border-l border-slate-200/);
});
