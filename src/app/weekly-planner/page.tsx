'use client';

import { useMemo, useState } from 'react';
import { weeklyPlannerItems } from '@/lib/mock-data';

export default function WeeklyPlannerPage() {
  const [week, setWeek] = useState('All');
  const [department, setDepartment] = useState('All');
  const [activityType, setActivityType] = useState('All');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => weeklyPlannerItems.filter((item) => (week === 'All' || item.weekCommencing === week) && (department === 'All' || item.department === department) && (activityType === 'All' || item.activityType === activityType) && (status === 'All' || item.status === status)), [week, department, activityType, status]);

  const summary = {
    planned: filtered.filter((item) => item.status === 'Planned').length,
    completed: filtered.filter((item) => item.status === 'Completed').length,
    deferred: filtered.filter((item) => item.status === 'Deferred').length,
    notCompleted: filtered.filter((item) => item.status === 'Not Completed').length,
    carryOver: filtered.filter((item) => item.status === 'Carry Over').length,
  };

  return <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"> <div><h2 className="text-2xl font-semibold">Weekly Planner</h2><p className="mt-2 text-slate-600">Track planned training activity, completion status and follow-up requirements for the week.</p></div><div className="grid gap-4 md:grid-cols-5">{[['Planned', summary.planned],['Completed', summary.completed],['Deferred', summary.deferred],['Not Completed', summary.notCompleted],['Carry Over', summary.carryOver]].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></article>)}</div><div className="grid gap-3 md:grid-cols-4"><select className="rounded-xl border border-slate-200 p-3" value={week} onChange={(e) => setWeek(e.target.value)}><option>All</option><option>2026-06-01</option><option>2026-06-08</option></select><select className="rounded-xl border border-slate-200 p-3" value={department} onChange={(e) => setDepartment(e.target.value)}><option>All</option><option>Surfacing</option><option>Coating</option></select><select className="rounded-xl border border-slate-200 p-3" value={activityType} onChange={(e) => setActivityType(e.target.value)}><option>All</option>{Array.from(new Set(weeklyPlannerItems.map((item) => item.activityType))).map((value) => <option key={value}>{value}</option>)}</select><select className="rounded-xl border border-slate-200 p-3" value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{Array.from(new Set(weeklyPlannerItems.map((item) => item.status))).map((value) => <option key={value}>{value}</option>)}</select></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-3 text-left">Week</th><th className="pb-3 text-left">Trainee</th><th className="pb-3 text-left">Activity</th><th className="pb-3 text-left">Dept</th><th className="pb-3 text-left">Status</th><th className="pb-3 text-left">Owner</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="py-3">{item.weekCommencing}</td><td className="py-3">{item.trainee}</td><td className="py-3">{item.activityType} · {item.process}</td><td className="py-3">{item.department}</td><td className="py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{item.status}</span></td><td className="py-3">{item.owner}</td></tr>)}</tbody></table></div><div className="grid gap-6 lg:grid-cols-2"><article className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><h3 className="text-lg font-semibold">Monday Planning</h3><p className="mt-2 text-sm text-slate-600">Activities planned this week, pre-assessments due, assessments due and follow-ups due are reviewed first thing Monday.</p></article><article className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><h3 className="text-lg font-semibold">Friday Review</h3><p className="mt-2 text-sm text-slate-600">Completion percentage, deferred work, carry-over items and next-week actions are captured on Friday review.</p></article></div></div>;
}
