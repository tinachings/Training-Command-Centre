'use client';

import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildLifecycleGroups,
  buildWeeklyPlannerSummary,
  deriveWeeklyPlannerStatus,
  getWeeklyPlannerMeetingDepartment,
  type WeeklyPlannerItem,
} from '@/lib/weekly-planner';

const supportedActivityTypes = [
  'New Training',
  'Pre-Assessment',
  'Assessment',
  'Refresher',
];

type PlannerMetricTone = 'blue' | 'green' | 'amber' | 'sky' | 'rose';

type PlannerMetricConfig = {
  key: string;
  label: string;
  Icon: LucideIcon;
  tone: PlannerMetricTone;
};

const metricToneClasses: Record<
  PlannerMetricTone,
  {
    card: string;
    icon: string;
    text: string;
    metricCell: string;
  }
> = {
  blue: {
    card: 'border-blue-100 bg-blue-50/70',
    icon: 'bg-blue-100 text-blue-700',
    text: 'text-blue-900',
    metricCell: 'text-blue-800',
  },
  green: {
    card: 'border-emerald-100 bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-900',
    metricCell: 'text-emerald-800',
  },
  amber: {
    card: 'border-amber-100 bg-amber-50/70',
    icon: 'bg-amber-100 text-amber-700',
    text: 'text-amber-900',
    metricCell: 'text-amber-800',
  },
  sky: {
    card: 'border-sky-100 bg-sky-50/70',
    icon: 'bg-sky-100 text-sky-700',
    text: 'text-sky-900',
    metricCell: 'text-sky-800',
  },
  rose: {
    card: 'border-rose-100 bg-rose-50/70',
    icon: 'bg-rose-100 text-rose-700',
    text: 'text-rose-900',
    metricCell: 'text-rose-800',
  },
};

const summaryMetricConfigs: PlannerMetricConfig[] = [
  {
    key: 'totalPlanned',
    label: 'Total Planned',
    Icon: CalendarDays,
    tone: 'blue',
  },
  {
    key: 'completed',
    label: 'Completed',
    Icon: CheckCircle2,
    tone: 'green',
  },
  {
    key: 'deferred',
    label: 'Deferred',
    Icon: Clock3,
    tone: 'amber',
  },
  {
    key: 'carryOver',
    label: 'Carry Over',
    Icon: RefreshCw,
    tone: 'sky',
  },
  {
    key: 'outstanding',
    label: 'Outstanding / Not Completed',
    Icon: Ban,
    tone: 'rose',
  },
];

const fridayMetricConfigs: PlannerMetricConfig[] = [
  {
    key: 'plannedCount',
    label: 'Total Planned',
    Icon: CalendarDays,
    tone: 'blue',
  },
  {
    key: 'completedCount',
    label: 'Completed',
    Icon: CheckCircle2,
    tone: 'green',
  },
  {
    key: 'deferredCount',
    label: 'Deferred',
    Icon: Clock3,
    tone: 'amber',
  },
  {
    key: 'carryOverCount',
    label: 'Carry Over',
    Icon: RefreshCw,
    tone: 'sky',
  },
  {
    key: 'notCompletedCount',
    label: 'Not Completed',
    Icon: Ban,
    tone: 'rose',
  },
];

export function formatPlannerDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const text = String(value).trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  let date: Date;

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  } else {
    const parsedDate = new Date(text);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    date = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
      ),
    );
  }

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
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

function selectedWeekIsPast(weekBeginning: string) {
  const selectedWeekStart = new Date(`${weekBeginning}T00:00:00Z`);
  const selectedWeekEnd = new Date(selectedWeekStart);
  selectedWeekEnd.setUTCDate(selectedWeekEnd.getUTCDate() + 7);

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  return selectedWeekEnd <= todayUtc;
}

function statusBadgeClasses(status: string) {
  switch (status) {
    case 'Completed':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'Deferred':
      return 'border-amber-300 bg-amber-50 text-amber-800';
    case 'Carry Over':
      return 'border-sky-300 bg-sky-50 text-sky-800';
    case 'Not Completed':
      return 'border-rose-300 bg-rose-50 text-rose-800';
    default:
      return 'border-slate-400 bg-white text-slate-950 shadow-sm';
  }
}

function itemContainerClasses(status: string) {
  if (status === 'Completed') {
    return 'border-slate-200 bg-slate-50';
  }

  if (status === 'Not Completed') {
    return 'border-rose-200 bg-rose-50';
  }

  return 'border-slate-200 bg-white';
}

function activitySummaryLabel(activity: string, count: number) {
  if (activity === 'Assessment') {
    return `${count} ${count === 1 ? 'Assessment' : 'Assessments'}`;
  }

  if (activity === 'Refresher') {
    return `${count} ${count === 1 ? 'Refresher' : 'Refreshers'}`;
  }

  return `${count} ${activity}`;
}

