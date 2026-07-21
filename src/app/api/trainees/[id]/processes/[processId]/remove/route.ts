import { NextResponse } from 'next/server';
import {
  activeAssignmentStatus,
  inactiveAssignmentMessage,
  noLongerRequiredAssignmentStatus,
} from '@/lib/assignment-state';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
    processId: string;
  }>;
};

type RemoveReason = 'ASSIGNED_BY_MISTAKE' | 'NO_LONGER_REQUIRED';

const reviewedPlannerStatuses = [
  'Completed',
  'Deferred',
  'Not Completed',
  'Carry Over',
];

const safePlannerStatuses = ['Planned', 'Scheduled', 'Requested'];
const safeTimelineEvents = [
  'Process assigned',
  'Competency sign-off recorded',
];

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeReason(value: unknown): RemoveReason | null {
  return value === 'ASSIGNED_BY_MISTAKE' || value === 'NO_LONGER_REQUIRED'
    ? value
    : null;
}

function nonEmptyText(value: unknown) {
  return String(value ?? '').trim();
}

function meaningfulAssessmentOutcome(value: string | null) {
  return value !== null && value !== 'In Progress';
}

function buildMistakePreflight(assignment: {
  preAssessmentDate: Date | null;
  preAssessmentOutcome: string | null;
  assessmentDate: Date | null;
  assessmentOutcome: string | null;
  competencySignOffDate: Date | null;
  trainingHoursEntries: Array<{ id: number }>;
  checkIns: Array<{ id: number }>;
  assessmentRecords: Array<{ id: number }>;
  followUpActions: Array<{ id: number }>;
  weeklyPlannerItems: Array<{ id: number; status: string }>;
  refresherRecord: { id: number } | null;
  timelineEvents: Array<{ id: number; eventType: string }>;
}) {
  const blockingDependencies: Array<{ type: string; count: number }> = [];
  const addBlock = (type: string, count: number) => {
    if (count > 0) {
      blockingDependencies.push({ type, count });
    }
  };

  addBlock('Training hours', assignment.trainingHoursEntries.length);
  addBlock('Check-ins', assignment.checkIns.length);
  addBlock('Assessment records', assignment.assessmentRecords.length);
  addBlock('Follow-up actions', assignment.followUpActions.length);
  addBlock('Refresher record', assignment.refresherRecord ? 1 : 0);
  addBlock(
    'Reviewed planner history',
    assignment.weeklyPlannerItems.filter((item) =>
      reviewedPlannerStatuses.includes(item.status),
    ).length,
  );
  addBlock(
    'Unrecognised planner history',
    assignment.weeklyPlannerItems.filter(
      (item) =>
        !reviewedPlannerStatuses.includes(item.status) &&
        !safePlannerStatuses.includes(item.status),
    ).length,
  );
  addBlock(
    'Actual assessment data',
    [
      assignment.preAssessmentDate,
      assignment.preAssessmentOutcome,
      assignment.assessmentDate,
      meaningfulAssessmentOutcome(assignment.assessmentOutcome)
        ? assignment.assessmentOutcome
        : null,
    ].filter(Boolean).length,
  );
  addBlock('Competency sign-off', assignment.competencySignOffDate ? 1 : 0);

  const unsafeTimelineEvents = assignment.timelineEvents.filter(
    (event) => !safeTimelineEvents.includes(event.eventType),
  );
  addBlock('Timeline history', unsafeTimelineEvents.length);

  const safeCleanup = {
    timelineEvents: assignment.timelineEvents.filter((event) =>
      safeTimelineEvents.includes(event.eventType),
    ).length,
    weeklyPlannerItems: assignment.weeklyPlannerItems.filter(
      (item) => safePlannerStatuses.includes(item.status),
    ).length,
  };

  return {
    allowed: blockingDependencies.length === 0,
    blockingDependencies,
    safeCleanup,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  return previewRemoval(context);
}

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const traineeId = parseId(params.id);
  const processId = parseId(params.processId);

  if (!traineeId || !processId) {
    return NextResponse.json(
      { error: 'Invalid trainee or process id.' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const reason = normalizeReason(body.reason);
  const note = nonEmptyText(body.note);
  const user = nonEmptyText(body.user) || 'System';

  if (!reason) {
    return NextResponse.json(
      { error: 'Removal reason is required.' },
      { status: 400 },
    );
  }

  if (reason === 'NO_LONGER_REQUIRED' && !note) {
    return NextResponse.json(
      { error: 'A removal note is required.' },
      { status: 400 },
    );
  }

  const assignment = await prisma.traineeProcess.findFirst({
    where: {
      id: processId,
      traineeId,
    },
    include: {
      trainee: true,
      process: true,
      trainingHoursEntries: { select: { id: true } },
      checkIns: { select: { id: true } },
      assessmentRecords: { select: { id: true } },
      followUpActions: { select: { id: true } },
      weeklyPlannerItems: {
        select: {
          id: true,
          status: true,
        },
      },
      refresherRecord: { select: { id: true } },
      timelineEvents: {
        select: {
          id: true,
          eventType: true,
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this colleague.' },
      { status: 404 },
    );
  }

  if (assignment.assignmentStatus !== activeAssignmentStatus) {
    return NextResponse.json(
      { error: inactiveAssignmentMessage() },
      { status: 409 },
    );
  }

  if (reason === 'ASSIGNED_BY_MISTAKE') {
    const preflight = buildMistakePreflight(assignment);

    if (!preflight.allowed) {
      return NextResponse.json(
        {
          error:
            'This assignment has training or competency history and cannot be permanently deleted.',
          recommendation: 'Use No Longer Required to preserve the history.',
          ...preflight,
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.timelineEvent.deleteMany({
        where: {
          traineeProcessId: assignment.id,
          eventType: {
            in: safeTimelineEvents,
          },
        },
      });

      await transaction.weeklyPlannerItem.deleteMany({
        where: {
          traineeProcessId: assignment.id,
          status: {
            in: safePlannerStatuses,
          },
        },
      });

      await transaction.traineeProcess.delete({
        where: {
          id: assignment.id,
        },
      });
    });

    return NextResponse.json({
      removed: true,
      reason,
      message: 'The mistaken assignment was permanently removed.',
      preflight,
    });
  }

  const removalDate = new Date();

  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.weeklyPlannerItem.deleteMany({
      where: {
        traineeProcessId: assignment.id,
        status: {
          in: safePlannerStatuses,
        },
      },
    });

    if (assignment.refresherRecord) {
      await transaction.refresherRecord.update({
        where: {
          id: assignment.refresherRecord.id,
        },
        data: {
          scheduledRefresherDate: null,
          scheduleStatus: null,
        },
      });
    }

    const traineeProcess = await transaction.traineeProcess.update({
      where: {
        id: assignment.id,
      },
      data: {
        assignmentStatus: noLongerRequiredAssignmentStatus,
        removedAt: removalDate,
        removalNote: note,
        removedBy: user,
        nextAction: null,
        followUpFlag: 'NONE',
        scheduledPreAssessmentDate: null,
        scheduledAssessmentDate: null,
        readyForPreAssessment: false,
        timelineEvents: {
          create: {
            traineeId,
            process: assignment.process.name,
            eventType: 'Process marked no longer required',
            date: removalDate,
            description: `${assignment.process.name} marked no longer required. Reason: ${note}`,
            user,
          },
        },
      },
      include: {
        process: true,
      },
    });

    return traineeProcess;
  });

  return NextResponse.json({
    removed: true,
    reason,
    assignment: updated,
    message: 'The process was marked no longer required and history was preserved.',
  });
}

async function previewRemoval(context: RouteContext) {
  const params = await context.params;
  const traineeId = parseId(params.id);
  const processId = parseId(params.processId);

  if (!traineeId || !processId) {
    return NextResponse.json(
      { error: 'Invalid trainee or process id.' },
      { status: 400 },
    );
  }

  const assignment = await prisma.traineeProcess.findFirst({
    where: {
      id: processId,
      traineeId,
    },
    include: {
      trainingHoursEntries: { select: { id: true } },
      checkIns: { select: { id: true } },
      assessmentRecords: { select: { id: true } },
      followUpActions: { select: { id: true } },
      weeklyPlannerItems: {
        select: {
          id: true,
          status: true,
        },
      },
      refresherRecord: { select: { id: true } },
      timelineEvents: {
        select: {
          id: true,
          eventType: true,
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: 'Process assignment not found for this colleague.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    assignmentStatus: assignment.assignmentStatus,
    assignedByMistake: buildMistakePreflight(assignment),
  });
}
