'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { assessmentRecords, refresherRecords, weeklyPlannerItems } from '@/lib/mock-data';
import { loadTraineeState, loadTimelineState } from '@/lib/trainee-management';

export default function TraineeProfilePage() {
  const params = useParams();
  const traineeId = Number(params.id);
  const [trainees] = useState(loadTraineeState().trainees);
  const [traineeProcesses] = useState(loadTraineeState().traineeProcesses);
  const [timeline] = useState(loadTimelineState());

  const trainee = useMemo(() => trainees.find((item) => item.id === traineeId), [traineeId, trainees]);
  const assignments = useMemo(() => traineeProcesses.filter((item) => item.traineeId === traineeId), [traineeId, traineeProcesses]);
  const activeAssignments = useMemo(() => assignments.filter((item) => item.status !== 'Competent' && item.status !== 'Archived'), [assignments]);
  const completedAssignments = useMemo(() => assignments.filter((item) => item.status === 'Competent' || item.stage === 'Competent'), [assignments]);
  const history = useMemo(() => assessmentRecords.filter((item) => item.trainee === trainee?.name), [trainee]);
  const plannerItems = useMemo(() => weeklyPlannerItems.filter((item) => item.trainee === trainee?.name), [trainee]);
  const refresherItems = useMemo(() => refresherRecords.filter((item) => item.trainee === trainee?.name), [trainee]);

  if (!trainee) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Trainee not found.</div>;
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Trainee Profile</p>
          <h2 className="mt-2 text-2xl font-semibold">{trainee.name}</h2>
          <p className="mt-2 text-slate-600">Overview of assigned training processes, assessment history, follow-up actions and the next training step.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/trainees/${trainee.id}/assign`} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Assign Process</Link>
          <Link href={`/trainees/${trainee.id}/edit`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Edit Trainee</Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Department', trainee.department], ['Team Leader', trainee.teamLeader], ['Training Assessor', trainee.trainingAssessor], ['Shift', trainee.shift],
          ['Start Date', trainee.startDate], ['Active Processes', `${activeAssignments.length}`], ['Competent Processes', `${completedAssignments.length}`],
          ['Follow-Up Required', assignments.some((item) => item.followUpFlag !== 'NONE') ? 'Yes' : 'No'],
        ].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-slate-900">{value}</p></article>)}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold">Active Training Processes</h3>
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-2 text-left">Process</th><th className="pb-2 text-left">Stage</th><th className="pb-2 text-left">Training Buddy</th><th className="pb-2 text-left">Start Date</th><th className="pb-2 text-left">Readiness</th><th className="pb-2 text-left">Next Action</th><th className="pb-2 text-left">Actions</th></tr></thead><tbody>{activeAssignments.map((item) => <tr key={item.id} className="border-t border-slate-200"><td className="py-3">{item.process}</td><td className="py-3">{item.stage}</td><td className="py-3">{item.trainingBuddy ?? 'TBD'}</td><td className="py-3">{item.trainingStartDate ?? 'TBD'}</td><td className="py-3">{item.readinessScore ?? 0}%</td><td className="py-3">{item.nextAction}</td><td className="py-3"><div className="flex flex-wrap gap-2 text-xs"><Link href={`/trainees/${trainee.id}/processes/${item.id}`} className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">View</Link><Link href={`/trainees/${trainee.id}/progress/${item.id}`} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Update Progress</Link><Link href={`/trainees/${trainee.id}/check-in/${item.id}`} className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Add Check-In</Link></div></td></tr>)}</tbody></table></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 p-4"><h3 className="text-lg font-semibold">Completed / Competent Processes</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{completedAssignments.length ? completedAssignments.map((item) => <li key={item.id} className="rounded-xl bg-emerald-50 p-3">{item.process} · {item.stage} · {item.competencySignOffDate ?? 'Signed off'}</li>) : <li>No completed processes yet.</li>}</ul></article>
        <article className="rounded-2xl border border-slate-200 p-4"><h3 className="text-lg font-semibold">Assessment History</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{history.map((item) => <li key={item.id} className="rounded-xl bg-sky-50 p-3">{item.assessmentType} · {item.date} · {item.outcome}</li>)}</ul></article>
        <article className="rounded-2xl border border-slate-200 p-4"><h3 className="text-lg font-semibold">Weekly Planner Items</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{plannerItems.map((item) => <li key={item.id} className="rounded-xl bg-amber-50 p-3">{item.activityType} · {item.plannedDate} · {item.status}</li>)}</ul></article>
        <article className="rounded-2xl border border-slate-200 p-4"><h3 className="text-lg font-semibold">Refresher Records</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{refresherItems.map((item) => <li key={item.id} className="rounded-xl bg-violet-50 p-3">{item.process} · {item.status} · Due {item.refresherDueDate}</li>)}</ul></article>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4"><h3 className="text-lg font-semibold">Follow-Up Actions</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{assignments.filter((item) => item.followUpFlag !== 'NONE').length ? assignments.filter((item) => item.followUpFlag !== 'NONE').map((item) => <li key={item.id} className="rounded-xl bg-rose-50 p-3">{item.process} · {item.followUpFlag} · {item.nextAction}</li>) : <li>No follow-up actions currently flagged.</li>}</ul></section>
      <section className="rounded-2xl border border-slate-200 p-4"><h3 className="text-lg font-semibold">Training Timeline</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{timeline.filter((item) => item.traineeId === trainee.id).slice(-5).reverse().map((item) => <li key={item.id} className="rounded-xl bg-slate-50 p-3">{item.date} · {item.eventType} · {item.description}</li>)}</ul></section>
    </div>
  );
}
