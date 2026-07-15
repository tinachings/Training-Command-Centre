'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type TrainingHoursEntry = {
  date: string;
  dayName: string;
  hours: string | null;
  isFuture: boolean;
};

type WeeklyHistoryItem = {
  weekBeginning: string;
  weekEnding: string;
  totalHours: string | null;
  isSelected: boolean;
};

type TrainingHoursSummary = {
  colleague: {
    id: number;
    name: string;
  };
  traineeProcessId: number;
  process: {
    id: number;
    name: string;
  };
  department: string;
  trainingStartDate: string | null;
  stage: string;
  status: string;
  recommendedTrainingHours: string | null;
  selectedWeekBeginning: string;
  selectedWeekEnding: string;
  currentWeekBeginning: string;
  entries: TrainingHoursEntry[];
  selectedWeekTotalHours: string | null;
  cumulativeLoggedHours: string | null;
  remainingHours: string | null;
  readinessPercentage: number | null;
  legacyReadinessScore: number | null;
  lastTrainingDate: string | null;
  elapsedEligibleWeeks: number;
  activeWeeks: number;
  activeWeekRatio: number;
  averageHoursPerActiveWeek: string | null;
  daysSinceLastTraining: number | null;
  recentGapDays: number | null;
  consistencyLabel: string;
  recentWeeklyHistory: WeeklyHistoryItem[];
  canNavigateNext: boolean;
};

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function dateKeyFromDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);

  return dateKeyFromDate(date);
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDate(value));
}

function displayHours(value: string | null) {
  return value ?? '0.00';
}

function parseInputHours(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const numericValue = Number(trimmed);

  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 12) {
    return null;
  }

  return numericValue;
}

function formatLiveTotal(values: Record<string, string>) {
  const total = Object.values(values).reduce((sum, value) => {
    const parsed = parseInputHours(value);

    return parsed === null ? sum : sum + parsed;
  }, 0);

  return total.toFixed(2);
}

