import type { EssayRecord } from '../types/essay';
import { CHECK_STATUSES, DECISIONS } from '../types/teaching';
import { goalsFor, learnerOf, rootOf, stageLabel } from './workflow';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const p = (value: string) => `<p>${escape(value)}</p>`;

export function buildFeedbackHtml(learner: string, essays: EssayRecord[], essayId?: string): string {
  const source = essays.find((essay) => essay.id === essayId && learnerOf(essay) === learner);
  const entries = source ? essays.filter((essay) => rootOf(essay, essays).id === rootOf(source, essays).id)
    .flatMap((essay) => (essay.notes ?? []).map((note) => ({ essay, note }))) : goalsFor(essays, learner);
  const body = entries.map(({ essay, note }) => `<article>
    <h2>${escape(note.goal?.instruction || DECISIONS[note.decision])}</h2>
    ${p(`${essay.title} · ${essay.writtenAt} · ${stageLabel(essay)}`)}
    <blockquote>${escape(note.quote)}</blockquote>
    ${p(`教师判断：${DECISIONS[note.decision]}`)}${p(`理由：${note.reason}`)}
    ${note.goal ? `${p(`本次练习：${note.goal.practice || '围绕上述目标修改，并说明理由。'}`)}
      <h3>后续核查</h3>${note.goal.checks.length ? note.goal.checks.map((check) => {
        const target = essays.find((item) => item.id === check.essayId);
        return `<section class="check">${p(`${target?.title ?? '作文'} · ${target?.writtenAt ?? ''} · ${CHECK_STATUSES[check.status]}`)}
          ${check.evidence ? `<blockquote>${escape(check.evidence.quote)}</blockquote>` : ''}
          ${p(`核查依据：${check.reason}`)}${check.reflection ? p(`学生说明：${check.reflection}`) : ''}</section>`;
      }).join('') : p('待核查。没有记录不表示已经掌握。')}` : ''}
    </article>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escape(learner)} · 学习反馈单</title><style>
    body{font-family:system-ui,"Microsoft YaHei",sans-serif;color:#21332e;max-width:780px;margin:32px auto;padding:0 24px;line-height:1.7;overflow-wrap:anywhere}
    h1{font-size:26px;margin-bottom:4px}h2{font-size:19px}h3{font-size:16px}article{border-top:2px solid #6a9c8d;padding:12px 0;margin-top:24px}
    p{margin:8px 0;white-space:pre-wrap}blockquote{margin:12px 0;padding:12px 16px;background:#f2f7f4;border-left:3px solid #699b8c;white-space:pre-wrap}
    .check{margin:14px 0;padding-left:16px;border-left:1px solid #c3d3cb}.hint,footer{color:#52675e;font-size:13px}h2,h3{break-after:avoid}
    @page{size:A4;margin:18mm}@media print{body{margin:0;max-width:none;padding:0;font-size:11pt}.hint{display:none}blockquote,.check{break-inside:avoid}}
    </style></head><body><h1>学习反馈单</h1>${p(`学生：${learner || '未分组'}`)}
    <p class="hint">在浏览器中打开此文件，可使用“打印”保存为 PDF。内容较长时自动分页。</p>
    ${body || p('暂无已保存的判断或目标。先查看原句并确定一个练习目标。')}
    <footer>本单记录师生的判断与证据，不提供自动评分；重复减少或没有出现目标词，不自动代表进步。DEEA</footer></body></html>`;
}
