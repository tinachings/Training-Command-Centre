'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { loadTraineeState } from '@/lib/trainee-management';

export default function TrainingPipelinePage() {
  const [traineeProcesses] = useState(loadTraineeState().traineeProcesses);
  const [department, setDepartment] = useState('All');
  const [stage, setStage] = useState('All');
  const [trainee, setTrainee] = useState('All');
  const [process, setProcess] = useState('All');

  const filtered = useMemo(() => traineeProcesses.filter((item) => (department === 'All' || item.department === department) && (stage === 'All' || item.stage === stage) && (trainee === 'All' || item.trainee === trainee) && (process === 'All' || item.process === process)), [department, stage, trainee, process, traineeProcesses]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Training Pipeline</h2>
        <p className="mt-2 text-slate-600">A live-style table of all trainee/process records with readiness, follow-up flags and next action guidance.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border border-slate-200 p-3" value={department} onChange={(e) => setDepartment(e.target.value)}><option>All</option><option>Surfacing</option><option>Coating</option></select>
        <select className="rounded-xl border border-slate-200 p-3" value={stage} onChange={(e) => setStage(e.target.value)}><option>All</option>{Array.from(new Set(traineeProcesses.map((item) => item.stage))).map((value) => <option key={value}>{value}</option>)}</select>
        <select className="rounded-xl border border-slate-200 p-3" value={trainee} onChange={(e) => setTrainee(e.target.value)}><option>All</option>{Array.from(new Set(traineeProcesses.map((item) => item.trainee))).map((value) => <option key={value}>{value}</option>)}</select>
        <select className="rounded-xl border border-slate-200 p-3" value={process} onChange={(e) => setProcess(e.target.value)}><option>All</option>{Array.from(new Set(traineeProcesses.map((item) => item.process))).map((value) => <option key={value}>{value}</option>)}</select>
      </div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-3 text-left">Trainee</th><th className="pb-3 text-left">Process</th><th className="pb-3 text-left">Dept</th><th className="pb-3 text-left">Stage</th><th className="pb-3 text-left">Readiness</th><th className="pb-3 text-left">Follow-Up</th><th className="pb-3 text-left">Next Action</th><th className="pb-3 text-left">Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="py-3">{item.trainee}</td><td className="py-3">{item.process}</td><td className="py-3">{item.department}</td><td className="py-3"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700">{item.stage}</span></td><td className="py-3"><div className="w-28 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${item.readinessScore ?? 0}%` }} /></div><span className="text-xs text-slate-500">{item.readinessScore ?? 0}%</span></td><td className="py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">{item.followUpFlag}</span></td><td className="py-3 text-slate-600">{item.nextAction}</td><td className="py-3"><div className="flex flex-wrap gap-2 text-xs"><Link href={`/trainees/${item.traineeId}/processes/${item.id}`} className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">View</Link><Link href={`/trainees/${item.traineeId}/progress/${item.id}`} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Update</Link></div></td></tr>)}</tbody></table></div>
    </div>
  );
}
