import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
    processId: string;
  }>;
};

type TrainingHoursEntryBody = {
  date?: unknown;
  hours?: unknown;
};

type TrainingHoursPutBody = {
  weekBeginning?: unknown;
  entries?: unknown;
  enteredBy?: unknown;
};

type DecimalLike = {
  toString(): string;
};

type TrainingHoursAssignment = {
  id: number;
  stage: string;
  status: string;
  trainingStartDate: Date | null;
  competencySignOffDate: Date | null;
  readinessScore: number | null;
  recommendedTrainingHours: DecimalLike | null;
  trainee: {
    id: number;
    name: string;
    archived: boolean;
    department: {
      name: string;
    };
  };
  process: {
    id: number;
    name: string;
    recommendedTrainingHours: DecimalLike | null;
  };
};

type TrainingHoursEntry = {
  trainingDate: Date;
  hours: DecimalLike;
};

const maxDailyCents = 1200;
const daysInWeek = 7;

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function utcDateFromParts(year: string, month: string, day: string) {
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateOnly(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = utcDateFromParts(year, month, day);

  if (!date || dateKeyFromDate(date) !== `${year}-${month}-${day}`) {
    return null;
  }

  return date;
}

function dateKeyFromDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);

  return next;
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

function currentUtcDate() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function isMonday(date: Date) {
  return date.getUTCDay() === 1;
}

function parseHoursToCents(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const [whole, decimal = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));

  if (!Number.isInteger(cents) || cents < 0 || cents > maxDailyCents) {
    return null;
  }

  return cents;
}

function decimalStringToCents(value: DecimalLike | string | null) {
  if (value === null) {
    return null;
  }

  return parseHoursToCents(value.toString());
}

function formatCents(cents: number | null) {
  if (cents === null) {
    return null;
  }

  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const decimal = String(absolute % 100).padStart(2, '0');

  return `${sign}${whole}.${decimal}`;
}

function weekDateKeys(weekBeginning: Date) {
  return Array.from({ length: daysInWeek }, (_, index) =>
    dateKeyFromDate(addDays(weekBeginning, index)),
  );
}

function weekEndDate(weekBeginning: Date) {
  return addDays(weekBeginning, 6);
}

function weeksBetweenInclusive(start: Date, end: Date) {
  if (start > end) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / 604800000) + 1;
}

