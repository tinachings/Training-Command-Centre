'use client';

import { useEffect, useMemo, useState } from 'react';

type WeeklyPlannerItem = {
  id: number;
  weekCommencing: string;
  plannedDate: string;
  department: string;
  traineeName: string;
  process: string;
  activityType: string;
  owner: string | null;
  status: string;
  actualDate: string | null;
  deviationReason: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
  traineeProcessId: number | null;
};

const supportedActivityTypes = [
  'New Training',
  'Pre-Assessment',
  'Assessment',
  'Refresher',
];

type GroupedRefresherDate = {
  dateKey: string;
  colleagues: {
    traineeName: string;
    items: WeeklyPlannerItem[];
  }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const daysFromMonday = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function groupRefresherPlanningItems(items: WeeklyPlannerItem[]) {
  const dateGroups = new Map<
    string,
    Map<string, WeeklyPlannerItem[]>
  >();

  items.forEach((item) => {
    const dateKey = item.plannedDate.slice(0, 10);
    const colleagueGroups = dateGroups.get(dateKey) ?? new Map();
    const colleagueItems = colleagueGroups.get(item.traineeName) ?? [];

    colleagueItems.push(item);
    colleagueGroups.set(item.traineeName, colleagueItems);
    dateGroups.set(dateKey, colleagueGroups);
  });

  return Array.from(dateGroups.entries()).map(
    ([dateKey, colleagueGroups]): GroupedRefresherDate => ({
      dateKey,
      colleagues: Array.from(colleagueGroups.entries()).map(
        ([traineeName, colleagueItems]) => ({
          traineeName,
          items: [...colleagueItems].sort((left, right) =>
            left.process.localeCompare(right.process),
          ),
        }),
      ),
    }),
  );
}

export default function WeeklyPlannerPage() {
  const [plannerItems, setPlannerItems] = useState<WeeklyPlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekBeginning, setWeekBeginning] = useState(() =>
    toDateInputValue(getMonday(new Date())),
  );
  const [department, setDepartment] = useState('All');
  const [activityType, setActivityType] = useState('All');
  const [status, setStatus] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function loadPlanner() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ weekBeginning });
        const response = await fetch(`/api/weekly-planner?${params}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load weekly planner.');
        }

        const data = (await response.json()) as WeeklyPlannerItem[];
        if (!cancelled) {
          setPlannerItems(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load weekly planner.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlanner();

    return () => {
      cancelled = true;
    };
  }, [weekBeginning]);

  const filtered = useMemo(
    () =>
      plannerItems.filter(
        (item) =>
          (department === 'All' || item.department === department) &&
          (activityType === 'All' || item.activityType === activityType) &&
          (status === 'All' || item.status === status),
      ),
    [department, activityType, status, plannerItems],
  );

  const summary = {
    planned: filtered.filter((item) => item.status === 'Planned').length,
    completed: filtered.filter((item) => item.status === 'Completed').length,
    deferred: filtered.filter((item) => item.status === 'Deferred').length,
    notCompleted: filtered.filter((item) => item.status === 'Not Completed')
      .length,
    carryOver: filtered.filter((item) => item.status === 'Carry Over').length,
  };

  const departments = Array.from(
    new Set(plannerItems.map((item) => item.department)),
  );
  const activityTypes = Array.from(
    new Set([...supportedActivityTypes, ...plannerItems.map((item) => item.activityType)]),
  );
  const statuses = Array.from(new Set(plannerItems.map((item) => item.status)));
  const mondayPlanningGroups = supportedActivityTypes.map((activity) => ({
    activity,
    items: filtered.filter((item) => item.activityType === activity),
  }));

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Weekly Planner</h2>
        <p className="mt-2 text-slate-600">
          Track planned training activity, completion status and follow-up
          requirements for the week.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Planned', summary.planned],
          ['Completed', summary.completed],
          ['Deferred', summary.deferred],
          ['Not Completed', summary.notCompleted],
          ['Carry Over', summary.carryOver],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Week Beginning
          </span>
          <input
            className="w-full rounded-xl border border-slate-200 p-3"
            type="date"
            value={weekBeginning}
            onChange={(event) => setWeekBeginning(event.target.value)}
          />
        </label>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option>All</option>
          {departments.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={activityType}
          onChange={(event) => setActivityType(event.target.value)}
        >
          <option>All</option>
          {activityTypes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option>All</option>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading weekly planner...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold">Monday Planning</h3>
          <p className="mt-2 text-sm text-slate-600">
            Activities planned this week, pre-assessments due, assessments due
            and follow-ups due are reviewed first thing Monday.
          </p>
          <div className="mt-4 space-y-4">
            {mondayPlanningGroups.map((group) => (
              <section key={group.activity}>
                <h4 className="text-sm font-semibold text-slate-700">
                  {group.activity}
                </h4>
                {group.items.length ? (
                  group.activity === 'Refresher' ? (
                    <div className="mt-2 space-y-2 text-sm text-slate-600">
                      {groupRefresherPlanningItems(group.items).map(
                        (dateGroup) => (
                          <div
                            key={dateGroup.dateKey}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5"
                          >
                            <p className="font-medium text-slate-900">
                              {formatDate(dateGroup.dateKey)}
                            </p>
                            <div className="mt-1.5 space-y-2">
                              {dateGroup.colleagues.map((colleagueGroup) => (
                                <div key={colleagueGroup.traineeName}>
                                  <p className="font-bold text-slate-800">
                                    {colleagueGroup.traineeName}
                                  </p>
                                  <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                                    {colleagueGroup.items.map((item) => (
                                      <li key={item.id}>{item.process}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <span className="font-medium text-slate-900">
                            {formatDate(item.plannedDate)}
                          </span>
                          <span className="text-slate-500">
                            {' '}
                            &ndash;{' '}
                            {item.traineeName}
                            {' '}
                            &ndash;{' '}
                            {item.process}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No planned items.
                  </p>
                )}
              </section>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold">Friday Review</h3>
          <p className="mt-2 text-sm text-slate-600">
            Completion percentage, deferred work, carry-over items and
            next-week actions are captured on Friday review.
          </p>
        </article>
      </div>
    </div>
  );
}
