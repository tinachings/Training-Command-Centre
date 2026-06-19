import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ColleagueRefresherRecord = {
  refresherDueDate: Date | null;
  status: string;
};

type ColleagueProcess = {
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  refresherRecord: ColleagueRefresherRecord | null;
};

type ColleagueListItem = {
  id: number;
  name: string;
  shift: string | null;
  archived: boolean;
  department: {
    name: string;
  };
  traineeProcesses: ColleagueProcess[];
};

function isCompetentProcess(process: ColleagueProcess) {
  return (
    process.status === 'Competent' ||
    process.stage === 'Competent' ||
    process.assessmentOutcome === 'Competent'
  );
}

function isRefresherDue(
  refresher: ColleagueRefresherRecord | null,
  dueSoonCutoff: Date,
) {
  return (
    refresher !== null &&
    refresher.status !== 'Completed' &&
    refresher.refresherDueDate !== null &&
    refresher.refresherDueDate <= dueSoonCutoff
  );
}

export async function GET() {
  const dueSoonCutoff = new Date();
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 30);

  const colleagues: ColleagueListItem[] = await prisma.trainee.findMany({
    include: {
      department: true,
      traineeProcesses: {
        where: {
          status: {
            not: 'Archived',
          },
        },
        select: {
          stage: true,
          status: true,
          assessmentOutcome: true,
          refresherRecord: {
            select: {
              refresherDueDate: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json(
    colleagues.map(({ traineeProcesses, ...colleague }: ColleagueListItem) => ({
      ...colleague,
      competentProcessCount: traineeProcesses.filter(isCompetentProcess).length,
      refreshersDueCount: traineeProcesses.filter(
        (process: ColleagueProcess) =>
          isRefresherDue(process.refresherRecord, dueSoonCutoff),
      ).length,
      status: colleague.archived ? 'Archived' : 'Active',
    })),
  );
}
