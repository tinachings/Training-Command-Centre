'use client';

import { useMemo, useState } from 'react';
import { assessmentRecords } from '@/lib/mock-data';

export default function AssessmentRecordsPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [type, setType] = useState('All');
  const [outcome, setOutcome] = useState('All');

  const filtered = useMemo(() => assessmentRecords.filter((item) => (search === '' || `${item.trainee} ${item.process} ${item.assessor}`.toLowerCase().includes(search.toLowerCase())) && (department === 'All' || item.department === department) && (type === 'All' || item.assessmentType === type) && (outcome === 'All' || item.outcome === outcome)), [search, department, type, outcome]);

  return <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-2xl font-semibold">Assessment Records</h2><p className="mt-2 text-slate-600">Searchable history of completed assessments and pre-assessments generated from the workflow.</p></div><div className="grid gap-3 md:grid-cols-4"><input className="rounded-xl border border-slate-200 p-3" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trainee, process or assessor" /><select className="rounded-xl border border-slate-200 p-3" value={department} onChange={(e) => setDepartment(e.target.value)}><option>All</option><option>Surfacing</option><option>Coating</option></select><select className="rounded-xl border border-slate-200 p-3" value={type} onChange={(e) => setType(e.target.value)}><option>All</option><option>Pre-Assessment</option><option>Assessment</option></select><select className="rounded-xl border border-slate-200 p-3" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option>All</option><option>Pass</option><option>Development Required</option><option>Competent</option><option>Not Yet Competent</option></select></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-3 text-left">Date</th><th className="pb-3 text-left">Trainee</th><th className="pb-3 text-left">Process</th><th className="pb-3 text-left">Type</th><th className="pb-3 text-left">Outcome</th><th className="pb-3 text-left">Assessor</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="py-3">{item.date}</td><td className="py-3">{item.trainee}</td><td className="py-3">{item.process}</td><td className="py-3">{item.assessmentType}</td><td className="py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{item.outcome}</span></td><td className="py-3">{item.assessor}</td></tr>)}</tbody></table></div></div>;
}
