import type { CreateEssayInput, EssayRecord, EssayValidationErrors } from '../types/essay';
import { tokenize } from '../analysis/tokenize';
import type { CheckInput, NoteInput } from '../types/teaching';
import type { EssayMetadata } from '../types/essay';
import { checkError, goalsFor, learnerOf, rootOf } from '../teaching/workflow';
import { validAnchor, validTeachingData } from './teachingValidation';

export const ESSAY_STORAGE_KEY = 'deea.essays.v1';
export const BACKUP_FORMAT = 'deea-essay-backup';

export type HistorySnapshot = {
  essays: EssayRecord[];
  issue: 'corrupt' | 'unavailable' | null;
  raw: string | null;
};

export type ImportPreview = {
  essays: EssayRecord[];
  added: number;
  skipped: number;
  renamed: number;
  restoring: boolean;
  originalRaw: string | null;
  notesAdded: number;
};

export class EssayStorageError extends Error {
  constructor(readonly kind: 'corrupt' | 'unavailable') {
    super(kind === 'corrupt'
      ? '历史数据读取失败，已暂停保存以保护原始内容。请先下载原始数据，再从有效备份恢复。'
      : '无法访问或写入浏览器存储。请保留正文并检查浏览器设置或剩余空间。');
    this.name = 'EssayStorageError';
  }
}

type EssayRepositoryOptions = {
  createId?: () => string;
  now?: () => Date;
};

export class EssayValidationError extends Error {
  readonly fieldErrors: EssayValidationErrors;

  constructor(fieldErrors: EssayValidationErrors) {
    super('Essay details are invalid.');
    this.name = 'EssayValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class EssayRepository {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly suppliedStorage?: Storage,
    options: EssayRepositoryOptions = {},
  ) {
    this.createId = options.createId ?? defaultCreateId;
    this.now = options.now ?? (() => new Date());
  }

