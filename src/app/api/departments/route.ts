import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const initialDepartments = [
  'Surfacing',
  'Coating',
  'Machine Setter - Production',
  'Machine Setter - Coating',
];

type DepartmentBody = {
  name?: unknown;
};

type PrismaKnownRequestErrorLike = {
  code?: unknown;
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

async function ensureInitialDepartments() {
  await Promise.all(
    initialDepartments.map((name) =>
      prisma.department.upsert({
        where: {
          name,
        },
        update: {},
        create: {
          name,
        },
      }),
    ),
  );
}

export async function GET() {
  await ensureInitialDepartments();

  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      active: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const body = (await request.json()) as DepartmentBody;
  const name = String(body.name ?? '').trim();

  if (!name) {
    return NextResponse.json(
      { error: 'Department name is required.' },
      { status: 400 },
    );
  }

  try {
    const department = await prisma.department.create({
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Department already exists.' },
        { status: 409 },
      );
    }

    throw error;
  }
}
