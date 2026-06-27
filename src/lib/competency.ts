import { prisma } from '@/lib/prisma';

type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type CompetencyRefresherInput = {
  traineeProcessId: number;
  department: string;
  traineeName: string;
  process: string;
  competencySignOffDate: Date;
  assignedAssessor: string | null;
};

function cleanName(value: string | null) {
  const name = value?.trim();

  return name && name.toLowerCase() !== 'null' ? name : null;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const dayOfMonth = next.getDate();

  next.setMonth(next.getMonth() + months);

  if (next.getDate() !== dayOfMonth) {
    next.setDate(0);
  }

  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
}

export function refresherStatusForDueDate(dueDate: Date, today = new Date()) {
  const due = startOfDay(dueDate);
  const now = startOfDay(today);
  const dueThisMonthCutoff = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dueNextMonthCutoff = new Date(
    now.getFullYear(),
    now.getMonth() + 2,
    0,
  );

  if (due < now) {
    return 'Overdue';
  }

  if (due <= dueThisMonthCutoff) {
    return 'Due This Month';
  }

  if (due <= dueNextMonthCutoff) {
    return 'Due Next Month';
  }

  return 'Not Due Yet';
}

export function normalizeRefresherStatus(
  status: string,
  refresherDueDate: Date | null,
  today = new Date(),
) {
  if (status === 'Completed' || refresherDueDate === null) {
    return status;
  }

  return refresherStatusForDueDate(refresherDueDate, today);
}

export function isCompetentProcess(process: {
  stage: string;
  status: string;
  assessmentOutcome: string | null;
}) {
  return (
    process.status === 'Competent' ||
    process.stage === 'Competent' ||
    process.assessmentOutcome === 'Competent'
  );
}

export async function upsertCompetencyRefresher(
  transaction: PrismaTransactionClient,
  input: CompetencyRefresherInput,
) {
  const refresherDueDate = addMonths(input.competencySignOffDate, 12);
  const status = refresherStatusForDueDate(refresherDueDate);
  const current = await transaction.refresherRecord.findUnique({
    where: {
      traineeProcessId: input.traineeProcessId,
    },
    select: {
      assignedAssessor: true,
    },
  });
  const assignedAssessor =
    cleanName(current?.assignedAssessor ?? null) ||
    cleanName(input.assignedAssessor);

  return transaction.refresherRecord.upsert({
    where: {
      traineeProcessId: input.traineeProcessId,
    },
    update: {
      department: input.department,
      traineeName: input.traineeName,
      process: input.process,
      lastCompetencyDate: input.competencySignOffDate,
      refresherDueDate,
      status,
      assignedAssessor,
    },
    create: {
      traineeProcessId: input.traineeProcessId,
      department: input.department,
      traineeName: input.traineeName,
      process: input.process,
      lastCompetencyDate: input.competencySignOffDate,
      refresherDueDate,
      status,
      assignedAssessor,
    },
  });
}
