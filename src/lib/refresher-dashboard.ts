export type RefresherDashboardRecord = {
  id: number;
  traineeId: number;
  traineeProcessId: number;
  department: string;
  traineeName: string;
  process: string;
  lastCompetencyDate: string | null;
  refresherDueDate: string | null;
  scheduledRefresherDate: string | null;
  status: string;
  scheduleStatus: string | null;
  daysUntilDue: number | null;
  assignedAssessor: string | null;
  completedDate: string | null;
  outcome: string | null;
};

export type RefresherDashboardFilters = {
  department: string;
  status: string;
  trainee: string;
};

export type RefresherSummary = {
  totalRefreshers: number;
  overdue: number;
  dueThisMonth: number;
  dueNextMonth: number;
  scheduled: number;
  notScheduled: number;
};

export type RefresherDashboardColleagueGroup = {
  traineeId: number;
  traineeName: string;
  priority: number;
  summary: RefresherSummary;
  refreshers: RefresherDashboardRecord[];
};

export type RefresherDashboardDepartmentGroup = {
  department: string;
  summary: RefresherSummary;
  colleagues: RefresherDashboardColleagueGroup[];
};

export type RefresherSchedulingDisplay = {
  label: string;
  tone: 'completed' | 'scheduled' | 'notScheduled' | 'other';
};

const statusPriority: Record<string, number> = {
  Overdue: 0,
  'Due This Month': 1,
  'Due Next Month': 2,
  'Not Due Yet': 3,
  Completed: 4,
};

export function getRefresherMeetingDepartment(departmentName: string) {
  switch (departmentName) {
    case 'Machine Setter - Production':
      return 'Surfacing';
    case 'Machine Setter - Coating':
      return 'Coating';
    default:
      return departmentName;
  }
}

