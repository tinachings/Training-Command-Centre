'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ProcessAssignment = {
  id: number;
  process: {
    name: string;
  };
  trainee: {
    id: number;
    name: string;
  };
};

export default function AddCheckInPage() {
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
  const [assessor, setAssessor] = useState('Trainer');
  const [checkInDate, setCheckInDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [progressSummary, setProgressSummary] = useState('');
  const [issuesIdentified, setIssuesIdentified] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [reviewDate, setReviewDate] = useState('');
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

        setAssignment((await response.json()) as ProcessAssignment);
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
        `/api/trainees/${traineeId}/processes/${processId}/check-ins`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkInDate,
            assessor,
            progressSummary,
            issuesIdentified,
            supportRequired,
            nextAction,
            reviewDate,
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || 'Failed to save check-in.');
        return;
      }

      router.push(`/trainees/${traineeId}`);
      router.refresh();
    } catch {
      setError('Failed to save check-in.');
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
            Add Check-In
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {assignment.process.name}
          </h2>
          <p className="mt-2 text-slate-600">
            Log a coaching update for {assignment.trainee.name} and capture
            support needs.
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
          <span>Check-In Date</span>
          <input
            type="date"
            value={checkInDate}
            onChange={(event) => setCheckInDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Assessor</span>
          <input
            value={assessor}
            onChange={(event) => setAssessor(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>Progress Summary</span>
          <textarea
            value={progressSummary}
            onChange={(event) => setProgressSummary(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            rows={3}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Issues Identified</span>
          <input
            value={issuesIdentified}
            onChange={(event) => setIssuesIdentified(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Support Required</span>
          <input
            value={supportRequired}
            onChange={(event) => setSupportRequired(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Next Action</span>
          <input
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Review Date</span>
          <input
            type="date"
            value={reviewDate}
            onChange={(event) => setReviewDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
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
            {submitting ? 'Saving...' : 'Save Check-In'}
          </button>
        </div>
      </form>
    </div>
  );
}
