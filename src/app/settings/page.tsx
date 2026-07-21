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

type PeopleResponse = {
  people: Person[];
  roles: Role[];
};

type PersonEditForm = {
  name: string;
  active: boolean;
  roleIds: number[];
};

type DepartmentEditForm = {
  name: string;
  active: boolean;
};

type ProcessEditForm = {
  name: string;
  active: boolean;
  recommendedTrainingHours: string;
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

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingDepartmentEdit, setSavingDepartmentEdit] = useState(false);
  const [savingProcess, setSavingProcess] = useState(false);
  const [savingProcessEdit, setSavingProcessEdit] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [savingPersonEdit, setSavingPersonEdit] = useState(false);
  const [error, setError] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [departmentEditError, setDepartmentEditError] = useState('');
  const [processError, setProcessError] = useState('');
  const [processEditError, setProcessEditError] = useState('');
  const [personError, setPersonError] = useState('');
  const [personEditError, setPersonEditError] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newProcessDepartmentId, setNewProcessDepartmentId] = useState('');
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessRecommendedHours, setNewProcessRecommendedHours] =
    useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRoleIds, setNewPersonRoleIds] = useState<number[]>([]);
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(
    null,
  );
  const [departmentEditForm, setDepartmentEditForm] =
    useState<DepartmentEditForm>({
      name: '',
      active: true,
    });
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [processEditForm, setProcessEditForm] = useState<ProcessEditForm>({
    name: '',
    active: true,
    recommendedTrainingHours: '',
  });
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [personEditForm, setPersonEditForm] = useState<PersonEditForm>({
    name: '',
    active: true,
    roleIds: [],
  });

  async function loadDepartments() {
    const response = await fetch('/api/departments', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load departments.');
    }

    return (await response.json()) as Department[];
  }

  async function loadProcesses() {
    const response = await fetch('/api/processes', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load processes.');
    }

    return (await response.json()) as Process[];
  }

  async function loadPeople() {
    const response = await fetch('/api/people', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load people.');
    }

    return (await response.json()) as PeopleResponse;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const settingsResponse = await fetch('/api/settings', {
          cache: 'no-store',
        });

        if (!settingsResponse.ok) {
          throw new Error('Failed to load settings.');
        }

        const result = (await settingsResponse.json()) as SettingsData;
        if (!cancelled) {
          setData(result);
          const activeDepartments = result.departments.filter(
            (department) => department.active,
          );
          setNewProcessDepartmentId((current) =>
            current ||
            (activeDepartments[0] ? String(activeDepartments[0].id) : ''),
          );
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to add department.');
      }

      const departments = await loadDepartments();
      setData((current) =>
        current
          ? {
              ...current,
              departments,
            }
          : current,
      );
      setNewDepartmentName('');
      const activeDepartments = departments.filter(
        (department) => department.active,
      );
      setNewProcessDepartmentId((current) =>
        current ||
        (activeDepartments[0] ? String(activeDepartments[0].id) : ''),
      );
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
    setDepartmentEditError('');
    setDepartmentEditForm({
      name: department.name,
      active: department.active,
    });
  }

  function cancelEditingDepartment() {
    setEditingDepartmentId(null);
    setDepartmentEditError('');
    setDepartmentEditForm({
      name: '',
      active: true,
    });
  }

  async function saveDepartmentEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepartmentEditError('');

    if (!editingDepartmentId || !data) {
      setDepartmentEditError('Select a department to edit.');
      return;
    }

    const name = departmentEditForm.name.trim();
    if (!name) {
      setDepartmentEditError('Department name is required.');
      return;
    }

    const duplicateDepartment = data.departments.find(
      (department) =>
        department.id !== editingDepartmentId &&
        department.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicateDepartment) {
      setDepartmentEditError('Department already exists.');
      return;
    }

    setSavingDepartmentEdit(true);

    try {
      const response = await fetch(`/api/departments/${editingDepartmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const departments = await loadDepartments();
      const processes = await loadProcesses();
      setData((current) =>
        current
          ? {
              ...current,
              departments,
              processes,
            }
          : current,
      );

      const activeDepartments = departments.filter(
        (department) => department.active,
      );
      setNewProcessDepartmentId((current) =>
        activeDepartments.some(
          (department) => String(department.id) === current,
        )
          ? current
          : activeDepartments[0]
            ? String(activeDepartments[0].id)
            : '',
      );

      cancelEditingDepartment();
    } catch (caught) {
      setDepartmentEditError(
        caught instanceof Error
          ? caught.message
          : 'Failed to update department.',
      );
    } finally {
      setSavingDepartmentEdit(false);
    }
  }

  async function addProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProcessError('');

    const departmentId = Number(newProcessDepartmentId);
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
        headers: {
          'Content-Type': 'application/json',
        },
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

      const processes = await loadProcesses();
      setData((current) =>
        current
          ? {
              ...current,
              processes,
            }
          : current,
      );
      setNewProcessName('');
      setNewProcessRecommendedHours('');
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
    setProcessEditError('');
    setProcessEditForm({
      name: process.name,
      active: process.active,
      recommendedTrainingHours: process.recommendedTrainingHours ?? '',
    });
  }

  function cancelEditingProcess() {
    setEditingProcessId(null);
    setProcessEditError('');
    setProcessEditForm({
      name: '',
      active: true,
      recommendedTrainingHours: '',
    });
  }

  async function saveProcessEdit(
    event: FormEvent<HTMLFormElement>,
    process: Process,
  ) {
    event.preventDefault();
    setProcessEditError('');

    const name = processEditForm.name.trim();
    if (!name) {
      setProcessEditError('Process name is required.');
      return;
    }

    const duplicateProcess = data?.processes.find(
      (item) =>
        item.id !== process.id &&
        item.departmentId === process.departmentId &&
        item.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicateProcess) {
      setProcessEditError('Process already exists for this department.');
      return;
    }

    setSavingProcessEdit(true);

    try {
      const response = await fetch(`/api/processes/${process.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const processes = await loadProcesses();
      setData((current) =>
        current
          ? {
              ...current,
              processes,
            }
          : current,
      );
      cancelEditingProcess();
    } catch (caught) {
      setProcessEditError(
        caught instanceof Error ? caught.message : 'Failed to update process.',
      );
    } finally {
      setSavingProcessEdit(false);
    }
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, roleIds: newPersonRoleIds }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error || 'Failed to add person.');
      }

      const peopleData = await loadPeople();
      setData((current) =>
        current
          ? {
              ...current,
              people: peopleData.people,
              roles: peopleData.roles,
            }
          : current,
      );
      setNewPersonName('');
      setNewPersonRoleIds([]);
    } catch (caught) {
      setPersonError(
        caught instanceof Error ? caught.message : 'Failed to add person.',
      );
    } finally {
      setSavingPerson(false);
    }
  }

  function toggleNewPersonRole(roleId: number) {
    setNewPersonRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  }

  function startEditingPerson(person: Person) {
    setEditingPersonId(person.id);
    setPersonEditError('');
    setPersonEditForm({
      name: person.name,
      active: person.active,
      roleIds: person.roles.map((role) => role.id),
    });
  }

  function cancelEditingPerson() {
    setEditingPersonId(null);
    setPersonEditError('');
    setPersonEditForm({
      name: '',
      active: true,
      roleIds: [],
    });
  }

  function toggleEditPersonRole(roleId: number) {
    setPersonEditForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  }

  async function savePersonEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonEditError('');

    if (!editingPersonId) {
      setPersonEditError('Select a person to edit.');
      return;
    }

    const name = personEditForm.name.trim();
    if (!name) {
      setPersonEditError('Person name is required.');
      return;
    }

    setSavingPersonEdit(true);

    try {
      const response = await fetch(`/api/people/${editingPersonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const peopleData = await loadPeople();
      setData((current) =>
        current
          ? {
              ...current,
              people: peopleData.people,
              roles: peopleData.roles,
            }
          : current,
      );
      cancelEditingPerson();
    } catch (caught) {
      setPersonEditError(
        caught instanceof Error ? caught.message : 'Failed to update person.',
      );
    } finally {
      setSavingPersonEdit(false);
    }
  }

  const settingsCards = useMemo(() => {
    if (!data) {
      return [];
    }

    const setupDays = data.settings.setupOverdueAfterDays ?? '2';
    const chaseDays = data.settings.chaseAfterDays ?? '5';
    const priorityDays = data.settings.priorityAfterReadyDays ?? '5';

    return [
      [
        'Departments',
        data.departments.map((item) => item.name).join(', '),
      ],
      [
        'Processes',
        data.processes
          .slice(0, 8)
          .map((item) => item.name)
          .join(', '),
      ],
      ['Team Leaders', data.teamLeaders.join(', ')],
      ['Training Assessors', data.trainingAssessors.join(', ')],
      ['Training Buddies', data.trainingBuddies.join(', ')],
      [
        'Follow-up thresholds',
        `Setup overdue ${setupDays} days · Chase after ${chaseDays} days · Priority after ${priorityDays} days`,
      ],
      [
        'Readiness target shifts',
        `${data.settings.readinessTargetShifts ?? '5'} shifts`,
      ],
    ];
  }, [data]);

  const processesByDepartment = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.departments.map((department) => ({
      department,
      processes: data.processes.filter(
        (process) => process.departmentId === department.id,
      ),
    }));
  }, [data]);

  const activeDepartments = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.departments.filter((department) => department.active);
  }, [data]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-slate-600">
          Editable-looking management tables and settings groups for the
          command centre workflow.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading settings...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {settingsCards.map(([title, value]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {value || 'None configured'}
                </p>
              </article>
            ))}
          </div>
          <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <h3 className="text-lg font-semibold">Department Management</h3>
              <p className="mt-1 text-sm text-slate-600">
                Add departments for future colleague and process management.
              </p>
            </div>
            <form
              className="grid gap-3 md:grid-cols-[1fr_auto]"
              onSubmit={addDepartment}
            >
              <input
                className="rounded-xl border border-slate-200 p-3"
                value={newDepartmentName}
                onChange={(event) => setNewDepartmentName(event.target.value)}
                placeholder="Department name"
              />
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                disabled={savingDepartment}
                type="submit"
              >
                {savingDepartment ? 'Adding...' : 'Add Department'}
              </button>
            </form>
            {departmentError ? (
              <p className="text-sm text-red-600">{departmentError}</p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 text-left">Department</th>
                    <th className="pb-3 text-left">Status</th>
                    <th className="pb-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((department) =>
                    editingDepartmentId === department.id ? (
                      <tr
                        key={department.id}
                        className="border-t border-slate-200"
                      >
                        <td className="py-3 align-top">
                          <input
                            className="w-full rounded-xl border border-slate-200 p-3"
                            value={departmentEditForm.name}
                            onChange={(event) =>
                              setDepartmentEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                          {departmentEditError ? (
                            <p className="mt-2 text-sm text-red-600">
                              {departmentEditError}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 align-top">
                          <select
                            className="rounded-xl border border-slate-200 p-3"
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
                        <td className="py-3 align-top">
                          <form
                            className="flex flex-wrap gap-2"
                            onSubmit={saveDepartmentEdit}
                          >
                            <button
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                              disabled={savingDepartmentEdit}
                              type="submit"
                            >
                              {savingDepartmentEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                              type="button"
                              onClick={cancelEditingDepartment}
                            >
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={department.id}
                        className="border-t border-slate-200"
                      >
                        <td className="py-3">{department.name}</td>
                        <td className="py-3">
                          {department.active ? 'Active' : 'Inactive'}
                        </td>
                        <td className="py-3">
                          <button
                            className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                            type="button"
                            onClick={() => startEditingDepartment(department)}
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
          <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <h3 className="text-lg font-semibold">Process Management</h3>
              <p className="mt-1 text-sm text-slate-600">
                Add processes to departments for future assignment workflows.
              </p>
            </div>
            <form
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,12rem)_auto]"
              onSubmit={addProcess}
            >
              <select
                className="rounded-xl border border-slate-200 p-3"
                value={newProcessDepartmentId}
                onChange={(event) =>
                  setNewProcessDepartmentId(event.target.value)
                }
              >
                {activeDepartments.length ? (
                  activeDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))
                ) : (
                  <option value="">No active departments configured</option>
                )}
              </select>
              <input
                className="rounded-xl border border-slate-200 p-3"
                value={newProcessName}
                onChange={(event) => setNewProcessName(event.target.value)}
                placeholder="Process name"
              />
              <label className="space-y-1 text-sm">
                <span className="text-xs text-slate-500">
                  Recommended Training Hours
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3"
                  inputMode="decimal"
                  value={newProcessRecommendedHours}
                  onChange={(event) =>
                    setNewProcessRecommendedHours(event.target.value)
                  }
                  placeholder="Recommended hours"
                />
                <span className="text-xs text-slate-500">hours</span>
              </label>
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                disabled={savingProcess}
                type="submit"
              >
                {savingProcess ? 'Adding...' : 'Add Process'}
              </button>
            </form>
            {processError ? (
              <p className="text-sm text-red-600">{processError}</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              {processesByDepartment.map(({ department, processes }) => (
                <article
                  key={department.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h4 className="font-semibold">
                    {department.name}
                    {!department.active ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                        Inactive
                      </span>
                    ) : null}
                  </h4>
                  {processes.length ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm text-slate-600">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="pb-2 text-left font-medium">
                              Process
                            </th>
                            <th className="pb-2 text-left font-medium">
                              Recommended Hours
                            </th>
                            <th className="pb-2 text-left font-medium">
                              Status
                            </th>
                            <th className="pb-2 text-left font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {processes.map((process) =>
                            editingProcessId === process.id ? (
                              <tr
                                key={process.id}
                                className="border-t border-slate-100"
                              >
                                <td className="py-2 pr-3 align-top">
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
                                  {processEditError ? (
                                    <p className="mt-2 text-sm text-red-600">
                                      {processEditError}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="py-2 pr-3 align-top">
                                  <input
                                    className="w-full rounded-xl border border-slate-200 p-2"
                                    inputMode="decimal"
                                    value={
                                      processEditForm.recommendedTrainingHours
                                    }
                                    onChange={(event) =>
                                      setProcessEditForm((current) => ({
                                        ...current,
                                        recommendedTrainingHours:
                                          event.target.value,
                                      }))
                                    }
                                  />
                                  <p className="mt-1 text-xs text-slate-500">
                                    hours
                                  </p>
                                </td>
                                <td className="py-2 pr-3 align-top">
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
                                <td className="py-2 align-top">
                                  <form
                                    className="flex flex-wrap gap-2"
                                    onSubmit={(event) =>
                                      saveProcessEdit(event, process)
                                    }
                                  >
                                    <button
                                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                                      disabled={savingProcessEdit}
                                      type="submit"
                                    >
                                      {savingProcessEdit ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                                      type="button"
                                      onClick={cancelEditingProcess}
                                    >
                                      Cancel
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            ) : (
                              <tr
                                key={process.id}
                                className="border-t border-slate-100"
                              >
                                <td className="py-2 pr-3">{process.name}</td>
                                <td className="py-2 pr-3">
                                  {process.recommendedTrainingHours
                                    ? `${process.recommendedTrainingHours} h`
                                    : 'Not Set'}
                                </td>
                                <td className="py-2 pr-3">
                                  {process.active ? 'Active' : 'Inactive'}
                                </td>
                                <td className="py-2">
                                  <button
                                    className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                                    type="button"
                                    onClick={() => startEditingProcess(process)}
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
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No processes configured.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <h3 className="text-lg font-semibold">People Management</h3>
              <p className="mt-1 text-sm text-slate-600">
                Add people and assign operational roles for future workflow
                controls.
              </p>
            </div>
            <form className="space-y-3" onSubmit={addPerson}>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="rounded-xl border border-slate-200 p-3"
                  value={newPersonName}
                  onChange={(event) => setNewPersonName(event.target.value)}
                  placeholder="Person name"
                />
                <button
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                  disabled={savingPerson}
                  type="submit"
                >
                  {savingPerson ? 'Adding...' : 'Add Person'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {data.roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <input
                      checked={newPersonRoleIds.includes(role.id)}
                      onChange={() => toggleNewPersonRole(role.id)}
                      type="checkbox"
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </form>
            {personError ? (
              <p className="text-sm text-red-600">{personError}</p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 text-left">Person</th>
                    <th className="pb-3 text-left">Roles</th>
                    <th className="pb-3 text-left">Status</th>
                    <th className="pb-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.people.map((person) =>
                    editingPersonId === person.id ? (
                      <tr key={person.id} className="border-t border-slate-100">
                        <td className="py-3 align-top">
                          <input
                            className="w-full rounded-xl border border-slate-200 p-3"
                            value={personEditForm.name}
                            onChange={(event) =>
                              setPersonEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            {data.roles.map((role) => (
                              <label
                                key={role.id}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              >
                                <input
                                  checked={personEditForm.roleIds.includes(
                                    role.id,
                                  )}
                                  onChange={() => toggleEditPersonRole(role.id)}
                                  type="checkbox"
                                />
                                <span>{role.name}</span>
                              </label>
                            ))}
                          </div>
                          {personEditError ? (
                            <p className="mt-2 text-sm text-red-600">
                              {personEditError}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 align-top">
                          <select
                            className="rounded-xl border border-slate-200 p-3"
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
                        <td className="py-3 align-top">
                          <form
                            className="flex flex-wrap gap-2"
                            onSubmit={savePersonEdit}
                          >
                            <button
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                              disabled={savingPersonEdit}
                              type="submit"
                            >
                              {savingPersonEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                              type="button"
                              onClick={cancelEditingPerson}
                            >
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={person.id} className="border-t border-slate-100">
                        <td className="py-3">{person.name}</td>
                        <td className="py-3">
                          {person.roles.map((role) => role.name).join(', ') ||
                            'No roles assigned'}
                        </td>
                        <td className="py-3">
                          {person.active ? 'Active' : 'Inactive'}
                        </td>
                        <td className="py-3">
                          <button
                            className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                            type="button"
                            onClick={() => startEditingPerson(person)}
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 text-left">Trainee</th>
                  <th className="pb-3 text-left">Department</th>
                  <th className="pb-3 text-left">Team Leader</th>
                  <th className="pb-3 text-left">Assessor</th>
                </tr>
              </thead>
              <tbody>
                {data.trainees.map((trainee) => (
                  <tr key={trainee.id} className="border-t border-slate-100">
                    <td className="py-3">{trainee.name}</td>
                    <td className="py-3">{trainee.departmentName}</td>
                    <td className="py-3">{trainee.teamLeader ?? ''}</td>
                    <td className="py-3">
                      {trainee.trainingAssessor ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
