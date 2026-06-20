'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

type ColleagueCompetency = {
  traineeProcessId: number;
  processName: string;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  competencySignOffDate: string | null;
  refresherDueDate: string | null;
  refresherStatus: string | null;
};

type ColleagueListItem = {
  id: number;
  name: string;
  shift: string | null;
  archived: boolean;
  department: {
    name: string;
  };
  competentProcessCount: number;
  refreshersDueCount: number;
  status: string;
  competencies: ColleagueCompetency[];
};

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
}

function competencyStatus(competency: ColleagueCompetency) {
  if (
    competency.status === 'Competent' ||
    competency.stage === 'Competent' ||
    competency.assessmentOutcome === 'Competent'
  ) {
    return 'Competent';
  }

  return competency.assessmentOutcome || competency.stage || competency.status;
}

async function fetchColleagues(signal?: AbortSignal) {
  const response = await fetch('/api/colleagues', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load colleagues.');
  }

  return (await response.json()) as ColleagueListItem[];
}

export default function ColleaguesPage() {
  const [colleagues, setColleagues] = useState<ColleagueListItem[]>([]);
  const [status, setStatus] = useState('Active');
  const [expandedColleagueIds, setExpandedColleagueIds] = useState<number[]>(
    [],
  );
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadColleagues() {
      try {
        setColleagues(await fetchColleagues(controller.signal));
        setError('');
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load colleagues.');
        }
      }
    }

    void loadColleagues();

    return () => controller.abort();
  }, []);

  const filteredColleagues = useMemo(
    () =>
      colleagues.filter((colleague) => {
        if (status === 'Active') {
          return !colleague.archived;
        }

        if (status === 'Archived') {
          return colleague.archived;
        }

        return true;
      }),
    [colleagues, status],
  );

  function toggleColleague(colleagueId: number) {
    setExpandedColleagueIds((current) =>
      current.includes(colleagueId)
        ? current.filter((id) => id !== colleagueId)
        : [...current, colleagueId],
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Colleagues
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Competency and refresher overview.
          </h2>
          <p className="mt-2 text-slate-600">
            Read-only view of current colleague competency coverage and
            upcoming refresher needs.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-200 p-3"
        >
          <option>Active</option>
          <option>Archived</option>
          <option>All</option>
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
              <th className="pb-3 text-center">Competent Processes</th>
              <th className="pb-3 text-center">Refreshers Due</th>
              <th className="pb-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredColleagues.map((colleague) => {
              const isExpanded = expandedColleagueIds.includes(colleague.id);

              return (
                <Fragment key={colleague.id}>
                  <tr className="border-t border-slate-100 align-top">
                    <td className="py-3 font-medium text-slate-900">
                      <div className="flex flex-col items-start gap-2">
                        <span>{colleague.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleColleague(colleague.id)}
                          aria-expanded={isExpanded}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"
                        >
                          {isExpanded ? 'Hide competencies' : 'View competencies'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3">{colleague.department.name}</td>
                    <td className="py-3">{colleague.shift || '-'}</td>
                    <td className="py-3 text-center">
                      {colleague.competentProcessCount}
                    </td>
                    <td className="py-3 text-center">
                      {colleague.refreshersDueCount}
                    </td>
                    <td className="py-3 text-center">{colleague.status}</td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-t border-slate-100 bg-slate-50/70">
                      <td className="py-4" colSpan={6}>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                          <table className="min-w-full text-sm">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="px-4 py-3 text-left">Process</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">
                                  Competency Sign-off Date
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Next Refresher Due
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Refresher Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {colleague.competencies.map((competency) => (
                                <tr
                                  key={competency.traineeProcessId}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-4 py-3 font-medium text-slate-900">
                                    {competency.processName}
                                  </td>
                                  <td className="px-4 py-3">
                                    {competencyStatus(competency)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {formatDate(
                                      competency.competencySignOffDate,
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {formatDate(competency.refresherDueDate)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {competency.refresherStatus ?? '-'}
                                  </td>
                                </tr>
                              ))}
                              {colleague.competencies.length === 0 ? (
                                <tr>
                                  <td
                                    className="px-4 py-6 text-sm text-slate-500"
                                    colSpan={5}
                                  >
                                    No active competencies assigned.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {filteredColleagues.length === 0 ? (
              <tr>
                <td className="py-6 text-sm text-slate-500" colSpan={6}>
                  No colleagues found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
