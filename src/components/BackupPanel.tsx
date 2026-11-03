import { useRef, useState } from 'react';
import { EssayRepository, type HistorySnapshot, type ImportPreview } from '../storage/essayRepository';

export function BackupPanel({ repository, history, onChanged }: {
  repository: EssayRepository; history: HistorySnapshot; onChanged: () => void;
}) {
  const [pending, setPending] = useState<{ text: string; name: string; preview: ImportPreview } | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const selection = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const chooseFile = async (file?: File) => {
    const current = ++selection.current;
    setPending(null);
    setMessage(null);
    if (!file) { setLoading(false); return; }
    setLoading(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('备份文件超过 10 MB，请选择较小的 DEEA 备份。');
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('文件读取失败，请重新选择。'));
        reader.readAsText(file);
      });
      const preview = repository.previewImport(text);
      if (current === selection.current) setPending({ text, name: file.name, preview });
    } catch (error) {
      if (current === selection.current) setMessage({ text: errorMessage(error), error: true });
    } finally {
      if (current === selection.current) setLoading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    try {
      const result = repository.importBackup(pending.text, pending.preview.originalRaw);
      setPending(null);
      onChanged();
      setMessage({ text: `导入完成：新增 ${result.added} 篇，跳过 ${result.skipped} 篇重复作文。${result.restoring ? '损坏的原始内容已另存于此浏览器，未被丢弃。' : ''}`, error: false });
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
      onChanged();
    }
  };

  const download = (raw = false) => {
    try {
      const text = raw ? history.raw : repository.exportBackup();
      if (text === null) throw new Error('无法读取原始数据。');
      downloadText(text, raw ? 'deea-original-data.txt' : `deea-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage({ text: '已发起下载，请检查浏览器下载列表，并将文件保存在安全位置。', error: false });
    } catch (error) { setMessage({ text: errorMessage(error), error: true }); }
  };

  return (
    <details className="backup-panel" open={history.issue ? true : undefined}>
      <summary>Backup &amp; restore / 备份与恢复</summary>
      <p>作文仅保存在当前浏览器。换设备或清理浏览器前请导出备份；文件包含作文原文，请妥善保管。</p>
      <p>导入会保留现有作文并跳过重复项。同标题的不同内容会改名保留，不能用导入覆盖修改稿。</p>
      <p>请只导入同一位写作者的作文；教师查看其他学生时，请使用独立的浏览器资料。</p>
      <div className="backup-actions">
        <button className="secondary-button" type="button" disabled={!!history.issue} onClick={() => download()}>Export backup / 导出备份</button>
        {history.issue === 'corrupt' && <button className="secondary-button" type="button" onClick={() => download(true)}>下载原始数据</button>}
        <label className="file-label" htmlFor="backup-file">Import backup / 选择备份文件</label>
        <input id="backup-file" ref={fileInput} type="file" accept=".json,application/json" disabled={history.issue === 'unavailable'} onChange={(event) => void chooseFile(event.target.files?.[0])} />
      </div>
      {loading && <p role="status">正在读取备份…</p>}
      {pending && <section className="import-preview" aria-label="Import preview">
        <h3>导入预览 · {pending.name}</h3>
        <p>新增 {pending.preview.added} 篇 · 跳过 {pending.preview.skipped} 篇重复作文 · {pending.preview.renamed} 篇因标题相同而改名。</p>
        <details><summary>核对导入后的作文（前 5 篇）</summary><ul>{pending.preview.essays.slice(0, 5).map((essay) => <li key={essay.id}>{essay.title} · {essay.writtenAt}</li>)}</ul></details>
        {pending.preview.restoring && <p>历史已损坏。确认后将使用这份备份恢复，并先在浏览器内另存损坏内容；建议先下载上方的原始数据。</p>}
        <div className="backup-actions">
          <button className="secondary-button" type="button" onClick={confirmImport}>{pending.preview.restoring ? '确认恢复备份' : '确认导入'}</button>
          <button className="text-button" type="button" onClick={() => setPending(null)}>取消导入</button>
        </div>
      </section>}
      {message && <p className={`feedback ${message.error ? 'error' : 'success'}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    </details>
  );
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : '操作未完成，现有数据未改变。'; }

function downloadText(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
