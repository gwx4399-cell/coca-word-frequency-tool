# DEEA v0.4 technical design
Date: 2026-11-03. Status: implemented locally; no merge, deployment or PR yet.

## Analysis and evidence
Tokens retain UTF-16 start/end offsets into unchanged source text. The deterministic analyzer adds explicit write, take, give, choose and added-form conventions. Removing a doubled final consonant must leave at least three letters, preventing adding → ad. Existing run, use and care cases remain covered. A standalone ad remains ad, and ambiguous exact entries such as saw remain unchanged. Added → add is a declared convention, not contextual part-of-speech recognition.

Evidence calls the same lemmatizer as counting. Intl.Segmenter provides English sentence boundaries, with a punctuation/newline fallback. A sentence is listed once even when it contains multiple matching tokens. React renders source slices as text and mark elements, never injected HTML. Tests cover original offsets, Unicode, inflections, case, and substring boundaries.

Search covers lemmas and observed forms, including low-count words, without changing underlying analysis. Existing cross-essay thresholds, recent-three advice and four-word denominators are unchanged. The pilot now uses a neutral label and a statistically significant counterexample.

## Storage
The active key remains deea.essays.v1. inspect returns records, the original payload and an issue state. Invalid structure, any invalid record or duplicate ID is corruption, not an empty history or a partial silent recovery. Storage access failures have a separate unavailable state. Ordinary mutations and exports fail closed. The constructor defers browser storage access so a denied getter does not crash rendering.

Backups use a version-one deea-essay-backup envelope. Imports validate the entire file and all records; the UI caps files at 10 MB. Preview performs no writes. Confirmation rechecks the original history, rejecting stale previews. Identical records are skipped. Conflicting IDs and titles receive suffixes, preserving both source texts; repeated imports of renamed conflicts are also skipped. A single active-key write commits the merged array; quota failures leave the active payload intact.

Restoring damaged history requires a valid, nonempty backup and explicit confirmation. The original damaged string is written to a separate deea.essays.recovery key before the active key changes. Failure to preserve it aborts recovery. The UI also offers a raw-data download. Clearing site storage removes both active and recovery keys, so only the downloaded file survives that operation. Cross-tab storage events refresh the UI; this is not a transactional multiuser database.

## Verification
50 tests in 11 files passed under Node 22. Coverage includes actual COCA regressions, source spans, low-count search, safe text rendering, cross-essay highlights, starting another essay, import preview/cancel/confirm/deduplication, explicit recovery, denied storage and failed writes. Type checking and production build are separate checks. PR validation and deployment run tests and type checking before release.

The machine's Node 26 native localStorage behavior conflicts with the previous UI test setup, so validation uses the documented Node 22 environment. See the [walkthrough](./USABILITY_REVIEW_CN.md) for real browser observations of fictional tasks. Files and essays are processed locally.

## Limits
Lightweight tokenization, sentence segmentation and lemmatization remain fallible. No semantic opportunity denominator, persistent teacher annotation, draft recovery or revision model is added. The existing bundled CSV still contributes to a large-chunk build warning. Search reduces long-list navigation but is not full performance optimization.
