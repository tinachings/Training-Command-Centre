import { NextResponse } from 'next/server';
import { activeAssignmentStatus, inactiveAssignmentMessage } from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
    processId: string;
  }>;
};

type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const traineeId = parseId(params.id);
  const processId = parseId(params.processId);

  if (!traineeId || !processId) {
    return NextResponse.json(
      { error: 'Invalid trainee or process id.' },
      { status: 400 },
    );
  }

  const assignment = await prisma.traineeProcess.findFirst({
    where: {
      id: processId,
      traineeId,
    },
    include: {
      process: true,
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  if (assignment.assignmentStatus !== activeAssignmentStatus) {
    return NextResponse.json(
      { error: inactiveAssignmentMessage() },
      { status: 409 },
    );
  }

  const body = await request.json();
  const assessor = String(body.assessor ?? '').trim();
  const progressSummary = String(body.progressSummary ?? '').trim();
  const checkInDate = new Date(String(body.checkInDate ?? ''));

  if (!assessor || !progressSummary || Number.isNaN(checkInDate.getTime())) {
    return NextResponse.json(
      {
        error:
          'Check-in date, assessor and progress summary are required.',
      },
      { status: 400 },
    );
  }

  const issuesIdentified =
    String(body.issuesIdentified ?? '').trim() || null;
  const supportRequired = String(body.supportRequired ?? '').trim() || null;
  const nextAction = String(body.nextAction ?? '').trim() || null;
  const reviewDate = body.reviewDate
    ? new Date(String(body.reviewDate))
    : null;

  if (reviewDate && Number.isNaN(reviewDate.getTime())) {
    return NextResponse.json(
      { error: 'Review date is invalid.' },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(
    async (transaction: PrismaTransactionClient) => {
      const checkIn = await transaction.processCheckIn.create({
        data: {
          traineeId,
          traineeProcessId: assignment.id,
          checkInDate,
          assessor,
          progressSummary,
          issuesIdentified,
          supportRequired,
          nextAction,
          reviewDate,
        },
      });

      const timelineEvent = await transaction.timelineEvent.create({
        data: {
          traineeId,
          traineeProcessId: assignment.id,
          process: assignment.process.name,
          eventType: 'Check-in added',
          date: checkInDate,
          description: `${assessor}: ${progressSummary}`,
          user: assessor,
        },
      });

      const updatedAssignment = await transaction.traineeProcess.update({
        where: { id: assignment.id },
        data: {
          lastCheckInDate: checkInDate,
          ...(nextAction ? { nextAction } : {}),
          ...(issuesIdentified ? { followUpFlag: 'CHASE' } : {}),
        },
        include: {
          process: true,
        },
      });

      return {
        assignment: updatedAssignment,
        checkIn,
        timelineEvent,
      };
    },
  );

  return NextResponse.json(result, { status: 201 });
}
