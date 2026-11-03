import type { CreateEssayInput, EssayRecord, EssayValidationErrors } from '../types/essay';
import { tokenize } from '../analysis/tokenize';

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

    if (essays.some((essay) => essay.title.trim().toLocaleLowerCase('en-US') === normalizedInput.title.toLocaleLowerCase('en-US'))) {
      throw new EssayValidationError({ title: 'This title is already used. Choose a unique title.' });
    }

    const timestamp = this.now().toISOString();
    const essay: EssayRecord = {
      id: this.createId(),
      ...normalizedInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

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
    return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: this.now().toISOString(), essays: this.listEssays() }, null, 2);
  }

  previewImport(serialized: string): ImportPreview {
    let parsed: unknown;
    try { parsed = JSON.parse(serialized); } catch { throw new Error('文件不是有效的 JSON 备份，现有作文未改变。'); }
    if (!parsed || typeof parsed !== 'object') throw new Error('请选择 DEEA 导出的备份文件。');
    const backup = parsed as Record<string, unknown>;
    if (backup.format !== BACKUP_FORMAT || backup.version !== 1 || !isEssayArray(backup.essays)) {
      throw new Error('备份格式、版本或作文记录无效；未导入任何内容。');
    }
    const snapshot = this.inspect();
    if (snapshot.issue === 'unavailable') throw new EssayStorageError('unavailable');
    if (snapshot.issue === 'corrupt' && !backup.essays.length) throw new Error('空备份不能恢复损坏的历史，请选择包含作文的备份。');
    const essays = [...snapshot.essays];
    let skipped = 0;
    let renamed = 0;
    for (const record of backup.essays) {
      if (essays.some((essay) => hasSameContent(essay, normalizeEssayInput(record)))) {
        skipped++;
        continue;
      }
      // An ID conflict never replaces an existing essay. Preserve both texts.
      let id = record.id;
      for (let suffix = 2; essays.some((essay) => essay.id === id); suffix++) id = `${record.id}-import-${suffix}`;
      let title = record.title.trim();
      for (let suffix = 2; essays.some((essay) => essay.title.trim().toLowerCase() === title.toLowerCase()); suffix++) {
        title = `${record.title.trim()} (imported ${suffix})`;
      }
      // A repeated import of a previously renamed conflict must also be idempotent.
      if (essays.some((essay) => essay.title.startsWith(`${record.title.trim()} (imported `)
        && essay.text === record.text && essay.writtenAt === record.writtenAt
        && essay.taskPrompt === (record.taskPrompt?.trim() || undefined))) {
        skipped++;
        continue;
      }
      if (title !== record.title.trim()) renamed++;
      essays.push({ ...record, ...normalizeEssayInput(record), id, title });
    }
    return { essays: essays.sort(compareEssaysNewestFirst), added: essays.length - snapshot.essays.length,
      skipped, renamed, restoring: snapshot.issue === 'corrupt', originalRaw: snapshot.raw };
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
  };
}

function hasSameContent(essay: EssayRecord, input: CreateEssayInput): boolean {
  return (
    essay.title === input.title &&
    essay.writtenAt === input.writtenAt &&
    essay.taskPrompt === input.taskPrompt &&
    essay.text === input.text
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
    && new Set(value.map((record) => record.id)).size === value.length;
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
