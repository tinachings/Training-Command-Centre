import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
    processId: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function optionalDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!value) {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(_request: Request, context: RouteContext) {
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
      trainee: {
        include: {
          department: true,
        },
      },
      process: true,
      assessmentRecords: {
        orderBy: { date: 'desc' },
      },
      weeklyPlannerItems: {
        orderBy: { plannedDate: 'desc' },
      },
      followUpActions: {
        orderBy: { createdAt: 'desc' },
      },
      refresherRecord: true,
      timelineEvents: {
        orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
      },
      checkIns: {
        orderBy: [{ checkInDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  return NextResponse.json(assignment);
}

export async function PATCH(request: Request, context: RouteContext) {
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
      trainee: true,
      process: true,
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const readinessScore =
    body.readinessScore === undefined ? undefined : Number(body.readinessScore);

  if (
    readinessScore !== undefined &&
    (!Number.isFinite(readinessScore) ||
      readinessScore < 0 ||
      readinessScore > 100)
  ) {
    return NextResponse.json(
      { error: 'Readiness score must be between 0 and 100.' },
      { status: 400 },
    );
  }

  const stage =
    body.stage === undefined ? undefined : String(body.stage).trim();
  const nextAction =
    body.nextAction === undefined
      ? undefined
      : String(body.nextAction).trim() || null;
  const followUpFlag =
    body.followUpFlag === undefined
      ? undefined
      : String(body.followUpFlag).trim() || 'NONE';
  const status =
    stage === undefined
      ? undefined
      : stage === 'Competent'
        ? 'Competent'
        : 'Active';

  const updated = await prisma.traineeProcess.update({
    where: { id: assignment.id },
    data: {
      ...(stage !== undefined ? { stage } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(readinessScore !== undefined ? { readinessScore } : {}),
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...(followUpFlag !== undefined ? { followUpFlag } : {}),
      ...(body.preAssessmentOutcome !== undefined
        ? {
            preAssessmentOutcome:
              String(body.preAssessmentOutcome).trim() || null,
          }
        : {}),
      ...(body.assessmentOutcome !== undefined
        ? {
            assessmentOutcome: String(body.assessmentOutcome).trim() || null,
          }
        : {}),
      ...(optionalDate(body.preAssessmentDate) !== undefined
        ? { preAssessmentDate: optionalDate(body.preAssessmentDate) }
        : {}),
      ...(optionalDate(body.assessmentDate) !== undefined
        ? { assessmentDate: optionalDate(body.assessmentDate) }
        : {}),
      ...(optionalDate(body.competencySignOffDate) !== undefined
        ? {
            competencySignOffDate: optionalDate(body.competencySignOffDate),
          }
        : {}),
      timelineEvents: {
        create: {
          traineeId,
          process: assignment.process.name,
          eventType: 'Progress updated',
          description: `Progress updated for ${assignment.process.name}.`,
          user: String(body.user ?? '').trim() || 'Trainer',
        },
      },
    },
    include: {
      trainee: {
        include: {
          department: true,
        },
      },
      process: true,
      timelineEvents: {
        orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
      },
    },
  });

  return NextResponse.json(updated);
}
