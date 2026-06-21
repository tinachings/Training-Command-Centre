import { NextResponse } from 'next/server';
import { addMonths, refresherStatusForDueDate } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RefresherPatchBody = {
  refresherDueDate?: unknown;
  assignedAssessor?: unknown;
  status?: unknown;
  completedDate?: unknown;
  outcome?: unknown;
};

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseOptionalDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeAssessor(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const assessor = String(value).trim();

  return assessor && assessor.toLowerCase() !== 'null' ? assessor : null;
}

function optionalText(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return String(value ?? '').trim() || null;
}

function requiresRefresherDueDate(status: string) {
  return status !== 'Completed';
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { error: 'Invalid refresher id.' },
      { status: 400 },
    );
  }

  const body = (await request.json()) as RefresherPatchBody;
  const refresherDueDate = parseOptionalDate(body.refresherDueDate);
  const completedDate = parseOptionalDate(body.completedDate);
  const assignedAssessor = normalizeAssessor(body.assignedAssessor);
  const status =
    body.status === undefined ? undefined : String(body.status).trim();
  const outcome = optionalText(body.outcome);

  if (
    body.refresherDueDate !== undefined &&
    refresherDueDate === undefined
  ) {
    return NextResponse.json(
      { error: 'Refresher due date is invalid.' },
      { status: 400 },
    );
  }

  if (body.completedDate !== undefined && completedDate === undefined) {
    return NextResponse.json(
      { error: 'Completed date is invalid.' },
      { status: 400 },
    );
  }

  if (status !== undefined && status === '') {
    return NextResponse.json(
      { error: 'Refresher status is required.' },
      { status: 400 },
    );
  }

  const current = await prisma.refresherRecord.findFirst({
    where: {
      id,
      traineeProcess: {
        status: {
          not: 'Archived',
        },
        trainee: {
          archived: false,
        },
      },
    },
    select: {
      id: true,
      traineeProcessId: true,
      refresherDueDate: true,
      status: true,
      completedDate: true,
    },
  });

  if (!current) {
    return NextResponse.json(
      { error: 'Refresher record not found.' },
      { status: 404 },
    );
  }

  if (body.completedDate !== undefined || body.outcome !== undefined) {
    if (completedDate === null || completedDate === undefined) {
      return NextResponse.json(
        { error: 'Completed date is required.' },
        { status: 400 },
      );
    }

    if (!outcome) {
      return NextResponse.json(
        { error: 'Outcome is required.' },
        { status: 400 },
      );
    }

    const newDueDate = addMonths(completedDate, 12);
    const complianceStatus = refresherStatusForDueDate(newDueDate);

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.traineeProcess.update({
        where: {
          id: current.traineeProcessId,
        },
        data: {
          status: 'Competent',
          stage: 'Competent',
          competencySignOffDate: completedDate,
        },
      });

      return transaction.refresherRecord.update({
        where: {
          id: current.id,
        },
        data: {
          lastCompetencyDate: completedDate,
          refresherDueDate: newDueDate,
          status: complianceStatus,
          completedDate,
          outcome,
          scheduleStatus: 'Completed',
          ...(assignedAssessor !== undefined ? { assignedAssessor } : {}),
        },
      });
    });

    return NextResponse.json(updated);
  }

  const nextStatus = status ?? current.status;
  const nextRefresherDueDate =
    refresherDueDate === undefined
      ? current.refresherDueDate
      : refresherDueDate;
  const nextCompletedDate =
    completedDate === undefined ? current.completedDate : completedDate;

  if (requiresRefresherDueDate(nextStatus) && nextRefresherDueDate === null) {
    return NextResponse.json(
      { error: 'Refresher due date is required.' },
      { status: 400 },
    );
  }

  if (nextStatus === 'Completed' && nextCompletedDate === null) {
    return NextResponse.json(
      { error: 'Completed date is required when status is Completed.' },
      { status: 400 },
    );
  }

  const updated = await prisma.refresherRecord.update({
    where: {
      id: current.id,
    },
    data: {
      ...(refresherDueDate !== undefined ? { refresherDueDate } : {}),
      ...(assignedAssessor !== undefined ? { assignedAssessor } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(completedDate !== undefined ? { completedDate } : {}),
      ...(outcome !== undefined ? { outcome } : {}),
    },
  });

  return NextResponse.json(updated);
}
