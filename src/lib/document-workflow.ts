export const documentTypes = ['SOP', 'WI', 'Care Point', 'Visual Aid'] as const;
export const requestTypes = ['New Document', 'Update Existing Document'] as const;
export const priorities = ['Low', 'Normal', 'High', 'Urgent'] as const;

export const newDocumentStages = [
  'Request Received',
  'Planning / Scoping',
  'Drafting',
  'Internal Review',
  'H&S Review',
  'Requester Review',
  'Testing / Trial Period',
  'Submitted for Approval',
  'Ready for Launch',
  'Live',
] as const;

export const updateDocumentStages = [
  'Request Received',
  'Planning / Scoping',
  'Drafting',
  'Internal Review',
  'H&S Review',
  'Requester Review',
  'Submitted for Approval',
  'Ready for Launch',
  'Live',
] as const;

export const revisionStage = 'Revision Required';

export function workflowFor(requestType: string) {
  return requestType === 'New Document'
    ? [...newDocumentStages]
    : [...updateDocumentStages];
}

export function isValidStage(requestType: string, stage: string) {
  return stage === revisionStage || workflowFor(requestType).includes(stage as never);
}

export function nextStage(requestType: string, stage: string) {
  if (stage === revisionStage) return 'Drafting';
  const stages = workflowFor(requestType);
  const index = stages.indexOf(stage as never);
  return index >= 0 && index < stages.length - 1 ? stages[index + 1] : null;
}
