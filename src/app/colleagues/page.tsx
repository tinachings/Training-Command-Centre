'use client';

import {
  FormEvent,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ColleagueCompetency = {
  traineeProcessId: number;
  refresherRecordId: number | null;
  processName: string;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  assignedAssessor: string | null;
  traineeTrainingAssessor: string | null;
  competencySignOffDate: string | null;
  scheduledPreAssessmentDate: string | null;
  scheduledAssessmentDate: string | null;
  refresherDueDate: string | null;
  scheduledRefresherDate: string | null;
  refresherStatus: string | null;
  scheduleStatus: string | null;
};

type ColleagueListItem = {
  id: number;
  name: string;
  shift: string | null;
  archived: boolean;
  department: {
    name: string;
  };
  competentProcessCount: number;
  refreshersDueCount: number;
  status: string;
  competencies: ColleagueCompetency[];
};

type DepartmentOption = {
  id: number;
  name: string;
  active: boolean;
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

type RefresherScheduleTarget = {
  colleagueName: string;
  competency: ColleagueCompetency;
};

type RefresherScheduleForm = {
  scheduledRefresherDate: string;
  assignedAssessor: string;
};

type RefresherCompletionTarget = {
  colleagueName: string;
  competency: ColleagueCompetency;
};

type RefresherCompletionForm = {
  completedDate: string;
  outcome: string;
};

type RefresherMoveAction = 'defer' | 'carryOver';

type RefresherMoveTarget = {
  action: RefresherMoveAction;
  colleagueName: string;
  competency: ColleagueCompetency;
};

type RefresherMoveForm = {
  newScheduledDate: string;
  deviationReason: string;
};

type AssessmentScheduleTarget = {
  colleagueName: string;
  competency: ColleagueCompetency;
};

type AssessmentScheduleForm = {
  scheduledPreAssessmentDate: string;
  scheduledAssessmentDate: string;
  assignedAssessor: string;
};

const assessmentDateOrderError =
  'Assessment date cannot be earlier than pre-assessment date.';
const defaultDepartment = 'Surfacing';
const completionOutcomes = [
  'Completed',
  'Further Training Required',
  'Not Completed',
];

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function nextWeekInputValue(value: string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return todayInputValue();
  }

  date.setDate(date.getDate() + 7);

  return date.toISOString().slice(0, 10);
}

function validAssessor(value: string | null) {
  const assessor = value?.trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : '';
}

function competencyStatus(competency: ColleagueCompetency) {
  if (
    competency.status === 'Competent' ||
    competency.stage === 'Competent' ||
    competency.assessmentOutcome === 'Competent'
  ) {
    return 'Competent';
  }

  return competency.assessmentOutcome || competency.stage || competency.status;
}

function isCompetentSignedOff(competency: ColleagueCompetency) {
  return (
    competencyStatus(competency) === 'Competent' &&
    competency.competencySignOffDate !== null
  );
}

function refresherStatusClass(status: string) {
  switch (status) {
    case 'Overdue':
      return 'bg-rose-50 text-rose-700';
    case 'Due This Month':
      return 'bg-amber-50 text-amber-700';
    case 'Due Next Month':
      return 'bg-sky-50 text-sky-700';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700';
    case 'Not Due Yet':
    default:
      return 'bg-slate-100 text-slate-600';
  }
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

async function fetchColleagues(signal?: AbortSignal) {
  const response = await fetch('/api/colleagues', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load colleagues.');
  }

  return (await response.json()) as ColleagueListItem[];
}

async function fetchDepartments(signal?: AbortSignal) {
  const response = await fetch('/api/departments', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load departments.');
  }

  return (await response.json()) as DepartmentOption[];
}

async function fetchPeople(signal?: AbortSignal) {
  const response = await fetch('/api/people', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load people.');
  }

  return (await response.json()) as PeopleResponse;
}

export default function ColleaguesPage() {
  const defaultDepartmentApplied = useRef(false);
  const [colleagues, setColleagues] = useState<ColleagueListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [trainingAssessors, setTrainingAssessors] = useState<string[]>([]);
  const [department, setDepartment] = useState('All');
  const [process, setProcess] = useState('All');
  const [refresherStatus, setRefresherStatus] = useState('All');
  const [status, setStatus] = useState('Active');
  const [expandedColleagueIds, setExpandedColleagueIds] = useState<number[]>(
    [],
  );
  const [refresherScheduleTarget, setRefresherScheduleTarget] =
    useState<RefresherScheduleTarget | null>(null);
  const [refresherScheduleForm, setRefresherScheduleForm] =
    useState<RefresherScheduleForm>({
      scheduledRefresherDate: '',
      assignedAssessor: '',
    });
  const [refresherCompletionTarget, setRefresherCompletionTarget] =
    useState<RefresherCompletionTarget | null>(null);
  const [refresherCompletionForm, setRefresherCompletionForm] =
    useState<RefresherCompletionForm>({
      completedDate: todayInputValue(),
      outcome: completionOutcomes[0],
    });
  const [refresherMoveTarget, setRefresherMoveTarget] =
    useState<RefresherMoveTarget | null>(null);
  const [refresherMoveForm, setRefresherMoveForm] =
    useState<RefresherMoveForm>({
      newScheduledDate: '',
      deviationReason: '',
    });
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [assessmentScheduleTarget, setAssessmentScheduleTarget] =
    useState<AssessmentScheduleTarget | null>(null);
  const [assessmentScheduleForm, setAssessmentScheduleForm] =
    useState<AssessmentScheduleForm>({
      scheduledPreAssessmentDate: '',
      scheduledAssessmentDate: '',
      assignedAssessor: '',
    });
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [refresherActionError, setRefresherActionError] = useState('');
  const [savingRefresherAction, setSavingRefresherAction] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadColleagues() {
      try {
        const [colleagueData, departmentData, peopleData] = await Promise.all([
          fetchColleagues(controller.signal),
          fetchDepartments(controller.signal),
          fetchPeople(controller.signal),
        ]);
        const representedDepartments = new Set(
          colleagueData.map((colleague) => colleague.department.name),
        );
        const selectableDepartments = departmentData.filter(
          (department) =>
            department.active || representedDepartments.has(department.name),
        );

        setColleagues(colleagueData);
        setDepartments(selectableDepartments);
        if (
          !defaultDepartmentApplied.current &&
          selectableDepartments.some(
            (department) => department.name === defaultDepartment,
          )
        ) {
          setDepartment((current) =>
            current === 'All' ? defaultDepartment : current,
          );
        }
        defaultDepartmentApplied.current = true;
        setTrainingAssessors(
          namesForRole(peopleData.people, 'Training Assessor'),
        );
        setError('');
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load colleagues.');
        }
      }
    }

    void loadColleagues();

    return () => controller.abort();
  }, []);

  const processOptions = useMemo(
    () =>
      Array.from(
        new Set(
          colleagues.flatMap((colleague) =>
            colleague.competencies.map((competency) => competency.processName),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [colleagues],
  );

  const refresherStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          colleagues.flatMap((colleague) =>
            colleague.competencies
              .map((competency) => competency.refresherStatus?.trim() ?? '')
              .filter(Boolean),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [colleagues],
  );

  const filteredColleagues = useMemo(
    () =>
      colleagues.filter((colleague) => {
        if (department !== 'All' && colleague.department.name !== department) {
          return false;
        }

        if (
          (process !== 'All' || refresherStatus !== 'All') &&
          !colleague.competencies.some(
            (competency) =>
              (process === 'All' || competency.processName === process) &&
              (refresherStatus === 'All' ||
                competency.refresherStatus === refresherStatus),
          )
        ) {
          return false;
        }

        if (status === 'Active') {
          return !colleague.archived;
        }

        if (status === 'Archived') {
          return colleague.archived;
        }

        return true;
      }),
    [colleagues, department, process, refresherStatus, status],
  );

  function toggleColleague(colleagueId: number) {
    setExpandedColleagueIds((current) =>
      current.includes(colleagueId)
        ? current.filter((id) => id !== colleagueId)
        : [...current, colleagueId],
    );
  }

  async function reloadColleagues() {
    setColleagues(await fetchColleagues());
  }

  function defaultAssessor(competency: ColleagueCompetency) {
    return (
      validAssessor(competency.assignedAssessor) ||
      validAssessor(competency.traineeTrainingAssessor)
    );
  }

  function closeRefresherActionForms() {
    setRefresherScheduleTarget(null);
    setRefresherScheduleForm({
      scheduledRefresherDate: '',
      assignedAssessor: '',
    });
    setRefresherCompletionTarget(null);
    setRefresherCompletionForm({
      completedDate: todayInputValue(),
      outcome: completionOutcomes[0],
    });
    setRefresherMoveTarget(null);
    setRefresherMoveForm({
      newScheduledDate: '',
      deviationReason: '',
    });
    setRefresherActionError('');
    setScheduleError('');
  }

  function openScheduleRefresher(
    colleagueName: string,
    competency: ColleagueCompetency,
  ) {
    closeRefresherActionForms();
    setAssessmentScheduleTarget(null);
    setRefresherScheduleTarget({ colleagueName, competency });
    setRefresherScheduleForm({
      scheduledRefresherDate:
        competency.scheduleStatus === 'Scheduled'
          ? dateInputValue(competency.scheduledRefresherDate)
          : '',
      assignedAssessor: defaultAssessor(competency),
    });
    setOpenActionMenuId(null);
    setScheduleError('');
  }

  function closeScheduleRefresher() {
    setRefresherScheduleTarget(null);
    setRefresherScheduleForm({
      scheduledRefresherDate: '',
      assignedAssessor: '',
    });
    setScheduleError('');
  }

  function openCompleteRefresher(
    colleagueName: string,
    competency: ColleagueCompetency,
  ) {
    closeRefresherActionForms();
    setAssessmentScheduleTarget(null);
    setRefresherCompletionTarget({ colleagueName, competency });
    setRefresherCompletionForm({
      completedDate: todayInputValue(),
      outcome: completionOutcomes[0],
    });
    setOpenActionMenuId(null);
  }

  function closeCompleteRefresher() {
    setRefresherCompletionTarget(null);
    setRefresherCompletionForm({
      completedDate: todayInputValue(),
      outcome: completionOutcomes[0],
    });
    setRefresherActionError('');
  }

  function openMoveRefresher(
    action: RefresherMoveAction,
    colleagueName: string,
    competency: ColleagueCompetency,
  ) {
    closeRefresherActionForms();
    setAssessmentScheduleTarget(null);
    setRefresherMoveTarget({ action, colleagueName, competency });
    setRefresherMoveForm({
      newScheduledDate:
        action === 'carryOver'
          ? nextWeekInputValue(competency.scheduledRefresherDate)
          : '',
      deviationReason: '',
    });
    setOpenActionMenuId(null);
  }

  function closeMoveRefresher() {
    setRefresherMoveTarget(null);
    setRefresherMoveForm({
      newScheduledDate: '',
      deviationReason: '',
    });
    setRefresherActionError('');
  }

  function openScheduleAssessment(
    colleagueName: string,
    competency: ColleagueCompetency,
  ) {
    closeRefresherActionForms();
    setRefresherScheduleTarget(null);
    setAssessmentScheduleTarget({ colleagueName, competency });
    setAssessmentScheduleForm({
      scheduledPreAssessmentDate: dateInputValue(
        competency.scheduledPreAssessmentDate,
      ),
      scheduledAssessmentDate: dateInputValue(
        competency.scheduledAssessmentDate,
      ),
      assignedAssessor: defaultAssessor(competency),
    });
    setScheduleError('');
  }

  function closeScheduleAssessment() {
    setAssessmentScheduleTarget(null);
    setAssessmentScheduleForm({
      scheduledPreAssessmentDate: '',
      scheduledAssessmentDate: '',
      assignedAssessor: '',
    });
    setScheduleError('');
  }

  function hasInvalidAssessmentDateOrder(form: AssessmentScheduleForm) {
    return (
      form.scheduledPreAssessmentDate !== '' &&
      form.scheduledAssessmentDate !== '' &&
      form.scheduledAssessmentDate < form.scheduledPreAssessmentDate
    );
  }

  async function saveScheduleRefresher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!refresherScheduleTarget) {
      return;
    }

    setScheduleError('');

    if (!refresherScheduleForm.scheduledRefresherDate) {
      setScheduleError('Scheduled refresher date is required.');
      return;
    }

    setSavingSchedule(true);

    try {
      const response = await fetch('/api/refreshers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          traineeProcessId:
            refresherScheduleTarget.competency.traineeProcessId,
          scheduledRefresherDate:
            refresherScheduleForm.scheduledRefresherDate,
          assignedAssessor:
            refresherScheduleForm.assignedAssessor || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to schedule refresher.');
      }

      await reloadColleagues();
      closeScheduleRefresher();
    } catch (caught) {
      setScheduleError(
        caught instanceof Error
          ? caught.message
          : 'Failed to schedule refresher.',
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  async function saveCompleteRefresher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!refresherCompletionTarget?.competency.refresherRecordId) {
      setRefresherActionError('Select a scheduled refresher to complete.');
      return;
    }

    setRefresherActionError('');

    if (
      !refresherCompletionForm.completedDate ||
      !refresherCompletionForm.outcome
    ) {
      setRefresherActionError('Completed date and outcome are required.');
      return;
    }

    setSavingRefresherAction(true);

    try {
      const response = await fetch(
        `/api/refreshers/${refresherCompletionTarget.competency.refresherRecordId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            completedDate: refresherCompletionForm.completedDate,
            outcome: refresherCompletionForm.outcome,
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to complete refresher.');
      }

      await reloadColleagues();
      closeCompleteRefresher();
    } catch (caught) {
      setRefresherActionError(
        caught instanceof Error
          ? caught.message
          : 'Failed to complete refresher.',
      );
    } finally {
      setSavingRefresherAction(false);
    }
  }

  async function saveMoveRefresher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!refresherMoveTarget?.competency.refresherRecordId) {
      setRefresherActionError('Select a scheduled refresher to update.');
      return;
    }

    setRefresherActionError('');

    if (!refresherMoveForm.newScheduledDate) {
      setRefresherActionError('New scheduled date is required.');
      return;
    }

    if (!refresherMoveForm.deviationReason.trim()) {
      setRefresherActionError('Deviation reason is required.');
      return;
    }

    setSavingRefresherAction(true);

    try {
      const response = await fetch(
        `/api/refreshers/${refresherMoveTarget.competency.refresherRecordId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: refresherMoveTarget.action,
            newScheduledDate: refresherMoveForm.newScheduledDate,
            deviationReason: refresherMoveForm.deviationReason.trim(),
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to update refresher.');
      }

      await reloadColleagues();
      closeMoveRefresher();
    } catch (caught) {
      setRefresherActionError(
        caught instanceof Error
          ? caught.message
          : 'Failed to update refresher.',
      );
    } finally {
      setSavingRefresherAction(false);
    }
  }

  async function saveScheduleAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!assessmentScheduleTarget) {
      return;
    }

    setScheduleError('');

    if (hasInvalidAssessmentDateOrder(assessmentScheduleForm)) {
      setScheduleError(assessmentDateOrderError);
      return;
    }

    setSavingSchedule(true);

    try {
      const response = await fetch(
        `/api/training-pipeline/${assessmentScheduleTarget.competency.traineeProcessId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduledPreAssessmentDate:
              assessmentScheduleForm.scheduledPreAssessmentDate || null,
            scheduledAssessmentDate:
              assessmentScheduleForm.scheduledAssessmentDate || null,
            assignedAssessor:
              assessmentScheduleForm.assignedAssessor || null,
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to schedule assessment.');
      }

      await reloadColleagues();
      closeScheduleAssessment();
    } catch (caught) {
      setScheduleError(
        caught instanceof Error
          ? caught.message
          : 'Failed to schedule assessment.',
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Colleagues
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Competency and refresher overview.
          </h2>
          <p className="mt-2 text-slate-600">
            Manage current colleague competency coverage and upcoming
            refresher needs.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          >
            <option value="All">All Departments</option>
            {departments.map((option) => (
              <option key={option.id}>{option.name}</option>
            ))}
          </select>
          <select
            value={process}
            onChange={(event) => setProcess(event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          >
            <option value="All">All Processes</option>
            {processOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            value={refresherStatus}
            onChange={(event) => setRefresherStatus(event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          >
            <option value="All">All Refresher Statuses</option>
            {refresherStatusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          >
            <option>Active</option>
            <option>Archived</option>
            <option>All</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 text-left">Colleague Name</th>
              <th className="pb-3 text-left">Department</th>
              <th className="pb-3 text-left">Shift</th>
              <th className="pb-3 text-center">Competent Processes</th>
              <th className="pb-3 text-center">Refreshers Due</th>
              <th className="pb-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredColleagues.map((colleague) => {
              const isExpanded = expandedColleagueIds.includes(colleague.id);
              const visibleCompetencies = colleague.competencies.filter(
                (competency) =>
                  (process === 'All' ||
                    competency.processName === process) &&
                  (refresherStatus === 'All' ||
                    competency.refresherStatus === refresherStatus),
              );

              return (
                <Fragment key={colleague.id}>
                  <tr className="border-t border-slate-100 align-top">
                    <td className="py-3 font-medium text-slate-900">
                      <div className="flex flex-col items-start gap-2">
                        <span>{colleague.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleColleague(colleague.id)}
                          aria-expanded={isExpanded}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"
                        >
                          {isExpanded ? 'Hide competencies' : 'View competencies'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3">{colleague.department.name}</td>
                    <td className="py-3">{colleague.shift || '-'}</td>
                    <td className="py-3 text-center">
                      {colleague.competentProcessCount}
                    </td>
                    <td className="py-3 text-center">
                      {colleague.refreshersDueCount}
                    </td>
                    <td className="py-3 text-center">{colleague.status}</td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-t border-slate-100 bg-slate-50/70">
                      <td className="py-4" colSpan={6}>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                          <table className="min-w-full text-sm">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="px-4 py-3 text-left">Process</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">
                                  Competency Sign-off Date
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Next Refresher Due
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Refresher Status
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleCompetencies.map((competency) => {
                                const isSchedulingRefresher =
                                  refresherScheduleTarget?.competency
                                    .traineeProcessId ===
                                  competency.traineeProcessId;
                                const isSchedulingAssessment =
                                  assessmentScheduleTarget?.competency
                                    .traineeProcessId ===
                                  competency.traineeProcessId;
                                const isCompletingRefresher =
                                  refresherCompletionTarget?.competency
                                    .traineeProcessId ===
                                  competency.traineeProcessId;
                                const isMovingRefresher =
                                  refresherMoveTarget?.competency
                                    .traineeProcessId ===
                                  competency.traineeProcessId;
                                const isScheduledRefresher =
                                  competency.scheduleStatus === 'Scheduled' &&
                                  competency.scheduledRefresherDate !== null;
                                const isCompletedRefresher =
                                  competency.scheduleStatus === 'Completed';
                                const hasOpenMenu =
                                  openActionMenuId ===
                                  competency.traineeProcessId;

                                return (
                                  <Fragment key={competency.traineeProcessId}>
                                    <tr className="border-t border-slate-100">
                                      <td className="px-4 py-3 font-medium text-slate-900">
                                        {competency.processName}
                                      </td>
                                      <td className="px-4 py-3">
                                        {competencyStatus(competency)}
                                      </td>
                                      <td className="px-4 py-3">
                                        {formatDate(
                                          competency.competencySignOffDate,
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        {formatDate(competency.refresherDueDate)}
                                      </td>
                                      <td className="px-4 py-3">
                                        {competency.refresherStatus ? (
                                          <div className="flex flex-wrap gap-2">
                                            <span
                                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${refresherStatusClass(
                                                competency.refresherStatus,
                                              )}`}
                                            >
                                              {competency.refresherStatus}
                                            </span>
                                            {competency.scheduleStatus ===
                                            'Scheduled' ? (
                                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                                Scheduled
                                              </span>
                                            ) : null}
                                          </div>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        {isCompetentSignedOff(competency) ? (
                                          <div className="relative inline-block">
                                            <button
                                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                                              type="button"
                                              aria-expanded={hasOpenMenu}
                                              onClick={() =>
                                                setOpenActionMenuId((current) =>
                                                  current ===
                                                  competency.traineeProcessId
                                                    ? null
                                                    : competency.traineeProcessId,
                                                )
                                              }
                                            >
                                              Actions
                                            </button>
                                            {hasOpenMenu ? (
                                              <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                                {!isScheduledRefresher ||
                                                isCompletedRefresher ? (
                                                  <button
                                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                                                    type="button"
                                                    onClick={() =>
                                                      openScheduleRefresher(
                                                        colleague.name,
                                                        competency,
                                                      )
                                                    }
                                                  >
                                                    Schedule Refresher
                                                  </button>
                                                ) : (
                                                  <>
                                                    <button
                                                      className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                                      type="button"
                                                      onClick={() =>
                                                        openCompleteRefresher(
                                                          colleague.name,
                                                          competency,
                                                        )
                                                      }
                                                    >
                                                      Complete Refresher
                                                    </button>
                                                    <button
                                                      className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                                                      type="button"
                                                      onClick={() =>
                                                        openMoveRefresher(
                                                          'defer',
                                                          colleague.name,
                                                          competency,
                                                        )
                                                      }
                                                    >
                                                      Defer Refresher
                                                    </button>
                                                    <button
                                                      className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                                                      type="button"
                                                      onClick={() =>
                                                        openMoveRefresher(
                                                          'carryOver',
                                                          colleague.name,
                                                          competency,
                                                        )
                                                      }
                                                    >
                                                      Carry Over Refresher
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <button
                                            className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                                            type="button"
                                            onClick={() =>
                                              openScheduleAssessment(
                                                colleague.name,
                                                competency,
                                              )
                                            }
                                          >
                                            Schedule Assessment
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                    {isSchedulingAssessment ? (
                                      <tr className="border-t border-slate-100 bg-violet-50/40">
                                        <td className="px-4 py-4" colSpan={6}>
                                          <form
                                            className="space-y-3"
                                            onSubmit={saveScheduleAssessment}
                                          >
                                            <div>
                                              <p className="font-medium text-slate-900">
                                                Schedule assessment dates
                                              </p>
                                              <p className="text-sm text-slate-600">
                                                {
                                                  assessmentScheduleTarget
                                                    .colleagueName
                                                }{' '}
                                                - {competency.processName}
                                              </p>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-3">
                                              <label className="space-y-2 text-sm">
                                                <span>
                                                  Scheduled Pre-Assessment Date
                                                </span>
                                                <input
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  type="date"
                                                  value={
                                                    assessmentScheduleForm.scheduledPreAssessmentDate
                                                  }
                                                  onChange={(event) =>
                                                    setAssessmentScheduleForm(
                                                      (current) => ({
                                                        ...current,
                                                        scheduledPreAssessmentDate:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label className="space-y-2 text-sm">
                                                <span>
                                                  Scheduled Assessment Date
                                                </span>
                                                <input
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  type="date"
                                                  value={
                                                    assessmentScheduleForm.scheduledAssessmentDate
                                                  }
                                                  onChange={(event) =>
                                                    setAssessmentScheduleForm(
                                                      (current) => ({
                                                        ...current,
                                                        scheduledAssessmentDate:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label className="space-y-2 text-sm">
                                                <span>Assigned Assessor</span>
                                                <select
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  value={
                                                    assessmentScheduleForm.assignedAssessor
                                                  }
                                                  onChange={(event) =>
                                                    setAssessmentScheduleForm(
                                                      (current) => ({
                                                        ...current,
                                                        assignedAssessor:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                >
                                                  <option value="">
                                                    Select assessor
                                                  </option>
                                                  {trainingAssessors.map(
                                                    (name) => (
                                                      <option
                                                        key={name}
                                                        value={name}
                                                      >
                                                        {name}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                              </label>
                                            </div>
                                            {scheduleError ? (
                                              <p className="text-sm text-red-600">
                                                {scheduleError}
                                              </p>
                                            ) : null}
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                disabled={savingSchedule}
                                                type="submit"
                                              >
                                                {savingSchedule
                                                  ? 'Saving...'
                                                  : 'Save Schedule'}
                                              </button>
                                              <button
                                                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                                disabled={savingSchedule}
                                                type="button"
                                                onClick={closeScheduleAssessment}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </form>
                                        </td>
                                      </tr>
                                    ) : null}
                                    {isSchedulingRefresher ? (
                                      <tr className="border-t border-slate-100 bg-sky-50/40">
                                        <td className="px-4 py-4" colSpan={6}>
                                          <form
                                            className="space-y-3"
                                            onSubmit={saveScheduleRefresher}
                                          >
                                            <div>
                                              <p className="font-medium text-slate-900">
                                                Schedule refresher
                                              </p>
                                              <p className="text-sm text-slate-600">
                                                {
                                                  refresherScheduleTarget
                                                    .colleagueName
                                                }{' '}
                                                - {competency.processName}
                                              </p>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                              <label className="space-y-2 text-sm">
                                                <span>
                                                  Scheduled Refresher Date
                                                </span>
                                                <input
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  type="date"
                                                  value={
                                                    refresherScheduleForm.scheduledRefresherDate
                                                  }
                                                  onChange={(event) =>
                                                    setRefresherScheduleForm(
                                                      (current) => ({
                                                        ...current,
                                                        scheduledRefresherDate:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label className="space-y-2 text-sm">
                                                <span>Assigned Assessor</span>
                                                <select
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  value={
                                                    refresherScheduleForm.assignedAssessor
                                                  }
                                                  onChange={(event) =>
                                                    setRefresherScheduleForm(
                                                      (current) => ({
                                                        ...current,
                                                        assignedAssessor:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                >
                                                  <option value="">
                                                    Select assessor
                                                  </option>
                                                  {trainingAssessors.map(
                                                    (name) => (
                                                      <option
                                                        key={name}
                                                        value={name}
                                                      >
                                                        {name}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                              </label>
                                            </div>
                                            {scheduleError ? (
                                              <p className="text-sm text-red-600">
                                                {scheduleError}
                                              </p>
                                            ) : null}
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                disabled={savingSchedule}
                                                type="submit"
                                              >
                                                {savingSchedule
                                                  ? 'Saving...'
                                                  : 'Save Refresher'}
                                              </button>
                                              <button
                                                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                                disabled={savingSchedule}
                                                type="button"
                                                onClick={closeScheduleRefresher}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </form>
                                        </td>
                                      </tr>
                                    ) : null}
                                    {isCompletingRefresher ? (
                                      <tr className="border-t border-slate-100 bg-emerald-50/40">
                                        <td className="px-4 py-4" colSpan={6}>
                                          <form
                                            className="space-y-3"
                                            onSubmit={saveCompleteRefresher}
                                          >
                                            <div>
                                              <p className="font-medium text-slate-900">
                                                Complete refresher
                                              </p>
                                              <p className="text-sm text-slate-600">
                                                {
                                                  refresherCompletionTarget
                                                    ?.colleagueName
                                                }{' '}
                                                - {competency.processName}
                                              </p>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                              <label className="space-y-2 text-sm">
                                                <span>Completed Date</span>
                                                <input
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  type="date"
                                                  value={
                                                    refresherCompletionForm.completedDate
                                                  }
                                                  onChange={(event) =>
                                                    setRefresherCompletionForm(
                                                      (current) => ({
                                                        ...current,
                                                        completedDate:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label className="space-y-2 text-sm">
                                                <span>Outcome</span>
                                                <select
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  value={
                                                    refresherCompletionForm.outcome
                                                  }
                                                  onChange={(event) =>
                                                    setRefresherCompletionForm(
                                                      (current) => ({
                                                        ...current,
                                                        outcome:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                >
                                                  {completionOutcomes.map(
                                                    (value) => (
                                                      <option key={value}>
                                                        {value}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                              </label>
                                            </div>
                                            {refresherActionError ? (
                                              <p className="text-sm text-red-600">
                                                {refresherActionError}
                                              </p>
                                            ) : null}
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                disabled={savingRefresherAction}
                                                type="submit"
                                              >
                                                {savingRefresherAction
                                                  ? 'Saving...'
                                                  : 'Save Completion'}
                                              </button>
                                              <button
                                                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                                disabled={savingRefresherAction}
                                                type="button"
                                                onClick={closeCompleteRefresher}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </form>
                                        </td>
                                      </tr>
                                    ) : null}
                                    {isMovingRefresher ? (
                                      <tr className="border-t border-slate-100 bg-amber-50/40">
                                        <td className="px-4 py-4" colSpan={6}>
                                          <form
                                            className="space-y-3"
                                            onSubmit={saveMoveRefresher}
                                          >
                                            <div>
                                              <p className="font-medium text-slate-900">
                                                {refresherMoveTarget?.action ===
                                                'defer'
                                                  ? 'Defer refresher'
                                                  : 'Carry over refresher'}
                                              </p>
                                              <p className="text-sm text-slate-600">
                                                {
                                                  refresherMoveTarget
                                                    ?.colleagueName
                                                }{' '}
                                                - {competency.processName}
                                              </p>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                              <label className="space-y-2 text-sm">
                                                <span>New Scheduled Date</span>
                                                <input
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  type="date"
                                                  value={
                                                    refresherMoveForm.newScheduledDate
                                                  }
                                                  onChange={(event) =>
                                                    setRefresherMoveForm(
                                                      (current) => ({
                                                        ...current,
                                                        newScheduledDate:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label className="space-y-2 text-sm">
                                                <span>Deviation Reason</span>
                                                <input
                                                  className="w-full rounded-xl border border-slate-200 p-3"
                                                  type="text"
                                                  value={
                                                    refresherMoveForm.deviationReason
                                                  }
                                                  onChange={(event) =>
                                                    setRefresherMoveForm(
                                                      (current) => ({
                                                        ...current,
                                                        deviationReason:
                                                          event.target.value,
                                                      }),
                                                    )
                                                  }
                                                />
                                              </label>
                                            </div>
                                            {refresherActionError ? (
                                              <p className="text-sm text-red-600">
                                                {refresherActionError}
                                              </p>
                                            ) : null}
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                disabled={savingRefresherAction}
                                                type="submit"
                                              >
                                                {savingRefresherAction
                                                  ? 'Saving...'
                                                  : 'Save Change'}
                                              </button>
                                              <button
                                                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                                disabled={savingRefresherAction}
                                                type="button"
                                                onClick={closeMoveRefresher}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </form>
                                        </td>
                                      </tr>
                                    ) : null}
                                  </Fragment>
                                );
                              })}
                              {visibleCompetencies.length === 0 ? (
                                <tr>
                                  <td
                                    className="px-4 py-6 text-sm text-slate-500"
                                    colSpan={6}
                                  >
                                    No active competencies assigned.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {filteredColleagues.length === 0 ? (
              <tr>
                <td className="py-6 text-sm text-slate-500" colSpan={6}>
                  No colleagues found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
