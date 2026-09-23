import { lemmatizeWord } from './analyzeEssay';
import type { CocaLemmaMap } from './coca';
import { STOP_WORDS, tokenize } from './tokenize';

export type TextMatch = { start: number; end: number };

export type SentenceEvidence = {
  // Offset in the original essay, so repeated identical sentences stay distinct.
  start: number;
  text: string;
  // Match offsets relative to `text`. Rendering uses React text nodes and <mark>.
  matches: TextMatch[];
};

type SentenceRange = { start: number; end: number };

// Count and highlight with the same tokenizer and lemmatizer as analyzeEssay.
// Whole token offsets avoid substring matches such as "use" inside "useful".
export function findLemmaMatches(text: string, lemma: string, cocaEntries: CocaLemmaMap): TextMatch[] {
  return tokenize(text)
    .filter((token) => lemmatizeWord(token.normalized, cocaEntries) === lemma)
    .map(({ start, end }) => ({ start, end }));
}

export function indexSentenceEvidence(text: string, cocaEntries: CocaLemmaMap): Map<string, SentenceEvidence[]> {
  const byLemma = new Map<string, SentenceEvidence[]>();
  const tokens = tokenize(text);
  let tokenIndex = 0;

  for (const sentence of getSentenceRanges(text)) {
    const matchesInSentence = new Map<string, TextMatch[]>();
    while (tokenIndex < tokens.length && tokens[tokenIndex].start < sentence.end) {
      const token = tokens[tokenIndex++];
      if (token.start < sentence.start || token.end > sentence.end) continue;
      const lemma = lemmatizeWord(token.normalized, cocaEntries);
      if (STOP_WORDS.has(lemma)) continue;
      const matches = matchesInSentence.get(lemma) ?? [];
      matches.push({ start: token.start - sentence.start, end: token.end - sentence.start });
      matchesInSentence.set(lemma, matches);
    }

    for (const [lemma, matches] of matchesInSentence) {
      const evidence = byLemma.get(lemma) ?? [];
      evidence.push({ start: sentence.start, text: text.slice(sentence.start, sentence.end), matches });
      byLemma.set(lemma, evidence);
    }
  }

  return byLemma;
}

function getSentenceRanges(text: string): SentenceRange[] {
  const ranges: SentenceRange[] = [];
  // A lightweight English sentence boundary: punctuation followed by whitespace
  // or the end. Preserve the original surface text and punctuation.
  const endOfSentence = /[.!?]+(?:["'”’)]*)?(?=\s|$)/g;
  let start = 0;

  const addRange = (from: number, to: number) => {
    while (from < to && /\s/.test(text[from])) from += 1;
    while (to > from && /\s/.test(text[to - 1])) to -= 1;
    if (from < to) ranges.push({ start: from, end: to });
  };

  for (const match of text.matchAll(endOfSentence)) {
    const end = match.index + match[0].length;
    addRange(start, end);
    start = end;
  }
  addRange(start, text.length);

  return ranges;
}
