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
  cumulativeLoggedHours: string;
  recommendedTrainingHours: string | null;
  checkInState: string;
  assessmentDisplay: string;
  trainingBuddy: string | null;
  trainingStartDate: Date | null;
  scheduledPreAssessmentDate: Date | null;
  scheduledAssessmentDate: Date | null;
  assignedAssessor: string | null;
  traineeTrainingAssessor: string | null;
  nextAction: string | null;
  followUpFlag: string | null;
  requiresAction: boolean;
};

type TrainingPipelineGroup = {
  colleagueId: number;
  colleagueName: string;
  departmentName: string;
  activeProcessCount: number;
  at100PercentCount: number;
  actionRequiredCount: number;
  overallState: 'Action Required' | 'On Track';
  processes: TrainingPipelineItem[];
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

function formatDate(value: Date | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(value);
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
  const [expandedColleagues, setExpandedColleagues] = useState<
    Record<number, boolean>
  >({});
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

  const filteredGroups = useMemo<TrainingPipelineGroup[]>(() => {
    const filtered = traineeProcesses.filter(
      (item) =>
        (department === 'All' || item.departmentName === department) &&
        (stage === 'All' || item.stage === stage) &&
        (trainee === 'All' || item.traineeName === trainee) &&
        (process === 'All' || item.processName === process),
    );

    const grouped = new Map<number, TrainingPipelineItem[]>();

    for (const item of filtered) {
      const existing = grouped.get(item.traineeId) ?? [];
      existing.push(item);
      grouped.set(item.traineeId, existing);
    }

    return Array.from(grouped.entries())
      .map(([colleagueId, processes]) => {
        const sortedProcesses = [...processes].sort((left, right) =>
          left.processName.localeCompare(right.processName, undefined, {
            sensitivity: 'base',
          }),
        );

        const at100PercentCount = sortedProcesses.filter(
          (process) => (process.readiness ?? 0) >= 100,
        ).length;
        const actionRequiredCount = sortedProcesses.filter(
          (process) => process.requiresAction,
        ).length;
        const overallState: TrainingPipelineGroup['overallState'] =
          actionRequiredCount > 0 ? 'Action Required' : 'On Track';

        return {
          colleagueId,
          colleagueName: sortedProcesses[0]?.traineeName ?? '',
          departmentName: sortedProcesses[0]?.departmentName ?? '',
          activeProcessCount: sortedProcesses.length,
          at100PercentCount,
          actionRequiredCount,
          overallState,
          processes: sortedProcesses,
        } satisfies TrainingPipelineGroup;
      })
      .sort((left, right) => {
        const leftName = left.colleagueName.trim().toLowerCase();
        const rightName = right.colleagueName.trim().toLowerCase();

        if (leftName < rightName) {
          return -1;
        }

        if (leftName > rightName) {
          return 1;
        }

        return left.colleagueId - right.colleagueId;
      });
  }, [department, process, stage, trainee, traineeProcesses]);

  function openSchedule(item: TrainingPipelineItem) {
    setSchedulingItem(item);
    setScheduleForm(toScheduleForm(item, trainingAssessors));
    setScheduleError('');
  }

  function toggleColleague(colleagueId: number) {
    setExpandedColleagues((current) => ({
      ...current,
      [colleagueId]: !current[colleagueId],
    }));
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
          Active training progression by colleague, with the next action and
          assessment state surfaced clearly.
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
        <div className="space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No active training processes match the current filters.
            </div>
          ) : null}

          {filteredGroups.map((group) => {
            const isExpanded = expandedColleagues[group.colleagueId] ?? false;

            return (
              <section
                key={group.colleagueId}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
              >
                <button
                  className="flex w-full items-start justify-between gap-4 text-left"
                  type="button"
                  onClick={() => toggleColleague(group.colleagueId)}
                >
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {group.colleagueName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                      <span>{group.activeProcessCount} Active Processes</span>
                      <span>•</span>
                      <span>{group.at100PercentCount} at 100%</span>
                      <span>•</span>
                      <span>{group.actionRequiredCount} Action Required</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        group.overallState === 'Action Required'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {group.overallState}
                    </span>
                    <span className="text-sm font-medium text-sky-700">
                      {isExpanded ? 'Collapse' : 'View Processes'}
                    </span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Process</th>
                          <th className="px-4 py-3 text-left">Stage</th>
                          <th className="px-4 py-3 text-left">Training Progress</th>
                          <th className="px-4 py-3 text-left">Check-In</th>
                          <th className="px-4 py-3 text-left">Assessment</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.processes.map((item) => (
                          <tr
                            key={item.traineeProcessId}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="font-medium text-slate-900">
                                  {item.processName}
                                </div>
                                {item.nextAction ? (
                                  <div className="text-xs text-slate-500">
                                    {item.nextAction}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                {item.stage}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {item.recommendedTrainingHours ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-28 rounded-full bg-slate-100">
                                      <div
                                        className="h-2 rounded-full bg-emerald-500"
                                        style={{
                                          width: `${Math.min(100, Math.max(0, item.readiness ?? 0))}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                      {Math.min(100, Math.max(0, item.readiness ?? 0))}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.cumulativeLoggedHours} /{' '}
                                    {item.recommendedTrainingHours} hrs
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">
                                  Hours target not set
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  item.checkInState === 'Final Check-In Required'
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.checkInState === '50% Check-In Required'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.checkInState}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {item.assessmentDisplay}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/trainees/${item.traineeId}/processes/${item.traineeProcessId}`}
                                  className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700"
                                >
                                  View
                                </Link>
                                <details className="relative">
                                  <summary className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                                    Actions
                                  </summary>
                                  <div className="absolute right-0 z-10 mt-2 flex min-w-[180px] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                                    <Link
                                      href={`/trainees/${item.traineeId}/training-hours/${item.traineeProcessId}`}
                                      className="rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      Log Training Hours
                                    </Link>
                                    <Link
                                      href={`/trainees/${item.traineeId}/check-in/${item.traineeProcessId}`}
                                      className="rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      Log Check-In
                                    </Link>
                                    <button
                                      className="rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                      type="button"
                                      onClick={() => openSchedule(item)}
                                    >
                                      Schedule Assessment
                                    </button>
                                    <Link
                                      href={`/trainees/${item.traineeId}/progress/${item.traineeProcessId}`}
                                      className="rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      Update Stage / Follow-Up
                                    </Link>
                                  </div>
                                </details>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
