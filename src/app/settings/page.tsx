'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Department = {
  id: number;
  name: string;
};

type SettingsData = {
  departments: Department[];
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
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [error, setError] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');

  async function loadDepartments() {
    const response = await fetch('/api/departments', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load departments.');
    }

    return (await response.json()) as Department[];
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const [settingsResponse, departments] = await Promise.all([
          fetch('/api/settings', {
            cache: 'no-store',
          }),
          loadDepartments(),
        ]);

        if (!settingsResponse.ok) {
          throw new Error('Failed to load settings.');
        }

        const result = (await settingsResponse.json()) as SettingsData;
        if (!cancelled) {
          setData({
            ...result,
            departments,
          });
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

  async function addDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepartmentError('');

    const name = newDepartmentName.trim();
    if (!name) {
      setDepartmentError('Department name is required.');
      return;
    }

    setSavingDepartment(true);

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to add department.');
      }

      const departments = await loadDepartments();
      setData((current) =>
        current
          ? {
              ...current,
              departments,
            }
          : current,
      );
      setNewDepartmentName('');
    } catch (caught) {
      setDepartmentError(
        caught instanceof Error ? caught.message : 'Failed to add department.',
      );
    } finally {
      setSavingDepartment(false);
    }
  }

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
          <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <h3 className="text-lg font-semibold">Department Management</h3>
              <p className="mt-1 text-sm text-slate-600">
                Add departments for future colleague and process management.
              </p>
            </div>
            <form
              className="grid gap-3 md:grid-cols-[1fr_auto]"
              onSubmit={addDepartment}
            >
              <input
                className="rounded-xl border border-slate-200 p-3"
                value={newDepartmentName}
                onChange={(event) => setNewDepartmentName(event.target.value)}
                placeholder="Department name"
              />
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                disabled={savingDepartment}
                type="submit"
              >
                {savingDepartment ? 'Adding...' : 'Add Department'}
              </button>
            </form>
            {departmentError ? (
              <p className="text-sm text-red-600">{departmentError}</p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 text-left">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((department) => (
                    <tr
                      key={department.id}
                      className="border-t border-slate-200"
                    >
                      <td className="py-3">{department.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
