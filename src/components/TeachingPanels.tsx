import { useEffect, useMemo, useState } from 'react';
import type { EssayRecord } from '../types/essay';
import { CHECK_STATUSES, DECISIONS, type CheckInput, type NoteInput, type TeachingNote } from '../types/teaching';
import { EssayRepository } from '../storage/essayRepository';
import { sentenceSpans, getSentenceEvidence } from '../analysis/evidence';
import type { CocaLemmaMap } from '../analysis/coca';
import { checkCandidates, GENRES, goalsFor, isDescendant, learnerOf, rootOf, stageLabel } from '../teaching/workflow';
import { buildFeedbackHtml } from '../teaching/report';
import { downloadFile } from '../teaching/files';

const messageOf = (error: unknown) => error instanceof Error ? error.message : '操作未完成，请重试。';

export function GenreOptions({ essays }: { essays: EssayRecord[] }) {
  return <>{[...new Set([...GENRES, ...essays.map((essay) => essay.genre).filter((value): value is string => !!value)])].map((genre) => <option key={genre} value={genre}>{genre}</option>)}</>;
}

export function MetadataEditor({ essay, essays, repository, onChanged }: { essay: EssayRecord; essays: EssayRecord[]; repository: EssayRepository; onChanged: () => void }) {
  const [learner, setLearner] = useState(essay.learnerId ?? '');
  const [genre, setGenre] = useState(essay.genre ?? '');
  const [task, setTask] = useState(essay.taskId ?? '');
  const [kind, setKind] = useState<'original' | 'independent'>(rootOf(essay, essays).draftKind === 'independent' ? 'independent' : 'original');
  const [message, setMessage] = useState('');
  return <details className="metadata-editor" open={!essay.learnerId || !essay.genre ? true : undefined}>
    <summary>学生与任务 · {essay.learnerId || '未分组'} · {essay.genre || '未指定文体'}</summary>
    <p className="analysis-help">同一任务的原稿和修改稿会一起更新分组；同名学生请使用不同编号。确认后续文章是新题目的独立写作时，可调整任务类型。</p>
    <div className="teaching-grid">
      <label>学生编号或昵称<input className="text-input" id="metadata-learner" list="learner-options" value={learner} onChange={(event) => setLearner(event.target.value)} /></label>
      <label>文体<select className="text-input" id="metadata-genre" value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">未指定</option><GenreOptions essays={essays} /></select></label>
      <label>任务名称<input className="text-input" id="metadata-task" value={task} onChange={(event) => setTask(event.target.value)} placeholder="例如：公共交通，任务 01" /></label>
      <label>任务类型<select id="metadata-kind" className="text-input" value={kind} onChange={(event) => setKind(event.target.value as 'original' | 'independent')}><option value="original">原稿</option><option value="independent">新任务（独立写作）</option></select></label>
    </div>
    <button className="secondary-button" type="button" onClick={() => {
      try { repository.updateMetadata(essay.id, { learnerId: learner, genre, taskId: task, draftKind: kind }); onChanged(); setMessage('分组已保存。'); }
      catch (error) { setMessage(messageOf(error)); }
    }}>保存分组</button>
    {message && <p role="status">{message}</p>}
  </details>;
}

