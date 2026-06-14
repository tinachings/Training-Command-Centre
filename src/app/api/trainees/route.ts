import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const duplicateTraineeMessage = 'A trainee with this name, department and shift already exists.';

export async function GET() {
  const trainees = await prisma.trainee.findMany({
    include: {
      department: true,
      traineeProcesses: {
        select: {
          stage: true,
          status: true,
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
    trainees.map(({ traineeProcesses, ...trainee }) => ({
      ...trainee,
      activeProcessCount: traineeProcesses.filter(
        (process) =>
          process.status !== 'Competent' &&
          process.status !== 'Archived' &&
          process.stage !== 'Competent',
      ).length,
      competentProcessCount: traineeProcesses.filter(
        (process) =>
          process.status === 'Competent' || process.stage === 'Competent',
      ).length,
      followUpRequired: traineeProcesses.some(
        (process) =>
          (process.followUpFlag && process.followUpFlag !== 'NONE') ||
          process.followUpActions.some(
            (action) => action.status !== 'Completed' && action.status !== 'Closed',
          ),
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
