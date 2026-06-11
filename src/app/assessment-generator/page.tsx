'use client';

import { useMemo, useState } from 'react';
import { assessmentRecords, traineeProcesses, trainees } from '@/lib/mock-data';

export default function AssessmentGeneratorPage() {
  const [type, setType] = useState('Pre-Assessment');
  const [trainee, setTrainee] = useState(trainees[0].name);
  const [process, setProcess] = useState('Lens Inspection');
  const [outcome, setOutcome] = useState('Pass');
  const [strengths, setStrengths] = useState('Strong practical understanding and controlled handover.');
  const [developmentAreas, setDevelopmentAreas] = useState('Time management during changeover.');

  const record = useMemo(() => ({
    trainee,
    process,
    type,
    outcome,
    strengths,
    developmentAreas,
    date: '2026-06-05',
    assessor: 'J. Evans',
  }), [type, trainee, process, outcome, strengths, developmentAreas]);

  return <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-2xl font-semibold">Assessment Generator</h2><p className="mt-2 text-slate-600">Complete the assessment once and generate the related record previews for the team leader and competency file.</p></div><div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]"><form className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5" onSubmit={(e) => e.preventDefault()}><div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-700">Assessment Type<select className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" value={type} onChange={(e) => setType(e.target.value)}><option>Pre-Assessment</option><option>Assessment</option></select></label><label className="text-sm text-slate-700">Trainee<select className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" value={trainee} onChange={(e) => setTrainee(e.target.value)}>{trainees.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="text-sm text-slate-700">Process<select className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" value={process} onChange={(e) => setProcess(e.target.value)}>{Array.from(new Set(traineeProcesses.map((item) => item.process))).slice(0, 8).map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-slate-700">Outcome<select className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option>Pass</option><option>Development Required</option><option>Competent</option><option>Not Yet Competent</option></select></label></div><label className="block text-sm text-slate-700">Strengths<textarea className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" value={strengths} onChange={(e) => setStrengths(e.target.value)} /></label><label className="block text-sm text-slate-700">Development Areas<textarea className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" value={developmentAreas} onChange={(e) => setDevelopmentAreas(e.target.value)} /></label><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Generate Preview</button></form><div className="space-y-4"><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Generated Team Leader Report Preview</h3><p className="mt-2 text-sm text-slate-600">Team Leader: M. Patel</p><p className="mt-1 text-sm text-slate-600">Trainee: {record.trainee}</p><p className="mt-1 text-sm text-slate-600">Department: Surfacing</p><p className="mt-1 text-sm text-slate-600">Assessment Type: {record.type}</p><p className="mt-1 text-sm text-slate-600">Strengths: {record.strengths}</p><p className="mt-1 text-sm text-slate-600">Development Areas: {record.developmentAreas}</p><p className="mt-1 text-sm text-slate-600">Recommended Next Action: {record.outcome === 'Competent' || record.outcome === 'Pass' ? 'Maintain standard and schedule refresher' : 'Support development and monitor next week'}</p></article><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Competency Assessment Record Preview</h3><p className="mt-2 text-sm text-slate-600">Trainee Name: {record.trainee}</p><p className="mt-1 text-sm text-slate-600">Process: {record.process}</p><p className="mt-1 text-sm text-slate-600">Assessment Date: {record.date}</p><p className="mt-1 text-sm text-slate-600">Assessor: {record.assessor}</p><p className="mt-1 text-sm text-slate-600">Outcome: {record.outcome}</p><p className="mt-1 text-sm text-slate-600">Evidence Summary: {record.strengths}</p><p className="mt-1 text-sm text-slate-600">Development Required: {record.developmentAreas}</p></article><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Generated Record Count</h3><p className="mt-2 text-sm text-slate-600">Current sample records available: {assessmentRecords.length}</p><p className="mt-1 text-sm text-slate-600">This preview is ready to be connected to the real record generator in the next iteration.</p></article></div></div></div>;
}
