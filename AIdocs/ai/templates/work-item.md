# Work Item: <title>

> slug 建议：`<date>-<short-feature-name>`，例如 `2026-04-21-container-db-filter`.

## 背景/目标
- 背景：
- 目标（可量化/可验证）：

## 方案设计（Designer）
- 涉及路由：
- 涉及组件/目录：
- Mock 数据与状态设计（核心 state/派生数据/更新路径）：
- 交互流（用户怎么操作、页面怎么反馈）：
- 复用点（优先复用现有模块/组件/类型）：
- 冲突检查（如与现有逻辑冲突，优先调整新逻辑）：

## 约束对齐（Constraints）
从 `AIdocs/ai_constraints.md` 里选择本次相关的规则，逐条写“怎么满足”：
- [ ] REPO.SCOPE.NO_BACKEND：
- [ ] TS.NO_ANY：
- [ ] UX.ACTIONS.HAVE_EFFECT：
- [ ] LIST.SEARCH.REQUIRED：
- [ ] LIST.DETAIL.REQUIRED：
- [ ] SELECT.DEFAULT_VALUE：
- [ ] UI.TAG.FULLY_ROUNDED_NO_BORDER：
- [ ] UI.FIELD_LINK_ONLY_IF_NAV：
- [ ] UI.TABLE.HORIZONTAL_SCROLL：
- [ ] UI.CARD.NO_HEAVY_BORDER：
- [ ] UI.OPS_BUTTON_STYLE：

## 测试用例（最小自测）
至少 2 条，格式固定为 Input/Expected，方便 AI 自检与人类快速 Review：

- Case 1
  - Input:
  - Expected:

- Case 2
  - Input:
  - Expected:

## Review 清单（Reviewer）
Reviewer Gate: PASS | FAIL

- [ ] 是否违反 `AIdocs/ai_constraints.md` 的 MUST 规则
- [ ] 是否复用已有模块/类型（避免重复造轮子）
- [ ] 是否有搜索框且包含重要字段（名称/ID/关键标识）
- [ ] 是否点击标题字段进入详情页（无“详情”操作按钮）
- [ ] 新增/编辑/删除是否产生真实业务效果（state 更新/回显/导航/弹窗提交）
- [ ] Tag/link/卡片/操作按钮样式是否符合 UI 规范
- [ ] 宽表是否支持横向滚动（需要时），关键列是否有最小宽度
- [ ] 关键交互处是否有注释说明产品意图

Reviewer Notes:

## 实施记录（Builder）
- 实际改动：
- 遇到的坑/权衡：
- 自测结果：
  - `npm run ai:check`：
  - `npm run ai:check:full`（如执行）：

## 交付物
- 变更文件清单：
- 截图/录屏（如有）：
