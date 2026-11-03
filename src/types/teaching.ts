export const DECISIONS = {
  keep: '保留：必要或恰当的表达',
  specific: '需要具体化',
  collocation: '搭配或语气待核查',
  grouping: '词形归并有误',
} as const;

export const CHECK_STATUSES = {
  revised: '修改稿中完成',
  transfer: '新任务中有恰当使用的证据',
  'needs-work': '仍需练习',
  'no-opportunity': '本次没有适用机会',
} as const;

export type EvidenceAnchor = { start: number; end: number; quote: string };
export type GoalCheck = {
  id: string;
  essayId: string;
  status: keyof typeof CHECK_STATUSES;
  evidence?: EvidenceAnchor;
  reason: string;
  reflection: string;
  createdAt: string;
  updatedAt: string;
};
export type LearningGoal = {
  instruction: string;
  practice: string;
  archived: boolean;
  checks: GoalCheck[];
};
export type TeachingNote = EvidenceAnchor & {
  id: string;
  lemma?: string;
  decision: keyof typeof DECISIONS;
  reason: string;
  goal?: LearningGoal;
  createdAt: string;
  updatedAt: string;
};
export type NoteInput = EvidenceAnchor & Pick<TeachingNote, 'decision' | 'reason' | 'lemma'> & {
  id?: string;
  goal?: Pick<LearningGoal, 'instruction' | 'practice'>;
};
export type CheckInput = Pick<GoalCheck, 'essayId' | 'status' | 'evidence' | 'reason' | 'reflection'>;
