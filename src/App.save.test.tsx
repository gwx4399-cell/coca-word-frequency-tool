// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { ESSAY_STORAGE_KEY } from './storage/essayRepository';
import type { EssayRecord } from './types/essay';

describe('analysis and automatic save', () => {
  let root: Root | null;

  beforeEach(() => {
    globalThis.localStorage.clear();
    root = mountApp();
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    document.body.replaceChildren();
    globalThis.localStorage.clear();
  });

  it('saves on Analyze and save, preserves observed forms, and does not duplicate the same essay', () => {
    fillCurrentForm('First essay', 'Important ideas are important; important ideas matter.');
    clickNamedButton('Analyze and save');

    expect(readStoredEssays()).toHaveLength(1);
    expect(document.body.textContent).toContain('Analysis complete.');
    expect(document.body.textContent).toContain('Important, important');
    expect(document.body.textContent).not.toContain('COCA coverage');
    expect(document.body.textContent).not.toContain('Rate per 100');

    clickNamedButton('Analyze and save');
    expect(readStoredEssays()).toHaveLength(1);
  });

  it('rejects a reused title even with different capitalization and allows a new title', () => {
    fillCurrentForm('My argument', 'This is the first essay.');
    clickNamedButton('Analyze and save');
    fillCurrentForm(' MY ARGUMENT ', 'This is a different essay.');
    clickNamedButton('Analyze and save');

    expect(readStoredEssays()).toHaveLength(1);
    expect(document.getElementById('essay-title-error')?.textContent).toContain('already used');

    fillInput('essay-title', 'Second argument');
    clickNamedButton('Analyze and save');
    expect(readStoredEssays()).toHaveLength(2);
  });

  it('offers evidence-based writing advice immediately after the third saved essay', () => {
    fillCurrentForm('One', 'Important ideas are important. An important idea matters.');
    clickNamedButton('Analyze and save');
    expect(document.querySelector('.writing-advice')).toBeNull();

    fillCurrentForm('Two', 'An important topic is important to students.');
    clickNamedButton('Analyze and save');
    expect(document.querySelector('.writing-advice')).toBeNull();

    fillCurrentForm('Three', 'Students need useful examples.');
    clickNamedButton('Analyze and save');
    const advice = document.querySelector('.writing-advice');
    expect(advice?.textContent).toContain('important');
    expect(advice?.textContent).toContain('2/3 篇');
    expect(advice?.textContent).toContain('共 5 次');
    expect(advice?.textContent).toContain('significant');
    expect(readStoredEssays()).toHaveLength(3);

    act(() => root?.unmount());
    document.body.replaceChildren();
    root = mountApp();
    expect(document.querySelector('.writing-advice')?.textContent).toContain('important');

    clickNamedButton(/^History/);
    expect(document.querySelector('.writing-advice')).toBeTruthy();
    requestDeletion('One');
    clickDialogButton('Delete');
    expect(document.querySelector('.writing-advice')).toBeNull();
  });

  it('can save again after the current history record is deleted', () => {
    fillCurrentForm('Restore', 'I care about this draft.');
    clickNamedButton('Analyze and save');
    clickNamedButton(/^History/);
    requestDeletion('Restore');
    clickDialogButton('Delete');
    expect(readStoredEssays()).toHaveLength(0);

    clickNamedButton('New essay');
    clickNamedButton('Analyze and save');
    expect(readStoredEssays().map((essay) => essay.title)).toEqual(['Restore']);
  });
});

function mountApp(): Root {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<App />));
  return root;
}

function fillCurrentForm(title: string, text: string): void {
  fillInput('essay-title', title);
  fillInput('essay-input', text);
}

function fillInput(id: string, value: string): void {
  const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  expect(field).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set;
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

function requestDeletion(title: string): void {
  const card = Array.from(document.querySelectorAll<HTMLElement>('.history-card')).find((item) =>
    item.textContent?.includes(title),
  );
  expect(card).toBeTruthy();
  act(() => card?.querySelector<HTMLButtonElement>('.delete-button')?.click());
}

function clickDialogButton(label: string): void {
  const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]');
  const button = Array.from(dialog?.querySelectorAll('button') ?? []).find((item) => item.textContent?.trim() === label);
  expect(button).toBeTruthy();
  act(() => button?.click());
}

function readStoredEssays(): EssayRecord[] {
  return JSON.parse(globalThis.localStorage.getItem(ESSAY_STORAGE_KEY) ?? '[]') as EssayRecord[];
}
