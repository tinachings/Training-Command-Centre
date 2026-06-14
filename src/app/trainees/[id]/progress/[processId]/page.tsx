'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ProcessAssignment = {
  id: number;
  stage: string;
  nextAction: string | null;
  followUpFlag: string | null;
  readinessScore: number | null;
  process: {
    name: string;
  };
  trainee: {
    id: number;
    name: string;
  };
};

export default function ProcessProgressPage() {
  const params = useParams<{ id: string; processId: string }>();
  const router = useRouter();
  const traineeId = Number(params.id);
  const processId = Number(params.processId);
  const hasValidIds =
    Number.isInteger(traineeId) &&
    traineeId > 0 &&
    Number.isInteger(processId) &&
    processId > 0;
  const [assignment, setAssignment] = useState<ProcessAssignment | null>(null);
  const [stage, setStage] = useState('In Training');
  const [nextAction, setNextAction] = useState('');
  const [followUpFlag, setFollowUpFlag] = useState('NONE');
  const [readinessScore, setReadinessScore] = useState('0');
  const [loading, setLoading] = useState(hasValidIds);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    hasValidIds ? '' : 'Process not found.',
  );

  useEffect(() => {
    if (!hasValidIds) {
      return;
    }

    const controller = new AbortController();

    async function loadAssignment() {
      try {
        const response = await fetch(
          `/api/trainees/${traineeId}/processes/${processId}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setError('Process not found.');
          return;
        }

        const data = (await response.json()) as ProcessAssignment;
        setAssignment(data);
        setStage(data.stage);
        setNextAction(data.nextAction ?? '');
        setFollowUpFlag(data.followUpFlag ?? 'NONE');
        setReadinessScore(String(data.readinessScore ?? 0));
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load process.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAssignment();
    return () => controller.abort();
  }, [hasValidIds, processId, traineeId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/trainees/${traineeId}/processes/${processId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stage,
            nextAction,
            followUpFlag,
            readinessScore: Number(readinessScore),
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || 'Failed to update progress.');
        return;
      }

      router.push(`/trainees/${traineeId}`);
      router.refresh();
    } catch {
      setError('Failed to update progress.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Loading process...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {error || 'Process not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Update Progress
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {assignment.process.name}
          </h2>
          <p className="mt-2 text-slate-600">
            Record the current training stage and follow-up actions for{' '}
            {assignment.trainee.name}.
          </p>
        </div>
        <Link
          href={`/trainees/${assignment.trainee.id}`}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
        >
          Back to profile
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
      >
        <label className="space-y-2 text-sm">
          <span>Stage</span>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <option>Requested</option>
            <option>Setup Complete</option>
            <option>In Training</option>
            <option>Monitoring</option>
            <option>Ready for Pre-Assessment</option>
            <option>Ready for Assessment</option>
            <option>Assessment Passed - Sign Off</option>
            <option>Retraining Required</option>
            <option>Competent</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Follow-up Flag</span>
          <select
            value={followUpFlag}
            onChange={(event) => setFollowUpFlag(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <option value="NONE">NONE</option>
            <option value="CHASE">CHASE</option>
            <option value="ESCALATE">ESCALATE</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Readiness Score</span>
          <input
            type="number"
            min="0"
            max="100"
            value={readinessScore}
            onChange={(event) => setReadinessScore(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>Next Action</span>
          <textarea
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            rows={3}
          />
        </label>
        {error ? (
          <p className="text-sm text-rose-700 md:col-span-2">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </form>
    </div>
  );
}
