import type { EssayRecord } from '../types/essay';
import { BACKUP_FORMAT } from '../storage/essayRepository';

// Fictional task excerpts for checking the workflow, not scored IELTS essays or user-study data.
export function demoBackup(): string {
  const scenarios = [
    { id: 'foundation', learner: '演示·基础练习', first: 'School meals are good. They help students stay healthy. Fresh food is good for children because it gives them energy for afternoon lessons.',
      revision: 'School meals help students stay healthy. Fresh food gives children energy for afternoon lessons and helps them concentrate.',
      next: 'Public parks give children a place to play after school. Exercise helps them sleep well and feel ready for lessons the next day.',
      title: '学校午餐', nextTitle: '公共公园', quote: 'School meals are good. ', revisedQuote: 'School meals help students stay healthy. ',
      goal: '把 good 的具体含义说明白', practice: '改写一句，说明对谁有什么帮助。下一篇尝试独立说明具体好处。', reason: '这句评价较笼统，可以用已有词汇说清楚对健康的帮助。', decision: 'specific' as const },
    { id: 'intermediate', learner: '演示·表达拓展', first: 'Public transport is important. It is important for commuters because it is important to get to work on time. Reliable buses can reduce the time people spend waiting.',
      revision: 'Reliable public transport helps commuters arrive at work on time. Frequent buses reduce waiting times and make daily journeys more predictable.',
      next: 'Online lessons let students review difficult explanations at their own pace. Recorded examples are useful when learners need to revisit a particular step.',
      title: '公共交通', nextTitle: '线上学习', quote: 'Public transport is important. ', revisedQuote: 'Reliable public transport helps commuters arrive at work on time. ',
      goal: '说明具体影响，而不只说 important', practice: '选择一句写出作用机制。新任务中检查是否能自行解释影响，不要求使用某个替换词。', reason: '关键是解释交通为什么重要，而不是寻找更难的近义词。', decision: 'specific' as const },
    { id: 'advanced', learner: '演示·语义与语气', first: 'The survey found a statistically significant difference between the groups. This proves that the policy will work in every city. However, the sample included only two districts.',
      revision: 'The survey found a statistically significant difference between the groups. This suggests that the policy may be effective in similar districts, although a larger sample is needed.',
      next: 'A small museum survey suggests that free entry may encourage repeat visits. Further evidence is needed before extending this conclusion to every museum.',
      title: '调查与政策', nextTitle: '博物馆调查', quote: 'This proves that the policy will work in every city. ', revisedQuote: 'This suggests that the policy may be effective in similar districts, although a larger sample is needed.',
      goal: '让结论的语气与证据范围一致', practice: '说明样本支持什么、不支持什么，再在新的独立任务中核查推断范围。', reason: '有限样本不足以支持 every city 的确定性结论；statistically significant 本身可以保留。', decision: 'collocation' as const },
  ];
  const essays: EssayRecord[] = scenarios.flatMap((item) => {
    const id = `deea-demo-${item.id}`;
    const base = { learnerId: item.learner, genre: '议论文 / Argument', createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-02T08:00:00Z' };
    const source: EssayRecord = { ...base, id, title: `${item.title} · 演示原稿`, taskId: item.title, writtenAt: '2026-10-01', text: item.first, draftKind: 'original' };
    const revised: EssayRecord = { ...base, id: `${id}-revision`, title: `${item.title} · 演示修改稿`, taskId: item.title, writtenAt: '2026-10-02', text: item.revision, draftKind: 'revision', revisionOf: id };
    const next: EssayRecord = { ...base, id: `${id}-next`, title: `${item.nextTitle} · 演示新任务`, taskId: item.nextTitle, writtenAt: '2026-10-08', text: item.next, draftKind: 'independent' };
    const start = source.text.indexOf(item.quote);
    const checkStart = revised.text.indexOf(item.revisedQuote);
    source.notes = [{ id: `${id}-note`, start, end: start + item.quote.length, quote: item.quote, decision: item.decision, reason: item.reason,
      createdAt: base.createdAt, updatedAt: base.updatedAt, goal: { instruction: item.goal, practice: item.practice, archived: false,
        checks: [{ id: `${id}-check`, essayId: revised.id, status: 'revised', evidence: { start: checkStart, end: checkStart + item.revisedQuote.length, quote: item.revisedQuote },
          reason: '演示判断：修改稿已针对目标调整表达。新任务还需要另外核查。', reflection: '演示反思：我先解释意思和依据，再决定词语或语气。', createdAt: base.updatedAt, updatedAt: base.updatedAt }] } }];
    return [source, revised, next];
  });
  return JSON.stringify({ format: BACKUP_FORMAT, version: 2, essays });
}
