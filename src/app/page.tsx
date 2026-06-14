'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { exportPdfReport, exportWordReport } from '@/lib/export';

type DashboardData = {
  metrics: {
    activeTrainees: number;
    activeProcessAssignments: number;
    competentProcesses: number;
    followUpRequired: number;
    averageReadiness: number;
    readyForPreAssessment: number;
    readyForAssessment: number;
    refreshersDue: number;
    refreshersOverdue: number;
  };
  urgentPipeline: Array<{
    traineeProcessId: number;
    traineeId: number;
    traineeName: string;
    processName: string;
    departmentName: string;
    followUpFlag: string;
    nextAction: string | null;
  }>;
  departmentSummary: Array<{
    name: string;
    active: number;
    competent: number;
    chase: number;
    ready: number;
  }>;
  plannerHighlights: Array<{
    id: number;
    traineeName: string;
    activityType: string;
    status: string;
  }>;
  urgentRefreshers: Array<{
    id: number;
    traineeName: string;
    refresherDueDate: string | null;
    status: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load dashboard.');
        }

        const data = (await response.json()) as DashboardData;
        if (!cancelled) {
          setDashboard(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load dashboard.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = dashboard?.metrics;
  const exportLines = [
    `Active process assignments ${metrics?.activeProcessAssignments ?? 0}`,
    `Follow-up required ${metrics?.followUpRequired ?? 0}`,
    `Ready for assessment ${metrics?.readyForAssessment ?? 0}`,
    `Average readiness ${metrics?.averageReadiness ?? 0}%`,
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
          Command Centre Dashboard
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Who is in training, what is planned, and what needs action next?
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          This dashboard uses live training data to surface active pipeline
          items, follow-up flags, and departmental workload across the
          manufacturing training environment.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() =>
              exportWordReport('Training Command Centre Summary', exportLines)
            }
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Export Word
          </button>
          <button
            onClick={() =>
              exportPdfReport('Training Command Centre Summary', exportLines)
            }
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm text-white"
          >
            Export PDF
          </button>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && dashboard ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Active Pipeline Items', metrics?.activeProcessAssignments ?? 0],
              ['Active Trainees', metrics?.activeTrainees ?? 0],
              ['Competent Processes', metrics?.competentProcesses ?? 0],
              ['Follow-Up Required', metrics?.followUpRequired ?? 0],
              ['Average Readiness', `${metrics?.averageReadiness ?? 0}%`],
              [
                'Ready for Pre-Assessment',
                metrics?.readyForPreAssessment ?? 0,
              ],
              ['Ready for Assessment', metrics?.readyForAssessment ?? 0],
              ['Refreshers Overdue', metrics?.refreshersOverdue ?? 0],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {value}
                </p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Work Requiring Attention
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {dashboard.urgentPipeline.map((item) => (
                  <li
                    key={item.traineeProcessId}
                    className="rounded-2xl border border-amber-100 bg-amber-50 p-4"
                  >
                    {item.traineeName} · {item.processName} ·{' '}
                    {item.departmentName} · {item.followUpFlag} ·{' '}
                    {item.nextAction ?? 'Follow up required'}
                  </li>
                ))}
              </ul>
              <Link
                href="/training-pipeline"
                className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                View All Pipeline Items
              </Link>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Department Summary
              </h3>
              <div className="mt-4 space-y-3">
                {dashboard.departmentSummary.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <strong>{item.name}</strong>
                      <span>{item.active} active</span>
                    </div>
                    <p className="mt-2 text-slate-600">
                      Competent {item.competent} · Chase {item.chase} · Ready{' '}
                      {item.ready}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                This Week&apos;s Planned Activities
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 text-left">Trainee</th>
                      <th className="pb-2 text-left">Activity</th>
                      <th className="pb-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.plannerHighlights.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3">{item.traineeName}</td>
                        <td className="py-3">{item.activityType}</td>
                        <td className="py-3">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href="/weekly-planner"
                className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                View Weekly Planner
              </Link>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Refreshers Due
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 text-left">Trainee</th>
                      <th className="pb-2 text-left">Due</th>
                      <th className="pb-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.urgentRefreshers.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3">{item.traineeName}</td>
                        <td className="py-3">
                          {formatDate(item.refresherDueDate)}
                        </td>
                        <td className="py-3">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href="/refreshers"
                className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                View All Refreshers
              </Link>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
