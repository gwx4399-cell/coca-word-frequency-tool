# DEEA v0.5 Technical Design

Date: 2026-11-03–04 (Asia/Taipei). Branch implementation in [draft PR #10](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/10), not merged or deployed.

## Storage and evidence

Keep the array at `deea.essays.v1`; reads do not migrate or rewrite it. Optional student, genre, task, draft-kind, parent-revision and note fields extend EssayRecord. Legacy records remain valid and unassigned.

Notes store exact UTF-16 source offsets, quoted text, decisions, reasons and timestamps. Optional goals store instructions, practice, archival state and checks. Checks link later essays to manually selected status, exact evidence, reason and optional reflection. Source text is immutable: revision creates a new record, keeping anchors stable.

All records are written as one localStorage value. A failed quota write leaves the existing value unchanged. The v0.4 corrupt-history protection and raw recovery copy remain. Backup confirmation rechecks the serialized snapshot to detect changes after preview.

## Validation and lifecycle

The complete graph is validated before import or mutation: existing acyclic parent links; matching student, genre and task; nondecreasing revision dates; unique IDs; exact quotation matches; and later checks within the same learner. Transfer evidence cannot use a revision or the same named task. No-opportunity needs a reason but no fabricated quotation; other statuses need source evidence. These are consistency checks, not authentication of independent authorship or causal learning.

Metadata updates apply to the revision family, retaining revision types. Changes that invalidate existing cross-task checks are blocked. Parent drafts, checked essays and source goals with subsequent checks cannot be deleted. Unlinked essays retain the existing confirmation flow.

## Interchange

New backups use numeric version 2 of `deea-essay-backup`; numeric v1 is accepted. Validate the entire incoming graph, process parents first, assign or deduplicate essay IDs, then remap both revision and goal-check references. Matching content from different students remains separate. Conflicting text/title records are preserved under new IDs/titles; conflicting note versions are retained and flagged. Re-importing identical versions is idempotent.

TXT batch import validates every file before offering one preview/confirmation and atomic write. Limits are 50 UTF-8 files and 3 MB total; each filename identifies a task original, with explicitly supplied learner, genre and shared date. The nine fictional demo excerpts use the same backup path. JSON import retains the 10 MB file limit; browser storage may be smaller.

Printable HTML escapes all user strings and includes no scripts or external resources. Task export includes notes from the revision family; the goal view exports the selected student's active goals. A4 print styles allow pagination rather than guaranteeing one page.

## Analysis and components

`teaching/workflow.ts` filters by learner and genre, groups by named task or revision root, and selects the earliest original or latest leaf draft. Manual exclusions apply before both cross-essay analysis and the latest-three prompts. Existing recurrence thresholds remain two essays and three total uses. Per-100-word frequency uses total essay tokens as denominator and does not score quality. Three versions of one task count as one task; unassigned work does not enter cross-task analysis.

UI additions are ComparisonScope, TeachingPanels and BatchImport. Sentence segmentation is shared with evidence.ts. No runtime dependency was added. The test setup explicitly uses jsdom localStorage rather than the host Node version's native Web Storage.

## Verification and limits

Node 22: 71 tests across 13 files and TypeScript checking pass. Production build succeeds with the existing large-COCA-bundle warning. Tests cover learner isolation, comparison selection, immutable revisions, exact anchors, goal limits, manual statuses, reference remapping, conflicting notes, legacy backups, invalid graphs, quota failure, atomic TXT import and HTML escaping.

See the [browser walkthrough](./USABILITY_REVIEW_CN.md) for UI evidence. No human participants, real mobile hardware, assistive-technology audit, large-scale load test or learning-effect study was conducted. Storage is local to the browser origin; labels are not access-control accounts. External backup remains necessary before clearing site data.
