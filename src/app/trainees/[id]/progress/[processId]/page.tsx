'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { loadTraineeState, updateProcessProgress } from '@/lib/trainee-management';

const stageActionMap: Record<string, string> = {
  Requested: 'Complete RA, SOP and buddy allocation.',
  'Setup Complete': 'Verify training setup and buddy handover.',
  'In Training': 'Continue coaching and log check-in.',
  Monitoring: 'Chase buddy / colleague for progress update.',
  'Ready for Pre-Assessment': 'Schedule pre-assessment.',
  'Ready for Assessment': 'Schedule assessment.',
  'Assessment Passed - Sign Off': 'Complete sign-off and update records.',
  'Retraining Required': 'Reset plan and retrain gap areas.',
  Competent: 'Maintain standard and move to refresher tracking.',
};

function calculateFollowUpFlag(process: { stage: string; trainingBuddy?: string; riskAssessmentComplete?: boolean; sopComplete?: boolean; lastCheckInDate?: string; followUpFlag?: string; }) {
  if (process.stage === 'Competent') return 'NONE';
  const daysSinceCheckIn = process.lastCheckInDate ? Math.max(0, Math.floor((Date.now() - new Date(process.lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
  if ((process.followUpFlag === 'CHASE' || process.followUpFlag === 'ACTION') && daysSinceCheckIn > 10) return 'ESCALATE';
  if (process.stage === 'Retraining Required') return 'ACTION';
  if (process.stage === 'Ready for Pre-Assessment' || process.stage === 'Ready for Assessment') return 'PRIORITISE';
  if (process.stage === 'Monitoring' || (daysSinceCheckIn > 5 && process.stage !== 'Competent')) return 'CHASE';
  if (process.stage === 'Requested' && (!process.riskAssessmentComplete || !process.sopComplete || !process.trainingBuddy?.trim())) return 'SET UP';
  return 'NONE';
}

export default function ProcessProgressPage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = Number(params.id);
  const processId = Number(params.processId);
  const { trainees, traineeProcesses } = loadTraineeState();
  const trainee = useMemo(() => trainees.find((item) => item.id === traineeId), [traineeId, trainees]);
  const assignment = useMemo(() => traineeProcesses.find((item) => item.id === processId), [processId, traineeProcesses]);
  const [stage, setStage] = useState(assignment?.stage ?? 'In Training');
  const [nextAction, setNextAction] = useState(assignment?.nextAction ?? '');
  const [followUpFlag, setFollowUpFlag] = useState(assignment?.followUpFlag ?? 'NONE');

  if (!trainee || !assignment) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Process not found.</div>;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProcessProgress({
      ...assignment,
      stage,
      nextAction,
      followUpFlag,
      lastCheckInDate: new Date().toISOString().slice(0, 10),
      readinessScore: assignment.readinessScore ?? 0,
    });
    router.push(`/trainees/${trainee.id}`);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Update Progress</p>
          <h2 className="mt-2 text-2xl font-semibold">{assignment.process}</h2>
          <p className="mt-2 text-slate-600">Record the current training stage and follow-up actions for {trainee.name}.</p>
        </div>
        <Link href={`/trainees/${trainee.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to profile</Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Stage</span><select value={stage} onChange={(event) => setStage(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option>Requested</option><option>Setup Complete</option><option>In Training</option><option>Monitoring</option><option>Ready for Pre-Assessment</option><option>Ready for Assessment</option><option>Assessment Passed - Sign Off</option><option>Retraining Required</option><option>Competent</option></select></label>
        <label className="space-y-2 text-sm"><span>Follow-up Flag</span><select value={followUpFlag} onChange={(event) => setFollowUpFlag(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="NONE">NONE</option><option value="CHASE">CHASE</option><option value="ESCALATE">ESCALATE</option></select></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Next Action</span><textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" rows={3} /></label>
        <div className="md:col-span-2 flex justify-end gap-2"><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Progress</button></div>
      </form>
    </div>
  );
}
