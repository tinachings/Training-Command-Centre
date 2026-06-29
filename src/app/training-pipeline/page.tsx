'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type TrainingPipelineItem = {
  traineeProcessId: number;
  traineeId: number;
  traineeName: string;
  departmentName: string;
  processName: string;
  stage: string;
  status: string;
  readiness: number | null;
  trainingBuddy: string | null;
  trainingStartDate: string | null;
  scheduledPreAssessmentDate: string | null;
  scheduledAssessmentDate: string | null;
  assignedAssessor: string | null;
  traineeTrainingAssessor: string | null;
  nextAction: string | null;
  followUpFlag: string | null;
};

type ScheduleForm = {
  scheduledPreAssessmentDate: string;
  scheduledAssessmentDate: string;
  assignedAssessor: string;
};

type Person = {
  name: string;
  active: boolean;
  roles: {
    name: string;
  }[];
};

type PeopleResponse = {
  people: Person[];
};

const assessmentDateOrderError =
  'Assessment date cannot be earlier than pre-assessment date.';
const defaultDepartment = 'Surfacing';

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function validAssessor(value: string | null) {
  const assessor = value?.trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : '';
}

function formatAssignedAssessor(item: TrainingPipelineItem) {
  return (
    validAssessor(item.assignedAssessor) ||
    validAssessor(item.traineeTrainingAssessor) ||
    'Not Assigned'
  );
}

function hasInvalidAssessmentDateOrder(form: ScheduleForm) {
  return (
    form.scheduledPreAssessmentDate !== '' &&
    form.scheduledAssessmentDate !== '' &&
    form.scheduledAssessmentDate < form.scheduledPreAssessmentDate
  );
}

function namesForRole(people: Person[], roleName: string) {
  return people
    .filter(
      (person) =>
        person.active !== false &&
        person.roles.some((role) => role.name === roleName),
    )
    .map((person) => person.name);
}

function toScheduleForm(
  item: TrainingPipelineItem,
  trainingAssessors: string[],
): ScheduleForm {
  const assignedAssessor = validAssessor(item.assignedAssessor);

  return {
    scheduledPreAssessmentDate: formatDate(item.scheduledPreAssessmentDate),
    scheduledAssessmentDate: formatDate(item.scheduledAssessmentDate),
    assignedAssessor: trainingAssessors.includes(assignedAssessor)
      ? assignedAssessor
      : trainingAssessors[0] || '',
  };
}

