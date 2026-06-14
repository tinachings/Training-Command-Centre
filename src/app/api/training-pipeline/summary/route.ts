import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const department = new URL(request.url).searchParams.get('department')?.trim();

  if (!department) {
    return NextResponse.json(
      { error: 'Department is required.' },
      { status: 400 },
    );
  }

  const [traineeTotal, assignments] = await prisma.$transaction([
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
    .map((assignment) => assignment.readinessScore)
    .filter((value): value is number => value !== null);

  return NextResponse.json({
    department,
    traineeTotal,
    processTotal: assignments.length,
    activeProcesses: assignments.filter(
      (assignment) =>
        assignment.status !== 'Competent' &&
        assignment.stage !== 'Competent',
    ).length,
    competentProcesses: assignments.filter(
      (assignment) =>
        assignment.status === 'Competent' ||
        assignment.stage === 'Competent',
    ).length,
    averageReadiness:
      readinessValues.length > 0
        ? Math.round(
            readinessValues.reduce((total, value) => total + value, 0) /
              readinessValues.length,
          )
        : 0,
    followUpRequired: assignments.filter(
      (assignment) =>
        assignment.followUpFlag && assignment.followUpFlag !== 'NONE',
    ).length,
  });
}
