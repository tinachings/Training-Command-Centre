import { NextResponse } from 'next/server';
import { activeAssignmentStatus } from '@/lib/assignment-state';
import { addMonths, refresherStatusForDueDate } from '@/lib/competency';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RefresherPatchBody = {
  action?: unknown;
  refresherDueDate?: unknown;
  assignedAssessor?: unknown;
  status?: unknown;
  completedDate?: unknown;
  outcome?: unknown;
  newScheduledDate?: unknown;
  deviationReason?: unknown;
};

type RefresherScheduleAction = 'defer' | 'carryOver';

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

function utcDateFromParts(year: string, month: string, day: string) {
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePlannerDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);

  if (match) {
    const [, year, month, day] = match;

    return utcDateFromParts(year, month, day) ?? undefined;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function dateKeyFromDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function weekCommencingFromDate(date: Date) {
  const monday = new Date(date);
  const day = monday.getUTCDay();
  const daysFromMonday = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + daysFromMonday);

  return new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate(),
    ),
  );
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

function plannerStatusForAction(action: RefresherScheduleAction) {
  return action === 'defer' ? 'Deferred' : 'Carry Over';
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
  const action =
    body.action === undefined ? undefined : String(body.action).trim();
  const refresherDueDate = parseOptionalDate(body.refresherDueDate);
  const completedDate = parseOptionalDate(body.completedDate);
  const newScheduledDate = normalizePlannerDate(body.newScheduledDate);
  const assignedAssessor = normalizeAssessor(body.assignedAssessor);
  const status =
    body.status === undefined ? undefined : String(body.status).trim();
  const outcome = optionalText(body.outcome);
  const deviationReason = optionalText(body.deviationReason);

  if (
    action !== undefined &&
    action !== 'defer' &&
    action !== 'carryOver'
  ) {
    return NextResponse.json(
      { error: 'Unsupported refresher action.' },
      { status: 400 },
    );
  }

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

  if (
    body.newScheduledDate !== undefined &&
    newScheduledDate === undefined
  ) {
    return NextResponse.json(
      { error: 'New scheduled date is invalid.' },
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
        assignmentStatus: activeAssignmentStatus,
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
      department: true,
      traineeName: true,
      process: true,
      refresherDueDate: true,
      scheduledRefresherDate: true,
      status: true,
      scheduleStatus: true,
      assignedAssessor: true,
      completedDate: true,
      traineeProcess: {
        select: {
          trainee: {
            select: {
              name: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
          process: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json(
      { error: 'Refresher record not found.' },
      { status: 404 },
    );
  }

  if (action === 'defer' || action === 'carryOver') {
    if (
      body.completedDate !== undefined ||
      body.outcome !== undefined ||
      body.status !== undefined ||
      body.refresherDueDate !== undefined
    ) {
      return NextResponse.json(
        { error: 'Refresher action payload contains conflicting fields.' },
        { status: 400 },
      );
    }

    if (current.scheduleStatus === 'Completed') {
      return NextResponse.json(
        { error: 'Completed refreshers cannot be deferred or carried over.' },
        { status: 400 },
      );
    }

    if (!current.scheduledRefresherDate) {
      return NextResponse.json(
        { error: 'A scheduled refresher date is required for this action.' },
        { status: 400 },
      );
    }

    if (newScheduledDate === null || newScheduledDate === undefined) {
      return NextResponse.json(
        { error: 'New scheduled date is required.' },
        { status: 400 },
      );
    }

    if (!deviationReason) {
      return NextResponse.json(
        { error: 'Deviation reason is required.' },
        { status: 400 },
      );
    }

    const currentScheduledDate = normalizePlannerDate(
      current.scheduledRefresherDate,
    );

    if (!(currentScheduledDate instanceof Date)) {
      return NextResponse.json(
        { error: 'Current scheduled date is invalid.' },
        { status: 400 },
      );
    }

    if (
      dateKeyFromDate(currentScheduledDate) ===
      dateKeyFromDate(newScheduledDate)
    ) {
      return NextResponse.json(
        { error: 'New scheduled date must differ from the current date.' },
        { status: 400 },
      );
    }

    const plannerStatus = plannerStatusForAction(action);

    const updated = await prisma.$transaction(async (transaction) => {
      const currentPlannerItem =
        (await transaction.weeklyPlannerItem.findFirst({
          where: {
            activityType: 'Refresher',
            traineeProcessId: current.traineeProcessId,
            plannedDate: currentScheduledDate,
          },
          orderBy: {
            id: 'asc',
          },
        })) ??
        (await transaction.weeklyPlannerItem.findFirst({
          where: {
            activityType: 'Refresher',
            traineeName: current.traineeProcess.trainee.name,
            process: current.traineeProcess.process.name,
            plannedDate: currentScheduledDate,
          },
          orderBy: {
            id: 'asc',
          },
        }));

      if (currentPlannerItem) {
        await transaction.weeklyPlannerItem.update({
          where: {
            id: currentPlannerItem.id,
          },
          data: {
            status: plannerStatus,
            actualDate: null,
            deviationReason,
            traineeProcessId: current.traineeProcessId,
          },
        });
      } else {
        await transaction.weeklyPlannerItem.create({
          data: {
            weekCommencing: weekCommencingFromDate(currentScheduledDate),
            plannedDate: currentScheduledDate,
            department:
              current.traineeProcess.trainee.department.name ||
              current.department,
            traineeName:
              current.traineeProcess.trainee.name || current.traineeName,
            process: current.traineeProcess.process.name || current.process,
            activityType: 'Refresher',
            owner: current.assignedAssessor,
            status: plannerStatus,
            actualDate: null,
            deviationReason,
            followUpRequired: false,
            followUpDate: null,
            traineeProcessId: current.traineeProcessId,
          },
        });
      }

      return transaction.refresherRecord.update({
        where: {
          id: current.id,
        },
        data: {
          scheduledRefresherDate: newScheduledDate,
          scheduleStatus: 'Scheduled',
        },
      });
    });

    return NextResponse.json(updated);
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
