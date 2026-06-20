import { NextResponse } from 'next/server';
import { normalizeRefresherStatus } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

const completedStatuses = ['Completed', 'Closed'];
const dueRefresherStatuses = ['Overdue', 'Due This Month', 'Due Next Month'];

type DashboardAssignment = {
  id: number;
  traineeId: number;
  stage: string;
  status: string;
  readinessScore: number | null;
  nextAction: string | null;
  followUpFlag: string | null;
  trainee: {
    name: string;
    department: {
      name: string;
    };
  };
  process: {
    name: string;
  };
  followUpActions: Array<{
    id: number;
  }>;
};

type DashboardDepartment = {
  name: string;
};

type DashboardPlannerHighlight = {
  id: number;
  traineeName: string;
  activityType: string;
  status: string;
};

type DashboardRefresher = {
  id: number;
  traineeName: string;
  refresherDueDate: Date | null;
  status: string;
};

export async function GET() {
  const now = new Date();
  const [
    activeTrainees,
    assignments,
    departmentNames,
    plannerHighlights,
    refreshers,
  ]: [
    number,
    DashboardAssignment[],
    DashboardDepartment[],
    DashboardPlannerHighlight[],
    DashboardRefresher[],
  ] = await prisma.$transaction([
    prisma.trainee.count({
      where: {
        archived: false,
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
      },
      select: {
        id: true,
        traineeId: true,
        stage: true,
        status: true,
        readinessScore: true,
        nextAction: true,
        followUpFlag: true,
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
        followUpActions: {
          where: {
            status: {
              notIn: completedStatuses,
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.department.findMany({
      where: {
        OR: [
          {
            trainees: {
              some: {
                archived: false,
              },
            },
          },
          {
            processes: {
              some: {
                traineeProcesses: {
                  some: {
                    status: {
                      not: 'Archived',
                    },
                    trainee: {
                      archived: false,
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.weeklyPlannerItem.findMany({
      where: {
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
        traineeName: true,
        activityType: true,
        status: true,
      },
      orderBy: {
        plannedDate: 'asc',
      },
      take: 5,
    }),
    prisma.refresherRecord.findMany({
      where: {
        status: {
          not: 'Completed',
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
        traineeName: true,
        refresherDueDate: true,
        status: true,
      },
      orderBy: {
        refresherDueDate: 'asc',
      },
    }),
  ]);

  const isCompetent = (assignment: DashboardAssignment) =>
    assignment.status === 'Competent' ||
    assignment.status === 'Completed' ||
    assignment.stage === 'Competent';
  const requiresFollowUp = (assignment: DashboardAssignment) =>
    (assignment.followUpFlag !== null &&
      assignment.followUpFlag !== 'NONE') ||
    assignment.followUpActions.length > 0;
  const readinessValues = assignments
    .map((assignment: DashboardAssignment) => assignment.readinessScore)
    .filter((value: number | null): value is number => value !== null);
  const normalizedRefreshers = refreshers.map((refresher) => ({
    ...refresher,
    status: normalizeRefresherStatus(
      refresher.status,
      refresher.refresherDueDate,
      now,
    ),
  }));

  const departmentSummary = departmentNames.map(({ name }: DashboardDepartment) => {
    const departmentAssignments = assignments.filter(
      (assignment: DashboardAssignment) =>
        assignment.trainee.department.name === name,
    );

    return {
      name,
      active: departmentAssignments.filter(
        (assignment: DashboardAssignment) => !isCompetent(assignment),
      ).length,
      competent: departmentAssignments.filter(isCompetent).length,
      chase: departmentAssignments.filter(
        (assignment: DashboardAssignment) =>
          assignment.followUpFlag === 'CHASE' ||
          assignment.followUpActions.length > 0,
      ).length,
      ready: departmentAssignments.filter(
        (assignment: DashboardAssignment) =>
          assignment.stage === 'Ready for Pre-Assessment' ||
          assignment.stage === 'Ready for Assessment',
      ).length,
    };
  });

  return NextResponse.json({
    metrics: {
      activeTrainees,
      activeProcessAssignments: assignments.filter(
        (assignment: DashboardAssignment) => !isCompetent(assignment),
      ).length,
      competentProcesses: assignments.filter(isCompetent).length,
      followUpRequired: assignments.filter(requiresFollowUp).length,
      averageReadiness:
        readinessValues.length > 0
          ? Math.round(
              readinessValues.reduce(
                (total: number, value: number) => total + value,
                0,
              ) /
                readinessValues.length,
            )
          : 0,
      readyForPreAssessment: assignments.filter(
        (assignment: DashboardAssignment) =>
          assignment.stage === 'Ready for Pre-Assessment',
      ).length,
      readyForAssessment: assignments.filter(
        (assignment: DashboardAssignment) =>
          assignment.stage === 'Ready for Assessment',
      ).length,
      refreshersDue: normalizedRefreshers.filter(
        (refresher: DashboardRefresher) =>
          dueRefresherStatuses.includes(refresher.status),
      ).length,
      refreshersOverdue: normalizedRefreshers.filter(
        (refresher: DashboardRefresher) => refresher.status === 'Overdue',
      ).length,
    },
    urgentPipeline: assignments
      .filter(requiresFollowUp)
      .slice(0, 5)
      .map((assignment: DashboardAssignment) => ({
        traineeProcessId: assignment.id,
        traineeId: assignment.traineeId,
        traineeName: assignment.trainee.name,
        processName: assignment.process.name,
        departmentName: assignment.trainee.department.name,
        followUpFlag:
          assignment.followUpFlag === null ||
          assignment.followUpFlag === 'NONE'
            ? 'ACTION'
            : assignment.followUpFlag,
        nextAction: assignment.nextAction,
      })),
    departmentSummary,
    plannerHighlights,
    urgentRefreshers: normalizedRefreshers
      .filter((refresher: DashboardRefresher) =>
        dueRefresherStatuses.includes(refresher.status),
      )
      .slice(0, 5),
  });
}
