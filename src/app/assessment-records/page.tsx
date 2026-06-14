'use client';

import { useEffect, useMemo, useState } from 'react';

type AssessmentRecord = {
  id: number;
  traineeProcessId: number;
  traineeId: number;
  assessmentType: string;
  date: string;
  departmentName: string;
  traineeName: string;
  processName: string;
  assessor: string;
  outcome: string;
  strengths: string | null;
  developmentAreas: string | null;
  developmentActions: string | null;
  finalOutcome: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

export default function AssessmentRecordsPage() {
  const [assessmentRecords, setAssessmentRecords] = useState<
    AssessmentRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [type, setType] = useState('All');
  const [outcome, setOutcome] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function loadAssessmentRecords() {
      try {
        const response = await fetch('/api/assessment-records', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load assessment records.');
        }

        const data = (await response.json()) as AssessmentRecord[];
        if (!cancelled) {
          setAssessmentRecords(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load assessment records.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssessmentRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      assessmentRecords.filter(
        (item) =>
          (search === '' ||
            `${item.traineeName} ${item.processName} ${item.assessor}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (department === 'All' ||
            item.departmentName === department) &&
          (type === 'All' || item.assessmentType === type) &&
          (outcome === 'All' || item.outcome === outcome),
      ),
    [assessmentRecords, search, department, type, outcome],
  );

  const summary = {
    total: filtered.length,
    preAssessments: filtered.filter(
      (item) => item.assessmentType === 'Pre-Assessment',
    ).length,
    assessments: filtered.filter(
      (item) => item.assessmentType === 'Assessment',
    ).length,
    followUpRequired: filtered.filter((item) => item.followUpRequired).length,
  };

  const departments = Array.from(
    new Set(assessmentRecords.map((item) => item.departmentName)),
  );
  const assessmentTypes = Array.from(
    new Set(assessmentRecords.map((item) => item.assessmentType)),
  );
  const outcomes = Array.from(
    new Set(assessmentRecords.map((item) => item.outcome)),
  );

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Assessment Records</h2>
        <p className="mt-2 text-slate-600">
          Searchable history of completed assessments and pre-assessments
          generated from the workflow.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Records', summary.total],
          ['Pre-Assessments', summary.preAssessments],
          ['Assessments', summary.assessments],
          ['Follow-Up Required', summary.followUpRequired],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input
          className="rounded-xl border border-slate-200 p-3"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search trainee, process or assessor"
        />
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option>All</option>
          {departments.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option>All</option>
          {assessmentTypes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 p-3"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        >
          <option>All</option>
          {outcomes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">
          Loading assessment records...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 text-left">Date</th>
                <th className="pb-3 text-left">Trainee</th>
                <th className="pb-3 text-left">Process</th>
                <th className="pb-3 text-left">Type</th>
                <th className="pb-3 text-left">Outcome</th>
                <th className="pb-3 text-left">Assessor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-3">{formatDate(item.date)}</td>
                  <td className="py-3">{item.traineeName}</td>
                  <td className="py-3">{item.processName}</td>
                  <td className="py-3">{item.assessmentType}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      {item.outcome}
                    </span>
                  </td>
                  <td className="py-3">{item.assessor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
