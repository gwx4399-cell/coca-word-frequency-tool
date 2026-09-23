# DEEA 文档与发布约定 / Documentation workflow

目的：让每次迭代形成**可回溯的产品判断、工程实现和验证证据**。面向用户可见的功能、分析规则、数据模型或存储变更，均在同一个 PR 中更新对应文档。仅修正文案拼写等不影响产品行为的改动，可以在 PR 中说明无需新版本文档。

## 版本文件 / Version files

```text
docs/iterations/vX.Y/
├─ DEEA_PRD_CN.md
├─ DEEA_PRD_EN.md
├─ DEEA_TECHNICAL_DESIGN_CN.md
└─ DEEA_TECHNICAL_DESIGN_EN.md
```

中文版先表达完整决策，英文版用自然英语复述同一事实与边界。每份首页写清版本、日期、状态（提案 / 已在分支实现 / 已合并 / 已发布）、关联 PR。**不要用“已实现”描述仅在计划中的功能**；不能把固定规则提示称作 AI 反馈。算法与语言学习阈值如未实证验证，应写成产品假设。

## 每次迭代的最小记录 / Minimum record

| 材料 | 必须回答的问题 |
| --- | --- |
| PRD（CN/EN） | 用户遇到了什么问题？本版解决哪一段流程？哪些功能明确不做？界面状态及错误如何处理？怎样从用户行为判断是否有帮助？ |
| 技术设计（CN/EN） | 数据从哪里来、如何保存与计算？规则和边界条件是什么？哪些代码文件负责？隐私和失败回退如何处理？测试如何复现？ |
| PR 与测试 | 文档对应哪些实际代码与测试？通过了哪些命令？有什么尚未验证的教学假设？ |
| 索引 | `docs/README.md` 加新版本入口，旧版保留原始状态和历史。 |

新增词汇识别、语义分组或建议规则时，技术设计应列出**输入、输出、阈值、无证据回退和至少一个反例**；规则复杂后可拆出独立的中英文 Rule Spec。涉及教师/学习者测试时，记录样例来源、任务类型、评估标准和误判，而非只报告“准确率”或页面截图。不得把真实作文原文或可识别学生信息写入公开仓库。

## 交付流程 / Delivery sequence

1. 在 PRD 写出问题、范围与验收；设计状态可以先标“提案”。
2. 代码与技术设计同步更新；规则决定改变时同步修改测试和产品说明。
3. 验证后把状态改成“分支已实现”，记录准确的命令结果与限制。
4. 更新索引和 PR 描述，让评审者从用户问题追到代码证据。
5. 合并/发布后更新状态；作品集引用合并版、公开 Demo 和具体贡献，不把草稿部署状态写成上线。

**English summary:** Every behavior or rule change should ship with a versioned PRD and technical design in Chinese and English, an implementation status, a traceable PR, reproducible checks, and explicit limitations. Preserve earlier versions as decision history; keep unvalidated learning claims and planned AI capabilities clearly labeled.
