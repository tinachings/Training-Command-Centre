import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const roleNames = [
  'Team Leader',
  'Shift Leader',
  'Training Assessor',
  'Training Buddy',
] as const;

type PeopleBody = {
  name?: unknown;
  roleIds?: unknown;
};

type PrismaKnownRequestErrorLike = {
  code?: unknown;
};

function cleanName(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const name = String(value).trim();

  return name && name.toLowerCase() !== 'null' ? name : null;
}

function cleanRoleIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

async function ensureRoles() {
  return Promise.all(
    roleNames.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
}

async function seedPeopleFromExistingData() {
  const roles = await ensureRoles();
  const roleByName = new Map(roles.map((role) => [role.name, role.id]));
  const [teamLeaders, trainingAssessors, trainingBuddies, trainees, assignments, assessments, checkIns, refreshers] =
    await prisma.$transaction([
      prisma.teamLeader.findMany({ select: { name: true } }),
      prisma.trainingAssessor.findMany({ select: { name: true } }),
      prisma.trainingBuddy.findMany({ select: { name: true } }),
      prisma.trainee.findMany({
        select: {
          teamLeader: true,
          shiftLeader: true,
          trainingAssessor: true,
        },
      }),
      prisma.traineeProcess.findMany({
        select: {
          trainingBuddy: true,
          assignedAssessor: true,
        },
      }),
      prisma.assessmentRecord.findMany({ select: { assessor: true } }),
      prisma.processCheckIn.findMany({ select: { assessor: true } }),
      prisma.refresherRecord.findMany({ select: { assignedAssessor: true } }),
    ]);

  const namesByRole = new Map<string, Set<string>>(
    roleNames.map((role) => [role, new Set<string>()]),
  );

  const addName = (role: (typeof roleNames)[number], value: unknown) => {
    const name = cleanName(value);
    if (name) {
      namesByRole.get(role)?.add(name);
    }
  };

  teamLeaders.forEach((item) => addName('Team Leader', item.name));
  trainingAssessors.forEach((item) =>
    addName('Training Assessor', item.name),
  );
  trainingBuddies.forEach((item) => addName('Training Buddy', item.name));
  trainees.forEach((item) => {
    addName('Team Leader', item.teamLeader);
    addName('Shift Leader', item.shiftLeader);
    addName('Training Assessor', item.trainingAssessor);
  });
  assignments.forEach((item) => {
    addName('Training Buddy', item.trainingBuddy);
    addName('Training Assessor', item.assignedAssessor);
  });
  assessments.forEach((item) => addName('Training Assessor', item.assessor));
  checkIns.forEach((item) => addName('Training Assessor', item.assessor));
  refreshers.forEach((item) =>
    addName('Training Assessor', item.assignedAssessor),
  );

  for (const [roleName, names] of namesByRole.entries()) {
    const roleId = roleByName.get(roleName);
    if (!roleId) {
      continue;
    }

    for (const name of names) {
      const person = await prisma.person.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      await prisma.personRole.upsert({
        where: {
          personId_roleId: {
            personId: person.id,
            roleId,
          },
        },
        update: {},
        create: {
          personId: person.id,
          roleId,
        },
      });
    }
  }
}

export async function GET() {
  await seedPeopleFromExistingData();

  const [people, roles] = await prisma.$transaction([
    prisma.person.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            role: {
              name: 'asc',
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  return NextResponse.json({
    people: people.map((person) => ({
      ...person,
      roles: person.roles.map((personRole) => personRole.role),
    })),
    roles,
  });
}

export async function POST(request: Request) {
  await ensureRoles();

  const body = (await request.json()) as PeopleBody;
  const name = cleanName(body.name);
  const roleIds = cleanRoleIds(body.roleIds);

  if (!name) {
    return NextResponse.json(
      { error: 'Person name is required.' },
      { status: 400 },
    );
  }

  const roles = roleIds.length
    ? await prisma.role.findMany({
        where: {
          id: {
            in: roleIds,
          },
        },
        select: {
          id: true,
        },
      })
    : [];

  if (roles.length !== roleIds.length) {
    return NextResponse.json(
      { error: 'One or more selected roles are invalid.' },
      { status: 400 },
    );
  }

  try {
    const person = await prisma.person.create({
      data: {
        name,
        roles: {
          create: roleIds.map((roleId) => ({
            role: {
              connect: { id: roleId },
            },
          })),
        },
      },
      select: {
        id: true,
        name: true,
        active: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...person,
        roles: person.roles.map((personRole) => personRole.role),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Person already exists.' },
        { status: 409 },
      );
    }

    throw error;
  }
}
