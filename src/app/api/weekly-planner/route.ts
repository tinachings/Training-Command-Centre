import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PlannerItemResponse = {
  id: number;
  weekCommencing: Date;
  plannedDate: Date;
  department: string;
  traineeName: string;
  process: string;
  activityType: string;
  owner: string | null;
  status: string;
  actualDate: Date | null;
  deviationReason: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  traineeProcessId: number | null;
};

type NewTrainingAssignment = {
  id: number;
  stage: string;
  status: string;
  trainingStartDate: Date | null;
  trainee: {
    name: string;
    trainingAssessor: string | null;
    department: {
      name: string;
    };
  };
  process: {
    name: string;
  };
};

type RefresherPlanningRecord = {
  id: number;
  traineeProcessId: number;
  department: string;
  traineeName: string;
  process: string;
  refresherDueDate: Date | null;
  scheduledRefresherDate: Date | null;
  status: string;
  scheduleStatus: string | null;
  assignedAssessor: string | null;
  completedDate: Date | null;
  traineeProcess: {
    trainee: {
      name: string;
      department: {
        name: string;
      };
    };
    process: {
      name: string;
    };
  };
};

type ScheduledAssessmentAssignment = {
  id: number;
  stage: string;
  status: string;
  scheduledPreAssessmentDate: Date | null;
  scheduledAssessmentDate: Date | null;
  preAssessmentDate: Date | null;
  assessmentDate: Date | null;
  assignedAssessor: string | null;
  trainee: {
    name: string;
    trainingAssessor: string | null;
    department: {
      name: string;
    };
  };
  process: {
    name: string;
  };
};

type ReviewStatus = 'Completed' | 'Deferred' | 'Not Completed' | 'Carry Over';

type ReviewBody = {
  id?: unknown;
  status?: unknown;
  actualDate?: unknown;
  deviationReason?: unknown;
  followUpRequired?: unknown;
  followUpDate?: unknown;
  weekCommencing?: unknown;
  plannedDate?: unknown;
  department?: unknown;
  traineeName?: unknown;
  process?: unknown;
  activityType?: unknown;
  owner?: unknown;
  traineeProcessId?: unknown;
};

type GeneratedPlannerSource = {
  weekCommencing: Date;
  plannedDate: Date;
  department: string;
  traineeName: string;
  process: string;
  activityType: string;
  owner: string | null;
  traineeProcessId: number | null;
};

type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const reviewStatuses = new Set<ReviewStatus>([
  'Completed',
  'Deferred',
  'Not Completed',
  'Carry Over',
]);

function parsePlannerItemId(value: unknown) {
  const id = Number(value);

  return Number.isInteger(id) && id !== 0 ? id : null;
}

