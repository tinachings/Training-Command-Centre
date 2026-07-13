import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, type WeeklyPlannerItem } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type CleanupGroup = {
  name: string;
  scope: 'approved-assessment' | 'blocked-refresher';
  canonicalId: number;
  duplicateIds: number[];
  expected: {
    activityType: string;
    traineeProcessId: number;
    traineeName: string;
    process: string;
    canonicalPlannedDate: string;
    duplicatePlannedDates: Record<number, string>;
  };
};

type RowDifference = {
  canonicalId: number;
  duplicateId: number;
  field: keyof WeeklyPlannerItem;
  canonicalValue: string | boolean | number | null;
  duplicateValue: string | boolean | number | null;
};

const approvedAssessmentCanonicalIds = [50, 51];
const approvedAssessmentDuplicateIds = [42, 43, 44, 45, 46, 47, 48, 49];
const blockedRefresherCanonicalIds = [6, 12];
const blockedRefresherDuplicateIds = [1, 2];
const canonicalIds = [
  ...blockedRefresherCanonicalIds,
  ...approvedAssessmentCanonicalIds,
];
const duplicateIds = [
  ...blockedRefresherDuplicateIds,
  ...approvedAssessmentDuplicateIds,
];
const affectedIds = [...canonicalIds, ...duplicateIds];

const cleanupGroups: CleanupGroup[] = [
  {
    name: 'Assessment group 1: Daniel Kidane / A001 - Lens Inspection',
    scope: 'approved-assessment',
    canonicalId: 50,
    duplicateIds: [42, 44, 46, 48],
    expected: {
      activityType: 'Assessment',
      traineeProcessId: 105,
      traineeName: 'Daniel Kidane',
      process: 'A001 - Lens Inspection',
      canonicalPlannedDate: '2026-07-15',
      duplicatePlannedDates: {
        42: '2026-07-14',
        44: '2026-07-14',
        46: '2026-07-14',
        48: '2026-07-14',
      },
    },
  },
  {
    name: 'Assessment group 2: Daniel Kidane / A002 - Rejects/Reworks',
    scope: 'approved-assessment',
    canonicalId: 51,
    duplicateIds: [43, 45, 47, 49],
    expected: {
      activityType: 'Assessment',
      traineeProcessId: 104,
      traineeName: 'Daniel Kidane',
      process: 'A002 - Rejects/Reworks',
      canonicalPlannedDate: '2026-07-15',
      duplicatePlannedDates: {
        43: '2026-07-14',
        45: '2026-07-14',
        47: '2026-07-14',
        49: '2026-07-14',
      },
    },
  },
  {
    name: 'Refresher group 1: Jason Adams / B001 - ARX',
    scope: 'blocked-refresher',
    canonicalId: 6,
    duplicateIds: [1],
    expected: {
      activityType: 'Refresher',
      traineeProcessId: 46,
      traineeName: 'Jason Adams',
      process: 'B001 - ARX',
      canonicalPlannedDate: '2026-06-29',
      duplicatePlannedDates: {
        1: '2026-06-28',
      },
    },
  },
  {
    name: 'Refresher group 2: Magdalena Rogowska / WI005 - Final Inspection',
    scope: 'blocked-refresher',
    canonicalId: 12,
    duplicateIds: [2],
    expected: {
      activityType: 'Refresher',
      traineeProcessId: 31,
      traineeName: 'Magdalena Rogowska',
      process: 'WI005 - Final Inspection',
      canonicalPlannedDate: '2026-06-30',
      duplicatePlannedDates: {
        2: '2026-06-29',
      },
    },
  },
];

const mergeFields: (keyof WeeklyPlannerItem)[] = [
  'owner',
  'status',
  'actualDate',
  'deviationReason',
  'followUpRequired',
  'followUpDate',
];

const execute = process.argv.includes('--execute');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

function dateKey(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? null;
}

function valueForOutput(value: WeeklyPlannerItem[keyof WeeklyPlannerItem]) {
  return value instanceof Date ? value.toISOString() : value;
}

