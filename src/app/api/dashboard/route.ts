import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const completedStatuses = ['Completed', 'Closed'];

export async function GET() {
  const now = new Date();
  const [
    activeTrainees,
    assignments,
    departmentNames,
    plannerHighlights,
    refreshers,
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

  const isCompetent = (assignment: (typeof assignments)[number]) =>
    assignment.status === 'Competent' ||
    assignment.status === 'Completed' ||
    assignment.stage === 'Competent';
  const requiresFollowUp = (assignment: (typeof assignments)[number]) =>
    (assignment.followUpFlag !== null &&
      assignment.followUpFlag !== 'NONE') ||
    assignment.followUpActions.length > 0;
  const readinessValues = assignments
    .map((assignment) => assignment.readinessScore)
    .filter((value): value is number => value !== null);

  const departmentSummary = departmentNames.map(({ name }) => {
    const departmentAssignments = assignments.filter(
      (assignment) => assignment.trainee.department.name === name,
    );

    return {
      name,
      active: departmentAssignments.filter(
        (assignment) => !isCompetent(assignment),
      ).length,
      competent: departmentAssignments.filter(isCompetent).length,
      chase: departmentAssignments.filter(
        (assignment) =>
          assignment.followUpFlag === 'CHASE' ||
          assignment.followUpActions.length > 0,
      ).length,
      ready: departmentAssignments.filter(
        (assignment) =>
          assignment.stage === 'Ready for Pre-Assessment' ||
          assignment.stage === 'Ready for Assessment',
      ).length,
    };
  });

  return NextResponse.json({
    metrics: {
      activeTrainees,
      activeProcessAssignments: assignments.filter(
        (assignment) => !isCompetent(assignment),
      ).length,
      competentProcesses: assignments.filter(isCompetent).length,
      followUpRequired: assignments.filter(requiresFollowUp).length,
      averageReadiness:
        readinessValues.length > 0
          ? Math.round(
              readinessValues.reduce((total, value) => total + value, 0) /
                readinessValues.length,
            )
          : 0,
      readyForPreAssessment: assignments.filter(
        (assignment) => assignment.stage === 'Ready for Pre-Assessment',
      ).length,
      readyForAssessment: assignments.filter(
        (assignment) => assignment.stage === 'Ready for Assessment',
      ).length,
      refreshersDue: refreshers.length,
      refreshersOverdue: refreshers.filter(
        (refresher) =>
          refresher.status === 'Overdue' ||
          (refresher.refresherDueDate !== null &&
            refresher.refresherDueDate < now),
      ).length,
    },
    urgentPipeline: assignments
      .filter(requiresFollowUp)
      .slice(0, 5)
      .map((assignment) => ({
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
    urgentRefreshers: refreshers.slice(0, 5),
  });
}
