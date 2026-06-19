import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ProcessBody = {
  departmentId?: unknown;
  name?: unknown;
};

type PrismaKnownRequestErrorLike = {
  code?: unknown;
};

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

export async function GET() {
  const processes = await prisma.process.findMany({
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
  });

  return NextResponse.json(
    processes.map(({ department, ...process }) => ({
      ...process,
      departmentName: department.name,
    })),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProcessBody;
  const departmentId = parseId(body.departmentId);
  const name = String(body.name ?? '').trim();

  if (!departmentId) {
    return NextResponse.json(
      { error: 'Department is required.' },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: 'Process name is required.' },
      { status: 400 },
    );
  }

  try {
    const process = await prisma.process.create({
      data: {
        departmentId,
        name,
      },
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
    });

    return NextResponse.json(
      {
        id: process.id,
        name: process.name,
        departmentId: process.departmentId,
        departmentName: process.department.name,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Process already exists for this department.' },
        { status: 409 },
      );
    }

    throw error;
  }
}
