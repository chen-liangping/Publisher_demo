# Work Item: 部署页服务列表展示 K8s 事件与故障查看日志

> slug: `2026-04-24-deployment-pod-k8s-events-status`

## 背景/目标
- 背景：服务列表「状态」列仅展示 Tag，缺少与 ACK 控制台类似的 K8s 事件与容器 `ContainerStatus`（`stateReason`/`stateMessage`）信息；故障时无法下钻到事件。
- 目标（可量化/可验证）：
  - 状态列展示容器级原因摘要（对齐 `stateReason`/`stateMessage`）及与事件表一致的文案风格。
  - 状态为「故障」时提供「查看日志」操作，点击后在服务表格下方展开 Pod 事件表（Mock），再次收起可关闭。
  - 服务列表提供按服务名称的搜索过滤（满足列表页搜索约束）。

## 方案设计（Designer）
- 涉及路由：`/container` 下游应用部署页（现有 `Deployment` 组件）。
- 涉及组件/目录：`src/components/ContainerServices/Application/deployment.tsx`。
- Mock 数据与状态设计：
  - 扩展 `Pod`：`containerStatus?: { containerName?; stateReason; stateMessage }`；`podEvents?: { key; eventType; objectKind; objectName; message; reason; time }[]`。
  - `podEventsPanelRecord: Pod | null` 控制底部事件面板；`serviceListSearch` 控制过滤。
- 交互流：列表展示摘要 → 故障行点「查看日志」→ 下方展开事件表；点「收起」清空 `podEventsPanelRecord`。
- 复用点：Ant Design `Table`/`Tag`/`Button`/`Tooltip`/`Input.Search`，不新增公共组件。
- 冲突检查：不改部署分组「详情」按钮（既有约束例外由既有代码承担）；本改动仅触及服务列表与 Mock 结构。

## 约束对齐（Constraints）
- [x] REPO.SCOPE.NO_BACKEND：纯前端 Mock，无后端。
- [x] TS.NO_ANY：新增类型显式声明。
- [x] UX.ACTIONS.HAVE_EFFECT：展开/收起与搜索改变表格数据源。
- [x] LIST.SEARCH.REQUIRED：服务列表增加按服务名称搜索。
- [x] LIST.DETAIL.REQUIRED：服务名称仍为进入详情的链接字段（保持）。
- [x] SELECT.DEFAULT_VALUE：本次未新增无默认值的 Select。
- [x] UI.TAG.FULLY_ROUNDED_NO_BORDER：状态 Tag `bordered={false}` + 大圆角。
- [x] UI.FIELD_LINK_ONLY_IF_NAV：「查看日志」为真实展开面板行为；非导航字段不用 link 色伪装。
- [x] UI.TABLE.HORIZONTAL_SCROLL：服务表、事件表设置合理 `scroll.x`。
- [x] UI.CARD.NO_HEAVY_BORDER：底部面板用轻分割线，不加粗边框。
- [x] UI.OPS_BUTTON_STYLE：不改动本列表操作列数量规则。

## 测试用例（最小自测）

- Case 1
  - Input: 在「服务」卡片搜索框输入 `game1`。
  - Expected: 仅显示 game1 行；状态区可见容器原因摘要与「查看日志」。

- Case 2
  - Input: 点击 game1 的「查看日志」，再点「收起」。
  - Expected: 下方出现含类型/对象/信息/内容/列的事件表；收起后面板消失。

## Review 清单（Reviewer）
Reviewer Gate: PASS

- [x] 是否违反 `AIdocs/ai_constraints.md` 的 MUST 规则
- [x] 是否复用已有模块/类型（避免重复造轮子）
- [x] 是否有搜索框且包含重要字段（名称/ID/关键标识）
- [x] 是否点击标题字段进入详情页（无“详情”操作按钮）
- [x] 新增/编辑/删除是否产生真实业务效果（state 更新/回显/导航/弹窗提交）
- [x] Tag/link/卡片/操作按钮样式是否符合 UI 规范
- [x] 宽表是否支持横向滚动（需要时），关键列是否有最小宽度
- [x] 关键交互处是否有注释说明产品意图

Reviewer Notes: 服务列表搜索为本次补齐；分组列表既有「详情」按钮未在本次重构范围内。

## 实施记录（Builder）
- 实际改动：
  - 模块级 `Pod` / `K8sPodEventRow` / `PodContainerStatusSummary` 与 `MOCK_SERVICE_PODS` Mock。
  - 服务列表：状态列展示 Tag + `stateReason`/`stateMessage` 摘要与 Tooltip 全文；故障行「查看日志」打开下方 Pod 事件表；「收起」关闭。
  - `Input.Search` 按服务名过滤；主表 `scroll.x`；批量弹窗仍用全量 `MOCK_SERVICE_PODS` 解析名称。
- 遇到的坑/权衡：`useMemo` 依赖将 Mock 提至模块常量，避免每次 render 新数组导致无意义重算。
- 自测结果：
  - `npm run ai:check`：通过（exit 0）

## 交付物
- 变更文件清单：`src/components/ContainerServices/Application/deployment.tsx`、`AIdocs/ai/work-items/2026-04-24-deployment-pod-k8s-events-status.md`
