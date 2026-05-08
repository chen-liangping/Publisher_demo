# Work Item: 存储实例卡片备份策略弹窗

## 背景/目标
- 背景：容器数据库「存储」页实例卡片需展示备份策略入口，并按存储类型展示与控制台一致的策略信息（Mongo / MySQL / Redis / Zookeeper 字段不同）。
- 目标：卡片配置区增加「备份策略」链接；点击打开 Modal，按类型只读展示对应布局（无编辑）。

## 方案设计（Designer）
- 涉及路由：无（现有 `/` 容器模式存储子页）。
- 涉及组件：`src/components/ContainerServices/Database/ContainerDatabase.tsx`。
- Mock 数据：`buildDefaultBackupPolicy(inst)` 按 `inst.type` 生成展示数据，无会话内覆盖 state。
- 交互流：点击「备份策略」→ 打开 Modal 只读展示；MySQL 保留「切换基础/高级」仅切换展示面板。
- 复用点：`Descriptions`、`Modal`、`Typography.Link`；与「查看规格」一致的链接风格。
- 冲突检查：不改 `DatabaseDetails` / 表格模式；仅卡片模式（≤8 条）增加入口。

## 约束对齐（Constraints）
- [x] REPO.SCOPE.NO_BACKEND：纯前端，无新依赖。
- [x] TS.NO_ANY：策略为联合类型 + `variant` 判别。
- [x] UX.ACTIONS.HAVE_EFFECT：无「编辑/提交」；入口链接打开 Modal 并展示按类型区分的策略信息（与「查看规格」同类交互）。
- [x] LIST.SEARCH.REQUIRED：本次非列表新页，不适用。
- [x] LIST.DETAIL.REQUIRED：同上。
- [x] SELECT.DEFAULT_VALUE：无编辑表单，不适用。
- [x] UI.TAG.FULLY_ROUNDED_NO_BORDER：不改 Tag 规则。
- [x] UI.FIELD_LINK_ONLY_IF_NAV：「备份策略」打开弹窗。
- [x] UI.TABLE.HORIZONTAL_SCROLL：不适用。
- [x] UI.CARD.NO_HEAVY_BORDER：沿用现有轻描边卡片。
- [x] UI.OPS_BUTTON_STYLE：不改操作列数量规则。

## 测试用例（最小自测）
- Case 1
  - Input: 卡片模式选 Mongo 实例，点击「备份策略」。
  - Expected: Modal 展示「基础备份」字段与 Mongo 底部提示文案。
- Case 2
  - Input: 选 Redis 实例打开策略。
  - Expected: Modal 展示「当前定时配置」四字段（保留天数、周期、时间、预计下次备份）。

## Review 清单（Reviewer）
Reviewer Gate: PASS

- [x] 是否违反 `AIdocs/ai_constraints.md` 的 MUST 规则
- [x] 是否复用已有模块/类型（避免重复造轮子）
- [x] 是否有搜索框且包含重要字段（名称/ID/关键标识）— 非本次范围
- [x] 是否点击标题字段进入详情页 — 非本次范围
- [x] 展示类入口是否具备明确反馈（打开 Modal 并展示结构化内容）
- [x] Tag/link/卡片样式符合现有页
- [x] 宽表横向滚动 — 非本次范围
- [x] 关键交互处有注释

Reviewer Notes: 表格模式未加备份策略入口；策略不支持在原型内修改。

## 实施记录（Builder）
- 实际改动：`ContainerDatabase.tsx` 备份策略为只读 Modal；已移除编辑子 Modal、`backupPolicyById`、`Switch`/`InputNumber` 等编辑用依赖。
- 遇到的坑/权衡：`Typography.Text` 的 `type="primary"` 在 Ant Design 5 类型中不可用，改为行内主色（沿用）。
- 自测结果：
  - `npm run ai:check`：通过
  - `npm run ai:check:full`（如执行）：未执行

## 交付物
- 变更文件清单：`src/components/ContainerServices/Database/ContainerDatabase.tsx`、`AIdocs/ai/work-items/2026-04-24-storage-backup-policy-modal.md`
