import type { CocaLemmaMap } from './coca';
import { isLexicalToken, tokenize } from './tokenize';
import type { EssayAnalysis, LemmaAnalysis } from '../types/analysis';

const IRREGULAR_LEMMAS = new Map([
  ['children', 'child'],
  ['men', 'man'],
  ['women', 'woman'],
  ['people', 'person'],
  ['mice', 'mouse'],
  ['geese', 'goose'],
  ['teeth', 'tooth'],
  ['feet', 'foot'],
]);

export function analyzeEssay(text: string, cocaEntries: CocaLemmaMap): EssayAnalysis {
  const tokens = tokenize(text);
  const lexicalTokens = tokens.filter(isLexicalToken);
  const lemmaCounts = new Map<string, { observedForms: string[]; count: number }>();
  const coveredTokenCount = lexicalTokens.filter((token) => cocaEntries.has(lemmatizeWord(token.normalized, cocaEntries))).length;

  lexicalTokens.forEach((token) => {
    const lemma = lemmatizeWord(token.normalized, cocaEntries);
    const current = lemmaCounts.get(lemma) ?? { observedForms: [], count: 0 };

    current.count += 1;

    if (!current.observedForms.includes(token.surface)) {
      current.observedForms.push(token.surface);
    }

    lemmaCounts.set(lemma, current);
  });

  const totalWordCount = tokens.length;
  const lexicalTokenCount = lexicalTokens.length;
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
    repeatedLemmaRatePer100Words:
      totalWordCount === 0 ? 0 : ((lexicalTokenCount - uniqueLemmaCount) / totalWordCount) * 100,
    lemmas,
  };
}

export function lemmatizeWord(word: string, cocaEntries: CocaLemmaMap): string {
  const normalized = word.toLowerCase();

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
  const candidates = new Set<string>([word]);
  const irregular = IRREGULAR_LEMMAS.get(word);

  if (irregular) {
    candidates.add(irregular);
  }

  if (word.length > 4 && word.endsWith('ies')) {
    candidates.add(`${word.slice(0, -3)}y`);
  }

  if (word.length > 4 && word.endsWith('ied')) {
    candidates.add(`${word.slice(0, -3)}y`);
  }

  if (word.length > 5 && word.endsWith('ing')) {
    addStemCandidates(candidates, word.slice(0, -3));
  }

  if (word.length > 4 && word.endsWith('ed')) {
    addStemCandidates(candidates, word.slice(0, -2));
  }

  if (word.length > 4 && word.endsWith('es')) {
    candidates.add(word.slice(0, -1));
    candidates.add(word.slice(0, -2));
  }

  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    candidates.add(word.slice(0, -1));
  }

  return Array.from(candidates);
}

function addStemCandidates(candidates: Set<string>, stem: string): void {
  candidates.add(stem);
  candidates.add(`${stem}e`);

  if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
    candidates.add(stem.slice(0, -1));
  }
}
