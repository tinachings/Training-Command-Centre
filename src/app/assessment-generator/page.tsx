'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  assessmentOutcomes,
  buildAssessmentSummary,
  buildTeamLeaderEmail,
  competencyOptions,
  nextActions,
  preAssessmentOutcomes,
  type AssessmentReportDraft,
  type AssessmentType,
  type CompetencyEvaluation,
} from '@/lib/assessment-report';
import { exportCompetencyAssessmentRecord } from '@/lib/export';

type AssignmentOption = {
  traineeProcessId: number;
  processId: number;
  processName: string;
  assignedAssessor: string | null;
};

type TraineeOption = {
  id: number;
  name: string;
  teamLeader: string | null;
  trainingAssessor: string | null;
  departmentName: string;
  assignments: AssignmentOption[];
};

type GeneratorData = {
  trainees: TraineeOption[];
  recordCount: number;
};

const steps = [
  'Assessment Details',
  'Competency Evaluation',
  'Positive Observations',
  'Gaps Identified',
  'Development Actions',
  'Outcome & Next Action',
  'Assessment Summary',
  'Preview & Generate',
];

const today = () => new Date().toISOString().slice(0, 10);

function formatDisplayDate(value: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function blankCompetency(): CompetencyEvaluation {
  return {
    safety: 'Competent',
    process: 'Competent',
    quality: 'Competent',
    operational: 'Competent',
    behavioural: 'Competent',
  };
}

export default function AssessmentGeneratorPage() {
  const [trainees, setTrainees] = useState<TraineeOption[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [step, setStep] = useState(1);
  const [traineeId, setTraineeId] = useState('');
  const [traineeProcessId, setTraineeProcessId] = useState('');
  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>('Pre-Assessment');
  const [assessmentDate, setAssessmentDate] = useState(today());
  const [assessor, setAssessor] = useState('');
  const [competency, setCompetency] =
    useState<CompetencyEvaluation>(blankCompetency());
  const [positiveObservations, setPositiveObservations] = useState(['']);
  const [gapsIdentified, setGapsIdentified] = useState(['']);
  const [developmentActions, setDevelopmentActions] = useState(['']);
  const [assessmentOutcome, setAssessmentOutcome] =
    useState('Ready for Assessment');
  const [nextAction, setNextAction] = useState('Proceed to Assessment');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [assessmentSummary, setAssessmentSummary] = useState('');
  const [finalised, setFinalised] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [copyState, setCopyState] = useState('Copy TL Email');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/assessment-generator', {
          cache: 'no-store',
        });

        if (!response.ok) throw new Error();

        const data = (await response.json()) as GeneratorData;

        if (cancelled) return;

        setTrainees(data.trainees);
        setRecordCount(data.recordCount);

        const first = data.trainees[0];
        if (first) {
          setTraineeId(String(first.id));
          const assignment = first.assignments[0];
          if (assignment) {
            setTraineeProcessId(String(assignment.traineeProcessId));
            setAssessor(
              assignment.assignedAssessor ||
                first.trainingAssessor ||
                'Training Assessor',
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load assessment options.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTrainee = useMemo(
    () => trainees.find((item) => item.id === Number(traineeId)) ?? null,
    [traineeId, trainees],
  );

  const selectedAssignment = useMemo(
    () =>
      selectedTrainee?.assignments.find(
        (item) => item.traineeProcessId === Number(traineeProcessId),
      ) ?? null,
    [selectedTrainee, traineeProcessId],
  );

  const draft = useMemo<AssessmentReportDraft>(
    () => ({
      assessmentType,
      teamLeader: selectedTrainee?.teamLeader ?? '',
      colleagueName: selectedTrainee?.name ?? '',
      department: selectedTrainee?.departmentName ?? '',
      process: selectedAssignment?.processName ?? '',
      assessmentDate,
      assessor,
      competency,
      positiveObservations,
      gapsIdentified,
      developmentActions,
      assessmentOutcome,
      nextAction,
      targetCompletionDate,
      assessmentSummary,
    }),
    [
      assessmentType,
      selectedTrainee,
      selectedAssignment,
      assessmentDate,
      assessor,
      competency,
      positiveObservations,
      gapsIdentified,
      developmentActions,
      assessmentOutcome,
      nextAction,
      targetCompletionDate,
      assessmentSummary,
    ],
  );

  const tlEmail = useMemo(
    () => buildTeamLeaderEmail(draft),
    [draft],
  );

  function changeTrainee(value: string) {
    const trainee = trainees.find((item) => item.id === Number(value));
    const assignment = trainee?.assignments[0];

    setTraineeId(value);
    setTraineeProcessId(
      assignment ? String(assignment.traineeProcessId) : '',
    );
    setAssessor(
      assignment?.assignedAssessor ||
        trainee?.trainingAssessor ||
        'Training Assessor',
    );
    setFinalised(false);
  }

  function changeAssignment(value: string) {
    const assignment = selectedTrainee?.assignments.find(
      (item) => item.traineeProcessId === Number(value),
    );

    setTraineeProcessId(value);
    setAssessor(
      assignment?.assignedAssessor ||
        selectedTrainee?.trainingAssessor ||
        'Training Assessor',
    );
    setFinalised(false);
  }

  function changeType(value: AssessmentType) {
    setAssessmentType(value);
    if (value === 'Pre-Assessment') {
      setAssessmentOutcome('Ready for Assessment');
      setNextAction('Proceed to Assessment');
    } else {
      setAssessmentOutcome('Competent – Recommend Sign-Off');
      setNextAction('Recommend Sign-Off');
    }
    setFinalised(false);
  }

  function updateList(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) {
    setter((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
    setFinalised(false);
  }

  function addListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter((current) => [...current, '']);
    setFinalised(false);
  }

  function removeListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) {
    setter((current) =>
      current.length === 1
        ? ['']
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
    setFinalised(false);
  }

  function regenerateSummary() {
    const generated = buildAssessmentSummary({
      ...draft,
      assessmentSummary: undefined as never,
    });
    setAssessmentSummary(generated);
    setFinalised(false);
  }

  function goNext() {
    setError('');

    if (step === 1 && (!selectedTrainee || !selectedAssignment)) {
      setError('Select a colleague and one of their assigned processes.');
      return;
    }

    if (step === 7 && !assessmentSummary.trim()) {
      regenerateSummary();
    }

    setStep((current) => Math.min(8, current + 1));
  }

  function goBack() {
    setError('');
    setStep((current) => Math.max(1, current - 1));
  }

  async function finaliseAssessment() {
    if (!selectedTrainee || !selectedAssignment) {
      setError('Select a colleague and process before finalising.');
      return;
    }

    if (!assessmentSummary.trim()) {
      setError('Generate or enter the assessment summary before finalising.');
      return;
    }

    setFinalising(true);
    setError('');

    try {
      const response = await fetch('/api/assessment-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeId: selectedTrainee.id,
          traineeProcessId: selectedAssignment.traineeProcessId,
          assessmentType,
          assessmentDate,
          assessor,
          competency,
          positiveObservations,
          gapsIdentified,
          developmentActions,
          assessmentOutcome,
          nextAction,
          targetCompletionDate: targetCompletionDate || null,
          assessmentSummary,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to finalise assessment.');
      }

      setFinalised(true);
      setRecordCount((current) => current + 1);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to finalise assessment.',
      );
    } finally {
      setFinalising(false);
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(tlEmail);
      setCopyState('Copied');
      window.setTimeout(() => setCopyState('Copy TL Email'), 1500);
    } catch {
      setError('Unable to copy the Team Leader email.');
    }
  }

  async function downloadRecord() {
    await exportCompetencyAssessmentRecord({
      colleagueName: draft.colleagueName,
      department: draft.department,
      process: draft.process,
      assessmentType: draft.assessmentType,
      assessmentDate: formatDisplayDate(draft.assessmentDate),
      assessor: draft.assessor,
      teamLeader: draft.teamLeader,
      competency: draft.competency,
      positiveObservations: draft.positiveObservations,
      gapsIdentified: draft.gapsIdentified,
      developmentActions: draft.developmentActions,
      assessmentOutcome: draft.assessmentOutcome,
      nextAction: draft.nextAction,
      targetCompletionDate: draft.targetCompletionDate
        ? formatDisplayDate(draft.targetCompletionDate)
        : '',
      assessmentSummary: draft.assessmentSummary,
    });
  }

  function resetForm() {
    setStep(1);
    setAssessmentType('Pre-Assessment');
    setAssessmentDate(today());
    setCompetency(blankCompetency());
    setPositiveObservations(['']);
    setGapsIdentified(['']);
    setDevelopmentActions(['']);
    setAssessmentOutcome('Ready for Assessment');
    setNextAction('Proceed to Assessment');
    setTargetCompletionDate('');
    setAssessmentSummary('');
    setFinalised(false);
    setError('');
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading assessment generator...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Assessment workflow
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Training Assessor Report Generator
        </h2>
        <p className="mt-2 text-slate-600">
          Generate a copy-ready Team Leader email and a downloadable competency
          assessment record.
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Step {step} of 8: {steps[step - 1]}
        </p>
      </section>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 ? (
          <div>
            <h3 className="text-xl font-semibold">Assessment Details</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Team Leader name
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3"
                  value={selectedTrainee?.teamLeader ?? ''}
                  readOnly
                />
              </label>
              <label className="text-sm">
                Colleague name
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={traineeId}
                  onChange={(event) => changeTrainee(event.target.value)}
                >
                  {trainees.map((trainee) => (
                    <option key={trainee.id} value={trainee.id}>
                      {trainee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Department
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3"
                  value={selectedTrainee?.departmentName ?? ''}
                  readOnly
                />
              </label>
              <label className="text-sm">
                Process assessed
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={traineeProcessId}
                  onChange={(event) => changeAssignment(event.target.value)}
                >
                  {(selectedTrainee?.assignments ?? []).map((assignment) => (
                    <option
                      key={assignment.traineeProcessId}
                      value={assignment.traineeProcessId}
                    >
                      {assignment.processName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Assessment type
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={assessmentType}
                  onChange={(event) =>
                    changeType(event.target.value as AssessmentType)
                  }
                >
                  <option>Pre-Assessment</option>
                  <option>Assessment</option>
                </select>
              </label>
              <label className="text-sm">
                Assessment date
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={assessmentDate}
                  onChange={(event) => {
                    setAssessmentDate(event.target.value);
                    setFinalised(false);
                  }}
                />
              </label>
              <label className="text-sm">
                Assessor name
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={assessor}
                  onChange={(event) => {
                    setAssessor(event.target.value);
                    setFinalised(false);
                  }}
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h3 className="text-xl font-semibold">Competency Evaluation</h3>
            <div className="mt-5 space-y-4">
              {(
                [
                  ['safety', 'Safety Competence'],
                  ['process', 'Process Competence'],
                  ['quality', 'Quality Competence'],
                  ['operational', 'Operational Competence'],
                  ['behavioural', 'Behavioural Competence'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                    value={competency[key]}
                    onChange={(event) => {
                      setCompetency((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }));
                      setFinalised(false);
                    }}
                  >
                    {competencyOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <DynamicListStep
            title="Positive Observations"
            buttonLabel="Add Positive Observation"
            items={positiveObservations}
            onChange={(index, value) =>
              updateList(setPositiveObservations, index, value)
            }
            onAdd={() => addListItem(setPositiveObservations)}
            onRemove={(index) =>
              removeListItem(setPositiveObservations, index)
            }
          />
        ) : null}

        {step === 4 ? (
          <DynamicListStep
            title="Gaps Identified"
            helper="Leave blank to use: No significant competency gaps identified."
            buttonLabel="Add Gap"
            items={gapsIdentified}
            onChange={(index, value) =>
              updateList(setGapsIdentified, index, value)
            }
            onAdd={() => addListItem(setGapsIdentified)}
            onRemove={(index) => removeListItem(setGapsIdentified, index)}
          />
        ) : null}

        {step === 5 ? (
          <DynamicListStep
            title="Development Actions"
            helper="Leave blank to use: No development actions required."
            buttonLabel="Add Development Action"
            items={developmentActions}
            onChange={(index, value) =>
              updateList(setDevelopmentActions, index, value)
            }
            onAdd={() => addListItem(setDevelopmentActions)}
            onRemove={(index) => removeListItem(setDevelopmentActions, index)}
          />
        ) : null}

        {step === 6 ? (
          <div>
            <h3 className="text-xl font-semibold">Outcome & Next Action</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Assessment outcome
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={assessmentOutcome}
                  onChange={(event) => {
                    setAssessmentOutcome(event.target.value);
                    setFinalised(false);
                  }}
                >
                  {(assessmentType === 'Pre-Assessment'
                    ? preAssessmentOutcomes
                    : assessmentOutcomes
                  ).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Next action
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={nextAction}
                  onChange={(event) => {
                    setNextAction(event.target.value);
                    setFinalised(false);
                  }}
                >
                  {nextActions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Target completion date
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={targetCompletionDate}
                  onChange={(event) => {
                    setTargetCompletionDate(event.target.value);
                    setFinalised(false);
                  }}
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 7 ? (
          <div>
            <h3 className="text-xl font-semibold">Assessment Summary</h3>
            <button
              type="button"
              onClick={regenerateSummary}
              className="mt-5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Regenerate draft summary
            </button>
            <textarea
              className="mt-3 min-h-52 w-full rounded-xl border border-slate-200 p-3"
              value={assessmentSummary}
              onChange={(event) => {
                setAssessmentSummary(event.target.value);
                setFinalised(false);
              }}
              placeholder="Generate or enter the assessment summary."
            />
          </div>
        ) : null}

        {step === 8 ? (
          <div>
            <h3 className="text-xl font-semibold">Preview & Generate</h3>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <article>
                <h4 className="font-semibold">Team Leader Email Preview</h4>
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">
                  {tlEmail}
                </pre>
              </article>

              <article>
                <h4 className="font-semibold">Competency Record Preview</h4>
                <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><strong>Colleague:</strong> {draft.colleagueName}</p>
                    <p><strong>Department:</strong> {draft.department}</p>
                    <p><strong>Process:</strong> {draft.process}</p>
                    <p><strong>Type:</strong> {draft.assessmentType}</p>
                    <p><strong>Date:</strong> {formatDisplayDate(draft.assessmentDate)}</p>
                    <p><strong>Assessor:</strong> {draft.assessor}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Positive Observations</p>
                    <p className="mt-1">
                      {draft.positiveObservations.filter(Boolean).join(' • ') ||
                        'None recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Outcome</p>
                    <p className="mt-1">
                      {draft.assessmentOutcome} · {draft.nextAction}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Assessment Summary</p>
                    <p className="mt-1 leading-6">{draft.assessmentSummary}</p>
                  </div>
                </div>
              </article>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Assessment records available: {recordCount}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {finalised
                      ? 'Assessment finalised and saved to Assessment Records.'
                      : 'Review the outputs, then finalise the assessment before copying or downloading.'}
                  </p>
                </div>
                {!finalised ? (
                  <button
                    type="button"
                    onClick={() => void finaliseAssessment()}
                    disabled={finalising}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {finalising ? 'Finalising...' : 'Finalise Assessment'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                disabled={!finalised}
                onClick={() => void copyEmail()}
                className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copyState}
              </button>
              <button
                type="button"
                disabled={!finalised}
                onClick={() => void downloadRecord()}
                className="rounded-xl bg-blue-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download Competency Assessment Record
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700"
              >
                Reset Form
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-7 flex justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Back
          </button>
          {step < 8 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white"
            >
              Next
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function DynamicListStep({
  title,
  helper,
  buttonLabel,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  helper?: string;
  buttonLabel: string;
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {helper ? <p className="mt-3 text-sm text-slate-500">{helper}</p> : null}
      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3"
              value={item}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={`${title.replace(/s$/, '')} ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
