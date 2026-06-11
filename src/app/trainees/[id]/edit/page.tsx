'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { loadTraineeState, updateTrainee } from '@/lib/trainee-management';

export default function EditTraineePage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = Number(params.id);
  const [form, setForm] = useState(loadTraineeState().trainees.find((item) => item.id === traineeId) ?? null);

  const submit = () => {
    if (!form) return;
    updateTrainee(form);
    router.push(`/trainees/${form.id}`);
  };

  if (!form) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Trainee not found.</div>;
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Edit Trainee</p>
        <h2 className="mt-2 text-2xl font-semibold">Update trainee details without losing training history.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Trainee Name</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.name} onChange={(e) => setForm((prev) => prev ? { ...prev, name: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Department</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.department} onChange={(e) => setForm((prev) => prev ? { ...prev, department: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Team Leader</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.teamLeader} onChange={(e) => setForm((prev) => prev ? { ...prev, teamLeader: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Training Assessor</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingAssessor} onChange={(e) => setForm((prev) => prev ? { ...prev, trainingAssessor: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Shift</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.shift} onChange={(e) => setForm((prev) => prev ? { ...prev, shift: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Start Date</span><input type="date" className="w-full rounded-xl border border-slate-200 p-3" value={form.startDate} onChange={(e) => setForm((prev) => prev ? { ...prev, startDate: e.target.value } : prev)} /></label>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Changes</button>
        <Link href={`/trainees/${form.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</Link>
      </div>
    </div>
  );
}
