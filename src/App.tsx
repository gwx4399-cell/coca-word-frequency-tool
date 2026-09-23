import { useEffect, useMemo, useRef, useState } from 'react';
import cocaCsv from '../data/COCA_WordFrequency_top5000.csv?raw';
import { analyzeEssay } from './analysis/analyzeEssay';
import { analyzeAcrossEssays, type AcrossEssayAnalysis } from './analysis/acrossEssays';
import { parseCocaCsv, type CocaLemmaMap } from './analysis/coca';
import { getWritingAdvice, type WritingAdvice } from './analysis/writingAdvice';
import {
  EssayRepository,
  EssayValidationError,
  validateEssayInput,
} from './storage/essayRepository';
import type { EssayAnalysis } from './types/analysis';
import type { CreateEssayInput, EssayRecord, EssayValidationErrors } from './types/essay';
import './style.css';

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
  const [essays, setEssays] = useState<EssayRecord[]>(() => repository.listEssays());
  const writingAdvice = useMemo(() => getWritingAdvice(essays, cocaEntries), [essays, cocaEntries]);
  const acrossEssays = useMemo(() => analyzeAcrossEssays(essays, cocaEntries), [essays, cocaEntries]);
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
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
      setEssays(repository.listEssays());
      setFeedback({ kind: 'success', message: `Analysis complete. "${savedEssay.title}" is saved in this browser.` });
    } catch (error) {
      if (error instanceof EssayValidationError) {
        setFieldErrors(error.fieldErrors);
        setFeedback({ kind: 'error', message: error.fieldErrors.title ?? 'The essay could not be saved.' });
      } else {
        setFeedback({ kind: 'error', message: 'The essay could not be saved in this browser.' });
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
      setEssays(repository.listEssays());

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
        <p className="subtitle">Analyze an English essay and save it in this browser.</p>

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

        {writingAdvice && <WritingAdvicePanel advice={writingAdvice} />}

        {activeView === 'new' ? (
          <section className="workspace-section" aria-label="New essay form">
            <div className="form-grid">
              <FormField
                id="essay-title"
                label="Title"
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
                label="Writing date"
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

            <FormField id="task-prompt" label="Task/prompt (optional)">
              <textarea
                id="task-prompt"
                className="prompt-input"
                value={form.taskPrompt}
                onChange={(event) => updateField('taskPrompt', event.target.value)}
                placeholder="Optional writing task or prompt..."
              />
            </FormField>

            <FormField id="essay-input" label="Essay text" error={fieldErrors.text}>
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
              <button className="primary-button" type="button" onClick={handleAnalyze}>
                Analyze and save
              </button>
            </div>

            {feedback && (
              <p className={`feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
                {feedback.message}
              </p>
            )}

            {analysis && <AnalysisResults analysis={analysis} />}
          </section>
        ) : activeView === 'history' ? (
          <HistoryView
            essays={essays}
            selectedEssayId={selectedEssayId}
            cocaEntries={cocaEntries}
            onOpen={setSelectedEssayId}
            onDelete={requestDelete}
          />
        ) : (
          <AcrossEssaysView
            analysis={acrossEssays}
            onOpenEssay={(id) => {
              setSelectedEssayId(id);
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
}: {
  essays: EssayRecord[];
  selectedEssayId: string | null;
  cocaEntries: CocaLemmaMap;
  onOpen: (id: string | null) => void;
  onDelete: (essay: EssayRecord) => void;
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
          <div className="essay-evidence">
            <strong>Original essay</strong>
            <pre>{selected.essay.text}</pre>
          </div>
          <AnalysisResults analysis={selected.analysis} />
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

function AnalysisResults({ analysis }: { analysis: EssayAnalysis }) {
  const visibleLemmas = analysis.lemmas.filter((row) => row.count >= 3);
  return (
    <section className="results" aria-live="polite" aria-label="Essay analysis results">
      <h2>Essay Analysis</h2>
      <p className="word-count">{formatNumber.format(analysis.totalWordCount)} total words</p>

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
                  <th scope="row">{lemmaResult.lemma}</th>
                  <td>{lemmaResult.observedForms.join(', ')}</td>
                  <td>{formatNumber.format(lemmaResult.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">No word appears three or more times in this essay. All counts still contribute to cross-essay analysis.</p>
      )}
    </section>
  );
}

function AcrossEssaysView({
  analysis,
  onOpenEssay,
}: {
  analysis: AcrossEssayAnalysis;
  onOpenEssay: (id: string) => void;
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
                    <details>
                      <summary>View essay counts</summary>
                      <ul className="occurrence-list">
                        {word.occurrences.map((item) => (
                          <li key={item.essayId}>
                            <button className="text-button" type="button" onClick={() => onOpenEssay(item.essayId)}>{item.title}</button>
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
    <section className="writing-advice" aria-labelledby="writing-advice-title">
      <h2 id="writing-advice-title">Writing advice / 写作建议</h2>
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
    </section>
  );
}

function getTodayDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default App;
