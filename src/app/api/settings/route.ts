import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [
    departments,
    processes,
    trainees,
    teamLeaders,
    trainingAssessors,
    trainingBuddies,
    settings,
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
    .map((trainee) => trainee.teamLeader)
    .filter((name): name is string => Boolean(name));
  const traineeAssessors = trainees
    .map((trainee) => trainee.trainingAssessor)
    .filter((name): name is string => Boolean(name));
  const settingValues = Object.fromEntries(
    settings.map((setting) => [setting.key, setting.value]),
  );

  return NextResponse.json({
    departments,
    processes: processes.map(({ department, ...process }) => ({
      ...process,
      departmentName: department.name,
    })),
    trainees: trainees.map(({ department, ...trainee }) => ({
      ...trainee,
      departmentName: department.name,
    })),
    teamLeaders: Array.from(
      new Set([
        ...teamLeaders.map((leader) => leader.name),
        ...traineeTeamLeaders,
      ]),
    ).sort((left, right) => left.localeCompare(right)),
    trainingAssessors: Array.from(
      new Set([
        ...trainingAssessors.map((assessor) => assessor.name),
        ...traineeAssessors,
      ]),
    ).sort((left, right) => left.localeCompare(right)),
    trainingBuddies: trainingBuddies.map((buddy) => buddy.name),
    settings: settingValues,
  });
}
