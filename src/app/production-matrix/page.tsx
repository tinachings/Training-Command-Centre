'use client';

import { useEffect, useMemo, useState } from 'react';

type DisplayStatus = 'T' | 'I' | 'N';

type MatrixTotals = {
  trained: number;
  inTraining: number;
  notRequired: number;
  required: number;
  completionPercent: number;
  coveragePercent: number;
};

type MatrixProcess = {
  id: number;
  name: string;
  departmentId: number;
  active: boolean;
};

type MatrixCell = {
  processId: number;
  displayStatus: DisplayStatus;
  traineeProcessId: number | null;
  stage: string | null;
  assignmentStatus: string | null;
  assessmentOutcome: string | null;
  competencySignOffDate: string | null;
  refresherDueDate: string | null;
  assignedAssessor: string | null;
};

type MatrixColleague = {
  id: number;
  name: string;
  shift: string | null;
  archived: boolean;
  departmentId: number;
  cells: MatrixCell[];
  totals: MatrixTotals;
};

type MatrixDepartment = {
  id: number;
  name: string;
  active: boolean;
  processes: MatrixProcess[];
  colleagues: MatrixColleague[];
  columnTotals: Array<{
    processId: number;
    totals: MatrixTotals;
  }>;
  totals: MatrixTotals;
};

type ProductionMatrixResponse = {
  departments: MatrixDepartment[];
  processes: MatrixProcess[];
  colleagues: Array<{
    id: number;
    name: string;
    shift: string | null;
    archived: boolean;
    departmentId: number;
  }>;
  totals: MatrixTotals;
};

const statusOptions = [
  { label: 'All', value: 'All' },
  { label: 'Trained', value: 'T' },
  { label: 'In Training', value: 'I' },
  { label: 'Not Required', value: 'N' },
] as const;

function emptyTotals(): MatrixTotals {
  return {
    trained: 0,
    inTraining: 0,
    notRequired: 0,
    required: 0,
    completionPercent: 0,
    coveragePercent: 0,
  };
}

function totalsForStatuses(statuses: DisplayStatus[]) {
  const totals = statuses.reduce((current, status) => {
    if (status === 'T') {
      current.trained += 1;
    } else if (status === 'I') {
      current.inTraining += 1;
    } else {
      current.notRequired += 1;
    }

    return current;
  }, emptyTotals());

  totals.required = totals.trained + totals.inTraining;
  totals.completionPercent =
    totals.required > 0
      ? Math.round((totals.trained / totals.required) * 100)
      : 0;
  totals.coveragePercent = totals.completionPercent;

  return totals;
}

function statusCellClass(status: DisplayStatus) {
  switch (status) {
    case 'T':
      return 'bg-green-400 text-green-950';
    case 'I':
      return 'bg-yellow-300 text-yellow-950';
    case 'N':
    default:
      return 'bg-blue-700 text-white';
  }
}

function processNameParts(name: string) {
  const match = name.match(/^([A-Za-z]+\d+)\s+-\s+(.+)$/);

  return match ? { code: match[1], name: match[2] } : { code: null, name };
}

async function fetchMatrix(signal?: AbortSignal) {
  const response = await fetch('/api/production-matrix', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load production matrix.');
  }

  return (await response.json()) as ProductionMatrixResponse;
}

