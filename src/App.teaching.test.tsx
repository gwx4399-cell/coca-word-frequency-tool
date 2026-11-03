// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { EssayRepository, ESSAY_STORAGE_KEY } from './storage/essayRepository';
import { demoBackup } from './teaching/demo';

let root: Root | null;
const repository = new EssayRepository();
beforeEach(() => { localStorage.clear(); root = null; });
afterEach(() => { act(() => root?.unmount()); document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });
function mount() { const container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root!.render(<App />)); }
function input(selector: string, value: string) {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)!;
  expect(element, selector).toBeTruthy();
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')!.set!.call(element, value);
  act(() => { element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); });
}
function click(name: string) {
  const element = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === name);
  expect(element, name).toBeTruthy(); act(() => element!.click());
}
function demo() { repository.importBackup(demoBackup(), null); }

describe('teaching workflow', () => {
  it('loads fictional practice only after preview and keeps existing work', () => {
    repository.createEssay({ title: 'My work', text: 'Keep this original.', writtenAt: '2026-10-01' }); mount();
    click('预览三组模拟练习'); expect(repository.listEssays()).toHaveLength(1);
    click('取消本次导入'); expect(repository.listEssays()).toHaveLength(1);
    click('预览三组模拟练习'); click('确认加入作文'); expect(repository.listEssays()).toHaveLength(10);
    click('预览三组模拟练习'); click('确认加入作文'); expect(repository.listEssays()).toHaveLength(10);
  });

  it('scopes cross-essay comparison, excludes revisions and supports task selection', () => {
    demo(); mount(); click('Across essays');
    expect(document.querySelector('.across-essays')?.textContent).toContain('当前比较 0 个任务');
    input('#scope-learner', '演示·表达拓展'); input('#scope-genre', '议论文 / Argument');
    expect(document.querySelector('.across-essays')?.textContent).toContain('当前比较 2 个任务');
    expect(document.querySelector('.comparison-picker')?.textContent).not.toContain('学校午餐');
    expect(document.querySelector('.comparison-picker')?.textContent).toContain('演示修改稿');
    input('#scope-mode', 'original'); expect(document.querySelector('.comparison-picker')?.textContent).not.toContain('演示修改稿');
    act(() => document.querySelector<HTMLInputElement>('.comparison-item input')!.click());
    expect(document.querySelector('.across-essays')?.textContent).toContain('当前比较 1 个任务');
  });

  it('creates an anchored goal, saves an immutable revision and records a human review', () => {
    mount(); input('#essay-learner', 'Student A'); input('#essay-genre', '议论文 / Argument'); input('#essay-task', 'Transport');
    input('#essay-title', 'Transport original'); input('#essay-input', 'Public transport is important. It helps commuters arrive on time.'); click('Analyze and save');
    click('查看原句并设定目标'); input('#note-source', '0'); input('#note-decision', 'specific'); input('#note-reason', 'Explain why it matters.');
    act(() => document.querySelector<HTMLInputElement>('#note-has-goal')!.click());
    input('#goal-instruction', 'Explain a concrete benefit'); input('#goal-practice', 'Rewrite and explain the reason.'); click('保存教学判断');
    expect(document.querySelector('.saved-note')?.textContent).toContain('Explain a concrete benefit');
    const original = repository.listEssays()[0];
    click('创建修改稿（保留原文）');
    expect((document.querySelector('#essay-learner') as HTMLInputElement).disabled).toBe(true);
    input('#essay-input', 'Reliable public transport helps commuters arrive on time.'); click('Analyze and save');
    expect(repository.getEssay(original.id)?.text).toBe('Public transport is important. It helps commuters arrive on time.');
    const revision = repository.listEssays().find((essay) => essay.revisionOf === original.id)!;
    click('Learning goals'); input('.check-target', revision.id); input('.check-status', 'revised'); input('.check-evidence', '0'); input('.check-reason', 'A specific benefit is explained.'); input('.check-reflection', 'I explained who benefits.'); click('保存核查');
    expect(document.querySelector('.goal-check')?.textContent).toContain('修改稿中完成');
    expect(document.querySelector('.goal-check')?.textContent).toContain('I explained who benefits.');
    expect(repository.getEssay(original.id)?.notes?.[0].goal?.checks[0].evidence?.quote).toBe(revision.text);
  });

  it('retains no-opportunity judgments after reload without marking a goal as mastered', () => {
    demo(); mount(); click('Learning goals'); input('#scope-learner', '演示·表达拓展'); input('.check-target', 'deea-demo-intermediate-next');
    input('.check-status', 'no-opportunity'); input('.check-reason', 'This task does not elicit the target skill.'); click('保存核查');
    act(() => root!.unmount()); document.body.replaceChildren(); mount(); click('Learning goals'); input('#scope-learner', '演示·表达拓展');
    expect(document.querySelector('.goal-card')?.textContent).toContain('本次没有适用机会');
    expect(document.querySelector('.status-chip')?.textContent).toBe('练习中');
  });

  it('previews multiple TXT files and imports them together to the selected student', async () => {
    mount(); input('#batch-learner', 'Batch student'); input('#batch-date', '2026-11-01');
    const element = document.querySelector<HTMLInputElement>('#batch-files')!;
    Object.defineProperty(element, 'files', { configurable: true, value: [new File(['First useful essay.'], 'Task one.txt'), new File(['Second useful essay.'], 'Task two.txt')] });
    await act(async () => { element.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 30)); });
    await vi.waitFor(() => expect(document.querySelector('.batch-panel .import-preview')).toBeTruthy());
    expect(localStorage.getItem(ESSAY_STORAGE_KEY)).toBeNull(); click('确认加入作文');
    expect(repository.listEssays().map((essay) => essay.learnerId)).toEqual(['Batch student', 'Batch student']);
    expect(new Set(repository.listEssays().map((essay) => essay.taskId))).toEqual(new Set(['Task one', 'Task two']));
  });
});
