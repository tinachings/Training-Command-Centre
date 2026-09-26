'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Department = {
  id: number;
  name: string;
  active: boolean;
};

type Process = {
  id: number;
  name: string;
  departmentId: number;
  departmentName: string;
  active: boolean;
  recommendedTrainingHours: string | null;
};

type Role = {
  id: number;
  name: string;
};

type Person = {
  id: number;
  name: string;
  active: boolean;
  roles: Role[];
};

type SettingsData = {
  departments: Department[];
  processes: Process[];
  people: Person[];
  roles: Role[];
  trainees: Array<{
    id: number;
    name: string;
    departmentName: string;
    teamLeader: string | null;
    trainingAssessor: string | null;
  }>;
  teamLeaders: string[];
  trainingAssessors: string[];
  trainingBuddies: string[];
  settings: Record<string, string>;
};

type SettingsTab =
  | 'overview'
  | 'departments'
  | 'processes'
  | 'people'
  | 'workflow';

type StatusFilter = 'All' | 'Active' | 'Inactive';

type DepartmentEditForm = {
  name: string;
  active: boolean;
};

type ProcessEditForm = {
  name: string;
  active: boolean;
  recommendedTrainingHours: string;
};

type PersonEditForm = {
  name: string;
  active: boolean;
  roleIds: number[];
};

const tabItems: Array<{ id: SettingsTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'departments', label: 'Departments' },
  { id: 'processes', label: 'Processes' },
  { id: 'people', label: 'People & Roles' },
  { id: 'workflow', label: 'Workflow Settings' },
];

function statusBadge(active: boolean) {
  return active
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : 'bg-slate-100 text-slate-600 ring-slate-200';
}

