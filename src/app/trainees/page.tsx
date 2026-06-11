'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { archiveTrainee, loadTraineeState } from '@/lib/trainee-management';

export default function TraineesPage() {
  const [trainees, setTrainees] = useState(loadTraineeState().trainees);
  const [traineeProcesses, setTraineeProcesses] = useState(loadTraineeState().traineeProcesses);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [teamLeader, setTeamLeader] = useState('All');
  const [assessor, setAssessor] = useState('All');
  const [status, setStatus] = useState('All');

  const filteredTrainees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trainees.filter((trainee) => {
      if (trainee.archived && status === 'Active') return false;
      if (!trainee.archived && status === 'Archived') return false;
      if (query && !trainee.name.toLowerCase().includes(query)) return false;
      if (department !== 'All' && trainee.department !== department) return false;
      if (teamLeader !== 'All' && trainee.teamLeader !== teamLeader) return false;
      if (assessor !== 'All' && trainee.trainingAssessor !== assessor) return false;
      if (status !== 'All' && (status === 'Active' ? trainee.archived : !trainee.archived)) return false;
      return true;
    });
  }, [assessor, department, search, status, teamLeader, trainees]);

  const archive = (id: number) => {
    const next = archiveTrainee(id);
    setTrainees(next.trainees);
    setTraineeProcesses(next.traineeProcesses);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">Trainees</p>
          <h2 className="mt-2 text-2xl font-semibold">Manage trainee profiles, processes and follow-up actions.</h2>
          <p className="mt-2 text-slate-600">Create, update and archive trainees while keeping all history visible in one place.</p>
        </div>
        <Link href="/trainees/new" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Add New Trainee</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by trainee name" className="rounded-xl border border-slate-200 p-3" />
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl border border-slate-200 p-3"><option>All</option>{Array.from(new Set(trainees.map((item) => item.department))).map((value) => <option key={value}>{value}</option>)}</select>
        <select value={teamLeader} onChange={(e) => setTeamLeader(e.target.value)} className="rounded-xl border border-slate-200 p-3"><option>All</option>{Array.from(new Set(trainees.map((item) => item.teamLeader))).map((value) => <option key={value}>{value}</option>)}</select>
        <select value={assessor} onChange={(e) => setAssessor(e.target.value)} className="rounded-xl border border-slate-200 p-3"><option>All</option>{Array.from(new Set(trainees.map((item) => item.trainingAssessor))).map((value) => <option key={value}>{value}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 p-3"><option>All</option><option>Active</option><option>Archived</option></select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 text-left">Trainee Name</th>
              <th className="pb-3 text-left">Department</th>
              <th className="pb-3 text-left">Team Leader</th>
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
            {filteredTrainees.map((trainee) => {
              const activeProcesses = traineeProcesses.filter((item) => item.traineeId === trainee.id && item.stage !== 'Competent' && item.status !== 'Archived').length;
              const competentProcesses = traineeProcesses.filter((item) => item.traineeId === trainee.id && item.stage === 'Competent').length;
              const followUp = traineeProcesses.some((item) => item.traineeId === trainee.id && item.followUpFlag && item.followUpFlag !== 'NONE');

              return (
                <tr key={trainee.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 font-medium text-slate-900">{trainee.name}</td>
                  <td className="py-3">{trainee.department}</td>
                  <td className="py-3">{trainee.teamLeader}</td>
                  <td className="py-3">{trainee.trainingAssessor}</td>
                  <td className="py-3">{trainee.shift}</td>
                  <td className="py-3">{trainee.startDate}</td>
                  <td className="py-3">{activeProcesses}</td>
                  <td className="py-3">{competentProcesses}</td>
                  <td className="py-3">{trainee.archived ? 'Archived' : 'Active'}</td>
                  <td className="py-3">{followUp ? 'Yes' : 'No'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link href={`/trainees/${trainee.id}`} className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">View Profile</Link>
                      <Link href={`/trainees/${trainee.id}/edit`} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Edit Trainee</Link>
                      <Link href={`/trainees/${trainee.id}/assign`} className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Assign Process</Link>
                      <button onClick={() => archive(trainee.id)} className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Archive Trainee</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