function sameValue(
  left: WeeklyPlannerItem[keyof WeeklyPlannerItem],
  right: WeeklyPlannerItem[keyof WeeklyPlannerItem],
) {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  return left === right;
}

function summarizeRow(row: WeeklyPlannerItem) {
  return {
    id: row.id,
    activityType: row.activityType,
    traineeProcessId: row.traineeProcessId,
    traineeName: row.traineeName,
    process: row.process,
    department: row.department,
    weekCommencing: dateKey(row.weekCommencing),
    plannedDate: dateKey(row.plannedDate),
    status: row.status,
    actualDate: dateKey(row.actualDate),
    deviationReason: row.deviationReason,
    followUpRequired: row.followUpRequired,
    followUpDate: dateKey(row.followUpDate),
    createdAt: row.createdAt.toISOString(),
  };
}

function validateRow(
  row: WeeklyPlannerItem | undefined,
  group: CleanupGroup,
  expectedPlannedDate: string,
  role: 'canonical' | 'duplicate',
) {
  const errors: string[] = [];

  if (!row) {
    return [`Missing ${role} row for ${group.name}.`];
  }

  const expected = group.expected;

  if (row.activityType !== expected.activityType) {
    errors.push(
      `ID ${row.id}: expected activityType ${expected.activityType}, found ${row.activityType}.`,
    );
  }

  if (row.traineeProcessId !== expected.traineeProcessId) {
    errors.push(
      `ID ${row.id}: expected traineeProcessId ${expected.traineeProcessId}, found ${row.traineeProcessId}.`,
    );
  }

  if (row.traineeName !== expected.traineeName) {
    errors.push(
      `ID ${row.id}: expected traineeName ${expected.traineeName}, found ${row.traineeName}.`,
    );
  }

  if (row.process !== expected.process) {
    errors.push(
      `ID ${row.id}: expected process ${expected.process}, found ${row.process}.`,
    );
  }

  if (dateKey(row.plannedDate) !== expectedPlannedDate) {
    errors.push(
      `ID ${row.id}: expected plannedDate ${expectedPlannedDate}, found ${dateKey(row.plannedDate)}.`,
    );
  }

  return errors;
}

function compareRows(
  canonical: WeeklyPlannerItem,
  duplicate: WeeklyPlannerItem,
) {
  const differences: RowDifference[] = [];

  for (const field of mergeFields) {
    const canonicalValue = canonical[field];
    const duplicateValue = duplicate[field];

    if (sameValue(canonicalValue, duplicateValue)) {
      continue;
    }

    differences.push({
      canonicalId: canonical.id,
      duplicateId: duplicate.id,
      field,
      canonicalValue: valueForOutput(canonicalValue) as
        | string
        | boolean
        | number
        | null,
      duplicateValue: valueForOutput(duplicateValue) as
        | string
        | boolean
        | number
        | null,
    });
  }

  return differences;
}

async function writeBackup(rows: WeeklyPlannerItem[]) {
  const outputDirectory = path.join(process.cwd(), 'scripts', 'output');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(
    outputDirectory,
    `weekly-planner-duplicates-backup-${timestamp}.json`,
  );

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    backupPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        mode: execute ? 'EXECUTE' : 'DRY RUN',
        approvedAssessmentCanonicalIds,
        approvedAssessmentDuplicateIds,
        blockedRefresherCanonicalIds,
        blockedRefresherDuplicateIds,
        rows,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return backupPath;
}

