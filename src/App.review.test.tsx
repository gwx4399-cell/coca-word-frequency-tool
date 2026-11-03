// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { ESSAY_STORAGE_KEY, BACKUP_FORMAT } from './storage/essayRepository';

let root: Root | null;
const restoredEssay = { id: 'restored', title: 'Restored essay', writtenAt: '2026-11-03', text: 'I wrote a draft and have written another.', createdAt: '2026-11-03T00:00:00Z', updatedAt: '2026-11-03T00:00:00Z' };
const backup = JSON.stringify({ format: BACKUP_FORMAT, version: 1, essays: [restoredEssay] });

function mount() {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<App />));
}
function input(selector: string, value: string) {
  const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')!.set!.call(element, value);
  act(() => { element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); });
}
function click(name: string) {
  const button = [...document.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === name || item.textContent?.trim() === name);
  expect(button, name).toBeTruthy();
  act(() => button!.click());
}
async function chooseFile(text: string) {
  const field = document.querySelector<HTMLInputElement>('#backup-file')!;
  Object.defineProperty(field, 'files', { configurable: true, value: [new File([text], 'backup.json', { type: 'application/json' })] });
  await act(async () => {
    field.dispatchEvent(new Event('change', { bubbles: true }));
    // Wait for the browser file read, not a mocked repository result.
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  await vi.waitFor(() => expect(document.body.textContent).not.toContain('正在读取备份'));
}

beforeEach(() => { localStorage.clear(); root = null; });
afterEach(() => { act(() => root?.unmount()); document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });

describe('review and backup user journeys', () => {
  it('highlights original inflections safely, without treating essay markup as HTML', () => {
    mount();
    input('#essay-title', 'Source evidence');
    input('#essay-input', 'I wrote a note. I have written it, and I write again. <img src=x onerror=alert(1)>');
    click('Analyze and save');
    click('查看 write 的原句');
    expect([...document.querySelectorAll('.word-evidence mark')].map((mark) => mark.textContent)).toEqual(['wrote', 'written', 'write']);
    expect(document.querySelector('img')).toBeNull();
    expect(document.activeElement?.textContent).toBe('write · 原句核查');
  });

  it('finds low-count words by an observed form without changing the underlying counts', () => {
    mount();
    input('#essay-title', 'Low count');
    input('#essay-input', 'I took advice. She has taken a small step.');
    click('Analyze and save');
    expect(document.querySelectorAll('.results tbody tr')).toHaveLength(0);
    input('input[type="search"]', 'took');
    expect(document.querySelectorAll('.results tbody tr')).toHaveLength(1);
    click('查看 take 的原句');
    expect([...document.querySelectorAll('.word-evidence mark')].map((mark) => mark.textContent)).toEqual(['took', 'taken']);
    input('input[type="search"]', 'unseen');
    expect(document.querySelector('.results .empty-state')?.textContent).toContain('没有匹配');
  });

  it('starts the next essay with an empty form while retaining saved history', () => {
    mount();
    input('#essay-title', 'Saved'); input('#essay-input', 'A useful example.');
    click('Analyze and save'); click('写下一篇 / Start next essay');
    expect((document.getElementById('essay-input') as HTMLTextAreaElement).value).toBe('');
    expect(document.activeElement?.id).toBe('essay-title');
    expect(JSON.parse(localStorage.getItem(ESSAY_STORAGE_KEY)!)).toHaveLength(1);
  });

  it('previews, cancels, and confirms imports without changing data prematurely', async () => {
    mount();
    await chooseFile(backup);
    expect(document.querySelector('.import-preview')?.textContent).toContain('新增 1 篇');
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBeNull();
    click('取消导入');
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBeNull();
    await chooseFile(backup); click('确认导入');
    expect(JSON.parse(localStorage.getItem(ESSAY_STORAGE_KEY)!)).toEqual([restoredEssay]);
    await chooseFile(backup);
    expect(document.querySelector('.import-preview')?.textContent).toContain('跳过 1 篇');
    click('确认导入');
    expect(JSON.parse(localStorage.getItem(ESSAY_STORAGE_KEY)!)).toHaveLength(1);
  });

  it('shows a damaged-history warning, blocks saves, and recovers only after confirmation', async () => {
    const damaged = '[damaged original';
    localStorage.setItem(ESSAY_STORAGE_KEY, damaged);
    mount();
    expect(document.querySelector('.storage-alert')?.textContent).toContain('历史暂不可用');
    expect([...document.querySelectorAll('button')].find((button) => button.textContent === 'Analyze and save')?.disabled).toBe(true);
    await chooseFile('invalid JSON');
    expect(document.querySelector('.backup-panel [role="alert"]')?.textContent).toContain('不是有效');
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBe(damaged);
    await chooseFile(backup);
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBe(damaged);
    click('确认恢复备份');
    expect(document.querySelector('.storage-alert')).toBeNull();
    expect(JSON.parse(localStorage.getItem(ESSAY_STORAGE_KEY)!)).toEqual([restoredEssay]);
    const recoveryKey = Object.keys(localStorage).find((key) => key.startsWith('deea.essays.recovery.'))!;
    expect(localStorage.getItem(recoveryKey)).toBe(damaged);
  });

  it('renders an unavailable-storage state instead of crashing on startup', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    mount();
    expect(document.querySelector('.storage-alert')?.textContent).toContain('无法访问');
    expect(document.querySelector('#essay-input')).toBeTruthy();
  });
});
