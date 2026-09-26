'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  buildRefresherDashboardGroups,
  calculateRefresherSummary,
  countCompletedThisMonth,
  filterRefreshersForDashboard,
  getRefresherMeetingDepartment,
  getRefresherSchedulingDisplay,
  type RefresherDashboardRecord,
  type RefresherSummary,
  type RefresherSchedulingDisplay,
} from '@/lib/refresher-dashboard';

type RefresherRecord = RefresherDashboardRecord;

type RefresherCompletionHistoryItem = {
  traineeProcessId: number;
  traineeId: number;
  traineeName: string;
  department: string;
  process: string;
  completedDate: string;
  outcome: string | null;
  assessor: string | null;
};

type RefresherCompletionHistoryResponse = {
  month: string;
  total: number;
  departmentCounts: Record<string, number>;
  completions: RefresherCompletionHistoryItem[];
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);

  if (!year || !month) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.slice(0, 10).split('-').map(Number);

  if (!year || !month || !day) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function validAssessor(value: string | null) {
  const assessor = value?.trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : '';
}

function formatAssessor(value: string | null) {
  return validAssessor(value) || 'Not Assigned';
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function refresherStatusClass(status: string) {
  switch (status) {
    case 'Overdue':
      return 'bg-rose-50 text-rose-700 ring-rose-100';
    case 'Due This Month':
      return 'bg-amber-50 text-amber-700 ring-amber-100';
    case 'Due Next Month':
      return 'bg-sky-50 text-sky-700 ring-sky-100';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    case 'Not Due Yet':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

function scheduleStatusClass(tone: RefresherSchedulingDisplay['tone']) {
  switch (tone) {
    case 'scheduled':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-100';
    case 'notScheduled':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

function visibleComplianceSummaryItems(summary: RefresherSummary) {
  const items: Array<[string, number]> = [
    ['Overdue', summary.overdue],
    ['Due This Month', summary.dueThisMonth],
    ['Due Next Month', summary.dueNextMonth],
    ['Not Due Yet', summary.notDueYet],
  ];

  return items.filter(([, value]) => value > 0);
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function RefreshersPage() {
  const [refresherRecords, setRefresherRecords] = useState<RefresherRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [trainee, setTrainee] = useState('All');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => currentMonthKey());
  const [historyData, setHistoryData] =
    useState<RefresherCompletionHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRefreshers() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/refreshers', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load refreshers.');
        }

        const data = (await response.json()) as RefresherRecord[];

        if (!cancelled) {
          setRefresherRecords(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load refreshers.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRefreshers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyOpen) {
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        const response = await fetch(
          `/api/refreshers/history?month=${encodeURIComponent(historyMonth)}`,
          {
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load completion history.');
        }

        const data =
          (await response.json()) as RefresherCompletionHistoryResponse;

        if (!cancelled) {
          setHistoryData(data);
        }
      } catch {
        if (!cancelled) {
          setHistoryData(null);
          setHistoryError('Failed to load completion history.');
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyMonth, historyOpen]);

  const filtered = useMemo(
    () =>
      filterRefreshersForDashboard(refresherRecords, {
        department,
        status,
        trainee,
      }),
    [department, status, trainee, refresherRecords],
  );

  const departmentGroups = useMemo(
    () => buildRefresherDashboardGroups(filtered),
    [filtered],
  );

  useEffect(() => {
    if (trainee === 'All') {
      return;
    }

    setExpandedGroupKeys((current) => {
      const next = new Set(current);

      departmentGroups.forEach((departmentGroup) => {
        departmentGroup.colleagues.forEach((colleague) => {
          if (colleague.traineeName === trainee) {
            next.add(`${departmentGroup.department}:${colleague.traineeId}`);
          }
        });
      });

      return next.size === current.size ? current : next;
    });
  }, [departmentGroups, trainee]);

  const topSummary = useMemo(
    () => calculateRefresherSummary(refresherRecords),
    [refresherRecords],
  );

  const completedThisMonth = useMemo(
    () => countCompletedThisMonth(refresherRecords),
    [refresherRecords],
  );

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          refresherRecords.map((item) =>
            getRefresherMeetingDepartment(item.department),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [refresherRecords],
  );
  const statuses = useMemo(
    () =>
      Array.from(new Set(refresherRecords.map((item) => item.status))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [refresherRecords],
  );
  const trainees = useMemo(
    () =>
      Array.from(new Set(refresherRecords.map((item) => item.traineeName))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [refresherRecords],
  );

  const hasRecords = refresherRecords.length > 0;

  function toggleGroup(groupKey: string) {
    setExpandedGroupKeys((current) => {
      const next = new Set(current);

      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Refresher Dashboard</h2>
        <p className="mt-2 text-slate-600">
          Monitor refresher workload, scheduling state and compliance risk.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Overdue', topSummary.overdue],
          ['Due This Month', topSummary.dueThisMonth],
          ['Due Next Month', topSummary.dueNextMonth],
          ['Not Due Yet', topSummary.notDueYet],
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
        <button
          type="button"
          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50"
          aria-expanded={historyOpen}
          onClick={() => {
            if (!historyOpen) {
              setHistoryMonth(currentMonthKey());
            }
            setHistoryOpen((current) => !current);
          }}
        >
          <p className="text-sm text-slate-500">Completed This Month</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {completedThisMonth}
          </p>
          <p className="mt-2 text-xs font-medium text-sky-700">
            {historyOpen ? 'Hide history' : 'View completion history'}
          </p>
        </button>
      </div>
      {historyOpen ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Completion History
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Review completed refreshers from any recorded month.
              </p>
            </div>
            <label className="text-sm font-medium text-slate-700">
              Month
              <input
                type="month"
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={historyMonth}
                max={currentMonthKey()}
                onChange={(event) => setHistoryMonth(event.target.value)}
              />
            </label>
          </div>

          {historyLoading ? (
            <p className="mt-4 text-sm text-slate-500">
              Loading completion history...
            </p>
          ) : null}
          {historyError ? (
            <p className="mt-4 text-sm text-red-600">{historyError}</p>
          ) : null}
          {!historyLoading && !historyError && historyData ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {formatMonthLabel(historyData.month)}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <SummaryMetric
                    label="Completed"
                    value={historyData.total}
                  />
                  {Object.entries(historyData.departmentCounts)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([departmentName, count]) => (
                      <SummaryMetric
                        key={departmentName}
                        label={departmentName}
                        value={count}
                      />
                    ))}
                </div>
              </div>

              {historyData.completions.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="hidden grid-cols-[120px_minmax(150px,1.1fr)_minmax(180px,1.4fr)_120px_minmax(120px,1fr)_minmax(120px,1fr)] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                    <span>Date</span>
                    <span>Colleague</span>
                    <span>Process</span>
                    <span>Department</span>
                    <span>Outcome</span>
                    <span>Assessor</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {historyData.completions.map((item) => (
                      <div
                        key={`${item.traineeProcessId}:${item.completedDate}`}
                        className="grid gap-2 px-3 py-3 text-sm lg:grid-cols-[120px_minmax(150px,1.1fr)_minmax(180px,1.4fr)_120px_minmax(120px,1fr)_minmax(120px,1fr)] lg:items-center lg:gap-3"
                      >
                        <span className="text-slate-600">
                          {formatDate(item.completedDate)}
                        </span>
                        <Link
                          className="font-medium text-sky-700 hover:text-sky-900"
                          href={`/trainees/${item.traineeId}`}
                        >
                          {item.traineeName}
                        </Link>
                        <span className="font-medium text-slate-900">
                          {item.process}
                        </span>
                        <span className="text-slate-600">
                          {item.department}
                        </span>
                        <span className="text-slate-600">
                          {item.outcome || '-'}
                        </span>
                        <span className="text-slate-600">
                          {item.assessor || 'Not Assigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  No completed refreshers were recorded for this month.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
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
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option>All</option>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={trainee}
          onChange={(event) => setTrainee(event.target.value)}
        >
          <option>All</option>
          {trainees.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading refreshers...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && !hasRecords ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-500">
          No refresher records are available.
        </p>
      ) : null}
      {!loading && !error && hasRecords && departmentGroups.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-500">
          No refreshers match the current filters.
        </p>
      ) : null}
      {!loading && !error && departmentGroups.length > 0 ? (
        <div className="space-y-6">
          {departmentGroups.map((departmentGroup) => (
            <section
              key={departmentGroup.department}
              className="space-y-4 border-t border-slate-100 pt-6"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {departmentGroup.department}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatCountLabel(
                      departmentGroup.summary.totalRefreshers,
                      'refresher',
                    )}{' '}
                    across{' '}
                    {formatCountLabel(
                      departmentGroup.colleagues.length,
                      'colleague',
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Compliance status
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <SummaryMetric
                        label="Total Refreshers"
                        value={departmentGroup.summary.totalRefreshers}
                      />
                      <SummaryMetric
                        label="Overdue"
                        value={departmentGroup.summary.overdue}
                      />
                      <SummaryMetric
                        label="Due This Month"
                        value={departmentGroup.summary.dueThisMonth}
                      />
                      <SummaryMetric
                        label="Due Next Month"
                        value={departmentGroup.summary.dueNextMonth}
                      />
                      <SummaryMetric
                        label="Not Due Yet"
                        value={departmentGroup.summary.notDueYet}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Scheduling status
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <SummaryMetric
                        label="Scheduled"
                        value={departmentGroup.summary.scheduled}
                      />
                      <SummaryMetric
                        label="Not Scheduled"
                        value={departmentGroup.summary.notScheduled}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {departmentGroup.colleagues.map((colleague) => {
                  const groupKey = `${departmentGroup.department}:${colleague.traineeId}`;
                  const isExpanded = expandedGroupKeys.has(groupKey);

                  return (
                    <article
                      key={groupKey}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <button
                          type="button"
                          className="group flex flex-1 items-start gap-3 text-left"
                          aria-expanded={isExpanded}
                          aria-controls={`refresher-group-${groupKey}`}
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 group-hover:border-sky-200 group-hover:text-sky-700">
                            {isExpanded ? '-' : '+'}
                          </span>
                          <span>
                            <span className="block text-lg font-semibold text-slate-900">
                              {colleague.traineeName}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                              <span className="font-medium">
                                {formatCountLabel(
                                  colleague.summary.totalRefreshers,
                                  'Refresher',
                                )}
                              </span>
                              <span className="font-medium text-slate-500">
                                Compliance:
                              </span>
                              {visibleComplianceSummaryItems(colleague.summary).map(
                                ([label, value]) => (
                                  <span key={label}>
                                    {value} {label}
                                  </span>
                                ),
                              )}
                              <span className="font-medium text-slate-500">
                                Scheduling:
                              </span>
                              <span>{colleague.summary.scheduled} Scheduled</span>
                              <span>
                                {colleague.summary.notScheduled} Not Scheduled
                              </span>
                            </span>
                          </span>
                        </button>
                        <div className="flex items-center gap-2 md:justify-end">
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                            aria-expanded={isExpanded}
                            aria-controls={`refresher-group-${groupKey}`}
                            onClick={() => toggleGroup(groupKey)}
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                          <Link
                            className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100 hover:text-sky-900"
                            href={`/trainees/${colleague.traineeId}`}
                          >
                            View Colleague
                          </Link>
                        </div>
                      </div>
                      {isExpanded ? (
                        <div
                          id={`refresher-group-${groupKey}`}
                          className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
                        >
                          {colleague.refreshers.map((item) => {
                            const schedulingDisplay =
                              getRefresherSchedulingDisplay(item);

                            return (
                              <div
                                key={item.id}
                                className="grid gap-3 p-3 lg:grid-cols-[minmax(180px,1.5fr)_auto_minmax(150px,1fr)_auto_minmax(130px,1fr)] lg:items-center"
                              >
                                <p className="font-medium text-slate-900">
                                  {item.process}
                                </p>
                                <span
                                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${refresherStatusClass(
                                    item.status,
                                  )}`}
                                >
                                  {item.status}
                                </span>
                                <p className="text-sm text-slate-600">
                                  Due{' '}
                                  <span className="font-medium text-slate-900">
                                    {formatDate(item.refresherDueDate)}
                                  </span>
                                </p>
                                <span
                                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${scheduleStatusClass(
                                    schedulingDisplay.tone,
                                  )}`}
                                >
                                  {schedulingDisplay.label}
                                </span>
                                <p className="text-sm text-slate-600">
                                  {formatAssessor(item.assignedAssessor)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
