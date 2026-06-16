'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type TraineeListItem = {
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
  archived: boolean;
  activeProcessCount: number;
  competentProcessCount: number;
  followUpRequired: boolean;
};

async function fetchTrainees(signal?: AbortSignal) {
  const response = await fetch('/api/trainees', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load trainees.');
  }

  return (await response.json()) as TraineeListItem[];
}

export default function TraineesPage() {
  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [teamLeader, setTeamLeader] = useState('All');
  const [assessor, setAssessor] = useState('All');
  const [status, setStatus] = useState('Active');
  const [error, setError] = useState('');
  const [archivingId, setArchivingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrainees() {
      try {
        setTrainees(await fetchTrainees(controller.signal));
        setError('');
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load trainees.');
        }
      }
    }

    void loadTrainees();
    return () => controller.abort();
  }, []);

  const filteredTrainees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trainees.filter((trainee) => {
      if (trainee.archived && status === 'Active') return false;
      if (!trainee.archived && status === 'Archived') return false;
      if (query && !trainee.name.toLowerCase().includes(query)) return false;
      if (department !== 'All' && trainee.department.name !== department) {
        return false;
      }
      if (teamLeader !== 'All' && trainee.teamLeader !== teamLeader) {
        return false;
      }
      if (assessor !== 'All' && trainee.trainingAssessor !== assessor) {
        return false;
      }
      return true;
    });
  }, [assessor, department, search, status, teamLeader, trainees]);

  const archive = async (id: number) => {
    setError('');
    setArchivingId(id);

    try {
      const response = await fetch(`/api/trainees/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: true }),
      });

      if (!response.ok) {
        setError('Failed to archive trainee.');
        return;
      }

      setTrainees(await fetchTrainees());
      setError('');
    } catch {
      setError('Failed to archive trainee.');
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Trainees
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Manage trainee profiles, processes and follow-up actions.
          </h2>
          <p className="mt-2 text-slate-600">
            Create, update and archive trainees while keeping all history
            visible in one place.
          </p>
        </div>
        <Link
          href="/trainees/new"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Add New Trainee
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by trainee name"
          className="rounded-xl border border-slate-200 p-3"
        />
        <select
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          className="rounded-xl border border-slate-200 p-3"
        >
          <option>All</option>
          {Array.from(
            new Set(trainees.map((item) => item.department.name)),
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={teamLeader}
          onChange={(event) => setTeamLeader(event.target.value)}
          className="rounded-xl border border-slate-200 p-3"
        >
          <option>All</option>
          {Array.from(
            new Set(
              trainees
                .map((item) => item.teamLeader)
                .filter((value): value is string => Boolean(value)),
            ),
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={assessor}
          onChange={(event) => setAssessor(event.target.value)}
          className="rounded-xl border border-slate-200 p-3"
        >
          <option>All</option>
          {Array.from(
            new Set(
              trainees
                .map((item) => item.trainingAssessor)
                .filter((value): value is string => Boolean(value)),
            ),
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-200 p-3"
        >
          <option>All</option>
          <option>Active</option>
          <option>Archived</option>
        </select>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 text-left">Trainee Name</th>
              <th className="pb-3 text-left">Department</th>
              <th className="pb-3 text-left">Team Leader</th>
              <th className="pb-3 text-left">Shift Leader</th>
              <th className="pb-3 text-left">Training Assessor</th>
              <th className="pb-3 text-left">Shift</th>
              <th className="pb-3 text-left">Start Date</th>
              <th className="pb-3 text-left">Active Processes</th>
              <th className="pb-3 text-left">Competent Processes</th>
              <th className="pb-3 text-left">Current Status</th>
              <th className="pb-3 text-left">Follow-Up Required</th>
              <th className="pb-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainees.map((trainee) => (
              <tr
                key={trainee.id}
                className="border-t border-slate-100 align-top"
              >
                <td className="py-3 font-medium text-slate-900">
                  {trainee.name}
                </td>
                <td className="py-3">{trainee.department.name}</td>
                <td className="py-3">{trainee.teamLeader || '-'}</td>
                <td className="py-3">{trainee.shiftLeader || '-'}</td>
                <td className="py-3">{trainee.trainingAssessor || '-'}</td>
                <td className="py-3">{trainee.shift || '-'}</td>
                <td className="py-3">
                  {trainee.startDate
                    ? new Date(trainee.startDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="py-3">{trainee.activeProcessCount}</td>
                <td className="py-3">{trainee.competentProcessCount}</td>
                <td className="py-3">
                  {trainee.archived ? 'Archived' : 'Active'}
                </td>
                <td className="py-3">
                  {trainee.followUpRequired ? 'Yes' : 'No'}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link
                      href={`/trainees/${trainee.id}`}
                      className="rounded-full bg-sky-50 px-3 py-1 text-sky-700"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/trainees/${trainee.id}/edit`}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"
                    >
                      Edit Trainee
                    </Link>
                    <Link
                      href={`/trainees/${trainee.id}/assign`}
                      className="rounded-full bg-amber-50 px-3 py-1 text-amber-700"
                    >
                      Assign Process
                    </Link>
                    <button
                      onClick={() => void archive(trainee.id)}
                      disabled={trainee.archived || archivingId === trainee.id}
                      className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {archivingId === trainee.id
                        ? 'Archiving...'
                        : trainee.archived
                          ? 'Archived'
                          : 'Archive Trainee'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
