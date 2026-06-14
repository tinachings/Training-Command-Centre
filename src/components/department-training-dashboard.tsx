'use client';

import { useEffect, useState } from 'react';

type DepartmentTrainingSummary = {
  department: string;
  traineeTotal: number;
  processTotal: number;
  activeProcesses: number;
  competentProcesses: number;
  averageReadiness: number;
  followUpRequired: number;
};

type DepartmentTrainingDashboardProps = {
  department: string;
  title: string;
  description: string;
};

export function DepartmentTrainingDashboard({
  department,
  title,
  description,
}: DepartmentTrainingDashboardProps) {
  const [summary, setSummary] = useState<DepartmentTrainingSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDepartmentPipeline() {
      try {
        const response = await fetch(
          `/api/training-pipeline/summary?department=${encodeURIComponent(department)}`,
          { cache: 'no-store' },
        );

        if (!response.ok) {
          throw new Error('Failed to load department training data.');
        }

        const data = (await response.json()) as DepartmentTrainingSummary;
        if (!cancelled) {
          setSummary(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load department training data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDepartmentPipeline();

    return () => {
      cancelled = true;
    };
  }, [department]);

  const cards = [
    ['Active Processes', summary?.activeProcesses ?? 0],
    ['Competent Processes', summary?.competentProcesses ?? 0],
    ['Active Trainees', summary?.traineeTotal ?? 0],
    ['Total Processes', summary?.processTotal ?? 0],
    ['Average Readiness', `${summary?.averageReadiness ?? 0}%`],
    ['Follow-Up Required', summary?.followUpRequired ?? 0],
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-slate-600">{description}</p>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading department data...</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {cards.map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {value}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
