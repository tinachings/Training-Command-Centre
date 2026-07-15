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
  recommendedTrainingHours?: unknown;
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

function parseRecommendedHours(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return false;
  }

  const numericValue = Number(text);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return false;
  }

  return text;
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
  const recommendedTrainingHours = parseRecommendedHours(
    body.recommendedTrainingHours,
  );

  if (name === null) {
    return NextResponse.json(
      { error: 'Process name is required.' },
      { status: 400 },
    );
  }

  if (recommendedTrainingHours === false) {
    return NextResponse.json(
      {
        error:
          'Recommended training hours must be greater than zero with up to two decimal places.',
      },
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
        ...(recommendedTrainingHours !== undefined
          ? { recommendedTrainingHours }
          : {}),
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

    return NextResponse.json({
      id: process.id,
      name: process.name,
      departmentId: process.departmentId,
      active: process.active,
      recommendedTrainingHours:
        process.recommendedTrainingHours?.toString() ?? null,
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
