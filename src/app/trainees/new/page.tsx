'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ApiErrorResponse = {
  error?: unknown;
  message?: unknown;
};

function getApiErrorMessage(payload: ApiErrorResponse) {
  const message = payload.error ?? payload.message;
  return typeof message === 'string' && message.trim() ? message : null;
}

export default function NewTraineePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    department: 'Surfacing',
    teamLeader: 'M. Patel',
    shiftLeader: 'R. Jones',
    trainingAssessor: 'J. Evans',
    shift: 'Days',
    startDate: '2026-06-01',
  });

const submit = async () => {
  setError('');

  const response = await fetch('/api/trainees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    setError(getApiErrorMessage(payload) ?? 'Failed to save trainee.');
    return;
  }

  const trainee = await response.json();

  router.push(`/trainees/${trainee.id}`);
};

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Add New Trainee</p>
        <h2 className="mt-2 text-2xl font-semibold">Create a trainee record and start the training workflow.</h2>
        <p className="mt-2 text-slate-600">The profile page opens immediately after save so the next step is assigning a training process.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Trainee Name</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Department</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Team Leader</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.teamLeader} onChange={(e) => setForm((prev) => ({ ...prev, teamLeader: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Shift Leader</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.shiftLeader} onChange={(e) => setForm((prev) => ({ ...prev, shiftLeader: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Training Assessor</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingAssessor} onChange={(e) => setForm((prev) => ({ ...prev, trainingAssessor: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Shift</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.shift} onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Start Date</span><input type="date" className="w-full rounded-xl border border-slate-200 p-3" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} /></label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-3">
        <button onClick={submit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Trainee</button>
        <Link href="/trainees" className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to Trainees</Link>
      </div>
    </div>
  );
}
