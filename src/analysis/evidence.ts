import { lemmatizeWord } from './analyzeEssay';
import type { CocaLemmaMap } from './coca';
import { tokenize } from './tokenize';

export type TextSpan = { start: number; end: number };
export type SentenceEvidence = TextSpan & { matches: TextSpan[] };

export function findLemmaMatches(text: string, lemma: string, entries: CocaLemmaMap): TextSpan[] {
  return tokenize(text)
    .filter((token) => lemmatizeWord(token.normalized, entries) === lemma)
    .map(({ start, end }) => ({ start, end }));
}

export function getSentenceEvidence(text: string, lemma: string, entries: CocaLemmaMap): SentenceEvidence[] {
  const matches = findLemmaMatches(text, lemma, entries);
  return sentenceSpans(text).flatMap((segment) => {
    const contained = matches.filter((match) => match.start >= segment.start && match.end <= segment.end);
    return contained.length ? [{ ...segment, matches: contained }] : [];
  });
}

export function sentenceSpans(text: string): TextSpan[] {
  return typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text),
      ({ index, segment }) => ({ start: index, end: index + segment.length }))
    : Array.from(text.matchAll(/[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g),
      (match) => ({ start: match.index, end: match.index + match[0].length }));
}
