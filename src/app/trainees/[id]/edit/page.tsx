'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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

type TraineeForm = {
  id: number;
  name: string;
  departmentId: number;
  department: string;
  teamLeader: string;
  shiftLeader: string;
  trainingAssessor: string;
  shift: string;
  startDate: string;
};

type TraineeApiResponse = {
  id: number;
  name: string;
  departmentId: number;
  department: {
    id: number;
    name: string;
  };
  teamLeader: string | null;
  shiftLeader: string | null;
  trainingAssessor: string | null;
  shift: string | null;
  startDate: string | null;
};

function namesForRole(people: Person[], roleName: string) {
  return people
    .filter(
      (person) =>
        person.active && person.roles.some((role) => role.name === roleName),
    )
    .map((person) => person.name)
    .sort((left, right) => left.localeCompare(right));
}

export default function EditTraineePage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = Number(params.id);
  const hasValidTraineeId = Number.isInteger(traineeId) && traineeId > 0;
  const [form, setForm] = useState<TraineeForm | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(hasValidTraineeId);
  const [error, setError] = useState(hasValidTraineeId ? '' : 'Trainee not found.');

  useEffect(() => {
    if (!hasValidTraineeId) {
      return;
    }

    async function loadTrainee() {
      try {
        const [response, departmentsResponse, peopleResponse] =
          await Promise.all([
            fetch(`/api/trainees/${traineeId}`),
            fetch('/api/departments', { cache: 'no-store' }),
            fetch('/api/people', { cache: 'no-store' }),
          ]);

        if (!response.ok || !departmentsResponse.ok || !peopleResponse.ok) {
          setError(response.status === 404 ? 'Trainee not found.' : 'Failed to load trainee.');
          return;
        }

        const trainee = (await response.json()) as TraineeApiResponse;
        const departmentData = (await departmentsResponse.json()) as Department[];
        const peopleData = (await peopleResponse.json()) as PeopleResponse;
        const selectableDepartments = departmentData.filter(
          (department) =>
            department.active ||
            department.id === trainee.departmentId ||
            department.name === trainee.department.name,
        );

        setDepartments(selectableDepartments);
        setPeople(peopleData.people);
        setForm({
          id: trainee.id,
          name: trainee.name,
          departmentId: trainee.departmentId,
          department: trainee.department.name,
          teamLeader: trainee.teamLeader ?? '',
          shiftLeader: trainee.shiftLeader ?? '',
          trainingAssessor: trainee.trainingAssessor ?? '',
          shift: trainee.shift ?? '',
          startDate: trainee.startDate ? trainee.startDate.slice(0, 10) : '',
        });
      } catch {
        setError('Failed to load trainee.');
      } finally {
        setLoading(false);
      }
    }

    void loadTrainee();
  }, [hasValidTraineeId, traineeId]);

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
    if (!form) return;

    const response = await fetch(`/api/trainees/${form.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setError('Failed to save trainee.');
      return;
    }

    router.push(`/trainees/${form.id}`);
    router.refresh();
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading trainee...</div>;
  }

  if (!form) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{error || 'Trainee not found.'}</div>;
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Edit Colleague</p>
        <h2 className="mt-2 text-2xl font-semibold">Update trainee details without losing training history.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Colleague Name</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.name} onChange={(e) => setForm((prev) => prev ? { ...prev, name: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Department</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.department} onChange={(e) => setForm((prev) => prev ? { ...prev, department: e.target.value } : prev)}>{departments.length ? departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Team Leader</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.teamLeader} onChange={(e) => setForm((prev) => prev ? { ...prev, teamLeader: e.target.value } : prev)}>{teamLeaderOptions.length ? teamLeaderOptions.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Shift Leader</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.shiftLeader} onChange={(e) => setForm((prev) => prev ? { ...prev, shiftLeader: e.target.value } : prev)}>{shiftLeaderOptions.length ? shiftLeaderOptions.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Training Assessor</span><select className="w-full rounded-xl border border-slate-200 p-3" value={form.trainingAssessor} onChange={(e) => setForm((prev) => prev ? { ...prev, trainingAssessor: e.target.value } : prev)}>{trainingAssessorOptions.length ? trainingAssessorOptions.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No options configured</option>}</select></label>
        <label className="space-y-2 text-sm"><span>Shift</span><input className="w-full rounded-xl border border-slate-200 p-3" value={form.shift} onChange={(e) => setForm((prev) => prev ? { ...prev, shift: e.target.value } : prev)} /></label>
        <label className="space-y-2 text-sm"><span>Start Date</span><input type="date" className="w-full rounded-xl border border-slate-200 p-3" value={form.startDate} onChange={(e) => setForm((prev) => prev ? { ...prev, startDate: e.target.value } : prev)} /></label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-3">
        <button onClick={submit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Changes</button>
        <Link href={`/trainees/${form.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</Link>
      </div>
    </div>
  );
}
