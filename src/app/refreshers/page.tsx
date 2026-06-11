'use client';

import { useMemo, useState } from 'react';
import { refresherRecords } from '@/lib/mock-data';

export default function RefreshersPage() {
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [trainee, setTrainee] = useState('All');

  const filtered = useMemo(() => refresherRecords.filter((item) => (department === 'All' || item.department === department) && (status === 'All' || item.status === status) && (trainee === 'All' || item.trainee === trainee)).sort((a, b) => (a.status === 'Overdue' ? -1 : 1) - (b.status === 'Overdue' ? -1 : 1)), [department, status, trainee]);

  const summary = {
    overdue: refresherRecords.filter((item) => item.status === 'Overdue').length,
    dueThisWeek: refresherRecords.filter((item) => item.status === 'Due This Week').length,
    dueThisMonth: refresherRecords.filter((item) => item.status === 'Due This Month').length,
    dueNextMonth: refresherRecords.filter((item) => item.status === 'Due Next Month').length,
    completedThisMonth: refresherRecords.filter((item) => item.status === 'Completed').length,
  };

  return <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-2xl font-semibold">Refresher Tracker</h2><p className="mt-2 text-slate-600">Urgent refreshers appear first so assessors can prioritise the next training actions.</p></div><div className="grid gap-4 md:grid-cols-5">{[['Overdue', summary.overdue],['Due This Week', summary.dueThisWeek],['Due This Month', summary.dueThisMonth],['Due Next Month', summary.dueNextMonth],['Completed This Month', summary.completedThisMonth]].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></article>)}</div><div className="grid gap-3 md:grid-cols-3"><select className="rounded-xl border border-slate-200 p-3" value={department} onChange={(e) => setDepartment(e.target.value)}><option>All</option><option>Surfacing</option><option>Coating</option></select><select className="rounded-xl border border-slate-200 p-3" value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{Array.from(new Set(refresherRecords.map((item) => item.status))).map((value) => <option key={value}>{value}</option>)}</select><select className="rounded-xl border border-slate-200 p-3" value={trainee} onChange={(e) => setTrainee(e.target.value)}><option>All</option>{Array.from(new Set(refresherRecords.map((item) => item.trainee))).map((value) => <option key={value}>{value}</option>)}</select></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-3 text-left">Trainee</th><th className="pb-3 text-left">Process</th><th className="pb-3 text-left">Status</th><th className="pb-3 text-left">Due Date</th><th className="pb-3 text-left">Assessor</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="py-3">{item.trainee}</td><td className="py-3">{item.process}</td><td className="py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">{item.status}</span></td><td className="py-3">{item.refresherDueDate}</td><td className="py-3">{item.assignedAssessor}</td></tr>)}</tbody></table></div></div>;
}
