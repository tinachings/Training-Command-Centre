import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type TrainingPipelineAssignment = {
  id: number;
  traineeId: number;
  stage: string;
  status: string;
  readinessScore: number | null;
  trainingBuddy: string | null;
  trainingStartDate: Date | null;
  nextAction: string | null;
  followUpFlag: string | null;
  trainee: {
    name: string;
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

  const assignments: TrainingPipelineAssignment[] =
    await prisma.traineeProcess.findMany({
    where: {
      status: {
        not: 'Archived',
      },
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
      readinessScore: true,
      trainingBuddy: true,
      trainingStartDate: true,
      nextAction: true,
      followUpFlag: true,
      trainee: {
        select: {
          name: true,
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
      nextAction: assignment.nextAction,
      followUpFlag: assignment.followUpFlag,
    })),
  );
}
