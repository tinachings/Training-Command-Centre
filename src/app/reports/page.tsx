'use client';

'use client';

import { useMemo, useState } from 'react';
import { assessmentRecords, weeklyPlannerItems } from '@/lib/mock-data';
import { loadRefresherState, loadTraineeState } from '@/lib/trainee-management';

export default function ReportsPage() {
  const [traineeProcesses] = useState(loadTraineeState().traineeProcesses);
  const [refreshers] = useState(loadRefresherState());
  const activeProcesses = useMemo(() => traineeProcesses.filter((item) => item.stage !== 'Competent' && item.status !== 'Archived').length, [traineeProcesses]);
  const competentProcesses = useMemo(() => traineeProcesses.filter((item) => item.stage === 'Competent').length, [traineeProcesses]);

  return <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-2xl font-semibold">Reports</h2><p className="mt-2 text-slate-600">Structured report previews for the training command centre workflow.</p></div><div className="grid gap-6 lg:grid-cols-2">{[
    ['Weekly Training Report', `Planned ${weeklyPlannerItems.length}; Completed ${weeklyPlannerItems.filter((item) => item.status === 'Completed').length}; Deferred ${weeklyPlannerItems.filter((item) => item.status === 'Deferred').length}`],
    ['Department Team Leader Update', `Active items ${activeProcesses}; Competent items ${competentProcesses}; Refreshers due ${refreshers.filter((item) => item.status !== 'Completed').length}`],
    ['Trainee Training Record', `Trainees ${new Set(traineeProcesses.map((item) => item.trainee)).size}; Active processes ${activeProcesses}; Competent processes ${competentProcesses}; Assessment records ${assessmentRecords.length}`],
    ['Assessment Summary', `Pre-assessments ${assessmentRecords.filter((item) => item.assessmentType === 'Pre-Assessment').length}; Assessments ${assessmentRecords.filter((item) => item.assessmentType === 'Assessment').length}; Competent outcomes ${assessmentRecords.filter((item) => item.outcome === 'Competent').length}`],
    ['Refresher Summary', `Overdue ${refreshers.filter((item) => item.status === 'Overdue').length}; Due this month ${refreshers.filter((item) => item.status === 'Due This Month').length}; Completed ${refreshers.filter((item) => item.status === 'Completed').length}`],
  ].map(([title, body]) => <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-600">{body}</p></article>)}</div></div>;
}