async function getAssignment(traineeId: number, traineeProcessId: number) {
  return prisma.traineeProcess.findFirst({
    where: {
      id: traineeProcessId,
      traineeId,
      trainee: {
        archived: false,
      },
    },
    select: {
      id: true,
      stage: true,
      status: true,
      trainingStartDate: true,
      competencySignOffDate: true,
      readinessScore: true,
      recommendedTrainingHours: true,
      trainee: {
        select: {
          id: true,
          name: true,
          archived: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      },
      process: {
        select: {
          id: true,
          name: true,
          recommendedTrainingHours: true,
        },
      },
    },
  }) as Promise<TrainingHoursAssignment | null>;
}

async function buildSummary(
  assignment: TrainingHoursAssignment,
  selectedWeekBeginning: Date,
) {
  const today = currentUtcDate();
  const currentWeekBeginning = weekCommencingFromDate(today);
  const selectedWeekEnd = weekEndDate(selectedWeekBeginning);
  const trainingEntries: TrainingHoursEntry[] =
    await prisma.trainingHoursEntry.findMany({
      where: {
        traineeProcessId: assignment.id,
      },
      select: {
        trainingDate: true,
        hours: true,
      },
      orderBy: {
        trainingDate: 'asc',
      },
    });

  const entryCentsByDate = new Map(
    trainingEntries.map((entry) => [
      dateKeyFromDate(entry.trainingDate),
      decimalStringToCents(entry.hours) ?? 0,
    ]),
  );
  const selectedWeekKeys = weekDateKeys(selectedWeekBeginning);
  const selectedWeekEntries = selectedWeekKeys.map((dateKey, index) => {
    const date = addDays(selectedWeekBeginning, index);
    const cents = entryCentsByDate.get(dateKey) ?? null;

    return {
      date: dateKey,
      dayName: new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        timeZone: 'UTC',
      }).format(date),
      hours: formatCents(cents),
      isFuture: date > today,
    };
  });
  const selectedWeekTotalCents = selectedWeekKeys.reduce(
    (total, dateKey) => total + (entryCentsByDate.get(dateKey) ?? 0),
    0,
  );
  const cumulativeLoggedCents = trainingEntries.reduce(
    (total, entry) => total + (decimalStringToCents(entry.hours) ?? 0),
    0,
  );
  const recommendedCents =
    decimalStringToCents(assignment.recommendedTrainingHours) ??
    decimalStringToCents(assignment.process.recommendedTrainingHours);
  const remainingCents =
    recommendedCents === null
      ? null
      : Math.max(0, recommendedCents - cumulativeLoggedCents);
  const readinessPercentage =
    recommendedCents && recommendedCents > 0
      ? Math.min(100, Math.round((cumulativeLoggedCents / recommendedCents) * 100))
      : null;
  const lastEntry = trainingEntries[trainingEntries.length - 1] ?? null;
  const lastTrainingDate = lastEntry
    ? dateKeyFromDate(lastEntry.trainingDate)
    : null;
  const earliestEntry = trainingEntries[0] ?? null;
  const eligibleStartDate = assignment.trainingStartDate
    ? weekCommencingFromDate(assignment.trainingStartDate)
    : earliestEntry
      ? weekCommencingFromDate(earliestEntry.trainingDate)
      : currentWeekBeginning;
  const eligibleEndDate =
    assignment.status === 'Competent' || assignment.stage === 'Competent'
      ? assignment.competencySignOffDate
        ? weekCommencingFromDate(assignment.competencySignOffDate)
        : currentWeekBeginning
      : currentWeekBeginning;
  const elapsedEligibleWeeks = weeksBetweenInclusive(
    eligibleStartDate,
    eligibleEndDate,
  );
  const activeWeekKeys = new Set(
    trainingEntries
      .filter((entry) => (decimalStringToCents(entry.hours) ?? 0) > 0)
      .map((entry) => dateKeyFromDate(weekCommencingFromDate(entry.trainingDate))),
  );
  const activeWeeks = activeWeekKeys.size;
  const activeWeekRatio =
    elapsedEligibleWeeks > 0 ? activeWeeks / elapsedEligibleWeeks : 0;
  const averageHoursPerActiveWeek =
    activeWeeks > 0
      ? formatCents(Math.round(cumulativeLoggedCents / activeWeeks))
      : '0.00';
  const daysSinceLastTraining =
    lastEntry === null
      ? null
      : Math.floor((today.getTime() - lastEntry.trainingDate.getTime()) / 86400000);
  const consistencyLabel =
    trainingEntries.length === 0 ||
    (daysSinceLastTraining !== null && daysSinceLastTraining >= 28)
      ? 'Inactive'
      : activeWeekRatio >= 0.8 &&
          (daysSinceLastTraining === null || daysSinceLastTraining <= 14)
        ? 'Strong'
        : activeWeekRatio >= 0.6 &&
            (daysSinceLastTraining === null || daysSinceLastTraining <= 21)
          ? 'Good'
          : 'Irregular';
  const recentWeeklyHistory = Array.from({ length: 8 }, (_, index) => {
    const weekBeginning = addDays(currentWeekBeginning, index * -7);
    const keys = weekDateKeys(weekBeginning);
    const totalCents = keys.reduce(
      (total, dateKey) => total + (entryCentsByDate.get(dateKey) ?? 0),
      0,
    );

    return {
      weekBeginning: dateKeyFromDate(weekBeginning),
      weekEnding: dateKeyFromDate(weekEndDate(weekBeginning)),
      totalHours: formatCents(totalCents),
      isSelected:
        dateKeyFromDate(weekBeginning) === dateKeyFromDate(selectedWeekBeginning),
    };
  });

  return {
    colleague: {
      id: assignment.trainee.id,
      name: assignment.trainee.name,
    },
    traineeProcessId: assignment.id,
    process: {
      id: assignment.process.id,
      name: assignment.process.name,
    },
    department: assignment.trainee.department.name,
    trainingStartDate: assignment.trainingStartDate
      ? dateKeyFromDate(assignment.trainingStartDate)
      : null,
    stage: assignment.stage,
    status: assignment.status,
    recommendedTrainingHours: formatCents(recommendedCents),
    assignmentRecommendedTrainingHours:
      formatCents(decimalStringToCents(assignment.recommendedTrainingHours)),
    processRecommendedTrainingHours:
      formatCents(decimalStringToCents(assignment.process.recommendedTrainingHours)),
    selectedWeekBeginning: dateKeyFromDate(selectedWeekBeginning),
    selectedWeekEnding: dateKeyFromDate(selectedWeekEnd),
    currentWeekBeginning: dateKeyFromDate(currentWeekBeginning),
    entries: selectedWeekEntries,
    selectedWeekTotalHours: formatCents(selectedWeekTotalCents),
    cumulativeLoggedHours: formatCents(cumulativeLoggedCents),
    remainingHours: formatCents(remainingCents),
    readinessPercentage,
    legacyReadinessScore:
      trainingEntries.length === 0 ? assignment.readinessScore : null,
    lastTrainingDate,
    elapsedEligibleWeeks,
    activeWeeks,
    activeWeekRatio,
    averageHoursPerActiveWeek,
    daysSinceLastTraining,
    recentGapDays: daysSinceLastTraining,
    consistencyLabel,
    recentWeeklyHistory,
    canNavigateNext:
      dateKeyFromDate(selectedWeekBeginning) !==
      dateKeyFromDate(currentWeekBeginning),
  };
}

