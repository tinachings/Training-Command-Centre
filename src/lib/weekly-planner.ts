export type WeeklyPlannerItem = {
  id: number;
  weekCommencing: string;
  plannedDate: string;
  department: string;
  traineeName: string;
  process: string;
  activityType: string;
  owner: string | null;
  status: string;
  actualDate: string | null;
  deviationReason: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
  traineeProcessId: number | null;
};

export type MondayPlanningGroup = {
  activity: string;
  items: WeeklyPlannerItem[];
};

export type RefresherPlanningGroup = {
  dateKey: string;
  colleagues: {
    traineeName: string;
    items: WeeklyPlannerItem[];
  }[];
};

export type MondayDepartmentGroup = {
  department: string;
  summary: {
    totalCount: number;
    completedCount: number;
    activityCounts: Record<string, number>;
  };
  activityGroups: MondayPlanningGroup[];
};

export type FridayDepartmentGroup = {
  department: string;
  summary: {
    plannedCount: number;
    completedCount: number;
    deferredCount: number;
    carryOverCount: number;
    outstandingCount: number;
    notCompletedCount: number;
  };
  completedActivityCounts: Record<string, number>;
  exceptions: {
    label: string;
    items: WeeklyPlannerItem[];
  }[];
};

export type LifecycleGroups = {
  mondayDepartments: MondayDepartmentGroup[];
  fridayDepartments: FridayDepartmentGroup[];
};

export type WeeklyPlannerSummary = {
  totalPlanned: number;
  completed: number;
  deferred: number;
  carryOver: number;
  outstanding: number;
  notCompleted: number;
};

const supportedActivityTypes = [
  'New Training',
  'Pre-Assessment',
  'Assessment',
  'Refresher',
];

const plannerOutcomeLabels = {
  Planned: 'Planned',
  Completed: 'Completed',
  Deferred: 'Deferred',
  CarryOver: 'Carry Over',
  NotCompleted: 'Not Completed',
} as const;

const finalPlannerStatuses = new Set<string>([
  plannerOutcomeLabels.Completed,
  plannerOutcomeLabels.Deferred,
  plannerOutcomeLabels.CarryOver,
  plannerOutcomeLabels.NotCompleted,
]);

export function getWeeklyPlannerMeetingDepartment(departmentName: string) {
  switch (departmentName) {
    case 'Machine Setter - Production':
      return 'Surfacing';
    case 'Machine Setter - Coating':
      return 'Coating';
    default:
      return departmentName;
  }
}

export function deriveWeeklyPlannerStatus(
  item: WeeklyPlannerItem,
  weekBeginning: string,
) {
  const weekStart = normalizePlannerDateKey(weekBeginning);
  const selectedWeekEnd = addDays(weekStart, 7);
  const today = todayUtcDate();

  if (item.actualDate) {
    return plannerOutcomeLabels.Completed;
  }

  if (item.status === 'Completed') {
    return plannerOutcomeLabels.Completed;
  }

  if (item.status === 'Deferred') {
    return plannerOutcomeLabels.Deferred;
  }

  if (item.status === 'Carry Over') {
    return plannerOutcomeLabels.CarryOver;
  }

  if (item.status === 'Not Completed') {
    return plannerOutcomeLabels.NotCompleted;
  }

  if (selectedWeekEnd <= today) {
    return plannerOutcomeLabels.NotCompleted;
  }

  return plannerOutcomeLabels.Planned;
}

function normalizePlannerDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const [, year, month, day] = match;

    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return todayUtcDate();
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function todayUtcDate() {
  const today = new Date();

  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

export function plannerDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function sortItems(items: WeeklyPlannerItem[]) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.plannedDate).getTime();
    const rightDate = new Date(right.plannedDate).getTime();

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    return left.process.localeCompare(right.process);
  });
}

function logicalPlannerItemKey(item: WeeklyPlannerItem) {
  const plannedDateKey = plannerDateKey(item.plannedDate);

  if (item.traineeProcessId) {
    return [item.activityType, item.traineeProcessId, plannedDateKey].join('|');
  }

  return [
    item.activityType,
    item.traineeName,
    item.process,
    plannedDateKey,
  ].join('|');
}

function plannerItemPriority(item: WeeklyPlannerItem) {
  const hasFinalOutcome =
    Boolean(item.actualDate) || finalPlannerStatuses.has(item.status);

  return (hasFinalOutcome ? 100 : 0) + (item.id > 0 ? 10 : 0);
}

export function dedupeWeeklyPlannerItems(items: WeeklyPlannerItem[]) {
  const dedupedItems = new Map<
    string,
    { item: WeeklyPlannerItem; priority: number; index: number }
  >();

  items.forEach((item, index) => {
    const key = logicalPlannerItemKey(item);
    const priority = plannerItemPriority(item);
    const current = dedupedItems.get(key);

    if (
      !current ||
      priority > current.priority ||
      (priority === current.priority && index < current.index)
    ) {
      dedupedItems.set(key, { item, priority, index });
    }
  });

  return Array.from(dedupedItems.values())
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.item);
}

