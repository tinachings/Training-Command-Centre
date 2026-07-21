import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { normalizeRefresherStatus } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

const dueRefresherStatuses = ['Overdue', 'Due This Month', 'Due Next Month'];

type CompetencyProcess = {
  id: number;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  process: {
    name: string;
  };
  trainee: {
    name: string;
    department: {
      name: string;
    };
  };
};

type CompetencyTrainee = {
  id: number;
  department: {
    name: string;
  };
  traineeProcesses: Array<{
    stage: string;
    status: string;
    assessmentOutcome: string | null;
  }>;
};

type CompetencyRefresher = {
  id: number;
  traineeName: string;
  process: string;
  department: string;
  refresherDueDate: Date | null;
  status: string;
};

function isCompetentProcess(process: {
  stage: string;
  status: string;
  assessmentOutcome: string | null;
}) {
  return (
    process.status === 'Competent' ||
    process.stage === 'Competent' ||
    process.assessmentOutcome === 'Competent'
  );
}

function coveragePercent(competent: number, total: number) {
  return total > 0 ? Math.round((competent / total) * 100) : 0;
}

function dateValue(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function GET() {
  const [trainees, assignments, refreshers]: [
    CompetencyTrainee[],
    CompetencyProcess[],
    CompetencyRefresher[],
  ] = await prisma.$transaction([
    prisma.trainee.findMany({
      where: {
        archived: false,
      },
      select: {
        id: true,
        department: {
          select: {
            name: true,
          },
        },
        traineeProcesses: {
          where: {
            assignmentStatus: activeAssignmentStatus,
            status: {
              not: 'Archived',
            },
          },
          select: {
            stage: true,
            status: true,
            assessmentOutcome: true,
          },
        },
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
        },
      },
      select: {
        id: true,
        stage: true,
        status: true,
        assessmentOutcome: true,
        process: {
          select: {
            name: true,
          },
        },
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
      },
    }),
    prisma.refresherRecord.findMany({
      where: {
        traineeProcess: {
          assignmentStatus: activeAssignmentStatus,
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
        process: true,
        department: true,
        refresherDueDate: true,
        status: true,
      },
      orderBy: {
        refresherDueDate: 'asc',
      },
    }),
  ]);

  const competentAssignments = assignments.filter(isCompetentProcess);
  const inTrainingAssignments = assignments.filter(
    (assignment) => !isCompetentProcess(assignment),
  );
  const notYetCompetentAssignments = assignments.filter(
    (assignment) => assignment.assessmentOutcome === 'Not Yet Competent',
  );
  const normalizedRefreshers = refreshers.map((refresher) => ({
    ...refresher,
    status: normalizeRefresherStatus(
      refresher.status,
      refresher.refresherDueDate,
    ),
  }));

  const departmentNames = Array.from(
    new Set([
      ...trainees.map((trainee) => trainee.department.name),
      ...assignments.map((assignment) => assignment.trainee.department.name),
    ]),
  ).sort((left, right) => left.localeCompare(right));

  const departments = departmentNames.map((departmentName) => {
    const departmentTrainees = trainees.filter(
      (trainee) => trainee.department.name === departmentName,
    );
    const departmentAssignments = assignments.filter(
      (assignment) => assignment.trainee.department.name === departmentName,
    );
    const departmentCompetentAssignments =
      departmentAssignments.filter(isCompetentProcess);

    return {
      departmentName,
      activeColleagues: departmentTrainees.length,
      competentProcessAssignments: departmentCompetentAssignments.length,
      inTrainingProcessAssignments: departmentAssignments.filter(
        (assignment) => !isCompetentProcess(assignment),
      ).length,
      notYetCompetentProcessAssignments: departmentAssignments.filter(
        (assignment) => assignment.assessmentOutcome === 'Not Yet Competent',
      ).length,
      competencyCoverage: coveragePercent(
        departmentCompetentAssignments.length,
        departmentAssignments.length,
      ),
    };
  });

  const refresherAttentionItems = normalizedRefreshers
    .filter((refresher) =>
      ['Overdue', 'Due This Month'].includes(refresher.status),
    )
    .map((refresher) => ({
      id: `refresher-${refresher.id}`,
      type:
        refresher.status === 'Overdue'
          ? ('Overdue Refresher' as const)
          : ('Due This Month' as const),
      colleagueName: refresher.traineeName,
      departmentName: refresher.department,
      processName: refresher.process,
      dueDate: dateValue(refresher.refresherDueDate),
      status: refresher.status,
    }));

  const notYetCompetentAttentionItems = notYetCompetentAssignments.map(
    (assignment) => ({
      id: `not-yet-competent-${assignment.id}`,
      type: 'Not Yet Competent' as const,
      colleagueName: assignment.trainee.name,
      departmentName: assignment.trainee.department.name,
      processName: assignment.process.name,
      dueDate: null,
      status: assignment.assessmentOutcome ?? 'Not Yet Competent',
    }),
  );

  const attentionPriority = {
    'Overdue Refresher': 0,
    'Due This Month': 1,
    'Not Yet Competent': 2,
  };
  const attentionItems = [
    ...refresherAttentionItems,
    ...notYetCompetentAttentionItems,
  ].sort(
    (left, right) =>
      attentionPriority[left.type] - attentionPriority[right.type] ||
      left.departmentName.localeCompare(right.departmentName) ||
      left.colleagueName.localeCompare(right.colleagueName),
  );

  return NextResponse.json({
    summary: {
      totalActiveColleagues: trainees.length,
      competentColleagues: trainees.filter((trainee) =>
        trainee.traineeProcesses.some(isCompetentProcess),
      ).length,
      inTrainingColleagues: trainees.filter((trainee) =>
        trainee.traineeProcesses.some((process) => !isCompetentProcess(process)),
      ).length,
      notYetCompetentColleagues: trainees.filter((trainee) =>
        trainee.traineeProcesses.some(
          (process) => process.assessmentOutcome === 'Not Yet Competent',
        ),
      ).length,
      competencyCoverage: coveragePercent(
        competentAssignments.length,
        assignments.length,
      ),
    },
    refreshers: {
      overdue: normalizedRefreshers.filter(
        (refresher) => refresher.status === 'Overdue',
      ).length,
      dueThisMonth: normalizedRefreshers.filter(
        (refresher) => refresher.status === 'Due This Month',
      ).length,
      dueNextMonth: normalizedRefreshers.filter(
        (refresher) => refresher.status === 'Due Next Month',
      ).length,
    },
    departments,
    attentionItems,
    totals: {
      activeProcessAssignments: assignments.length,
      competentProcessAssignments: competentAssignments.length,
      inTrainingProcessAssignments: inTrainingAssignments.length,
      notYetCompetentProcessAssignments: notYetCompetentAssignments.length,
      dueRefreshers: normalizedRefreshers.filter((refresher) =>
        dueRefresherStatuses.includes(refresher.status),
      ).length,
    },
  });
}
