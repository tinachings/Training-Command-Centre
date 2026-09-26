import { NextResponse } from 'next/server';
import { getRefresherMeetingDepartment } from '@/lib/refresher-dashboard';
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

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function outcomeFromDescription(description: string) {
  const prefix = 'Outcome: ';

  return description.startsWith(prefix)
    ? description.slice(prefix.length).trim() || null
    : null;
}

export async function GET(request: Request) {
  const month = parseMonth(new URL(request.url).searchParams.get('month'));

  if (!month) {
    return NextResponse.json(
      { error: 'Month must use YYYY-MM format.' },
      { status: 400 },
    );
  }

  const [timelineCompletions, currentCompletions] = await Promise.all([
    prisma.timelineEvent.findMany({
      where: {
        eventType: 'Refresher Completed',
        date: {
          gte: month.start,
          lt: month.end,
        },
        traineeProcessId: {
          not: null,
        },
      },
      select: {
        id: true,
        traineeProcessId: true,
        process: true,
        date: true,
        description: true,
        user: true,
        trainee: {
          select: {
            id: true,
            name: true,
          },
        },
        traineeProcess: {
          select: {
            department: true,
            process: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          date: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    }),
    prisma.refresherRecord.findMany({
      where: {
        completedDate: {
          gte: month.start,
          lt: month.end,
        },
      },
      select: {
        id: true,
        traineeProcessId: true,
        department: true,
        traineeName: true,
        process: true,
        completedDate: true,
        outcome: true,
        assignedAssessor: true,
        traineeProcess: {
          select: {
            trainee: {
              select: {
                id: true,
                name: true,
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
      orderBy: [
        {
          completedDate: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    }),
  ]);

  type Completion = {
    traineeProcessId: number;
    traineeId: number;
    traineeName: string;
    department: string;
    process: string;
    completedDate: string;
    outcome: string | null;
    assessor: string | null;
  };

  const completions = new Map<string, Completion>();

  timelineCompletions.forEach((item) => {
    if (!item.traineeProcessId || !item.traineeProcess) {
      return;
    }

    const key = `${item.traineeProcessId}:${dateKey(item.date)}`;

    completions.set(key, {
      traineeProcessId: item.traineeProcessId,
      traineeId: item.trainee.id,
      traineeName: item.trainee.name,
      department: getRefresherMeetingDepartment(
        item.traineeProcess.department,
      ),
      process: item.process || item.traineeProcess.process.name,
      completedDate: item.date.toISOString(),
      outcome: outcomeFromDescription(item.description),
      assessor: item.user === 'Not Assigned' ? null : item.user,
    });
  });

  currentCompletions.forEach((item) => {
    if (!item.completedDate) {
      return;
    }

    const key = `${item.traineeProcessId}:${dateKey(item.completedDate)}`;

    completions.set(key, {
      traineeProcessId: item.traineeProcessId,
      traineeId: item.traineeProcess.trainee.id,
      traineeName:
        item.traineeProcess.trainee.name || item.traineeName,
      department: getRefresherMeetingDepartment(item.department),
      process: item.traineeProcess.process.name || item.process,
      completedDate: item.completedDate.toISOString(),
      outcome: item.outcome,
      assessor: item.assignedAssessor,
    });
  });

  const items = Array.from(completions.values()).sort(
    (left, right) =>
      right.completedDate.localeCompare(left.completedDate) ||
      left.traineeName.localeCompare(right.traineeName, undefined, {
        sensitivity: 'base',
      }) ||
      left.process.localeCompare(right.process, undefined, {
        sensitivity: 'base',
      }),
  );

  const departmentCounts = items.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.department] = (counts[item.department] || 0) + 1;
      return counts;
    },
    {},
  );

  return NextResponse.json({
    month: month.key,
    total: items.length,
    departmentCounts,
    completions: items,
  });
}
