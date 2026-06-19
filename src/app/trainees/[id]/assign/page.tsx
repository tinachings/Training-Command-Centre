'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type TraineeResponse = {
  id: number;
  name: string;
  teamLeader: string | null;
  department: {
    name: string;
  };
};

type ProcessOption = {
  id: number;
  name: string;
  departmentId: number;
};

export default function AssignProcessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const traineeId = Number(params.id);
  const hasValidTraineeId = Number.isInteger(traineeId) && traineeId > 0;
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>(
    hasValidTraineeId ? 'loading' : 'error',
  );
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    traineeId,
    trainee: '',
    department: '',
    processId: '',
    trainingBuddy: 'T. Reed',
    trainingStartDate: '2026-06-10',
    stage: 'Requested',
    requestedBy: 'M. Patel',
    riskAssessmentComplete: true,
    sopComplete: true,
    nextAction: 'Confirm setup and training plan',
    followUpFlag: 'NONE',
  });

  useEffect(() => {
    if (!hasValidTraineeId) {
      return;
    }

    const controller = new AbortController();

    async function loadTrainee() {
      try {
        const [traineeResponse, processesResponse] = await Promise.all([
          fetch(`/api/trainees/${traineeId}`, {
            cache: 'no-store',
            signal: controller.signal,
          }),
          fetch(`/api/trainees/${traineeId}/processes`, {
            cache: 'no-store',
            signal: controller.signal,
          }),
        ]);

        if (!traineeResponse.ok || !processesResponse.ok) {
          setLoadStatus('error');
          return;
        }

        const trainee = (await traineeResponse.json()) as TraineeResponse;
        const processOptions =
          (await processesResponse.json()) as ProcessOption[];

        setProcesses(processOptions);
        setForm((current) => ({
          ...current,
          traineeId: trainee.id,
          trainee: trainee.name,
          department: trainee.department.name,
          processId: processOptions[0] ? String(processOptions[0].id) : '',
          requestedBy: trainee.teamLeader || current.requestedBy,
        }));
        setLoadStatus('ready');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setLoadStatus('error');
        }
      }
    }

    void loadTrainee();
    return () => controller.abort();
  }, [hasValidTraineeId, traineeId]);

  const submit = async () => {
    setSubmitError('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/trainees/${form.traineeId}/processes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processId: form.processId,
          stage: form.stage,
          nextAction: form.nextAction,
          followUpFlag: form.followUpFlag,
          trainingBuddy: form.trainingBuddy,
          trainingStartDate: form.trainingStartDate,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setSubmitError(data?.error || 'Failed to assign process.');
        return;
      }

      router.push(`/trainees/${form.traineeId}`);
    } catch {
      setSubmitError('Failed to assign process.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Loading trainee...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p>Trainee not found.</p>
        <Link href="/trainees" className="text-sm text-sky-700">
          Back to Trainees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Assign Process</p>
        <h2 className="mt-2 text-2xl font-semibold">Add a new process to the trainee profile.</h2>
        <p className="mt-2 text-slate-600">This inserts the process into the existing training pipeline and updates the profile view immediately.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Trainee</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.trainee} readOnly /></label>
        <label className="space-y-2 text-sm"><span>Department</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.department} readOnly /></label>
        <label className="space-y-2 text-sm"><span>Process</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.processId} onChange={(e) => setForm((prev) => ({ ...prev, processId: e.target.value }))}>{processes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="space-y-2 text-sm"><span>Training Buddy</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingBuddy} onChange={(e) => setForm((prev) => ({ ...prev, trainingBuddy: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Date Requested</span><input type="date" className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingStartDate} onChange={(e) => setForm((prev) => ({ ...prev, trainingStartDate: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Requested By</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.requestedBy} onChange={(e) => setForm((prev) => ({ ...prev, requestedBy: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Risk Assessment Complete</span><select className="w-full rounded-xl border border-slate-200 p-3" value={String(form.riskAssessmentComplete)} onChange={(e) => setForm((prev) => ({ ...prev, riskAssessmentComplete: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="space-y-2 text-sm"><span>SOP Complete</span><select className="w-full rounded-xl border border-slate-200 p-3" value={String(form.sopComplete)} onChange={(e) => setForm((prev) => ({ ...prev, sopComplete: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="space-y-2 text-sm"><span>Initial Stage</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value, nextAction: e.target.value === 'In Training' ? 'Continue coaching and log check-in' : e.target.value === 'Setup Complete' ? 'Verify training setup and buddy handover' : 'Confirm request and schedule first session' }))}><option>Requested</option><option>Setup Complete</option><option>In Training</option></select></label>
        <label className="space-y-2 text-sm"><span>Next Action</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.nextAction} onChange={(e) => setForm((prev) => ({ ...prev, nextAction: e.target.value }))} /></label>
      </div>
      {submitError ? (
        <p className="text-sm font-medium text-rose-700">{submitError}</p>
      ) : null}
      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={submitting || !form.processId}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Assigning...' : 'Assign Process'}
        </button>
        <Link href={`/trainees/${form.traineeId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to Profile</Link>
      </div>
    </div>
  );
}
