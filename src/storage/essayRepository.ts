import type { CreateEssayInput, EssayRecord, EssayValidationErrors } from '../types/essay';

export const ESSAY_STORAGE_KEY = 'deea.essays.v1';

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
    private readonly storage: Storage = getBrowserStorage(),
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
    return this.readEssays().sort(compareEssaysNewestFirst);
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

  private readEssays(): EssayRecord[] {
    try {
      const serialized = this.storage.getItem(ESSAY_STORAGE_KEY);

      if (!serialized) {
        return [];
      }

      const parsed: unknown = JSON.parse(serialized);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isEssayRecord);
    } catch {
      return [];
    }
  }

  private writeEssays(essays: EssayRecord[]): void {
    this.storage.setItem(ESSAY_STORAGE_KEY, JSON.stringify(essays));
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
