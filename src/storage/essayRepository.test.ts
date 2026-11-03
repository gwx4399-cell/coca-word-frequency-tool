import { describe, expect, it } from 'vitest';
import { analyzeEssay } from '../analysis/analyzeEssay';
import { parseCocaCsv } from '../analysis/coca';
import type { CreateEssayInput } from '../types/essay';
import {
  ESSAY_STORAGE_KEY,
  EssayRepository,
  EssayValidationError,
  EssayStorageError,
} from './essayRepository';

const validInput: CreateEssayInput = {
  title: 'My first essay',
  writtenAt: '2026-07-23',
  taskPrompt: 'Discuss a meaningful decision.',
  text: 'I decided to care, and I am caring.',
};

describe('EssayRepository', () => {
  it('round-trips an EssayRecord through storage', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    const created = repository.createEssay(validInput);

    expect(new EssayRepository(storage).getEssay(created.id)).toEqual(created);
    expect(created).toEqual({
      id: 'essay-1',
      ...validInput,
      createdAt: '2026-07-23T12:00:00.000Z',
      updatedAt: '2026-07-23T12:00:00.000Z',
    });
  });

  it('sorts multiple essays by writing date from newest to oldest', () => {
    const repository = createRepository(new MemoryStorage());

    repository.createEssay({ ...validInput, title: 'Middle', writtenAt: '2026-06-10' });
    repository.createEssay({ ...validInput, title: 'Oldest', writtenAt: '2025-12-01' });
    repository.createEssay({ ...validInput, title: 'Newest', writtenAt: '2026-07-20' });

    expect(repository.listEssays().map((essay) => essay.title)).toEqual(['Newest', 'Middle', 'Oldest']);
  });

  it('deletes only the specified record', () => {
    const repository = createRepository(new MemoryStorage());
    const first = repository.createEssay(validInput);
    const second = repository.createEssay({ ...validInput, title: 'Another essay' });

    expect(repository.deleteEssay(first.id)).toBe(true);
    expect(repository.listEssays()).toEqual([second]);
    expect(repository.deleteEssay('missing')).toBe(false);
  });

  it('reports corrupted history and blocks writes without losing the original payload', () => {
    const storage = new MemoryStorage();
    storage.setItem(ESSAY_STORAGE_KEY, '{not valid JSON');

    const repository = new EssayRepository(storage);
    expect(repository.inspect().issue).toBe('corrupt');
    expect(() => repository.listEssays()).toThrow(EssayStorageError);
    expect(() => repository.createEssay(validInput)).toThrow(EssayStorageError);
    expect(() => repository.deleteEssay('essay-1')).toThrow(EssayStorageError);
    expect(() => repository.exportBackup()).toThrow(EssayStorageError);
    expect(storage.getItem(ESSAY_STORAGE_KEY)).toBe('{not valid JSON');

    storage.setItem(ESSAY_STORAGE_KEY, JSON.stringify({ essays: [] }));
    expect(repository.inspect().issue).toBe('corrupt');
  });

  it('exports and imports complete source records and skips a repeated import', () => {
    const source = createRepository(new MemoryStorage());
    const original = source.createEssay(validInput);
    const backup = source.exportBackup();
    const target = createRepository(new MemoryStorage());
    expect(target.previewImport(backup)).toMatchObject({ added: 1, skipped: 0, restoring: false });
    expect(target.listEssays()).toEqual([]);
    target.importBackup(backup, null);
    expect(target.listEssays()).toEqual([original]);
    const preview = target.previewImport(backup);
    expect(preview).toMatchObject({ added: 0, skipped: 1 });
    target.importBackup(backup, preview.originalRaw);
    expect(target.listEssays()).toEqual([original]);
  });

  it('preserves different texts with conflicting IDs and titles on repeated import', () => {
    const first = createRepository(new MemoryStorage());
    first.createEssay(validInput);
    const second = createRepository(new MemoryStorage());
    second.createEssay({ ...validInput, text: 'A different source text.' });
    const backup = second.exportBackup();
    const preview = first.previewImport(backup);
    expect(preview).toMatchObject({ added: 1, renamed: 1 });
    first.importBackup(backup, preview.originalRaw);
    const again = first.previewImport(backup);
    first.importBackup(backup, again.originalRaw);
    expect(first.listEssays()).toHaveLength(2);
    expect(new Set(first.listEssays().map((essay) => essay.id)).size).toBe(2);
    expect(new Set(first.listEssays().map((essay) => essay.text))).toEqual(new Set([validInput.text, 'A different source text.']));
  });

  it('rejects invalid or partial backups atomically and detects changed history', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.createEssay(validInput);
    const original = storage.getItem(ESSAY_STORAGE_KEY);
    const backup = JSON.parse(repository.exportBackup());
    backup.essays.push({ id: 'invalid' });
    expect(() => repository.previewImport(JSON.stringify(backup))).toThrow();
    expect(storage.getItem(ESSAY_STORAGE_KEY)).toBe(original);
    const validBackup = repository.exportBackup();
    repository.createEssay({ ...validInput, title: 'Another' });
    expect(() => repository.importBackup(validBackup, original)).toThrow('历史在预览后已改变');
    expect(repository.listEssays()).toHaveLength(2);
  });

  it('preserves damaged data in a separate key before explicitly restoring a backup', () => {
    const source = createRepository(new MemoryStorage());
    source.createEssay(validInput);
    const storage = new MemoryStorage();
    const damaged = '[{"text":"Keep this unfinished original"}';
    storage.setItem(ESSAY_STORAGE_KEY, damaged);
    const repository = createRepository(storage);
    const backup = source.exportBackup();
    expect(repository.previewImport(backup).restoring).toBe(true);
    repository.importBackup(backup, damaged);
    expect(repository.listEssays()).toHaveLength(1);
    const recoveryKey = Array.from({ length: storage.length }, (_, index) => storage.key(index)).find((key) => key?.startsWith('deea.essays.recovery.'))!;
    expect(storage.getItem(recoveryKey)).toBe(damaged);
  });

  it('keeps existing data when storage is full and reports unavailable storage separately', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.createEssay(validInput);
    const original = storage.getItem(ESSAY_STORAGE_KEY);
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    expect(() => repository.createEssay({ ...validInput, title: 'New' })).toThrow(EssayStorageError);
    expect(storage.getItem(ESSAY_STORAGE_KEY)).toBe(original);
    storage.getItem = () => { throw new Error('SecurityError'); };
    expect(repository.inspect().issue).toBe('unavailable');
  });

  it('rejects an empty title, empty text, and invalid date', () => {
    const repository = createRepository(new MemoryStorage());

    expectValidationError(
      () => repository.createEssay({ ...validInput, title: '' }),
      'title',
    );
    expectValidationError(
      () => repository.createEssay({ ...validInput, text: '  ' }),
      'text',
    );
    expectValidationError(
      () => repository.createEssay({ ...validInput, writtenAt: '2026-02-30' }),
      'writtenAt',
    );
    expect(repository.listEssays()).toEqual([]);
  });

  it('stores source text and regenerates analysis with the current analyzer', () => {
    const repository = createRepository(new MemoryStorage());
    const sourceText = 'decide decides decided deciding';
    const created = repository.createEssay({ ...validInput, text: sourceText });
    const loaded = repository.getEssay(created.id);
    const cocaEntries = parseCocaCsv(`rank,lemma,PoS,freq,perMil
1,decide,v,100,10`);

    expect(loaded?.text).toBe(sourceText);
    expect(analyzeEssay(loaded?.text ?? '', cocaEntries).lemmas).toEqual([
      expect.objectContaining({
        lemma: 'decide',
        observedForms: ['decide', 'decides', 'decided', 'deciding'],
        count: 4,
      }),
    ]);
  });

  it('treats a repeated save of identical content as idempotent', () => {
    const repository = createRepository(new MemoryStorage());
    const first = repository.createEssay(validInput);
    const repeated = repository.createEssay(validInput);

    expect(repeated).toEqual(first);
    expect(repository.listEssays()).toHaveLength(1);
  });

  it('prevents different essays from sharing a title regardless of case or surrounding spaces', () => {
    const repository = createRepository(new MemoryStorage());
    repository.createEssay(validInput);

    expectValidationError(
      () => repository.createEssay({ ...validInput, title: ' MY FIRST ESSAY ', text: 'A new argument.' }),
      'title',
    );
    expect(repository.listEssays()).toHaveLength(1);
  });
});

function createRepository(storage: Storage): EssayRepository {
  let nextId = 1;

  return new EssayRepository(storage, {
    createId: () => `essay-${nextId++}`,
    now: () => new Date('2026-07-23T12:00:00.000Z'),
  });
}

function expectValidationError(action: () => unknown, field: 'title' | 'writtenAt' | 'text'): void {
  try {
    action();
    throw new Error('Expected validation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(EssayValidationError);
    expect((error as EssayValidationError).fieldErrors[field]).toBeTruthy();
  }
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
