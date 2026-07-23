# DEEA — COCA Word-Frequency Comparison Tool

DEEA is a browser-based prototype for comparing repeated lemmas in English text with the COCA Top 5K frequency list.

DEEA 是一个浏览器端原型工具，用于将英文文本中的重复词与 COCA Top 5K 高频词表进行对照。

## What It Does

- Paste English text into the page.
- Analyze the text locally in the browser.
- Compare counted lemmas with the COCA Top 5K list while preserving observed surface forms as text evidence.
- Display the comparison results in a table.

Workflow: paste English text -> analyze locally -> compare with COCA Top 5K.

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

Text analysis runs in the browser. There is no backend, login, account system, or server-side text submission in this prototype.

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
