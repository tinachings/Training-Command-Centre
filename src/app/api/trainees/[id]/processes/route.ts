import { NextResponse } from 'next/server';
import { upsertCompetencyRefresher } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

const duplicateAssignmentMessage =
  'This trainee already has an active assignment for that process.';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseTraineeId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseProcessId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const traineeId = parseTraineeId(idParam);

  if (!traineeId) {
    return NextResponse.json({ error: 'Invalid trainee id.' }, { status: 400 });
  }

  const trainee = await prisma.trainee.findUnique({
    where: { id: traineeId },
    select: {
      departmentId: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!trainee) {
    return NextResponse.json({ error: 'Trainee not found.' }, { status: 404 });
  }

  const databaseProcesses = await prisma.process.findMany({
    where: {
      departmentId: trainee.departmentId,
    },
    select: {
      id: true,
      name: true,
      departmentId: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json(databaseProcesses);
}

export async function POST(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const traineeId = parseTraineeId(idParam);

  if (!traineeId) {
    return NextResponse.json({ error: 'Invalid trainee id.' }, { status: 400 });
  }

  const body = await request.json();
  const processId = parseProcessId(body.processId);
  const requestedBy = String(body.requestedBy ?? '').trim() || null;
  const alreadyCompetent = body.alreadyCompetent === true;
  const competencySignOffDate = parseOptionalDate(body.competencySignOffDate);

  if (!processId) {
    return NextResponse.json({ error: 'Process is required.' }, { status: 400 });
  }

  if (alreadyCompetent && competencySignOffDate === null) {
    return NextResponse.json(
      { error: 'Competency sign-off date is required.' },
      { status: 400 },
    );
  }

  if (alreadyCompetent && competencySignOffDate === undefined) {
    return NextResponse.json(
      { error: 'Competency sign-off date is invalid.' },
      { status: 400 },
    );
  }

  const trainee = await prisma.trainee.findUnique({
    where: { id: traineeId },
    include: {
      department: true,
    },
  });

  if (!trainee || trainee.archived) {
    return NextResponse.json({ error: 'Trainee not found.' }, { status: 404 });
  }

  const process = await prisma.process.findUnique({
    where: {
      id: processId,
    },
  });

  if (!process || process.departmentId !== trainee.departmentId) {
    return NextResponse.json(
      { error: 'Process not found for this trainee department.' },
      { status: 400 },
    );
  }

  const duplicate = await prisma.traineeProcess.findFirst({
    where: {
      traineeId,
      processId: process.id,
      status: {
        notIn: ['Completed', 'Archived'],
      },
    },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: duplicateAssignmentMessage },
      { status: 409 },
    );
  }

  const assignment = await prisma.$transaction(async (transaction) => {
    const created = await transaction.traineeProcess.create({
      data: {
        traineeId,
        processId: process.id,
        department: trainee.department.name,
        stage: alreadyCompetent
          ? 'Competent'
          : String(body.stage ?? '').trim() || 'Requested',
        status: alreadyCompetent ? 'Competent' : 'Active',
        nextAction: alreadyCompetent
          ? null
          : String(body.nextAction ?? '').trim() || null,
        followUpFlag: String(body.followUpFlag ?? '').trim() || 'NONE',
        trainingBuddy: String(body.trainingBuddy ?? '').trim() || null,
        trainingStartDate: body.trainingStartDate
          ? new Date(body.trainingStartDate)
          : null,
        requestedBy,
        riskAssessmentComplete: body.riskAssessmentComplete === true,
        sopComplete: body.sopComplete === true,
        buddyFeedbackScore: alreadyCompetent ? 5 : 3,
        assessorObservationScore: alreadyCompetent ? 5 : 3,
        timeSpentInShifts: alreadyCompetent ? 0 : 4,
        readinessScore: alreadyCompetent ? 100 : 55,
        assessmentOutcome: alreadyCompetent ? 'Competent' : 'In Progress',
        competencySignOffDate: alreadyCompetent
          ? competencySignOffDate
          : null,
        timelineEvents: {
          create: [
            {
              traineeId,
              process: process.name,
              eventType: 'Process assigned',
              description: `${trainee.name} assigned to ${process.name}.`,
              user: requestedBy || trainee.teamLeader || 'System',
            },
            ...(alreadyCompetent && competencySignOffDate
              ? [
                  {
                    traineeId,
                    process: process.name,
                    eventType: 'Competency sign-off recorded',
                    description: `${trainee.name} assigned to ${process.name} as already competent. Sign-off date: ${competencySignOffDate.toISOString().slice(0, 10)}.`,
                    user: requestedBy || trainee.teamLeader || 'System',
                  },
                ]
              : []),
          ],
        },
      },
      include: {
        process: true,
        timelineEvents: true,
      },
    });

    if (alreadyCompetent && competencySignOffDate) {
      await upsertCompetencyRefresher(transaction, {
        traineeProcessId: created.id,
        department: trainee.department.name,
        traineeName: trainee.name,
        process: process.name,
        competencySignOffDate,
        assignedAssessor: trainee.trainingAssessor,
      });
    }

    return created;
  });

  return NextResponse.json(assignment, { status: 201 });
}
