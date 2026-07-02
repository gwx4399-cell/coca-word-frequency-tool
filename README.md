# DEEA — COCA Word-Frequency Comparison Tool

DEEA is a browser-based prototype for comparing repeated words in English text with the COCA Top 5K frequency list.

DEEA 是一个浏览器端原型工具，用于将英文文本中的重复词与 COCA Top 5K 高频词表进行对照。

## What It Does

- Paste English text into the page.
- Analyze the text locally in the browser.
- Compare counted surface-form words with the COCA Top 5K list.
- Display the comparison results in a table.

Workflow: paste English text -> analyze locally -> compare with COCA Top 5K.

## Key Outputs

- Word
- Essay Count
- COCA Rank
- COCA Frequency

## Stack

- Vite
- React
- TypeScript

## Privacy

Text analysis runs in the browser. There is no backend, login, account system, or server-side text submission in this prototype.

## Known Limitations

- Surface-form matching only.
- No lemmatization.
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

## Scope

This is a word-frequency comparison prototype, not an AI grading or writing-evaluation product.
