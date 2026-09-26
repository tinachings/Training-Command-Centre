import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function monthKeyFromDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function parseMonth(value: string | null) {
  const month = value || monthKeyFromDate(new Date());

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split('-').map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  return {
    key: month,
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export async function GET(request: Request) {
  const month = parseMonth(new URL(request.url).searchParams.get('month'));

  if (!month) {
    return NextResponse.json(
      { error: 'Month must use YYYY-MM format.' },
      { status: 400 },
    );
  }

  const assignments = await prisma.traineeProcess.findMany({
    where: {
      trainingStartDate: {
        gte: month.start,
        lt: month.end,
      },
    },
    select: {
      id: true,
      traineeId: true,
      department: true,
      trainingStartDate: true,
      trainingBuddy: true,
      assignedAssessor: true,
      assignmentStatus: true,
      trainee: {
        select: {
          name: true,
          trainingAssessor: true,
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
    orderBy: [
      {
        trainingStartDate: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  const items = assignments
    .filter((item) => item.trainingStartDate)
    .map((item) => ({
      traineeProcessId: item.id,
      traineeId: item.traineeId,
      traineeName: item.trainee.name,
      departmentName: item.trainee.department.name || item.department,
      processName: item.process.name,
      trainingStartDate: item.trainingStartDate!.toISOString(),
      trainingBuddy: item.trainingBuddy,
      trainingAssessor:
        item.assignedAssessor || item.trainee.trainingAssessor || null,
      assignmentStatus: item.assignmentStatus,
    }));

  const departmentCounts = items.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.departmentName] = (counts[item.departmentName] || 0) + 1;
      return counts;
    },
    {},
  );

  return NextResponse.json({
    month: month.key,
    total: items.length,
    departmentCounts,
    trainings: items,
  });
}
