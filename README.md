# DEEA｜跨篇英语写作词汇观察原型

> 一篇作文能告诉我们某个词出现了几次；多篇作文才能让教师和学习者看到它是否反复出现在不同写作任务中。DEEA 把单篇分析、作文历史与跨篇证据连在一起，帮助用户决定**哪些表达值得回到原句核查**。

**当前状态：v0.4 原型（[原句证据 PR #9](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/9) 待合并）。**DEEA 在界面中展开为 Academic English Evolution Agent。工具在浏览器本地运行，使用 COCA 衍生的高频词表辅助词形归并；写作提示由明确的规则和少量人工词表生成。名称中的 Agent 是产品命名，**当前没有接入 AI 模型，不提供自动评分或语义诊断**。

面向场景：同一写作者的多篇英语议论文，例如 IELTS Task 2；英语教师或学习者可以查看重复用词的逐篇证据，再结合题目和语境讨论下一步练习。

![DEEA v0.3 三个视图的产品结构草图](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN.svg)

*这是 v0.3 产品结构图，不是实际页面截图。[设计说明：中文](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN_CN.md) · [English](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN_EN.md)。v0.4 的[原句高亮流程图](./docs/iterations/v0.4/DEEA_EVIDENCE_DESIGN.svg)展示新增的语境核查路径。*

## 当前可以体验什么

| 视图 / 能力 | 已实现的用户行为 | 解释边界 |
| --- | --- | --- |
| **New essay / 单篇分析** | 输入标题、写作日期、可选题目与正文；点击 Analyze and save 后立即分析并保存。显示总词数，以及本篇出现至少 **3 次**的词、observed forms 与次数。 | 出现 1–2 次的词只从单篇表格隐藏，底层分析仍保留。标题在同一浏览器内须唯一；重复分析相同作文不会再保存一份。 |
| **History / 作文历史** | 按日期打开已保存作文，查看原文、题目和重新计算的分析结果；删除前会要求确认。 | 当前只在浏览器本地保存，无账号或跨设备同步。 |
| **Across essays / 跨篇复现** | 汇总当前浏览器中**全部**已保存作文。列表显示至少出现于 **2 篇**且累计至少 **3 次**的 lemma，展开后可查看逐篇次数、原句及匹配词形高亮。点击作文标题，History 中的完整原文也会高亮该词。 | 单篇 1–2 次的记录仍进入跨篇累计；高亮表示词形匹配，不代表该句有错；尚无作者或文体筛选。 |
| **写作建议** | 保存至少 **3 篇**后，依据**最近 3 篇**生成有限的练习提示；无合格词时给一般练习方向。 | 只覆盖预设的少量形容词；次数是复核线索，不等于用词错误。 |
| **“重要性”四词试验** | 比较 important、significant、essential、crucial 的观测词次；仅在总数至少 **3 次**且涉及至少 **2 篇**时显示组内占比。 | 分母只含这四个词的出现次数，无法统计所有表达“重要性”的机会，不能诊断“意群依赖”。 |

COCA 的派生 rank、词频以及覆盖率仍可供程序内部查询，**不作为写作质量分数展示**。每百词频率也没有作为界面指标。

## 用五篇作文复现跨篇统计

仓库提供 [五篇原创 IELTS Task 2 测试作文（阅读版）](./data/demo/IELTS_TASK2_FIVE_ESSAYS.md)和 [JSON 数据](./data/demo/IELTS_TASK2_FIVE_ESSAYS.json)。五篇均超过 250 词，假设由同一写作者完成，便于测试同类议论文；它们是虚构样本，**不是经评分的雅思范文**。

1. 在 New essay 中按阅读版的标题、日期、题目和正文依次录入五篇，每篇点击 **Analyze and save**。样本不会自动写入你的历史。
2. 保存第三篇后查看 Writing advice：它只使用最近三篇。进入 Across essays 查看累计结果：这里使用全部已保存作文。
3. 展开 `significant`：这五篇中它每篇只出现 **1 次**，所以单篇词表隐藏，跨篇则显示 **5/5 篇、累计 5 次**；每篇原句高亮该词，点击标题可核查完整段落。
4. 查看四词试验组：如果浏览器历史**只有这五篇**，`important` 为 **13/25 = 52.0%**。再从词条证据打开原文，核查不同题目是否自然诱发重复。

现有历史会参与“全部作文”的计算。想复现上面的精确数字，请使用空白的浏览器资料或浏览器无痕窗口，避免覆盖或混入你已有的作文。

## 在本地运行

推荐使用仓库持续集成配置中的 **Node.js 22** 和 npm。Windows PowerShell 示例：

```powershell
git clone https://github.com/gwx4399-cell/coca-word-frequency-tool.git
cd coca-word-frequency-tool
npm ci
npm run dev
```

打开终端显示的本地网址。若 GitHub 连接中断，也可以从仓库的 **Code → Download ZIP** 下载并解压，然后在解压后的项目目录运行 `npm ci` 和 `npm run dev`；执行 npm 命令前应能看到该目录中的 `package.json`。

```bash
npm test           # 运行自动测试
npx tsc --noEmit   # TypeScript 类型检查
npm run build      # 生产构建
npm run preview    # 本地预览构建结果
```

作文保存在当前访问地址的浏览器 `localStorage` 中：刷新页面仍在；清除站点数据会丢失；`localhost` 与其他访问地址的数据互不相通。分析与保存都在浏览器内完成，正文不会因使用本工具上传到服务器。

## 项目如何验证、如何继续

- **可复现验证**：37 个自动测试覆盖文本分析、保存/删除、跨篇汇总、低次数显示规则、四词分母、原句与全文高亮，以及五篇样本的预期计数；另运行 TypeScript 检查与生产构建。软件测试证明规则按预期执行，**尚未证明教学效果**。
- **当前限制**：词形还原与分词是轻量确定性规则；没有上下文词性/词义识别。所有历史作文被一起统计，写作者、文体和题目差异需人工核查。COCA 数据为 Top-frequency 衍生词表，不是完整语料库。
- **后续设计，尚未实现**：同文体比较范围、人工核查的语义机会、可持续的词汇目标、目标后 +1/+3/+5 篇观察、AWL/UWL 与 AI 生成建议。早期 Growth 首页与目标详情属于[页面架构提案](./docs/DEEA_PAGE_ARCHITECTURE_CN.md)，不是现有页面。

### 作品集证据索引

| 想看什么 | 对应材料 |
| --- | --- |
| 产品问题、验收标准、已实现与未实现的边界 | [v0.3 PRD 中文](./docs/iterations/v0.3/DEEA_PRD_CN.md) / [English](./docs/iterations/v0.3/DEEA_PRD_EN.md) |
| 数据流、规则、失败回退与测试方法 | [v0.3 技术设计中文](./docs/iterations/v0.3/DEEA_TECHNICAL_DESIGN_CN.md) / [English](./docs/iterations/v0.3/DEEA_TECHNICAL_DESIGN_EN.md) |
| 页面关系与原型工具取舍 | [产品设计图和中文说明](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN_CN.md) / [English](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN_EN.md) |
| 新增的原句证据与高亮规则 | [v0.4 PRD 中文](./docs/iterations/v0.4/DEEA_PRD_CN.md) / [English](./docs/iterations/v0.4/DEEA_PRD_EN.md) · [v0.4 技术设计中文](./docs/iterations/v0.4/DEEA_TECHNICAL_DESIGN_CN.md) / [English](./docs/iterations/v0.4/DEEA_TECHNICAL_DESIGN_EN.md) |
| 实际代码与可核对的变更 | [跨篇功能 PR #6](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/6) / [五篇样本与设计图 PR #7](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/7) / [完整版本文档索引](./docs/README.md) |

## 数据来源与许可

**Word frequency data from the Corpus of Contemporary American English (COCA).** Source text: wordfrequency.info.

仓库附带的是 COCA 衍生的 Top-frequency 数据，不是完整 COCA。项目代码的 MIT 许可**不等于**该词频数据也按 MIT 授权；转载或复用数据前请阅读 [NOTICE](./NOTICE.md)和[数据说明](./data/README_COCA_top5050.txt)，并核对数据提供方的现行条款。

## English overview

DEEA is a browser-based, rule-driven prototype for reviewing word-choice patterns across essays by the same writer. It saves essays locally, shows repeated lemmas with highlighted original sentences and full-text links, and offers limited practice prompts after three essays. The four-word importance pilot reports only the share of observed uses within its configured word set; it is not a semantic-dependency measure, an IELTS score, or AI-generated feedback. Five original, unscored IELTS Task 2 samples and a product wireframe make the demo reproducible. Read the [English PRD](./docs/iterations/v0.3/DEEA_PRD_EN.md), [technical design](./docs/iterations/v0.3/DEEA_TECHNICAL_DESIGN_EN.md), and [design notes](./docs/iterations/v0.3/DEEA_PRODUCT_DESIGN_EN.md) for decisions and limitations.