  createEssay(input: CreateEssayInput): EssayRecord {
    const fieldErrors = validateEssayInput(input);

    if (Object.keys(fieldErrors).length > 0) {
      throw new EssayValidationError(fieldErrors);
    }

    const normalizedInput = normalizeEssayInput(input);
    const essays = this.listEssays();
    const duplicate = essays.find((essay) => hasSameContent(essay, normalizedInput));

    if (duplicate) {
      return duplicate;
    }

    if (essays.some((essay) => learnerOf(essay) === (normalizedInput.learnerId ?? '') && essay.title.trim().toLocaleLowerCase('en-US') === normalizedInput.title.toLocaleLowerCase('en-US'))) {
      throw new EssayValidationError({ title: 'This title is already used. Choose a unique title.' });
    }

    const timestamp = this.now().toISOString();
    const essay: EssayRecord = {
      id: this.createId(),
      ...normalizedInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (!validTeachingData([...essays, essay])) throw new Error('修改稿必须关联同一学生、文体和任务的原文，日期不能早于原文。请从历史作文创建修改稿。');
    this.writeEssays([...essays, essay]);
    return essay;
  }

  listEssays(): EssayRecord[] {
    const snapshot = this.inspect();
    if (snapshot.issue) throw new EssayStorageError(snapshot.issue);
    return snapshot.essays;
  }

  getEssay(id: string): EssayRecord | undefined {
    return this.listEssays().find((essay) => essay.id === id);
  }

  deleteEssay(id: string): boolean {
    const essays = this.listEssays();
    if (essays.some((essay) => essay.revisionOf === id || essay.notes?.some((note) => note.goal?.checks.some((check) => check.essayId === id)))
      || essays.find((essay) => essay.id === id)?.notes?.some((note) => note.goal?.checks.length)) {
      throw new Error('这篇作文关联了修改稿或学习核查，暂不能删除，以免失去原句证据。');
    }
    const remaining = essays.filter((essay) => essay.id !== id);

    if (remaining.length === essays.length) {
      return false;
    }

    this.writeEssays(remaining);
    return true;
  }

  inspect(): HistorySnapshot {
    let raw: string | null;
    try {
      raw = this.storage.getItem(ESSAY_STORAGE_KEY);
    } catch {
      return { essays: [], raw: null, issue: 'unavailable' };
    }
    if (raw === null) return { essays: [], raw, issue: null };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isEssayArray(parsed)) throw new Error('Invalid records');
      return { essays: parsed.sort(compareEssaysNewestFirst), raw, issue: null };
    } catch {
      return { essays: [], raw, issue: 'corrupt' };
    }
  }

  exportBackup(): string {
    return JSON.stringify({ format: BACKUP_FORMAT, version: 2, exportedAt: this.now().toISOString(), essays: this.listEssays() }, null, 2);
  }

  previewImport(serialized: string): ImportPreview {
    let parsed: unknown;
    try { parsed = JSON.parse(serialized); } catch { throw new Error('文件不是有效的 JSON 备份，现有作文未改变。'); }
    if (!parsed || typeof parsed !== 'object') throw new Error('请选择 DEEA 导出的备份文件。');
    const backup = parsed as Record<string, unknown>;
    if (backup.format !== BACKUP_FORMAT || (backup.version !== 1 && backup.version !== 2) || !isEssayArray(backup.essays)) {
      throw new Error('备份格式、版本或作文记录无效；未导入任何内容。');
    }
    const snapshot = this.inspect();
    if (snapshot.issue === 'unavailable') throw new EssayStorageError('unavailable');
    if (snapshot.issue === 'corrupt' && !backup.essays.length) throw new Error('空备份不能恢复损坏的历史，请选择包含作文的备份。');
    const essays = snapshot.essays.map((essay) => ({ ...essay, ...(essay.notes ? { notes: [...essay.notes] } : {}) }));
    let skipped = 0;
    let renamed = 0;
    let notesAdded = 0;
    const idMap = new Map<string, string>();
    const ordered: EssayRecord[] = [];
    const visit = (record: EssayRecord) => {
      if (ordered.includes(record)) return;
      if (record.revisionOf) visit((backup.essays as EssayRecord[]).find((item) => item.id === record.revisionOf)!);
      ordered.push(record);
    };
    backup.essays.forEach(visit);
    for (const record of ordered) {
      const input = normalizeEssayInput({ ...record, revisionOf: record.revisionOf ? idMap.get(record.revisionOf) : undefined });
      const duplicate = essays.find((essay) => hasSameContent(essay, input)
        || (essay.title.startsWith(`${record.title.trim()} (imported `) && hasSameContent(essay, { ...input, title: essay.title })));
      if (duplicate) {
        idMap.set(record.id, duplicate.id);
        skipped++;
        continue;
      }
      // An ID conflict never replaces an existing essay. Preserve both texts.
      let id = record.id;
      for (let suffix = 2; essays.some((essay) => essay.id === id); suffix++) id = `${record.id}-import-${suffix}`;
      let title = record.title.trim();
      for (let suffix = 2; essays.some((essay) => learnerOf(essay) === (input.learnerId ?? '') && essay.title.trim().toLowerCase() === title.toLowerCase()); suffix++) {
        title = `${record.title.trim()} (imported ${suffix})`;
      }
      if (title !== record.title.trim()) renamed++;
      idMap.set(record.id, id);
      essays.push({ ...record, ...input, id, title, notes: undefined });
    }
    // Remap the whole graph, including forward references in goal checks.
    // Conflicting notes are retained as separate versions, never silently overwritten.
    for (const record of ordered) {
      const target = essays.find((essay) => essay.id === idMap.get(record.id))!;
      for (const original of record.notes ?? []) {
        const note = { ...original, ...(original.goal ? { goal: { ...original.goal, checks: original.goal.checks.map((check) => ({ ...check, essayId: idMap.get(check.essayId)! })) } } : {}) };
        const notes = target.notes ?? [];
        if (notes.some((existing) => stableValue({ ...existing, id: '' }) === stableValue({ ...note, id: '' }))) continue;
        let id = note.id;
        for (let suffix = 2; notes.some((existing) => existing.id === id); suffix++) id = `${note.id}-import-${suffix}`;
        target.notes = [...notes, { ...note, id }];
        notesAdded++;
      }
    }
    if (!validTeachingData(essays)) throw new Error('备份中的修改关系或教学证据不完整，未导入任何内容。');
    return { essays: essays.sort(compareEssaysNewestFirst), added: essays.length - snapshot.essays.length,
      skipped, renamed, notesAdded, restoring: snapshot.issue === 'corrupt', originalRaw: snapshot.raw };
  }

  importBackup(serialized: string, expectedRaw: string | null): ImportPreview {
    const preview = this.previewImport(serialized);
    if (preview.originalRaw !== expectedRaw) throw new Error('历史在预览后已改变，请重新选择备份以核对导入结果。');
    if (preview.restoring) {
      // Preserve the exact damaged payload before replacing the active key.
      // If storage is full, this fails closed and the active history stays intact.
      try {
        this.storage.setItem(`deea.essays.recovery.${this.now().getTime()}.${defaultCreateId()}`, preview.originalRaw!);
      } catch { throw new EssayStorageError('unavailable'); }
    }
    this.writeEssays(preview.essays);
    return preview;
  }

  updateMetadata(id: string, metadata: Pick<EssayMetadata, 'learnerId' | 'genre' | 'taskId'> & { draftKind?: 'original' | 'independent' }): void {
    const essays = this.listEssays();
    const source = essays.find((essay) => essay.id === id);
    if (!source) throw new Error('作文已不存在，请刷新后重试。');
    const root = rootOf(source, essays).id;
    const updates = { learnerId: metadata.learnerId?.trim() || undefined, genre: metadata.genre?.trim() || undefined, taskId: metadata.taskId?.trim() || undefined };
    const next = essays.map((essay) => rootOf(essay, essays).id === root ? { ...essay, ...updates,
      ...(essay.id === root && metadata.draftKind ? { draftKind: metadata.draftKind } : {}), updatedAt: this.now().toISOString() } : essay);
    if (!validTeachingData(next)) throw new Error('此分组更改会使已有学习目标或跨篇证据失去关联，请保留原学生和任务。');
    this.writeEssays(next);
  }

  saveNote(essayId: string, input: NoteInput): void {
    const essays = this.listEssays();
    const essay = essays.find((item) => item.id === essayId);
    if (!essay || !validAnchor(input, essay.text)) throw new Error('请选择当前原文中的完整证据，正文未被改动。');
    if (!input.reason.trim()) throw new Error('请写下保留或修改这句的理由。');
    const previous = essay.notes?.find((note) => note.id === input.id);
    if (input.id && !previous) throw new Error('这条判断已改变，请重新打开。');
    if (previous?.goal && !input.goal) throw new Error('已有目标请使用“归档目标”保留核查记录。');
    if (input.goal && (!learnerOf(essay) || !input.goal.instruction.trim())) throw new Error('请先指定学生，并写下具体学习目标。');
    if (input.goal && !previous?.goal && goalsFor(essays, learnerOf(essay)).length >= 2) throw new Error('每位学生同时保留最多两个练习目标。请先归档已有目标，再新增。');
    const now = this.now().toISOString();
    const note = { ...input, id: previous?.id ?? this.createId(), reason: input.reason.trim(),
      createdAt: previous?.createdAt ?? now, updatedAt: now,
      goal: input.goal ? { instruction: input.goal.instruction.trim(), practice: input.goal.practice.trim(),
        checks: previous?.goal?.checks ?? [], archived: previous?.goal?.archived ?? false } : undefined };
    essay.notes = [...(essay.notes ?? []).filter((item) => item.id !== note.id), note];
    essay.updatedAt = now;
    if (!validTeachingData(essays)) throw new Error('教学判断的字段或原句证据无效，请核查后重试。');
    this.writeEssays(essays);
  }

  setGoalArchived(essayId: string, noteId: string, archived: boolean): void {
    const essays = this.listEssays();
    const essay = essays.find((item) => item.id === essayId);
    const note = essay?.notes?.find((item) => item.id === noteId);
    if (!essay || !note?.goal) throw new Error('未找到学习目标。');
    if (!archived && note.goal.archived && goalsFor(essays, learnerOf(essay)).length >= 2) throw new Error('请先归档一个目标，每位学生最多同时练习两个。');
    note.goal.archived = archived;
    note.updatedAt = this.now().toISOString();
    this.writeEssays(essays);
  }

  saveGoalCheck(essayId: string, noteId: string, input: CheckInput): void {
    const essays = this.listEssays();
    const source = essays.find((item) => item.id === essayId);
    const note = source?.notes?.find((item) => item.id === noteId);
    const target = essays.find((item) => item.id === input.essayId);
    if (!source || !note?.goal) throw new Error('未找到学习目标。');
    const error = checkError(source, target, input.status, essays);
    if (error) throw new Error(error);
    if (input.status !== 'no-opportunity' && !validAnchor(input.evidence, target!.text)) throw new Error('请选择后续作文中的原句作为核查证据。');
    if (!input.reason.trim()) throw new Error('请写下核查依据；次数变化不能代替判断。');
    const previous = note.goal.checks.find((check) => check.essayId === input.essayId);
    const now = this.now().toISOString();
    note.goal.checks = [...note.goal.checks.filter((check) => check.essayId !== input.essayId),
      { ...input, id: previous?.id ?? this.createId(), reason: input.reason.trim(), reflection: input.reflection.trim(), createdAt: previous?.createdAt ?? now, updatedAt: now }];
    note.updatedAt = now;
    if (!validTeachingData(essays)) throw new Error('核查内容无效，请重新选择原句和状态。');
    this.writeEssays(essays);
  }

  private get storage(): Storage {
    return this.suppliedStorage ?? getBrowserStorage();
  }

  private writeEssays(essays: EssayRecord[]): void {
    try { this.storage.setItem(ESSAY_STORAGE_KEY, JSON.stringify(essays)); }
    catch { throw new EssayStorageError('unavailable'); }
  }
}

