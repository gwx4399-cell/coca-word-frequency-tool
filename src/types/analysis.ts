export type TextToken = {
  surface: string;
  normalized: string;
};

export type CocaSourceRecord = {
  rank: number;
  lemma: string;
  partOfSpeech: string;
  freq: number;
  perMil: number;
};

export type CocaLemmaEntry = {
  lemma: string;
  partsOfSpeech: string[];
  sourceRecords: CocaSourceRecord[];
  aggregatedFreq: number;
  aggregatedPerMil: number;
  derivedLemmaRank: number;
};

export type LemmaAnalysis = {
  lemma: string;
  observedForms: string[];
  count: number;
  ratePer100Words: number;
  derivedLemmaRank?: number;
  aggregatedCocaFrequency?: number;
};

export type EssayAnalysis = {
  totalWordCount: number;
  lexicalTokenCount: number;
  uniqueLemmaCount: number;
  cocaCoveragePct: number;
  repeatedLemmaRatePer100Words: number;
  lemmas: LemmaAnalysis[];
};
