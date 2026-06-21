import { NextResponse } from 'next/server';
import { normalizeRefresherStatus } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

type ColleagueRefresherRecord = {
  id: number;
  refresherDueDate: Date | null;
  status: string;
};

type ColleagueProcess = {
  id: number;
  stage: string;
  status: string;
  assessmentOutcome: string | null;
  competencySignOffDate: Date | null;
  scheduledPreAssessmentDate: Date | null;
  scheduledAssessmentDate: Date | null;
  assignedAssessor: string | null;
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
  trainingAssessor: string | null;
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

function hasCompetencySignOff(process: ColleagueProcess) {
  return isCompetentProcess(process) && process.competencySignOffDate !== null;
}

function isRefresherDue(
  process: ColleagueProcess,
  dueSoonCutoff: Date,
) {
  if (!hasCompetencySignOff(process)) {
    return false;
  }

  const refresher = process.refresherRecord;
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
          scheduledPreAssessmentDate: true,
          scheduledAssessmentDate: true,
          assignedAssessor: true,
          process: {
            select: {
              name: true,
            },
          },
          refresherRecord: {
            select: {
              id: true,
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
        (process: ColleagueProcess) => isRefresherDue(process, dueSoonCutoff),
      ).length,
      status: colleague.archived ? 'Archived' : 'Active',
      competencies: traineeProcesses.map((process: ColleagueProcess) => {
        const signedOffCompetent = hasCompetencySignOff(process);

        return {
          traineeProcessId: process.id,
          refresherRecordId: signedOffCompetent
            ? process.refresherRecord?.id ?? null
            : null,
          processName: process.process.name,
          stage: process.stage,
          status: process.status,
          assessmentOutcome: process.assessmentOutcome,
          assignedAssessor: process.assignedAssessor,
          traineeTrainingAssessor: colleague.trainingAssessor,
          competencySignOffDate: dateValue(process.competencySignOffDate),
          scheduledPreAssessmentDate: dateValue(
            process.scheduledPreAssessmentDate,
          ),
          scheduledAssessmentDate: dateValue(process.scheduledAssessmentDate),
          refresherDueDate: signedOffCompetent
            ? dateValue(process.refresherRecord?.refresherDueDate ?? null)
            : null,
          refresherStatus:
            signedOffCompetent && process.refresherRecord
              ? normalizeRefresherStatus(
                  process.refresherRecord.status,
                  process.refresherRecord.refresherDueDate,
                )
              : null,
        };
      }),
    })),
  );
}
