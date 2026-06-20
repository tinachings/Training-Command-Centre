import { NextResponse } from 'next/server';
import { upsertCompetencyRefresher } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

const validAssessmentTypes = ['Pre-Assessment', 'Assessment'];
const validOutcomes = [
  'Pass',
  'Development Required',
  'Competent',
  'Not Yet Competent',
];

const assessmentGeneratorTraineeSelect = {
  id: true,
  name: true,
  teamLeader: true,
  trainingAssessor: true,
  department: {
    select: {
      name: true,
    },
  },
  traineeProcesses: {
    where: {
      status: {
        not: 'Archived',
      },
    },
    select: {
      id: true,
      process: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
} as const;

type AssessmentGeneratorTrainee = {
  id: number;
  name: string;
  teamLeader: string | null;
  trainingAssessor: string | null;
  department: {
    name: string;
  };
  traineeProcesses: Array<{
    id: number;
    process: {
      id: number;
      name: string;
    };
  }>;
};

type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function GET() {
  const [trainees, recordCount]: [AssessmentGeneratorTrainee[], number] =
    await prisma.$transaction([
    prisma.trainee.findMany({
      where: {
        archived: false,
        traineeProcesses: {
          some: {
            status: {
              not: 'Archived',
            },
          },
        },
      },
      select: assessmentGeneratorTraineeSelect,
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.assessmentRecord.count({
      where: {
        traineeProcess: {
          status: {
            not: 'Archived',
          },
          trainee: {
            archived: false,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    trainees: trainees.map(
      ({ traineeProcesses, ...trainee }: AssessmentGeneratorTrainee) => ({
        ...trainee,
        departmentName: trainee.department.name,
        assignments: traineeProcesses.map(
          (
            assignment: AssessmentGeneratorTrainee['traineeProcesses'][number],
          ) => ({
            traineeProcessId: assignment.id,
            processId: assignment.process.id,
            processName: assignment.process.name,
          }),
        ),
      }),
    ),
    recordCount,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const traineeId = Number(body.traineeId);
  const traineeProcessId = Number(body.traineeProcessId);
  const assessmentType = String(body.assessmentType ?? '').trim();
  const outcome = String(body.outcome ?? '').trim();
  const strengths = String(body.strengths ?? '').trim();
  const developmentAreas = String(body.developmentAreas ?? '').trim();

  if (
    !Number.isInteger(traineeId) ||
    traineeId <= 0 ||
    !Number.isInteger(traineeProcessId) ||
    traineeProcessId <= 0
  ) {
    return NextResponse.json(
      { error: 'A valid trainee and process assignment are required.' },
      { status: 400 },
    );
  }

  if (
    !validAssessmentTypes.includes(assessmentType) ||
    !validOutcomes.includes(outcome)
  ) {
    return NextResponse.json(
      { error: 'Assessment type or outcome is invalid.' },
      { status: 400 },
    );
  }

  const assignment = await prisma.traineeProcess.findFirst({
    where: {
      id: traineeProcessId,
      traineeId,
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
      trainee: {
        select: {
          name: true,
          trainingAssessor: true,
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
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  const assessmentDate = new Date();
  const assessor =
    String(body.assessor ?? '').trim() ||
    assignment.trainee.trainingAssessor ||
    'Trainer';
  const followUpRequired =
    outcome === 'Development Required' || outcome === 'Not Yet Competent';

  const result = await prisma.$transaction(async (transaction: PrismaTransactionClient) => {
    const assessmentRecord = await transaction.assessmentRecord.create({
      data: {
        traineeProcessId: assignment.id,
        assessmentType,
        date: assessmentDate,
        department: assignment.trainee.department.name,
        traineeName: assignment.trainee.name,
        process: assignment.process.name,
        assessor,
        outcome,
        strengths: strengths || null,
        developmentAreas: developmentAreas || null,
        developmentActions: followUpRequired
          ? 'Support development and monitor next week.'
          : null,
        finalOutcome: outcome,
        followUpRequired,
      },
    });

    const timelineEvent = await transaction.timelineEvent.create({
      data: {
        traineeId: assignment.traineeId,
        traineeProcessId: assignment.id,
        process: assignment.process.name,
        eventType: 'Assessment completed',
        date: assessmentDate,
        description: `${assessmentType} completed for ${assignment.process.name}: ${outcome}.`,
        user: assessor,
      },
    });

    await transaction.traineeProcess.update({
      where: {
        id: assignment.id,
      },
      data:
        assessmentType === 'Pre-Assessment'
          ? {
              preAssessmentDate: assessmentDate,
              preAssessmentOutcome: outcome,
            }
          : {
              assessmentDate,
              assessmentOutcome: outcome,
              ...(outcome === 'Competent'
                ? {
                    stage: 'Competent',
                    status: 'Competent',
                    competencySignOffDate: assessmentDate,
                  }
                : {}),
            },
    });

    if (assessmentType === 'Assessment' && outcome === 'Competent') {
      await upsertCompetencyRefresher(transaction, {
        traineeProcessId: assignment.id,
        department: assignment.trainee.department.name,
        traineeName: assignment.trainee.name,
        process: assignment.process.name,
        competencySignOffDate: assessmentDate,
        assignedAssessor: assignment.trainee.trainingAssessor,
      });
    }

    return {
      assessmentRecord,
      timelineEvent,
      trainee: {
        id: assignment.traineeId,
        name: assignment.trainee.name,
        departmentName: assignment.trainee.department.name,
      },
      process: {
        name: assignment.process.name,
      },
    };
  });

  return NextResponse.json(result, { status: 201 });
}
