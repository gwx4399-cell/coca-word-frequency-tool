// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { EssayRepository, ESSAY_STORAGE_KEY, BACKUP_FORMAT } from './essayRepository';
import { demoBackup } from '../teaching/demo';
import { comparisonCandidates, goalsFor } from '../teaching/workflow';
import { buildFeedbackHtml } from '../teaching/report';
import type { EssayRecord } from '../types/essay';

let repository: EssayRepository;
const sourceId = 'deea-demo-intermediate';
const revisionId = `${sourceId}-revision`;
const nextId = `${sourceId}-next`;
const noteId = `${sourceId}-note`;
beforeEach(() => { localStorage.clear(); repository = new EssayRepository(localStorage); });
afterEach(() => vi.restoreAllMocks());
function loadDemo() { repository.importBackup(demoBackup(), localStorage.getItem(ESSAY_STORAGE_KEY)); }
function records() { return JSON.parse(demoBackup()).essays as EssayRecord[]; }

describe('teaching data and evidence integrity', () => {
  it('keeps v1 records unassigned and readable without rewriting them', () => {
    const legacy = { id: 'legacy', title: 'Old work', text: 'A useful example.', writtenAt: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const raw = JSON.stringify([legacy]); localStorage.setItem(ESSAY_STORAGE_KEY, raw);
    expect(repository.listEssays()).toEqual([legacy]);
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBe(raw);
    expect(comparisonCandidates(repository.listEssays(), '', '', 'latest')).toEqual([]);
    repository.updateMetadata('legacy', { learnerId: 'A', genre: 'Argument', taskId: 'Task 1' });
    expect(repository.getEssay('legacy')).toMatchObject({ learnerId: 'A', text: legacy.text });
  });

  it('separates learners and genres and takes exactly one draft per task', () => {
    loadDemo();
    const essays = repository.listEssays();
    expect(comparisonCandidates(essays, '演示·表达拓展', '议论文 / Argument', 'latest').map((item) => item.id)).toEqual([nextId, revisionId]);
    expect(comparisonCandidates(essays, '演示·表达拓展', '议论文 / Argument', 'original').map((item) => item.id)).toEqual([nextId, sourceId]);
    expect(comparisonCandidates(essays, '演示·基础练习', '信件 / Letter', 'latest')).toEqual([]);
  });

  it('allows identical titles and content for different students without merging them', () => {
    const input = { title: 'Shared assignment', text: 'School meals help students.', writtenAt: '2026-10-01', genre: 'Argument', taskId: 'Meals' };
    repository.createEssay({ ...input, learnerId: 'A' }); repository.createEssay({ ...input, learnerId: 'B' });
    expect(repository.listEssays()).toHaveLength(2);
    const preview = repository.previewImport(repository.exportBackup());
    expect(preview).toMatchObject({ added: 0, skipped: 2 });
  });

  it('rejects forged anchors and limits concurrent goals while retaining archived history', () => {
    loadDemo();
    const source = repository.getEssay(sourceId)!;
    expect(() => repository.saveNote(source.id, { start: 0, end: 5, quote: 'forged', decision: 'keep', reason: 'reason' })).toThrow('原文');
    const input = { start: 0, end: 32, quote: source.text.slice(0, 32), decision: 'specific' as const, reason: 'Another useful point', goal: { instruction: 'Explain the reader benefit.', practice: 'Use a new example.' } };
    repository.saveNote(source.id, input);
    expect(() => repository.saveNote(source.id, input)).toThrow('最多两个');
    repository.setGoalArchived(source.id, noteId, true);
    expect(repository.getEssay(source.id)?.notes?.[0].goal?.checks).toHaveLength(1);
    repository.saveNote(source.id, input);
    expect(goalsFor(repository.listEssays(), source.learnerId!)).toHaveLength(2);
    expect(() => repository.setGoalArchived(source.id, noteId, false)).toThrow('两个');
  });

  it('requires manual contextual evidence and never turns absence into success', () => {
    loadDemo();
    const next = repository.getEssay(nextId)!;
    const input = { essayId: nextId, status: 'transfer' as const, reason: 'The sentence explains a specific benefit.', reflection: 'I explained how review helps.', evidence: { start: 0, end: next.text.length, quote: next.text } };
    expect(() => repository.saveGoalCheck(sourceId, noteId, { ...input, evidence: undefined })).toThrow('原句');
    expect(() => repository.saveGoalCheck(sourceId, noteId, { ...input, essayId: revisionId })).toThrow('独立写作');
    expect(() => repository.saveGoalCheck(sourceId, noteId, { ...input, essayId: 'deea-demo-foundation-next' })).toThrow('同一学生');
    expect(repository.getEssay(sourceId)?.notes?.[0].goal?.checks).toHaveLength(1);
    repository.saveGoalCheck(sourceId, noteId, input);
    repository.saveGoalCheck(sourceId, noteId, { essayId: nextId, status: 'no-opportunity', reason: 'A different teaching focus; no relevant opportunity.', reflection: '' });
    const checks = repository.getEssay(sourceId)!.notes![0].goal!.checks;
    expect(checks).toHaveLength(2);
    expect(checks.find((check) => check.essayId === nextId)).toMatchObject({ status: 'no-opportunity' });
    expect(checks.find((check) => check.essayId === nextId)?.evidence).toBeUndefined();
  });

  it('updates an entire revision family and blocks metadata changes that invalidate linked evidence', () => {
    loadDemo();
    repository.updateMetadata(sourceId, { learnerId: 'Renamed A', genre: '议论文 / Argument', taskId: 'Transport' });
    expect(repository.getEssay(revisionId)?.learnerId).toBe('Renamed A');
    expect(repository.getEssay(sourceId)?.notes?.[0].goal?.checks[0].essayId).toBe(revisionId);
    expect(() => repository.updateMetadata(sourceId, { learnerId: '', genre: 'Argument' })).toThrow('关联');
    expect(() => repository.deleteEssay(revisionId)).toThrow('学习核查');
    expect(() => repository.deleteEssay(sourceId)).toThrow('学习核查');
  });

  it('backs up all notes and checks, remaps ID conflicts and remains idempotent', () => {
    const original = records();
    localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify([{ ...original[0], learnerId: 'Unrelated student', notes: undefined, text: 'This existing source must stay.' }]));
    const preview = repository.previewImport(demoBackup());
    expect(preview).toMatchObject({ added: 9, notesAdded: 3 });
    repository.importBackup(demoBackup(), preview.originalRaw);
    const imported = repository.listEssays().find((essay) => essay.title === original[0].title && essay.learnerId === original[0].learnerId)!;
    expect(imported.id).not.toBe(original[0].id);
    expect(repository.getEssay(`${original[0].id}-revision`)?.revisionOf).toBe(imported.id);
    const again = repository.previewImport(demoBackup());
    expect(again).toMatchObject({ added: 0, skipped: 9, notesAdded: 0 });
    repository.importBackup(demoBackup(), again.originalRaw);
    const backup = repository.exportBackup();
    expect(JSON.parse(backup).version).toBe(2);
    localStorage.clear(); repository.importBackup(backup, null);
    expect(repository.listEssays()).toHaveLength(10);
    expect(repository.getEssay(sourceId)?.notes?.[0].goal?.checks).toHaveLength(1);
  });

  it('preserves conflicting note versions without duplicating essays or reimporting notes twice', () => {
    loadDemo();
    const changed = records(); changed.find((essay) => essay.id === sourceId)!.notes![0].reason = 'An alternative teacher decision.';
    const backup = JSON.stringify({ format: BACKUP_FORMAT, version: 2, essays: changed });
    const preview = repository.previewImport(backup);
    expect(preview).toMatchObject({ added: 0, skipped: 9, notesAdded: 1 });
    repository.importBackup(backup, preview.originalRaw);
    expect(repository.getEssay(sourceId)?.notes).toHaveLength(2);
    expect(repository.previewImport(backup).notesAdded).toBe(0);
  });

  it.each(['orphan', 'cycle', 'wrong-student', 'forged-evidence', 'invalid-status'])('rejects an invalid %s graph atomically', (kind) => {
    loadDemo(); const raw = localStorage.getItem(ESSAY_STORAGE_KEY);
    const changed = records(); const source = changed.find((essay) => essay.id === sourceId)!;
    const revision = changed.find((essay) => essay.id === revisionId)!;
    if (kind === 'orphan') revision.revisionOf = 'missing';
    if (kind === 'cycle') { source.revisionOf = revisionId; source.draftKind = 'revision'; }
    if (kind === 'wrong-student') revision.learnerId = 'Other';
    if (kind === 'forged-evidence') source.notes![0].goal!.checks[0].evidence!.quote = 'Not in the essay';
    if (kind === 'invalid-status') (source.notes![0].goal!.checks[0] as unknown as { status: string }).status = 'passed';
    expect(() => repository.previewImport(JSON.stringify({ format: BACKUP_FORMAT, version: 2, essays: changed }))).toThrow();
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBe(raw);
  });

  it('keeps both essays and teaching records unchanged on quota failure', () => {
    loadDemo(); const raw = localStorage.getItem(ESSAY_STORAGE_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    expect(() => repository.setGoalArchived(sourceId, noteId, true)).toThrow();
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBe(raw);
  });

  it('lets a teacher classify an imported original as independent without breaking revision links', () => {
    loadDemo();
    const source = repository.getEssay(sourceId)!;
    repository.updateMetadata(revisionId, { learnerId: source.learnerId, genre: source.genre, taskId: source.taskId, draftKind: 'independent' });
    expect(repository.getEssay(sourceId)?.draftKind).toBe('independent');
    expect(repository.getEssay(revisionId)?.draftKind).toBe('revision');
    expect(repository.getEssay(revisionId)?.revisionOf).toBe(sourceId);
  });

  it('exports a printable single-student report with escaped source text and explicit evidence status', () => {
    const essays = records();
    essays.find((essay) => essay.id === sourceId)!.notes![0].reason = '<script>alert(1)</script> & teacher reason';
    const html = buildFeedbackHtml('演示·表达拓展', essays);
    expect(html).toContain('修改稿中完成'); expect(html).toContain('学生说明');
    expect(html).not.toContain('School meals'); expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;'); expect(html).toContain('@page');
    expect(buildFeedbackHtml('演示·表达拓展', essays, revisionId)).toContain('说明具体影响，而不只说 important');
  });
});
