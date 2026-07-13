'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

type FridayReviewGroup = {
  activity: string;
  dates: {
    dateKey: string;
    colleagues: {
      traineeName: string;
      items: WeeklyPlannerItem[];
    }[];
  }[];
};

type SummaryStatus =
  | 'planned'
  | 'completed'
  | 'deferred'
  | 'notCompleted'
  | 'carryOver';

type ReviewStatus = 'Completed' | 'Deferred' | 'Not Completed' | 'Carry Over';

type PendingReview = {
  status: ReviewStatus | '';
  deviationReason: string;
};

const finalReviewStatuses = new Set<string>([
  'Completed',
  'Deferred',
  'Not Completed',
  'Carry Over',
]);

const reviewStatuses: ReviewStatus[] = [
  'Completed',
  'Deferred',
  'Not Completed',
  'Carry Over',
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function plannerDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const [, year, month, day] = match;

    return `${year}-${month}-${day}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

function summaryStatus(item: WeeklyPlannerItem): SummaryStatus {
  if (item.actualDate) {
    return 'completed';
  }

  if (item.status === 'Completed') {
    return 'completed';
  }

  if (item.status === 'Deferred') {
    return 'deferred';
  }

  if (item.status === 'Not Completed') {
    return 'notCompleted';
  }

  if (item.status === 'Carry Over') {
    return 'carryOver';
  }

  return 'planned';
}

function isReviewStatus(status: string): status is ReviewStatus {
  return reviewStatuses.includes(status as ReviewStatus);
}

function requiresDeviationReason(status: ReviewStatus | '') {
  return (
    status === 'Deferred' ||
    status === 'Not Completed' ||
    status === 'Carry Over'
  );
}

function groupRefresherPlanningItems(items: WeeklyPlannerItem[]) {
  const dateGroups = new Map<
    string,
    Map<string, WeeklyPlannerItem[]>
  >();

  items.forEach((item) => {
    const dateKey = plannerDateKey(item.plannedDate);
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

function groupFridayReviewItems(items: WeeklyPlannerItem[]) {
  const activityGroups = new Map<
    string,
    Map<string, Map<string, WeeklyPlannerItem[]>>
  >();

  items.forEach((item) => {
    const dateKey = plannerDateKey(item.plannedDate);
    const dateGroups =
      activityGroups.get(item.activityType) ??
      new Map<string, Map<string, WeeklyPlannerItem[]>>();
    const colleagueGroups =
      dateGroups.get(dateKey) ?? new Map<string, WeeklyPlannerItem[]>();
    const colleagueItems = colleagueGroups.get(item.traineeName) ?? [];

    colleagueItems.push(item);
    colleagueGroups.set(item.traineeName, colleagueItems);
    dateGroups.set(dateKey, colleagueGroups);
    activityGroups.set(item.activityType, dateGroups);
  });

  const activityOrder = [
    ...supportedActivityTypes,
    ...Array.from(activityGroups.keys()).filter(
      (activity) => !supportedActivityTypes.includes(activity),
    ),
  ];

  return activityOrder
    .filter((activity) => activityGroups.has(activity))
    .map((activity): FridayReviewGroup => {
      const dateGroups =
        activityGroups.get(activity) ??
        new Map<string, Map<string, WeeklyPlannerItem[]>>();

      return {
        activity,
        dates: Array.from(dateGroups.entries()).map(
          ([dateKey, colleagueGroups]) => ({
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
        ),
      };
    });
}

export default function WeeklyPlannerPage() {
  const [plannerItems, setPlannerItems] = useState<WeeklyPlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<
    Record<number, PendingReview>
  >({});
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

        const data = (await response.json()) as WeeklyPlannerItem[];
        if (!options?.cancelled?.()) {
          setPlannerItems(data);
        }
      } catch {
        if (!options?.cancelled?.()) {
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

  async function saveFridayReview() {
    const changedReviews = fridayReviewItems
      .map((item) => ({
        item,
        review: pendingReviews[item.id],
      }))
      .filter(
        (
          value,
        ): value is {
          item: WeeklyPlannerItem;
          review: PendingReview & { status: ReviewStatus };
        } => Boolean(value.review?.status),
      );

    if (!changedReviews.length) {
      return;
    }

    const missingDeviationReason = changedReviews.some(({ review }) =>
      requiresDeviationReason(review.status) && !review.deviationReason.trim(),
    );

    if (missingDeviationReason) {
      setReviewError(
        'Deviation reason is required for Deferred, Not Completed and Carry Over outcomes.',
      );
      return;
    }

    setReviewError('');
    setSavingReview(true);

    try {
      for (const { item, review } of changedReviews) {
        const deviationReason = review.deviationReason.trim();
        const response = await fetch('/api/weekly-planner', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: item.id,
            status: review.status,
            actualDate:
              review.status === 'Completed'
                ? toDateInputValue(new Date())
                : undefined,
            deviationReason:
              requiresDeviationReason(review.status)
                ? deviationReason || undefined
                : undefined,
            weekCommencing: item.weekCommencing,
            plannedDate: item.plannedDate,
            department: item.department,
            traineeName: item.traineeName,
            process: item.process,
            activityType: item.activityType,
            owner: item.owner,
            traineeProcessId: item.traineeProcessId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update planner item.');
        }
      }

      await loadPlanner();
      setPendingReviews({});
    } catch {
      setReviewError('Failed to save Friday Review.');
    } finally {
      setSavingReview(false);
    }
  }

  const filtered = useMemo(
    () =>
      plannerItems.filter(
        (item) =>
          (department === 'All' || item.department === department) &&
          (activityType === 'All' || item.activityType === activityType),
      ),
    [department, activityType, plannerItems],
  );

  const summary = filtered.reduce<Record<SummaryStatus, number>>(
    (counts, item) => {
      const status = summaryStatus(item);

      return {
        ...counts,
        [status]: counts[status] + 1,
      };
    },
    {
      planned: 0,
      completed: 0,
      deferred: 0,
      notCompleted: 0,
      carryOver: 0,
    },
  );

  const departments = Array.from(
    new Set(plannerItems.map((item) => item.department)),
  );
  const activityTypes = Array.from(
    new Set([...supportedActivityTypes, ...plannerItems.map((item) => item.activityType)]),
  );
  const mondayPlanningItems = filtered.filter(
    (item) => !finalReviewStatuses.has(item.status),
  );
  const fridayReviewItems = filtered;
  const mondayPlanningGroups = supportedActivityTypes.map((activity) => ({
    activity,
    items: mondayPlanningItems.filter((item) => item.activityType === activity),
  }));
  const fridayReviewGroups = useMemo(
    () => groupFridayReviewItems(fridayReviewItems),
    [fridayReviewItems],
  );
  const pendingReviewCount = Object.values(pendingReviews).filter(
    (review) => review.status,
  ).length;

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
          {reviewError ? (
            <p className="mt-3 text-sm text-red-600">{reviewError}</p>
          ) : null}
          <div className="mt-4 space-y-4">
            {fridayReviewGroups.length ? (
              fridayReviewGroups.map((activityGroup) => (
                <section key={activityGroup.activity}>
                  <h4 className="text-sm font-semibold text-slate-700">
                    {activityGroup.activity}
                  </h4>
                  <div className="mt-2 space-y-2">
                    {activityGroup.dates.map((dateGroup) => (
                      <div key={dateGroup.dateKey}>
                        <p className="text-sm font-medium text-slate-900">
                          {formatDate(dateGroup.dateKey)}
                        </p>
                        <div className="mt-1.5 space-y-2">
                          {dateGroup.colleagues.map((colleagueGroup) => (
                            <section
                              key={colleagueGroup.traineeName}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                            >
                              <p className="text-sm font-bold text-slate-800">
                                {colleagueGroup.traineeName}
                              </p>
                              <div className="mt-1.5 divide-y divide-slate-100">
                                {colleagueGroup.items.map((item) => {
                                  const savedStatus = isReviewStatus(
                                    item.status,
                                  )
                                    ? item.status
                                    : '';
                                  const pendingReview = pendingReviews[item.id];
                                  const selectedStatus =
                                    pendingReview?.status ?? savedStatus;
                                  const selectedDeviationReason =
                                    pendingReview?.deviationReason ??
                                    item.deviationReason ??
                                    '';
                                  const showDeviationReason =
                                    requiresDeviationReason(selectedStatus);
                                  const isPending = Boolean(pendingReview);

                                  return (
                                    <div
                                      key={item.id}
                                      className="grid gap-2 py-2 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-700">
                                          {item.process}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Saved: {item.status}
                                          {isPending ? ' | Pending change' : ''}
                                        </p>
                                      </div>
                                      <select
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                                        value={selectedStatus}
                                        disabled={savingReview}
                                        onChange={(event) => {
                                          const nextStatus = event.target
                                            .value as ReviewStatus | '';

                                          if (!nextStatus) {
                                            setPendingReviews((current) => {
                                              const next = { ...current };
                                              delete next[item.id];
                                              return next;
                                            });
                                            return;
                                          }

                                          const nextDeviationReason =
                                            requiresDeviationReason(nextStatus)
                                              ? selectedDeviationReason
                                              : '';

                                          setPendingReviews((current) => {
                                            const next = { ...current };

                                            if (
                                              nextStatus === savedStatus &&
                                              nextDeviationReason ===
                                                (item.deviationReason ?? '')
                                            ) {
                                              delete next[item.id];
                                              return next;
                                            }

                                            next[item.id] = {
                                              status: nextStatus,
                                              deviationReason:
                                                nextDeviationReason,
                                            };

                                            return next;
                                          });
                                        }}
                                      >
                                        <option value="" disabled>
                                          Select outcome
                                        </option>
                                        {reviewStatuses.map((reviewStatus) => (
                                          <option
                                            key={reviewStatus}
                                            value={reviewStatus}
                                          >
                                            {reviewStatus}
                                          </option>
                                        ))}
                                      </select>
                                      {showDeviationReason ? (
                                        <input
                                          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm md:col-span-2"
                                          type="text"
                                          value={selectedDeviationReason}
                                          disabled={savingReview}
                                          onChange={(event) => {
                                            const nextDeviationReason =
                                              event.target.value;

                                            setPendingReviews((current) => {
                                              const next = { ...current };

                                              if (
                                                selectedStatus === savedStatus &&
                                                nextDeviationReason ===
                                                  (item.deviationReason ?? '')
                                              ) {
                                                delete next[item.id];
                                                return next;
                                              }

                                              next[item.id] = {
                                                status: selectedStatus,
                                                deviationReason:
                                                  nextDeviationReason,
                                              };

                                              return next;
                                            });
                                          }}
                                          placeholder="Deviation reason"
                                        />
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No items match the current filters.
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="button"
              disabled={savingReview || pendingReviewCount === 0}
              onClick={() => void saveFridayReview()}
            >
              {savingReview
                ? 'Saving...'
                : `Save Friday Review${
                    pendingReviewCount ? ` (${pendingReviewCount})` : ''
                  }`}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
