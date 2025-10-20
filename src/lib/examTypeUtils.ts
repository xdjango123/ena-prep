export type ExamType = 'CM' | 'CMS' | 'CS';

const PLAN_NAME_TO_EXAM_TYPE: Record<string, ExamType> = {
  'PRÉPA CM': 'CM',
  'PRÉPA CMS': 'CMS',
  'PRÉPA CS': 'CS',
  'PRÉPARATION CM': 'CM',
  'PRÉPARATION CMS': 'CMS',
  'PRÉPARATION CS': 'CS',
  'PREPA CM': 'CM',
  'PREPA CMS': 'CMS',
  'PREPA CS': 'CS',
  'CM': 'CM',
  'CMS': 'CMS',
  'CS': 'CS'
};

/**
 * Map a human-readable plan name to a precise exam type.
 * Falls back to the provided default when no match is found.
 */
export const getExamTypeFromPlanName = (
  planName: string | null | undefined,
  defaultExamType: ExamType | null = null
): ExamType | null => {
  if (!planName) {
    return defaultExamType;
  }

  const normalized = planName.trim().toUpperCase();

  if (normalized in PLAN_NAME_TO_EXAM_TYPE) {
    return PLAN_NAME_TO_EXAM_TYPE[normalized];
  }

  // Handle exact pattern endings (e.g., "... CMS")
  if (normalized.endsWith(' CMS')) return 'CMS';
  if (normalized.endsWith(' CS')) return 'CS';
  if (normalized.endsWith(' CM')) return 'CM';

  return defaultExamType;
};