export function getRefresherPriority(status: string) {
  return statusPriority[status] ?? 5;
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.slice(0, 10).split('-').map(Number);

  if (!year || !month || !day) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function isCompletedRefresher(record: RefresherDashboardRecord) {
  const scheduleStatus = record.scheduleStatus?.trim();
  const outcome = record.outcome?.trim();

  return Boolean(
    scheduleStatus === 'Completed' || record.completedDate || outcome,
  );
}

export function isActivelyScheduledRefresher(
  record: RefresherDashboardRecord,
) {
  const scheduleStatus = record.scheduleStatus?.trim();

  return Boolean(
    record.scheduledRefresherDate &&
      scheduleStatus === 'Scheduled' &&
      !isCompletedRefresher(record),
  );
}

export function isNotScheduledRefresher(record: RefresherDashboardRecord) {
  return (
    !isCompletedRefresher(record) && !isActivelyScheduledRefresher(record)
  );
}

export function getRefresherSchedulingDisplay(
  record: RefresherDashboardRecord,
): RefresherSchedulingDisplay {
  if (isCompletedRefresher(record)) {
    const completedDate = formatDisplayDate(record.completedDate);

    return {
      label: completedDate ? `Completed ${completedDate}` : 'Completed',
      tone: 'completed',
    };
  }

  if (isActivelyScheduledRefresher(record)) {
    const scheduledDate = formatDisplayDate(record.scheduledRefresherDate);

    return {
      label: scheduledDate ? `Scheduled ${scheduledDate}` : 'Scheduled',
      tone: 'scheduled',
    };
  }

  const scheduleStatus = record.scheduleStatus?.trim();

  if (scheduleStatus && scheduleStatus !== 'Scheduled') {
    const scheduledDate = formatDisplayDate(record.scheduledRefresherDate);

    return {
      label: scheduledDate ? `${scheduleStatus} ${scheduledDate}` : scheduleStatus,
      tone: 'other',
    };
  }

  return {
    label: 'Not Scheduled',
    tone: 'notScheduled',
  };
}

export function calculateRefresherSummary(
  records: RefresherDashboardRecord[],
): RefresherSummary {
  return {
    totalRefreshers: records.length,
    overdue: records.filter((record) => record.status === 'Overdue').length,
    dueThisMonth: records.filter(
      (record) => record.status === 'Due This Month',
    ).length,
    dueNextMonth: records.filter(
      (record) => record.status === 'Due Next Month',
    ).length,
    scheduled: records.filter(isActivelyScheduledRefresher).length,
    notScheduled: records.filter(isNotScheduledRefresher).length,
  };
}

export function filterRefreshersForDashboard(
  records: RefresherDashboardRecord[],
  filters: RefresherDashboardFilters,
) {
  return records.filter((record) => {
    const meetingDepartment = getRefresherMeetingDepartment(record.department);

    return (
      (filters.department === 'All' ||
        meetingDepartment === filters.department) &&
      (filters.status === 'All' || record.status === filters.status) &&
      (filters.trainee === 'All' || record.traineeName === filters.trainee)
    );
  });
}

function dateSortValue(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const dateKey = value.slice(0, 10);
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`);

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function sortRefreshers(
  records: RefresherDashboardRecord[],
): RefresherDashboardRecord[] {
  return [...records].sort(
    (left, right) =>
      getRefresherPriority(left.status) - getRefresherPriority(right.status) ||
      dateSortValue(left.refresherDueDate) -
        dateSortValue(right.refresherDueDate) ||
      left.process.localeCompare(right.process, undefined, {
        sensitivity: 'base',
      }) ||
      left.id - right.id,
  );
}

export function countCompletedThisMonth(
  records: RefresherDashboardRecord[],
  today = new Date(),
) {
  const monthKey = today.toISOString().slice(0, 7);

  return records.filter(
    (record) =>
      record.status === 'Completed' &&
      record.completedDate?.slice(0, 7) === monthKey,
  ).length;
}

export function buildRefresherDashboardGroups(
  records: RefresherDashboardRecord[],
): RefresherDashboardDepartmentGroup[] {
  const departments = new Map<string, RefresherDashboardRecord[]>();

  records.forEach((record) => {
    const department = getRefresherMeetingDepartment(record.department);
    const current = departments.get(department) ?? [];

    current.push(record);
    departments.set(department, current);
  });

  return Array.from(departments.entries())
    .map(([department, departmentRecords]) => {
      const colleagueRecords = new Map<number, RefresherDashboardRecord[]>();

      departmentRecords.forEach((record) => {
        const current = colleagueRecords.get(record.traineeId) ?? [];

        current.push(record);
        colleagueRecords.set(record.traineeId, current);
      });

      const colleagues = Array.from(colleagueRecords.entries())
        .map(([traineeId, recordsForColleague]) => {
          const refreshers = sortRefreshers(recordsForColleague);
          const priority = Math.min(
            ...refreshers.map((record) => getRefresherPriority(record.status)),
          );

          return {
            traineeId,
            traineeName: refreshers[0]?.traineeName ?? '',
            priority,
            summary: calculateRefresherSummary(refreshers),
            refreshers,
          };
        })
        .sort(
          (left, right) =>
            left.priority - right.priority ||
            left.traineeName.localeCompare(right.traineeName, undefined, {
              sensitivity: 'base',
            }) ||
            left.traineeId - right.traineeId,
        );

      return {
        department,
        summary: calculateRefresherSummary(departmentRecords),
        colleagues,
      };
    })
    .sort((left, right) => {
      const preferred = ['Surfacing', 'Coating'];
      const leftIndex = preferred.indexOf(left.department);
      const rightIndex = preferred.indexOf(right.department);

      if (leftIndex !== -1 || rightIndex !== -1) {
        return (
          (leftIndex === -1 ? preferred.length : leftIndex) -
          (rightIndex === -1 ? preferred.length : rightIndex)
        );
      }

      return left.department.localeCompare(right.department, undefined, {
        sensitivity: 'base',
      });
    });
}
