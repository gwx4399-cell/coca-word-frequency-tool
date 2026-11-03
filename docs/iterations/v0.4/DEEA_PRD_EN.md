# DEEA v0.4 product requirements
Date: 2026-11-03. Status: implemented on branch `improve/reliable-vocabulary-review`; [draft PR #10](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/10), not merged or publicly deployed.
Baseline: `984ef1cc86c9c922a614856bd7caff5329233b38`.

## Problem and scope
Cross-essay counts are useful only when users can check the grouping, recover their writing history and immediately inspect source sentences. This release improves save → find a word → inspect context → back up and restore. The requested walkthrough covers students imagined at IELTS 4–5, 5.5–6.5 and 6.5–7.5, plus a teacher. These are persona assumptions, not assessed text levels.

## Delivered behavior
- Correct adding → ad; group explicitly supported add, write, take, give and choose forms while retaining their original spelling.
- Open sentence evidence from a single-essay word or a cross-essay source link. Highlight exact source spans in the evidence and original text. Preserve the expanded cross-essay row on return.
- Keep the default count threshold of three; allow all analyzed words or search by lemma and observed form, including low-count words.
- Export versioned JSON; preview additions, duplicates, renamed conflicts and titles before importing. Confirmation merges; cancellation writes nothing. Conflicting IDs or titles do not replace existing text.
- Distinguish corrupt, unavailable and empty storage. Block ordinary writes when history cannot be safely read. Allow downloading damaged content, and archive its exact payload in a separate browser key before a confirmed restore.
- Start another essay after a successful save; collapse the recent-three advice by default; explain lemma grouping and semantic ambiguity in context.

The browser still represents one writer. Cross-essay results use all history, while advice uses the most recent three essays. Importing is not revision editing or author separation.

## Evaluation
The [walkthrough report](./USABILITY_REVIEW_CN.md) documents three rounds for four roles, the observed interface states and follow-up changes. Nine fictional, unscored excerpts exercise the flows; the existing five complete essays remain regression fixtures. There were no human participants or measurements of learning gains. Acceptance concerns traceability, consistent counts and recovery, not proficiency assessment.

## Limits
No contextual semantic diagnosis, automatic scoring, model feedback, saved teacher annotations, learning targets, revision editing, author isolation or comparison filters. Beginning writers may still need teacher explanation, and advanced writers need judgment about collocation and argument. A future human study should test the source-review task before expanding feedback.

See [technical design](./DEEA_TECHNICAL_DESIGN_EN.md).
