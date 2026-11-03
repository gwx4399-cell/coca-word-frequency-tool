import type { EssayRecord } from '../types/essay';
import { CHECK_STATUSES, DECISIONS, type EvidenceAnchor } from '../types/teaching';
import { checkError, genreOf, learnerOf, taskOf } from '../teaching/workflow';

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const nonempty = (value: unknown) => typeof value === 'string' && !!value.trim();

export function validAnchor(value: unknown, text: string): value is EvidenceAnchor {
  if (!isObject(value)) return false;
  return Number.isInteger(value.start) && Number.isInteger(value.end)
    && Number(value.start) >= 0 && Number(value.end) > Number(value.start) && Number(value.end) <= text.length
    && typeof value.quote === 'string' && !!value.quote.trim() && text.slice(Number(value.start), Number(value.end)) === value.quote;
}

// Validate the complete graph before any write: no orphaned revisions or cross-student evidence.
export function validTeachingData(essays: EssayRecord[]): boolean {
  const byId = new Map(essays.map((essay) => [essay.id, essay]));
  for (const essay of essays) {
    for (const key of ['learnerId', 'taskId', 'genre', 'revisionOf'] as const) {
      if (essay[key] !== undefined && (typeof essay[key] !== 'string' || !essay[key]!.trim())) return false;
    }
    if (essay.draftKind !== undefined && !['original', 'revision', 'independent'].includes(essay.draftKind)) return false;
    if ((essay.draftKind === 'revision') !== !!essay.revisionOf) return false;
    if (essay.revisionOf) {
      const parent = byId.get(essay.revisionOf);
      if (!parent || learnerOf(parent) !== learnerOf(essay) || genreOf(parent) !== genreOf(essay)
        || taskOf(parent) !== taskOf(essay) || essay.writtenAt < parent.writtenAt) return false;
      const seen = new Set([essay.id]);
      let current: EssayRecord | undefined = parent;
      while (current) {
        if (seen.has(current.id)) return false;
        seen.add(current.id);
        current = current.revisionOf ? byId.get(current.revisionOf) : undefined;
      }
    }
    if (essay.notes === undefined) continue;
    if (!Array.isArray(essay.notes)) return false;
    const noteIds = new Set<string>();
    for (const note of essay.notes) {
      if (!isObject(note) || !nonempty(note.id) || noteIds.has(note.id as string) || !validAnchor(note, essay.text)
        || typeof note.decision !== 'string' || !Object.prototype.hasOwnProperty.call(DECISIONS, note.decision)
        || !nonempty(note.reason) || (note.lemma !== undefined && typeof note.lemma !== 'string')
        || !isDate(note.createdAt) || !isDate(note.updatedAt)) return false;
      noteIds.add(note.id as string);
      if (note.goal === undefined) continue;
      const goal = note.goal;
      if (!learnerOf(essay) || !isObject(goal) || !nonempty(goal.instruction) || typeof goal.practice !== 'string'
        || typeof goal.archived !== 'boolean' || !Array.isArray(goal.checks)) return false;
      const checkIds = new Set<string>();
      const targetIds = new Set<string>();
      for (const check of goal.checks) {
        if (!isObject(check) || !nonempty(check.id) || checkIds.has(check.id as string)
          || typeof check.essayId !== 'string' || targetIds.has(check.essayId)
          || typeof check.status !== 'string' || !Object.prototype.hasOwnProperty.call(CHECK_STATUSES, check.status)
          || !nonempty(check.reason) || typeof check.reflection !== 'string'
          || !isDate(check.createdAt) || !isDate(check.updatedAt)) return false;
        const target = byId.get(check.essayId);
        if (checkError(essay, target, check.status, essays)) return false;
        if (check.status !== 'no-opportunity' && !validAnchor(check.evidence, target!.text)) return false;
        if (check.evidence !== undefined && !validAnchor(check.evidence, target!.text)) return false;
        checkIds.add(check.id as string); targetIds.add(check.essayId);
      }
    }
  }
  return true;
}
