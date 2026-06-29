'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ApiErrorResponse = {
  error?: unknown;
  message?: unknown;
};

type CreatedTraineeResponse = {
  id?: unknown;
  trainee?: {
    id?: unknown;
  };
};

type Department = {
  id: number;
  name: string;
  active: boolean;
};

type Role = {
  id: number;
  name: string;
};

type Person = {
  id: number;
  name: string;
  active: boolean;
  roles: Role[];
};

type PeopleResponse = {
  people: Person[];
  roles: Role[];
};

function getApiErrorMessage(payload: ApiErrorResponse) {
  const message = payload.error ?? payload.message;
  return typeof message === 'string' && message.trim() ? message : null;
}

function getCreatedTraineeId(payload: CreatedTraineeResponse) {
  const id = Number(payload.id ?? payload.trainee?.id);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function namesForRole(people: Person[], roleName: string) {
  return people
    .filter(
      (person) =>
        person.active && person.roles.some((role) => role.name === roleName),
    )
    .map((person) => person.name)
    .sort((left, right) => left.localeCompare(right));
}

export default function NewTraineePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState({
    name: '',
    department: '',
    teamLeader: '',
    shiftLeader: '',
    trainingAssessor: '',
    shift: 'Days',
    startDate: '2026-06-01',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMasterData() {
      try {
        const [departmentsResponse, peopleResponse] = await Promise.all([
          fetch('/api/departments', { cache: 'no-store' }),
          fetch('/api/people', { cache: 'no-store' }),
        ]);

        if (!departmentsResponse.ok || !peopleResponse.ok) {
          throw new Error('Failed to load master data.');
        }

        const departmentData = (await departmentsResponse.json()) as Department[];
        const peopleData = (await peopleResponse.json()) as PeopleResponse;
        const activeDepartments = departmentData.filter(
          (department) => department.active,
        );

        if (cancelled) {
          return;
        }

        setDepartments(activeDepartments);
        setPeople(peopleData.people);
        setForm((current) => ({
          ...current,
          department: current.department || activeDepartments[0]?.name || '',
          teamLeader:
            current.teamLeader ||
            namesForRole(peopleData.people, 'Team Leader')[0] ||
            '',
          shiftLeader:
            current.shiftLeader ||
            namesForRole(peopleData.people, 'Shift Leader')[0] ||
            '',
          trainingAssessor:
            current.trainingAssessor ||
            namesForRole(peopleData.people, 'Training Assessor')[0] ||
            '',
        }));
      } catch {
        if (!cancelled) {
          setError('Failed to load master data.');
        }
      }
    }

    void loadMasterData();

    return () => {
      cancelled = true;
    };
  }, []);

  const teamLeaderOptions = useMemo(
    () => namesForRole(people, 'Team Leader'),
    [people],
  );
  const shiftLeaderOptions = useMemo(
    () => namesForRole(people, 'Shift Leader'),
    [people],
  );
  const trainingAssessorOptions = useMemo(
    () => namesForRole(people, 'Training Assessor'),
    [people],
  );

const submit = async () => {
  setError('');

  const response = await fetch('/api/trainees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    setError(getApiErrorMessage(payload) ?? 'Failed to save trainee.');
    return;
  }

  const trainee = (await response.json()) as CreatedTraineeResponse;
  const traineeId = getCreatedTraineeId(trainee);

  if (!traineeId) {
    setError('Trainee was saved, but the new profile link was not returned.');
    return;
  }

  router.push(`/trainees/${traineeId}`);
};

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Add New Colleague</p>
        <h2 className="mt-2 text-2xl font-semibold">Create a trainee record and start the training workflow.</h2>
        <p className="mt-2 text-slate-600">The profile page opens immediately after save so the next step is assigning a training process.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Colleague Name</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Department</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}>{departments.length ? departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Team Leader</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.teamLeader} onChange={(e) => setForm((prev) => ({ ...prev, teamLeader: e.target.value }))}>{teamLeaderOptions.length ? teamLeaderOptions.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Shift Leader</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.shiftLeader} onChange={(e) => setForm((prev) => ({ ...prev, shiftLeader: e.target.value }))}>{shiftLeaderOptions.length ? shiftLeaderOptions.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Training Assessor</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingAssessor} onChange={(e) => setForm((prev) => ({ ...prev, trainingAssessor: e.target.value }))}>{trainingAssessorOptions.length ? trainingAssessorOptions.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Shift</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.shift} onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value }))} /></label>
        <label className="space-y-2 text-sm"><span>Start Date</span><input type="date" className="w-full rounded-xl border border-slate-200 p-3" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} /></label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-3">
        <button onClick={submit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Trainee</button>
        <Link href="/trainees" className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back to Training Records</Link>
      </div>
    </div>
  );
}
