import type { CocaLemmaEntry, CocaSourceRecord } from '../types/analysis';

export type CocaLemmaMap = Map<string, CocaLemmaEntry>;

export function parseCocaCsv(csv: string): CocaLemmaMap {
  const records = parseCocaRecords(csv);
  const grouped = new Map<string, Omit<CocaLemmaEntry, 'derivedLemmaRank'>>();

  records.forEach((record) => {
    const key = record.lemma.toLowerCase();
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        lemma: key,
        partsOfSpeech: [record.partOfSpeech],
        sourceRecords: [record],
        aggregatedFreq: record.freq,
        aggregatedPerMil: record.perMil,
      });
      return;
    }

    existing.sourceRecords.push(record);
    existing.aggregatedFreq += record.freq;
    existing.aggregatedPerMil += record.perMil;

    if (!existing.partsOfSpeech.includes(record.partOfSpeech)) {
      existing.partsOfSpeech.push(record.partOfSpeech);
      existing.partsOfSpeech.sort();
    }
  });

  const rankedEntries = Array.from(grouped.values())
    .sort((a, b) => {
      if (b.aggregatedFreq !== a.aggregatedFreq) {
        return b.aggregatedFreq - a.aggregatedFreq;
      }

      return a.lemma.localeCompare(b.lemma);
    })
    .map<CocaLemmaEntry>((entry, index) => ({
      ...entry,
      derivedLemmaRank: index + 1,
    }));

  return new Map(rankedEntries.map((entry) => [entry.lemma, entry]));
}

function parseCocaRecords(csv: string): CocaSourceRecord[] {
  const [, ...rows] = csv.trim().replace(/^\uFEFF/, '').split(/\r?\n/);

  return rows.flatMap((row) => {
    const [rank, lemma, partOfSpeech, freq, perMil] = row.split(',');

    if (!rank || !lemma || !partOfSpeech || !freq || !perMil) {
      return [];
    }

    return [
      {
        rank: Number(rank),
        lemma,
        partOfSpeech,
        freq: Number(freq),
        perMil: Number(perMil),
      },
    ];
  });
}
