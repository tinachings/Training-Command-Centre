'use client';

import { useEffect, useMemo, useState } from 'react';

type SettingsData = {
  departments: Array<{
    id: number;
    name: string;
  }>;
  processes: Array<{
    id: number;
    name: string;
    departmentId: number;
    departmentName: string;
  }>;
  trainees: Array<{
    id: number;
    name: string;
    departmentName: string;
    teamLeader: string | null;
    trainingAssessor: string | null;
  }>;
  teamLeaders: string[];
  trainingAssessors: string[];
  trainingBuddies: string[];
  settings: Record<string, string>;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch('/api/settings', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load settings.');
        }

        const result = (await response.json()) as SettingsData;
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const settingsCards = useMemo(() => {
    if (!data) {
      return [];
    }

    const setupDays = data.settings.setupOverdueAfterDays ?? '2';
    const chaseDays = data.settings.chaseAfterDays ?? '5';
    const priorityDays = data.settings.priorityAfterReadyDays ?? '5';

    return [
      [
        'Departments',
        data.departments.map((item) => item.name).join(', '),
      ],
      [
        'Processes',
        data.processes
          .slice(0, 8)
          .map((item) => item.name)
          .join(', '),
      ],
      ['Team Leaders', data.teamLeaders.join(', ')],
      ['Training Assessors', data.trainingAssessors.join(', ')],
      ['Training Buddies', data.trainingBuddies.join(', ')],
      [
        'Follow-up thresholds',
        `Setup overdue ${setupDays} days · Chase after ${chaseDays} days · Priority after ${priorityDays} days`,
      ],
      [
        'Readiness target shifts',
        `${data.settings.readinessTargetShifts ?? '5'} shifts`,
      ],
    ];
  }, [data]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-slate-600">
          Editable-looking management tables and settings groups for the
          command centre workflow.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading settings...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {settingsCards.map(([title, value]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {value || 'None configured'}
                </p>
              </article>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 text-left">Trainee</th>
                  <th className="pb-3 text-left">Department</th>
                  <th className="pb-3 text-left">Team Leader</th>
                  <th className="pb-3 text-left">Assessor</th>
                </tr>
              </thead>
              <tbody>
                {data.trainees.map((trainee) => (
                  <tr key={trainee.id} className="border-t border-slate-100">
                    <td className="py-3">{trainee.name}</td>
                    <td className="py-3">{trainee.departmentName}</td>
                    <td className="py-3">{trainee.teamLeader ?? ''}</td>
                    <td className="py-3">
                      {trainee.trainingAssessor ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
