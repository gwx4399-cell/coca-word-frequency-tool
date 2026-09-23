# DEEA v0.2 Product Requirements

**Status:** Implemented on draft [PR #4](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/4); not merged into `main`.  
**Date:** 2026-09-23. **Iteration:** Writing advice after three essays and a simpler analysis view.  
**Product truth:** This is a browser-based English-writing prototype. The current advice is deterministic and manually written; **no AI model is connected**.

## 1. Problem and opportunity

The earlier interface emphasized lexical-token counts, unique lemmas, COCA coverage, frequency ranks and per-100-word rates. A teacher or learner could see these numbers without knowing what to practice next. Analysis and saving required separate actions. Three saved essays produced no writing advice, and multiple essays could share the same title. The user specifically valued **observed forms**, which show how a lemma appeared in the original writing.

The v0.2 job is to connect a small amount of trustworthy evidence with a next writing exercise: **write → analyze and save → reach three essays → inspect advice → return to the originals**. It does not score writing or equate rare words with better writing.

## 2. Users and product decisions

The demo assumes one writer per browser. A learner can use it alone; a teacher can review the evidence with the learner. There is no account, class or role permission. The intended comparison is among argumentative essays, but **the code does not yet store genre or exclude unlike essays**.

| Feedback | v0.2 decision | Why |
| --- | --- | --- |
| Too many metrics | Display total words, lemma, observed forms and count in this essay only. | These support an immediate teaching decision. Internal COCA analysis remains available to the rules. |
| No advice after three essays | Show an advice panel based on the latest three saved essays, immediately after the third save. | Make accumulated writing useful without claiming three essays are a validated learning threshold. |
| Separate Save button | Combine analysis and save in one action with explicit success/error feedback. | Reduce forgotten saves. |
| Repeated titles | Require unique titles for different essays, ignoring case and surrounding whitespace; repeated identical submission stays idempotent. | Make History easier to navigate without deleting existing records. |
| Keep observed forms | Preserve the column in the single-essay table. | Let users connect the analyzed lemma to their own text. |

## 3. Delivered behavior and acceptance

| Requirement | Observable acceptance case | Evidence |
| --- | --- | --- |
| Single action | Valid title, date and text are analyzed and saved on `Analyze and save`. Repeating the same submission does not create a second record. | `src/App.save.test.tsx` |
| Unique title | A new essay with the same trimmed, case-insensitive title shows a field error and is not saved. | `src/storage/essayRepository.test.ts`; UI test |
| Focused analysis | The summary shows total words; the table shows lemma, observed forms and count. History cards omit COCA coverage. | UI assertions and `src/App.tsx` |
| Advice at three | The panel appears after the third save, remains after refresh for existing records, appears in New essay and History, and disappears when deletion leaves fewer than three. | `src/App.save.test.tsx` |
| Verifiable prompt | A highlighted example shows how many of the three essays contain it, its total count and per-title counts, followed by a meaning-sensitive practice prompt. | `src/analysis/writingAdvice.test.ts` |

## 4. Experience and states

The form retains title, writing date, optional task/prompt and original text. On valid submission, the user sees a success message and the single-essay analysis. History keeps the original writing, prompt, recalculated analysis and confirm-before-delete interaction. The advice panel sits under the shared navigation, so users need not find a separate page.

The panel has three evidence levels:

1. **Repeated-expression candidate:** a curated example lemma appears at least three times in one essay and in at least two of the latest three essays. Show up to three such words.
2. **Observation:** if no candidate qualifies, show up to three curated words that appear in at least two essays, with weaker language.
3. **General practice prompt:** if there is no such recurrence, invite the writer to make one evaluative expression more precise. Do not invent a personal dependency.

**Worked example:** `important` appears three times in essay A, twice in B and not at all in C. The panel shows “2 of 3 essays, 5 occurrences,” names A and B with their counts, and asks whether the writer means “significant impact” or “essential requirement.” This is a review candidate; if the uses serve different semantic functions, a teacher should reject the dependency inference.

Fewer than three saved essays produce no panel. Deletion recalculates the panel. A title conflict leaves the form available for correction. A browser-storage failure can leave the visible analysis on screen, but the error message says the essay was not saved.

## 5. Rule boundaries

The curated search list is `important`, `good`, `bad`, `big`, `serious`, `useful`, `effective` and `different`, provided each lemma is in the bundled COCA-derived map. The analyzer does not identify a token's contextual part of speech. Suggested alternatives are meaning checks, **not automatic substitutions**. A task prompt may require a repeated topic word; counts alone do not prove overreliance.

The three-essay advice window is separate from the planned **+1/+3/+5 essays after an intervention** for immediate response, maintenance and possible regression. The semantic-function share >50%, AWL/UWL benchmarks, persistent vocabulary goals, genre controls and AI-generated advice are future work. See the earlier [v0.1 product proposal](../../DEEA_PRD_CN.md).

## 6. Evaluation and risks

Automated tests verify software behavior, **not learning outcomes**. The next research step is to walk through real, same-genre essays with teachers and learners: can they interpret the per-essay evidence, verify the intended meaning, choose a contextually appropriate alternative and turn it into one exercise for the next essay? Qualitative errors matter more here than a single frequency score.

Data stays in one browser's `localStorage`; clearing it deletes the essay history. Existing duplicate titles are not silently migrated. There is no server sync, contextual POS tagging, semantic opportunity denominator, AI API or teacher-review workflow yet.

**Implementation:** [Technical design](./DEEA_TECHNICAL_DESIGN_EN.md) · [中文 PRD](./DEEA_PRD_CN.md) · [Documentation index](../../README.md)
