import { refresherRecords as baseRefresherRecords, traineeProcesses as baseProcesses, trainees as baseTrainees } from './mock-data';

export type TraineeRecord = {
  id: number;
  name: string;
  department: string;
  teamLeader: string;
  trainingAssessor: string;
  shift: string;
  startDate: string;
  archived?: boolean;
};

export type TraineeProcessRecord = {
  id: number;
  traineeId: number;
  trainee: string;
  department: string;
  process: string;
  stage: string;
  status?: string;
  nextAction: string;
  followUpFlag: string;
  trainingBuddy?: string;
  trainingStartDate?: string;
  lastCheckInDate?: string;
  readinessScore?: number;
  assessmentOutcome?: string;
  competencySignOffDate?: string;
  requestedBy?: string;
  riskAssessmentComplete?: boolean;
  sopComplete?: boolean;
  buddyFeedbackScore?: number;
  assessorObservationScore?: number;
  timeSpentInShifts?: number;
  createdAt?: string;
};

const traineeStorageKey = 'training-command-centre-trainees-v1';
const processStorageKey = 'training-command-centre-processes-v1';
const timelineStorageKey = 'training-command-centre-timeline-v1';
const refresherStorageKey = 'training-command-centre-refreshers-v1';

export type TimelineEvent = {
  id: number;
  traineeId: number;
  processId: number;
  process: string;
  eventType: string;
  date: string;
  description: string;
  user: string;
};

export type CheckInRecord = {
  id: number;
  traineeId: number;
  processId: number;
  checkInDate: string;
  assessor: string;
  progressSummary: string;
  issuesIdentified: string;
  supportRequired: string;
  nextAction: string;
  reviewDate: string;
};

export type RefresherRecord = {
  id: number;
  traineeId: number;
  trainee: string;
  department: string;
  process: string;
  lastCompetencyDate: string;
  refresherDueDate: string;
  status: string;
  daysUntilDue: number;
  assignedAssessor: string;
  completedDate?: string | null;
  outcome?: string;
};

const stageNextActionMap: Record<string, string> = {
  Requested: 'Complete RA, SOP and buddy allocation.',
  'Setup Complete': 'Verify training setup and buddy handover.',
  'In Training': 'Continue coaching and log check-in.',
  Monitoring: 'Chase buddy / colleague for progress update.',
  'Ready for Pre-Assessment': 'Schedule pre-assessment.',
  'Ready for Assessment': 'Schedule assessment.',
  'Assessment Passed - Sign Off': 'Complete sign-off and update records.',
  'Retraining Required': 'Reset plan and retrain gap areas.',
  Competent: 'Maintain standard and move to refresher tracking.',
};

function calculateReadinessScore(buddyFeedbackScore = 0, assessorObservationScore = 0, timeSpentInShifts = 0) {
  const behaviourScore = ((buddyFeedbackScore + assessorObservationScore) / 10) * 70;
  const shiftScore = Math.min(30, (Math.max(0, timeSpentInShifts) / 5) * 30);
  return Math.min(100, Math.round(behaviourScore + shiftScore));
}

function nextStageAction(stage: string) {
  return stageNextActionMap[stage] ?? 'Continue coaching and log check-in.';
}

function daysSince(dateValue?: string) {
  if (!dateValue) {
    return 0;
  }

  const current = new Date();
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((current.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)));
}

