'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

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

const defaultDepartment = 'Surfacing';

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
  const defaultDepartmentApplied = useRef(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [teamLeader, setTeamLeader] = useState('All');
  const [assessor, setAssessor] = useState('All');
  const [status, setStatus] = useState('Active');
  const [error, setError] = useState('');
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrainees() {
      try {
        const traineeData = await fetchTrainees(controller.signal);

        setTrainees(traineeData);
        if (
          !defaultDepartmentApplied.current &&
          traineeData.some(
            (trainee) => trainee.department.name === defaultDepartment,
          )
        ) {
          setDepartment((current) =>
            current === 'All' ? defaultDepartment : current,
          );
        }
        defaultDepartmentApplied.current = true;
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

  useEffect(() => {
    if (openActionMenuId === null) {
      return;
    }

    function closeOpenMenu(event: PointerEvent) {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setOpenActionMenuId(null);
      }
    }

    document.addEventListener('pointerdown', closeOpenMenu);

    return () => document.removeEventListener('pointerdown', closeOpenMenu);
  }, [openActionMenuId]);

  function firstNameSortValue(name: string) {
    return name.trim().split(/\s+/)[0]?.toLocaleLowerCase() ?? '';
  }

  const filteredTrainees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trainees
      .filter((trainee) => {
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
      })
      .toSorted((left, right) => {
        const firstNameOrder = firstNameSortValue(left.name).localeCompare(
          firstNameSortValue(right.name),
          undefined,
          { sensitivity: 'base' },
        );

        if (firstNameOrder !== 0) {
          return firstNameOrder;
        }

        const fullNameOrder = left.name.localeCompare(right.name, undefined, {
          sensitivity: 'base',
        });

        return fullNameOrder !== 0 ? fullNameOrder : left.id - right.id;
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
            Training Records
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
          Add New Colleague
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
              <th className="pb-3 text-left">Colleague Name</th>
              <th className="pb-3 text-left">Department</th>
              <th className="pb-3 text-left">Shift</th>
              <th className="pb-3 text-center">Active Training</th>
              <th className="pb-3 text-center">Competent Processes</th>
              <th className="pb-3 text-center">Follow-Up Required</th>
              <th className="pb-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainees.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td className="py-3 text-slate-600" colSpan={7}>
                  No colleagues match the current filters.
                </td>
              </tr>
            ) : (
              filteredTrainees.map((trainee) => {
                const hasOpenMenu = openActionMenuId === trainee.id;

                return (
                  <tr
                    key={trainee.id}
                    className="border-t border-slate-100 align-top"
                  >
                    <td className="py-3 font-medium text-slate-900">
                      <span className="whitespace-nowrap">{trainee.name}</span>
                    </td>
                    <td className="py-3">{trainee.department.name}</td>
                    <td className="py-3">{trainee.shift || '-'}</td>
                    <td className="py-3 text-center">
                      {trainee.activeProcessCount}
                    </td>
                    <td className="py-3 text-center">
                      {trainee.competentProcessCount}
                    </td>
                    <td className="py-3 text-center">
                      {trainee.followUpRequired ? 'Yes' : 'No'}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Link
                          href={`/trainees/${trainee.id}`}
                          className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700"
                        >
                          View Profile
                        </Link>
                        <div
                          ref={hasOpenMenu ? actionMenuRef : null}
                          className="relative inline-block"
                        >
                          <button
                            type="button"
                            aria-expanded={hasOpenMenu}
                            onClick={() =>
                              setOpenActionMenuId((current) =>
                                current === trainee.id ? null : trainee.id,
                              )
                            }
                            className="rounded-full bg-slate-900 px-3 py-1 font-medium text-white"
                          >
                            Actions
                          </button>
                          {hasOpenMenu ? (
                            <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                              <Link
                                href={`/trainees/${trainee.id}/edit`}
                                className="block rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                Edit Colleague
                              </Link>
                              {!trainee.archived ? (
                                <>
                                  <Link
                                    href={`/trainees/${trainee.id}/assign`}
                                    className="block rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                                  >
                                    Assign Process
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      void archive(trainee.id);
                                    }}
                                    disabled={archivingId === trainee.id}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {archivingId === trainee.id
                                      ? 'Archiving...'
                                      : 'Archive Colleague'}
                                  </button>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