export function TeachingReview({ essay, selectedLemma, entries, repository, onChanged }: {
  essay: EssayRecord; selectedLemma: string | null; entries: CocaLemmaMap; repository: EssayRepository; onChanged: () => void;
}) {
  const sentences = useMemo(() => selectedLemma ? getSentenceEvidence(essay.text, selectedLemma, entries) : sentenceSpans(essay.text), [essay.text, selectedLemma, entries]);
  const [editing, setEditing] = useState<TeachingNote | null>(null);
  const [start, setStart] = useState('');
  const [decision, setDecision] = useState<NoteInput['decision']>('keep');
  const [reason, setReason] = useState('');
  const [withGoal, setWithGoal] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [practice, setPractice] = useState('');
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  useEffect(() => { if (!editing) setStart(''); }, [selectedLemma, editing]);
  const reset = () => { setEditing(null); setStart(''); setDecision('keep'); setReason(''); setWithGoal(false); setInstruction(''); setPractice(''); };
  const submit = () => {
    const span = editing ?? sentences.find((item) => String(item.start) === start);
    if (!span) { setMessage({ error: true, text: '请先选择一条原句。' }); return; }
    try {
      repository.saveNote(essay.id, { id: editing?.id, start: span.start, end: span.end, quote: essay.text.slice(span.start, span.end),
        lemma: editing?.lemma ?? selectedLemma ?? undefined, decision, reason,
        goal: withGoal ? { instruction, practice } : undefined });
      onChanged(); reset(); setMessage({ error: false, text: '教学判断已保存。学习目标可在“Learning goals”中继续核查。' });
    } catch (error) { setMessage({ error: true, text: messageOf(error) }); }
  };
  return <section className="teaching-review" aria-labelledby="teaching-review-title">
    <h3 id="teaching-review-title">教学判断与本次目标</h3>
    <p className="analysis-help">先核查原句，再决定保留或练习什么。每位学生同时最多两个目标；目标需要人工核查。</p>
    {(essay.notes ?? []).map((note) => <article className="saved-note" key={note.id}>
      <strong>{DECISIONS[note.decision]}</strong>{note.id.includes('-import-') && <p className="analysis-help">导入时保留的另一版本，请核对判断。</p>}<blockquote>{note.quote}</blockquote><p>{note.reason}</p>
      {note.goal && <p>目标：{note.goal.instruction} {note.goal.archived ? '（已归档）' : ''}</p>}
      <button className="text-button" type="button" onClick={() => { setEditing(note); setDecision(note.decision); setReason(note.reason); setWithGoal(!!note.goal); setInstruction(note.goal?.instruction ?? ''); setPractice(note.goal?.practice ?? ''); setMessage(null); }}>编辑这条判断</button>
    </article>)}
    <div className="note-form">
      {editing ? <blockquote>{editing.quote}</blockquote> : <label>选择原句{selectedLemma ? `（${selectedLemma}）` : ''}<select id="note-source" className="text-input" value={start} onChange={(event) => setStart(event.target.value)}>
        <option value="">请选择原句</option>{sentences.map((span) => <option key={span.start} value={span.start}>{essay.text.slice(span.start, span.end)}</option>)}
      </select></label>}
      {!editing && start !== '' && <blockquote>{essay.text.slice(Number(start), sentences.find((span) => span.start === Number(start))?.end)}</blockquote>}
      <label>教师判断<select id="note-decision" className="text-input" value={decision} onChange={(event) => setDecision(event.target.value as NoteInput['decision'])}>{Object.entries(DECISIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className="analysis-help">判断用于记录教学决定，不会修改原文或词形归并算法。</p>
      <label>判断理由<textarea id="note-reason" className="prompt-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="为什么保留，或者哪里需要更准确？" /></label>
      <label className="filter-toggle"><input id="note-has-goal" type="checkbox" checked={withGoal} disabled={!!editing?.goal} onChange={(event) => setWithGoal(event.target.checked)} />设为本次练习目标</label>
      {withGoal && <div className="goal-fields">
        {!essay.learnerId && <p className="feedback error">请先在上方保存学生分组，再创建目标。</p>}
        <label>具体目标<input id="goal-instruction" className="text-input" value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：说明具体影响，而不只说 important" /></label>
        <label>练习与下一次检查<textarea id="goal-practice" className="prompt-input" value={practice} onChange={(event) => setPractice(event.target.value)} placeholder="改写一句，说明理由；下一篇检查是否独立表达了具体影响。" /></label>
      </div>}
      <div className="backup-actions"><button type="button" className="secondary-button" onClick={submit}>{editing ? '更新教学判断' : '保存教学判断'}</button>{editing && <button type="button" className="text-button" onClick={reset}>取消编辑</button>}</div>
      {message && <p role={message.error ? 'alert' : 'status'} className={`feedback ${message.error ? 'error' : 'success'}`}>{message.text}</p>}
    </div>
  </section>;
}

export function FeedbackDownload({ learner, essays, essayId }: { learner: string; essays: EssayRecord[]; essayId?: string }) {
  const [error, setError] = useState('');
  return <><button type="button" className="secondary-button" disabled={!learner} onClick={() => {
    try { downloadFile(buildFeedbackHtml(learner, essays, essayId), `DEEA-${learner}-学习反馈单.html`, 'text/html;charset=utf-8'); setError(''); }
    catch (error) { setError(messageOf(error)); }
  }}>下载反馈单（可打印）</button>{error && <p role="alert">{error}</p>}</>;
}

export function GoalBoard({ learner, essays, repository, onChanged, onOpen }: {
  learner: string; essays: EssayRecord[]; repository: EssayRepository; onChanged: () => void; onOpen: (id: string) => void;
}) {
  const [archived, setArchived] = useState(false);
  const goals = goalsFor(essays, learner, archived);
  return <section className="goal-board" aria-label="学习目标与后续核查">
    <div className="section-heading"><div><h2>Learning goals / 学习目标</h2><p>先完成一个目标，再看下一篇的真实表达。</p></div><FeedbackDownload learner={learner} essays={essays} /></div>
    {!learner ? <p className="empty-state">请先选择一位学生。未分组作文需要在历史详情中指定学生。</p> : <>
      <p className="scope-caption">当前学生：<strong>{learner}</strong> · 未记录核查不代表已掌握。没有适用机会也不记为失败。</p>
      {goalsFor(essays, learner).length > 2 && <p className="storage-alert">导入保留了超过两个目标。请核对不同版本，将暂不练习的目标归档；已有证据不会删除。</p>}
      <label className="filter-toggle"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />包括已归档目标</label>
      {!goals.length && <p className="empty-state">暂无目标。打开一篇历史作文，核查原句后保存教学判断，并勾选“设为本次练习目标”。</p>}
      {goals.map(({ essay, note }) => <GoalCard key={`${essay.id}:${note.id}`} source={essay} note={note} essays={essays} repository={repository} onChanged={onChanged} onOpen={onOpen} />)}
    </>}
  </section>;
}

function GoalCard({ source, note, essays, repository, onChanged, onOpen }: {
  source: EssayRecord; note: TeachingNote; essays: EssayRecord[]; repository: EssayRepository; onChanged: () => void; onOpen: (id: string) => void;
}) {
  const goal = note.goal!;
  const candidates = checkCandidates(source, essays);
  const [targetId, setTargetId] = useState('');
  const target = candidates.find((essay) => essay.id === targetId);
  const [start, setStart] = useState('');
  const [status, setStatus] = useState<CheckInput['status']>('needs-work');
  const [reason, setReason] = useState('');
  const [reflection, setReflection] = useState('');
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const spans = target ? sentenceSpans(target.text) : [];
  const chooseTarget = (id: string) => {
    setTargetId(id);
    const previous = goal.checks.find((check) => check.essayId === id);
    setStart(previous?.evidence ? String(previous.evidence.start) : '');
    setStatus(previous?.status ?? 'needs-work'); setReason(previous?.reason ?? ''); setReflection(previous?.reflection ?? ''); setMessage(null);
  };
  const save = () => {
    const span = spans.find((span) => String(span.start) === start);
    try {
      repository.saveGoalCheck(source.id, note.id, { essayId: targetId, status, reason, reflection,
        evidence: status === 'no-opportunity' || !span || !target ? undefined : { ...span, quote: target.text.slice(span.start, span.end) } });
      onChanged(); setMessage({ error: false, text: '核查已保存。状态由你的判断决定，没有自动推断进步。' });
    } catch (error) { setMessage({ error: true, text: messageOf(error) }); }
  };
  return <article className={`goal-card ${goal.archived ? 'archived' : ''}`}>
    <div className="section-heading"><h3>{goal.instruction}</h3><span className="status-chip">{goal.archived ? '已归档' : '练习中'}</span></div>
    <p>{goal.practice || '先尝试改写，再说明你为什么这样改。'}</p>
    <details className="goal-source"><summary>查看原句与教师理由 · {source.title}</summary><blockquote>{note.quote}</blockquote><p>{DECISIONS[note.decision]}：{note.reason}</p><button type="button" className="text-button" onClick={() => onOpen(source.id)}>打开原稿与修改记录</button></details>
    <h4>后续证据</h4>
    {!goal.checks.length && <p className="analysis-help">待核查。保存修改稿或新的独立任务后，在下方选择文章。</p>}
    {goal.checks.map((check) => <section className="goal-check" key={check.id}>
      <strong>{CHECK_STATUSES[check.status]}</strong><p><button type="button" className="text-button" onClick={() => onOpen(check.essayId)}>{essays.find((essay) => essay.id === check.essayId)?.title}</button></p>
      {check.evidence && <blockquote>{check.evidence.quote}</blockquote>}<p>依据：{check.reason}</p>{check.reflection && <p>学生说明：{check.reflection}</p>}
      <button type="button" className="text-button" onClick={() => chooseTarget(check.essayId)}>修改这次核查</button>
    </section>)}
    <details className="check-form" open={targetId ? true : undefined}><summary>记录或更新一次核查</summary>
      {!candidates.length ? <p>目前没有同一学生的后续修改稿或新任务。可从历史作文“创建修改稿”，也可在新作文中选择“新任务（独立写作）”。</p> : <>
        <label>选择后续作文<select className="text-input check-target" value={targetId} onChange={(event) => chooseTarget(event.target.value)}><option value="">请选择</option>{candidates.map((essay) => <option key={essay.id} value={essay.id}>{essay.title} · {stageLabel(essay)} · {essay.writtenAt}</option>)}</select></label>
        {target && <>
          <label>核查状态<select className="text-input check-status" value={status} onChange={(event) => setStatus(event.target.value as CheckInput['status'])}>
            {Object.entries(CHECK_STATUSES).map(([value, label]) => <option key={value} value={value} disabled={(value === 'revised' && !isDescendant(target, source.id, essays)) || (value === 'transfer' && (!!target.revisionOf || (!!source.taskId && source.taskId === target.taskId)))}>{label}</option>)}
          </select></label>
          {status !== 'no-opportunity' && <label>原句证据<select className="text-input check-evidence" value={start} onChange={(event) => setStart(event.target.value)}><option value="">请选择原句</option>{spans.map((span) => <option key={span.start} value={span.start}>{target.text.slice(span.start, span.end)}</option>)}</select></label>}
          {start !== '' && status !== 'no-opportunity' && <blockquote>{target.text.slice(Number(start), spans.find((span) => span.start === Number(start))?.end)}</blockquote>}
          <label>核查依据<textarea className="prompt-input check-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="说明表达为什么恰当、哪里仍需练习，或为什么本次不适用。" /></label>
          <label>学生的修改理由或反思（可选）<textarea className="prompt-input check-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} /></label>
          <button type="button" className="secondary-button" onClick={save}>保存核查</button>
        </>}
      </>}
    </details>
    <button className="text-button archive-goal" type="button" onClick={() => {
      try { repository.setGoalArchived(source.id, note.id, !goal.archived); onChanged(); setMessage({ error: false, text: goal.archived ? '目标已恢复。' : '目标已归档，证据仍保留。' }); }
      catch (error) { setMessage({ error: true, text: messageOf(error) }); }
    }}>{goal.archived ? '恢复练习目标' : '归档目标（保留记录）'}</button>
    {message && <p role={message.error ? 'alert' : 'status'} className={`feedback ${message.error ? 'error' : 'success'}`}>{message.text}</p>}
  </article>;
}
