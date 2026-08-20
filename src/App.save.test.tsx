// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { ESSAY_STORAGE_KEY } from './storage/essayRepository';
import type { EssayRecord } from './types/essay';

describe('save state after deleting the current essay', () => {
  let root: Root | null;

  beforeEach(() => {
    globalThis.localStorage.clear();
    root = mountApp();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }

    document.body.replaceChildren();
    globalThis.localStorage.clear();
  });

  it('lets the current form be saved again after its history record is deleted', () => {
    fillCurrentForm({
      title: 'Session save restore',
      prompt: 'Rewrite after deletion.',
      text: 'I decide, and then I decided again.',
    });

    clickNamedButton('Analyze');
    expect(document.body.textContent).toContain('Essay Analysis');
    expect(getSaveButton()?.disabled).toBe(false);
    expect(getSaveButton()?.textContent).toBe('Save to history');

    clickNamedButton('Save to history');
    expect(getSaveButton()?.disabled).toBe(true);
    expect(getSaveButton()?.textContent).toBe('Saved');
    expect(readStoredEssays()).toHaveLength(1);

    clickNamedButton(/^History/);
    requestDeletion('Session save restore');
    clickDialogButton('Delete');
    expect(readStoredEssays()).toHaveLength(0);

    clickNamedButton('New essay');
    expect(document.body.textContent).toContain('Essay Analysis');
    expect(getSaveButton()?.disabled).toBe(false);
    expect(getSaveButton()?.textContent).toBe('Save to history');

    clickNamedButton('Save to history');
    expect(getSaveButton()?.disabled).toBe(true);
    expect(getSaveButton()?.textContent).toBe('Saved');
    expect(readStoredEssays()).toHaveLength(1);
    expect(readStoredEssays()[0]?.title).toBe('Session save restore');
  });

  it('does not reset save state when a different essay is deleted', () => {
    fillCurrentForm({
      title: 'Current essay',
      text: 'I care about this draft.',
    });
    clickNamedButton('Analyze');
    clickNamedButton('Save to history');

    fillCurrentForm({
      title: 'Later essay',
      text: 'I used this later draft.',
    });
    clickNamedButton('Analyze');
    clickNamedButton('Save to history');
    expect(readStoredEssays()).toHaveLength(2);
    expect(getSaveButton()?.textContent).toBe('Saved');
    expect(getSaveButton()?.disabled).toBe(true);

    clickNamedButton(/^History/);
    requestDeletion('Current essay');
    clickDialogButton('Delete');

    clickNamedButton('New essay');
    expect(getSaveButton()?.textContent).toBe('Saved');
    expect(getSaveButton()?.disabled).toBe(true);
    expect(readStoredEssays().map((essay) => essay.title)).toEqual(['Later essay']);
  });
});

function mountApp(): Root {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => root.render(<App />));
  return root;
}

function fillCurrentForm({
  title,
  prompt,
  text,
}: {
  title: string;
  prompt?: string;
  text: string;
}): void {
  fillInput('essay-title', title);

  if (prompt !== undefined) {
    fillInput('task-prompt', prompt);
  }

  fillInput('essay-input', text);
}

function fillInput(id: string, value: string): void {
  const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  expect(field).toBeTruthy();

  const prototype = Object.getPrototypeOf(field) as HTMLInputElement | HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  expect(setter).toBeTruthy();
  setter?.call(field, value);

  act(() => {
    field?.dispatchEvent(new Event('input', { bubbles: true }));
    field?.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function clickNamedButton(name: string | RegExp): void {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) => {
    const label = candidate.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });

  expect(button).toBeTruthy();
  act(() => button?.click());
}

function getSaveButton(): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((button) => {
    const label = button.textContent?.trim();
    return label === 'Save to history' || label === 'Saved';
  });
}

function requestDeletion(title: string): void {
  const historyCard = Array.from(document.querySelectorAll<HTMLElement>('.history-card')).find((card) =>
    card.textContent?.includes(title),
  );
  const deleteButton = historyCard?.querySelector<HTMLButtonElement>('.delete-button');

  expect(deleteButton).toBeTruthy();
  act(() => deleteButton?.click());
}

function clickDialogButton(label: 'Cancel' | 'Delete'): void {
  const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]');
  expect(dialog).toBeTruthy();

  const button = Array.from(dialog?.querySelectorAll('button') ?? []).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  expect(button).toBeTruthy();
  act(() => button?.click());
}

function readStoredEssays(): EssayRecord[] {
  const serialized = globalThis.localStorage.getItem(ESSAY_STORAGE_KEY);
  return JSON.parse(serialized ?? '[]') as EssayRecord[];
}
