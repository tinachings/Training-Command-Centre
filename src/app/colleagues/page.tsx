'use client';

import { useEffect, useMemo, useState } from 'react';

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
};

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
              <th className="pb-3 text-left">Competent Processes</th>
              <th className="pb-3 text-left">Refreshers Due</th>
              <th className="pb-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredColleagues.map((colleague) => (
              <tr
                key={colleague.id}
                className="border-t border-slate-100 align-top"
              >
                <td className="py-3 font-medium text-slate-900">
                  {colleague.name}
                </td>
                <td className="py-3">{colleague.department.name}</td>
                <td className="py-3">{colleague.shift || '-'}</td>
                <td className="py-3">{colleague.competentProcessCount}</td>
                <td className="py-3">{colleague.refreshersDueCount}</td>
                <td className="py-3">{colleague.status}</td>
              </tr>
            ))}
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
