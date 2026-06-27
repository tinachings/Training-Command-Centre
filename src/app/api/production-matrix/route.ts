import { NextResponse } from 'next/server';
import { isCompetentProcess } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

type DisplayStatus = 'T' | 'I' | 'N';

type MatrixTotals = {
  trained: number;
  inTraining: number;
  notRequired: number;
  required: number;
  completionPercent: number;
  coveragePercent: number;
};

type MatrixAssignment = {
  id: number;
  traineeId: number;
  processId: number;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  competencySignOffDate: Date | null;
  assignedAssessor: string | null;
  refresherRecord: {
    refresherDueDate: Date | null;
  } | null;
};

type MatrixCell = {
  processId: number;
  displayStatus: DisplayStatus;
  traineeProcessId: number | null;
  stage: string | null;
  assignmentStatus: string | null;
  assessmentOutcome: string | null;
  competencySignOffDate: string | null;
  refresherDueDate: string | null;
  assignedAssessor: string | null;
};

function dateValue(value: Date | null) {
  return value ? value.toISOString() : null;
}

function statusForAssignment(assignment: MatrixAssignment | undefined) {
  if (!assignment) {
    return 'N' as const;
  }

  return isCompetentProcess(assignment) ? ('T' as const) : ('I' as const);
}

function emptyTotals(): MatrixTotals {
  return {
    trained: 0,
    inTraining: 0,
    notRequired: 0,
    required: 0,
    completionPercent: 0,
    coveragePercent: 0,
  };
}

function totalsForStatuses(statuses: DisplayStatus[]) {
  const totals = statuses.reduce((current, status) => {
    if (status === 'T') {
      current.trained += 1;
    } else if (status === 'I') {
      current.inTraining += 1;
    } else {
      current.notRequired += 1;
    }

    return current;
  }, emptyTotals());

  totals.required = totals.trained + totals.inTraining;
  totals.completionPercent =
    totals.required > 0
      ? Math.round((totals.trained / totals.required) * 100)
      : 0;
  totals.coveragePercent = totals.completionPercent;

  return totals;
}

function cellForProcess(
  processId: number,
  assignment: MatrixAssignment | undefined,
): MatrixCell {
  return {
    processId,
    displayStatus: statusForAssignment(assignment),
    traineeProcessId: assignment?.id ?? null,
    stage: assignment?.stage ?? null,
    assignmentStatus: assignment?.status ?? null,
    assessmentOutcome: assignment?.assessmentOutcome ?? null,
    competencySignOffDate: dateValue(assignment?.competencySignOffDate ?? null),
    refresherDueDate: dateValue(
      assignment?.refresherRecord?.refresherDueDate ?? null,
    ),
    assignedAssessor: assignment?.assignedAssessor ?? null,
  };
}

export async function GET() {
  const [departments, processes, colleagues, assignments] =
    await prisma.$transaction([
      prisma.department.findMany({
        where: {
          active: true,
        },
        select: {
          id: true,
          name: true,
          active: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.process.findMany({
        where: {
          active: true,
          department: {
            active: true,
          },
        },
        select: {
          id: true,
          name: true,
          departmentId: true,
          active: true,
        },
        orderBy: [
          {
            department: {
              name: 'asc',
            },
          },
          {
            name: 'asc',
          },
        ],
      }),
      prisma.trainee.findMany({
        where: {
          archived: false,
          department: {
            active: true,
          },
        },
        select: {
          id: true,
          name: true,
          shift: true,
          archived: true,
          departmentId: true,
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
            department: {
              active: true,
            },
          },
          process: {
            active: true,
            department: {
              active: true,
            },
          },
        },
        select: {
          id: true,
          traineeId: true,
          processId: true,
          stage: true,
          status: true,
          assessmentOutcome: true,
          competencySignOffDate: true,
          assignedAssessor: true,
          refresherRecord: {
            select: {
              refresherDueDate: true,
            },
          },
        },
      }),
    ]);

  const assignmentByTraineeAndProcess = new Map<string, MatrixAssignment>();

  assignments.forEach((assignment) => {
    assignmentByTraineeAndProcess.set(
      `${assignment.traineeId}:${assignment.processId}`,
      assignment,
    );
  });

  const matrixDepartments = departments.map((department) => {
    const departmentProcesses = processes.filter(
      (process) => process.departmentId === department.id,
    );
    const departmentColleagues = colleagues.filter(
      (colleague) => colleague.departmentId === department.id,
    );

    const rows = departmentColleagues.map((colleague) => {
      const cells = departmentProcesses.map((process) =>
        cellForProcess(
          process.id,
          assignmentByTraineeAndProcess.get(`${colleague.id}:${process.id}`),
        ),
      );

      return {
        id: colleague.id,
        name: colleague.name,
        shift: colleague.shift,
        archived: colleague.archived,
        departmentId: colleague.departmentId,
        cells,
        totals: totalsForStatuses(cells.map((cell) => cell.displayStatus)),
      };
    });

    const columnTotals = departmentProcesses.map((process) => ({
      processId: process.id,
      totals: totalsForStatuses(
        rows.map(
          (row) =>
            row.cells.find((cell) => cell.processId === process.id)
              ?.displayStatus ?? 'N',
        ),
      ),
    }));

    return {
      id: department.id,
      name: department.name,
      active: department.active,
      processes: departmentProcesses,
      colleagues: rows,
      columnTotals,
      totals: totalsForStatuses(
        rows.flatMap((row) => row.cells.map((cell) => cell.displayStatus)),
      ),
    };
  });

  return NextResponse.json({
    departments: matrixDepartments,
    processes,
    colleagues,
    totals: totalsForStatuses(
      matrixDepartments.flatMap((department) =>
        department.colleagues.flatMap((colleague) =>
          colleague.cells.map((cell) => cell.displayStatus),
        ),
      ),
    ),
  });
}
