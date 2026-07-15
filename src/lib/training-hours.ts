type DecimalLike = {
  toString(): string;
};

export type TrainingHoursAssignment = {
  id: number;
  stage: string;
  status: string;
  recommendedTrainingHours: DecimalLike | string | null;
  process: {
    recommendedTrainingHours: DecimalLike | string | null;
  };
};

export type TrainingHoursEntryInput = {
  traineeProcessId: number;
  trainingDate: Date;
  hours: DecimalLike | string | null;
};

export type TrainingHoursCheckInInput = {
  traineeProcessId: number;
  checkInDate: Date;
};

export type DerivedTrainingHours = {
  recommendedHoursCents: number | null;
  recommendedTrainingHours: string | null;
  cumulativeLoggedCents: number;
  cumulativeLoggedHours: string;
  remainingHours: string | null;
  readinessScore: number | null;
  hasLoggedTrainingHours: boolean;
  fiftyPercentReachedDate: string | null;
  ninetyPercentReachedDate: string | null;
  requires50PercentCheckIn: boolean;
  requires90PercentCheckIn: boolean;
};

function decimalStringToCents(value: DecimalLike | string | null) {
  if (value === null) {
    return null;
  }

  const text = value.toString().trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const [whole, decimal = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));

  return Number.isInteger(cents) && cents > 0 ? cents : null;
}

export function formatHoursCents(cents: number | null) {
  if (cents === null) {
    return null;
  }

  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const decimal = String(absolute % 100).padStart(2, '0');

  return `${sign}${whole}.${decimal}`;
}

export function dateKeyFromUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function effectiveRecommendedHoursCents(
  assignment: TrainingHoursAssignment,
) {
  return (
    decimalStringToCents(assignment.recommendedTrainingHours) ??
    decimalStringToCents(assignment.process.recommendedTrainingHours)
  );
}

function isCompletedAssignment(assignment: TrainingHoursAssignment) {
  return (
    assignment.status === 'Competent' ||
    assignment.status === 'Completed' ||
    assignment.stage === 'Competent'
  );
}

function thresholdReachedDate(
  entries: TrainingHoursEntryInput[],
  recommendedCents: number,
  thresholdPercent: number,
) {
  const dailyTotals = new Map<string, number>();

  for (const entry of entries) {
    const cents = decimalStringToCents(entry.hours);

    if (cents === null) {
      continue;
    }

    const dateKey = dateKeyFromUtcDate(entry.trainingDate);
    dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + cents);
  }

  let cumulativeCents = 0;

  for (const [dateKey, cents] of Array.from(dailyTotals.entries()).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    cumulativeCents += cents;

    if (cumulativeCents * 100 >= recommendedCents * thresholdPercent) {
      return dateKey;
    }
  }

  return null;
}

function hasCheckInOnOrAfter(
  checkIns: TrainingHoursCheckInInput[],
  thresholdDate: string | null,
) {
  if (thresholdDate === null) {
    return false;
  }

  return checkIns.some(
    (checkIn) => dateKeyFromUtcDate(checkIn.checkInDate) >= thresholdDate,
  );
}

export function deriveTrainingHours(
  assignment: TrainingHoursAssignment,
  entries: TrainingHoursEntryInput[],
  checkIns: TrainingHoursCheckInInput[],
): DerivedTrainingHours {
  const recommendedCents = effectiveRecommendedHoursCents(assignment);
  const cumulativeLoggedCents = entries.reduce(
    (total, entry) => total + (decimalStringToCents(entry.hours) ?? 0),
    0,
  );
  const hasLoggedTrainingHours = cumulativeLoggedCents > 0;
  const readinessScore =
    recommendedCents === null
      ? null
      : Math.min(
          100,
          Math.round((cumulativeLoggedCents / recommendedCents) * 100),
        );
  const fiftyPercentReachedDate =
    recommendedCents !== null && hasLoggedTrainingHours
      ? thresholdReachedDate(entries, recommendedCents, 50)
      : null;
  const ninetyPercentReachedDate =
    recommendedCents !== null && hasLoggedTrainingHours
      ? thresholdReachedDate(entries, recommendedCents, 90)
      : null;
  const eligibleForMilestones =
    recommendedCents !== null &&
    hasLoggedTrainingHours &&
    !isCompletedAssignment(assignment);

  return {
    recommendedHoursCents: recommendedCents,
    recommendedTrainingHours: formatHoursCents(recommendedCents),
    cumulativeLoggedCents,
    cumulativeLoggedHours: formatHoursCents(cumulativeLoggedCents) ?? '0.00',
    remainingHours:
      recommendedCents === null
        ? null
        : formatHoursCents(Math.max(0, recommendedCents - cumulativeLoggedCents)),
    readinessScore,
    hasLoggedTrainingHours,
    fiftyPercentReachedDate,
    ninetyPercentReachedDate,
    requires50PercentCheckIn:
      eligibleForMilestones &&
      readinessScore !== null &&
      readinessScore >= 50 &&
      fiftyPercentReachedDate !== null &&
      !hasCheckInOnOrAfter(checkIns, fiftyPercentReachedDate),
    requires90PercentCheckIn:
      eligibleForMilestones &&
      readinessScore !== null &&
      readinessScore >= 90 &&
      ninetyPercentReachedDate !== null &&
      !hasCheckInOnOrAfter(checkIns, ninetyPercentReachedDate),
  };
}

export function deriveTrainingHoursByAssignment(
  assignments: TrainingHoursAssignment[],
  entries: TrainingHoursEntryInput[],
  checkIns: TrainingHoursCheckInInput[],
) {
  const entriesByAssignment = new Map<number, TrainingHoursEntryInput[]>();
  const checkInsByAssignment = new Map<number, TrainingHoursCheckInInput[]>();

  for (const entry of entries) {
    entriesByAssignment.set(entry.traineeProcessId, [
      ...(entriesByAssignment.get(entry.traineeProcessId) ?? []),
      entry,
    ]);
  }

  for (const checkIn of checkIns) {
    checkInsByAssignment.set(checkIn.traineeProcessId, [
      ...(checkInsByAssignment.get(checkIn.traineeProcessId) ?? []),
      checkIn,
    ]);
  }

  return new Map(
    assignments.map((assignment) => [
      assignment.id,
      deriveTrainingHours(
        assignment,
        entriesByAssignment.get(assignment.id) ?? [],
        checkInsByAssignment.get(assignment.id) ?? [],
      ),
    ]),
  );
}
