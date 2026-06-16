import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SettingsDepartment = {
  id: number;
  name: string;
};

type SettingsProcess = {
  department: {
    name: string;
  };
};

type SettingsTrainee = {
  teamLeader: string | null;
  trainingAssessor: string | null;
  department: {
    name: string;
  };
};

type SettingsName = {
  name: string;
};

type SettingsPair = {
  key: string;
  value: string;
};

export async function GET() {
  const [
    departments,
    processes,
    trainees,
    teamLeaders,
    trainingAssessors,
    trainingBuddies,
    settings,
  ]: [
    SettingsDepartment[],
    SettingsProcess[],
    SettingsTrainee[],
    SettingsName[],
    SettingsName[],
    SettingsName[],
    SettingsPair[],
  ] = await prisma.$transaction([
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.process.findMany({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          department: {
            name: 'asc',
          },
        },
        {
          name: 'asc',
        },
      ],
    }),
    prisma.trainee.findMany({
      where: {
        archived: false,
      },
      select: {
        id: true,
        name: true,
        teamLeader: true,
        trainingAssessor: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 10,
    }),
    prisma.teamLeader.findMany({
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.trainingAssessor.findMany({
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.trainingBuddy.findMany({
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.setting.findMany({
      select: {
        key: true,
        value: true,
      },
    }),
  ]);

  const traineeTeamLeaders = trainees
    .map((trainee: SettingsTrainee) => trainee.teamLeader)
    .filter((name: string | null): name is string => Boolean(name));
  const traineeAssessors = trainees
    .map((trainee: SettingsTrainee) => trainee.trainingAssessor)
    .filter((name: string | null): name is string => Boolean(name));
  const settingValues = Object.fromEntries(
    settings.map((setting: SettingsPair) => [setting.key, setting.value]),
  );

  return NextResponse.json({
    departments,
    processes: processes.map(({ department, ...process }: SettingsProcess) => ({
      ...process,
      departmentName: department.name,
    })),
    trainees: trainees.map(({ department, ...trainee }: SettingsTrainee) => ({
      ...trainee,
      departmentName: department.name,
    })),
    teamLeaders: Array.from(
      new Set([
        ...teamLeaders.map((leader: SettingsName) => leader.name),
        ...traineeTeamLeaders,
      ]),
    ).sort((left: string, right: string) => left.localeCompare(right)),
    trainingAssessors: Array.from(
      new Set([
        ...trainingAssessors.map((assessor: SettingsName) => assessor.name),
        ...traineeAssessors,
      ]),
    ).sort((left: string, right: string) => left.localeCompare(right)),
    trainingBuddies: trainingBuddies.map((buddy: SettingsName) => buddy.name),
    settings: settingValues,
  });
}
