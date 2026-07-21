import { NextResponse } from 'next/server';
import {
  addMonths,
  normalizeRefresherStatus,
  refresherStatusForDueDate,
} from '@/lib/competency';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';

type RefresherBody = {
  traineeProcessId?: unknown;
  refresherDueDate?: unknown;
  scheduledRefresherDate?: unknown;
  assignedAssessor?: unknown;
  status?: unknown;
};

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseOptionalDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeAssessor(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const assessor = String(value).trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : null;
}

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

export async function GET() {
  const refreshers = await prisma.refresherRecord.findMany({
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
      traineeProcessId: true,
      department: true,
      traineeName: true,
      process: true,
      lastCompetencyDate: true,
      refresherDueDate: true,
      scheduledRefresherDate: true,
      status: true,
      scheduleStatus: true,
      daysUntilDue: true,
      assignedAssessor: true,
      completedDate: true,
      outcome: true,
    },
    orderBy: [
      {
        refresherDueDate: 'asc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  return NextResponse.json(
    refreshers.map((refresher) => ({
      ...refresher,
      status: normalizeRefresherStatus(
        refresher.status,
        refresher.refresherDueDate,
      ),
    })),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as RefresherBody;
  const traineeProcessId = parseId(body.traineeProcessId);
  const scheduledDateInput =
    body.scheduledRefresherDate !== undefined
      ? body.scheduledRefresherDate
      : body.refresherDueDate;
  const scheduledRefresherDate = parseOptionalDate(scheduledDateInput);

  if (!traineeProcessId) {
    return NextResponse.json(
      { error: 'A valid trainee process id is required.' },
      { status: 400 },
    );
  }

  if (scheduledRefresherDate === undefined) {
    return NextResponse.json(
      { error: 'Scheduled refresher date is invalid.' },
      { status: 400 },
    );
  }

  if (scheduledRefresherDate === null) {
    return NextResponse.json(
      { error: 'Scheduled refresher date is required.' },
      { status: 400 },
    );
  }

  const assignment = await prisma.traineeProcess.findFirst({
    where: {
      id: traineeProcessId,
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
      department: true,
      stage: true,
      status: true,
      assessmentOutcome: true,
      competencySignOffDate: true,
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
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Training pipeline item not found.' },
      { status: 404 },
    );
  }

  if (!isCompetentProcess(assignment)) {
    return NextResponse.json(
      { error: 'Refreshers can only be scheduled for competent processes.' },
      { status: 400 },
    );
  }

  if (!assignment.competencySignOffDate) {
    return NextResponse.json(
      {
        error:
          'Competency sign-off date is required before scheduling a refresher.',
      },
      { status: 400 },
    );
  }

  const refresherDueDate = addMonths(assignment.competencySignOffDate, 12);
  const status = refresherStatusForDueDate(refresherDueDate);
  const assignedAssessor = normalizeAssessor(body.assignedAssessor);

  const refresher = await prisma.refresherRecord.upsert({
    where: {
      traineeProcessId: assignment.id,
    },
    update: {
      scheduledRefresherDate,
      assignedAssessor,
      scheduleStatus: 'Scheduled',
    },
    create: {
      traineeProcessId: assignment.id,
      department: assignment.department || assignment.trainee.department.name,
      traineeName: assignment.trainee.name,
      process: assignment.process.name,
      lastCompetencyDate: assignment.competencySignOffDate,
      refresherDueDate,
      scheduledRefresherDate,
      assignedAssessor,
      status,
      scheduleStatus: 'Scheduled',
    },
  });

  return NextResponse.json(refresher, { status: 201 });
}
