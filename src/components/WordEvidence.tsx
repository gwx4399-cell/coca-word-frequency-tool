import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { CocaLemmaMap } from '../analysis/coca';
import { getSentenceEvidence, type TextSpan } from '../analysis/evidence';

export function HighlightedText({ text, matches, offset = 0 }: { text: string; matches: TextSpan[]; offset?: number }) {
  let cursor = 0;
  const fragments = matches.map((match) => {
    const start = match.start - offset;
    const end = match.end - offset;
    const before = text.slice(cursor, start);
    cursor = end;
    return <Fragment key={match.start}>{before}<mark>{text.slice(start, end)}</mark></Fragment>;
  });
  return <>{fragments}{text.slice(cursor)}</>;
}

export function WordEvidence({ text, lemma, entries, onClose }: {
  text: string; lemma: string; entries: CocaLemmaMap; onClose: () => void;
}) {
  const sentences = useMemo(() => getSentenceEvidence(text, lemma, entries), [text, lemma, entries]);
  const heading = useRef<HTMLHeadingElement>(null);
  const count = sentences.reduce((sum, sentence) => sum + sentence.matches.length, 0);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView?.({ block: 'start' });
  }, [lemma, text]);

  return <section className="word-evidence" aria-label={`原句核查：${lemma}`}>
    <div className="section-heading">
      <h3 ref={heading} tabIndex={-1}>{lemma} · 原句核查</h3>
      <button type="button" className="text-button" onClick={onClose}>关闭原句</button>
    </div>
    <p>本篇共 {count} 次，出现在 {sentences.length} 个句子中。高亮包含归并到同一基本形式的词。</p>
    <p className="review-prompt">先看一句：它是在重复题目关键词，还是含义可以更具体？重复不等于错误，也不必为了少重复而换难词。</p>
    <ol className="sentence-list">{sentences.map((sentence) => <li key={sentence.start}>
      <HighlightedText text={text.slice(sentence.start, sentence.end)} matches={sentence.matches} offset={sentence.start} />
    </li>)}</ol>
    {!count && <p>当前正文中没有找到此词，请返回词表重新选择。</p>}
    <p className="evidence-note">这些是词形归并的结果；工具不能自动判断词义、词性或替换是否合适。</p>
    <p className="review-prompt">下一步：挑一句，先写清想表达的具体影响，再与原句对照。必要的题目关键词可以保留。</p>
  </section>;
}
