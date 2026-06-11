'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { departmentSummary, weeklyPlanner } from '@/lib/mock-data';
import { exportPdfReport, exportWordReport } from '@/lib/export';
import { loadRefresherState, loadTraineeState } from '@/lib/trainee-management';

export default function Home() {
  const [pipelineItems] = useState(loadTraineeState().traineeProcesses);
  const [trainees] = useState(loadTraineeState().trainees);
  const [refreshers] = useState(loadRefresherState());

  const urgentRefreshers = refreshers.filter((item) => item.status !== 'Completed' && item.status !== 'Due Next Month').slice(0, 5);
  const urgentPipeline = useMemo(() => pipelineItems.filter((item) => item.followUpFlag !== 'NONE').slice(0, 5), [pipelineItems]);
  const plannerHighlights = weeklyPlanner.slice(0, 5);
  const activeTrainees = useMemo(() => trainees.filter((item) => !item.archived).length, [trainees]);
  const competentProcesses = useMemo(() => pipelineItems.filter((item) => item.stage === 'Competent' || item.status === 'Competent').length, [pipelineItems]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Command Centre Dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Who is in training, what is planned, and what needs action next?</h2>
        <p className="mt-3 max-w-3xl text-slate-600">This MVP dashboard uses live-style training data to surface active pipeline items, follow-up flags, and departmental workload across the manufacturing training environment.</p>
        <div className="mt-4 flex gap-3">
          <button onClick={() => exportWordReport('Training Command Centre Summary', ['Active pipeline items 21', 'Chase items 4', 'Ready for assessment 4'])} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Export Word</button>
          <button onClick={() => exportPdfReport('Training Command Centre Summary', ['Active pipeline items 21', 'Chase items 4', 'Ready for assessment 4'])} className="rounded-xl bg-sky-700 px-4 py-2 text-sm text-white">Export PDF</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Active Pipeline Items', pipelineItems.length], ['Active Trainees', activeTrainees], ['Competent Processes', competentProcesses], ['Chase Items', pipelineItems.filter((item) => item.followUpFlag === 'CHASE').length],
          ['Priority Items', pipelineItems.filter((item) => item.followUpFlag === 'PRIORITISE').length], ['Ready for Pre-Assessment', pipelineItems.filter((item) => item.stage === 'Ready for Pre-Assessment').length], ['Ready for Assessment', pipelineItems.filter((item) => item.stage === 'Ready for Assessment').length], ['Refreshers Overdue', refresherItems.filter((item) => item.status === 'Overdue').length],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Work Requiring Attention</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {urgentPipeline.map((item) => (
              <li key={`${item.trainee}-${item.process}`} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">{item.trainee} · {item.process} · {item.department} · {item.followUpFlag} · {item.nextAction}</li>
            ))}
          </ul>
          <Link href="/training-pipeline" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">View All Pipeline Items</Link>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Department Summary</h3>
          <div className="mt-4 space-y-3">
            {departmentSummary.map((item) => (
              <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between"><strong>{item.name}</strong><span>{item.active} active</span></div>
                <p className="mt-2 text-slate-600">Competent {item.competent} · Chase {item.chase} · Ready {item.ready}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">This Week’s Planned Activities</h3>
          <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-2 text-left">Trainee</th><th className="pb-2 text-left">Activity</th><th className="pb-2 text-left">Status</th></tr></thead><tbody>{plannerHighlights.map((item) => <tr key={`${item.trainee}-${item.activityType}`} className="border-t border-slate-100"><td className="py-3">{item.trainee}</td><td className="py-3">{item.activityType}</td><td className="py-3">{item.status}</td></tr>)}</tbody></table></div>
          <Link href="/weekly-planner" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">View Weekly Planner</Link>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Refreshers Due</h3>
          <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-slate-500"><tr><th className="pb-2 text-left">Trainee</th><th className="pb-2 text-left">Due</th><th className="pb-2 text-left">Status</th></tr></thead><tbody>{urgentRefreshers.map((item) => <tr key={`${item.trainee}-${item.refresherDueDate}`} className="border-t border-slate-100"><td className="py-3">{item.trainee}</td><td className="py-3">{item.refresherDueDate}</td><td className="py-3">{item.status}</td></tr>)}</tbody></table></div>
          <Link href="/refreshers" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">View All Refreshers</Link>
        </article>
      </section>
    </div>
  );
}