export default function TrainingHoursPage() {
  const params = useParams<{ id: string; processId: string }>();
  const traineeId = Number(params.id);
  const traineeProcessId = Number(params.processId);
  const hasValidIds =
    Number.isInteger(traineeId) &&
    traineeId > 0 &&
    Number.isInteger(traineeProcessId) &&
    traineeProcessId > 0;
  const [summary, setSummary] = useState<TrainingHoursSummary | null>(null);
  const [weekBeginning, setWeekBeginning] = useState<string | null>(null);
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(hasValidIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(hasValidIds ? '' : 'Process not found.');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!hasValidIds) {
      return;
    }

    const controller = new AbortController();

    async function loadTrainingHours() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();

        if (weekBeginning) {
          params.set('weekBeginning', weekBeginning);
        }

        const response = await fetch(
          `/api/trainees/${traineeId}/processes/${traineeProcessId}/training-hours${
            params.size ? `?${params}` : ''
          }`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error || 'Failed to load training hours.');
        }

        const data = (await response.json()) as TrainingHoursSummary;

        setSummary(data);
        setWeekBeginning(data.selectedWeekBeginning);
        setEntryValues(
          Object.fromEntries(
            data.entries.map((entry) => [entry.date, entry.hours ?? '']),
          ),
        );
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Failed to load training hours.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTrainingHours();

    return () => controller.abort();
  }, [hasValidIds, traineeId, traineeProcessId, weekBeginning]);

  const validationError = useMemo(() => {
    for (const [date, value] of Object.entries(entryValues)) {
      const entry = summary?.entries.find((item) => item.date === date);
      const parsed = parseInputHours(value);

      if (parsed === null) {
        return 'Hours must be blank, zero, or a value up to 12 with no more than two decimal places.';
      }

      if (entry?.isFuture && parsed > 0) {
        return 'Future dates cannot have logged hours.';
      }
    }

    return '';
  }, [entryValues, summary?.entries]);

  async function saveWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!summary || validationError) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/trainees/${traineeId}/processes/${traineeProcessId}/training-hours`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weekBeginning: summary.selectedWeekBeginning,
            entries: summary.entries.map((entry) => ({
              date: entry.date,
              hours: entryValues[entry.date] ?? '',
            })),
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || 'Failed to save training hours.');
      }

      const data = (await response.json()) as TrainingHoursSummary;

      setSummary(data);
      setWeekBeginning(data.selectedWeekBeginning);
      setEntryValues(
        Object.fromEntries(
          data.entries.map((entry) => [entry.date, entry.hours ?? '']),
        ),
      );
      setSuccess('Training hours saved.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to save training hours.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Loading training hours...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {error || 'Process not found.'}
      </div>
    );
  }

  const liveWeeklyTotal = formatLiveTotal(entryValues);
  const previousWeek = addDays(summary.selectedWeekBeginning, -7);
  const nextWeek = addDays(summary.selectedWeekBeginning, 7);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Training Hours
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {summary.process.name}
          </h2>
          <p className="mt-2 text-slate-600">
            {summary.colleague.name} | {summary.department} | {summary.stage}
          </p>
        </div>
        <Link
          href={`/trainees/${summary.colleague.id}`}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
        >
          Back to colleague
        </Link>
      </div>

      {!summary.recommendedTrainingHours ? (
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Recommended hours are not set for this process. Hours can still be
          logged, but readiness will show as Not Set until Process Management is
          updated.
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Recommended Hours', summary.recommendedTrainingHours ?? 'Not Set'],
          ['Logged Hours', displayHours(summary.cumulativeLoggedHours)],
          ['Remaining Hours', summary.remainingHours ?? 'Not Set'],
          [
            'Readiness',
            summary.readinessPercentage === null
              ? 'Not Set'
              : `${summary.readinessPercentage}%`,
          ],
          ['Current Week', displayHours(summary.selectedWeekTotalHours)],
          ['Last Training Date', formatDate(summary.lastTrainingDate)],
          [
            'Active Weeks',
            `${summary.activeWeeks} / ${summary.elapsedEligibleWeeks}`,
          ],
          ['Consistency', summary.consistencyLabel],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </section>

      {summary.legacyReadinessScore !== null ? (
        <p className="text-sm text-slate-500">
          Legacy Readiness: {summary.legacyReadinessScore}% from the previous
          progress workflow. It is not combined with logged hours.
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Weekly Entry</h3>
            <p className="text-sm text-slate-600">
              {formatDate(summary.selectedWeekBeginning)} to{' '}
              {formatDate(summary.selectedWeekEnding)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              type="button"
              onClick={() => setWeekBeginning(previousWeek)}
            >
              Previous Week
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!summary.canNavigateNext}
              onClick={() => setWeekBeginning(nextWeek)}
            >
              Next Week
            </button>
            <button
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
              type="button"
              onClick={() => setWeekBeginning(summary.currentWeekBeginning)}
            >
              Current Week
            </button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={saveWeek}>
          <div className="grid gap-3 md:grid-cols-7">
            {summary.entries.map((entry) => (
              <label
                key={entry.date}
                className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <span className="block font-medium text-slate-800">
                  {entry.dayName}
                </span>
                <span className="block text-xs text-slate-500">
                  {formatDate(entry.date)}
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2"
                  inputMode="decimal"
                  max="12"
                  min="0"
                  step="0.01"
                  type="number"
                  disabled={entry.isFuture}
                  value={entryValues[entry.date] ?? ''}
                  onChange={(event) =>
                    setEntryValues((current) => ({
                      ...current,
                      [entry.date]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-800">
              Weekly Total: {liveWeeklyTotal} hours
            </p>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || Boolean(validationError)}
              type="submit"
            >
              {saving ? 'Saving...' : 'Save Week'}
            </button>
          </div>

          {validationError ? (
            <p className="text-sm text-red-600">{validationError}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-700">{success}</p>
          ) : null}
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold">Consistency Detail</h3>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Active-week ratio</dt>
              <dd className="font-medium text-slate-900">
                {Math.round(summary.activeWeekRatio * 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Average active week</dt>
              <dd className="font-medium text-slate-900">
                {summary.averageHoursPerActiveWeek ?? '0.00'} hours
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Days since last training</dt>
              <dd className="font-medium text-slate-900">
                {summary.daysSinceLastTraining ?? 'No entries'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Recent gap</dt>
              <dd className="font-medium text-slate-900">
                {summary.recentGapDays ?? 'No entries'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold">Recent Weekly History</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 text-left">Week Beginning</th>
                  <th className="pb-2 text-left">Week Ending</th>
                  <th className="pb-2 text-left">Hours</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentWeeklyHistory.map((item) => (
                  <tr
                    key={item.weekBeginning}
                    className={`border-t border-slate-200 ${
                      item.isSelected ? 'font-semibold text-slate-900' : ''
                    }`}
                  >
                    <td className="py-2">{formatDate(item.weekBeginning)}</td>
                    <td className="py-2">{formatDate(item.weekEnding)}</td>
                    <td className="py-2">{displayHours(item.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
