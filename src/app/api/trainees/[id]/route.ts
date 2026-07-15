import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deriveTrainingHoursByAssignment } from '@/lib/training-hours';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseTraineeId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseTraineeId(idParam);

  if (!id) {
    return NextResponse.json({ error: 'Invalid trainee id.' }, { status: 400 });
  }

  const trainee = await prisma.trainee.findUnique({
    where: { id },
    include: {
      department: true,
      traineeProcesses: {
        include: {
          process: true,
          assessmentRecords: {
            orderBy: { date: 'desc' },
          },
          weeklyPlannerItems: {
            orderBy: { plannedDate: 'desc' },
          },
          followUpActions: {
            orderBy: { createdAt: 'desc' },
          },
          refresherRecord: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      timelineEvents: {
        orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
      },
    },
  });

  if (!trainee) {
    return NextResponse.json({ error: 'Trainee not found.' }, { status: 404 });
  }

  const { timelineEvents, ...profile } = trainee;
  const traineeProcessIds = profile.traineeProcesses.map((process) => process.id);
  const [trainingHoursEntries, checkIns] =
    traineeProcessIds.length > 0
      ? await prisma.$transaction([
          prisma.trainingHoursEntry.findMany({
            where: {
              traineeProcessId: {
                in: traineeProcessIds,
              },
            },
            select: {
              traineeProcessId: true,
              trainingDate: true,
              hours: true,
            },
            orderBy: {
              trainingDate: 'asc',
            },
          }),
          prisma.processCheckIn.findMany({
            where: {
              traineeProcessId: {
                in: traineeProcessIds,
              },
            },
            select: {
              traineeProcessId: true,
              checkInDate: true,
            },
            orderBy: {
              checkInDate: 'asc',
            },
          }),
        ])
      : [[], []];
  const derivedByAssignment = deriveTrainingHoursByAssignment(
    profile.traineeProcesses,
    trainingHoursEntries,
    checkIns,
  );

  return NextResponse.json({
    ...profile,
    traineeProcesses: profile.traineeProcesses.map((process) => {
      const derived = derivedByAssignment.get(process.id);

      return {
        ...process,
        readinessScore: derived?.readinessScore ?? null,
        cumulativeLoggedHours: derived?.cumulativeLoggedHours ?? '0.00',
        recommendedTrainingHours: derived?.recommendedTrainingHours ?? null,
        requires50PercentCheckIn:
          derived?.requires50PercentCheckIn ?? false,
        requires90PercentCheckIn:
          derived?.requires90PercentCheckIn ?? false,
        fiftyPercentReachedDate: derived?.fiftyPercentReachedDate ?? null,
        ninetyPercentReachedDate: derived?.ninetyPercentReachedDate ?? null,
      };
    }),
    timeline: timelineEvents,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseTraineeId(idParam);

  if (!id) {
    return NextResponse.json({ error: 'Invalid trainee id.' }, { status: 400 });
  }

  const body = await request.json();
  const departmentName =
    body.department === undefined ? '' : String(body.department).trim();

  const department = departmentName
    ? await prisma.department.upsert({
        where: { name: departmentName },
        update: {},
        create: { name: departmentName },
      })
    : null;

  const trainee = await prisma.trainee.update({
    where: { id },
    data: {
      ...(body.name !== undefined
        ? { name: String(body.name).trim() }
        : {}),
      ...(department ? { departmentId: department.id } : {}),
      ...(body.teamLeader !== undefined
        ? { teamLeader: body.teamLeader || null }
        : {}),
      ...(body.shiftLeader !== undefined
        ? { shiftLeader: body.shiftLeader || null }
        : {}),
      ...(body.trainingAssessor !== undefined
        ? { trainingAssessor: body.trainingAssessor || null }
        : {}),
      ...(body.shift !== undefined ? { shift: body.shift || null } : {}),
      ...(body.startDate !== undefined
        ? { startDate: body.startDate ? new Date(body.startDate) : null }
        : {}),
      ...(body.archived !== undefined
        ? { archived: body.archived === true }
        : {}),
    },
    include: { department: true },
  });

  return NextResponse.json(trainee);
}
