# DEEA v0.4 技术设计
日期：2026-11-03。状态：[草稿 PR #10](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/10) 已在分支实现；未合并或部署。

## 分析与证据
`tokenize.ts` 为 token 保留 JavaScript 字符串偏移 start/end，不改写原文。`analyzeEssay.ts` 仍使用有限词表和确定性候选顺序；新增 wrote/written、took/taken、gave/given、chose/chosen 及 added 的显式归并约定。双写尾辅音的删减至少保留三字母，避免 adding → ad，现有 running → run、using → use、caring → care 回归保持。

反例：独立 ad 仍是 ad；歧义词 saw 保留词表精确词条，不强行归到 see。added → add 与旧 used → use 一样是人工约定，不声称每个 token 的词性已判明。不能仅凭有限词表完全还原所有词形。

`evidence.ts` 调用同一 lemmatizeWord 匹配 token；使用 Intl.Segmenter 的英语句界，缺失时退到标点/换行分段。一句出现多次只列一次，高亮可有多个。句界不等于语义分析。Unicode 偏移、大小写、原形/变形、子串不误命中均有测试。`HighlightedText` 通过 React 文本节点和 mark 渲染，不使用 HTML 注入。

UI 搜索匹配 lemma 或 observed forms，搜索时覆盖低次数词，不过滤底层分析。跨篇阈值（至少两篇、累计至少三次）、最近三篇建议和四词分母不变。四词组改名为中性“观测组”，补充 statistically significant 反例。

## 存储与恢复
原键仍为 `deea.essays.v1`，无需迁移。inspect 返回 essays、raw 与 issue；结构错误、任一无效记录、重复 ID 均标 corrupt，而不是静默丢弃。访问异常标 unavailable。create/delete/export 在读异常时抛出明确错误。构造仓储时不触碰 localStorage，避免访问权限异常直接使 App 崩溃。

备份信封为 `{format: "deea-essay-backup", version: 1, exportedAt, essays}`。导入必须完整验证格式、版本和所有记录；UI 限制文件为 10 MB 以内。预览不写数据，确认前再次核对原始历史，历史变化则要求重新选择。相同内容跳过；不同内容的 ID 冲突分配后缀、标题冲突改名，重复导入此前改名的记录也跳过。一次性写入合并数组，存储满时原键不变。

损坏历史仅在用户确认恢复有效且非空的备份时替换。写入新历史前，将损坏原文完整保存到 `deea.essays.recovery.<time>.<id>`；若保存这份副本失败则停止恢复。另提供原始数据下载。该浏览器内副本也会随站点数据清除而丢失，外部下载才是离线备份。storage 事件刷新其他标签页；这不是多用户事务数据库，尚无并发写锁或云同步。

## 验证与交付
当前 50 项测试 / 11 文件通过。覆盖真实 COCA 的词形正反例、原句字符范围、低次数搜索、HTML 文本安全、跨篇跳转高亮、下一篇操作、导入预览/取消/确认/重复、损坏恢复及原文保全、存储拒绝和写入失败。测试使用 Node 22；本机 Node 26 的原生 localStorage 与旧测试环境有兼容差异，因此未把该环境差异算作产品失败。

命令：`npm test`（Node 22）、`npx tsc --noEmit`、`npm run build`。PR 检查与主分支部署前运行测试、类型检查；另构建。浏览器实测见[记录](./USABILITY_REVIEW_CN.md)。备份文件完全在本地读取，正文不上传服务器。

## 已知限制
分词/句界和词形规则仍有限；停用词表不是完整功能词模型。全文与低次数列表可能较长，搜索用于降低查找负担。旧全量 CSV 带来的打包体积警告仍需后续优化。没有正文版本、草稿自动恢复、教师标记持久化或真正的语义机会分母。
