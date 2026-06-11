'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { loadTraineeState, loadTimelineState } from '@/lib/trainee-management';

export default function ProcessDetailPage() {
  const params = useParams();
  const traineeId = Number(params.id);
  const processId = Number(params.processId);

  const { trainees, traineeProcesses } = loadTraineeState();
  const trainee = useMemo(() => trainees.find((item) => item.id === traineeId), [traineeId, trainees]);
  const assignment = useMemo(() => traineeProcesses.find((item) => item.id === processId), [processId, traineeProcesses]);
  const events = useMemo(() => loadTimelineState().filter((item) => item.traineeId === traineeId && item.processId === processId).slice(-8).reverse(), [processId, traineeId]);

  if (!trainee || !assignment) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Process not found.</div>;
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Process Detail</p>
          <h2 className="mt-2 text-2xl font-semibold">{assignment.process}</h2>
          <p className="mt-2 text-slate-600">Assigned to {trainee.name} in {trainee.department}.</p>
        </div>
        <Link href={`/trainees/${trainee.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to profile</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Stage', assignment.stage],
          ['Status', assignment.status ?? 'Active'],
          ['Readiness', `${assignment.readinessScore ?? 0}%`],
          ['Training Buddy', assignment.trainingBuddy ?? 'TBD'],
          ['Start Date', assignment.trainingStartDate ?? 'TBD'],
          ['Next Action', assignment.nextAction],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold">Timeline</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">{events.map((item) => <li key={item.id} className="rounded-xl bg-white p-3">{item.date} · {item.eventType} · {item.description}</li>)}</ul>
      </section>
    </div>
  );
}
