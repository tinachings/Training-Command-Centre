import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const completedStatuses = ['Completed', 'Closed'];

type TeamLeaderDepartment = {
  name: string;
};

type TeamLeaderFollowUpAction = {
  id: number;
  title: string;
  dueDate: Date | null;
  status: string;
};

type TeamLeaderTimelineEvent = {
  id: number;
  eventType: string;
  description: string;
  date: Date;
  createdAt: Date;
};

type TeamLeaderAssignment = {
  id: number;
  traineeId: number;
  stage: string;
  status: string;
  followUpFlag: string | null;
  nextAction: string | null;
  trainee: {
    name: string;
    department: {
      name: string;
    };
  };
  process: {
    name: string;
  };
  followUpActions: TeamLeaderFollowUpAction[];
  timelineEvents: TeamLeaderTimelineEvent[];
};

type TeamLeaderRefresher = {
  id: number;
  traineeName: string;
  process: string;
  status: string;
  refresherDueDate: Date | null;
};

export async function GET(request: Request) {
  const department = new URL(request.url).searchParams.get('department')?.trim();
  const departmentFilter =
    department && department !== 'All'
      ? {
          department: {
            name: department,
          },
        }
      : {};

  const [departments, assignments, refreshers]: [
    TeamLeaderDepartment[],
    TeamLeaderAssignment[],
    TeamLeaderRefresher[],
  ] = await prisma.$transaction([
    prisma.department.findMany({
      where: {
        trainees: {
          some: {
            archived: false,
          },
        },
      },
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.traineeProcess.findMany({
      where: {
        status: {
          not: 'Archived',
        },
        trainee: {
          archived: false,
          ...departmentFilter,
        },
      },
      select: {
        id: true,
        traineeId: true,
        stage: true,
        status: true,
        followUpFlag: true,
        nextAction: true,
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
            title: true,
            dueDate: true,
            status: true,
          },
          orderBy: {
            dueDate: 'asc',
          },
        },
        timelineEvents: {
          select: {
            id: true,
            eventType: true,
            description: true,
            date: true,
            createdAt: true,
          },
          orderBy: [
            {
              date: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
          take: 1,
        },
      },
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
            ...departmentFilter,
          },
        },
      },
      select: {
        id: true,
        traineeName: true,
        process: true,
        status: true,
        refresherDueDate: true,
      },
      orderBy: {
        refresherDueDate: 'asc',
      },
      take: 6,
    }),
  ]);

  const isOpen = (assignment: TeamLeaderAssignment) =>
    assignment.status !== 'Competent' &&
    assignment.status !== 'Completed' &&
    assignment.stage !== 'Competent';
  const requiresSupport = (assignment: TeamLeaderAssignment) =>
    assignment.stage === 'Retraining Required' ||
    (assignment.followUpFlag !== null &&
      assignment.followUpFlag !== 'NONE') ||
    assignment.followUpActions.length > 0;
  const latestActivityTime = (assignment: TeamLeaderAssignment) => {
    const event = assignment.timelineEvents[0];
    return event ? Math.max(event.date.getTime(), event.createdAt.getTime()) : 0;
  };
  const mapAssignment = (assignment: TeamLeaderAssignment) => ({
    traineeProcessId: assignment.id,
    traineeId: assignment.traineeId,
    traineeName: assignment.trainee.name,
    departmentName: assignment.trainee.department.name,
    processName: assignment.process.name,
    stage: assignment.stage,
    status: assignment.status,
    followUpFlag: assignment.followUpFlag,
    nextAction: assignment.nextAction,
    followUpActions: assignment.followUpActions,
    latestTimelineEvent: assignment.timelineEvents[0] ?? null,
  });

  const openAssignments = assignments.filter(isOpen);
  const readyForPreAssessment = assignments
    .filter(
      (assignment: TeamLeaderAssignment) =>
        assignment.stage === 'Ready for Pre-Assessment',
    )
    .map(mapAssignment);
  const readyForAssessment = assignments
    .filter(
      (assignment: TeamLeaderAssignment) =>
        assignment.stage === 'Ready for Assessment',
    )
    .map(mapAssignment);
  const retrainingRequired = assignments
    .filter(
      (assignment: TeamLeaderAssignment) =>
        assignment.stage === 'Retraining Required',
    )
    .map(mapAssignment);
  const supportItems = assignments
    .filter(requiresSupport)
    .sort(
      (left: TeamLeaderAssignment, right: TeamLeaderAssignment) =>
        latestActivityTime(right) - latestActivityTime(left),
    )
    .slice(0, 6)
    .map(mapAssignment);

  return NextResponse.json({
    departments: departments.map((item: TeamLeaderDepartment) => item.name),
    summary: {
      openItems: openAssignments.length,
      chaseItems: assignments.filter(
        (assignment: TeamLeaderAssignment) =>
          assignment.followUpFlag === 'CHASE' ||
          assignment.followUpActions.length > 0,
      ).length,
      readyForPreAssessment: readyForPreAssessment.length,
      readyForAssessment: readyForAssessment.length,
    },
    supportItems,
    refreshers,
    readyForPreAssessment,
    readyForAssessment,
    retrainingRequired,
  });
}
