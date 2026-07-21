import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';

type TrainingPipelineSummaryAssignment = {
  stage: string;
  status: string;
  readinessScore: number | null;
  followUpFlag: string | null;
};

export async function GET(request: Request) {
  const department = new URL(request.url).searchParams.get('department')?.trim();

  if (!department) {
    return NextResponse.json(
      { error: 'Department is required.' },
      { status: 400 },
    );
  }

  const [traineeTotal, assignments]: [
    number,
    TrainingPipelineSummaryAssignment[],
  ] = await prisma.$transaction([
    prisma.trainee.count({
      where: {
        archived: false,
        department: {
          name: department,
        },
      },
    }),
    prisma.traineeProcess.findMany({
      where: {
        assignmentStatus: activeAssignmentStatus,
        status: {
          not: 'Archived',
        },
        trainee: {
          archived: false,
          department: {
            name: department,
          },
        },
      },
      select: {
        stage: true,
        status: true,
        readinessScore: true,
        followUpFlag: true,
      },
    }),
  ]);

  const readinessValues = assignments
    .map((assignment: TrainingPipelineSummaryAssignment) => assignment.readinessScore)
    .filter((value: number | null): value is number => value !== null);

  return NextResponse.json({
    department,
    traineeTotal,
    processTotal: assignments.length,
    activeProcesses: assignments.filter(
      (assignment: TrainingPipelineSummaryAssignment) =>
        assignment.status !== 'Competent' &&
        assignment.stage !== 'Competent',
    ).length,
    competentProcesses: assignments.filter(
      (assignment: TrainingPipelineSummaryAssignment) =>
        assignment.status === 'Competent' ||
        assignment.stage === 'Competent',
    ).length,
    averageReadiness:
      readinessValues.length > 0
        ? Math.round(
            readinessValues.reduce(
              (total: number, value: number) => total + value,
              0,
            ) /
              readinessValues.length,
          )
        : 0,
    followUpRequired: assignments.filter(
      (assignment: TrainingPipelineSummaryAssignment) =>
        assignment.followUpFlag && assignment.followUpFlag !== 'NONE',
    ).length,
  });
}
