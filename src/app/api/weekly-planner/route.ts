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
  status: string;
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
        refresherDueDate: {
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
        status: true,
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
        refresherDueDate: 'asc',
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
      ): refresher is RefresherPlanningRecord & { refresherDueDate: Date } =>
        refresher.refresherDueDate !== null,
    )
    .filter((refresher: RefresherPlanningRecord & { refresherDueDate: Date }) => {
      const traineeName =
        refresher.traineeProcess.trainee.name || refresher.traineeName;
      const processName = refresher.traineeProcess.process.name || refresher.process;
      const key = plannedItemKey(
        traineeName,
        processName,
        refresher.refresherDueDate,
      );

      return !existingRefresherKeys.has(key);
    })
    .map(
      (
        refresher: RefresherPlanningRecord & { refresherDueDate: Date },
      ): PlannerItemResponse => ({
        id: -(1000000 + refresher.id),
        weekCommencing: weekBeginning,
        plannedDate: refresher.refresherDueDate,
        department:
          refresher.traineeProcess.trainee.department.name ||
          refresher.department,
        traineeName:
          refresher.traineeProcess.trainee.name || refresher.traineeName,
        process: refresher.traineeProcess.process.name || refresher.process,
        activityType: 'Refresher',
        owner: refresher.assignedAssessor,
        status: refresher.status,
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