export default function TrainingPipelinePage() {
  const defaultDepartmentApplied = useRef(false);
  const [traineeProcesses, setTraineeProcesses] = useState<
    TrainingPipelineItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [department, setDepartment] = useState('All');
  const [stage, setStage] = useState('All');
  const [trainee, setTrainee] = useState('All');
  const [process, setProcess] = useState('All');
  const [trainingAssessors, setTrainingAssessors] = useState<string[]>([]);
  const [schedulingItem, setSchedulingItem] =
    useState<TrainingPipelineItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    scheduledPreAssessmentDate: '',
    scheduledAssessmentDate: '',
    assignedAssessor: '',
  });

  async function loadPipeline() {
    setLoading(true);
    setError('');

    try {
      const [response, peopleResponse] = await Promise.all([
        fetch('/api/training-pipeline', {
          cache: 'no-store',
        }),
        fetch('/api/people', {
          cache: 'no-store',
        }),
      ]);

      if (!response.ok || !peopleResponse.ok) {
        throw new Error('Failed to load training pipeline.');
      }

      const data = (await response.json()) as TrainingPipelineItem[];
      const peopleData = (await peopleResponse.json()) as PeopleResponse;
      setTraineeProcesses(data);
      if (
        !defaultDepartmentApplied.current &&
        data.some((item) => item.departmentName === defaultDepartment)
      ) {
        setDepartment((current) =>
          current === 'All' ? defaultDepartment : current,
        );
      }
      defaultDepartmentApplied.current = true;
      setTrainingAssessors(
        namesForRole(peopleData.people, 'Training Assessor'),
      );
    } catch {
      setError('Failed to load training pipeline.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPipeline();
  }, []);

  const filtered = useMemo(
    () =>
      traineeProcesses.filter(
        (item) =>
          (department === 'All' || item.departmentName === department) &&
          (stage === 'All' || item.stage === stage) &&
          (trainee === 'All' || item.traineeName === trainee) &&
          (process === 'All' || item.processName === process),
      ),
    [department, stage, trainee, process, traineeProcesses],
  );

  function openSchedule(item: TrainingPipelineItem) {
    setSchedulingItem(item);
    setScheduleForm(toScheduleForm(item, trainingAssessors));
    setScheduleError('');
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schedulingItem) {
      return;
    }

    setScheduleError('');

    if (hasInvalidAssessmentDateOrder(scheduleForm)) {
      setScheduleError(assessmentDateOrderError);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/training-pipeline/${schedulingItem.traineeProcessId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduledPreAssessmentDate:
              scheduleForm.scheduledPreAssessmentDate || null,
            scheduledAssessmentDate:
              scheduleForm.scheduledAssessmentDate || null,
            assignedAssessor: scheduleForm.assignedAssessor || null,
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to save schedule.');
      }

      await loadPipeline();
      setSchedulingItem(null);
    } catch (caught) {
      setScheduleError(
        caught instanceof Error ? caught.message : 'Failed to save schedule.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Training Pipeline</h2>
        <p className="mt-2 text-slate-600">
          A live-style table of all trainee/process records with readiness,
          follow-up flags and next action guidance.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option>All</option>
          {Array.from(
            new Set(traineeProcesses.map((item) => item.departmentName)),
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          <option>All</option>
          {Array.from(new Set(traineeProcesses.map((item) => item.stage))).map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={trainee}
          onChange={(event) => setTrainee(event.target.value)}
        >
          <option>All</option>
          {Array.from(
            new Set(traineeProcesses.map((item) => item.traineeName)),
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={process}
          onChange={(event) => setProcess(event.target.value)}
        >
          <option>All</option>
          {Array.from(
            new Set(traineeProcesses.map((item) => item.processName)),
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading training pipeline...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {schedulingItem ? (
        <form
          className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
          onSubmit={saveSchedule}
        >
          <div>
            <h3 className="text-lg font-semibold">Schedule Assessment Dates</h3>
            <p className="mt-1 text-sm text-slate-600">
              {schedulingItem.traineeName} - {schedulingItem.processName}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span>Scheduled Pre-Assessment Date</span>
              <input
                className="w-full rounded-xl border border-slate-200 p-3"
                type="date"
                value={scheduleForm.scheduledPreAssessmentDate}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    scheduledPreAssessmentDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>Scheduled Assessment Date</span>
              <input
                className="w-full rounded-xl border border-slate-200 p-3"
                type="date"
                value={scheduleForm.scheduledAssessmentDate}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    scheduledAssessmentDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>Assigned Assessor</span>
              <select
                className="w-full rounded-xl border border-slate-200 p-3"
                value={scheduleForm.assignedAssessor}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    assignedAssessor: event.target.value,
                  }))
                }
              >
                {trainingAssessors.length ? (
                  trainingAssessors.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No options configured
                  </option>
                )}
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
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
              disabled={saving}
              type="button"
              onClick={() => setSchedulingItem(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 text-center">Trainee</th>
                <th className="pb-3 text-center">Process</th>
                <th className="pb-3 text-center">Dept</th>
                <th className="pb-3 text-left">Stage</th>
                <th className="pb-3 text-left">Readiness</th>
                <th className="pb-3 text-left">Follow-Up</th>
                <th className="pb-3 text-left">Scheduled Pre-Assessment Date</th>
                <th className="pb-3 text-left">Scheduled Assessment Date</th>
                <th className="pb-3 text-left">Assigned Assessor</th>
                <th className="pb-3 text-left">Next Action</th>
                <th className="pb-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.traineeProcessId} className="border-t border-slate-100">
                  <td className="py-3 text-center">{item.traineeName}</td>
                  <td className="py-3 text-center">{item.processName}</td>
                  <td className="py-3 text-center">{item.departmentName}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700">
                      {item.stage}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="w-28 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${item.readiness ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {item.readiness ?? 0}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                      {item.followUpFlag ?? 'NONE'}
                    </span>
                  </td>
                  <td className="py-3">
                    {formatDate(item.scheduledPreAssessmentDate)}
                  </td>
                  <td className="py-3">
                    {formatDate(item.scheduledAssessmentDate)}
                  </td>
                  <td className="py-3">{formatAssignedAssessor(item)}</td>
                  <td className="py-3 text-slate-600">
                    {item.nextAction ?? ''}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        className="rounded-full bg-violet-50 px-3 py-1 text-violet-700"
                        type="button"
                        onClick={() => openSchedule(item)}
                      >
                        Schedule
                      </button>
                      <Link
                        href={`/trainees/${item.traineeId}/processes/${item.traineeProcessId}`}
                        className="rounded-full bg-sky-50 px-3 py-1 text-sky-700"
                      >
                        View
                      </Link>
                      <Link
                        href={`/trainees/${item.traineeId}/progress/${item.traineeProcessId}`}
                        className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"
                      >
                        Update
                      </Link>
                    </div>
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
