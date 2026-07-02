import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import cocaCsv from '../data/COCA_WordFrequency_top5000.csv?raw';
import './style.css';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'from',
  'by',
  'with',
  'about',
  'as',
  'into',
  'like',
  'through',
  'after',
  'over',
  'between',
  'out',
  'against',
  'during',
  'without',
  'before',
  'under',
  'around',
  'among',
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'because',
  'although',
  'if',
  'when',
  'while',
  'where',
  'than',
  'that',
  'this',
  'these',
  'those',
  'i',
  'me',
  'my',
  'mine',
  'we',
  'us',
  'our',
  'ours',
  'you',
  'your',
  'yours',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'it',
  'its',
  'they',
  'them',
  'their',
  'theirs',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'am',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'can',
  'could',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'must',
]);

type CocaEntry = {
  rank: number;
  lemma: string;
  PoS: string;
  freq: number;
  perMil: number;
};

type WordFrequency = {
  word: string;
  count: number;
  cocaEntry?: CocaEntry;
};

function parseCocaCsv(csv: string): Map<string, CocaEntry> {
  const entries = new Map<string, CocaEntry>();
  const [, ...rows] = csv.trim().replace(/^\uFEFF/, '').split(/\r?\n/);

  rows.forEach((row) => {
    const [rank, lemma, PoS, freq, perMil] = row.split(',');

    if (!rank || !lemma || !PoS || !freq || !perMil) {
      return;
    }

    entries.set(lemma.toLowerCase(), {
      rank: Number(rank),
      lemma,
      PoS,
      freq: Number(freq),
      perMil: Number(perMil),
    });
  });

  return entries;
}

const COCA_ENTRIES = parseCocaCsv(cocaCsv);

function getWordFrequencies(text: string, cocaEntries: Map<string, CocaEntry>): WordFrequency[] {
  const words = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  const counts = new Map<string, number>();

  words.forEach((word) => {
    if (STOP_WORDS.has(word)) {
      return;
    }

    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  return Array.from(counts, ([word, count]) => ({
    word,
    count,
    cocaEntry: cocaEntries.get(word),
  })).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    if (a.cocaEntry && !b.cocaEntry) {
      return -1;
    }

    if (!a.cocaEntry && b.cocaEntry) {
      return 1;
    }

    if (a.cocaEntry && b.cocaEntry && a.cocaEntry.rank !== b.cocaEntry.rank) {
      return a.cocaEntry.rank - b.cocaEntry.rank;
    }

    return a.word.localeCompare(b.word);
  });
}

const formatNumber = new Intl.NumberFormat('en-US');
const formatPerMillion = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function App() {
  const [essay, setEssay] = useState('');
  const [frequencies, setFrequencies] = useState<WordFrequency[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const cocaEntries = useMemo(() => COCA_ENTRIES, []);

  const handleAnalyze = () => {
    setFrequencies(getWordFrequencies(essay, cocaEntries));
    setHasAnalyzed(true);
  };

  return (
    <main className="home">
      <section className="word-tool" aria-labelledby="page-title">
        <h1 id="page-title">DEEA - Academic English Evolution Agent</h1>
        <p className="subtitle">Paste an English essay to see its most meaningful repeated words.</p>

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

        {hasAnalyzed && (
          <section className="results" aria-live="polite" aria-label="Word frequency results">
            <h2>Word Frequency</h2>
            <p className="coca-note">A lower COCA rank means the word is more common in American English corpora.</p>
            {frequencies.length > 0 ? (
              <div className="frequency-table-wrapper">
                <table className="frequency-table">
                  <thead>
                    <tr>
                      <th scope="col">Word</th>
                      <th scope="col">Essay Count</th>
                      <th scope="col">COCA Rank</th>
                      <th scope="col">COCA Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencies.map(({ word, count, cocaEntry }) => (
                      <tr key={word}>
                        <th scope="row">{word}</th>
                        <td>{count}</td>
                        <td>{cocaEntry ? `#${formatNumber.format(cocaEntry.rank)}` : 'Not in COCA Top 5K'}</td>
                        <td>
                          {cocaEntry
                            ? `${formatNumber.format(cocaEntry.freq)} / ${formatPerMillion.format(cocaEntry.perMil)} per million`
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
