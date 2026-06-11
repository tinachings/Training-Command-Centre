const surfaceProcesses = ['Lens Inspection', 'Rejects/Reworks', 'Auto Blocking', 'Manual Blocking', 'A&R Machines', 'Button Collection', 'Dispatch'];
const coatingProcesses = ['Loading', 'Unloading', 'Tinting', 'Tray Allocation', 'ARX', 'Stripping', 'Final Inspection'];

const traineeNames = ['Daniel', 'Feyi', 'Louie', 'Grzegorz', 'Olga', 'Kasia', 'Marta', 'James', 'Nia', 'Tom', 'Asha', 'Ben', 'Carmen', 'Dylan', 'Ella', 'Hugo', 'Imran', 'Jade', 'Kian', 'Lena'];

const stageOptions = ['Requested', 'Setup Complete', 'In Training', 'Monitoring', 'Ready for Pre-Assessment', 'Ready for Assessment', 'Assessment Passed - Sign Off', 'Retraining Required', 'Competent'];
const activityTypes = ['New Training', 'Pre-Assessment', 'Assessment', 'Refresher'];
const plannerStatus = ['Planned', 'Completed', 'Deferred', 'Not Completed', 'Carry Over'];
const refresherStatuses = ['Overdue', 'Due This Week', 'Due This Month', 'Due Next Month', 'Completed'];

const departments = [
  { id: 1, name: 'Surfacing' },
  { id: 2, name: 'Coating' },
];

const processes = [
  ...surfaceProcesses.map((name, index) => ({ id: index + 1, department: 'Surfacing', name })),
  ...coatingProcesses.map((name, index) => ({ id: index + 8, department: 'Coating', name })),
];

const trainees = traineeNames.map((name, index) => ({
  id: index + 1,
  name,
  department: index % 2 === 0 ? 'Surfacing' : 'Coating',
  archived: false,
  teamLeader: index % 3 === 0 ? 'M. Patel' : 'S. Morris',
  trainingAssessor: index % 2 === 0 ? 'J. Evans' : 'A. Green',
  shift: index % 2 === 0 ? 'Days' : 'Nights',
  startDate: `2026-0${(index % 5) + 1}-0${(index % 9) + 1}`,
}));

const traineeProcesses = trainees.flatMap((trainee, traineeIndex) => {
  const deptProcesses = trainee.department === 'Surfacing' ? surfaceProcesses : coatingProcesses;
  return deptProcesses.slice(0, 2 + (traineeIndex % 2)).map((processName, processIndex) => {
    const stage = stageOptions[(traineeIndex + processIndex) % stageOptions.length];
    const readiness = Math.min(100, 55 + ((traineeIndex * 3 + processIndex * 7) % 40));
    return {
      id: traineeIndex * 10 + processIndex + 1,
      traineeId: trainee.id,
      trainee: trainee.name,
      department: trainee.department,
      process: processName,
      stage,
      nextAction: stage === 'Ready for Assessment' ? 'Schedule assessment' : stage === 'Retraining Required' ? 'Reset and retrain gap areas' : 'Continue coaching and log check-in',
      followUpFlag: stage === 'Monitoring' || stage === 'Ready for Assessment' ? 'CHASE' : stage === 'Retraining Required' ? 'ACTION' : 'NONE',
      buddyFeedback: 3 + ((traineeIndex + processIndex) % 3),
      assessorObservation: 3 + ((traineeIndex + processIndex + 1) % 3),
      shifts: 4 + ((traineeIndex + processIndex) % 6),
      readiness,
      preAssessmentDate: '2026-06-10',
      assessmentDate: '2026-06-18',
      competencyDate: '2026-06-20',
      lastCheckIn: '2026-06-03',
      trainingBuddy: traineeIndex % 2 === 0 ? 'T. Reed' : 'L. Mason',
      trainingStartDate: '2026-06-01',
      lastCheckInDate: '2026-06-03',
      assessmentOutcome: stage === 'Competent' ? 'Competent' : 'In Progress',
      competencySignOffDate: stage === 'Competent' ? '2026-06-20' : null,
      status: stage === 'Competent' ? 'Competent' : 'Active',
      requestedBy: trainee.teamLeader,
    };
  });
});

const weeklyPlannerItems = Array.from({ length: 30 }, (_, index) => {
  const record = traineeProcesses[index % traineeProcesses.length];
  const status = plannerStatus[index % plannerStatus.length];
  const activity = activityTypes[index % activityTypes.length];
  return {
    id: index + 1,
    weekCommencing: index % 3 === 0 ? '2026-06-01' : '2026-06-08',
    plannedDate: `2026-06-${(index % 28) + 1}`.padStart(10, '0'),
    department: record.department,
    trainee: record.trainee,
    process: record.process,
    activityType: activity,
    owner: record.department === 'Surfacing' ? 'J. Evans' : 'A. Green',
    status,
    followUpRequired: status === 'Deferred' || status === 'Not Completed',
  };
});

const assessmentRecords = Array.from({ length: 20 }, (_, index) => {
  const record = traineeProcesses[index % traineeProcesses.length];
  const type = index % 2 === 0 ? 'Pre-Assessment' : 'Assessment';
  return {
    id: index + 1,
    date: `2026-06-${(index % 28) + 1}`.padStart(10, '0'),
    department: record.department,
    trainee: record.trainee,
    process: record.process,
    assessmentType: type,
    outcome: type === 'Assessment' ? (index % 3 === 0 ? 'Competent' : 'Not Yet Competent') : (index % 2 === 0 ? 'Pass' : 'Development Required'),
    assessor: record.department === 'Surfacing' ? 'J. Evans' : 'A. Green',
    strengths: 'Good practical application and attention to detail',
    developmentAreas: 'Improve handover and timing',
    finalOutcome: type === 'Assessment' ? 'Competent' : 'Pass',
  };
});

const refresherRecords = Array.from({ length: 25 }, (_, index) => {
  const record = traineeProcesses[index % traineeProcesses.length];
  const status = refresherStatuses[index % refresherStatuses.length];
  return {
    id: index + 1,
    department: record.department,
    trainee: record.trainee,
    process: record.process,
    lastCompetencyDate: '2026-05-15',
    refresherDueDate: index % 4 === 0 ? '2026-06-05' : index % 4 === 1 ? '2026-06-12' : index % 4 === 2 ? '2026-06-20' : '2026-07-04',
    status,
    daysUntilDue: 2 + (index % 8),
    assignedAssessor: record.department === 'Surfacing' ? 'J. Evans' : 'A. Green',
    completedDate: status === 'Completed' ? '2026-06-02' : null,
    outcome: status === 'Completed' ? 'Completed' : 'Pending',
  };
});

export const departmentSummary = [
  { name: 'Surfacing', active: traineeProcesses.filter((item) => item.department === 'Surfacing').length, competent: 6, chase: 4, ready: 3 },
  { name: 'Coating', active: traineeProcesses.filter((item) => item.department === 'Coating').length, competent: 5, chase: 2, ready: 4 },
];

export const pipelineItems = traineeProcesses.slice(0, 8);
export const weeklyPlanner = weeklyPlannerItems.slice(0, 8);
export const refresherItems = refresherRecords.slice(0, 8);
export { departments, processes, trainees, traineeProcesses, weeklyPlannerItems, assessmentRecords, refresherRecords };
