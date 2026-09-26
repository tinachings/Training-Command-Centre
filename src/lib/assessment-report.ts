export const competencyOptions = [
  'Competent',
  'Development Required',
  'Not Observed',
] as const;

export const preAssessmentOutcomes = [
  'Ready for Assessment',
  'Further Development Required',
] as const;

export const assessmentOutcomes = [
  'Competent – Recommend Sign-Off',
  'Not Yet Competent – Retraining Required',
] as const;

export const nextActions = [
  'Proceed to Assessment',
  'Continue Development',
  'Retraining Required',
  'Recommend Sign-Off',
] as const;

export type CompetencyOutcome = (typeof competencyOptions)[number];
export type AssessmentType = 'Pre-Assessment' | 'Assessment';

export type CompetencyEvaluation = {
  safety: CompetencyOutcome;
  process: CompetencyOutcome;
  quality: CompetencyOutcome;
  operational: CompetencyOutcome;
  behavioural: CompetencyOutcome;
};

export type AssessmentReportDraft = {
  assessmentType: AssessmentType;
  teamLeader: string;
  colleagueName: string;
  department: string;
  process: string;
  assessmentDate: string;
  assessor: string;
  competency: CompetencyEvaluation;
  positiveObservations: string[];
  gapsIdentified: string[];
  developmentActions: string[];
  assessmentOutcome: string;
  nextAction: string;
  targetCompletionDate: string;
  assessmentSummary: string;
};

function cleanItems(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

export function competencySummary(evaluation: CompetencyEvaluation) {
  const entries: Array<[string, CompetencyOutcome]> = [
    ['safety', evaluation.safety],
    ['process', evaluation.process],
    ['quality', evaluation.quality],
    ['operational', evaluation.operational],
    ['behavioural', evaluation.behavioural],
  ];

  const competentAreas = entries
    .filter(([, outcome]) => outcome === 'Competent')
    .map(([area]) => area);
  const developmentAreas = entries
    .filter(([, outcome]) => outcome === 'Development Required')
    .map(([area]) => area);
  const notObservedAreas = entries
    .filter(([, outcome]) => outcome === 'Not Observed')
    .map(([area]) => area);

  return {
    competentAreas,
    developmentAreas,
    notObservedAreas,
  };
}

function naturalList(items: string[]) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function buildAssessmentSummary(draft: AssessmentReportDraft) {
  const competency = competencySummary(draft.competency);
  const observations = cleanItems(draft.positiveObservations);
  const gaps = cleanItems(draft.gapsIdentified);
  const actions = cleanItems(draft.developmentActions);

  const parts: string[] = [];

  if (competency.competentAreas.length === 5) {
    parts.push(
      `${draft.colleagueName} demonstrated competent performance across safety, process, quality, operational and behavioural competence areas.`,
    );
  } else {
    if (competency.competentAreas.length) {
      parts.push(
        `${draft.colleagueName} demonstrated competent performance in ${naturalList(
          competency.competentAreas,
        )}.`,
      );
    }

    if (competency.developmentAreas.length) {
      parts.push(
        `Development is required in ${naturalList(
          competency.developmentAreas,
        )}.`,
      );
    }

    if (competency.notObservedAreas.length) {
      parts.push(
        `${naturalList(
          competency.notObservedAreas,
        )} competence was not observed during this assessment.`,
      );
    }
  }

  if (observations.length) {
    parts.push(`Positive observations included ${naturalList(observations)}.`);
  }

  if (gaps.length) {
    parts.push(
      `The identified gaps were ${naturalList(
        gaps.map((item) => item.replace(/[.]+$/, '')),
      )}.`,
    );
  } else {
    parts.push('No significant competency gaps were identified.');
  }

  if (actions.length) {
    parts.push(
      `Development actions: ${naturalList(
        actions.map((item) => item.replace(/[.]+$/, '')),
      )}.`,
    );
  } else {
    parts.push('No development actions were required.');
  }

  parts.push(
    `Outcome: ${draft.assessmentOutcome}. Next action: ${draft.nextAction}.`,
  );

  return parts.join(' ');
}

export function buildTeamLeaderEmail(draft: AssessmentReportDraft) {
  const observations = cleanItems(draft.positiveObservations);
  const gaps = cleanItems(draft.gapsIdentified);
  const actions = cleanItems(draft.developmentActions);
  const competency = competencySummary(draft.competency);

  const competenceLine =
    competency.competentAreas.length === 5
      ? `${draft.colleagueName} demonstrated good safety, process, quality, operational and behavioural competence during the assessment.`
      : `${draft.colleagueName}'s competency evaluation was completed across safety, process, quality, operational and behavioural areas.`;

  const recommendation =
    draft.assessmentType === 'Pre-Assessment'
      ? draft.assessmentOutcome === 'Ready for Assessment'
        ? `I am happy to recommend ${draft.colleagueName} for assessment.`
        : `I recommend that ${draft.colleagueName} continues development before assessment.`
      : draft.assessmentOutcome === 'Competent – Recommend Sign-Off'
        ? `I am happy to recommend ${draft.colleagueName} for full sign-off.`
        : `${draft.colleagueName} is not yet ready for sign-off and requires further development or retraining.`;

  const sections: string[] = [
    `Hi ${draft.teamLeader || 'Team Leader'},`,
    '',
    draft.assessmentType === 'Pre-Assessment'
      ? `I've completed ${draft.colleagueName}'s pre-assessment for ${draft.process}.`
      : `I've completed ${draft.colleagueName}'s assessment for ${draft.process}.`,
    '',
    competenceLine,
  ];

  if (observations.length) {
    sections.push('', 'Positive observations:');
    observations.forEach((item) => sections.push(`• ${item}`));
  }

  if (gaps.length) {
    sections.push('', 'The following gaps were identified:');
    gaps.forEach((item) => sections.push(`• ${item}`));
  } else {
    sections.push('', 'No significant competency gaps were identified.');
  }

  if (actions.length) {
    sections.push('', 'Development actions:');
    actions.forEach((item) => sections.push(`• ${item}`));
  }

  sections.push(
    '',
    recommendation,
    '',
    'Please let me know if you require any further information.',
    '',
    'Kind regards,',
    '',
    draft.assessor,
  );

  return sections.join('\n');
}

export function recordOutcomeForDatabase(
  assessmentType: AssessmentType,
  assessmentOutcome: string,
) {
  if (assessmentType === 'Pre-Assessment') {
    return assessmentOutcome;
  }

  return assessmentOutcome === 'Competent – Recommend Sign-Off'
    ? 'Competent'
    : 'Not Yet Competent';
}

export function followUpRequired(
  assessmentType: AssessmentType,
  assessmentOutcome: string,
) {
  return assessmentType === 'Pre-Assessment'
    ? assessmentOutcome === 'Further Development Required'
    : assessmentOutcome === 'Not Yet Competent – Retraining Required';
}
