import type { EssayRecord } from '../types/essay';
import { stageLabel } from '../teaching/workflow';
import { tokenize } from '../analysis/tokenize';
import { GenreOptions } from './TeachingPanels';

export function ComparisonScope({ essays, learner, genre, mode, candidates, excluded, showComparison, onLearner, onGenre, onMode, onExcluded }: {
  essays: EssayRecord[]; learner: string; genre: string; mode: 'latest' | 'original'; candidates: EssayRecord[]; excluded: string[]; showComparison: boolean;
  onLearner: (value: string) => void; onGenre: (value: string) => void; onMode: (value: 'latest' | 'original') => void; onExcluded: (value: string[]) => void;
}) {
  const learners = [...new Set(essays.map((essay) => essay.learnerId).filter((value): value is string => !!value))].sort();
  return <section className="scope-panel" aria-label="学生与比较范围">
    <div className="teaching-grid">
      <label>当前学生<select id="scope-learner" className="text-input" value={learner} onChange={(event) => onLearner(event.target.value)}><option value="">未选择（历史显示全部）</option>{learners.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      {showComparison && <>
        <label>比较文体<select id="scope-genre" className="text-input" value={genre} onChange={(event) => onGenre(event.target.value)}><option value="">请选择文体</option><GenreOptions essays={essays} /></select></label>
        <label>每个任务比较哪一稿<select id="scope-mode" className="text-input" value={mode} onChange={(event) => onMode(event.target.value as 'latest' | 'original')}><option value="latest">每个任务的最新稿</option><option value="original">每个任务的原稿</option></select></label>
      </>}
    </div>
    {!!essays.filter((essay) => !essay.learnerId || !essay.genre).length && <p className="analysis-help">有 {essays.filter((essay) => !essay.learnerId || !essay.genre).length} 篇作文未完成分组。请在历史详情中补充学生与文体后再比较。</p>}
    {showComparison && (!learner || !genre ? <p>请选定一位学生和一种文体；跨篇统计不会混合所有历史。</p> : <details className="comparison-picker">
      <summary>核对比较范围 · 已选 {candidates.filter((essay) => !excluded.includes(essay.id)).length}/{candidates.length} 个任务</summary>
      <p className="analysis-help">同一任务的多个版本只计一次。可取消不适合比较的题目；篇幅和任务差异仍需人工考虑。</p>
      {candidates.map((essay) => <label className="comparison-item" key={essay.id}><input type="checkbox" checked={!excluded.includes(essay.id)} onChange={(event) => onExcluded(event.target.checked ? excluded.filter((id) => id !== essay.id) : [...excluded, essay.id])} />
        <span><strong>{essay.title}</strong><small>{essay.taskId || '未命名任务'} · {stageLabel(essay)} · {essay.writtenAt} · {tokenize(essay.text).length} 词</small></span>
      </label>)}
      {!candidates.length && <p>这个分组还没有可比较的作文。</p>}
    </details>)}
  </section>;
}
