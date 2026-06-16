import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AssessmentRecordQueryResult = {
  id: number;
  traineeProcessId: number;
  assessmentType: string;
  date: Date;
  department: string;
  traineeName: string;
  process: string;
  assessor: string;
  outcome: string;
  strengths: string | null;
  developmentAreas: string | null;
  developmentActions: string | null;
  finalOutcome: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  traineeProcess: {
    traineeId: number;
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
};

export async function GET() {
  const records: AssessmentRecordQueryResult[] =
    await prisma.assessmentRecord.findMany({
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
    records.map(({ traineeProcess, ...record }: AssessmentRecordQueryResult) => ({
      ...record,
      traineeId: traineeProcess.traineeId,
      traineeName: traineeProcess.trainee.name || record.traineeName,
      departmentName:
        traineeProcess.trainee.department.name || record.department,
      processName: traineeProcess.process.name || record.process,
    })),
  );
}
