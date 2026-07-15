import { NextResponse } from 'next/server';
import { upsertCompetencyRefresher } from '@/lib/competency';
import { prisma } from '@/lib/prisma';
import { deriveTrainingHours } from '@/lib/training-hours';

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
      trainingHoursEntries: {
        orderBy: { trainingDate: 'asc' },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  const derived = deriveTrainingHours(
    assignment,
    assignment.trainingHoursEntries,
    assignment.checkIns,
  );

  return NextResponse.json({
    ...assignment,
    readinessScore: derived.readinessScore,
    cumulativeLoggedHours: derived.cumulativeLoggedHours,
    recommendedTrainingHours: derived.recommendedTrainingHours,
    requires50PercentCheckIn: derived.requires50PercentCheckIn,
    requires90PercentCheckIn: derived.requires90PercentCheckIn,
    fiftyPercentReachedDate: derived.fiftyPercentReachedDate,
    ninetyPercentReachedDate: derived.ninetyPercentReachedDate,
  });
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
      trainee: {
        include: {
          department: true,
        },
      },
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

  if (body.readinessScore !== undefined) {
    return NextResponse.json(
      { error: 'Readiness is calculated from logged training hours.' },
      { status: 400 },
    );
  }

  const preAssessmentDate = optionalDate(body.preAssessmentDate);
  const assessmentDate = optionalDate(body.assessmentDate);
  const requestedCompetencySignOffDate = optionalDate(
    body.competencySignOffDate,
  );

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
  const assessmentOutcome =
    body.assessmentOutcome === undefined
      ? undefined
      : String(body.assessmentOutcome).trim() || null;
  const isCompetent =
    stage === 'Competent' || assessmentOutcome === 'Competent';
  const competencySignOffDate =
    isCompetent
      ? requestedCompetencySignOffDate instanceof Date
        ? requestedCompetencySignOffDate
        : assignment.competencySignOffDate ?? new Date()
      : requestedCompetencySignOffDate;

  const updated = await prisma.$transaction(async (transaction) => {
    const traineeProcess = await transaction.traineeProcess.update({
      where: { id: assignment.id },
      data: {
        ...(stage !== undefined ? { stage } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(nextAction !== undefined ? { nextAction } : {}),
        ...(followUpFlag !== undefined ? { followUpFlag } : {}),
        ...(body.preAssessmentOutcome !== undefined
          ? {
              preAssessmentOutcome:
                String(body.preAssessmentOutcome).trim() || null,
            }
          : {}),
        ...(assessmentOutcome !== undefined ? { assessmentOutcome } : {}),
        ...(preAssessmentDate !== undefined ? { preAssessmentDate } : {}),
        ...(assessmentDate !== undefined ? { assessmentDate } : {}),
        ...(competencySignOffDate !== undefined
          ? {
              competencySignOffDate,
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

    if (isCompetent && competencySignOffDate instanceof Date) {
      await upsertCompetencyRefresher(transaction, {
        traineeProcessId: assignment.id,
        department: assignment.trainee.department.name,
        traineeName: assignment.trainee.name,
        process: assignment.process.name,
        competencySignOffDate,
        assignedAssessor: assignment.trainee.trainingAssessor,
      });
    }

    return traineeProcess;
  });

  return NextResponse.json(updated);
}
