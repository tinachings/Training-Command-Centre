'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { processes } from '@/lib/mock-data';
import { addProcessAssignment, loadTraineeState } from '@/lib/trainee-management';

export default function AssignProcessPage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = Number(params.id);
  const trainee = loadTraineeState().trainees.find((item) => item.id === traineeId);
  const [form, setForm] = useState({
    traineeId,
    trainee: trainee?.name ?? '',
    department: trainee?.department ?? 'Surfacing',
    process: processes[0]?.name ?? '',
    trainingBuddy: 'T. Reed',
    trainingStartDate: '2026-06-10',
    stage: 'Requested',
    requestedBy: trainee?.teamLeader ?? 'M. Patel',
    riskAssessmentComplete: true,
    sopComplete: true,
    nextAction: 'Confirm setup and training plan',
    followUpFlag: 'NONE',
  });

  const submit = () => {
    const result = addProcessAssignment({
      id: Date.now(),
      traineeId: form.traineeId,
      trainee: form.trainee,
      department: form.department,
      process: form.process,
      stage: form.stage,
      status: 'Active',
      nextAction: form.nextAction,
      followUpFlag: form.followUpFlag,
      trainingBuddy: form.trainingBuddy,
      trainingStartDate: form.trainingStartDate,
      lastCheckInDate: '2026-06-10',
      readinessScore: 55,
      assessmentOutcome: 'In Progress',
      competencySignOffDate: undefined,
      requestedBy: form.requestedBy,
      riskAssessmentComplete: form.riskAssessmentComplete,
      sopComplete: form.sopComplete,
      buddyFeedbackScore: 3,
      assessorObservationScore: 3,
      timeSpentInShifts: 4,
      createdAt: new Date().toISOString(),
    });

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    router.push(`/trainees/${form.traineeId}`);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Assign Process</p>
        <h2 className="mt-2 text-2xl font-semibold">Add a new process to the trainee profile.</h2>
        <p className="mt-2 text-slate-600">This inserts the process into the existing training pipeline and updates the profile view immediately.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Trainee</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.trainee} readOnly /></label>
        <label className="space-y-2 text-sm"><span>Department</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.department} readOnly /></label>
        <label className="space-y-2 text-sm"><span>Process</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.process} onChange={(e) => setForm((prev) => ({ ...prev, process: e.target.value }))}>{processes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label className="space-y-2 text-sm"><span>Training Buddy</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingBuddy} onChange={(e) => setForm((prev) => ({ ...prev, trainingBuddy: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Date Requested</span><input type="date" className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingStartDate} onChange={(e) => setForm((prev) => ({ ...prev, trainingStartDate: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Requested By</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.requestedBy} onChange={(e) => setForm((prev) => ({ ...prev, requestedBy: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Risk Assessment Complete</span><select className="w-full rounded-xl border border-slate-200 p-3" value={String(form.riskAssessmentComplete)} onChange={(e) => setForm((prev) => ({ ...prev, riskAssessmentComplete: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="space-y-2 text-sm"><span>SOP Complete</span><select className="w-full rounded-xl border border-slate-200 p-3" value={String(form.sopComplete)} onChange={(e) => setForm((prev) => ({ ...prev, sopComplete: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="space-y-2 text-sm"><span>Initial Stage</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value, nextAction: e.target.value === 'In Training' ? 'Continue coaching and log check-in' : e.target.value === 'Setup Complete' ? 'Verify training setup and buddy handover' : 'Confirm request and schedule first session' }))}><option>Requested</option><option>Setup Complete</option><option>In Training</option></select></label>
        <label className="space-y-2 text-sm"><span>Next Action</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.nextAction} onChange={(e) => setForm((prev) => ({ ...prev, nextAction: e.target.value }))} /></label>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Assign Process</button>
        <Link href={`/trainees/${form.traineeId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to Profile</Link>
      </div>
    </div>
  );
}
