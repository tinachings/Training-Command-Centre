'use client';

import { useEffect, useState } from 'react';

type AssignmentSummary = {
  traineeProcessId: number;
  traineeId: number;
  traineeName: string;
  departmentName: string;
  processName: string;
  stage: string;
  status: string;
  followUpFlag: string | null;
  nextAction: string | null;
  followUpActions: Array<{
    id: number;
    title: string;
    dueDate: string | null;
    status: string;
  }>;
  latestTimelineEvent: {
    id: number;
    eventType: string;
    description: string;
    date: string;
    createdAt: string;
  } | null;
};

type TeamLeaderUpdate = {
  departments: string[];
  summary: {
    openItems: number;
    chaseItems: number;
    readyForPreAssessment: number;
    readyForAssessment: number;
  };
  supportItems: AssignmentSummary[];
  refreshers: Array<{
    id: number;
    traineeName: string;
    process: string;
    status: string;
    refresherDueDate: string | null;
  }>;
  readyForPreAssessment: AssignmentSummary[];
  readyForAssessment: AssignmentSummary[];
  retrainingRequired: AssignmentSummary[];
};

export default function TeamLeaderUpdatePage() {
  const [department, setDepartment] = useState('All');
  const [update, setUpdate] = useState<TeamLeaderUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadUpdate() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/team-leader-update?department=${encodeURIComponent(department)}`,
          { cache: 'no-store' },
        );

        if (!response.ok) {
          throw new Error('Failed to load team leader update.');
        }

        const data = (await response.json()) as TeamLeaderUpdate;
        if (!cancelled) {
          setUpdate(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load team leader update.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUpdate();

    return () => {
      cancelled = true;
    };
  }, [department]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Team Leader Update</h2>
        <p className="mt-2 text-slate-600">
          Department-level update built from live training and refresher data.
        </p>
      </div>
      <select
        className="rounded-xl border border-slate-200 p-3"
        value={department}
        onChange={(event) => setDepartment(event.target.value)}
      >
        <option>All</option>
        {(update?.departments ?? []).map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      {loading ? (
        <p className="text-sm text-slate-500">
          Loading team leader update...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && update ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Open Items', update.summary.openItems],
              ['Chase Items', update.summary.chaseItems],
              [
                'Ready for Pre-Assessment',
                update.summary.readyForPreAssessment,
              ],
              ['Ready for Assessment', update.summary.readyForAssessment],
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
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">
                Items Requiring Support
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {update.supportItems.map((item) => (
                  <li
                    key={item.traineeProcessId}
                    className="rounded-xl bg-white p-3"
                  >
                    {item.traineeName} · {item.processName} · {item.stage}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Refreshers Due</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {update.refreshers.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white p-3">
                    {item.traineeName} · {item.process} · {item.status}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">
                Ready for Pre-Assessment
              </h3>
              {update.readyForPreAssessment.map((item) => (
                <p
                  key={item.traineeProcessId}
                  className="mt-2 text-sm text-slate-700"
                >
                  {item.traineeName} / {item.processName}
                </p>
              ))}
            </article>
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Ready for Assessment</h3>
              {update.readyForAssessment.map((item) => (
                <p
                  key={item.traineeProcessId}
                  className="mt-2 text-sm text-slate-700"
                >
                  {item.traineeName} / {item.processName}
                </p>
              ))}
            </article>
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Retraining Required</h3>
              {update.retrainingRequired.map((item) => (
                <p
                  key={item.traineeProcessId}
                  className="mt-2 text-sm text-slate-700"
                >
                  {item.traineeName} / {item.processName}
                </p>
              ))}
            </article>
          </div>
        </>
      ) : null}
    </div>
  );
}
