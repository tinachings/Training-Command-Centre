import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const refreshers = await prisma.refresherRecord.findMany({
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
    select: {
      id: true,
      traineeProcessId: true,
      department: true,
      traineeName: true,
      process: true,
      lastCompetencyDate: true,
      refresherDueDate: true,
      status: true,
      daysUntilDue: true,
      assignedAssessor: true,
      completedDate: true,
      outcome: true,
    },
    orderBy: [
      {
        refresherDueDate: 'asc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  return NextResponse.json(refreshers);
}
