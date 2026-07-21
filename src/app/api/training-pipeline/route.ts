import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';
import { deriveTrainingHoursByAssignment } from '@/lib/training-hours';

type TrainingPipelineAssignment = {
  id: number;
  traineeId: number;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  readinessScore: number | null;
  recommendedTrainingHours: Date | null;
  trainingBuddy: string | null;
  trainingStartDate: Date | null;
  scheduledPreAssessmentDate: Date | null;
  scheduledAssessmentDate: Date | null;
  assignedAssessor: string | null;
  nextAction: string | null;
  followUpFlag: string | null;
  trainee: {
    name: string;
    trainingAssessor: string | null;
    department: {
      name: string;
    };
  };
  process: {
    name: string;
    recommendedTrainingHours: Date | null;
  };
};

type TrainingPipelineResponseItem = {
  traineeProcessId: number;
  traineeId: number;
  traineeName: string;
  departmentName: string;
  processName: string;
  stage: string;
  status: string;
  readiness: number | null;
  cumulativeLoggedHours: string;
  recommendedTrainingHours: string | null;
  checkInState: string;
  assessmentDisplay: string;
  trainingBuddy: string | null;
  trainingStartDate: Date | null;
  scheduledPreAssessmentDate: Date | null;
  scheduledAssessmentDate: Date | null;
  assignedAssessor: string | null;
  traineeTrainingAssessor: string | null;
  nextAction: string | null;
  followUpFlag: string | null;
  requiresAction: boolean;
};

function formatAssessmentDate(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(value);
}

function buildAssessmentDisplay(
  scheduledAssessmentDate: Date | null,
  scheduledPreAssessmentDate: Date | null,
) {
  if (scheduledAssessmentDate) {
    const formatted = formatAssessmentDate(scheduledAssessmentDate);
    return formatted ? `Assessment · ${formatted}` : 'Assessment';
  }

  if (scheduledPreAssessmentDate) {
    const formatted = formatAssessmentDate(scheduledPreAssessmentDate);
    return formatted ? `Pre-Assessment · ${formatted}` : 'Pre-Assessment';
  }

  return 'Not Scheduled';
}

function buildCheckInState(assignment: {
  requires50PercentCheckIn: boolean;
  requires90PercentCheckIn: boolean;
}) {
  if (assignment.requires90PercentCheckIn) {
    return 'Final Check-In Required';
  }

  if (assignment.requires50PercentCheckIn) {
    return '50% Check-In Required';
  }

  return 'Up to Date';
}

export async function GET(request: Request) {
  const department = new URL(request.url).searchParams.get('department')?.trim();
  const visibleStages = [
    'Requested',
    'Scheduled',
    'In Training',
    'Ready for Pre-Assessment',
    'Ready for Assessment',
  ];

  const [assignments, entries, checkIns] = await Promise.all([
    prisma.traineeProcess.findMany({
      where: {
        assignmentStatus: activeAssignmentStatus,
        stage: {
          in: visibleStages,
        },
        status: {
          notIn: ['Archived', 'Competent'],
        },
        OR: [
          { assessmentOutcome: null },
          {
            assessmentOutcome: {
              not: 'Competent',
            },
          },
        ],
        trainee: {
          archived: false,
          ...(department
            ? {
                department: {
                  name: department,
                },
              }
            : {}),
        },
      },
      select: {
        id: true,
        traineeId: true,
        stage: true,
        status: true,
        assessmentOutcome: true,
        readinessScore: true,
        recommendedTrainingHours: true,
        trainingBuddy: true,
        trainingStartDate: true,
        scheduledPreAssessmentDate: true,
        scheduledAssessmentDate: true,
        assignedAssessor: true,
        nextAction: true,
        followUpFlag: true,
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
            recommendedTrainingHours: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.trainingHoursEntry.findMany({
      where: {
        traineeProcessId: {
          in: [] as number[],
        },
      },
      select: {
        traineeProcessId: true,
        trainingDate: true,
        hours: true,
      },
    }),
    prisma.processCheckIn.findMany({
      where: {
        traineeProcessId: {
          in: [] as number[],
        },
      },
      select: {
        traineeProcessId: true,
        checkInDate: true,
      },
    }),
  ]);

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const [entriesForPipeline, checkInsForPipeline] = await Promise.all([
    prisma.trainingHoursEntry.findMany({
      where: {
        traineeProcessId: {
          in: assignmentIds,
        },
      },
      select: {
        traineeProcessId: true,
        trainingDate: true,
        hours: true,
      },
    }),
    prisma.processCheckIn.findMany({
      where: {
        traineeProcessId: {
          in: assignmentIds,
        },
      },
      select: {
        traineeProcessId: true,
        checkInDate: true,
      },
    }),
  ]);

  const derivedByAssignment = deriveTrainingHoursByAssignment(
    assignments.map((assignment) => ({
      id: assignment.id,
      stage: assignment.stage,
      status: assignment.status,
      assignmentStatus: activeAssignmentStatus,
      recommendedTrainingHours: assignment.recommendedTrainingHours,
      process: {
        recommendedTrainingHours: assignment.process.recommendedTrainingHours,
      },
    })),
    entriesForPipeline.map((entry) => ({
      traineeProcessId: entry.traineeProcessId,
      trainingDate: entry.trainingDate,
      hours: entry.hours,
    })),
    checkInsForPipeline.map((checkIn) => ({
      traineeProcessId: checkIn.traineeProcessId,
      checkInDate: checkIn.checkInDate,
    })),
  );

  const response: TrainingPipelineResponseItem[] = assignments.map(
    (assignment) => {
      const derived = derivedByAssignment.get(assignment.id);
      const checkInState = derived
        ? buildCheckInState(derived)
        : 'Up to Date';
      const requiresAction =
        checkInState !== 'Up to Date' ||
        Boolean(assignment.followUpFlag && assignment.followUpFlag !== 'NONE');

      return {
        traineeProcessId: assignment.id,
        traineeId: assignment.traineeId,
        traineeName: assignment.trainee.name,
        departmentName: assignment.trainee.department.name,
        processName: assignment.process.name,
        stage: assignment.stage,
        status: assignment.status,
        readiness: derived?.readinessScore ?? null,
        cumulativeLoggedHours: derived?.cumulativeLoggedHours ?? '0.00',
        recommendedTrainingHours: derived?.recommendedTrainingHours ?? null,
        checkInState,
        assessmentDisplay: buildAssessmentDisplay(
          assignment.scheduledAssessmentDate,
          assignment.scheduledPreAssessmentDate,
        ),
        trainingBuddy: assignment.trainingBuddy,
        trainingStartDate: assignment.trainingStartDate,
        scheduledPreAssessmentDate: assignment.scheduledPreAssessmentDate,
        scheduledAssessmentDate: assignment.scheduledAssessmentDate,
        assignedAssessor: assignment.assignedAssessor,
        traineeTrainingAssessor: assignment.trainee.trainingAssessor,
        nextAction: assignment.nextAction,
        followUpFlag: assignment.followUpFlag,
        requiresAction,
      } satisfies TrainingPipelineResponseItem;
    },
  );

  return NextResponse.json(response);
}
