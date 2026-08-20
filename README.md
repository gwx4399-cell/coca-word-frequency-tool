# DEEA — COCA Word-Frequency Comparison Tool

DEEA is a browser-based prototype for comparing repeated lemmas in English text with the COCA Top 5K frequency list.

DEEA 是一个浏览器端原型工具，用于将英文文本中的重复词与 COCA Top 5K 高频词表进行对照。

## What It Does

- Enter an essay title, writing date, optional task/prompt, and original essay text.
- Analyze the text locally in the browser.
- After a valid analysis, save the essay metadata and original text to this browser.
- Open History to list saved essays, inspect the original text, and recompute analysis with the current analyzer.
- Records persist across page refreshes in this browser.
- Delete a saved essay only after confirming in an in-page dialog.

Workflow: fill essay details -> analyze locally -> optionally save to this browser -> reopen from History.

## Key Outputs

- Total words
- Lexical tokens
- Unique analyzed lemmas
- COCA coverage of analyzed tokens
- Lemma rows with observed forms, essay count, rate per 100 total words, derived lemma rank, and aggregated COCA frequency

## Stack

- Vite
- React
- TypeScript

## Privacy

Essay history is stored only in this browser's `localStorage`. Text analysis and storage both run locally. Essays are not uploaded to a server. Clearing browser data permanently deletes saved essay history. There is no backend, login, account system, or server-side text submission in this prototype.

## Known Limitations

- Lightweight deterministic lemmatization only. Without contextual part-of-speech tagging, ambiguous common inflections
  such as `used` and `running` use fixed mappings to their base lemmas; unsupported forms fall back to the original token.
- Limited tokenizer.
- Uses a Top 5K COCA-derived frequency list rather than the full COCA corpus.

## Local Run

```bash
npm ci
npm run dev
npm run build
npm run preview
```

## GitHub Pages

Expected public URL:

```text
https://gwx4399-cell.github.io/coca-word-frequency-tool/
```

## COCA Attribution and Data Note

Word frequency data from the Corpus of Contemporary American English (COCA).

Source text: wordfrequency.info

The included dataset is a Top-frequency list derived from COCA frequency data. It is not the full COCA corpus. See `NOTICE.md` and `data/README_COCA_top5050.txt` before redistributing or reusing the dataset.

The source CSV includes multiple rows for the same lemma when that lemma appears with different parts of speech. DEEA
aggregates those rows by lemma, keeps all listed parts of speech, sums `freq` and `perMil`, and then computes a derived
lemma rank from the aggregated frequency. The displayed rank is therefore a derived lemma rank, not the original
lemma+PoS rank from the CSV.

## Scope

This is a word-frequency comparison prototype, not an AI grading or writing-evaluation product.

Not implemented in this version:

- Cross-essay trends
- Persistent issue identification
- AI suggestions
- Accounts, a backend, or cross-device sync
