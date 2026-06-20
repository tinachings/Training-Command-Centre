import { NextResponse } from 'next/server';
import { normalizeRefresherStatus } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

type ColleagueRefresherRecord = {
  refresherDueDate: Date | null;
  status: string;
};

type ColleagueProcess = {
  id: number;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  competencySignOffDate: Date | null;
  process: {
    name: string;
  };
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
  const refresherStatus = refresher
    ? normalizeRefresherStatus(refresher.status, refresher.refresherDueDate)
    : null;

  return (
    refresher !== null &&
    refresherStatus !== 'Completed' &&
    refresher.refresherDueDate !== null &&
    refresher.refresherDueDate <= dueSoonCutoff
  );
}

function dateValue(value: Date | null) {
  return value ? value.toISOString() : null;
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
          id: true,
          stage: true,
          status: true,
          assessmentOutcome: true,
          competencySignOffDate: true,
          process: {
            select: {
              name: true,
            },
          },
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
      competencies: traineeProcesses.map((process: ColleagueProcess) => ({
        traineeProcessId: process.id,
        processName: process.process.name,
        stage: process.stage,
        status: process.status,
        assessmentOutcome: process.assessmentOutcome,
        competencySignOffDate: dateValue(process.competencySignOffDate),
        refresherDueDate: dateValue(
          process.refresherRecord?.refresherDueDate ?? null,
        ),
        refresherStatus: process.refresherRecord
          ? normalizeRefresherStatus(
              process.refresherRecord.status,
              process.refresherRecord.refresherDueDate,
            )
          : null,
      })),
    })),
  );
}