function parseWeekBeginning(value: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setHours(0, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  date.setHours(0, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseRequiredDate(value: unknown) {
  const date = parseDateValue(value);

  return date instanceof Date ? date : null;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function optionalText(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const text = String(value ?? '').trim();

  return text || null;
}

function requiredText(value: unknown) {
  const text = String(value ?? '').trim();

  return text || null;
}

function optionalBoolean(value: unknown) {
  return value === undefined ? undefined : value === true;
}

function parseOptionalPositiveId(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function parseGeneratedPlannerSource(
  body: ReviewBody,
  traineeProcessId: number | null,
) {
  const weekCommencing = parseRequiredDate(body.weekCommencing);
  const plannedDate = parseRequiredDate(body.plannedDate);
  const department = requiredText(body.department);
  const traineeName = requiredText(body.traineeName);
  const process = requiredText(body.process);
  const activityType = requiredText(body.activityType);

  if (
    !weekCommencing ||
    !plannedDate ||
    !department ||
    !traineeName ||
    !process ||
    !activityType
  ) {
    return null;
  }

  return {
    weekCommencing,
    plannedDate,
    department,
    traineeName,
    process,
    activityType,
    owner: optionalText(body.owner) ?? null,
    traineeProcessId,
  };
}

export async function GET(request: Request) {
  const weekBeginning = parseWeekBeginning(
    new URL(request.url).searchParams.get('weekBeginning'),
  );

  if (!weekBeginning) {
    return NextResponse.json(
      { error: 'Week beginning is required.' },
      { status: 400 },
    );
  }

  const weekEnd = new Date(weekBeginning);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    plannerItems,
    newTrainingAssignments,
    refresherRecords,
    scheduledAssessmentAssignments,
  ]: [
    PlannerItemResponse[],
    NewTrainingAssignment[],
    RefresherPlanningRecord[],
    ScheduledAssessmentAssignment[],
  ] = await prisma.$transaction([
    prisma.weeklyPlannerItem.findMany({
      where: {
        plannedDate: {
          gte: weekBeginning,
          lt: weekEnd,
        },
        OR: [
          {
            traineeProcessId: null,
          },
          {
            traineeProcess: {
              status: {
                not: 'Archived',
              },
              trainee: {
                archived: false,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        weekCommencing: true,
        plannedDate: true,
        department: true,
        traineeName: true,
        process: true,
        activityType: true,
        owner: true,
        status: true,
        actualDate: true,
        deviationReason: true,
        followUpRequired: true,
        followUpDate: true,
        traineeProcessId: true,
      },
      orderBy: [
        {
          weekCommencing: 'desc',
        },
        {
          plannedDate: 'asc',
        },
      ],
    }),
    prisma.traineeProcess.findMany({
      where: {
        trainingStartDate: {
          gte: weekBeginning,
          lt: weekEnd,
        },
        status: {
          notIn: ['Archived', 'Completed', 'Competent'],
        },
        stage: {
          not: 'Competent',
        },
        trainee: {
          archived: false,
        },
      },
      select: {
        id: true,
        stage: true,
        status: true,
        trainingStartDate: true,
        trainee: {
          select: {
            name: true,
            trainingAssessor: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        process: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        trainingStartDate: 'asc',
      },
    }),
    prisma.refresherRecord.findMany({
      where: {
        scheduledRefresherDate: {
          gte: weekBeginning,
          lt: weekEnd,
        },
        traineeProcess: {
          status: {
            not: 'Archived',
          },
          trainee: {
            archived: false,
          },
        },
      },
      select: {
        id: true,
        traineeProcessId: true,
        department: true,
        traineeName: true,
        process: true,
        refresherDueDate: true,
        scheduledRefresherDate: true,
        status: true,
        scheduleStatus: true,
        assignedAssessor: true,
        completedDate: true,
        traineeProcess: {
          select: {
            trainee: {
              select: {
                name: true,
                department: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            process: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledRefresherDate: 'asc',
      },
    }),
    prisma.traineeProcess.findMany({
      where: {
        status: {
          not: 'Archived',
        },
        trainee: {
          archived: false,
        },
        OR: [
          {
            scheduledPreAssessmentDate: {
              gte: weekBeginning,
              lt: weekEnd,
            },
          },
          {
            scheduledAssessmentDate: {
              gte: weekBeginning,
              lt: weekEnd,
            },
          },
        ],
      },
      select: {
        id: true,
        stage: true,
        status: true,
        scheduledPreAssessmentDate: true,
        scheduledAssessmentDate: true,
        preAssessmentDate: true,
        assessmentDate: true,
        assignedAssessor: true,
        trainee: {
          select: {
            name: true,
            trainingAssessor: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        process: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  const plannedItemKey = (
    traineeName: string,
    process: string,
    plannedDate: Date,
  ) => `${traineeName}|${process}|${plannedDate.toISOString().slice(0, 10)}`;

  const isWithinSelectedWeek = (date: Date) =>
    date >= weekBeginning && date < weekEnd;

  const existingKeysForActivity = (activityType: string) =>
    new Set(
      plannerItems
        .filter(
          (item: PlannerItemResponse) => item.activityType === activityType,
        )
        .map((item: PlannerItemResponse) =>
          plannedItemKey(item.traineeName, item.process, item.plannedDate),
        ),
    );

  const existingNewTrainingKeys = existingKeysForActivity('New Training');
  const existingRefresherKeys = existingKeysForActivity('Refresher');
  const existingPreAssessmentKeys = existingKeysForActivity('Pre-Assessment');
  const existingAssessmentKeys = existingKeysForActivity('Assessment');

  const scheduledAssessmentStatus = (assignment: ScheduledAssessmentAssignment) =>
    assignment.stage === assignment.status
      ? assignment.status
      : `${assignment.stage} / ${assignment.status}`;

  const availableAssessor = (value: string | null) => {
    const assessor = value?.trim();

    return assessor && assessor.toLowerCase() !== 'null' ? assessor : null;
  };

  const scheduledAssessmentOwner = (
    assignment: ScheduledAssessmentAssignment,
  ) =>
    availableAssessor(assignment.assignedAssessor) ||
    availableAssessor(assignment.trainee.trainingAssessor) ||
    'Not Assigned';

  const newTrainingItems = newTrainingAssignments
    .filter(
      (
        assignment: NewTrainingAssignment,
      ): assignment is NewTrainingAssignment & { trainingStartDate: Date } =>
        assignment.trainingStartDate !== null,
    )
    .filter((assignment: NewTrainingAssignment & { trainingStartDate: Date }) => {
      const key = plannedItemKey(
        assignment.trainee.name,
        assignment.process.name,
        assignment.trainingStartDate,
      );
      return !existingNewTrainingKeys.has(key);
    })
    .map(
      (
        assignment: NewTrainingAssignment & { trainingStartDate: Date },
      ): PlannerItemResponse => ({
        id: -assignment.id,
        weekCommencing: weekBeginning,
        plannedDate: assignment.trainingStartDate,
        department: assignment.trainee.department.name,
        traineeName: assignment.trainee.name,
        process: assignment.process.name,
        activityType: 'New Training',
        owner: assignment.trainee.trainingAssessor,
        status:
          assignment.stage === assignment.status
            ? assignment.status
            : `${assignment.stage} / ${assignment.status}`,
        actualDate: null,
        deviationReason: null,
        followUpRequired: false,
        followUpDate: null,
        traineeProcessId: assignment.id,
      }),
    );

  const refresherItems = refresherRecords
    .filter(
      (
        refresher: RefresherPlanningRecord,
      ): refresher is RefresherPlanningRecord & {
        scheduledRefresherDate: Date;
      } => refresher.scheduledRefresherDate !== null,
    )
    .filter(
      (
        refresher: RefresherPlanningRecord & {
          scheduledRefresherDate: Date;
        },
      ) => {
        const traineeName =
          refresher.traineeProcess.trainee.name || refresher.traineeName;
        const processName =
          refresher.traineeProcess.process.name || refresher.process;
        const key = plannedItemKey(
          traineeName,
          processName,
          refresher.scheduledRefresherDate,
        );

        return !existingRefresherKeys.has(key);
      },
    )
    .map(
      (
        refresher: RefresherPlanningRecord & {
          scheduledRefresherDate: Date;
        },
      ): PlannerItemResponse => ({
        id: -(1000000 + refresher.id),
        weekCommencing: weekBeginning,
        plannedDate: refresher.scheduledRefresherDate,
        department:
          refresher.traineeProcess.trainee.department.name ||
          refresher.department,
        traineeName:
          refresher.traineeProcess.trainee.name || refresher.traineeName,
        process: refresher.traineeProcess.process.name || refresher.process,
        activityType: 'Refresher',
        owner: refresher.assignedAssessor,
        status: refresher.scheduleStatus ?? 'Scheduled',
        actualDate: refresher.completedDate,
        deviationReason: null,
        followUpRequired: false,
        followUpDate: null,
        traineeProcessId: refresher.traineeProcessId,
      }),
    );

  const preAssessmentItems = scheduledAssessmentAssignments
    .filter(
      (
        assignment: ScheduledAssessmentAssignment,
      ): assignment is ScheduledAssessmentAssignment & {
        scheduledPreAssessmentDate: Date;
      } =>
        assignment.scheduledPreAssessmentDate !== null &&
        isWithinSelectedWeek(assignment.scheduledPreAssessmentDate),
    )
    .filter(
      (
        assignment: ScheduledAssessmentAssignment & {
          scheduledPreAssessmentDate: Date;
        },
      ) => {
        const key = plannedItemKey(
          assignment.trainee.name,
          assignment.process.name,
          assignment.scheduledPreAssessmentDate,
        );

        return !existingPreAssessmentKeys.has(key);
      },
    )
    .map(
      (
        assignment: ScheduledAssessmentAssignment & {
          scheduledPreAssessmentDate: Date;
        },
      ): PlannerItemResponse => ({
        id: -(2000000 + assignment.id),
        weekCommencing: weekBeginning,
        plannedDate: assignment.scheduledPreAssessmentDate,
        department: assignment.trainee.department.name,
        traineeName: assignment.trainee.name,
        process: assignment.process.name,
        activityType: 'Pre-Assessment',
        owner: scheduledAssessmentOwner(assignment),
        status: scheduledAssessmentStatus(assignment),
        actualDate: assignment.preAssessmentDate,
        deviationReason: null,
        followUpRequired: false,
        followUpDate: null,
        traineeProcessId: assignment.id,
      }),
    );

  const assessmentItems = scheduledAssessmentAssignments
    .filter(
      (
        assignment: ScheduledAssessmentAssignment,
      ): assignment is ScheduledAssessmentAssignment & {
        scheduledAssessmentDate: Date;
      } =>
        assignment.scheduledAssessmentDate !== null &&
        isWithinSelectedWeek(assignment.scheduledAssessmentDate),
    )
    .filter(
      (
        assignment: ScheduledAssessmentAssignment & {
          scheduledAssessmentDate: Date;
        },
      ) => {
        const key = plannedItemKey(
          assignment.trainee.name,
          assignment.process.name,
          assignment.scheduledAssessmentDate,
        );

        return !existingAssessmentKeys.has(key);
      },
    )
    .map(
      (
        assignment: ScheduledAssessmentAssignment & {
          scheduledAssessmentDate: Date;
        },
      ): PlannerItemResponse => ({
        id: -(3000000 + assignment.id),
        weekCommencing: weekBeginning,
        plannedDate: assignment.scheduledAssessmentDate,
        department: assignment.trainee.department.name,
        traineeName: assignment.trainee.name,
        process: assignment.process.name,
        activityType: 'Assessment',
        owner: scheduledAssessmentOwner(assignment),
        status: scheduledAssessmentStatus(assignment),
        actualDate: assignment.assessmentDate,
        deviationReason: null,
        followUpRequired: false,
        followUpDate: null,
        traineeProcessId: assignment.id,
      }),
    );

  const combinedItems = [
    ...plannerItems,
    ...newTrainingItems,
    ...refresherItems,
    ...preAssessmentItems,
    ...assessmentItems,
  ].sort(
    (left: PlannerItemResponse, right: PlannerItemResponse) =>
      left.plannedDate.getTime() - right.plannedDate.getTime(),
  );

  return NextResponse.json(combinedItems);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as ReviewBody;
  const id = parsePlannerItemId(body.id);
  const status = String(body.status ?? '').trim() as ReviewStatus;

  if (!id) {
    return NextResponse.json(
      { error: 'Planner item id is required.' },
      { status: 400 },
    );
  }

  if (!reviewStatuses.has(status)) {
    return NextResponse.json(
      { error: 'Planner item review status is invalid.' },
      { status: 400 },
    );
  }

  const actualDate = parseDateValue(body.actualDate);
  const followUpDate = parseDateValue(body.followUpDate);

  if (actualDate === undefined && body.actualDate !== undefined) {
    return NextResponse.json(
      { error: 'Actual date is invalid.' },
      { status: 400 },
    );
  }

  if (followUpDate === undefined && body.followUpDate !== undefined) {
    return NextResponse.json(
      { error: 'Follow-up date is invalid.' },
      { status: 400 },
    );
  }

  const traineeProcessId = parseOptionalPositiveId(body.traineeProcessId);

  if (traineeProcessId === undefined) {
    return NextResponse.json(
      { error: 'Trainee process id is invalid.' },
      { status: 400 },
    );
  }

  const deviationReason = optionalText(body.deviationReason);
  const followUpRequired = optionalBoolean(body.followUpRequired);
  const reviewedActualDate =
    status === 'Completed' ? actualDate ?? todayDate() : actualDate;
  const generatedSource =
    id < 0 ? parseGeneratedPlannerSource(body, traineeProcessId) : null;

  if (id < 0 && !generatedSource) {
    return NextResponse.json(
      { error: 'Generated planner item source fields are required.' },
      { status: 400 },
    );
  }

  const reviewData = {
    status,
    ...(reviewedActualDate !== undefined
      ? { actualDate: reviewedActualDate }
      : {}),
    ...(deviationReason !== undefined ? { deviationReason } : {}),
    ...(followUpRequired !== undefined ? { followUpRequired } : {}),
    ...(followUpDate !== undefined ? { followUpDate } : {}),
  };

  const reviewedItem = await prisma.$transaction(async (transaction) => {
    const plannerItem =
      id > 0
        ? await transaction.weeklyPlannerItem.findUnique({
            where: {
              id,
            },
          })
        : null;

    if (id > 0 && !plannerItem) {
      return null;
    }

    const itemToReview =
      plannerItem ??
      (await createGeneratedPlannerItem(transaction, generatedSource));

    const updatedItem = await transaction.weeklyPlannerItem.update({
      where: {
        id: itemToReview.id,
      },
      data: reviewData,
    });

    if (status === 'Carry Over') {
      const nextWeekCommencing = addDays(updatedItem.weekCommencing, 7);
      const nextPlannedDate = addDays(updatedItem.plannedDate, 7);

      const existingCarryOver = await transaction.weeklyPlannerItem.findFirst({
        where: {
          traineeName: updatedItem.traineeName,
          process: updatedItem.process,
          activityType: updatedItem.activityType,
          plannedDate: nextPlannedDate,
        },
      });

      if (!existingCarryOver) {
        await transaction.weeklyPlannerItem.create({
          data: {
            weekCommencing: nextWeekCommencing,
            plannedDate: nextPlannedDate,
            department: updatedItem.department,
            traineeName: updatedItem.traineeName,
            process: updatedItem.process,
            activityType: updatedItem.activityType,
            owner: updatedItem.owner,
            status: 'Planned',
            actualDate: null,
            deviationReason: null,
            followUpRequired: false,
            followUpDate: null,
            traineeProcessId: updatedItem.traineeProcessId,
          },
        });
      }
    }

    return updatedItem;
  });

  if (!reviewedItem) {
    return NextResponse.json(
      { error: 'Planner item not found.' },
      { status: 404 },
    );
  }

  return NextResponse.json(reviewedItem);
}

async function createGeneratedPlannerItem(
  transaction: PrismaTransactionClient,
  source: GeneratedPlannerSource | null,
) {
  if (!source) {
    throw new Error('Generated planner item source fields are required.');
  }

  return transaction.weeklyPlannerItem.create({
    data: {
      weekCommencing: source.weekCommencing,
      plannedDate: source.plannedDate,
      department: source.department,
      traineeName: source.traineeName,
      process: source.process,
      activityType: source.activityType,
      owner: source.owner,
      status: 'Planned',
      actualDate: null,
      deviationReason: null,
      followUpRequired: false,
      followUpDate: null,
      traineeProcessId: source.traineeProcessId,
    },
  });
}