async function main() {
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}`);
  console.log('Database connected: yes');

  const beforeTotalCount = await prisma.weeklyPlannerItem.count();
  const rows = await prisma.weeklyPlannerItem.findMany({
    where: {
      id: {
        in: affectedIds,
      },
    },
    orderBy: {
      id: 'asc',
    },
  });
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  console.log(`Rows found: ${rows.length} of ${affectedIds.length}`);

  const assessmentValidationErrors: string[] = [];
  const blockedRefresherValidationErrors: string[] = [];
  const assessmentDifferences: RowDifference[] = [];
  const blockedRefresherDifferences: RowDifference[] = [];

  for (const group of cleanupGroups) {
    const canonical = rowsById.get(group.canonicalId);
    const validationErrors =
      group.scope === 'approved-assessment'
        ? assessmentValidationErrors
        : blockedRefresherValidationErrors;

    validationErrors.push(
      ...validateRow(
        canonical,
        group,
        group.expected.canonicalPlannedDate,
        'canonical',
      ),
    );

    if (!canonical) {
      continue;
    }

    for (const duplicateId of group.duplicateIds) {
      const duplicate = rowsById.get(duplicateId);

      validationErrors.push(
        ...validateRow(
          duplicate,
          group,
          group.expected.duplicatePlannedDates[duplicateId],
          'duplicate',
        ),
      );

      if (!duplicate) {
        continue;
      }

      const differences = compareRows(canonical, duplicate);

      if (group.scope === 'approved-assessment') {
        assessmentDifferences.push(...differences);
      } else {
        blockedRefresherDifferences.push(...differences);
      }
    }
  }

  const backupPath = await writeBackup(rows);

  console.log(`Backup file path: ${backupPath}`);
  console.log(
    `Assessment groups validated: ${
      cleanupGroups.filter((group) => group.scope === 'approved-assessment')
        .length
    }`,
  );
  console.log(
    `Refresher groups reported as BLOCKED - requires separate source verification: ${
      cleanupGroups.filter((group) => group.scope === 'blocked-refresher')
        .length
    }`,
  );
  console.log(
    `Assessment validation errors: ${assessmentValidationErrors.length}`,
  );
  assessmentValidationErrors.forEach((error) => console.log(`- ${error}`));
  console.log(
    `Blocked Refresher validation notes: ${blockedRefresherValidationErrors.length}`,
  );
  blockedRefresherValidationErrors.forEach((error) =>
    console.log(`- ${error}`),
  );

  console.log('Affected rows:');
  rows.map(summarizeRow).forEach((row) => {
    console.log(`- ${JSON.stringify(row)}`);
  });

  console.log('Historical Assessment differences (non-blocking, no merge):');
  if (!assessmentDifferences.length) {
    console.log('- none');
  } else {
    assessmentDifferences.forEach((difference) => {
      console.log(
        `- canonical ${difference.canonicalId} vs duplicate ${difference.duplicateId}: ${String(difference.field)} canonical=${JSON.stringify(difference.canonicalValue)} duplicate=${JSON.stringify(difference.duplicateValue)}`,
      );
    });
  }

  console.log('Blocked Refresher differences (requires source audit):');
  if (!blockedRefresherDifferences.length) {
    console.log('- none');
  } else {
    blockedRefresherDifferences.forEach((difference) => {
      console.log(
        `- canonical ${difference.canonicalId} vs duplicate ${difference.duplicateId}: ${String(difference.field)} canonical=${JSON.stringify(difference.canonicalValue)} duplicate=${JSON.stringify(difference.duplicateValue)}`,
      );
    });
  }

  console.log(
    `Assessment rows approved for deletion: ${approvedAssessmentDuplicateIds.join(', ')}`,
  );
  console.log(
    `Assessment canonical rows preserved: ${approvedAssessmentCanonicalIds.join(', ')}`,
  );
  console.log('Refresher rows approved for deletion: none');
  console.log(
    `Refresher rows BLOCKED - not approved for deletion: ${blockedRefresherDuplicateIds.join(', ')}`,
  );
  console.log(
    `Refresher canonical rows preserved: ${blockedRefresherCanonicalIds.join(', ')}`,
  );
  console.log(
    `Total executable deletion count: ${approvedAssessmentDuplicateIds.length}`,
  );

  if (!execute) {
    console.log('No records were modified.');
    return;
  }

  if (assessmentValidationErrors.length) {
    throw new Error('Aborting execution because validation failed.');
  }

  if (blockedRefresherValidationErrors.length) {
    throw new Error(
      'Aborting execution because blocked Refresher rows are missing or unexpected.',
    );
  }

  const beforeAffectedCount = await prisma.weeklyPlannerItem.count({
    where: {
      id: {
        in: approvedAssessmentDuplicateIds,
      },
    },
  });

  await prisma.$transaction(async (transaction) => {
    const deleteResult = await transaction.weeklyPlannerItem.deleteMany({
      where: {
        id: {
          in: approvedAssessmentDuplicateIds,
        },
      },
    });

    if (deleteResult.count !== approvedAssessmentDuplicateIds.length) {
      throw new Error(
        `Expected to delete ${approvedAssessmentDuplicateIds.length} rows, deleted ${deleteResult.count}.`,
      );
    }
  });

  const remainingDuplicates = await prisma.weeklyPlannerItem.findMany({
    where: {
      id: {
        in: approvedAssessmentDuplicateIds,
      },
    },
    select: {
      id: true,
    },
  });
  const remainingCanonicals = await prisma.weeklyPlannerItem.findMany({
    where: {
      id: {
        in: approvedAssessmentCanonicalIds,
      },
    },
    select: {
      id: true,
      traineeProcessId: true,
      plannedDate: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
  const afterTotalCount = await prisma.weeklyPlannerItem.count();
  const afterAffectedCount = await prisma.weeklyPlannerItem.count({
    where: {
      id: {
        in: approvedAssessmentDuplicateIds,
      },
    },
  });

  const deletedCount = beforeAffectedCount - afterAffectedCount;

  if (remainingDuplicates.length) {
    throw new Error(
      `Post-cleanup verification failed: Assessment duplicate IDs remain ${remainingDuplicates.map((row) => row.id).join(', ')}.`,
    );
  }

  if (remainingCanonicals.length !== approvedAssessmentCanonicalIds.length) {
    throw new Error(
      'Post-cleanup verification failed: missing Assessment canonical rows.',
    );
  }

  for (const group of cleanupGroups.filter(
    (candidate) => candidate.scope === 'approved-assessment',
  )) {
    const canonical = remainingCanonicals.find(
      (row) => row.id === group.canonicalId,
    );

    if (
      !canonical ||
      canonical.traineeProcessId !== group.expected.traineeProcessId ||
      dateKey(canonical.plannedDate) !== group.expected.canonicalPlannedDate
    ) {
      throw new Error(
        `Post-cleanup verification failed for canonical ID ${group.canonicalId}.`,
      );
    }
  }

  const blockedRowsAfterExecution = await prisma.weeklyPlannerItem.findMany({
    where: {
      id: {
        in: [...blockedRefresherCanonicalIds, ...blockedRefresherDuplicateIds],
      },
    },
    select: {
      id: true,
    },
  });

  if (
    blockedRowsAfterExecution.length !==
    blockedRefresherCanonicalIds.length + blockedRefresherDuplicateIds.length
  ) {
    throw new Error(
      'Post-cleanup verification failed: blocked Refresher rows were not preserved.',
    );
  }

  if (deletedCount !== approvedAssessmentDuplicateIds.length) {
    throw new Error(
      `Post-cleanup verification failed: expected ${approvedAssessmentDuplicateIds.length} deleted rows, found ${deletedCount}.`,
    );
  }

  if (beforeTotalCount - afterTotalCount !== approvedAssessmentDuplicateIds.length) {
    throw new Error(
      `Post-cleanup verification failed: total count changed by ${beforeTotalCount - afterTotalCount}, expected ${approvedAssessmentDuplicateIds.length}.`,
    );
  }

  console.log('Canonical fields merged: 0');
  console.log(`Exact IDs deleted: ${approvedAssessmentDuplicateIds.join(', ')}`);
  console.log('Transaction result: committed');
  console.log(`Before affected count: ${beforeAffectedCount}`);
  console.log(`After affected count: ${afterAffectedCount}`);
  console.log(`Final number of deleted rows: ${deletedCount}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
