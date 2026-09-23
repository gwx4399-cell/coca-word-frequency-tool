// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { ESSAY_STORAGE_KEY } from './storage/essayRepository';
import type { EssayRecord } from './types/essay';

function essay(id: string, text: string): EssayRecord {
  return { id, title: `Essay ${id}`, writtenAt: `2026-09-${id.padStart(2, '0')}`, text, createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z' };
}

describe('cross-essay view', () => {
  let root: Root | null;

  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify([
      essay('1', 'Important issues are significant.'),
      essay('2', 'An important issue is an essential issue.'),
      essay('3', 'Important issues are important; crucial issues matter.'),
    ]));
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<App />));
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.replaceChildren();
    globalThis.localStorage.clear();
  });

  it('shows cross-essay totals, a bounded pilot share, and links back to source essays', () => {
    const tab = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Across essays');
    act(() => tab?.click());

    const view = document.querySelector('.across-essays');
    expect(view?.textContent).toContain('跨篇统计');
    const rows = Array.from(view?.querySelectorAll('tbody tr') ?? []);
    expect(rows.some((row) => row.textContent?.includes('important') && row.textContent?.includes('3/3'))).toBe(true);
    expect(view?.textContent).toContain('试验');
    expect(view?.textContent).toContain('分母仅是');

    const evidence = rows.find((row) => row.querySelector('th')?.textContent === 'important');
    const details = evidence?.querySelector('details');
    expect(details?.textContent).toContain('Essay 3');
    const source = Array.from(details?.querySelectorAll('.occurrence-list > li') ?? []).find((item) => item.textContent?.includes('Essay 3'));
    expect(source?.querySelector('blockquote')?.textContent).toContain('Important issues are important; crucial issues matter.');
    expect(Array.from(source?.querySelectorAll('mark') ?? []).map((mark) => mark.textContent)).toEqual(['Important', 'important']);
    const link = Array.from(details?.querySelectorAll('button') ?? []).find((button) => button.textContent === 'Essay 3');
    act(() => link?.click());
    expect(document.querySelector('.history-detail')?.textContent).toContain('Essay 3');
    expect(Array.from(document.querySelectorAll('.history-detail pre mark')).map((mark) => mark.textContent)).toEqual(['Important', 'important']);
    expect(document.querySelector('.history-detail pre')?.textContent).toBe('Important issues are important; crucial issues matter.');

    const back = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Back to history');
    act(() => back?.click());
    const other = Array.from(document.querySelectorAll('.history-open')).find((button) => button.textContent?.includes('Essay 2')) as HTMLButtonElement | undefined;
    act(() => other?.click());
    expect(document.querySelectorAll('.history-detail pre mark')).toHaveLength(0);
  });
});
