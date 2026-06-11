'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { addProcessCheckIn, loadTraineeState } from '@/lib/trainee-management';

export default function AddCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = Number(params.id);
  const processId = Number(params.processId);
  const { trainees, traineeProcesses } = loadTraineeState();
  const trainee = useMemo(() => trainees.find((item) => item.id === traineeId), [traineeId, trainees]);
  const assignment = useMemo(() => traineeProcesses.find((item) => item.id === processId), [processId, traineeProcesses]);
  const [assessor, setAssessor] = useState('Trainer');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().slice(0, 10));
  const [progressSummary, setProgressSummary] = useState('');
  const [issuesIdentified, setIssuesIdentified] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  if (!trainee || !assignment) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Process not found.</div>;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addProcessCheckIn(processId, {
      id: Date.now(),
      traineeId,
      processId,
      checkInDate,
      assessor,
      progressSummary,
      issuesIdentified,
      supportRequired,
      nextAction,
      reviewDate,
    });
    router.push(`/trainees/${trainee.id}`);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Add Check-In</p>
          <h2 className="mt-2 text-2xl font-semibold">{assignment.process}</h2>
          <p className="mt-2 text-slate-600">Log a coaching update for {trainee.name} and capture support needs.</p>
        </div>
        <Link href={`/trainees/${trainee.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to profile</Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Check-In Date</span><input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <label className="space-y-2 text-sm"><span>Assessor</span><input value={assessor} onChange={(event) => setAssessor(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Progress Summary</span><textarea value={progressSummary} onChange={(event) => setProgressSummary(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" rows={3} /></label>
        <label className="space-y-2 text-sm"><span>Issues Identified</span><input value={issuesIdentified} onChange={(event) => setIssuesIdentified(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <label className="space-y-2 text-sm"><span>Support Required</span><input value={supportRequired} onChange={(event) => setSupportRequired(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <label className="space-y-2 text-sm"><span>Next Action</span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <label className="space-y-2 text-sm"><span>Review Date</span><input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <div className="md:col-span-2 flex justify-end gap-2"><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Check-In</button></div>
      </form>
    </div>
  );
}