function shouldShowReason(status: string, reason: string | null) {
  return Boolean(
    reason &&
      (status === 'Deferred' ||
        status === 'Carry Over' ||
        status === 'Not Completed'),
  );
}

function fridayMetricValue(
  summary: {
    plannedCount: number;
    completedCount: number;
    deferredCount: number;
    carryOverCount: number;
    outstandingCount: number;
    notCompletedCount: number;
  },
  key: string,
  isPastWeek: boolean,
) {
  if (key === 'notCompletedCount') {
    return isPastWeek ? summary.notCompletedCount : summary.outstandingCount;
  }

  return summary[key as keyof typeof summary];
}

function completedBreakdownParts(
  completedActivityCounts: Record<string, number>,
) {
  return supportedActivityTypes
    .map((activity) => {
      const count = completedActivityCounts[activity] ?? 0;

      return count > 0 ? activitySummaryLabel(activity, count) : null;
    })
    .filter(Boolean);
}

function summaryMetricValue(
  summary: {
    totalPlanned: number;
    completed: number;
    deferred: number;
    carryOver: number;
    outstanding: number;
    notCompleted: number;
  },
  key: string,
  outstandingCount: number,
) {
  if (key === 'outstanding') {
    return outstandingCount;
  }

  return summary[key as keyof typeof summary];
}

function exceptionBlockClasses(label: string) {
  switch (label) {
    case 'Deferred':
      return {
        heading: 'text-amber-800',
        card: 'border-amber-200 bg-amber-50/70',
      };
    case 'Carry Over':
      return {
        heading: 'text-sky-800',
        card: 'border-sky-200 bg-sky-50/70',
      };
    case 'Not Completed':
      return {
        heading: 'text-rose-800',
        card: 'border-rose-200 bg-rose-50/70',
      };
    default:
      return {
        heading: 'text-slate-800',
        card: 'border-slate-200 bg-slate-50',
      };
  }
}

