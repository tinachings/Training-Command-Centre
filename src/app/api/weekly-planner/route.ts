import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const plannerItems = await prisma.weeklyPlannerItem.findMany({
    where: {
      OR: [
        {
          traineeProcessId: null,
        },
        {
          traineeProcess: {
            status: {
              not: 'Archived',
            },
            trainee: {
              archived: false,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      weekCommencing: true,
      plannedDate: true,
      department: true,
      traineeName: true,
      process: true,
      activityType: true,
      owner: true,
      status: true,
      actualDate: true,
      deviationReason: true,
      followUpRequired: true,
      followUpDate: true,
      traineeProcessId: true,
    },
    orderBy: [
      {
        weekCommencing: 'desc',
      },
      {
        plannedDate: 'asc',
      },
    ],
  });

  return NextResponse.json(plannerItems);
}
