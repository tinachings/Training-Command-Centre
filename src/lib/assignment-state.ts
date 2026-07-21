export const activeAssignmentStatus = 'ACTIVE';
export const noLongerRequiredAssignmentStatus = 'NO_LONGER_REQUIRED';

export function isActiveAssignment(assignment: { assignmentStatus?: string | null }) {
  return (assignment.assignmentStatus ?? activeAssignmentStatus) === activeAssignmentStatus;
}

export function inactiveAssignmentMessage() {
  return 'This process is no longer required for this colleague.';
}
