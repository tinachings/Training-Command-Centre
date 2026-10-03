'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  documentTypes,
  nextStage,
  priorities,
  requestTypes,
  revisionStage,
  workflowFor,
} from '@/lib/document-workflow';

type StageEvent = {
  id: number;
  eventType: string;
  fromStage: string | null;
  toStage: string | null;
  note: string | null;
  date: string;
};

type DocumentRecord = {
  id: number;
  title: string;
  documentType: string;
  documentNumber: string | null;
  process: string;
  requestType: string;
  requester: string;
  dateRequested: string;
  requestDetails: string;
  stage: string;
  priority: string;
  targetCompletionDate: string | null;
  currentRevision: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  liveDate: string | null;
  changeDetails: string | null;
  createdAt: string;
  updatedAt: string;
  events: StageEvent[];
};

const allStages = [
  'Request Received',
  'Planning / Scoping',
  'Drafting',
  'Internal Review',
  'H&S Review',
  'Requester Review',
  'Testing / Trial Period',
  'Submitted for Approval',
  'Ready for Launch',
  'Live',
  revisionStage,
];

const today = () => new Date().toISOString().slice(0, 10);
const dateInput = (value: string | null) => value ? value.slice(0, 10) : '';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function badge(stage: string) {
  if (stage === 'Live') return 'bg-emerald-100 text-emerald-800';
  if (stage === revisionStage) return 'bg-rose-100 text-rose-800';
  if (stage === 'Submitted for Approval') return 'bg-violet-100 text-violet-800';
  if (stage === 'Testing / Trial Period') return 'bg-amber-100 text-amber-800';
  return 'bg-sky-100 text-sky-800';
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [requestFilter, setRequestFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  const [form, setForm] = useState({
    title: '',
    documentType: 'SOP',
    documentNumber: '',
    process: '',
    requestType: 'Update Existing Document',
    requester: '',
    dateRequested: today(),
    requestDetails: '',
    priority: 'Normal',
    targetCompletionDate: '',
    currentRevision: '',
    changeDetails: '',
  });

  const [edit, setEdit] = useState({
    documentNumber: '',
    currentRevision: '',
    targetCompletionDate: '',
    trialStartDate: '',
    trialEndDate: '',
    changeDetails: '',
    note: '',
  });

  async function loadDocuments() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/documents', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load documents.');
      const data = (await response.json()) as DocumentRecord[];
      setDocuments(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current)
          ? current
          : data[0]?.id ?? null,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return documents.filter((item) =>
      (!needle ||
        item.title.toLowerCase().includes(needle) ||
        item.process.toLowerCase().includes(needle) ||
        item.requester.toLowerCase().includes(needle) ||
        (item.documentNumber ?? '').toLowerCase().includes(needle)) &&
      (typeFilter === 'All' || item.documentType === typeFilter) &&
      (requestFilter === 'All' || item.requestType === requestFilter) &&
      (stageFilter === 'All' || item.stage === stageFilter),
    );
  }, [documents, search, typeFilter, requestFilter, stageFilter]);

  const selected = documents.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setEdit({
      documentNumber: selected.documentNumber ?? '',
      currentRevision: selected.currentRevision ?? '',
      targetCompletionDate: dateInput(selected.targetCompletionDate),
      trialStartDate: dateInput(selected.trialStartDate),
      trialEndDate: dateInput(selected.trialEndDate),
      changeDetails: selected.changeDetails ?? '',
      note: '',
    });
  }, [selectedId, selected?.updatedAt]);

  const summary = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return {
      open: documents.filter((item) => item.stage !== 'Live').length,
      drafting: documents.filter((item) => item.stage === 'Drafting').length,
      review: documents.filter((item) =>
        ['Internal Review', 'H&S Review', 'Requester Review'].includes(item.stage),
      ).length,
      approval: documents.filter((item) => item.stage === 'Submitted for Approval').length,
      trial: documents.filter((item) => item.stage === 'Testing / Trial Period').length,
      liveThisMonth: documents.filter((item) => {
        if (!item.liveDate) return false;
        const date = new Date(item.liveDate);
        return date.getMonth() === month && date.getFullYear() === year;
      }).length,
      overdue: documents.filter((item) =>
        item.stage !== 'Live' &&
        item.targetCompletionDate &&
        new Date(item.targetCompletionDate) < now,
      ).length,
    };
  }, [documents]);

  async function addRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => null)) as DocumentRecord | { error?: string } | null;
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error || 'Failed to add document request.');
      setShowAdd(false);
      setForm({
        title: '',
        documentType: 'SOP',
        documentNumber: '',
        process: '',
        requestType: 'Update Existing Document',
        requester: '',
        dateRequested: today(),
        requestDetails: '',
        priority: 'Normal',
        targetCompletionDate: '',
        currentRevision: '',
        changeDetails: '',
      });
      await loadDocuments();
      if (data && 'id' in data) setSelectedId(data.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to add document request.');
    } finally {
      setSaving(false);
    }
  }

  async function updateDocument(
    document: DocumentRecord,
    stage: string = document.stage,
  ) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, ...edit }),
      });
      const data = (await response.json().catch(() => null)) as DocumentRecord | { error?: string } | null;
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error || 'Failed to update document.');
      setEdit((current) => ({ ...current, note: '' }));
      await loadDocuments();
      setSelectedId(document.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update document.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Document control</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Documents Tracker</h2>
            <p className="mt-2 max-w-3xl text-slate-600">
              Track requested SOP, WI, Care Point and Visual Aid work from request through review, trial where required, document-library approval and launch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((value) => !value)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
          >
            {showAdd ? 'Close Form' : 'Add Document Request'}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          ['Open Requests', summary.open],
          ['In Draft', summary.drafting],
          ['Awaiting Review', summary.review],
          ['Awaiting Approval', summary.approval],
          ['In Trial', summary.trial],
          ['Live This Month', summary.liveThisMonth],
          ['Overdue', summary.overdue],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      {showAdd ? (
        <form onSubmit={addRequest} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">New Document Request</h3>
          <p className="mt-1 text-sm text-slate-500">
            New documents can be created without a document number. Existing-document updates can carry the current number and revision.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Document title"><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Document type"><select className="input" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>{documentTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Request type"><select className="input" value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })}>{requestTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Document number (optional)"><input className="input" value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></Field>
            <Field label="Process"><input required className="input" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} /></Field>
            <Field label="Requester"><input required className="input" value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} /></Field>
            <Field label="Date requested"><input required type="date" className="input" value={form.dateRequested} onChange={(e) => setForm({ ...form, dateRequested: e.target.value })} /></Field>
            <Field label="Priority"><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Target completion date"><input type="date" className="input" value={form.targetCompletionDate} onChange={(e) => setForm({ ...form, targetCompletionDate: e.target.value })} /></Field>
            {form.requestType === 'Update Existing Document' ? (
              <Field label="Current revision"><input className="input" value={form.currentRevision} onChange={(e) => setForm({ ...form, currentRevision: e.target.value })} /></Field>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Reason / details of request"><textarea required className="input min-h-28" value={form.requestDetails} onChange={(e) => setForm({ ...form, requestDetails: e.target.value })} /></Field>
            <Field label="Details of change"><textarea className="input min-h-28" value={form.changeDetails} onChange={(e) => setForm({ ...form, changeDetails: e.target.value })} placeholder={form.requestType === 'New Document' ? 'Optional for a new document' : 'Summarise the requested change'} /></Field>
          </div>
          <button disabled={saving} className="mt-5 rounded-xl bg-sky-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Request'}
          </button>
        </form>
      ) : null}

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input" placeholder="Search title, process, requester or number" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All</option>{documentTypes.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="input" value={requestFilter} onChange={(e) => setRequestFilter(e.target.value)}><option>All</option>{requestTypes.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="input" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}><option>All</option>{allStages.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">Document Pipeline</h3>
          <p className="mt-1 text-sm text-slate-500">New documents include a testing/trial stage. Existing-document updates skip that stage.</p>
        </div>
        {loading ? <p className="text-sm text-slate-500">Loading document pipeline...</p> : null}
        {!loading ? (
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-max gap-4">
              {allStages.map((stage) => {
                const items = filtered.filter((item) => item.stage === stage);
                return (
                  <div key={stage} className="w-72 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-800">{stage}</h4>
                      <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{items.length}</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-sky-300 ${selectedId === item.id ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{item.documentType}</span>
                            <span className="text-[11px] font-medium text-slate-500">{item.priority}</span>
                          </div>
                          <p className="mt-3 font-semibold text-slate-900">{item.documentNumber ? `${item.documentNumber} · ` : ''}{item.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.process}</p>
                          <p className="mt-3 text-xs text-slate-500">Requested by {item.requester} · {formatDate(item.dateRequested)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {selected ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{selected.documentType} · {selected.requestType}</p>
                <h3 className="mt-1 text-2xl font-semibold">{selected.title}</h3>
                <p className="mt-1 text-slate-600">{selected.process}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge(selected.stage)}`}>{selected.stage}</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Detail label="Requester" value={selected.requester} />
              <Detail label="Date requested" value={formatDate(selected.dateRequested)} />
              <Detail label="Priority" value={selected.priority} />
              <Detail label="Target completion" value={formatDate(selected.targetCompletionDate)} />
              <Detail label="Document number" value={selected.documentNumber || 'Not allocated'} />
              <Detail label="Current revision" value={selected.currentRevision || '—'} />
              <div className="md:col-span-2"><Detail label="Request details" value={selected.requestDetails} /></div>
              <div className="md:col-span-2"><Detail label="Details of change" value={selected.changeDetails || '—'} /></div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Document number"><input className="input" value={edit.documentNumber} onChange={(e) => setEdit({ ...edit, documentNumber: e.target.value })} /></Field>
              <Field label="Current revision"><input className="input" value={edit.currentRevision} onChange={(e) => setEdit({ ...edit, currentRevision: e.target.value })} /></Field>
              <Field label="Target completion date"><input type="date" className="input" value={edit.targetCompletionDate} onChange={(e) => setEdit({ ...edit, targetCompletionDate: e.target.value })} /></Field>
              {selected.requestType === 'New Document' ? (
                <>
                  <Field label="Trial start date"><input type="date" className="input" value={edit.trialStartDate} onChange={(e) => setEdit({ ...edit, trialStartDate: e.target.value })} /></Field>
                  <Field label="Trial end date"><input type="date" className="input" value={edit.trialEndDate} onChange={(e) => setEdit({ ...edit, trialEndDate: e.target.value })} /></Field>
                </>
              ) : null}
              <div className="md:col-span-2"><Field label="Details of change"><textarea className="input min-h-24" value={edit.changeDetails} onChange={(e) => setEdit({ ...edit, changeDetails: e.target.value })} /></Field></div>
              <div className="md:col-span-2"><Field label="Timeline note"><textarea className="input min-h-20" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Optional note for this update" /></Field></div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button disabled={saving} onClick={() => void updateDocument(selected)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Save Details</button>
              {nextStage(selected.requestType, selected.stage) ? (
                <button disabled={saving} onClick={() => void updateDocument(selected, nextStage(selected.requestType, selected.stage)!)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  Move to {nextStage(selected.requestType, selected.stage)}
                </button>
              ) : null}
              {selected.stage !== 'Live' && selected.stage !== revisionStage ? (
                <button disabled={saving} onClick={() => void updateDocument(selected, revisionStage)} className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50">Revision Required</button>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Workflow for this request</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {workflowFor(selected.requestType).map((stage) => (
                  <span key={stage} className={`rounded-full px-3 py-1 text-xs ${stage === selected.stage ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{stage}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Document Timeline</h3>
            <div className="mt-5 space-y-4">
              {selected.events.map((event) => (
                <div key={event.id} className="border-l-2 border-slate-200 pl-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">{event.eventType}</p>
                    <p className="text-xs text-slate-500">{formatDate(event.date)}</p>
                  </div>
                  {event.fromStage && event.toStage && event.fromStage !== event.toStage ? (
                    <p className="mt-1 text-sm text-slate-600">{event.fromStage} → {event.toStage}</p>
                  ) : null}
                  {event.note ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.note}</p> : null}
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.75rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-slate-700"><span>{label}</span><div className="mt-1">{children}</div></label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</p></div>;
}
