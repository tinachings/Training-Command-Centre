'use client';

import { useEffect, useMemo, useState } from 'react';

type RefresherRecord = {
  id: number;
  traineeProcessId: number;
  department: string;
  traineeName: string;
  process: string;
  lastCompetencyDate: string | null;
  refresherDueDate: string | null;
  status: string;
  daysUntilDue: number | null;
  assignedAssessor: string | null;
  completedDate: string | null;
  outcome: string | null;
};

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : '';
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

  useEffect(() => {
    let cancelled = false;

    async function loadRefreshers() {
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

  const filtered = useMemo(
    () =>
      refresherRecords
        .filter(
          (item) =>
            (department === 'All' || item.department === department) &&
            (status === 'All' || item.status === status) &&
            (trainee === 'All' || item.traineeName === trainee),
        )
        .sort((left, right) => {
          if (left.status === 'Overdue' && right.status !== 'Overdue') {
            return -1;
          }
          if (left.status !== 'Overdue' && right.status === 'Overdue') {
            return 1;
          }

          return (left.refresherDueDate ?? '').localeCompare(
            right.refresherDueDate ?? '',
          );
        }),
    [department, status, trainee, refresherRecords],
  );

  const summary = {
    overdue: refresherRecords.filter((item) => item.status === 'Overdue')
      .length,
    dueThisWeek: refresherRecords.filter(
      (item) => item.status === 'Due This Week',
    ).length,
    dueThisMonth: refresherRecords.filter(
      (item) => item.status === 'Due This Month',
    ).length,
    dueNextMonth: refresherRecords.filter(
      (item) => item.status === 'Due Next Month',
    ).length,
    completedThisMonth: refresherRecords.filter(
      (item) => item.status === 'Completed',
    ).length,
  };

  const departments = Array.from(
    new Set(refresherRecords.map((item) => item.department)),
  );
  const statuses = Array.from(
    new Set(refresherRecords.map((item) => item.status)),
  );
  const trainees = Array.from(
    new Set(refresherRecords.map((item) => item.traineeName)),
  );

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Refresher Tracker</h2>
        <p className="mt-2 text-slate-600">
          Urgent refreshers appear first so assessors can prioritise the next
          training actions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Overdue', summary.overdue],
          ['Due This Week', summary.dueThisWeek],
          ['Due This Month', summary.dueThisMonth],
          ['Due Next Month', summary.dueNextMonth],
          ['Completed This Month', summary.completedThisMonth],
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
      {!loading && !error ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 text-left">Colleague</th>
                <th className="pb-3 text-left">Process</th>
                <th className="pb-3 text-left">Status</th>
                <th className="pb-3 text-left">Due Date</th>
                <th className="pb-3 text-left">Assessor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-3">{item.traineeName}</td>
                  <td className="py-3">{item.process}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {formatDate(item.refresherDueDate)}
                  </td>
                  <td className="py-3">{item.assignedAssessor ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
