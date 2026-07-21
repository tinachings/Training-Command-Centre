import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';

const duplicateTraineeMessage = 'A trainee with this name, department and shift already exists.';

type PrismaKnownRequestErrorLike = {
  code?: unknown;
};

type TraineeListFollowUpAction = {
  status: string;
};

type TraineeListProcess = {
  stage: string;
  status: string;
  assignmentStatus: string;
  followUpFlag: string | null;
  followUpActions: TraineeListFollowUpAction[];
};

type TraineeListItem = {
  traineeProcesses: TraineeListProcess[];
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

export async function GET() {
  const trainees: TraineeListItem[] = await prisma.trainee.findMany({
    include: {
      department: true,
      traineeProcesses: {
        select: {
          stage: true,
          status: true,
          assignmentStatus: true,
          followUpFlag: true,
          followUpActions: {
            select: {
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    trainees.map(({ traineeProcesses, ...trainee }: TraineeListItem) => ({
      ...trainee,
      activeProcessCount: traineeProcesses.filter(
        (process: TraineeListProcess) =>
          process.status !== 'Competent' &&
          process.status !== 'Archived' &&
          process.stage !== 'Competent' &&
          process.assignmentStatus === activeAssignmentStatus,
      ).length,
      competentProcessCount: traineeProcesses.filter(
        (process: TraineeListProcess) =>
          process.assignmentStatus === activeAssignmentStatus &&
          (process.status === 'Competent' || process.stage === 'Competent'),
      ).length,
      followUpRequired: traineeProcesses.some(
        (process: TraineeListProcess) =>
          process.assignmentStatus === activeAssignmentStatus &&
          (process.followUpFlag && process.followUpFlag !== 'NONE') ||
          (process.assignmentStatus === activeAssignmentStatus &&
            process.followUpActions.some(
              (action: TraineeListFollowUpAction) =>
                action.status !== 'Completed' && action.status !== 'Closed',
            )),
      ),
    })),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const shift = String(body.shift ?? '').trim() || null;

  const department = await prisma.department.upsert({
    where: { name: body.department },
    update: {},
    create: { name: body.department },
  });

  const duplicate = await prisma.trainee.findFirst({
    where: {
      name,
      departmentId: department.id,
      shift,
    },
  });

  if (duplicate) {
    return NextResponse.json(
      {
        error: duplicateTraineeMessage,
        message: duplicateTraineeMessage,
      },
      { status: 409 },
    );
  }

  try {
    const trainee = await prisma.trainee.create({
      data: {
        name,
        departmentId: department.id,
        teamLeader: body.teamLeader || null,
        shiftLeader: body.shiftLeader || null,
        trainingAssessor: body.trainingAssessor || null,
        shift,
        startDate: body.startDate ? new Date(body.startDate) : null,
        archived: false,
        timelineEvents: {
          create: {
            process: 'Trainee',
            eventType: 'Trainee created',
            description: `Created trainee record for ${name}.`,
            user: 'System',
          },
        },
      },
    });

    return NextResponse.json(trainee);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: duplicateTraineeMessage,
          message: duplicateTraineeMessage,
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
