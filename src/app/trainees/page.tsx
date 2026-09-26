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


type NewTrainingHistoryItem = {
  traineeProcessId: number;
  traineeId: number;
  traineeName: string;
  departmentName: string;
  processName: string;
  trainingStartDate: string;
  trainingBuddy: string | null;
  trainingAssessor: string | null;
  assignmentStatus: string;
};

type NewTrainingHistoryResponse = {
  month: string;
  total: number;
  departmentCounts: Record<string, number>;
  trainings: NewTrainingHistoryItem[];
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);

  if (!year || !month) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatHistoryDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);

  if (!year || !month || !day) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

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
  const [trainingHistoryOpen, setTrainingHistoryOpen] = useState(false);
  const [trainingHistoryMonth, setTrainingHistoryMonth] = useState(() =>
    currentMonthKey(),
  );
  const [trainingHistory, setTrainingHistory] =
    useState<NewTrainingHistoryResponse | null>(null);
  const [trainingHistoryLoading, setTrainingHistoryLoading] = useState(false);
  const [trainingHistoryError, setTrainingHistoryError] = useState('');
  const [newTrainingsThisMonth, setNewTrainingsThisMonth] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrainees() {
      try {
        const [traineeData, trainingHistoryResponse] = await Promise.all([
          fetchTrainees(controller.signal),
          fetch(
            `/api/training-history?month=${encodeURIComponent(
              currentMonthKey(),
            )}`,
            {
              cache: 'no-store',
              signal: controller.signal,
            },
          ),
        ]);

        setTrainees(traineeData);

        if (trainingHistoryResponse.ok) {
          const currentHistory =
            (await trainingHistoryResponse.json()) as NewTrainingHistoryResponse;
          setNewTrainingsThisMonth(currentHistory.total);
        }

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


  useEffect(() => {
    if (!trainingHistoryOpen) {
      return;
    }

    const controller = new AbortController();

    async function loadTrainingHistory() {
      setTrainingHistoryLoading(true);
      setTrainingHistoryError('');

      try {
        const response = await fetch(
          `/api/training-history?month=${encodeURIComponent(
            trainingHistoryMonth,
          )}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load training history.');
        }

        const data = (await response.json()) as NewTrainingHistoryResponse;
        setTrainingHistory(data);
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setTrainingHistory(null);
          setTrainingHistoryError('Failed to load training history.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setTrainingHistoryLoading(false);
        }
      }
    }

    void loadTrainingHistory();

    return () => controller.abort();
  }, [trainingHistoryMonth, trainingHistoryOpen]);

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50"
          aria-expanded={trainingHistoryOpen}
          onClick={() => {
            if (!trainingHistoryOpen) {
              setTrainingHistoryMonth(currentMonthKey());
            }
            setTrainingHistoryOpen((current) => !current);
          }}
        >
          <p className="text-sm text-slate-500">New Trainings This Month</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {newTrainingsThisMonth}
          </p>
          <p className="mt-2 text-xs font-medium text-sky-700">
            {trainingHistoryOpen ? 'Hide history' : 'View training history'}
          </p>
        </button>
      </div>

      {trainingHistoryOpen ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                New Training History
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Review training processes that started in any recorded month.
              </p>
            </div>
            <label className="text-sm font-medium text-slate-700">
              Month
              <input
                type="month"
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={trainingHistoryMonth}
                max={currentMonthKey()}
                onChange={(event) =>
                  setTrainingHistoryMonth(
                    event.target.value || currentMonthKey(),
                  )
                }
              />
            </label>
          </div>

          {trainingHistoryLoading ? (
            <p className="mt-4 text-sm text-slate-500">
              Loading training history...
            </p>
          ) : null}
          {trainingHistoryError ? (
            <p className="mt-4 text-sm text-rose-700">
              {trainingHistoryError}
            </p>
          ) : null}
          {!trainingHistoryLoading &&
          !trainingHistoryError &&
          trainingHistory ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {formatMonthLabel(trainingHistory.month)}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      New Trainings
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {trainingHistory.total}
                    </p>
                  </div>
                  {Object.entries(trainingHistory.departmentCounts)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([departmentName, count]) => (
                      <div
                        key={departmentName}
                        className="rounded-xl border border-slate-100 bg-white px-3 py-2"
                      >
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {departmentName}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {count}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {trainingHistory.trainings.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="hidden grid-cols-[120px_minmax(150px,1.1fr)_minmax(180px,1.4fr)_120px_minmax(120px,1fr)_minmax(120px,1fr)] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                    <span>Start Date</span>
                    <span>Colleague</span>
                    <span>Process</span>
                    <span>Department</span>
                    <span>Training Buddy</span>
                    <span>Assessor</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {trainingHistory.trainings.map((item) => (
                      <div
                        key={item.traineeProcessId}
                        className="grid gap-2 px-3 py-3 text-sm lg:grid-cols-[120px_minmax(150px,1.1fr)_minmax(180px,1.4fr)_120px_minmax(120px,1fr)_minmax(120px,1fr)] lg:items-center lg:gap-3"
                      >
                        <span className="text-slate-600">
                          {formatHistoryDate(item.trainingStartDate)}
                        </span>
                        <Link
                          className="font-medium text-sky-700 hover:text-sky-900"
                          href={`/trainees/${item.traineeId}`}
                        >
                          {item.traineeName}
                        </Link>
                        <span className="font-medium text-slate-900">
                          {item.processName}
                        </span>
                        <span className="text-slate-600">
                          {item.departmentName}
                        </span>
                        <span className="text-slate-600">
                          {item.trainingBuddy || '-'}
                        </span>
                        <span className="text-slate-600">
                          {item.trainingAssessor || 'Not Assigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  No new training processes were recorded for this month.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

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
