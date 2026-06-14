'use client';

import { useEffect, useState } from 'react';
import { exportPdfReport, exportWordReport } from '@/lib/export';

type ReportSummary = {
  title: string;
  body: string;
};

type ReportsResponse = {
  departments: string[];
  selectedDepartment: string;
  reports: ReportSummary[];
};

export default function ReportsPage() {
  const [department, setDepartment] = useState('All');
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/reports?department=${encodeURIComponent(department)}`,
          { cache: 'no-store' },
        );

        if (!response.ok) {
          throw new Error('Failed to load reports.');
        }

        const result = (await response.json()) as ReportsResponse;
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load reports.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [department]);

  function reportTitle(title: string) {
    return department === 'All' ? title : `${title} - ${department}`;
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Reports</h2>
        <p className="mt-2 text-slate-600">
          Structured report previews for the training command centre workflow.
        </p>
      </div>
      <select
        className="rounded-xl border border-slate-200 p-3"
        value={department}
        onChange={(event) => setDepartment(event.target.value)}
      >
        <option>All</option>
        {(data?.departments ?? []).map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      {loading ? (
        <p className="text-sm text-slate-500">Loading reports...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.reports.map((report) => (
            <article
              key={report.title}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <h3 className="text-lg font-semibold">{report.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{report.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void exportWordReport(reportTitle(report.title), [
                      report.body,
                    ])
                  }
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  Export Word
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportPdfReport(reportTitle(report.title), [report.body])
                  }
                  className="rounded-xl bg-sky-700 px-3 py-2 text-xs text-white"
                >
                  Export PDF
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
