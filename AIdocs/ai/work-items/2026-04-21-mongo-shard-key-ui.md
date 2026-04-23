# Work Item: Mongo 分片管理 — 已分片集合调整分片键 + 移除 Shard 分布与高级配置

> slug: `2026-04-21-mongo-shard-key-ui`

## 背景/目标
- 背景：config 分片管理原型中，仅「未分片」集合可操作；概览区展示 Shard 分布，集合详情有「高级信息」折叠块。
- 目标（可量化/可验证）：
  1. 「已分片」集合支持通过弹窗调整分片键（Mock 更新 state 与列表/详情回显）。
  2. 移除数据库概览卡片中的「Shard 分布」区块。
  3. 移除集合详情中的「高级信息（折叠）」整块。

## 方案设计（Designer）
- 涉及路由：无新路由；`ContainerDatabase` 内 Mongo 权限 Drawer → 数据库 → config 分片管理。
- 涉及组件/目录：`src/components/ContainerServices/Database/ContainerDatabase.tsx`。
- Mock 数据与状态设计：
  - 新增 `shardingModalPurpose: 'enable' | 'adjust'`，复用 `enableShardingOpen`、`enableShardingCollection`、`enableShardingKey`、`enableShardingKeyType`。
  - `openAdjustShardKeyModal(name)`：从 `dbSharding.collections` 读取当前 `shardKey`/`shardKeyType` 预填表单，`purpose='adjust'`。
  - 确认提交：与开启分片共用更新逻辑（生成分布 mock），`enable` 仅允许 `unsharded`→`sharded`；`adjust` 仅允许已分片更新键与分布。
- 交互流：
  - 列表：已分片行显示「调整分片键」文本按钮（图标+文字）；未分片仍为「开启分片」。
  - 详情：已分片时顶部显示「调整分片键」；确认后关闭弹窗并保持当前视图（不强制跳详情）。
  - 「开启分片」确认后行为保持：进入集合详情并选中该集合。
- 复用点：现有 Modal/Form/Select、`setMongoShardingStateByInstance` 聚合逻辑。
- 冲突检查：不引入后端；不改动列表搜索/标题进详情等既有约定。

## 约束对齐（Constraints）
- [x] REPO.SCOPE.NO_BACKEND：仅前端 state。
- [x] TS.NO_ANY：使用已有类型与字面量联合。
- [x] UX.ACTIONS.HAVE_EFFECT：提交后更新分片键与分布，非仅 message。
- [x] LIST.SEARCH.REQUIRED：不改列表页，本为子视图已有搜索。
- [x] LIST.DETAIL.REQUIRED：保持集合名链接触达详情。
- [x] SELECT.DEFAULT_VALUE：打开弹窗时预填 key/type；开启模式下集合下拉仅未分片项且默认当前集合。
- [x] UI.TAG.FULLY_ROUNDED_NO_BORDER：沿用 `tagPillStyle`。
- [x] UI.FIELD_LINK_ONLY_IF_NAV：集合名仍为链接。
- [x] UI.TABLE.HORIZONTAL_SCROLL：表格列宽保持。
- [x] UI.CARD.NO_HEAVY_BORDER：删除区块不新增重边框。
- [x] UI.OPS_BUTTON_STYLE：每行单一操作时文字+图标 text 按钮，高度 32。

## 测试用例（最小自测）
- Case 1
  - Input: 进入分片管理 → 已分片集合行点击「调整分片键」→ 改分片键/类型 → 确认。
  - Expected: 列表与详情中分片键与分布更新；成功提示；仍停留在列表视图。

- Case 2
  - Input: 进入某未分片集合详情 → 开启分片 → 再点「调整分片键」→ 确认。
  - Expected: 分片键变更后详情区展示新键；无「高级信息」折叠、概览无 Shard 分布。

## Review 清单（Reviewer）
Reviewer Gate: PASS

- [x] 是否违反 `AIdocs/ai_constraints.md` 的 MUST 规则
- [x] 是否复用已有模块/类型（避免重复造轮子）
- [x] 是否有搜索框且包含重要字段（名称/ID/关键标识）
- [x] 是否点击标题字段进入详情页（无「详情」操作按钮）
- [x] 新增/编辑/删除是否产生真实业务效果（state 更新/回显/导航/弹窗提交）
- [x] Tag/link/卡片/操作按钮样式是否符合 UI 规范
- [x] 宽表是否支持横向滚动（需要时），关键列是否有最小宽度
- [x] 关键交互处是否有注释说明产品意图

Reviewer Notes: 调整分片键与开启分片分支在确认函数内用早期 return + purpose 区分。

## 实施记录（Builder）
- 实际改动：`ContainerDatabase.tsx` 增加 `shardingModalPurpose` 与 `openAdjustShardKeyModal` / `confirmShardingModal`；列表与集合详情对「已分片」提供「调整分片键」；移除概览「Shard 分布」与详情「高级信息」折叠块；开启分片弹窗内集合下拉仅展示未分片集合。
- 遇到的坑/权衡：开启与调整共用一套表单状态，取消与提交后均重置 `purpose`，避免下次打开标题错乱。
- 自测结果：
  - `npm run ai:check`：通过（`ai:validate` + `next lint`，仅有仓库既有 warnings）。

## 交付物
- 变更文件清单：`src/components/ContainerServices/Database/ContainerDatabase.tsx`、`AIdocs/ai/work-items/2026-04-21-mongo-shard-key-ui.md`。
