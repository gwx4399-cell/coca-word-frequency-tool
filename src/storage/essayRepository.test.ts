import { describe, expect, it } from 'vitest';
import { analyzeEssay } from '../analysis/analyzeEssay';
import { parseCocaCsv } from '../analysis/coca';
import type { CreateEssayInput } from '../types/essay';
import {
  ESSAY_STORAGE_KEY,
  EssayRepository,
  EssayValidationError,
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

  it('returns an empty list for corrupted storage content', () => {
    const storage = new MemoryStorage();
    storage.setItem(ESSAY_STORAGE_KEY, '{not valid JSON');

    expect(new EssayRepository(storage).listEssays()).toEqual([]);

    storage.setItem(ESSAY_STORAGE_KEY, JSON.stringify({ essays: [] }));
    expect(new EssayRepository(storage).listEssays()).toEqual([]);
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
