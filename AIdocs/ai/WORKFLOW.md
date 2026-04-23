# 最小工作流（让 AI 自驱动闭环跑起来）

## 目录结构（新增）
```
AIdocs/
  ai_constraints.md
  ai/
    PROMPT.md
    WORKFLOW.md
    templates/
      work-item.md
    work-items/
      example.md
scripts/
  ai/
    validate-work-item.mjs
```

## 你怎么用（人类最少参与版本）
1) 把 `AIdocs/ai/PROMPT.md` 复制到 Cursor 的对话里作为“任务提示”开头。
2) 每个需求创建一个 `AIdocs/ai/work-items/<slug>.md`（用模板）。
3) AI 先写设计与 Review Gate（PASS 才允许写代码）。
4) AI 写代码后跑：
- `npm run ai:check`（最小闭环）
- 或 `npm run ai:check:full`（更严格）
5) AI 在 Work Item 里记录自测结果并输出交付摘要。

## 命令（最小可执行闭环）
- 校验最新 Work Item 是否符合模板要求：
  - `npm run ai:validate`
- 校验 + lint：
  - `npm run ai:check`
- 校验 + lint + build：
  - `npm run ai:check:full`

> 注意：开发服务端口约束仍以 `AGENTS.md` 为准：`PORT=3006 npm run dev`。
