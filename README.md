# DEEA — COCA Word-Frequency Comparison Tool

DEEA is a browser-based prototype for comparing repeated lemmas in English text with the COCA Top 5K frequency list.

DEEA 是一个浏览器端原型工具，用于将英文文本中的重复词与 COCA Top 5K 高频词表进行对照。

Product decisions, versioned PRDs, technical design (Chinese and English), and validation evidence: [docs/README.md](./docs/README.md).

Try the five [original IELTS Task 2 sample essays](./data/demo/IELTS_TASK2_FIVE_ESSAYS.md) in the New essay form to reproduce cross-essay results. See the [v0.3 product wireframe and design notes](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN_CN.md) for the current three-tab flow. The samples are fictional test data, not assessed model answers; they are not added to your browser unless you enter and save them.

## What It Does

- Enter an essay title, writing date, optional task/prompt, and original essay text.
- Analyze the text locally in the browser.
- Analyze and automatically save the essay metadata and original text to this browser. A different essay must have a unique title (case-insensitive); re-analyzing identical content is safe.
- Open History to list saved essays, inspect the original text, and recompute analysis with the current analyzer.
- Open Across essays to aggregate lemmas from every saved essay. The repeated-word list shows words used in at least two essays and at least three times in total; expand a row to see per-essay counts and reopen its source.
- Inspect a limited importance-word pilot that compares observed uses of `important`, `significant`, `essential`, and `crucial` within those four words only. This is not a contextual semantic analysis or a writing score.
- Once three essays have been saved, review a local writing-advice panel based on the latest three essays. It highlights repeated examples from a small curated adjective list and offers context-sensitive practice prompts. If the sample has no qualifying repeat, it offers a cautious next-step prompt.
- Records persist across page refreshes in this browser.
- Delete a saved essay only after confirming in an in-page dialog.

Workflow: fill essay details -> analyze and save locally -> compare all saved essays in Across essays -> view writing advice after three saved essays -> reopen originals from History.

## Key Outputs

- Total words
- Lemma rows with observed forms and count in this essay, shown only when the word appears at least three times here; hidden one- and two-use words still contribute to cross-essay counts
- Cross-essay repeated words, essay-by-essay evidence, and one four-word pilot share with its denominator explained
- Writing advice after three saved essays, including per-essay evidence and optional expression choices to verify in context

The analyzer still uses the COCA-derived list internally for lookups. Coverage, per-100-word rate, derived rank, and aggregated frequency are not shown as writing-quality indicators.

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
- Writing advice uses a small, manually curated adjective list. It does not tag part of speech in context, prove semantic dependency, score writing, or automatically replace words. Compare essays from the same genre; differences in writing prompts can change word-use opportunities.
- A repeated-expression candidate must occur at least three times in one of the latest three essays and appear in at least two of those essays. A weaker recurrence is labeled as an observation, not a dependency.
- Cross-essay counts include all essays stored in this browser, regardless of author, genre or prompt. There is no author or genre filter yet. The importance pilot counts only four fixed words, including uses with different meanings or parts of speech; its denominator is not all opportunities to express importance.
- A weaker recurrence appears as an individual advice observation only when it spans at least two of the latest three essays and totals at least three uses.

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

The source CSV includes multiple rows for a lemma when it occurs with different parts of speech. The internal lookup
aggregates these rows and computes a derived lemma rank. That rank is **not displayed as a writing-quality metric**.

## Scope

This is a local word-frequency prototype with basic writing prompts, not an AI grading product.

Not implemented in this version:

- Genre-controlled trends, contextual semantic-group classification and opportunity-based concentration
- Persistent issue identification
- AI-generated suggestions
- Accounts, a backend, or cross-device sync
