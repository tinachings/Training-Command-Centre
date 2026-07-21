import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';

type TrainingPipelineAssignment = {
  id: number;
  traineeId: number;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  readinessScore: number | null;
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
  };
};

export async function GET(request: Request) {
  const department = new URL(request.url).searchParams.get('department')?.trim();
  const visibleStages = [
    'Requested',
    'Scheduled',
    'In Training',
    'Ready for Pre-Assessment',
    'Ready for Assessment',
  ];

  const assignments: TrainingPipelineAssignment[] =
    await prisma.traineeProcess.findMany({
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
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(
    assignments.map((assignment: TrainingPipelineAssignment) => ({
      traineeProcessId: assignment.id,
      traineeId: assignment.traineeId,
      traineeName: assignment.trainee.name,
      departmentName: assignment.trainee.department.name,
      processName: assignment.process.name,
      stage: assignment.stage,
      status: assignment.status,
      readiness: assignment.readinessScore,
      trainingBuddy: assignment.trainingBuddy,
      trainingStartDate: assignment.trainingStartDate,
      scheduledPreAssessmentDate: assignment.scheduledPreAssessmentDate,
      scheduledAssessmentDate: assignment.scheduledAssessmentDate,
      assignedAssessor: assignment.assignedAssessor,
      traineeTrainingAssessor: assignment.trainee.trainingAssessor,
      nextAction: assignment.nextAction,
      followUpFlag: assignment.followUpFlag,
    })),
  );
}
