import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { normalizeRefresherStatus } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

const completedFollowUpStatuses = ['Completed', 'Closed'];
const dueRefresherStatuses = ['Overdue', 'Due This Month', 'Due Next Month'];

type ReportDepartment = {
  name: string;
};

type ReportAssignment = {
  stage: string;
  status: string;
};

type ReportPlannerItem = {
  status: string;
};

type ReportRefresher = {
  status: string;
  refresherDueDate: Date | null;
};

type ReportAssessment = {
  assessmentType: string;
  outcome: string;
};

type ReportIdOnly = {
  id: number;
};

export async function GET(request: Request) {
  const department = new URL(request.url).searchParams.get('department')?.trim();
  const selectedDepartment =
    department && department !== 'All' ? department : null;
  const traineeDepartmentFilter = selectedDepartment
    ? {
        department: {
          name: selectedDepartment,
        },
      }
    : {};

  const [
    departments,
    traineeCount,
    assignments,
    plannerItems,
    refreshers,
    assessments,
    timelineEvents,
    followUpActions,
  ]: [
    ReportDepartment[],
    number,
    ReportAssignment[],
    ReportPlannerItem[],
    ReportRefresher[],
    ReportAssessment[],
    ReportIdOnly[],
    ReportIdOnly[],
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
    prisma.trainee.count({
      where: {
        archived: false,
        ...traineeDepartmentFilter,
      },
    }),
    prisma.traineeProcess.findMany({
      where: {
        assignmentStatus: activeAssignmentStatus,
        status: {
          not: 'Archived',
        },
        trainee: {
          archived: false,
          ...traineeDepartmentFilter,
        },
      },
      select: {
        stage: true,
        status: true,
      },
    }),
    prisma.weeklyPlannerItem.findMany({
      where: {
        ...(selectedDepartment ? { department: selectedDepartment } : {}),
        OR: [
          {
            traineeProcessId: null,
          },
          {
            traineeProcess: {
              assignmentStatus: activeAssignmentStatus,
              status: {
                not: 'Archived',
              },
              trainee: {
                archived: false,
                ...traineeDepartmentFilter,
              },
            },
          },
        ],
      },
      select: {
        status: true,
      },
    }),
    prisma.refresherRecord.findMany({
      where: {
        ...(selectedDepartment ? { department: selectedDepartment } : {}),
        traineeProcess: {
          assignmentStatus: activeAssignmentStatus,
          status: {
            not: 'Archived',
          },
          trainee: {
            archived: false,
            ...traineeDepartmentFilter,
          },
        },
      },
      select: {
        status: true,
        refresherDueDate: true,
      },
    }),
    prisma.assessmentRecord.findMany({
      where: {
        ...(selectedDepartment ? { department: selectedDepartment } : {}),
        traineeProcess: {
          assignmentStatus: activeAssignmentStatus,
          status: {
            not: 'Archived',
          },
          trainee: {
            archived: false,
            ...traineeDepartmentFilter,
          },
        },
      },
      select: {
        assessmentType: true,
        outcome: true,
      },
    }),
    prisma.timelineEvent.findMany({
      where: {
        trainee: {
          archived: false,
          ...traineeDepartmentFilter,
        },
        OR: [
          {
            traineeProcessId: null,
          },
          {
            traineeProcess: {
              assignmentStatus: activeAssignmentStatus,
              status: {
                not: 'Archived',
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    }),
    prisma.followUpAction.findMany({
      where: {
        status: {
          notIn: completedFollowUpStatuses,
        },
        traineeProcess: {
          assignmentStatus: activeAssignmentStatus,
          status: {
            not: 'Archived',
          },
          trainee: {
            archived: false,
            ...traineeDepartmentFilter,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  const isCompetent = (assignment: ReportAssignment) =>
    assignment.status === 'Competent' ||
    assignment.status === 'Completed' ||
    assignment.stage === 'Competent';
  const activeProcesses = assignments.filter(
    (assignment: ReportAssignment) => !isCompetent(assignment),
  ).length;
  const competentProcesses = assignments.filter(isCompetent).length;
  const normalizedRefreshers = refreshers.map((refresher: ReportRefresher) => ({
    ...refresher,
    status: normalizeRefresherStatus(
      refresher.status,
      refresher.refresherDueDate,
    ),
  }));

  const reports = [
    {
      title: 'Weekly Training Report',
      body: `Planned ${plannerItems.length}; Completed ${
        plannerItems.filter((item: ReportPlannerItem) => item.status === 'Completed').length
      }; Deferred ${
        plannerItems.filter((item: ReportPlannerItem) => item.status === 'Deferred').length
      }`,
    },
    {
      title: 'Department Team Leader Update',
      body: `Active items ${activeProcesses}; Competent items ${competentProcesses}; Refreshers due ${
        normalizedRefreshers.filter((item: ReportRefresher) =>
          dueRefresherStatuses.includes(item.status),
        ).length
      }; Open follow-ups ${followUpActions.length}`,
    },
    {
      title: 'Trainee Training Record',
      body: `Trainees ${traineeCount}; Active processes ${activeProcesses}; Competent processes ${competentProcesses}; Assessment records ${assessments.length}; Timeline events ${timelineEvents.length}`,
    },
    {
      title: 'Assessment Summary',
      body: `Pre-assessments ${
        assessments.filter(
          (item: ReportAssessment) => item.assessmentType === 'Pre-Assessment',
        ).length
      }; Assessments ${
        assessments.filter((item: ReportAssessment) => item.assessmentType === 'Assessment')
          .length
      }; Competent outcomes ${
        assessments.filter((item: ReportAssessment) => item.outcome === 'Competent').length
      }`,
    },
    {
      title: 'Refresher Summary',
      body: `Overdue ${
        normalizedRefreshers.filter(
          (item: ReportRefresher) => item.status === 'Overdue',
        ).length
      }; Due this month ${
        normalizedRefreshers.filter(
          (item: ReportRefresher) => item.status === 'Due This Month',
        ).length
      }; Completed ${
        normalizedRefreshers.filter(
          (item: ReportRefresher) => item.status === 'Completed',
        ).length
      }`,
    },
  ];

  return NextResponse.json({
    departments: departments.map((item: ReportDepartment) => item.name),
    selectedDepartment: selectedDepartment ?? 'All',
    reports,
  });
}
