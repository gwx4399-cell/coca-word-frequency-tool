import { useEffect, useMemo, useRef, useState } from 'react';
import cocaCsv from '../data/COCA_WordFrequency_top5000.csv?raw';
import { analyzeEssay } from './analysis/analyzeEssay';
import { analyzeAcrossEssays, type AcrossEssayAnalysis } from './analysis/acrossEssays';
import { parseCocaCsv, type CocaLemmaMap } from './analysis/coca';
import { getWritingAdvice, type WritingAdvice } from './analysis/writingAdvice';
import {
  EssayRepository,
  EssayStorageError,
  EssayValidationError,
  validateEssayInput,
} from './storage/essayRepository';
import type { EssayAnalysis } from './types/analysis';
import type { CreateEssayInput, EssayRecord, EssayValidationErrors } from './types/essay';
import { BackupPanel } from './components/BackupPanel';
import { HighlightedText, WordEvidence } from './components/WordEvidence';
import { findLemmaMatches } from './analysis/evidence';
import './style.css';
import './review.css';

const formatNumber = new Intl.NumberFormat('en-US');

const COCA_ENTRIES = parseCocaCsv(cocaCsv);

type AppView = 'new' | 'history' | 'progress';
type Feedback = { kind: 'success' | 'error'; message: string };

