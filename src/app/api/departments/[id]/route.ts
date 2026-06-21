import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DepartmentUpdateBody = {
  name?: unknown;
  active?: unknown;
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

  const name = String(value ?? '').trim();
  return name || null;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

function isRecordNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === 'P2025'
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { error: 'Invalid department id.' },
      { status: 400 },
    );
  }

  const body = (await request.json()) as DepartmentUpdateBody;
  const name = cleanName(body.name);
  const active =
    body.active === undefined ? undefined : body.active === true;

  if (name === null) {
    return NextResponse.json(
      { error: 'Department name is required.' },
      { status: 400 },
    );
  }

  try {
    const department = await prisma.department.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Department already exists.' },
        { status: 409 },
      );
    }

    if (isRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: 'Department not found.' },
        { status: 404 },
      );
    }

    throw error;
  }
}
