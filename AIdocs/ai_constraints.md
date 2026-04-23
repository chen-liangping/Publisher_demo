- id: REPO.SCOPE.NO_BACKEND
  level: MUST
  rule: 本仓库为纯前端原型（Next.js App Router + React + Ant Design + Tailwind），不引入后端/数据库/Docker 依赖来“完成需求”。

- id: DEV.PORT.3006
  level: MUST
  rule: 本地开发服务必须运行在 3006 端口；若占用需清理后再启动（参考 `AGENTS.md`）。

- id: TS.NO_ANY
  level: MUST
  rule: 不使用 `any`；props/state/函数入参出参必须有明确 TypeScript 类型。

- id: UX.ACTIONS.HAVE_EFFECT
  level: MUST
  rule: 页面中的删除/编辑/新增等操作必须产生真实业务效果（更新 state / 打开并提交表单 / 导航到详情等），不允许仅弹 `message` 作为唯一结果。

- id: LIST.SEARCH.REQUIRED
  level: MUST
  rule: 所有列表页必须提供搜索框，且搜索字段包含“重要字段”（名称、ID、关键标识）。

- id: LIST.DETAIL.REQUIRED
  level: MUST
  rule: 所有列表必须有详情页；进入详情页的方式为点击列表“标题字段”，不是通过“详情”操作按钮。

- id: SELECT.DEFAULT_VALUE
  level: MUST
  rule: 所有 Select/Radio/可搜索下拉必须提供默认值，且默认值符合业务逻辑，避免空选择产生错误状态。

- id: UI.TAG.FULLY_ROUNDED_NO_BORDER
  level: MUST
  rule: 所有 Tag 必须 fully rounded（最大圆角），不同值用不同颜色；禁止描边（border）。如需层次，仅允许使用轻微低透明度背景色。

- id: UI.FIELD_LINK_ONLY_IF_NAV
  level: MUST
  rule: 仅当字段具备真实跳转/导航行为时，才允许使用 link 视觉；无跳转行为字段必须使用黑/灰文字，不得伪装成可点击。

- id: UI.TABLE.HORIZONTAL_SCROLL
  level: MUST
  rule: 当列表字段多导致超宽时，表格必须支持横向滚动（horizontal scroll）；`volume` 列必须有最小宽度（min-width），避免内容被挤压变形。

- id: UI.CARD.NO_HEAVY_BORDER
  level: MUST
  rule: 卡片禁止 heavy border；如需层次，用轻阴影/背景层次而非粗边框。

- id: UI.OPS_BUTTON_STYLE
  level: MUST
  rule: 列表操作按钮需根据数量控制样式：
    - 操作数量 < 3：使用“文字 + 图标”的 text button，禁止 icon-only。
    - 操作数量 >= 4：使用 icon-only 按钮，hover 必须显示包含操作名称的 tooltip。
    - 点击区域足够大（>= 32px）。

- id: REUSE.NO_DUP_WHEELS
  level: SHOULD
  rule: 新增功能必须优先复用已有模块/组件/数据结构，避免重复造轮子；如冲突，优先修改新逻辑以适配现有约定。

- id: CHANGE.SAFETY.NO_BREAKING
  level: MUST
  rule: 不得破坏现有页面可运行性；若必须调整公共组件/类型，需同时完成调用方适配。

- id: STATE.TRACEABLE
  level: SHOULD
  rule: 状态流转必须可追踪：关键操作要有明确的 state 更新路径与 UI 回显（必要时在交互处写注释说明产品意图）。
