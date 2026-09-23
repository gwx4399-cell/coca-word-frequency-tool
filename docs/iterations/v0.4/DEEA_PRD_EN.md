# DEEA v0.4 Product Requirements

**Status:** Implemented on `feature/original-sentence-evidence-v0-4`, pending review and merge. **Date:** 2026-09-23. **Pull request:** [Original sentence evidence #9](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/9).

## Problem and outcome

In v0.3, Across essays reports the number of essays, total uses and observed forms, then links to the saved essay. A teacher still has to search the whole essay to learn whether the word carried the same meaning or was prompted by the task. **This iteration connects each repeated lemma to the original sentences that contain it and highlights the matched forms in the full original.**

The intended corpus remains comparable argumentative essays by one writer. A sentence is evidence for human review; its presence does not prove a word is wrong. Existing thresholds and the four-word pilot denominator do not change.

## Interaction and acceptance

| Step | Behavior | Acceptance case |
| --- | --- | --- |
| Expand a cross-essay row | “查看逐篇原句与高亮” exposes the essay title, date, count, observed forms and **every original sentence** containing the selected lemma. | Two uses in different sentences show two excerpts; two uses in the same sentence show one excerpt with two highlights. |
| Review exact forms | Highlight only whole tokens that the existing lemmatizer maps to the chosen lemma; preserve original casing, punctuation and surrounding text. | For `use`, highlight `Using` and `used`, but not `useful`. |
| Open the complete original | Select the essay title to open its History detail with every matching form highlighted in the full text. | Returning to History and opening another essay clears the earlier highlight. |
| Recalculation | Recompute evidence from the retained original when a record is added or deleted; no storage migration. | A one-use row hidden in the single-essay table still has a highlighted sentence once its cross-essay lemma meets the display threshold. |

The [evidence design drawing](./DEEA_EVIDENCE_DESIGN.svg) shows the cross-essay row, original sentence and full-text path. Words below the existing cross-essay threshold stay out of the list. There are no new author, genre or account fields.

## Interpretation and evaluation

Highlighting follows the same lightweight tokenizer and lemma mapping as the count; it does **not** disambiguate contextual part of speech or sense. Sentence boundaries rely on terminal punctuation and whitespace, so abbreviations can create short excerpts. The original text remains intact in History for review. A highlighted sentence is not a writing error or a synonym recommendation.

**Engineering acceptance** covers inflected forms, two hits in one sentence, an unfinished final sentence, low local counts contributing to cross-essay evidence, full-text highlighting and clearing that state. **Teaching validity is untested**: teachers should review same-genre essays and record topic-driven and meaning-driven false positives before any semantic-opportunity model is introduced.

**Out of scope:** automatic error detection, contextual POS tagging, AI rewriting, scrolling History to an exact token, an additional clickable design prototype and changes to the four-word pilot thresholds.

Related: [Technical design](./DEEA_TECHNICAL_DESIGN_EN.md) · [中文 PRD](./DEEA_PRD_CN.md) · [v0.3 baseline](../v0.3/DEEA_PRD_EN.md).