function countActive<T extends { active: boolean }>(items: T[]) {
  return items.filter((item) => item.active).length;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [departmentError, setDepartmentError] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(
    null,
  );
  const [departmentEditForm, setDepartmentEditForm] =
    useState<DepartmentEditForm>({ name: '', active: true });

  const [selectedProcessDepartmentId, setSelectedProcessDepartmentId] =
    useState('');
  const [processSearch, setProcessSearch] = useState('');
  const [processStatus, setProcessStatus] = useState<StatusFilter>('All');
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessRecommendedHours, setNewProcessRecommendedHours] =
    useState('');
  const [savingProcess, setSavingProcess] = useState(false);
  const [processError, setProcessError] = useState('');
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [processEditForm, setProcessEditForm] = useState<ProcessEditForm>({
    name: '',
    active: true,
    recommendedTrainingHours: '',
  });

  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleRole, setPeopleRole] = useState('All');
  const [peopleStatus, setPeopleStatus] = useState<StatusFilter>('All');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRoleIds, setNewPersonRoleIds] = useState<number[]>([]);
  const [savingPerson, setSavingPerson] = useState(false);
  const [personError, setPersonError] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [personEditForm, setPersonEditForm] = useState<PersonEditForm>({
    name: '',
    active: true,
    roleIds: [],
  });

  async function loadSettings() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/settings', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to load settings.');
      }

      const result = (await response.json()) as SettingsData;
      setData(result);

      const activeDepartments = result.departments.filter(
        (department) => department.active,
      );

      setSelectedProcessDepartmentId((current) => {
        const valid = result.departments.some(
          (department) => String(department.id) === current,
        );

        if (valid) {
          return current;
        }

        return activeDepartments[0]
          ? String(activeDepartments[0].id)
          : result.departments[0]
            ? String(result.departments[0].id)
            : '';
      });
    } catch {
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const activeDepartments = useMemo(
    () => data?.departments.filter((department) => department.active) ?? [],
    [data],
  );

  const selectedDepartment = useMemo(
    () =>
      data?.departments.find(
        (department) => String(department.id) === selectedProcessDepartmentId,
      ) ?? null,
    [data, selectedProcessDepartmentId],
  );

  const visibleProcesses = useMemo(() => {
    if (!data || !selectedProcessDepartmentId) {
      return [];
    }

    const query = processSearch.trim().toLowerCase();

    return data.processes.filter((process) => {
      if (String(process.departmentId) !== selectedProcessDepartmentId) {
        return false;
      }

      if (query && !process.name.toLowerCase().includes(query)) {
        return false;
      }

      if (processStatus === 'Active' && !process.active) {
        return false;
      }

      if (processStatus === 'Inactive' && process.active) {
        return false;
      }

      return true;
    });
  }, [data, processSearch, processStatus, selectedProcessDepartmentId]);

  const visiblePeople = useMemo(() => {
    if (!data) {
      return [];
    }

    const query = peopleSearch.trim().toLowerCase();

    return data.people.filter((person) => {
      if (query && !person.name.toLowerCase().includes(query)) {
        return false;
      }

      if (
        peopleRole !== 'All' &&
        !person.roles.some((role) => role.name === peopleRole)
      ) {
        return false;
      }

      if (peopleStatus === 'Active' && !person.active) {
        return false;
      }

      if (peopleStatus === 'Inactive' && person.active) {
        return false;
      }

      return true;
    });
  }, [data, peopleRole, peopleSearch, peopleStatus]);

  async function addDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepartmentError('');

    const name = newDepartmentName.trim();

    if (!name) {
      setDepartmentError('Department name is required.');
      return;
    }

    setSavingDepartment(true);

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to add department.');
      }

      setNewDepartmentName('');
      await loadSettings();
    } catch (caught) {
      setDepartmentError(
        caught instanceof Error ? caught.message : 'Failed to add department.',
      );
    } finally {
      setSavingDepartment(false);
    }
  }

  function startEditingDepartment(department: Department) {
    setEditingDepartmentId(department.id);
    setDepartmentError('');
    setDepartmentEditForm({
      name: department.name,
      active: department.active,
    });
  }

  async function saveDepartmentEdit(departmentId: number) {
    setDepartmentError('');
    const name = departmentEditForm.name.trim();

    if (!name) {
      setDepartmentError('Department name is required.');
      return;
    }

    try {
      const response = await fetch(`/api/departments/${departmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          active: departmentEditForm.active,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to update department.');
      }

      setEditingDepartmentId(null);
      await loadSettings();
    } catch (caught) {
      setDepartmentError(
        caught instanceof Error
          ? caught.message
          : 'Failed to update department.',
      );
    }
  }

  async function addProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProcessError('');

    const departmentId = Number(selectedProcessDepartmentId);
    const name = newProcessName.trim();

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      setProcessError('Department is required.');
      return;
    }

    if (!name) {
      setProcessError('Process name is required.');
      return;
    }

    setSavingProcess(true);

    try {
      const response = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          name,
          recommendedTrainingHours:
            newProcessRecommendedHours.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to add process.');
      }

      setNewProcessName('');
      setNewProcessRecommendedHours('');
      await loadSettings();
    } catch (caught) {
      setProcessError(
        caught instanceof Error ? caught.message : 'Failed to add process.',
      );
    } finally {
      setSavingProcess(false);
    }
  }

  function startEditingProcess(process: Process) {
    setEditingProcessId(process.id);
    setProcessError('');
    setProcessEditForm({
      name: process.name,
      active: process.active,
      recommendedTrainingHours: process.recommendedTrainingHours ?? '',
    });
  }

  async function saveProcessEdit(process: Process) {
    setProcessError('');

    const name = processEditForm.name.trim();

    if (!name) {
      setProcessError('Process name is required.');
      return;
    }

    try {
      const response = await fetch(`/api/processes/${process.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          active: processEditForm.active,
          recommendedTrainingHours:
            processEditForm.recommendedTrainingHours.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to update process.');
      }

      setEditingProcessId(null);
      await loadSettings();
    } catch (caught) {
      setProcessError(
        caught instanceof Error ? caught.message : 'Failed to update process.',
      );
    }
  }

  function toggleRole(roleId: number, edit = false) {
    if (edit) {
      setPersonEditForm((current) => ({
        ...current,
        roleIds: current.roleIds.includes(roleId)
          ? current.roleIds.filter((id) => id !== roleId)
          : [...current.roleIds, roleId],
      }));
      return;
    }

    setNewPersonRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonError('');

    const name = newPersonName.trim();

    if (!name) {
      setPersonError('Person name is required.');
      return;
    }

    setSavingPerson(true);

    try {
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, roleIds: newPersonRoleIds }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to add person.');
      }

      setNewPersonName('');
      setNewPersonRoleIds([]);
      setShowAddPerson(false);
      await loadSettings();
    } catch (caught) {
      setPersonError(
        caught instanceof Error ? caught.message : 'Failed to add person.',
      );
    } finally {
      setSavingPerson(false);
    }
  }

  function startEditingPerson(person: Person) {
    setEditingPersonId(person.id);
    setPersonError('');
    setPersonEditForm({
      name: person.name,
      active: person.active,
      roleIds: person.roles.map((role) => role.id),
    });
  }

  async function savePersonEdit(personId: number) {
    setPersonError('');

    const name = personEditForm.name.trim();

    if (!name) {
      setPersonError('Person name is required.');
      return;
    }

    try {
      const response = await fetch(`/api/people/${personId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          active: personEditForm.active,
          roleIds: personEditForm.roleIds,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to update person.');
      }

      setEditingPersonId(null);
      await loadSettings();
    } catch (caught) {
      setPersonError(
        caught instanceof Error ? caught.message : 'Failed to update person.',
      );
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-rose-700">{error || 'Settings unavailable.'}</p>
      </div>
    );
  }

  const activeDepartmentCount = countActive(data.departments);
  const activeProcessCount = countActive(data.processes);
  const activePeopleCount = countActive(data.people);
  const inactiveProcessCount = data.processes.length - activeProcessCount;
  const inactivePeopleCount = data.people.length - activePeopleCount;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-slate-600">
          Manage departments, processes, people, roles and operational settings
          used throughout the Training Command Centre.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab('departments')}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-200 hover:bg-sky-50"
            >
              <p className="text-sm font-medium text-slate-500">Departments</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data.departments.length}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {activeDepartmentCount} active ·{' '}
                {data.departments.length - activeDepartmentCount} inactive
              </p>
              <p className="mt-4 text-sm font-medium text-sky-700">
                Manage departments →
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('processes')}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-200 hover:bg-sky-50"
            >
              <p className="text-sm font-medium text-slate-500">Processes</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data.processes.length}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {activeProcessCount} active · {inactiveProcessCount} inactive
              </p>
              <p className="mt-4 text-sm font-medium text-sky-700">
                Manage processes →
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-200 hover:bg-sky-50"
            >
              <p className="text-sm font-medium text-slate-500">
                People & Roles
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data.people.length}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {activePeopleCount} active · {inactivePeopleCount} inactive
              </p>
              <p className="mt-4 text-sm font-medium text-sky-700">
                Manage people →
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workflow')}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-200 hover:bg-sky-50"
            >
              <p className="text-sm font-medium text-slate-500">
                Workflow Settings
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data.settings.readinessTargetShifts ?? '5'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                readiness target shifts
              </p>
              <p className="mt-4 text-sm font-medium text-sky-700">
                View workflow settings →
              </p>
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">Operational roles</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Team Leaders
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {
                      data.people.filter(
                        (person) =>
                          person.active &&
                          person.roles.some(
                            (role) => role.name === 'Team Leader',
                          ),
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Assessors
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {
                      data.people.filter(
                        (person) =>
                          person.active &&
                          person.roles.some(
                            (role) => role.name === 'Training Assessor',
                          ),
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Training Buddies
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {
                      data.people.filter(
                        (person) =>
                          person.active &&
                          person.roles.some(
                            (role) => role.name === 'Training Buddy',
                          ),
                      ).length
                    }
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">Workflow controls</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Setup overdue after</dt>
                  <dd className="font-medium text-slate-900">
                    {data.settings.setupOverdueAfterDays ?? '2'} days
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Chase after</dt>
                  <dd className="font-medium text-slate-900">
                    {data.settings.chaseAfterDays ?? '5'} days
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Priority after ready</dt>
                  <dd className="font-medium text-slate-900">
                    {data.settings.priorityAfterReadyDays ?? '5'} days
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === 'departments' ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Department Management</h3>
              <p className="mt-1 text-sm text-slate-600">
                Maintain the departments available throughout the training
                workflow.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              {activeDepartmentCount} active of {data.departments.length}
            </p>
          </div>

          <form
            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]"
            onSubmit={addDepartment}
          >
            <input
              className="rounded-xl border border-slate-200 bg-white p-3"
              value={newDepartmentName}
              onChange={(event) => setNewDepartmentName(event.target.value)}
              placeholder="Department name"
            />
            <button
              type="submit"
              disabled={savingDepartment}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingDepartment ? 'Adding...' : 'Add Department'}
            </button>
          </form>

          {departmentError ? (
            <p className="text-sm text-rose-700">{departmentError}</p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.departments.map((department) =>
                  editingDepartmentId === department.id ? (
                    <tr key={department.id}>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-xl border border-slate-200 p-2"
                          value={departmentEditForm.name}
                          onChange={(event) =>
                            setDepartmentEditForm((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="rounded-xl border border-slate-200 p-2"
                          value={String(departmentEditForm.active)}
                          onChange={(event) =>
                            setDepartmentEditForm((current) => ({
                              ...current,
                              active: event.target.value === 'true',
                            }))
                          }
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void saveDepartmentEdit(department.id)}
                            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDepartmentId(null)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={department.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {department.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadge(
                            department.active,
                          )}`}
                        >
                          {department.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEditingDepartment(department)}
                          className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'processes' ? (
        <section className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Process Management</h3>
            <p className="mt-1 text-sm text-slate-600">
              Manage one department at a time instead of displaying the entire
              process catalogue at once.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-xl border border-slate-200 p-3"
              value={selectedProcessDepartmentId}
              onChange={(event) => {
                setSelectedProcessDepartmentId(event.target.value);
                setEditingProcessId(null);
              }}
            >
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                  {department.active ? '' : ' (Inactive)'}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-slate-200 p-3"
              value={processSearch}
              onChange={(event) => setProcessSearch(event.target.value)}
              placeholder="Search process"
            />
            <select
              className="rounded-xl border border-slate-200 p-3"
              value={processStatus}
              onChange={(event) =>
                setProcessStatus(event.target.value as StatusFilter)
              }
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          <form
            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_12rem_auto]"
            onSubmit={addProcess}
          >
            <input
              className="rounded-xl border border-slate-200 bg-white p-3"
              value={newProcessName}
              onChange={(event) => setNewProcessName(event.target.value)}
              placeholder={
                selectedDepartment
                  ? `New process for ${selectedDepartment.name}`
                  : 'Process name'
              }
            />
            <input
              className="rounded-xl border border-slate-200 bg-white p-3"
              inputMode="decimal"
              value={newProcessRecommendedHours}
              onChange={(event) =>
                setNewProcessRecommendedHours(event.target.value)
              }
              placeholder="Recommended hours"
            />
            <button
              type="submit"
              disabled={savingProcess || !selectedProcessDepartmentId}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingProcess ? 'Adding...' : 'Add Process'}
            </button>
          </form>

          {processError ? (
            <p className="text-sm text-rose-700">{processError}</p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {selectedDepartment?.name || 'Select a department'}
                </p>
                <p className="text-xs text-slate-500">
                  {visibleProcesses.length} matching process
                  {visibleProcesses.length === 1 ? '' : 'es'}
                </p>
              </div>
            </div>
            <table className="min-w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Process</th>
                  <th className="px-4 py-3 text-left">Recommended Hours</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProcesses.length ? (
                  visibleProcesses.map((process) =>
                    editingProcessId === process.id ? (
                      <tr key={process.id}>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-xl border border-slate-200 p-2"
                            value={processEditForm.name}
                            onChange={(event) =>
                              setProcessEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-32 rounded-xl border border-slate-200 p-2"
                            inputMode="decimal"
                            value={processEditForm.recommendedTrainingHours}
                            onChange={(event) =>
                              setProcessEditForm((current) => ({
                                ...current,
                                recommendedTrainingHours: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="rounded-xl border border-slate-200 p-2"
                            value={String(processEditForm.active)}
                            onChange={(event) =>
                              setProcessEditForm((current) => ({
                                ...current,
                                active: event.target.value === 'true',
                              }))
                            }
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void saveProcessEdit(process)}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProcessId(null)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={process.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {process.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {process.recommendedTrainingHours
                            ? `${process.recommendedTrainingHours} h`
                            : 'Not Set'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadge(
                              process.active,
                            )}`}
                          >
                            {process.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => startEditingProcess(process)}
                            className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No processes match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'people' ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">People & Roles</h3>
              <p className="mt-1 text-sm text-slate-600">
                Manage operational people and the roles they can perform.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddPerson((current) => !current);
                setPersonError('');
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              {showAddPerson ? 'Close' : 'Add Person'}
            </button>
          </div>

          {showAddPerson ? (
            <form
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              onSubmit={addPerson}
            >
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-3"
                value={newPersonName}
                onChange={(event) => setNewPersonName(event.target.value)}
                placeholder="Person name"
              />
              <div className="flex flex-wrap gap-2">
                {data.roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={newPersonRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPerson}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {savingPerson ? 'Adding...' : 'Add Person'}
                </button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border border-slate-200 p-3"
              value={peopleSearch}
              onChange={(event) => setPeopleSearch(event.target.value)}
              placeholder="Search person"
            />
            <select
              className="rounded-xl border border-slate-200 p-3"
              value={peopleRole}
              onChange={(event) => setPeopleRole(event.target.value)}
            >
              <option>All</option>
              {data.roles.map((role) => (
                <option key={role.id}>{role.name}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-200 p-3"
              value={peopleStatus}
              onChange={(event) =>
                setPeopleStatus(event.target.value as StatusFilter)
              }
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {personError ? (
            <p className="text-sm text-rose-700">{personError}</p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Person</th>
                  <th className="px-4 py-3 text-left">Roles</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePeople.length ? (
                  visiblePeople.map((person) =>
                    editingPersonId === person.id ? (
                      <tr key={person.id}>
                        <td className="px-4 py-3 align-top">
                          <input
                            className="w-full rounded-xl border border-slate-200 p-2"
                            value={personEditForm.name}
                            onChange={(event) =>
                              setPersonEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            {data.roles.map((role) => (
                              <label
                                key={role.id}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={personEditForm.roleIds.includes(
                                    role.id,
                                  )}
                                  onChange={() => toggleRole(role.id, true)}
                                />
                                <span>{role.name}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            className="rounded-xl border border-slate-200 p-2"
                            value={String(personEditForm.active)}
                            onChange={(event) =>
                              setPersonEditForm((current) => ({
                                ...current,
                                active: event.target.value === 'true',
                              }))
                            }
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void savePersonEdit(person.id)}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPersonId(null)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={person.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {person.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {person.roles.length ? (
                              person.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"
                                >
                                  {role.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500">
                                No roles assigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadge(
                              person.active,
                            )}`}
                          >
                            {person.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => startEditingPerson(person)}
                            className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No people match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'workflow' ? (
        <section className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Workflow Settings</h3>
            <p className="mt-1 text-sm text-slate-600">
              Current workflow thresholds used by the Training Command Centre.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-medium text-slate-500">
                Setup overdue after
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {data.settings.setupOverdueAfterDays ?? '2'} days
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Used to identify training setup activity that is overdue.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-medium text-slate-500">Chase after</p>
              <p className="mt-2 text-3xl font-semibold">
                {data.settings.chaseAfterDays ?? '5'} days
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Used to trigger a follow-up chase when progress has stalled.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-medium text-slate-500">
                Priority after ready
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {data.settings.priorityAfterReadyDays ?? '5'} days
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Used to prioritise colleagues who remain ready for assessment.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-medium text-slate-500">
                Readiness target
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {data.settings.readinessTargetShifts ?? '5'} shifts
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Target number of shifts used by the readiness workflow.
              </p>
            </article>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            These workflow values are currently displayed from the existing
            settings store. Editing controls can be added once the workflow
            rules for changing these thresholds are agreed.
          </div>
        </section>
      ) : null}
    </div>
  );
}
