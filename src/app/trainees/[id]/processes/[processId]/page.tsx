'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type TimelineEvent = {
  id: number;
  eventType: string;
  date: string;
  createdAt: string;
  description: string;
};

type ProcessAssignment = {
  id: number;
  stage: string;
  status: string;
  assignmentStatus: string;
  removedAt: string | null;
  removalNote: string | null;
  removedBy: string | null;
  readinessScore: number | null;
  cumulativeLoggedHours: string;
  recommendedTrainingHours: string | null;
  requires50PercentCheckIn: boolean;
  requires90PercentCheckIn: boolean;
  fiftyPercentReachedDate: string | null;
  ninetyPercentReachedDate: string | null;
  trainingBuddy: string | null;
  trainingStartDate: string | null;
  nextAction: string | null;
  process: {
    name: string;
  };
  trainee: {
    id: number;
    name: string;
    department: {
      name: string;
    };
  };
  timelineEvents: TimelineEvent[];
};

export default function ProcessDetailPage() {
  const params = useParams<{ id: string; processId: string }>();
  const traineeId = Number(params.id);
  const processId = Number(params.processId);
  const hasValidIds =
    Number.isInteger(traineeId) &&
    traineeId > 0 &&
    Number.isInteger(processId) &&
    processId > 0;
  const [assignment, setAssignment] = useState<ProcessAssignment | null>(null);
  const [loading, setLoading] = useState(hasValidIds);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState<
    'ASSIGNED_BY_MISTAKE' | 'NO_LONGER_REQUIRED'
  >('NO_LONGER_REQUIRED');
  const [removeNote, setRemoveNote] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [removing, setRemoving] = useState(false);

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
          setAssignment(null);
          return;
        }

        setAssignment((await response.json()) as ProcessAssignment);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAssignment(null);
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

  async function submitRemoveProcess() {
    if (!assignment) {
      return;
    }

    setRemoveError('');

    if (removeReason === 'NO_LONGER_REQUIRED' && !removeNote.trim()) {
      setRemoveError('Enter a short reason before confirming.');
      return;
    }

    setRemoving(true);

    try {
      const response = await fetch(
        `/api/trainees/${assignment.trainee.id}/processes/${assignment.id}/remove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: removeReason,
            note: removeNote,
            user: 'User',
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        recommendation?: string;
      } | null;

      if (!response.ok) {
        setRemoveError(
          [data?.error, data?.recommendation].filter(Boolean).join(' ') ||
            'Failed to remove process.',
        );
        return;
      }

      if (removeReason === 'ASSIGNED_BY_MISTAKE') {
        window.location.href = `/trainees/${assignment.trainee.id}`;
        return;
      }

      const reload = await fetch(
        `/api/trainees/${assignment.trainee.id}/processes/${assignment.id}`,
        { cache: 'no-store' },
      );

      if (reload.ok) {
        setAssignment((await reload.json()) as ProcessAssignment);
      }

      setRemoveOpen(false);
    } catch {
      setRemoveError('Failed to remove process.');
    } finally {
      setRemoving(false);
    }
  }

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
        Process not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Process Detail
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {assignment.process.name}
          </h2>
          <p className="mt-2 text-slate-600">
            Assigned to {assignment.trainee.name} in{' '}
            {assignment.trainee.department.name}.
          </p>
        </div>
        <Link
          href={`/trainees/${assignment.trainee.id}`}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
        >
          Back to profile
        </Link>
        {assignment.assignmentStatus === 'ACTIVE' ? (
          <button
            type="button"
            onClick={() => setRemoveOpen(true)}
            className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700"
          >
            Remove Process
          </button>
        ) : null}
      </div>

      {assignment.assignmentStatus === 'NO_LONGER_REQUIRED' ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <h3 className="font-semibold text-slate-900">No Longer Required</h3>
          <p className="mt-2">
            Removed {assignment.removedAt?.slice(0, 10) ?? 'date not recorded'}
            {assignment.removedBy ? ` by ${assignment.removedBy}` : ''}.
          </p>
          <p className="mt-1">{assignment.removalNote || 'No reason recorded.'}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Stage', assignment.stage],
          ['Status', assignment.status || 'Active'],
          [
            'Readiness',
            assignment.readinessScore === null
              ? 'Not Set'
              : `${assignment.readinessScore}%`,
          ],
          ['Logged Hours', assignment.cumulativeLoggedHours],
          [
            'Recommended Hours',
            assignment.recommendedTrainingHours ?? 'Not Set',
          ],
          ['Training Buddy', assignment.trainingBuddy ?? 'TBD'],
          [
            'Start Date',
            assignment.trainingStartDate?.slice(0, 10) ?? 'TBD',
          ],
          ['Next Action', assignment.nextAction || '-'],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </section>

      {assignment.requires50PercentCheckIn ||
      assignment.requires90PercentCheckIn ? (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          <h3 className="font-semibold">Check-In Required</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {assignment.requires50PercentCheckIn ? (
              <span className="rounded-full bg-white px-3 py-1 font-medium">
                50% Check-In Required
              </span>
            ) : null}
            {assignment.requires90PercentCheckIn ? (
              <span className="rounded-full bg-white px-3 py-1 font-medium">
                Final Check-In Required
              </span>
            ) : null}
            <Link
              href={`/trainees/${assignment.trainee.id}/check-in/${assignment.id}`}
              className="rounded-full bg-slate-900 px-3 py-1 font-medium text-white"
            >
              Add Check-In
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold">Timeline</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {assignment.timelineEvents.length ? (
            assignment.timelineEvents.slice(0, 8).map((event) => (
              <li key={event.id} className="rounded-xl bg-white p-3">
                {event.date.slice(0, 10)} | {event.eventType} |{' '}
                {event.description}
              </li>
            ))
          ) : (
            <li>No process timeline events yet.</li>
          )}
        </ul>
      </section>

      {removeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              Remove {assignment.process.name}
            </h3>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="radio"
                  checked={removeReason === 'NO_LONGER_REQUIRED'}
                  onChange={() => setRemoveReason('NO_LONGER_REQUIRED')}
                />
                <span>
                  <strong>No longer required</strong>
                  <br />
                  Preserve history and stop future training/refresher work.
                </span>
              </label>
              <label className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="radio"
                  checked={removeReason === 'ASSIGNED_BY_MISTAKE'}
                  onChange={() => setRemoveReason('ASSIGNED_BY_MISTAKE')}
                />
                <span>
                  <strong>Assigned by mistake</strong>
                  <br />
                  Permanently remove only if no meaningful history exists.
                </span>
              </label>
            </div>
            {removeReason === 'NO_LONGER_REQUIRED' ? (
              <label className="mt-4 block space-y-2 text-sm">
                <span>Removal reason</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-slate-200 p-3"
                  value={removeNote}
                  onChange={(event) => setRemoveNote(event.target.value)}
                />
              </label>
            ) : null}
            {removeError ? (
              <p className="mt-3 text-sm font-medium text-rose-700">
                {removeError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => void submitRemoveProcess()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {removing ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