export function validateEssayInput(input: CreateEssayInput): EssayValidationErrors {
  const errors: EssayValidationErrors = {};

  if (!input.title.trim()) {
    errors.title = 'Title is required.';
  }

  if (!isValidWrittenDate(input.writtenAt.trim())) {
    errors.writtenAt = 'Enter a valid writing date.';
  }

  if (!input.text.trim()) {
    errors.text = 'Essay text is required.';
  } else if (tokenize(input.text).length === 0) {
    errors.text = '请输入包含英文单词的作文；当前内容没有可分析的英文词语。';
  }

  return errors;
}

export function isValidWrittenDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeEssayInput(input: CreateEssayInput): CreateEssayInput {
  const taskPrompt = input.taskPrompt?.trim();

  return {
    title: input.title.trim(),
    writtenAt: input.writtenAt.trim(),
    taskPrompt: taskPrompt || undefined,
    text: input.text,
    ...(input.learnerId?.trim() ? { learnerId: input.learnerId.trim() } : {}),
    ...(input.genre?.trim() ? { genre: input.genre.trim() } : {}),
    ...(input.taskId?.trim() ? { taskId: input.taskId.trim() } : {}),
    ...(input.draftKind ? { draftKind: input.draftKind } : {}),
    ...(input.revisionOf ? { revisionOf: input.revisionOf } : {}),
  };
}

