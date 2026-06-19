import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    traineeProcessId: string;
  }>;
};

type SchedulingBody = {
  scheduledPreAssessmentDate?: unknown;
  scheduledAssessmentDate?: unknown;
  assignedAssessor?: unknown;
  user?: unknown;
};

type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const assessmentDateOrderError =
  'Assessment date cannot be earlier than pre-assessment date.';

function parseId(value: string) {
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

function sameDate(left: Date | null, right: Date | null | undefined) {
  if (right === undefined) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  return left.getTime() === right.getTime();
}

export async function PATCH(request: Request, context: RouteContext) {
  const { traineeProcessId: traineeProcessIdParam } = await context.params;
  const traineeProcessId = parseId(traineeProcessIdParam);

  if (!traineeProcessId) {
    return NextResponse.json(
      { error: 'Invalid trainee process id.' },
      { status: 400 },
    );
  }

  const body = (await request.json()) as SchedulingBody;
  const scheduledPreAssessmentDate = parseOptionalDate(
    body.scheduledPreAssessmentDate,
  );
  const scheduledAssessmentDate = parseOptionalDate(
    body.scheduledAssessmentDate,
  );

  if (
    body.scheduledPreAssessmentDate !== undefined &&
    scheduledPreAssessmentDate === undefined
  ) {
    return NextResponse.json(
      { error: 'Scheduled pre-assessment date is invalid.' },
      { status: 400 },
    );
  }

  if (
    body.scheduledAssessmentDate !== undefined &&
    scheduledAssessmentDate === undefined
  ) {
    return NextResponse.json(
      { error: 'Scheduled assessment date is invalid.' },
      { status: 400 },
    );
  }

  if (
    scheduledPreAssessmentDate instanceof Date &&
    scheduledAssessmentDate instanceof Date &&
    scheduledAssessmentDate < scheduledPreAssessmentDate
  ) {
    return NextResponse.json(
      { error: assessmentDateOrderError },
      { status: 400 },
    );
  }

  const assignedAssessor =
    body.assignedAssessor === undefined
      ? undefined
      : String(body.assignedAssessor).trim() || null;

  const current = await prisma.traineeProcess.findFirst({
    where: {
      id: traineeProcessId,
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
      scheduledPreAssessmentDate: true,
      scheduledAssessmentDate: true,
      trainee: {
        select: {
          name: true,
          trainingAssessor: true,
        },
      },
      process: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json(
      { error: 'Training pipeline item not found.' },
      { status: 404 },
    );
  }

  const preAssessmentChanged = !sameDate(
    current.scheduledPreAssessmentDate,
    scheduledPreAssessmentDate,
  );
  const assessmentChanged = !sameDate(
    current.scheduledAssessmentDate,
    scheduledAssessmentDate,
  );

  const user =
    String(body.user ?? '').trim() ||
    assignedAssessor ||
    current.trainee.trainingAssessor ||
    'System';

  const updated = await prisma.$transaction(
    async (transaction: PrismaTransactionClient) => {
      const assignment = await transaction.traineeProcess.update({
        where: {
          id: current.id,
        },
        data: {
          ...(scheduledPreAssessmentDate !== undefined
            ? { scheduledPreAssessmentDate }
            : {}),
          ...(scheduledAssessmentDate !== undefined
            ? { scheduledAssessmentDate }
            : {}),
          ...(assignedAssessor !== undefined ? { assignedAssessor } : {}),
        },
        include: {
          trainee: {
            include: {
              department: true,
            },
          },
          process: true,
        },
      });

      if (preAssessmentChanged && scheduledPreAssessmentDate) {
        await transaction.timelineEvent.create({
          data: {
            traineeId: current.traineeId,
            traineeProcessId: current.id,
            process: current.process.name,
            eventType: 'Pre-assessment scheduled',
            date: scheduledPreAssessmentDate,
            description: `Pre-assessment scheduled for ${current.process.name}.`,
            user,
          },
        });
      }

      if (assessmentChanged && scheduledAssessmentDate) {
        await transaction.timelineEvent.create({
          data: {
            traineeId: current.traineeId,
            traineeProcessId: current.id,
            process: current.process.name,
            eventType: 'Assessment scheduled',
            date: scheduledAssessmentDate,
            description: `Assessment scheduled for ${current.process.name}.`,
            user,
          },
        });
      }

      return assignment;
    },
  );

  return NextResponse.json(updated);
}