async function parseContext(context: RouteContext) {
  const params = await context.params;
  const traineeId = parseId(params.id);
  const traineeProcessId = parseId(params.processId);

  return {
    traineeId,
    traineeProcessId,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { traineeId, traineeProcessId } = await parseContext(context);

  if (!traineeId || !traineeProcessId) {
    return NextResponse.json(
      { error: 'Invalid trainee or process id.' },
      { status: 400 },
    );
  }

  const assignment = await getAssignment(traineeId, traineeProcessId);

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  const today = currentUtcDate();
  const currentWeekBeginning = weekCommencingFromDate(today);
  const weekBeginningParam = new URL(request.url).searchParams.get(
    'weekBeginning',
  );
  const weekBeginning = weekBeginningParam
    ? parseDateOnly(weekBeginningParam)
    : currentWeekBeginning;

  if (!weekBeginning || !isMonday(weekBeginning)) {
    return NextResponse.json(
      { error: 'Week beginning must be a valid Monday date.' },
      { status: 400 },
    );
  }

  if (weekBeginning > currentWeekBeginning) {
    return NextResponse.json(
      { error: 'Future weeks cannot be opened.' },
      { status: 400 },
    );
  }

  return NextResponse.json(await buildSummary(assignment, weekBeginning));
}

export async function PUT(request: Request, context: RouteContext) {
  const { traineeId, traineeProcessId } = await parseContext(context);

  if (!traineeId || !traineeProcessId) {
    return NextResponse.json(
      { error: 'Invalid trainee or process id.' },
      { status: 400 },
    );
  }

  const assignment = await getAssignment(traineeId, traineeProcessId);

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  const body = (await request.json()) as TrainingHoursPutBody;
  const weekBeginning = parseDateOnly(body.weekBeginning);
  const today = currentUtcDate();
  const currentWeekBeginning = weekCommencingFromDate(today);

  if (!weekBeginning || !isMonday(weekBeginning)) {
    return NextResponse.json(
      { error: 'Week beginning must be a valid Monday date.' },
      { status: 400 },
    );
  }

  if (weekBeginning > currentWeekBeginning) {
    return NextResponse.json(
      { error: 'Future weeks cannot be saved.' },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.entries) || body.entries.length !== daysInWeek) {
    return NextResponse.json(
      { error: 'A complete seven-day entry set is required.' },
      { status: 400 },
    );
  }

  const weekKeys = new Set(weekDateKeys(weekBeginning));
  const seenDates = new Set<string>();
  const parsedEntries: Array<{
    date: Date;
    hoursCents: number;
  }> = [];

  for (const entry of body.entries as TrainingHoursEntryBody[]) {
    const trainingDate = parseDateOnly(entry.date);

    if (!trainingDate) {
      return NextResponse.json(
        { error: 'Each entry date must be a valid YYYY-MM-DD value.' },
        { status: 400 },
      );
    }

    const dateKey = dateKeyFromDate(trainingDate);

    if (!weekKeys.has(dateKey)) {
      return NextResponse.json(
        { error: 'All entry dates must belong to the selected week.' },
        { status: 400 },
      );
    }

    if (seenDates.has(dateKey)) {
      return NextResponse.json(
        { error: 'Duplicate entry dates are not allowed.' },
        { status: 400 },
      );
    }

    seenDates.add(dateKey);

    const hoursCents = parseHoursToCents(entry.hours);

    if (hoursCents === null) {
      return NextResponse.json(
        {
          error:
            'Hours must be blank, zero, or a positive value up to 12 with no more than two decimal places.',
        },
        { status: 400 },
      );
    }

    if (trainingDate > today && hoursCents > 0) {
      return NextResponse.json(
        { error: 'Future dates cannot have logged hours.' },
        { status: 400 },
      );
    }

    parsedEntries.push({
      date: trainingDate,
      hoursCents,
    });
  }

  const enteredBy = String(body.enteredBy ?? '').trim() || null;

  await prisma.$transaction(async (transaction) => {
    for (const entry of parsedEntries) {
      if (entry.hoursCents > 0) {
        const hours = formatCents(entry.hoursCents) ?? '0.00';

        await transaction.trainingHoursEntry.upsert({
          where: {
            traineeProcessId_trainingDate: {
              traineeProcessId: assignment.id,
              trainingDate: entry.date,
            },
          },
          update: {
            hours,
            ...(enteredBy ? { lastEditedBy: enteredBy } : {}),
          },
          create: {
            traineeProcessId: assignment.id,
            trainingDate: entry.date,
            hours,
            ...(enteredBy ? { enteredBy, lastEditedBy: enteredBy } : {}),
          },
        });
      } else {
        await transaction.trainingHoursEntry.deleteMany({
          where: {
            traineeProcessId: assignment.id,
            trainingDate: entry.date,
          },
        });
      }
    }

    const totals = await transaction.trainingHoursEntry.findMany({
      where: {
        traineeProcessId: assignment.id,
      },
      select: {
        hours: true,
      },
    });
    const cumulativeCents = totals.reduce(
      (total, item) => total + (decimalStringToCents(item.hours) ?? 0),
      0,
    );
    const recommendedCents =
      decimalStringToCents(assignment.recommendedTrainingHours) ??
      decimalStringToCents(assignment.process.recommendedTrainingHours);
    const readinessScore =
      recommendedCents && recommendedCents > 0
        ? Math.min(100, Math.round((cumulativeCents / recommendedCents) * 100))
        : null;

    if (readinessScore !== null) {
      await transaction.traineeProcess.update({
        where: {
          id: assignment.id,
        },
        data: {
          readinessScore,
        },
      });
    }
  });

  const refreshedAssignment = await getAssignment(traineeId, traineeProcessId);

  if (!refreshedAssignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this trainee.' },
      { status: 404 },
    );
  }

  return NextResponse.json(await buildSummary(refreshedAssignment, weekBeginning));
}