export function buildWeeklyPlannerSummary(
  items: WeeklyPlannerItem[],
  weekBeginning: string,
): WeeklyPlannerSummary {
  return dedupeWeeklyPlannerItems(items).reduce<WeeklyPlannerSummary>(
    (counts, item) => {
      const status = deriveWeeklyPlannerStatus(item, weekBeginning);

      counts.totalPlanned += 1;

      if (status === 'Completed') {
        counts.completed += 1;
      } else if (status === 'Deferred') {
        counts.deferred += 1;
      } else if (status === 'Carry Over') {
        counts.carryOver += 1;
      } else if (status === 'Not Completed') {
        counts.notCompleted += 1;
      } else {
        counts.outstanding += 1;
      }

      return counts;
    },
    {
      totalPlanned: 0,
      completed: 0,
      deferred: 0,
      carryOver: 0,
      outstanding: 0,
      notCompleted: 0,
    },
  );
}

export function buildRefresherPlanningGroups(items: WeeklyPlannerItem[]) {
  const dateGroups = new Map<string, Map<string, WeeklyPlannerItem[]>>();

  dedupeWeeklyPlannerItems(items).forEach((item) => {
    const dateKey = plannerDateKey(item.plannedDate);
    const colleagueGroups = dateGroups.get(dateKey) ?? new Map();
    const colleagueItems = colleagueGroups.get(item.traineeName) ?? [];

    colleagueItems.push(item);
    colleagueGroups.set(item.traineeName, colleagueItems);
    dateGroups.set(dateKey, colleagueGroups);
  });

  return Array.from(dateGroups.entries()).map(
    ([dateKey, colleagueGroups]): RefresherPlanningGroup => ({
      dateKey,
      colleagues: Array.from(colleagueGroups.entries()).map(
        ([traineeName, colleagueItems]) => ({
          traineeName,
          items: sortItems(colleagueItems),
        }),
      ),
    }),
  );
}

export function buildLifecycleGroups(
  items: WeeklyPlannerItem[],
  weekBeginning: string,
): LifecycleGroups {
  const dedupedItems = dedupeWeeklyPlannerItems(items);
  const meetingDepartments = Array.from(
    new Set(
      dedupedItems.map((item) =>
        getWeeklyPlannerMeetingDepartment(item.department),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const mondayDepartments = meetingDepartments.map((department) => {
    const departmentItems = dedupedItems.filter(
      (item) =>
        getWeeklyPlannerMeetingDepartment(item.department) === department,
    );
    const summaryActivityCounts = supportedActivityTypes.reduce<
      Record<string, number>
    >((counts, activity) => ({ ...counts, [activity]: 0 }), {});

    departmentItems.forEach((item) => {
      summaryActivityCounts[item.activityType] =
        (summaryActivityCounts[item.activityType] ?? 0) + 1;
    });

    return {
      department,
      summary: {
        totalCount: departmentItems.length,
        completedCount: departmentItems.filter(
          (item) => deriveWeeklyPlannerStatus(item, weekBeginning) === 'Completed',
        ).length,
        activityCounts: summaryActivityCounts,
      },
      activityGroups: supportedActivityTypes.map((activity) => ({
        activity,
        items: sortItems(
          departmentItems.filter((item) => item.activityType === activity),
        ),
      })),
    };
  });

  const fridayDepartments = meetingDepartments.map((department) => {
    const departmentItems = dedupedItems.filter(
      (item) =>
        getWeeklyPlannerMeetingDepartment(item.department) === department,
    );
    const completedActivityCounts = supportedActivityTypes.reduce<
      Record<string, number>
    >((counts, activity) => ({ ...counts, [activity]: 0 }), {});

    departmentItems.forEach((item) => {
      if (deriveWeeklyPlannerStatus(item, weekBeginning) === 'Completed') {
        completedActivityCounts[item.activityType] =
          (completedActivityCounts[item.activityType] ?? 0) + 1;
      }
    });

    return {
      department,
      summary: {
        plannedCount: departmentItems.length,
        completedCount: departmentItems.filter(
          (item) => deriveWeeklyPlannerStatus(item, weekBeginning) === 'Completed',
        ).length,
        deferredCount: departmentItems.filter(
          (item) => deriveWeeklyPlannerStatus(item, weekBeginning) === 'Deferred',
        ).length,
        carryOverCount: departmentItems.filter(
          (item) => deriveWeeklyPlannerStatus(item, weekBeginning) === 'Carry Over',
        ).length,
        outstandingCount: departmentItems.filter(
          (item) => deriveWeeklyPlannerStatus(item, weekBeginning) === 'Planned',
        ).length,
        notCompletedCount: departmentItems.filter(
          (item) =>
            deriveWeeklyPlannerStatus(item, weekBeginning) === 'Not Completed',
        ).length,
      },
      completedActivityCounts,
      exceptions: [
        {
          label: 'Deferred',
          items: departmentItems.filter(
            (item) => deriveWeeklyPlannerStatus(item, weekBeginning) === 'Deferred',
          ),
        },
        {
          label: 'Carry Over',
          items: departmentItems.filter(
            (item) =>
              deriveWeeklyPlannerStatus(item, weekBeginning) === 'Carry Over',
          ),
        },
        {
          label: 'Not Completed',
          items: departmentItems.filter(
            (item) =>
              deriveWeeklyPlannerStatus(item, weekBeginning) === 'Not Completed',
          ),
        },
      ].filter((group) => group.items.length > 0),
    };
  });

  return { mondayDepartments, fridayDepartments };
}
