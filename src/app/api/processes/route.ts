import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ProcessBody = {
  departmentId?: unknown;
  name?: unknown;
  recommendedTrainingHours?: unknown;
};

type PrismaKnownRequestErrorLike = {
  code?: unknown;
};

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseRecommendedHours(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return undefined;
  }

  const numericValue = Number(text);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined;
  }

  return text;
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
      active: true,
      recommendedTrainingHours: true,
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
      recommendedTrainingHours:
        process.recommendedTrainingHours?.toString() ?? null,
      departmentName: department.name,
    })),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProcessBody;
  const departmentId = parseId(body.departmentId);
  const name = String(body.name ?? '').trim();
  const recommendedTrainingHours = parseRecommendedHours(
    body.recommendedTrainingHours,
  );

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

  if (recommendedTrainingHours === undefined) {
    return NextResponse.json(
      {
        error:
          'Recommended training hours must be greater than zero with up to two decimal places.',
      },
      { status: 400 },
    );
  }

  try {
    const process = await prisma.process.create({
      data: {
        departmentId,
        name,
        recommendedTrainingHours,
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
        active: true,
        recommendedTrainingHours: true,
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
        active: process.active,
        recommendedTrainingHours:
          process.recommendedTrainingHours?.toString() ?? null,
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
