import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const records = await prisma.assessmentRecord.findMany({
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
      assessmentType: true,
      date: true,
      department: true,
      traineeName: true,
      process: true,
      assessor: true,
      outcome: true,
      strengths: true,
      developmentAreas: true,
      developmentActions: true,
      finalOutcome: true,
      followUpRequired: true,
      followUpDate: true,
      traineeProcess: {
        select: {
          traineeId: true,
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
      },
    },
    orderBy: [
      {
        date: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  return NextResponse.json(
    records.map(({ traineeProcess, ...record }) => ({
      ...record,
      traineeId: traineeProcess.traineeId,
      traineeName: traineeProcess.trainee.name || record.traineeName,
      departmentName:
        traineeProcess.trainee.department.name || record.department,
      processName: traineeProcess.process.name || record.process,
    })),
  );
}
