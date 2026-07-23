// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { ESSAY_STORAGE_KEY } from './storage/essayRepository';
import type { EssayRecord } from './types/essay';

const targetEssay: EssayRecord = {
  id: 'target',
  title: 'Delete target',
  writtenAt: '2026-07-23',
  taskPrompt: 'Target prompt',
  text: 'run ran running',
  createdAt: '2026-07-23T12:00:00.000Z',
  updatedAt: '2026-07-23T12:00:00.000Z',
};

const retainedEssay: EssayRecord = {
  id: 'retained',
  title: 'Keep this essay',
  writtenAt: '2026-07-22',
  text: 'care cared caring',
  createdAt: '2026-07-22T12:00:00.000Z',
  updatedAt: '2026-07-22T12:00:00.000Z',
};

describe('essay deletion confirmation', () => {
  let root: Root | null;

  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify([targetEssay, retainedEssay]));
    root = mountApp();
    openHistory();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }

    document.body.replaceChildren();
    globalThis.localStorage.clear();
  });

  it('does not delete an essay on the first Delete click', () => {
    requestDeletion('Delete target');

    const dialog = getDeleteDialog();
    expect(dialog.querySelector('h2')?.textContent).toBe('Delete essay?');
    expect(dialog.textContent).toContain('Delete target');
    expect(dialog.textContent).toContain('This action cannot be undone.');
    expect(document.activeElement?.textContent).toBe('Cancel');
    expect(readStoredEssayIds()).toEqual(['target', 'retained']);
  });

  it('keeps the record after Cancel and a refresh', () => {
    requestDeletion('Delete target');
    clickDialogButton('Cancel');

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(readStoredEssayIds()).toEqual(['target', 'retained']);

    root = refreshApp(root);
    openHistory();
    expect(document.body.textContent).toContain('Delete target');
    expect(document.body.textContent).toContain('Keep this essay');
  });

  it('deletes only the target after confirmation and keeps it deleted after refresh', () => {
    requestDeletion('Delete target');
    clickDialogButton('Delete');

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(readStoredEssayIds()).toEqual(['retained']);

    root = refreshApp(root);
    openHistory();
    expect(document.body.textContent).not.toContain('Delete target');
    expect(document.body.textContent).toContain('Keep this essay');
  });
});

function mountApp(): Root {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => root.render(<App />));
  return root;
}

function refreshApp(root: Root | null): Root {
  act(() => root?.unmount());
  document.body.replaceChildren();
  return mountApp();
}

function openHistory(): void {
  const historyButton = Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent?.trim().startsWith('History'),
  );

  expect(historyButton).toBeTruthy();
  act(() => historyButton?.click());
}

function requestDeletion(title: string): void {
  const historyCard = Array.from(document.querySelectorAll<HTMLElement>('.history-card')).find((card) =>
    card.textContent?.includes(title),
  );
  const deleteButton = historyCard?.querySelector<HTMLButtonElement>('.delete-button');

  expect(deleteButton).toBeTruthy();
  act(() => deleteButton?.click());
}

function getDeleteDialog(): HTMLElement {
  const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]');

  expect(dialog).toBeTruthy();
  return dialog as HTMLElement;
}

function clickDialogButton(label: 'Cancel' | 'Delete'): void {
  const button = Array.from(getDeleteDialog().querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  expect(button).toBeTruthy();
  act(() => button?.click());
}

function readStoredEssayIds(): string[] {
  const serialized = globalThis.localStorage.getItem(ESSAY_STORAGE_KEY);
  const records = JSON.parse(serialized ?? '[]') as EssayRecord[];
  return records.map((record) => record.id);
}