function calculateFollowUpFlag(process: TraineeProcessRecord) {
  if (process.stage === 'Competent') {
    return 'NONE';
  }

  const daysSinceCheckIn = daysSince(process.lastCheckInDate);
  const needsSetup = process.stage === 'Requested' && (!process.riskAssessmentComplete || !process.sopComplete || !process.trainingBuddy?.trim());
  const chaseFlag = process.stage === 'Monitoring' || (daysSinceCheckIn > 5 && process.stage !== 'Competent');
  const actionFlag = process.stage === 'Retraining Required';
  const prioritiseFlag = process.stage === 'Ready for Pre-Assessment' || process.stage === 'Ready for Assessment';
  const escalateFlag = (process.followUpFlag === 'CHASE' || process.followUpFlag === 'ACTION') && daysSinceCheckIn > 10;

  if (escalateFlag) {
    return 'ESCALATE';
  }
  if (actionFlag) {
    return 'ACTION';
  }
  if (prioritiseFlag) {
    return 'PRIORITISE';
  }
  if (chaseFlag) {
    return 'CHASE';
  }
  if (needsSetup) {
    return 'SET UP';
  }
  return 'NONE';
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadTraineeState() {
  const storedTrainees = readStored<TraineeRecord[]>(traineeStorageKey, []);
  const storedProcesses = readStored<TraineeProcessRecord[]>(processStorageKey, []);
  const storedTimeline = readStored<TimelineEvent[]>(timelineStorageKey, []);

  const mergedTrainees = [...baseTrainees, ...storedTrainees].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  const mergedProcesses = [...baseProcesses, ...storedProcesses].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

  return {
    trainees: mergedTrainees as TraineeRecord[],
    traineeProcesses: mergedProcesses as TraineeProcessRecord[],
    timeline: storedTimeline as TimelineEvent[],
  };
}

export function loadTimelineState() {
  return readStored<TimelineEvent[]>(timelineStorageKey, []);
}

export function loadRefresherState() {
  const stored = readStored<RefresherRecord[]>(refresherStorageKey, []);
  const merged = [...baseRefresherRecords, ...stored].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

  return merged as RefresherRecord[];
}

export function recordTimelineEvent(event: Omit<TimelineEvent, 'id'>) {
  const existing = loadTimelineState().some((item) => item.traineeId === event.traineeId && item.processId === event.processId && item.eventType === event.eventType && item.date === event.date && item.description === event.description);
  if (existing) {
    return loadTimelineState();
  }

  const next = [...loadTimelineState(), { id: Date.now(), ...event }];
  writeStored(timelineStorageKey, next);
  return next;
}

export function saveTraineeState(trainees: TraineeRecord[], traineeProcesses: TraineeProcessRecord[]) {
  writeStored(traineeStorageKey, trainees);
  writeStored(processStorageKey, traineeProcesses);
}

export function archiveTrainee(traineeId: number) {
  const current = loadTraineeState();
  const nextTrainees = current.trainees.map((item) => (item.id === traineeId ? { ...item, archived: true } : item));
  const nextProcesses = current.traineeProcesses.map((item) => (item.traineeId === traineeId ? { ...item, status: 'Archived' } : item));
  saveTraineeState(nextTrainees, nextProcesses);
  return { trainees: nextTrainees, traineeProcesses: nextProcesses };
}

export function addTrainee(trainee: TraineeRecord) {
  const current = loadTraineeState();
  const next = [...current.trainees, trainee];
  saveTraineeState(next, current.traineeProcesses);
  recordTimelineEvent({ traineeId: trainee.id, processId: 0, process: 'Trainee', eventType: 'Trainee created', date: trainee.startDate || new Date().toISOString().slice(0, 10), description: `Created trainee record for ${trainee.name}.`, user: 'System' });
  return next;
}

export function updateTrainee(trainee: TraineeRecord) {
  const current = loadTraineeState();
  const next = current.trainees.map((item) => (item.id === trainee.id ? trainee : item));
  saveTraineeState(next, current.traineeProcesses);
  return next;
}

export function addProcessAssignment(process: TraineeProcessRecord) {
  const current = loadTraineeState();
  const duplicate = current.traineeProcesses.some((item) => item.traineeId === process.traineeId && item.process === process.process && item.status !== 'Completed' && item.status !== 'Archived');
  if (duplicate) {
    return { ok: false, message: 'This trainee already has an active assignment for that process.' } as const;
  }

  const next = [...current.traineeProcesses, process];
  saveTraineeState(current.trainees, next);
  recordTimelineEvent({ traineeId: process.traineeId, processId: process.id, process: process.process, eventType: 'Process assigned', date: process.trainingStartDate || new Date().toISOString().slice(0, 10), description: `${process.trainee} assigned to ${process.process}.`, user: process.requestedBy || 'System' });
  return { ok: true, data: next } as const;
}

export function updateProcessAssignment(process: TraineeProcessRecord) {
  const current = loadTraineeState();
  const normalized = normalizeProcess(process);
  const next = current.traineeProcesses.map((item) => (item.id === normalized.id ? normalized : item));
  saveTraineeState(current.trainees, next);
  return next;
}

function normalizeProcess(process: TraineeProcessRecord) {
  const stage = process.stage ?? 'In Training';
  const nextAction = process.nextAction || nextStageAction(stage);
  const followUpFlag = calculateFollowUpFlag({ ...process, stage, nextAction });

  return {
    ...process,
    stage,
    status: stage === 'Competent' ? 'Competent' : process.status === 'Archived' ? 'Archived' : 'Active',
    nextAction,
    followUpFlag,
    readinessScore: calculateReadinessScore(process.buddyFeedbackScore, process.assessorObservationScore, process.timeSpentInShifts),
  };
}

export function updateProcessProgress(process: TraineeProcessRecord) {
  const current = loadTraineeState();
  const previous = current.traineeProcesses.find((item) => item.id === process.id);
  const normalized = normalizeProcess(process);
  const next = current.traineeProcesses.map((item) => (item.id === normalized.id ? normalized : item));
  saveTraineeState(current.trainees, next);

  if (previous && previous.stage !== normalized.stage) {
    recordTimelineEvent({ traineeId: normalized.traineeId, processId: normalized.id, process: normalized.process, eventType: 'Stage changed', date: normalized.lastCheckInDate || new Date().toISOString().slice(0, 10), description: `Stage changed from ${previous.stage} to ${normalized.stage}`, user: 'Trainer' });
  }

  if (normalized.stage === 'Competent') {
    recordTimelineEvent({ traineeId: normalized.traineeId, processId: normalized.id, process: normalized.process, eventType: 'Competency achieved', date: normalized.lastCheckInDate || new Date().toISOString().slice(0, 10), description: `Competency achieved for ${normalized.process}`, user: 'Trainer' });
    upsertRefresherRecord(normalized);
  }

  return normalized;
}

function upsertRefresherRecord(process: TraineeProcessRecord) {
  const current = loadRefresherState();
  const dueDate = process.trainingStartDate || new Date().toISOString().slice(0, 10);
  const record = {
    id: process.id,
    traineeId: process.traineeId,
    trainee: process.trainee,
    department: process.department,
    process: process.process,
    lastCompetencyDate: process.trainingStartDate || new Date().toISOString().slice(0, 10),
    refresherDueDate: dueDate,
    status: 'Due This Month',
    daysUntilDue: 30,
    assignedAssessor: process.requestedBy || 'Trainer',
    completedDate: null,
    outcome: 'Competent',
  };

  const next = current.some((item) => item.id === record.id) ? current.map((item) => (item.id === record.id ? record : item)) : [...current, record];
  writeStored(refresherStorageKey, next);
  return next;
}

export function addProcessCheckIn(processId: number, checkIn: CheckInRecord) {
  const current = loadTraineeState();
  const process = current.traineeProcesses.find((item) => item.id === processId);
  if (!process) {
    return null;
  }

  const nextProcesses = current.traineeProcesses.map((item) => item.id === processId ? { ...item, lastCheckInDate: checkIn.checkInDate, followUpFlag: checkIn.issuesIdentified ? 'CHASE' : item.followUpFlag, nextAction: checkIn.nextAction || item.nextAction } : item);
  saveTraineeState(current.trainees, nextProcesses);
  recordTimelineEvent({ traineeId: process.traineeId, processId, process: process.process, eventType: 'Check-in added', date: checkIn.checkInDate, description: `${checkIn.assessor}: ${checkIn.progressSummary}`, user: checkIn.assessor });
  return { process: nextProcesses.find((item) => item.id === processId), checkIn };
}
