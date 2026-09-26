import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import {
  assessmentOutcomes,
  competencyOptions,
  followUpRequired,
  preAssessmentOutcomes,
  recordOutcomeForDatabase,
} from '@/lib/assessment-report';
import { upsertCompetencyRefresher } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

const validAssessmentTypes = ['Pre-Assessment', 'Assessment'] as const;
const validNextActions = [
  'Proceed to Assessment',
  'Continue Development',
  'Retraining Required',
  'Recommend Sign-Off',
] as const;

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
      assignmentStatus: activeAssignmentStatus,
      status: {
        not: 'Archived',
      },
    },
    select: {
      id: true,
      assignedAssessor: true,
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
    assignedAssessor: string | null;
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

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function cleanDate(value: unknown) {
  const text = String(value ?? '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T12:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function validCompetencyOutcome(value: unknown) {
  const text = String(value ?? '').trim();

  return competencyOptions.includes(
    text as (typeof competencyOptions)[number],
  )
    ? text
    : null;
}

export async function GET() {
  const [trainees, recordCount]: [AssessmentGeneratorTrainee[], number] =
    await prisma.$transaction([
      prisma.trainee.findMany({
        where: {
          archived: false,
          traineeProcesses: {
            some: {
              assignmentStatus: activeAssignmentStatus,
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
      prisma.assessmentRecord.count(),
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
            assignedAssessor: assignment.assignedAssessor,
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
  const assessmentOutcome = String(body.assessmentOutcome ?? '').trim();
  const nextAction = String(body.nextAction ?? '').trim();
  const assessor = String(body.assessor ?? '').trim();
  const assessmentDate = cleanDate(body.assessmentDate);
  const targetCompletionDate = body.targetCompletionDate
    ? cleanDate(body.targetCompletionDate)
    : null;

  const positiveObservations = cleanStringArray(body.positiveObservations);
  const gapsIdentified = cleanStringArray(body.gapsIdentified);
  const developmentActions = cleanStringArray(body.developmentActions);
  const assessmentSummary = String(body.assessmentSummary ?? '').trim();

  const competency = {
    safety: validCompetencyOutcome(body.competency?.safety),
    process: validCompetencyOutcome(body.competency?.process),
    quality: validCompetencyOutcome(body.competency?.quality),
    operational: validCompetencyOutcome(body.competency?.operational),
    behavioural: validCompetencyOutcome(body.competency?.behavioural),
  };

  if (
    !Number.isInteger(traineeId) ||
    traineeId <= 0 ||
    !Number.isInteger(traineeProcessId) ||
    traineeProcessId <= 0
  ) {
    return NextResponse.json(
      { error: 'A valid colleague and process assignment are required.' },
      { status: 400 },
    );
  }

  if (
    !validAssessmentTypes.includes(
      assessmentType as (typeof validAssessmentTypes)[number],
    )
  ) {
    return NextResponse.json(
      { error: 'Assessment type is invalid.' },
      { status: 400 },
    );
  }

  const validOutcomes =
    assessmentType === 'Pre-Assessment'
      ? preAssessmentOutcomes
      : assessmentOutcomes;

  if (!(validOutcomes as readonly string[]).includes(assessmentOutcome)) {
    return NextResponse.json(
      { error: 'Assessment outcome is invalid.' },
      { status: 400 },
    );
  }

  if (
    !validNextActions.includes(
      nextAction as (typeof validNextActions)[number],
    )
  ) {
    return NextResponse.json(
      { error: 'Next action is invalid.' },
      { status: 400 },
    );
  }

  if (
    !assessmentDate ||
    !competency.safety ||
    !competency.process ||
    !competency.quality ||
    !competency.operational ||
    !competency.behavioural ||
    !assessmentSummary
  ) {
    return NextResponse.json(
      { error: 'Complete all required assessment fields before finalising.' },
      { status: 400 },
    );
  }

  const assignment = await prisma.traineeProcess.findFirst({
    where: {
      id: traineeProcessId,
      traineeId,
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
      traineeId: true,
      assignedAssessor: true,
      trainee: {
        select: {
          name: true,
          teamLeader: true,
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
      { error: 'Process assignment not found for this colleague.' },
      { status: 404 },
    );
  }

  const resolvedAssessor =
    assessor ||
    assignment.assignedAssessor ||
    assignment.trainee.trainingAssessor ||
    'Training Assessor';

  const databaseOutcome = recordOutcomeForDatabase(
    assessmentType as 'Pre-Assessment' | 'Assessment',
    assessmentOutcome,
  );

  const requiresFollowUp = followUpRequired(
    assessmentType as 'Pre-Assessment' | 'Assessment',
    assessmentOutcome,
  );

  const competencyDescription = [
    `Safety: ${competency.safety}`,
    `Process: ${competency.process}`,
    `Quality: ${competency.quality}`,
    `Operational: ${competency.operational}`,
    `Behavioural: ${competency.behavioural}`,
  ].join('; ');

  const result = await prisma.$transaction(
    async (transaction: PrismaTransactionClient) => {
      const assessmentRecord = await transaction.assessmentRecord.create({
        data: {
          traineeProcessId: assignment.id,
          assessmentType,
          date: assessmentDate,
          department: assignment.trainee.department.name,
          traineeName: assignment.trainee.name,
          process: assignment.process.name,
          assessor: resolvedAssessor,
          outcome: databaseOutcome,
          strengths: positiveObservations.length
            ? positiveObservations.join('\n')
            : null,
          developmentAreas: gapsIdentified.length
            ? gapsIdentified.join('\n')
            : null,
          developmentActions: developmentActions.length
            ? developmentActions.join('\n')
            : null,
          finalOutcome: assessmentOutcome,
          followUpRequired: requiresFollowUp,
          followUpDate: targetCompletionDate,
        },
      });

      const timelineEvent = await transaction.timelineEvent.create({
        data: {
          traineeId: assignment.traineeId,
          traineeProcessId: assignment.id,
          process: assignment.process.name,
          eventType: 'Assessment completed',
          date: assessmentDate,
          description: [
            `${assessmentType} completed for ${assignment.process.name}: ${assessmentOutcome}.`,
            `Competency evaluation: ${competencyDescription}.`,
            `Next action: ${nextAction}.`,
            `Assessment summary: ${assessmentSummary}`,
          ].join(' '),
          user: resolvedAssessor,
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
                preAssessmentOutcome: databaseOutcome,
                nextAction,
              }
            : {
                assessmentDate,
                assessmentOutcome: databaseOutcome,
                nextAction,
                ...(databaseOutcome === 'Competent'
                  ? {
                      stage: 'Competent',
                      status: 'Competent',
                      competencySignOffDate: assessmentDate,
                    }
                  : {}),
              },
      });

      if (assessmentType === 'Assessment' && databaseOutcome === 'Competent') {
        await upsertCompetencyRefresher(transaction, {
          traineeProcessId: assignment.id,
          department: assignment.trainee.department.name,
          traineeName: assignment.trainee.name,
          process: assignment.process.name,
          competencySignOffDate: assessmentDate,
          assignedAssessor: resolvedAssessor,
        });
      }

      return {
        assessmentRecord,
        timelineEvent,
        trainee: {
          id: assignment.traineeId,
          name: assignment.trainee.name,
          departmentName: assignment.trainee.department.name,
          teamLeader: assignment.trainee.teamLeader,
        },
        process: {
          name: assignment.process.name,
        },
      };
    },
  );

  return NextResponse.json(result, { status: 201 });
}