export default function WeeklyPlannerClient() {
  const [plannerItems, setPlannerItems] = useState<WeeklyPlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekBeginning, setWeekBeginning] = useState(() =>
    toDateInputValue(getMonday(new Date())),
  );
  const [department, setDepartment] = useState('All');
  const [activityType, setActivityType] = useState('All');

  const loadPlanner = useCallback(
    async (options?: { cancelled?: () => boolean }) => {
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

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Weekly planner response was not an array.');
        }

        if (!options?.cancelled?.()) {
          setPlannerItems(data as WeeklyPlannerItem[]);
        }
      } catch {
        if (!options?.cancelled?.()) {
          setPlannerItems([]);
          setError('Failed to load weekly planner.');
        }
      } finally {
        if (!options?.cancelled?.()) {
          setLoading(false);
        }
      }
    },
    [weekBeginning],
  );

  useEffect(() => {
    let cancelled = false;

    void loadPlanner({ cancelled: () => cancelled });

    return () => {
      cancelled = true;
    };
  }, [loadPlanner]);

  const filtered = useMemo(
    () =>
      plannerItems.filter(
        (item) =>
          (department === 'All' ||
            getWeeklyPlannerMeetingDepartment(item.department) === department) &&
          (activityType === 'All' || item.activityType === activityType),
      ),
    [department, activityType, plannerItems],
  );

  const summary = useMemo(
    () => buildWeeklyPlannerSummary(filtered, weekBeginning),
    [filtered, weekBeginning],
  );

  const departments = ['Surfacing', 'Coating'];
  const activityTypes = Array.from(
    new Set([
      ...supportedActivityTypes,
      ...plannerItems.map((item) => item.activityType),
    ]),
  );

  const lifecycleGroups = useMemo(
    () => buildLifecycleGroups(filtered, weekBeginning),
    [filtered, weekBeginning],
  );
  const mondayDepartments = lifecycleGroups?.mondayDepartments ?? [];
  const fridayDepartments = lifecycleGroups?.fridayDepartments ?? [];

  const isPastWeek = selectedWeekIsPast(weekBeginning);
  const outstandingCount = isPastWeek
    ? summary.notCompleted
    : summary.outstanding;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Weekly Planner</h2>
        <p className="mt-2 text-slate-600">
          Planned activities for the week with live progress.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {summaryMetricConfigs.map(({ key, label, Icon, tone }) => {
          const classes = metricToneClasses[tone];
          const value = summaryMetricValue(summary, key, outstandingCount);

          return (
          <article
            key={label}
            className={`rounded-2xl border p-4 shadow-sm ${classes.card}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`mt-1 text-3xl font-semibold ${classes.text}`}>
                  {value}
                </p>
              </div>
            </div>
          </article>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
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
          aria-label="Department"
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
          aria-label="Activity Type"
          className="rounded-xl border border-slate-200 p-3"
          value={activityType}
          onChange={(event) => setActivityType(event.target.value)}
        >
          <option>All</option>
          {activityTypes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading weekly planner...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold">Monday Planning</h3>
          <p className="mt-2 text-sm text-slate-600">
            Planned activities for the week with live progress.
          </p>
          <div className="mt-4 space-y-4">
            {mondayDepartments.length ? (
              mondayDepartments.map((departmentGroup) => {
                const activityGroups = departmentGroup.activityGroups ?? [];

                return (
                <section
                  key={departmentGroup.department}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-base font-semibold uppercase tracking-wide text-slate-800">
                      {departmentGroup.department}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {supportedActivityTypes
                        .map((name) =>
                          activitySummaryLabel(
                            name,
                            departmentGroup.summary.activityCounts[name] ?? 0,
                          ),
                        )
                        .join(' | ')}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Progress: {departmentGroup.summary.completedCount} of{' '}
                    {departmentGroup.summary.totalCount} completed
                  </p>
                  <div className="mt-4 space-y-3">
                    {supportedActivityTypes.map((activityTypeName) => {
                      const activityGroup = activityGroups.find(
                        (group) => group.activity === activityTypeName,
                      );
                      const activityItems = activityGroup?.items ?? [];
                      if (activityItems.length === 0) {
                        return null;
                      }

                      return (
                        <div key={activityTypeName}>
                          <h5 className="text-sm font-semibold text-slate-700">
                            {activityTypeName}
                          </h5>
                          <div className="mt-2 space-y-2">
                            {activityItems.map((item) => {
                              const status = deriveWeeklyPlannerStatus(
                                item,
                                weekBeginning,
                              );

                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border p-3 ${itemContainerClasses(status)}`}
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">
                                        {item.traineeName}
                                      </p>
                                      <p className="text-sm text-slate-600">
                                        {item.process}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {formatPlannerDate(item.plannedDate)}
                                      </p>
                                    </div>
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClasses(status)}`}
                                    >
                                      {status}
                                    </span>
                                  </div>
                                  {shouldShowReason(
                                    status,
                                    item.deviationReason,
                                  ) ? (
                                    <p className="mt-2 text-xs text-slate-500">
                                      Reason: {item.deviationReason}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No planned items.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold">Friday Review</h3>
          <p className="mt-2 text-sm text-slate-600">
            Automatic weekly outcome summary.
          </p>
          <div className="mt-4 space-y-4">
            {fridayDepartments.length ? (
              fridayDepartments.map((departmentGroup) => {
                const exceptions = departmentGroup.exceptions ?? [];
                const completedBreakdown = completedBreakdownParts(
                  departmentGroup.completedActivityCounts,
                );

                return (
                  <section
                    key={departmentGroup.department}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <h4 className="text-base font-semibold uppercase tracking-wide text-slate-800">
                      {departmentGroup.department}
                    </h4>

                    <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:grid-cols-5">
                      {fridayMetricConfigs.map(({ key, label, Icon, tone }, index) => {
                        const classes = metricToneClasses[tone];
                        const value = fridayMetricValue(
                          departmentGroup.summary,
                          key,
                          isPastWeek,
                        );

                        return (
                          <div
                            key={key}
                            className={`flex min-h-24 flex-col items-center justify-center gap-1 px-3 py-3 text-center ${
                              index === 0 ? '' : 'border-l border-slate-200'
                            } ${index >= 2 ? 'max-sm:border-t' : ''}`}
                          >
                            <Icon
                              aria-hidden="true"
                              className={classes.metricCell}
                              size={18}
                              strokeWidth={2.2}
                            />
                            <p className={`text-2xl font-semibold ${classes.text}`}>
                              {value}
                            </p>
                            <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-slate-500">
                              {label}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <div>
                          {completedBreakdown.length ? (
                            <>
                              <h5 className="text-sm font-semibold text-emerald-800">
                                Completed
                              </h5>
                              <p className="mt-2 text-sm text-slate-700">
                                {completedBreakdown.join(' | ')}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500">
                              No completed activity
                            </p>
                          )}
                        </div>

                        {exceptions.length ? (
                          <div className="space-y-3 border-slate-200 lg:border-l lg:pl-4">
                            {exceptions.map((group) => {
                              const exceptionItems = group.items ?? [];
                              const classes = exceptionBlockClasses(group.label);

                              return (
                                <div key={group.label}>
                                  <h5
                                    className={`text-sm font-semibold ${classes.heading}`}
                                  >
                                    {group.label}
                                  </h5>
                                  <div className="mt-2 space-y-2">
                                    {exceptionItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className={`rounded-lg border p-3 ${classes.card}`}
                                      >
                                        <p className="text-sm font-medium text-slate-800">
                                          {item.traineeName} - {item.process}
                                        </p>
                                        {item.deviationReason ? (
                                          <p className="mt-1 text-xs text-slate-600">
                                            Reason: {item.deviationReason}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No planned items.
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
