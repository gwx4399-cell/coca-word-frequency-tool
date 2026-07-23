import { useMemo, useState } from 'react';
import cocaCsv from '../data/COCA_WordFrequency_top5000.csv?raw';
import { analyzeEssay } from './analysis/analyzeEssay';
import { parseCocaCsv } from './analysis/coca';
import type { EssayAnalysis } from './types/analysis';
import './style.css';

const formatNumber = new Intl.NumberFormat('en-US');
const formatDecimal = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const COCA_ENTRIES = parseCocaCsv(cocaCsv);

function App() {
  const [essay, setEssay] = useState('');
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const cocaEntries = useMemo(() => COCA_ENTRIES, []);

  const handleAnalyze = () => {
    setAnalysis(analyzeEssay(essay, cocaEntries));
  };

  return (
    <main className="home">
      <section className="word-tool" aria-labelledby="page-title">
        <h1 id="page-title">DEEA - Academic English Evolution Agent</h1>
        <p className="subtitle">Paste an English essay to see its most meaningful repeated lemmas.</p>

        <label className="essay-label" htmlFor="essay-input">
          English essay
        </label>
        <textarea
          id="essay-input"
          className="essay-input"
          value={essay}
          onChange={(event) => setEssay(event.target.value)}
          placeholder="Paste your English essay here..."
        />

        <button className="analyze-button" type="button" onClick={handleAnalyze}>
          分析
        </button>

        {analysis && (
          <section className="results" aria-live="polite" aria-label="Essay analysis results">
            <h2>Essay Analysis</h2>
            <p className="coca-note">
              COCA values are aggregated by lemma across all listed parts of speech. Rank shown here is a derived lemma
              rank based on aggregated frequency, not the original lemma+PoS rank from the CSV.
            </p>

            <div className="summary-grid" aria-label="Analysis summary">
              <SummaryCard label="Total words" value={formatNumber.format(analysis.totalWordCount)} />
              <SummaryCard label="Unique lemmas" value={formatNumber.format(analysis.uniqueLemmaCount)} />
              <SummaryCard
                label="Repetition per 100 words"
                value={formatDecimal.format(analysis.repeatedLemmaRatePer100Words)}
              />
              <SummaryCard label="COCA coverage" value={`${formatDecimal.format(analysis.cocaCoveragePct)}%`} />
            </div>

            {analysis.lemmas.length > 0 ? (
              <div className="frequency-table-wrapper">
                <table className="frequency-table">
                  <thead>
                    <tr>
                      <th scope="col">Lemma</th>
                      <th scope="col">Observed forms</th>
                      <th scope="col">Essay count</th>
                      <th scope="col">Rate per 100</th>
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
        )}
      </section>
    </main>
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

export default App;
