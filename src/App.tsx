import { useEffect, useMemo, useRef, useState } from 'react';
import cocaCsv from '../data/COCA_WordFrequency_top5000.csv?raw';
import { analyzeEssay } from './analysis/analyzeEssay';
import { parseCocaCsv, type CocaLemmaMap } from './analysis/coca';
import {
  EssayRepository,
  EssayValidationError,
  validateEssayInput,
} from './storage/essayRepository';
import type { EssayAnalysis } from './types/analysis';
import type { CreateEssayInput, EssayRecord, EssayValidationErrors } from './types/essay';
import './style.css';

const formatNumber = new Intl.NumberFormat('en-US');
const formatDecimal = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const COCA_ENTRIES = parseCocaCsv(cocaCsv);

type AppView = 'new' | 'history';
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
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [essays, setEssays] = useState<EssayRecord[]>(() => repository.listEssays());
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [essayPendingDeletion, setEssayPendingDeletion] = useState<EssayRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const currentSignature = getEssaySignature(form);
  const canSave =
    analysis !== null &&
    analyzedText === form.text &&
    savedSignature !== currentSignature;

  const updateField = (field: keyof CreateEssayInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);

    if (field === 'text') {
      setAnalysis(null);
      setAnalyzedText(null);
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
      setAnalyzedText(null);
      setFeedback({ kind: 'error', message: 'Correct the highlighted fields before analyzing.' });
      return;
    }

    setAnalysis(analyzeEssay(form.text, cocaEntries));
    setAnalyzedText(form.text);
    setFeedback({ kind: 'success', message: 'Analysis complete. This essay can now be saved.' });
  };

  const handleSave = () => {
    const errors = validateEssayInput(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFeedback({ kind: 'error', message: 'Correct the highlighted fields before saving.' });
      return;
    }

    if (!analysis || analyzedText !== form.text) {
      setFeedback({ kind: 'error', message: 'Analyze the current essay text before saving.' });
      return;
    }

    try {
      const savedEssay = repository.createEssay(form);
      setEssays(repository.listEssays());
      setSavedSignature(currentSignature);
      setFeedback({ kind: 'success', message: `"${savedEssay.title}" is saved in this browser.` });
    } catch (error) {
      if (error instanceof EssayValidationError) {
        setFieldErrors(error.fieldErrors);
      }

      setFeedback({ kind: 'error', message: 'The essay could not be saved in this browser.' });
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

      if (getEssaySignature(deletedEssay) === currentSignature) {
        setSavedSignature(null);
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
        <p className="subtitle">Analyze an English essay and optionally keep it in this browser.</p>

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
        </nav>

        {activeView === 'new' ? (
          <section className="workspace-section" aria-labelledby="new-essay-title">
            <h2 id="new-essay-title">New essay</h2>
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
                Analyze
              </button>
              <button className="secondary-button" type="button" onClick={handleSave} disabled={!canSave}>
                {savedSignature === currentSignature ? 'Saved' : 'Save to history'}
              </button>
            </div>

            {feedback && (
              <p className={`feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
                {feedback.message}
              </p>
            )}

            {analysis && <AnalysisResults analysis={analysis} />}
          </section>
        ) : (
          <HistoryView
            essays={essays}
            selectedEssayId={selectedEssayId}
            cocaEntries={cocaEntries}
            onOpen={setSelectedEssayId}
            onDelete={requestDelete}
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
                  <span>{formatDecimal.format(summary.cocaCoveragePct)}% COCA coverage</span>
                </span>
              </button>
              <button className="delete-button" type="button" onClick={() => onDelete(essay)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">No saved essays yet. Analyze an essay, then choose Save to history.</p>
      )}
    </section>
  );
}

function AnalysisResults({ analysis }: { analysis: EssayAnalysis }) {
  return (
    <section className="results" aria-live="polite" aria-label="Essay analysis results">
      <h2>Essay Analysis</h2>
      <p className="coca-note">
        COCA values are aggregated by lemma across all listed parts of speech. Rank shown here is a derived lemma rank
        based on aggregated frequency, not the original lemma+PoS rank from the CSV.
      </p>

      <div className="summary-grid" aria-label="Analysis summary">
        <SummaryCard label="Total words" value={formatNumber.format(analysis.totalWordCount)} />
        <SummaryCard label="Lexical tokens" value={formatNumber.format(analysis.lexicalTokenCount)} />
        <SummaryCard label="Unique analyzed lemmas" value={formatNumber.format(analysis.uniqueLemmaCount)} />
        <SummaryCard
          label="COCA coverage of analyzed tokens"
          value={`${formatDecimal.format(analysis.cocaCoveragePct)}%`}
        />
      </div>

      {analysis.lemmas.length > 0 ? (
        <div className="frequency-table-wrapper">
          <table className="frequency-table">
            <thead>
              <tr>
                <th scope="col">Lemma</th>
                <th scope="col">Observed forms</th>
                <th scope="col">Essay count</th>
                <th scope="col">Rate per 100 total words</th>
                <th scope="col">Derived lemma rank</th>
                <th scope="col">Aggregated COCA frequency</th>
              </tr>
            </thead>
            <tbody>
              {analysis.lemmas.map((lemmaResult) => (
                <tr key={lemmaResult.lemma}>
                  <th scope="row">{lemmaResult.lemma}</th>
                  <td>{lemmaResult.observedForms.join(', ')}</td>
                  <td>{formatNumber.format(lemmaResult.count)}</td>
                  <td>{formatDecimal.format(lemmaResult.ratePer100Words)}</td>
                  <td>
                    {lemmaResult.derivedLemmaRank
                      ? `#${formatNumber.format(lemmaResult.derivedLemmaRank)}`
                      : 'Not in COCA Top 5K'}
                  </td>
                  <td>
                    {lemmaResult.aggregatedCocaFrequency
                      ? formatNumber.format(lemmaResult.aggregatedCocaFrequency)
                      : 'Not in COCA Top 5K'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">No countable words found after removing common function words.</p>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function getTodayDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function getEssaySignature(input: CreateEssayInput): string {
  return JSON.stringify([
    input.title.trim(),
    input.writtenAt.trim(),
    input.taskPrompt?.trim() || '',
    input.text,
  ]);
}

export default App;