function App() {
  const repository = useMemo(() => new EssayRepository(), []);
  const cocaEntries = useMemo(() => COCA_ENTRIES, []);
  const [activeView, setActiveView] = useState<AppView>('new');
  const [form, setForm] = useState<CreateEssayInput>(() => ({
    title: '',
    writtenAt: getTodayDate(),
    taskPrompt: '',
    text: '',
  }));
  const [fieldErrors, setFieldErrors] = useState<EssayValidationErrors>({});
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [history, setHistory] = useState(() => repository.inspect());
  const essays = history.essays;
  const refreshHistory = () => setHistory(repository.inspect());
  useEffect(() => {
    const refresh = () => setHistory(repository.inspect());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [repository]);
  const writingAdvice = useMemo(() => getWritingAdvice(essays, cocaEntries), [essays, cocaEntries]);
  const acrossEssays = useMemo(() => analyzeAcrossEssays(essays, cocaEntries), [essays, cocaEntries]);
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [selectedLemma, setSelectedLemma] = useState<string | null>(null);
  const [fromAcross, setFromAcross] = useState(false);
  const [expandedLemma, setExpandedLemma] = useState<string | null>(null);
  const [essayPendingDeletion, setEssayPendingDeletion] = useState<EssayRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const updateField = (field: keyof CreateEssayInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);

    if (field === 'text') {
      setAnalysis(null);
    }

    if (field === 'title' || field === 'writtenAt' || field === 'text') {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const handleAnalyze = () => {
    const errors = validateEssayInput(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setAnalysis(null);
      setFeedback({ kind: 'error', message: 'Correct the highlighted fields before analyzing.' });
      return;
    }

    setAnalysis(analyzeEssay(form.text, cocaEntries));
    try {
      const savedEssay = repository.createEssay(form);
      refreshHistory();
      setFeedback({ kind: 'success', message: `Analysis complete. "${savedEssay.title}" is saved in this browser.` });
    } catch (error) {
      if (error instanceof EssayValidationError) {
        setFieldErrors(error.fieldErrors);
        setFeedback({ kind: 'error', message: error.fieldErrors.title ?? 'The essay could not be saved.' });
      } else {
        setFeedback({ kind: 'error', message: error instanceof EssayStorageError ? error.message : 'The essay could not be saved in this browser.' });
        refreshHistory();
      }
    }
  };

  const requestDelete = (essay: EssayRecord) => {
    setDeleteError(null);
    setEssayPendingDeletion(essay);
  };

  const cancelDelete = () => {
    setDeleteError(null);
    setEssayPendingDeletion(null);
  };

  const confirmDelete = () => {
    if (!essayPendingDeletion) {
      return;
    }

    try {
      const deletedEssay = essayPendingDeletion;
      repository.deleteEssay(deletedEssay.id);
      refreshHistory();

      if (selectedEssayId === deletedEssay.id) {
        setSelectedEssayId(null);
      }

      setEssayPendingDeletion(null);
      setDeleteError(null);
    } catch {
      setDeleteError('The essay could not be deleted from this browser.');
    }
  };

  return (
    <main className="home">
      <section className="word-tool" aria-labelledby="page-title">
        <h1 id="page-title">DEEA - Academic English Evolution Agent</h1>
        <p className="subtitle">从重复用词回到原句，找到下一次写作可以练习的一处表达。</p>
        <p className="workspace-guide">New essay 新作文 → History 历史作文 → Across essays 跨篇观察。当前浏览器只放同一位写作者的同类作文；本工具不评分。</p>

        <nav className="view-tabs" aria-label="Essay workspace">
          <button
            className={activeView === 'new' ? 'view-tab active' : 'view-tab'}
            type="button"
            aria-pressed={activeView === 'new'}
            onClick={() => setActiveView('new')}
          >
            New essay
          </button>
          <button
            className={activeView === 'history' ? 'view-tab active' : 'view-tab'}
            type="button"
            aria-pressed={activeView === 'history'}
            onClick={() => setActiveView('history')}
          >
            History ({essays.length})
          </button>
          <button
            className={activeView === 'progress' ? 'view-tab active' : 'view-tab'}
            type="button"
            aria-pressed={activeView === 'progress'}
            onClick={() => setActiveView('progress')}
          >
            Across essays
          </button>
        </nav>

        {history.issue && <div className="storage-alert" role="alert">
          <strong>历史暂不可用，已暂停写入。</strong>
          <p>{new EssayStorageError(history.issue).message}</p>
          <button type="button" className="text-button" onClick={refreshHistory}>重新读取历史</button>
        </div>}
        <BackupPanel repository={repository} history={history} onChanged={refreshHistory} />

        {writingAdvice && <WritingAdvicePanel advice={writingAdvice} />}

        {activeView === 'new' ? (
          <section className="workspace-section" aria-label="New essay form">
            <div className="form-grid">
              <FormField
                id="essay-title"
                label="Title / 作文标题"
                error={fieldErrors.title}
              >
                <input
                  id="essay-title"
                  className="text-input"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? 'essay-title-error' : undefined}
                  required
                />
              </FormField>

              <FormField
                id="writing-date"
                label="Writing date / 写作日期"
                error={fieldErrors.writtenAt}
              >
                <input
                  id="writing-date"
                  className="text-input"
                  type="date"
                  value={form.writtenAt}
                  onChange={(event) => updateField('writtenAt', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.writtenAt)}
                  aria-describedby={fieldErrors.writtenAt ? 'writing-date-error' : undefined}
                  required
                />
              </FormField>
            </div>

            <FormField id="task-prompt" label="Task/prompt / 写作题目（可选）">
              <textarea
                id="task-prompt"
                className="prompt-input"
                value={form.taskPrompt}
                onChange={(event) => updateField('taskPrompt', event.target.value)}
                placeholder="Optional writing task or prompt..."
              />
            </FormField>

            <FormField id="essay-input" label="Essay text / 作文正文" error={fieldErrors.text}>
              <textarea
                id="essay-input"
                className="essay-input"
                value={form.text}
                onChange={(event) => updateField('text', event.target.value)}
                placeholder="Paste your English essay here..."
                aria-invalid={Boolean(fieldErrors.text)}
                aria-describedby={fieldErrors.text ? 'essay-input-error' : undefined}
                required
              />
            </FormField>

            <div className="form-actions">
              <button className="primary-button" type="button" disabled={!!history.issue} onClick={handleAnalyze}>
                Analyze and save
              </button>
              {feedback?.kind === 'success' && <button className="secondary-button" type="button" onClick={() => {
                setForm({ title: '', writtenAt: getTodayDate(), taskPrompt: '', text: '' });
                setAnalysis(null); setFeedback(null); setFieldErrors({});
                document.getElementById('essay-title')?.focus();
              }}>写下一篇 / Start next essay</button>}
            </div>

            {feedback && (
              <p className={`feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
                {feedback.message}
              </p>
            )}

            {analysis && <AnalysisResults key={form.text} analysis={analysis} text={form.text} cocaEntries={cocaEntries} />}
          </section>
        ) : history.issue ? <p className="empty-state">请先在上方恢复或重新读取历史，再查看已保存作文。</p> : activeView === 'history' ? (
          <HistoryView
            essays={essays}
            selectedEssayId={selectedEssayId}
            cocaEntries={cocaEntries}
            selectedLemma={selectedLemma}
            onSelectLemma={setSelectedLemma}
            onOpen={(id) => { setSelectedEssayId(id); setSelectedLemma(null); setFromAcross(false); }}
            onBackAcross={fromAcross ? () => setActiveView('progress') : undefined}
            onDelete={requestDelete}
          />
        ) : (
          <AcrossEssaysView
            analysis={acrossEssays}
            expandedLemma={expandedLemma}
            onExpand={(lemma, open) => setExpandedLemma((current) => open ? lemma : current === lemma ? null : current)}
            onOpenEssay={(id, lemma) => {
              setSelectedEssayId(id);
              setSelectedLemma(lemma);
              setFromAcross(true);
              setActiveView('history');
            }}
          />
        )}
        {essayPendingDeletion && (
          <DeleteEssayDialog
            essay={essayPendingDeletion}
            error={deleteError}
            onCancel={cancelDelete}
            onConfirm={confirmDelete}
          />
        )}
      </section>
    </main>
  );
}

function DeleteEssayDialog({
  essay,
  error,
  onCancel,
  onConfirm,
}: {
  essay: EssayRecord;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  return (
    <div className="dialog-backdrop">
      <section
        className="confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <h2 id="delete-dialog-title">Delete essay?</h2>
        <p className="delete-essay-title">{essay.title}</p>
        <p id="delete-dialog-description">This action cannot be undone.</p>
        {error && (
          <p className="dialog-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button ref={cancelButtonRef} className="dialog-cancel" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="dialog-delete" type="button" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="essay-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function HistoryView({
  essays,
  selectedEssayId,
  cocaEntries,
  onOpen,
  onDelete,
  selectedLemma,
  onSelectLemma,
  onBackAcross,
}: {
  essays: EssayRecord[];
  selectedEssayId: string | null;
  cocaEntries: CocaLemmaMap;
  onOpen: (id: string | null) => void;
  onDelete: (essay: EssayRecord) => void;
  selectedLemma: string | null;
  onSelectLemma: (lemma: string | null) => void;
  onBackAcross?: () => void;
}) {
  const summaries = useMemo(
    () => essays.map((essay) => ({ essay, analysis: analyzeEssay(essay.text, cocaEntries) })),
    [essays, cocaEntries],
  );
  const selected = summaries.find(({ essay }) => essay.id === selectedEssayId);

  return (
    <section className="workspace-section" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <h2 id="history-title">History</h2>
          <p className="storage-notice">
            Essays are stored only in this browser. Clearing browser data will permanently delete them.
          </p>
        </div>
        {selected && (
          <button className="text-button" type="button" onClick={() => onOpen(null)}>
            Back to history
          </button>
        )}
      </div>

      {onBackAcross && <button type="button" className="text-button back-across" onClick={onBackAcross}>← 返回跨篇统计</button>}

      {selected ? (
        <article className="history-detail">
          <h3>{selected.essay.title}</h3>
          <p className="history-date">
            Written <time dateTime={selected.essay.writtenAt}>{selected.essay.writtenAt}</time>
          </p>
          {selected.essay.taskPrompt && (
            <div className="prompt-evidence">
              <strong>Task/prompt</strong>
              <p>{selected.essay.taskPrompt}</p>
            </div>
          )}
          {selectedLemma && <WordEvidence text={selected.essay.text} lemma={selectedLemma} entries={cocaEntries} onClose={() => onSelectLemma(null)} />}
          <div className="essay-evidence">
            <strong>Original essay</strong>
            <pre><HighlightedText text={selected.essay.text} matches={selectedLemma ? findLemmaMatches(selected.essay.text, selectedLemma, cocaEntries) : []} /></pre>
          </div>
          <AnalysisResults key={selected.essay.id} analysis={selected.analysis} text={selected.essay.text} cocaEntries={cocaEntries} onSelectLemma={onSelectLemma} />
        </article>
      ) : essays.length > 0 ? (
        <div className="history-list">
          {summaries.map(({ essay, analysis: summary }) => (
            <article className="history-card" key={essay.id}>
              <button className="history-open" type="button" onClick={() => onOpen(essay.id)}>
                <span>
                  <strong>{essay.title}</strong>
                  <time dateTime={essay.writtenAt}>{essay.writtenAt}</time>
                </span>
                <span className="history-metrics">
                  <span>{formatNumber.format(summary.totalWordCount)} total words</span>
                </span>
              </button>
              <button className="delete-button" type="button" onClick={() => onDelete(essay)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">No saved essays yet. Analyze and save an essay to begin.</p>
      )}
    </section>
  );
}

function AnalysisResults({ analysis, text, cocaEntries, onSelectLemma }: {
  analysis: EssayAnalysis; text: string; cocaEntries: CocaLemmaMap; onSelectLemma?: (lemma: string) => void;
}) {
  const [lemma, setLemma] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase().replace(/’/g, "'");
  const visibleLemmas = analysis.lemmas.filter((row) => (query || showAll || row.count >= 3)
    && (!query || row.lemma.includes(query) || row.observedForms.some((form) => form.toLowerCase().replace(/’/g, "'").includes(query))));
  return (
    <section className="results" aria-live="polite" aria-label="Essay analysis results">
      <h2>Essay Analysis</h2>
      <p className="word-count">{formatNumber.format(analysis.totalWordCount)} total words</p>
      <p className="analysis-help">点击词语查看原句。基本形式（Lemma）将 write、wrote 等词形放在一起；归并可能有误，请结合原文核查。</p>
      <label className="filter-toggle"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} /> 显示全部分析词（包括只出现 1–2 次的词）</label>
      <label className="word-search">查找词语（也搜索低次数词和原文词形）<input type="search" className="text-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="例如 write 或 wrote" /></label>

      {visibleLemmas.length > 0 ? (
        <div className="frequency-table-wrapper">
          <table className="frequency-table">
            <thead>
              <tr>
                <th scope="col">Lemma</th>
                <th scope="col">Observed forms</th>
                <th scope="col">Count in this essay</th>
              </tr>
            </thead>
            <tbody>
              {visibleLemmas.map((lemmaResult) => (
                <tr key={lemmaResult.lemma}>
                  <th scope="row"><button type="button" className="word-button" aria-label={`查看 ${lemmaResult.lemma} 的原句`} onClick={() => onSelectLemma ? onSelectLemma(lemmaResult.lemma) : setLemma(lemmaResult.lemma)}>{lemmaResult.lemma}</button></th>
                  <td>{lemmaResult.observedForms.join(', ')}</td>
                  <td>{formatNumber.format(lemmaResult.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">{query ? '没有匹配的分析词。请检查拼写；常见功能词已排除。' : '当前没有出现至少 3 次的分析词。可勾选上方“显示全部分析词”查看原句；低次数仍计入跨篇统计。这不表示没有需要改进的表达。'}</p>
      )}
      {lemma && !onSelectLemma && <WordEvidence text={text} lemma={lemma} entries={cocaEntries} onClose={() => setLemma(null)} />}
      <p className="analysis-help">默认只列出至少 3 次的词，已排除常见功能词。次数用于寻找线索，不表示词语用错或应被替换。</p>
    </section>
  );
}

function AcrossEssaysView({
  analysis,
  onOpenEssay,
  expandedLemma,
  onExpand,
}: {
  analysis: AcrossEssayAnalysis;
  onOpenEssay: (id: string, lemma: string) => void;
  expandedLemma: string | null;
  onExpand: (lemma: string, open: boolean) => void;
}) {
  const group = analysis.pilotGroup;
  return (
    <section className="workspace-section across-essays" aria-labelledby="across-title">
      <h2 id="across-title">Across essays / 跨篇统计</h2>
      <p>已保存 {analysis.essayCount} 篇作文。以下统计使用全部历史作文；请只把同一写作者的同类写作任务放在一起比较。</p>

      <h3>Repeated words / 跨篇复现</h3>
      <p>词语至少出现在 2 篇、累计至少 3 次才显示；单篇只出现 1–2 次的记录仍计入累计次数。</p>
      {analysis.repeatedWords.length ? (
        <div className="frequency-table-wrapper">
          <table className="frequency-table">
            <thead><tr><th scope="col">Lemma</th><th scope="col">Essays</th><th scope="col">Total uses</th><th scope="col">Evidence</th></tr></thead>
            <tbody>
              {analysis.repeatedWords.map((word) => (
                <tr key={word.lemma}>
                  <th scope="row">{word.lemma}</th>
                  <td>{word.essayCount}/{analysis.essayCount}</td>
                  <td>{word.totalCount}</td>
                  <td>
                    <details open={expandedLemma === word.lemma} onToggle={(event) => onExpand(word.lemma, event.currentTarget.open)}>
                      <summary>View essay counts</summary>
                      <ul className="occurrence-list">
                        {word.occurrences.map((item) => (
                          <li key={item.essayId}>
                            <button className="text-button" type="button" aria-label={`${item.title}：查看 ${word.lemma} 的原句`} onClick={() => onOpenEssay(item.essayId, word.lemma)}>{item.title}</button>
                            <span> · {item.writtenAt} · {item.count} 次 · {item.observedForms.join(', ')}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">还没有同时满足“至少两篇、累计三次”的词。继续保存同类作文后再查看。</p>
      )}

      <h3>{group.label}</h3>
      <p className="analysis-help">这四个词不一定表达相同含义。例如 statistically significant 有特定的统计含义，不能直接当作日常的“重要”来替换。</p>
      {!group.enoughForDisplay ? (
        <p className="empty-state">这个试验词组目前不足 3 次或不足 2 篇，暂不显示占比。</p>
      ) : (
        <div className="pilot-group">
          <p>在 {group.essayCount} 篇中，这四个预设词共出现 {group.totalCount} 次；其中 <strong>{group.leadingMember?.lemma}</strong> 占 {group.leadingMember?.sharePct.toFixed(1)}%。{group.leadingMember && group.leadingMember.sharePct > 50 ? '超过这个限定词组观测次数的一半，值得核查原句。' : ''}</p>
          <details>
            <summary>查看组内词数（包括 1–2 次的词）</summary>
            <ul className="group-members">
              {group.members.filter((member) => member.count > 0).map((member) => (
                <li key={member.lemma}>{member.lemma}: {member.count} 次，{member.sharePct.toFixed(1)}%</li>
              ))}
            </ul>
          </details>
        </div>
      )}
      <p className="advice-caveat">此处占比的分母仅是 important、significant、essential、crucial 的实际出现次数，不是文章中所有表达“重要性”的机会。程序不能识别上下文词性或语义；这个试验结果不是“意群依赖”的诊断。</p>
    </section>
  );
}

function WritingAdvicePanel({ advice }: { advice: WritingAdvice }) {
  return (
    <details className="writing-advice" aria-labelledby="writing-advice-title">
      <summary id="writing-advice-title">Writing advice / 最近三篇练习提示（展开）</summary>
      <p>基于最近 {advice.essayCount} 篇已保存作文。建议先查看原句，再决定如何拓展表达。</p>
      {advice.focuses.length > 0 ? (
        <div className="advice-list">
          {advice.focuses.map((focus) => (
            <article className="advice-card" key={focus.lemma}>
              <h3>{focus.lemma} {focus.meetsCandidateRule ? '· 重复表达候选' : '· 值得继续观察'}</h3>
              <p>出现于 {focus.essayCount}/3 篇，共 {focus.totalCount} 次；{focus.occurrences.map(({ title, count }) => `${title} ${count} 次`).join('、')}。</p>
              <p>{focus.practice}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>这三篇中，示例形容词组尚未出现明显重复。下一篇可以选一处评价性表达，写出更具体的含义，再检查用词是否准确。</p>
      )}
      <p className="advice-caveat">重复次数是核查线索，不代表词语使用错误；当前工具无法判断每次用词的词性或语境，也不把换成低频词当作进步。请只比较同类写作任务。</p>
    </details>
  );
}

function getTodayDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default App;
