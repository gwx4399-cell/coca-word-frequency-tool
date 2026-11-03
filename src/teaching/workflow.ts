import type { EssayRecord } from '../types/essay';
import type { TeachingNote } from '../types/teaching';

export const GENRES = ['议论文 / Argument', '说明文 / Explanation', '叙事 / Narrative', '图表报告 / Report', '信件 / Letter', '学术论文 / Academic paper'];
export const learnerOf = (essay: EssayRecord) => essay.learnerId?.trim() || '';
export const genreOf = (essay: EssayRecord) => essay.genre?.trim() || '';
export const taskOf = (essay: EssayRecord) => essay.taskId?.trim() || '';
export const stageLabel = (essay: EssayRecord) => essay.revisionOf ? '修改稿' : essay.draftKind === 'independent' ? '新任务（独立写作）' : '原稿';

export function rootOf(essay: EssayRecord, essays: EssayRecord[]): EssayRecord {
  const visited = new Set<string>();
  let current = essay;
  while (current.revisionOf && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = essays.find((item) => item.id === current.revisionOf);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export function compareNewest(a: EssayRecord, b: EssayRecord): number {
  return b.writtenAt.localeCompare(a.writtenAt) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

export function comparisonCandidates(essays: EssayRecord[], learner: string, genre: string, mode: 'latest' | 'original'): EssayRecord[] {
  if (!learner || !genre) return [];
  const grouped = new Map<string, EssayRecord[]>();
  for (const essay of essays) {
    if (learnerOf(essay) !== learner || genreOf(essay) !== genre || (mode === 'original' && essay.revisionOf)) continue;
    const task = taskOf(essay) || rootOf(essay, essays).id;
    grouped.set(task, [...(grouped.get(task) ?? []), essay]);
  }
  return [...grouped.values()].map((group) => {
    if (mode === 'original') return group.sort(compareNewest)[group.length - 1];
    // A descendant takes precedence over its parent even when an imported timestamp ties.
    const leaves = group.filter((candidate) => !group.some((other) => isDescendant(other, candidate.id, essays)));
    return leaves.sort(compareNewest)[0];
  }).sort(compareNewest);
}

export function isDescendant(essay: EssayRecord, ancestorId: string, essays: EssayRecord[]): boolean {
  const seen = new Set<string>();
  let current: EssayRecord | undefined = essay;
  while (current?.revisionOf && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.revisionOf === ancestorId) return true;
    current = essays.find((item) => item.id === current!.revisionOf);
  }
  return false;
}

export type GoalEntry = { essay: EssayRecord; note: TeachingNote };
export function goalsFor(essays: EssayRecord[], learner: string, includeArchived = false): GoalEntry[] {
  if (!learner) return [];
  return essays.filter((essay) => learnerOf(essay) === learner).flatMap((essay) =>
    (essay.notes ?? []).filter((note) => note.goal && (includeArchived || !note.goal.archived)).map((note) => ({ essay, note })));
}

export function checkCandidates(source: EssayRecord, essays: EssayRecord[]): EssayRecord[] {
  return essays.filter((item) => item.id !== source.id && learnerOf(item) === learnerOf(source)
    && item.writtenAt >= source.writtenAt
    && (isDescendant(item, source.id, essays) || (item.draftKind === 'independent' && !item.revisionOf)));
}

export function checkError(source: EssayRecord, target: EssayRecord | undefined, status: string, essays: EssayRecord[]): string | null {
  if (!target || !checkCandidates(source, essays).some((item) => item.id === target.id)) return '请选择同一学生的后续修改稿或新的独立任务。';
  if (status === 'revised' && !isDescendant(target, source.id, essays)) return '“修改稿中完成”只能用于这篇作文的后续修改稿。';
  if (status === 'transfer' && (target.revisionOf || target.draftKind !== 'independent'
    || (taskOf(source) && taskOf(source) === taskOf(target)))) return '新任务证据必须来自另一任务的独立写作，不能使用本篇修改稿。';
  return null;
}
