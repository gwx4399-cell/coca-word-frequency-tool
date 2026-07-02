COCA Top 5,050 Lemma Frequency Data

Contents
--------
COCA_WordFrequency_top5000.csv

Provenance
----------
This CSV is a republished copy of the publicly available top-frequency COCA lemma list,
originally based on Mark Davies' Corpus of Contemporary American English (COCA).

Official source and required attribution:
  Word frequency data from the Corpus of Contemporary American English (COCA).
  https://www.wordfrequency.info

The official data provider states that the free list may be reposted provided that
www.wordfrequency.info is clearly indicated as the source.

Important limitations
---------------------
- This file contains 5,050 lemma-level records (rank 1–5,050), not the complete COCA data.
- A lemma groups forms such as decide / decides / decided / deciding.
- It is therefore appropriate for a lookup after lemmatization, but not for exact surface-form
  matching without a word-form list.
- The full COCA data sets are commercial: official downloads cover 60,000 lemmas, 100,000+
  linked word forms, and approximately 220,000 standalone word forms.

Columns
-------
rank, lemma, PoS, freq, perMil, %caps, %allC, range, disp,
blog, web, TVM, spok, fic, mag, news, acad,
blogPM, webPM, TVMPM, spokPM, ficPM, magPM, newsPM, acadPM

For this DEEA feature, recommended fields are:
- rank: frequency rank (smaller = more common)
- lemma: lookup headword
- freq: raw corpus count
- perMil: normalized frequency per million words
- PoS: part of speech code
