# DEEA v0.3 Product Requirements

**Status:** Functionality merged into `main` through PR #6; five example essays and design drawing proposed in PR #7, pending review. **Date:** 2026-09-23.  
**Iteration:** A reusable cross-essay count and one bounded pilot word group. The application is still rule-based and local; no AI model is connected.
**Pull request:** [v0.3 cross-essay analysis and pilot #6](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/6).
**Sample and design follow-up:** [Five IELTS essays and product design #7](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/7).

## 1. Problem and choice of pace

In v0.2, the single-essay table showed many words used only once or twice. The advice window compared eight curated examples across the latest three essays, but there was no general aggregation over the complete writing history. Without that foundation, a later vocabulary target or follow-up observation cannot refer to a reliable sequence of essays.

This release builds general cross-essay evidence **before** expanding semantic analysis. It trials one manually specified group rather than shipping an automatic semantic-function database or a dependency diagnosis.

## 2. Delivered behavior and acceptance

| Feature | Observable result | Acceptance case |
| --- | --- | --- |
| Focused single-essay table | Display only lemmas used at least three times in that essay; preserve observed forms and counts. | One- and two-use rows are hidden but retained in analysis data. |
| Across essays view | Aggregate each lemma across **all saved essays** in this browser. Display a lemma when it occurs in at least two essays and has at least three total uses. | Show essays containing it / all essays, total uses, and expandable per-essay title, date, count and forms. Titles open the original in History. |
| Low local counts retained | One use in each of three essays is hidden in all single-essay tables yet visible across essays as 3/3 essays and three total uses. | Presentation filters do not discard evidence. |
| Importance pilot | Count only `important`, `significant`, `essential`, `crucial`. With at least three group uses across at least two essays, show the most-used member's share **of observed uses of these four words**. | A 4/6 share renders as 66.7%; a zero denominator or insufficient evidence produces no percentage conclusion. |
| Advice cleanup | The separate latest-three-essays panel only shows a weakly recurring word when its total reaches three. | A 1+1 total no longer produces its own advice card; a general prompt remains. |

The Across essays view uses the full browser history; the existing advice uses the latest three essays. Saving and deletion recalculate both from the retained originals. There is no new account, storage key or migration.

## 3. Experience

**Across essays / 跨篇统计** joins New essay and History as a top-level tab. A word's evidence expands into an essay-by-essay list. Selecting a title opens the original essay and task in History. The pilot group gives a leading-word share and optional member breakdown, with the denominator explained beside the result. If a rule has too little evidence, the page says so rather than presenting 0% as an assessment.

If a single essay contains no word used three or more times, its table explains that the hidden low counts still feed cross-essay analysis.

## 4. What the group share does and does not mean

```text
member share = member occurrences /
  (important + significant + essential + crucial occurrences) × 100%
```

Suppose `important` appears four times, `significant` once, `essential` once and `crucial` not at all: `important` has a **4/6 = 66.7% share within this configured four-word set**. The denominator does not include every opportunity to express importance. A writer could use another phrase, or use a counted word with a different part of speech or meaning. A share above 50% invites review of the original sentences; it does not establish expression dependency or a decline in writing ability.

There is no genre or author field. All essays saved in one browser are aggregated, so a meaningful demonstration requires one writer and comparable argumentative tasks. Genre selection and contextual review belong to a later iteration.

## 5. Evaluation and exclusions

Engineering acceptance checks hidden low counts, retained aggregate counts, per-essay evidence, recalculation after deletion, zero denominators and links to originals. Passing them confirms rule behavior, **not educational effectiveness**. Next, teachers and learners should review real same-genre samples: were repetitions prompted by the topic, did the four words serve comparable semantic functions, and could the evidence support one useful writing exercise? Record false positives before expanding the group inventory.

The [five original IELTS Task 2 demonstration essays](../../../data/demo/IELTS_TASK2_FIVE_ESSAYS.md) let reviewers reproduce the hidden-low-count case and the pilot denominator. The [product wireframe](./DEEA_PRODUCT_DESIGN_EN.md) uses computed values from these fictional essays. They are not preloaded into anyone's browser, are not assessed IELTS model answers, and this iteration does not add a bulk import feature.

Out of scope: semantic-opportunity annotation, contextual POS tagging, AWL/UWL, AI-generated suggestions, persistent targets, +1/+3/+5 post-target outcomes, classrooms, accounts and cross-device sync.

Related: [Technical design](./DEEA_TECHNICAL_DESIGN_EN.md) · [product wireframe](./DEEA_PRODUCT_DESIGN_EN.md) · [中文 PRD](./DEEA_PRD_CN.md) · [v0.2 requirements](../v0.2/DEEA_PRD_EN.md)
