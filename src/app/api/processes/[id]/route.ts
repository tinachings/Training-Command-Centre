import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProcessUpdateBody = {
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

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === code
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json({ error: 'Invalid process id.' }, { status: 400 });
  }

  const body = (await request.json()) as ProcessUpdateBody;
  const name = cleanName(body.name);
  const active =
    body.active === undefined ? undefined : body.active === true;

  if (name === null) {
    return NextResponse.json(
      { error: 'Process name is required.' },
      { status: 400 },
    );
  }

  try {
    const process = await prisma.process.update({
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
        departmentId: true,
        active: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: process.id,
      name: process.name,
      departmentId: process.departmentId,
      active: process.active,
      departmentName: process.department.name,
    });
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return NextResponse.json(
        { error: 'Process already exists for this department.' },
        { status: 409 },
      );
    }

    if (isPrismaError(error, 'P2025')) {
      return NextResponse.json(
        { error: 'Process not found.' },
        { status: 404 },
      );
    }

    throw error;
  }
}
