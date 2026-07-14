'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type RefresherRecord = {
  id: number;
  traineeProcessId: number;
  department: string;
  traineeName: string;
  process: string;
  lastCompetencyDate: string | null;
  refresherDueDate: string | null;
  scheduledRefresherDate: string | null;
  status: string;
  scheduleStatus: string | null;
  daysUntilDue: number | null;
  assignedAssessor: string | null;
  completedDate: string | null;
  outcome: string | null;
};

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : '-';
}

function validAssessor(value: string | null) {
  const assessor = value?.trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : '';
}

function formatAssessor(value: string | null) {
  return validAssessor(value) || 'Not Assigned';
}

function refresherStatusClass(status: string) {
  switch (status) {
    case 'Overdue':
      return 'bg-rose-50 text-rose-700';
    case 'Due This Month':
      return 'bg-amber-50 text-amber-700';
    case 'Due Next Month':
      return 'bg-sky-50 text-sky-700';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700';
    case 'Not Due Yet':
    default:
      return 'bg-slate-100 text-slate-600';
  }
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
    dueThisMonth: refresherRecords.filter(
      (item) => item.status === 'Due This Month',
    ).length,
    dueNextMonth: refresherRecords.filter(
      (item) => item.status === 'Due Next Month',
    ).length,
    notDueYet: refresherRecords.filter((item) => item.status === 'Not Due Yet')
      .length,
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
        <h2 className="text-2xl font-semibold">Refresher Dashboard</h2>
        <p className="mt-2 text-slate-600">
          Monitor refresher workload, scheduling state and compliance risk.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Overdue', summary.overdue],
          ['Due This Month', summary.dueThisMonth],
          ['Due Next Month', summary.dueNextMonth],
          ['Not Due Yet', summary.notDueYet],
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
                <th className="pb-3 text-left">Compliance Status</th>
                <th className="pb-3 text-left">Compliance Due Date</th>
                <th className="pb-3 text-left">Scheduled Refresher Date</th>
                <th className="pb-3 text-left">Schedule Status</th>
                <th className="pb-3 text-left">Assessor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const scheduleStatus = item.scheduleStatus?.trim();

                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-slate-900">
                      <Link
                        className="text-sky-700 hover:text-sky-900"
                        href={`/colleagues?traineeProcessId=${item.traineeProcessId}`}
                      >
                        {item.traineeName}
                      </Link>
                    </td>
                    <td className="py-3">{item.process}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${refresherStatusClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3">{formatDate(item.refresherDueDate)}</td>
                    <td className="py-3">
                      {formatDate(item.scheduledRefresherDate)}
                    </td>
                    <td className="py-3">{scheduleStatus || 'Not Scheduled'}</td>
                    <td className="py-3">
                      {formatAssessor(item.assignedAssessor)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-slate-500" colSpan={7}>
                    No refreshers match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
