'use client';

import { useEffect, useState } from 'react';

type CompetencyDashboardData = {
  summary: {
    totalActiveColleagues: number;
    competentColleagues: number;
    inTrainingColleagues: number;
    notYetCompetentColleagues: number;
    competencyCoverage: number;
  };
  refreshers: {
    overdue: number;
    dueThisMonth: number;
    dueNextMonth: number;
  };
  departments: Array<{
    departmentName: string;
    activeColleagues: number;
    competentProcessAssignments: number;
    inTrainingProcessAssignments: number;
    notYetCompetentProcessAssignments: number;
    competencyCoverage: number;
  }>;
  attentionItems: Array<{
    id: string;
    type: 'Overdue Refresher' | 'Due This Month' | 'Not Yet Competent';
    colleagueName: string;
    departmentName: string;
    processName: string;
    dueDate: string | null;
    status: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
}

export default function CompetencyDashboardPage() {
  const [dashboard, setDashboard] =
    useState<CompetencyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch('/api/competency-dashboard', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load competency dashboard.');
        }

        setDashboard((await response.json()) as CompetencyDashboardData);
        setError('');
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load competency dashboard.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
          Competency Dashboard
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Competency coverage, refresher risk and department performance.
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          Management view of current process competence and upcoming refresher
          demand using live training records.
        </p>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">
          Loading competency dashboard...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && dashboard ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              [
                'Total Active Colleagues',
                dashboard.summary.totalActiveColleagues,
              ],
              ['Competent Colleagues', dashboard.summary.competentColleagues],
              ['In Training Colleagues', dashboard.summary.inTrainingColleagues],
              [
                'Not Yet Competent',
                dashboard.summary.notYetCompetentColleagues,
              ],
              [
                'Competency Coverage',
                `${dashboard.summary.competencyCoverage}%`,
              ],
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

          <section className="grid gap-4 md:grid-cols-3">
            {[
              ['Overdue', dashboard.refreshers.overdue],
              ['Due This Month', dashboard.refreshers.dueThisMonth],
              ['Due Next Month', dashboard.refreshers.dueNextMonth],
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

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Department Breakdown
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 text-left">Department</th>
                    <th className="pb-3 text-left">Active Colleagues</th>
                    <th className="pb-3 text-left">Competent Processes</th>
                    <th className="pb-3 text-left">Processes In Training</th>
                    <th className="pb-3 text-left">
                      Not Yet Competent Processes
                    </th>
                    <th className="pb-3 text-left">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.departments.map((department) => (
                    <tr
                      key={department.departmentName}
                      className="border-t border-slate-100"
                    >
                      <td className="py-3 font-medium text-slate-900">
                        {department.departmentName}
                      </td>
                      <td className="py-3">{department.activeColleagues}</td>
                      <td className="py-3">
                        {department.competentProcessAssignments}
                      </td>
                      <td className="py-3">
                        {department.inTrainingProcessAssignments}
                      </td>
                      <td className="py-3">
                        {department.notYetCompetentProcessAssignments}
                      </td>
                      <td className="py-3">
                        {department.competencyCoverage}%
                      </td>
                    </tr>
                  ))}
                  {dashboard.departments.length === 0 ? (
                    <tr>
                      <td className="py-6 text-sm text-slate-500" colSpan={6}>
                        No department data available.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Attention List
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 text-left">Type</th>
                    <th className="pb-3 text-left">Colleague</th>
                    <th className="pb-3 text-left">Department</th>
                    <th className="pb-3 text-left">Process</th>
                    <th className="pb-3 text-left">Due Date</th>
                    <th className="pb-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.attentionItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-3">{item.type}</td>
                      <td className="py-3 font-medium text-slate-900">
                        {item.colleagueName}
                      </td>
                      <td className="py-3">{item.departmentName}</td>
                      <td className="py-3">{item.processName}</td>
                      <td className="py-3">{formatDate(item.dueDate)}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dashboard.attentionItems.length === 0 ? (
                    <tr>
                      <td className="py-6 text-sm text-slate-500" colSpan={6}>
                        No high-priority competency items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
