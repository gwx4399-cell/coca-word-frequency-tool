import type { CocaLemmaMap } from './coca';
import { STOP_WORDS, tokenize } from './tokenize';
import type { EssayAnalysis, LemmaAnalysis } from '../types/analysis';

const LEMMA_OVERRIDES = new Map([
  ['am', 'be'],
  ['is', 'be'],
  ['are', 'be'],
  ['was', 'be'],
  ['were', 'be'],
  ['been', 'be'],
  ['being', 'be'],
  ['has', 'have'],
  ['had', 'have'],
  ['having', 'have'],
  ['does', 'do'],
  ['did', 'do'],
  ['doing', 'do'],
  // Required deterministic choice: treat the common inflected form as use,
  // even though COCA also lists adjectival "used" as its own lemma.
  ['used', 'use'],
  ['ran', 'run'],
  ['running', 'run'],
  ['children', 'child'],
  ['men', 'man'],
  ['women', 'woman'],
  ['people', 'person'],
  ['mice', 'mouse'],
  ['geese', 'goose'],
  ['teeth', 'tooth'],
  ['feet', 'foot'],
  ['went', 'go'],
  ['gone', 'go'],
]);

export function analyzeEssay(text: string, cocaEntries: CocaLemmaMap): EssayAnalysis {
  const tokens = tokenize(text);
  const analyzedTokens = tokens
    .map((token) => ({
      token,
      lemma: lemmatizeWord(token.normalized, cocaEntries),
    }))
    .filter(({ lemma }) => !STOP_WORDS.has(lemma));
  const lemmaCounts = new Map<string, { observedForms: string[]; count: number }>();
  const coveredTokenCount = analyzedTokens.filter(({ lemma }) => cocaEntries.has(lemma)).length;

  analyzedTokens.forEach(({ token, lemma }) => {
    const current = lemmaCounts.get(lemma) ?? { observedForms: [], count: 0 };

    current.count += 1;

    if (!current.observedForms.includes(token.surface)) {
      current.observedForms.push(token.surface);
    }

    lemmaCounts.set(lemma, current);
  });

  const totalWordCount = tokens.length;
  const lexicalTokenCount = analyzedTokens.length;
  const uniqueLemmaCount = lemmaCounts.size;
  const lemmas = Array.from(lemmaCounts, ([lemma, value]) => toLemmaAnalysis(lemma, value, totalWordCount, cocaEntries)).sort(
    (a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      if (a.derivedLemmaRank && !b.derivedLemmaRank) {
        return -1;
      }

      if (!a.derivedLemmaRank && b.derivedLemmaRank) {
        return 1;
      }

      if (a.derivedLemmaRank && b.derivedLemmaRank && a.derivedLemmaRank !== b.derivedLemmaRank) {
        return a.derivedLemmaRank - b.derivedLemmaRank;
      }

      return a.lemma.localeCompare(b.lemma);
    },
  );

  return {
    totalWordCount,
    lexicalTokenCount,
    uniqueLemmaCount,
    cocaCoveragePct: lexicalTokenCount === 0 ? 0 : (coveredTokenCount / lexicalTokenCount) * 100,
    lemmas,
  };
}

export function lemmatizeWord(word: string, cocaEntries: CocaLemmaMap): string {
  const normalized = word.toLowerCase().replace(/’/g, "'");

  if (normalized.includes("'")) {
    return normalized;
  }

  const candidates = getLemmaCandidates(normalized);

  for (const candidate of candidates) {
    if (cocaEntries.has(candidate)) {
      return candidate;
    }
  }

  return normalized;
}

function toLemmaAnalysis(
  lemma: string,
  value: { observedForms: string[]; count: number },
  totalWordCount: number,
  cocaEntries: CocaLemmaMap,
): LemmaAnalysis {
  const cocaEntry = cocaEntries.get(lemma);

  return {
    lemma,
    observedForms: value.observedForms,
    count: value.count,
    ratePer100Words: totalWordCount === 0 ? 0 : (value.count / totalWordCount) * 100,
    derivedLemmaRank: cocaEntry?.derivedLemmaRank,
    aggregatedCocaFrequency: cocaEntry?.aggregatedFreq,
  };
}

function getLemmaCandidates(word: string): string[] {
  const candidates: string[] = [];
  const override = LEMMA_OVERRIDES.get(word);

  if (override) {
    addCandidate(candidates, override);
  }

  // Preserve an exact COCA lemma when a surface form is genuinely ambiguous.
  addCandidate(candidates, word);

  if (word.length > 4 && word.endsWith('ies')) {
    addCandidate(candidates, `${word.slice(0, -3)}y`);
  }

  if (word.length > 4 && word.endsWith('ied')) {
    addCandidate(candidates, `${word.slice(0, -3)}y`);
  }

  if (word.length > 4 && word.endsWith('ing')) {
    addStemCandidates(candidates, word.slice(0, -3));
  }

  if (word.length > 3 && word.endsWith('ed')) {
    addStemCandidates(candidates, word.slice(0, -2));
  }

  if (word.length > 4 && word.endsWith('es')) {
    addCandidate(candidates, word.slice(0, -1));
    addCandidate(candidates, word.slice(0, -2));
  }

  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    addCandidate(candidates, word.slice(0, -1));
  }

  return candidates;
}

function addStemCandidates(candidates: string[], stem: string): void {
  if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
    addCandidate(candidates, stem.slice(0, -1));
  }

  // Try restored silent-e before the raw stem so using/caring do not
  // incorrectly match the valid COCA lemmas us/car.
  addCandidate(candidates, `${stem}e`);
  addCandidate(candidates, stem);
}

function addCandidate(candidates: string[], candidate: string): void {
  if (!candidates.includes(candidate)) {
    candidates.push(candidate);
  }
}
