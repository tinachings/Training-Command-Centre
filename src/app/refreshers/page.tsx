'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

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

type TrainingPipelineItem = {
  traineeProcessId: number;
  traineeName: string;
  processName: string;
  assignedAssessor: string | null;
  traineeTrainingAssessor: string | null;
};

type ScheduleForm = {
  traineeProcessId: string;
  refresherDueDate: string;
  assignedAssessor: string;
  status: string;
};

const refresherStatuses = [
  'Due This Week',
  'Due This Month',
  'Due Next Month',
  'Overdue',
];

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function validAssessor(value: string | null) {
  const assessor = value?.trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : '';
}

function formatAssessor(value: string | null) {
  return validAssessor(value) || 'Not Assigned';
}

export default function RefreshersPage() {
  const [refresherRecords, setRefresherRecords] = useState<RefresherRecord[]>(
    [],
  );
  const [traineeProcesses, setTraineeProcesses] = useState<
    TrainingPipelineItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [trainee, setTrainee] = useState('All');
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    traineeProcessId: '',
    refresherDueDate: '',
    assignedAssessor: '',
    status: 'Due This Month',
  });

  async function loadRefreshers() {
    setError('');

    const response = await fetch('/api/refreshers', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load refreshers.');
    }

    const data = (await response.json()) as RefresherRecord[];
    setRefresherRecords(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      setLoading(true);

      try {
        const [refreshers, processes] = await Promise.all([
          fetch('/api/refreshers', { cache: 'no-store' }),
          fetch('/api/training-pipeline', { cache: 'no-store' }),
        ]);

        if (!refreshers.ok || !processes.ok) {
          throw new Error('Failed to load refreshers.');
        }

        const refresherData =
          (await refreshers.json()) as RefresherRecord[];
        const processData =
          (await processes.json()) as TrainingPipelineItem[];

        if (!cancelled) {
          setRefresherRecords(refresherData);
          setTraineeProcesses(processData);
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

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetScheduleForm() {
    setScheduleForm({
      traineeProcessId: '',
      refresherDueDate: '',
      assignedAssessor: '',
      status: 'Due This Month',
    });
    setScheduleError('');
  }

  function openScheduleForm() {
    resetScheduleForm();
    setShowScheduleForm(true);
  }

  function closeScheduleForm() {
    resetScheduleForm();
    setShowScheduleForm(false);
  }

  function selectedProcessAssessor(traineeProcessId: string) {
    const selected = traineeProcesses.find(
      (item) => String(item.traineeProcessId) === traineeProcessId,
    );

    return selected
      ? validAssessor(selected.assignedAssessor) ||
          validAssessor(selected.traineeTrainingAssessor)
      : '';
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScheduleError('');

    if (!scheduleForm.traineeProcessId || !scheduleForm.refresherDueDate) {
      setScheduleError('Colleague process and due date are required.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/refreshers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          traineeProcessId: Number(scheduleForm.traineeProcessId),
          refresherDueDate: scheduleForm.refresherDueDate,
          assignedAssessor: scheduleForm.assignedAssessor || null,
          status: scheduleForm.status,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to schedule refresher.');
      }

      await loadRefreshers();
      closeScheduleForm();
    } catch (caught) {
      setScheduleError(
        caught instanceof Error
          ? caught.message
          : 'Failed to schedule refresher.',
      );
    } finally {
      setSaving(false);
    }
  }

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
  const processOptions = traineeProcesses.map((item) => ({
    value: String(item.traineeProcessId),
    label: `${item.traineeName} - ${item.processName}`,
  }));

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Refresher Tracker</h2>
        <p className="mt-2 text-slate-600">
          Urgent refreshers appear first so assessors can prioritise the next
          training actions.
        </p>
      </div>
      <div>
        {showScheduleForm ? (
          <form
            className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
            onSubmit={saveSchedule}
          >
            <div>
              <h3 className="text-lg font-semibold">Schedule Refresher</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-2 text-sm">
                <span>Colleague / Process</span>
                <select
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={scheduleForm.traineeProcessId}
                  onChange={(event) => {
                    const traineeProcessId = event.target.value;

                    setScheduleForm((current) => ({
                      ...current,
                      traineeProcessId,
                      assignedAssessor:
                        current.assignedAssessor ||
                        selectedProcessAssessor(traineeProcessId),
                    }));
                  }}
                >
                  <option value="">Select colleague process</option>
                  {processOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span>Refresher Due Date</span>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3"
                  type="date"
                  value={scheduleForm.refresherDueDate}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      refresherDueDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Assigned Assessor</span>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={scheduleForm.assignedAssessor}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      assignedAssessor: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Status</span>
                <select
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={scheduleForm.status}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {refresherStatuses.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            {scheduleError ? (
              <p className="text-sm text-red-600">{scheduleError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? 'Saving...' : 'Save Refresher'}
              </button>
              <button
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                disabled={saving}
                type="button"
                onClick={closeScheduleForm}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white"
            type="button"
            onClick={openScheduleForm}
          >
            Schedule Refresher
          </button>
        )}
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
                  <td className="py-3">
                    {formatAssessor(item.assignedAssessor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
