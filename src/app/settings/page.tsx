'use client';

import { departments, processes, trainees } from '@/lib/mock-data';

const settingsCards = [
  ['Departments', departments.map((item) => item.name).join(', ')],
  ['Processes', processes.slice(0, 8).map((item) => item.name).join(', ')],
  ['Team Leaders', 'M. Patel, S. Morris'],
  ['Training Assessors', 'J. Evans, A. Green'],
  ['Training Buddies', 'T. Reed, L. Mason'],
  ['Follow-up thresholds', 'Setup overdue 2 days • Chase after 5 days • Priority after 5 days'],
  ['Readiness target shifts', '5 shifts'],
];

export default function SettingsPage() {
  return <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-2xl font-semibold">Settings</h2><p className="mt-2 text-slate-600">Editable-looking management tables and settings groups for the command centre workflow.</p></div><div className="grid gap-4 md:grid-cols-2">{settingsCards.map(([title, value]) => <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-600">{value}</p></article>)}</div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-3 text-left">Trainee</th><th className="pb-3 text-left">Department</th><th className="pb-3 text-left">Team Leader</th><th className="pb-3 text-left">Assessor</th></tr></thead><tbody>{trainees.slice(0, 10).map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="py-3">{item.name}</td><td className="py-3">{item.department}</td><td className="py-3">{item.teamLeader}</td><td className="py-3">{item.trainingAssessor}</td></tr>)}</tbody></table></div></div>;
}
