import { useRef, useState } from 'react';
import { BACKUP_FORMAT, EssayRepository, type HistorySnapshot, type ImportPreview } from '../storage/essayRepository';
import { tokenize } from '../analysis/tokenize';
import { readTextFile } from '../teaching/files';
import { demoBackup } from '../teaching/demo';
import { GenreOptions } from './TeachingPanels';

export function BatchImport({ repository, history, onChanged }: { repository: EssayRepository; history: HistorySnapshot; onChanged: () => void }) {
  const [learner, setLearner] = useState('');
  const [genre, setGenre] = useState('议论文 / Argument');
  const [date, setDate] = useState('');
  const [pending, setPending] = useState<{ serialized: string; preview: ImportPreview; demo: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const preview = (serialized: string, demo: boolean) => { setPending({ serialized, preview: repository.previewImport(serialized), demo }); setMessage(''); };
  const choose = async (files: File[]) => {
    const token = ++generation.current;
    setPending(null); setLoading(true); setMessage('');
    try {
      if (!learner.trim() || !date) throw new Error('请先填写学生和写作日期。');
      if (!files.length) return;
      if (files.length > 50 || files.reduce((sum, file) => sum + file.size, 0) > 3 * 1024 * 1024) throw new Error('每次最多导入 50 个 TXT，总计不超过 3 MB。');
      const now = new Date().toISOString();
      const records = await Promise.all(files.map(async (file) => {
        if (!file.name.toLowerCase().endsWith('.txt')) throw new Error('请选择 UTF-8 编码的 TXT 文件；每个文件是一篇作文。');
        const text = await readTextFile(file);
        if (!tokenize(text).length || text.includes('\uFFFD')) throw new Error(`${file.name} 没有可分析的英文或编码不正确，请检查 UTF-8 文本。`);
        const title = file.name.replace(/\.txt$/i, '') || '导入作文';
        return { id: crypto.randomUUID(), title, text, learnerId: learner.trim(), genre, taskId: title, writtenAt: date, draftKind: 'original', createdAt: now, updatedAt: now };
      }));
      if (generation.current === token) preview(JSON.stringify({ format: BACKUP_FORMAT, version: 2, essays: records }), false);
    } catch (error) { if (generation.current === token) setMessage(error instanceof Error ? error.message : '读取失败。'); }
    finally { if (generation.current === token) setLoading(false); }
  };
  return <details className="batch-panel">
    <summary>批量导入与模拟练习</summary>
    <p>没有真实学生材料时，可载入三组虚构短文，走通“原句 → 目标 → 修改稿 → 新任务”流程。它们不是评分样本，也不代表教学实验结果。</p>
    <button type="button" className="secondary-button" disabled={!!history.issue || loading} onClick={() => { generation.current++; try { preview(demoBackup(), true); } catch (error) { setMessage(error instanceof Error ? error.message : '无法预览。'); } }}>预览三组模拟练习</button>
    <details className="batch-files"><summary>按学生批量导入 TXT 作文</summary>
      <p className="analysis-help">每个文件作为一个任务的原稿，文件名作为标题与任务名。修改稿请从历史详情创建，避免被当作独立任务。</p>
      <div className="teaching-grid"><label>导入到学生<input id="batch-learner" className="text-input" list="learner-options" value={learner} onChange={(event) => setLearner(event.target.value)} /></label>
        <label>文体<select id="batch-genre" className="text-input" value={genre} onChange={(event) => setGenre(event.target.value)}><GenreOptions essays={history.essays} /></select></label>
        <label>本批写作日期<input id="batch-date" className="text-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      <label htmlFor="batch-files">选择多个 TXT 文件</label><input id="batch-files" type="file" multiple accept=".txt,text/plain" disabled={!!history.issue || loading} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void choose(files); }} />
    </details>
    {loading && <p role="status">正在读取作文…</p>}
    {pending && <section className="import-preview" aria-label="批量导入预览"><h3>{pending.demo ? '模拟练习预览' : '批量导入预览'}</h3>
      <p>新增 {pending.preview.added} 篇 · 跳过 {pending.preview.skipped} 篇 · 新增判断 {pending.preview.notesAdded} 条。现有作文保留。</p>
      <ul>{JSON.parse(pending.serialized).essays.map((essay: { id: string; learnerId: string; title: string; writtenAt: string }) => <li key={essay.id}>{essay.learnerId} · {essay.title} · {essay.writtenAt}</li>)}</ul>
      <div className="backup-actions"><button type="button" className="secondary-button" onClick={() => {
        try { repository.importBackup(pending.serialized, pending.preview.originalRaw); onChanged(); setPending(null); setMessage('导入完成。请在历史或学习目标中选择相应学生。'); }
        catch (error) { setMessage(error instanceof Error ? error.message : '导入失败。'); }
      }}>确认加入作文</button><button type="button" className="text-button" onClick={() => setPending(null)}>取消本次导入</button></div>
    </section>}
    {message && <p role="status">{message}</p>}
  </details>;
}
