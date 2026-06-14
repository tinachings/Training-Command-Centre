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
  readinessScore: number | null;
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
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Stage', assignment.stage],
          ['Status', assignment.status || 'Active'],
          ['Readiness', `${assignment.readinessScore ?? 0}%`],
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
    </div>
  );
}