export default function ProductionMatrixPage() {
  const [matrix, setMatrix] = useState<ProductionMatrixResponse | null>(null);
  const [departmentId, setDepartmentId] = useState('All');
  const [processId, setProcessId] = useState('All');
  const [status, setStatus] = useState<(typeof statusOptions)[number]['value']>(
    'All',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMatrix() {
      try {
        setMatrix(await fetchMatrix(controller.signal));
        setError('');
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load production matrix.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMatrix();

    return () => controller.abort();
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!matrix) {
      return [];
    }

    return matrix.departments
      .filter(
        (department) =>
          departmentId === 'All' || String(department.id) === departmentId,
      )
      .map((department) => {
        const processes = department.processes.filter(
          (process) => processId === 'All' || String(process.id) === processId,
        );
        const visibleProcessIds = new Set(
          processes.map((process) => process.id),
        );
        const colleagues = department.colleagues
          .map((colleague) => {
            const cells = colleague.cells.filter((cell) =>
              visibleProcessIds.has(cell.processId),
            );

            return {
              ...colleague,
              cells,
              totals: totalsForStatuses(
                cells.map((cell) => cell.displayStatus),
              ),
            };
          })
          .filter(
            (colleague) =>
              status === 'All' ||
              colleague.cells.some((cell) => cell.displayStatus === status),
          );

        const columnTotals = processes.map((process) => ({
          processId: process.id,
          totals: totalsForStatuses(
            colleagues.map(
              (colleague) =>
                colleague.cells.find((cell) => cell.processId === process.id)
                  ?.displayStatus ?? 'N',
            ),
          ),
        }));

        return {
          ...department,
          processes,
          colleagues,
          columnTotals,
          totals: totalsForStatuses(
            colleagues.flatMap((colleague) =>
              colleague.cells.map((cell) => cell.displayStatus),
            ),
          ),
        };
      });
  }, [departmentId, matrix, processId, status]);

  const processOptions = useMemo(() => {
    if (!matrix) {
      return [];
    }

    return matrix.processes.filter(
      (process) =>
        departmentId === 'All' || String(process.departmentId) === departmentId,
    );
  }, [departmentId, matrix]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
          Production Matrix
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Live department competency matrix.
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Department</span>
            <select
              className="w-full rounded-xl border border-slate-200 p-3"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setProcessId('All');
              }}
            >
              <option value="All">All Departments</option>
              {matrix?.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Process</span>
            <select
              className="w-full rounded-xl border border-slate-200 p-3"
              value={processId}
              onChange={(event) => setProcessId(event.target.value)}
            >
              <option value="All">All Processes</option>
              {processOptions.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="w-full rounded-xl border border-slate-200 p-3"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as (typeof statusOptions)[number]['value'],
                )
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Loading production matrix...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && filteredDepartments.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No production matrix data available.
        </section>
      ) : null}

      {!loading && !error
        ? filteredDepartments.map((department) => (
            <section
              key={department.id}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h3 className="text-2xl font-bold uppercase tracking-wide text-slate-950">
                    {department.name.toUpperCase()}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {department.colleagues.length} Colleagues •{' '}
                    {department.processes.length} Processes
                  </p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Colleagues
                    </p>
                    <p className="mt-0.5 text-xl font-semibold text-slate-900">
                      {department.colleagues.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Processes
                    </p>
                    <p className="mt-0.5 text-xl font-semibold text-slate-900">
                      {department.processes.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Trained
                    </p>
                    <p className="mt-0.5 text-xl font-semibold text-slate-900">
                      {department.totals.trained}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      In Training
                    </p>
                    <p className="mt-0.5 text-xl font-semibold text-slate-900">
                      {department.totals.inTraining}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Coverage
                    </p>
                    <p className="mt-0.5 text-xl font-semibold text-slate-900">
                      {department.totals.coveragePercent}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[72vh] overflow-auto scroll-smooth">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-slate-800">
                      <th className="sticky left-0 top-0 z-30 min-w-56 border-b-2 border-r-2 border-slate-400 bg-slate-200 px-4 py-2 text-left font-semibold shadow-[8px_0_12px_-12px_rgba(15,23,42,0.7)]">
                        Colleague
                      </th>
                      {department.processes.map((process) => {
                        const parts = processNameParts(process.name);

                        return (
                          <th
                            key={process.id}
                            className="sticky top-0 z-20 min-w-36 max-w-44 border-b-2 border-r border-slate-400 bg-slate-200 px-3 py-2 text-center align-bottom leading-tight"
                          >
                            {parts.code ? (
                              <span className="block text-sm font-bold text-slate-950">
                                {parts.code}
                              </span>
                            ) : null}
                            <span className="block whitespace-normal break-words text-xs font-semibold text-slate-700">
                              {parts.name}
                            </span>
                          </th>
                        );
                      })}
                      <th className="sticky top-0 z-20 min-w-24 border-b-2 border-r border-slate-400 bg-slate-200 px-3 py-2 text-center text-xs font-semibold leading-tight">
                        Trained
                      </th>
                      <th className="sticky top-0 z-20 min-w-28 border-b-2 border-r border-slate-400 bg-slate-200 px-3 py-2 text-center text-xs font-semibold leading-tight">
                        In Training
                      </th>
                      <th className="sticky top-0 z-20 min-w-24 border-b-2 border-r border-slate-400 bg-slate-200 px-3 py-2 text-center text-xs font-semibold leading-tight">
                        Required
                      </th>
                      <th className="sticky top-0 z-20 min-w-28 border-b-2 border-slate-400 bg-slate-200 px-3 py-2 text-center text-xs font-semibold leading-tight">
                        Completion %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {department.colleagues.map((colleague) => (
                      <tr key={colleague.id}>
                        <th className="sticky left-0 z-10 border-b border-r-2 border-slate-300 bg-white px-4 py-3 text-left font-medium text-slate-900 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.7)]">
                          <span>{colleague.name}</span>
                          {colleague.shift ? (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              {colleague.shift}
                            </span>
                          ) : null}
                        </th>
                        {department.processes.map((process) => {
                          const cell = colleague.cells.find(
                            (item) => item.processId === process.id,
                          );
                          const displayStatus = cell?.displayStatus ?? 'N';

                          return (
                            <td
                              key={process.id}
                              className={`border-b border-r border-slate-300 px-3 py-3 text-center text-base font-bold ${statusCellClass(
                                displayStatus,
                              )}`}
                            >
                              {displayStatus}
                            </td>
                          );
                        })}
                        <td className="border-b border-r border-slate-300 bg-slate-50 px-3 py-3 text-center font-semibold">
                          {colleague.totals.trained}
                        </td>
                        <td className="border-b border-r border-slate-300 bg-slate-50 px-3 py-3 text-center font-semibold">
                          {colleague.totals.inTraining}
                        </td>
                        <td className="border-b border-r border-slate-300 bg-slate-50 px-3 py-3 text-center font-semibold">
                          {colleague.totals.required}
                        </td>
                        <td className="border-b border-slate-300 bg-slate-50 px-3 py-3 text-center font-semibold">
                          {colleague.totals.completionPercent}%
                        </td>
                      </tr>
                    ))}
                    {department.colleagues.length === 0 ? (
                      <tr>
                        <td
                          className="border-b border-slate-300 px-4 py-6 text-sm text-slate-500"
                          colSpan={department.processes.length + 5}
                        >
                          No colleagues match the selected filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  {department.processes.length > 0 ? (
                    <tfoot className="font-semibold">
                      {[
                        ['Trained', 'trained'],
                        ['In Training', 'inTraining'],
                        ['Not Required', 'notRequired'],
                        ['Coverage %', 'coveragePercent'],
                      ].map(([label, key]) => (
                        <tr key={label}>
                          <th className="sticky left-0 z-20 border-b border-r-2 border-slate-500 bg-slate-800 px-4 py-3 text-left text-white shadow-[8px_0_12px_-12px_rgba(15,23,42,0.7)]">
                            {label}
                          </th>
                          {department.processes.map((process) => {
                            const totals = department.columnTotals.find(
                              (column) => column.processId === process.id,
                            )?.totals;
                            const value = totals
                              ? totals[key as keyof MatrixTotals]
                              : 0;

                            return (
                              <td
                                key={process.id}
                                className="border-b border-r border-slate-500 bg-slate-700 px-3 py-3 text-center text-white"
                              >
                                {key === 'coveragePercent'
                                  ? `${value}%`
                                  : value}
                              </td>
                            );
                          })}
                          <td
                            className="border-b border-slate-500 bg-slate-700 px-3 py-3"
                            colSpan={4}
                          />
                        </tr>
                      ))}
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </section>
          ))
        : null}
    </div>
  );
}
