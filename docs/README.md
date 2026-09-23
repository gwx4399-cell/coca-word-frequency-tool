# DEEA 文档索引 / Documentation index

此处保留**产品决策、实现边界和验证证据**，供项目评审与 AI 教育产品经理作品集使用。阅读时先看版本状态；设计提案不等于已上线功能。DEEA 目前是本地规则驱动的写作原型，尚未接入 AI 模型。

| 阶段 | 状态 | 产品材料 | 技术材料与验证 |
| --- | --- | --- | --- |
| v0.1：从词频原型到 DEEA 的规划 | `main` 中的设计草案；部分功能尚未实现 | [代码差距](./DEEA_GAP_ANALYSIS_CN.md) · [功能树](./DEEA_FEATURE_TREE_CN.md) · [页面架构](./DEEA_PAGE_ARCHITECTURE_CN.md) · [PRD 中文](./DEEA_PRD_CN.md) | 作为后续设计的基线，不是 v0.2 的实现说明。 |
| v0.2：分析即保存 + 三篇建议 | [代码 PR #4](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/4) 与[文档 PR #5](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/5) 已合并 `main`；公开部署状态待核实 | [PRD 中文](./iterations/v0.2/DEEA_PRD_CN.md) · [PRD English](./iterations/v0.2/DEEA_PRD_EN.md) | [技术设计中文](./iterations/v0.2/DEEA_TECHNICAL_DESIGN_CN.md) · [Technical design English](./iterations/v0.2/DEEA_TECHNICAL_DESIGN_EN.md) · 30 个测试、类型检查、构建通过。 |
| v0.3：跨篇汇总 + 四词意群试验 | [PR #6](https://github.com/gwx4399-cell/coca-word-frequency-tool/pull/6) 的分支已实现，待评审与合并；公开部署状态待核实 | [PRD 中文](./iterations/v0.3/DEEA_PRD_CN.md) · [PRD English](./iterations/v0.3/DEEA_PRD_EN.md) · [产品设计图 / 说明中文](./iterations/v0.3/DEEA_PRODUCT_DESIGN_CN.md) · [Product design English](./iterations/v0.3/DEEA_PRODUCT_DESIGN_EN.md) | [技术设计中文](./iterations/v0.3/DEEA_TECHNICAL_DESIGN_CN.md) · [Technical design English](./iterations/v0.3/DEEA_TECHNICAL_DESIGN_EN.md) · [五篇原创 IELTS 作文](../data/demo/IELTS_TASK2_FIVE_ESSAYS.md) · 35 个测试、类型检查、构建通过。 |

## 阅读顺序

1. 看相应版本的 **PRD**：用户问题、目标、范围、交互、验收和限制。
2. 看相应版本的 **技术设计**：代码结构、数据、规则、错误处理、隐私和测试。
3. 看对应 PR 的代码与测试，验证文档中的“已实现”。未来设想按计划项单独标记。

## 后续版本怎么留档

按[文档与发布约定](./WORKFLOW.md)为每次用户可见的功能或规则更新保留中英 PRD、中英技术设计与可复现的验收证据。根目录 README 只承担运行与导航；版本文档放在 `docs/iterations/vX.Y/`，旧版本不覆盖。PR 模板会提示更新文档链接。
