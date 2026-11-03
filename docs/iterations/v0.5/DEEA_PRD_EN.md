# DEEA v0.5: From source evidence to later writing

Date: 2026-11-03–04 (Asia/Taipei). Implemented on the branch in [draft PR #10](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/10); not merged or deployed. Builds on v0.4.

## Problem and scope

Teachers need comparable work from an identified learner, an actionable teaching decision, and evidence from revisions and later independent tasks. Counts alone cannot establish an error or learning. The owner currently has no teachers available for a study. This release implements and exercises the workflow using fictional excerpts; it does not claim a human user study or learning benefit.

Multi-text analysis already exists in [LexTutor RANGE](https://www.lextutor.ca/range/); [Write & Improve Class View](https://writeandimprove.com/classview) includes versions and classroom management; [Quill](https://www.quill.org/faq) connects diagnosis, practice and reassessment. The product hypothesis concerns the ease of connecting evidence and teaching decisions, not feature novelty.

## Implemented behavior

- Student identifiers, genres and task names organize essays. Legacy records remain unassigned. Identically named students need distinct identifiers. Cross-task analysis requires a student and genre, includes one original or latest draft per task, and supports manual exclusions. Task names define task groups; unnamed tasks use revision families. The latest-three prompts use the same scope. Length and per-100-word frequency contextualize counts, without scoring quality.
- Revisions preserve immutable source text and inherit the parent task metadata. Users can view parent and child drafts together. Independent writing is an explicit user classification, also editable for imported originals; the tool does not authenticate independence.
- Saved sentence anchors support retain, specificity, collocation/register and incorrect-grouping decisions with required reasons. These annotations do not alter the analyzer. A note can carry a learning goal and practice instruction. Normally two goals can be active per student, with reversible archival. This is a product constraint, not a validated educational threshold. Conflicting imported versions can exceed it and are shown for manual reconciliation.
- Manual checks distinguish completed revision, appropriate use in a new independent task, further practice needed and no relevant opportunity. Checks need a reason and exact source evidence, except that no-opportunity checks need no invented quotation. Student reflection is optional. No result automatically marks a goal mastered.
- Batch import accepts up to 50 UTF-8 TXT files totaling 3 MB for a specified student, genre and shared writing date. Each filename becomes a task and original-draft title. Printable HTML feedback covers a task's revision family or current active goals; long reports paginate. Browsers can print or save PDF.
- Version 2 backups preserve all students, source texts, revisions, annotations and checks, while accepting v1 backups. Preview precedes import; duplicate records are skipped. Conflicting texts or note versions are retained rather than overwritten. Deletions and regrouping that would invalidate evidence are blocked.

## Practice and validation

The built-in exercise contains nine fictional, unscored excerpts: original, revision and new task for each of three learner scenarios. Each has a preset goal and a clearly labeled simulated revision check; new-task checks start pending. These are not full IELTS essays. Previewed loading preserves existing work. Re-loading edited annotations can retain an alternative version for review.

71 automated tests and type checking pass. See the [walkthrough record](./USABILITY_REVIEW_CN.md) for browser and build evidence. Checks cover scope isolation, source integrity, backup remapping, invalid graphs, storage failures, manual review and report escaping. No teacher-time saving, satisfaction, independent proficiency rating or learning gain has been measured.

Data remains browser-local. Student labels are grouping keys, not authenticated accounts or access controls. There is no cloud sync, automatic draft saving, LMS integration, contextual language diagnosis or generative AI. Future user work should measure total preparation/review time, learners' explanations, voluntary return use and appropriate language in later tasks.
