'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type AssignmentOption = {
  traineeProcessId: number;
  processId: number;
  processName: string;
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

type CreatedAssessment = {
  assessmentRecord: {
    id: number;
    assessmentType: string;
    date: string;
    assessor: string;
    outcome: string;
    strengths: string | null;
    developmentAreas: string | null;
  };
  trainee: {
    id: number;
    name: string;
    departmentName: string;
  };
  process: {
    name: string;
  };
};

export default function AssessmentGeneratorPage() {
  const [trainees, setTrainees] = useState<TraineeOption[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [traineeId, setTraineeId] = useState('');
  const [traineeProcessId, setTraineeProcessId] = useState('');
  const [type, setType] = useState('Pre-Assessment');
  const [outcome, setOutcome] = useState('Pass');
  const [strengths, setStrengths] = useState(
    'Strong practical understanding and controlled handover.',
  );
  const [developmentAreas, setDevelopmentAreas] = useState(
    'Time management during changeover.',
  );
  const [createdAssessment, setCreatedAssessment] =
    useState<CreatedAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadGeneratorData() {
      try {
        const response = await fetch('/api/assessment-generator', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load assessment options.');
        }

        const data = (await response.json()) as GeneratorData;
        if (!cancelled) {
          setTrainees(data.trainees);
          setRecordCount(data.recordCount);

          const firstTrainee = data.trainees[0];
          if (firstTrainee) {
            setTraineeId(String(firstTrainee.id));
            setTraineeProcessId(
              firstTrainee.assignments[0]
                ? String(firstTrainee.assignments[0].traineeProcessId)
                : '',
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load assessment options.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGeneratorData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTrainee = useMemo(
    () => trainees.find((trainee) => trainee.id === Number(traineeId)) ?? null,
    [traineeId, trainees],
  );
  const selectedAssignment =
    selectedTrainee?.assignments.find(
      (assignment) =>
        assignment.traineeProcessId === Number(traineeProcessId),
    ) ?? null;

  function changeTrainee(value: string) {
    const nextTrainee = trainees.find(
      (trainee) => trainee.id === Number(value),
    );
    setTraineeId(value);
    setTraineeProcessId(
      nextTrainee?.assignments[0]
        ? String(nextTrainee.assignments[0].traineeProcessId)
        : '',
    );
    setCreatedAssessment(null);
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!selectedTrainee || !selectedAssignment) {
      setError('Select a trainee and one of their assigned processes.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/assessment-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          traineeId: selectedTrainee.id,
          traineeProcessId: selectedAssignment.traineeProcessId,
          assessmentType: type,
          outcome,
          strengths,
          developmentAreas,
          assessor: selectedTrainee.trainingAssessor,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (CreatedAssessment & { error?: string })
        | null;

      if (!response.ok || !data) {
        throw new Error(data?.error || 'Failed to save assessment.');
      }

      setCreatedAssessment(data);
      setRecordCount((count) => count + 1);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to save assessment.',
      );
    } finally {
      setSaving(false);
    }
  }

  const preview = createdAssessment
    ? {
        trainee: createdAssessment.trainee.name,
        process: createdAssessment.process.name,
        department: createdAssessment.trainee.departmentName,
        type: createdAssessment.assessmentRecord.assessmentType,
        outcome: createdAssessment.assessmentRecord.outcome,
        strengths: createdAssessment.assessmentRecord.strengths ?? '',
        developmentAreas:
          createdAssessment.assessmentRecord.developmentAreas ?? '',
        date: createdAssessment.assessmentRecord.date.slice(0, 10),
        assessor: createdAssessment.assessmentRecord.assessor,
        teamLeader: selectedTrainee?.teamLeader ?? '',
      }
    : {
        trainee: selectedTrainee?.name ?? '',
        process: selectedAssignment?.processName ?? '',
        department: selectedTrainee?.departmentName ?? '',
        type,
        outcome,
        strengths,
        developmentAreas,
        date: new Date().toISOString().slice(0, 10),
        assessor: selectedTrainee?.trainingAssessor ?? 'Trainer',
        teamLeader: selectedTrainee?.teamLeader ?? '',
      };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Assessment Generator</h2>
        <p className="mt-2 text-slate-600">
          Complete the assessment once and generate the related record previews
          for the team leader and competency file.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">
          Loading assessment options...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <form
            className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
            onSubmit={submitAssessment}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Assessment Type
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    setCreatedAssessment(null);
                  }}
                >
                  <option>Pre-Assessment</option>
                  <option>Assessment</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Trainee
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
              <label className="text-sm text-slate-700">
                Process
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={traineeProcessId}
                  onChange={(event) => {
                    setTraineeProcessId(event.target.value);
                    setCreatedAssessment(null);
                  }}
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
              <label className="text-sm text-slate-700">
                Outcome
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                  value={outcome}
                  onChange={(event) => {
                    setOutcome(event.target.value);
                    setCreatedAssessment(null);
                  }}
                >
                  <option>Pass</option>
                  <option>Development Required</option>
                  <option>Competent</option>
                  <option>Not Yet Competent</option>
                </select>
              </label>
            </div>
            <label className="block text-sm text-slate-700">
              Strengths
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                value={strengths}
                onChange={(event) => {
                  setStrengths(event.target.value);
                  setCreatedAssessment(null);
                }}
              />
            </label>
            <label className="block text-sm text-slate-700">
              Development Areas
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
                value={developmentAreas}
                onChange={(event) => {
                  setDevelopmentAreas(event.target.value);
                  setCreatedAssessment(null);
                }}
              />
            </label>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              type="submit"
              disabled={
                saving || !selectedTrainee || !selectedAssignment
              }
            >
              {saving ? 'Saving Assessment...' : 'Generate Preview'}
            </button>
          </form>
          <div className="space-y-4">
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">
                Generated Team Leader Report Preview
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Team Leader: {preview.teamLeader}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Trainee: {preview.trainee}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Department: {preview.department}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Assessment Type: {preview.type}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Strengths: {preview.strengths}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Development Areas: {preview.developmentAreas}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Recommended Next Action:{' '}
                {preview.outcome === 'Competent' ||
                preview.outcome === 'Pass'
                  ? 'Maintain standard and schedule refresher'
                  : 'Support development and monitor next week'}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">
                Competency Assessment Record Preview
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Trainee Name: {preview.trainee}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Process: {preview.process}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Assessment Date: {preview.date}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Assessor: {preview.assessor}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Outcome: {preview.outcome}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Evidence Summary: {preview.strengths}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Development Required: {preview.developmentAreas}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">
                Generated Record Count
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Assessment records available: {recordCount}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {createdAssessment
                  ? 'Assessment and timeline event saved successfully.'
                  : 'Generate the preview to save this assessment.'}
              </p>
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}
