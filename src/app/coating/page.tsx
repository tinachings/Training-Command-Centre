'use client';

import { useMemo, useState } from 'react';
import { loadTraineeState } from '@/lib/trainee-management';

export default function CoatingPage() {
  const [traineeProcesses] = useState(loadTraineeState().traineeProcesses);
  const activeProcesses = useMemo(() => traineeProcesses.filter((item) => item.department === 'Coating' && item.stage !== 'Competent' && item.status !== 'Archived').length, [traineeProcesses]);
  const competentProcesses = useMemo(() => traineeProcesses.filter((item) => item.department === 'Coating' && item.stage === 'Competent').length, [traineeProcesses]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Coating Dashboard</h2>
      <p className="mt-3 text-slate-600">The coating dashboard mirrors the surfacing view and is filtered for coating-specific activities.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Active Processes</p><p className="mt-2 text-3xl font-semibold text-slate-900">{activeProcesses}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Competent Processes</p><p className="mt-2 text-3xl font-semibold text-slate-900">{competentProcesses}</p></article>
      </div>
    </div>
  );
}