function hasSameContent(essay: EssayRecord, input: CreateEssayInput): boolean {
  return (
    essay.title === input.title &&
    essay.writtenAt === input.writtenAt &&
    essay.taskPrompt === input.taskPrompt &&
    essay.text === input.text
    && (essay.learnerId ?? '') === (input.learnerId ?? '')
    && (essay.genre ?? '') === (input.genre ?? '')
    && (essay.taskId ?? '') === (input.taskId ?? '')
    && (essay.draftKind ?? 'original') === (input.draftKind ?? 'original')
    && essay.revisionOf === input.revisionOf
  );
}

function compareEssaysNewestFirst(a: EssayRecord, b: EssayRecord): number {
  const writtenAtComparison = b.writtenAt.localeCompare(a.writtenAt);

  if (writtenAtComparison !== 0) {
    return writtenAtComparison;
  }

  const createdAtComparison = b.createdAt.localeCompare(a.createdAt);
  return createdAtComparison !== 0 ? createdAtComparison : a.id.localeCompare(b.id);
}

function isEssayRecord(value: unknown): value is EssayRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.title === 'string' &&
    record.title.trim().length > 0 &&
    typeof record.writtenAt === 'string' &&
    isValidWrittenDate(record.writtenAt) &&
    (record.taskPrompt === undefined || typeof record.taskPrompt === 'string') &&
    typeof record.text === 'string' &&
    record.text.trim().length > 0 &&
    typeof record.createdAt === 'string' &&
    !Number.isNaN(Date.parse(record.createdAt)) &&
    typeof record.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(record.updatedAt))
  );
}

function isEssayArray(value: unknown): value is EssayRecord[] {
  return Array.isArray(value) && value.every(isEssayRecord)
    && new Set(value.map((record) => record.id)).size === value.length && validTeachingData(value);
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function defaultCreateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `essay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getBrowserStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Browser storage is unavailable.');
  }

  return window.localStorage;
}
