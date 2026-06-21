import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PeopleUpdateBody = {
  name?: unknown;
  active?: unknown;
  roleIds?: unknown;
};

type PrismaKnownRequestErrorLike = {
  code?: unknown;
};

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanName(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const name = String(value).trim();
  return name && name.toLowerCase() !== 'null' ? name : null;
}

function cleanRoleIds(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json({ error: 'Invalid person id.' }, { status: 400 });
  }

  const body = (await request.json()) as PeopleUpdateBody;
  const name = cleanName(body.name);
  const active =
    body.active === undefined ? undefined : body.active === true;
  const roleIds = cleanRoleIds(body.roleIds);

  if (name === null) {
    return NextResponse.json(
      { error: 'Person name is required.' },
      { status: 400 },
    );
  }

  if (roleIds === null) {
    return NextResponse.json(
      { error: 'Role ids must be an array.' },
      { status: 400 },
    );
  }

  const current = await prisma.person.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!current) {
    return NextResponse.json({ error: 'Person not found.' }, { status: 404 });
  }

  const roles =
    roleIds && roleIds.length
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

  if (roleIds && roles.length !== roleIds.length) {
    return NextResponse.json(
      { error: 'One or more selected roles are invalid.' },
      { status: 400 },
    );
  }

  try {
    const person = await prisma.person.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(roleIds !== undefined
          ? {
              roles: {
                deleteMany: {},
                create: roleIds.map((roleId) => ({
                  role: {
                    connect: {
                      id: roleId,
                    },
                  },
                })),
              },
            }
          : {}),
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
          orderBy: {
            role: {
              name: 'asc',
            },
          },
        },
      },
    });

    return NextResponse.json({
      ...person,
      roles: person.roles.map((personRole) => personRole.role),
    });
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
