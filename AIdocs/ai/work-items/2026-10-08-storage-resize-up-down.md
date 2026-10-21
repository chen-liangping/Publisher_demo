# Work Item: 存储实例升配 / 降配入口

## 背景/目标
- 背景：参考《存储规格调整》+ 阿里云变配能力，存储实例需要支持升配和降配。包年包月实例存储只能扩、不能缩。
- 目标：「查看规格」旁增加「调整配额」入口，进入规格详情后按组件单独「升配」「降配」（Mongo 分片的 Mongos / Shard / ConfigServer 各自独立申请）；降配时存储只读展示当前值。

## 方案设计（Designer）
- 涉及路由：无（`/` 容器模式 → 存储）。
- 涉及组件：`ContainerDatabase.tsx`（入口、状态、查看规格回显）、新增 `StorageResizeModal.tsx`（弹窗）、`storageResizeMeta.ts`（类型、默认规格、规则）。
- 可调项：PolarDB 规格；Mongo 副本集 规格+存储(20–16000GB)；Mongo 分片 mongos 规格 / shard 规格+存储(≤16000GB) / config 规格+存储(≤1270GB)；Redis 标准 规格；Redis 分片 分片规格+分片数+带宽；Zookeeper 规格+公网带宽(0–5000Mbps)。
- 升配：规格只能选 ≥ 当前，存储最小值 = 当前值；降配：规格只能选 ≤ 当前，存储只读 + 「当前值，不支持缩减」。
- 状态流（`resizeTicketMap`）：用户「提交申请」→ 审批中（AI 发起审批，可撤回）→ 已审批（管理员经 AI 同意；原型 4 秒模拟）→ 用户点「确认生效」选择生效时间 → 立即生效：变配中，3 秒后写入 `specConfigMap`；可运维时间段：待生效，可取消。
- 审批拒绝：入口红点 + 气泡「xx申请被拒绝」【确定】，确定后清除申请；执行失败：提示「操作失败」，申请清除可重新申请；降配提交前按内存 / 磁盘用量校验拦截；可运维时间段读取实例运维窗口（mock）；调整配额弹窗底部有「原型演示」切换审批结果 / 执行结果。不出现费用、包年包月、AI 字样。
- 配置冲突：申请保存提交时快照（base），去确认时与云厂商当前配置比对，不一致则确认弹窗显示「配置冲突」，只能【取消变配】或【重新申请】；原型演示可切换「确认时云厂商侧：已被变配」。
- 内部账号（顶栏「内部账号」视角，page.tsx 透传 accountType）：申请弹窗内直接选生效时间并【确认升配/降配】，不走审批。
- Redis 通知场景（notify-keyspace-events）：CP / 内部账号、测试 / 正式环境均可改；实例多游戏共用时弹窗提示「修改后对所有游戏生效」；被其他游戏改过时卡片黄色提示 +【我知道了】，本游戏保存后提示消失（mock：redis-test 分片集群被 othergame 改为全量事件通知）。
- 申请弹窗不选生效时间，生效时间只在审批通过后的确认弹窗里选。
- 入口结构：卡片「调整配额」→ 规格详情弹窗（组件 / 节点数 / 规格 / 存储 / 操作），操作列每个组件独立升配 / 降配；变配单按「实例::组件」记录，完成后只合并该组件的新规格。卡片「调整配额」在有审批通过的申请时带红点 + 「去确认」气泡。
- 审批中 / 已审批阶段组件行入口仍显示「升配」「降配」文字但置灰：审批中不可点；已审批时申请方向的入口带红点，下方气泡默认展开（标题「升配/降配申请已通过，请确认」+ 按钮「去确认」，右上角可收起，收起后点入口可再展开），点「去确认」打开规格比对弹窗（配置项 / 当前 / 变更后），可确认、稍后确认或放弃申请。

## 约束对齐（Constraints）
- [x] REPO.SCOPE.NO_BACKEND：纯前端 mock。
- [x] TS.NO_ANY：新增类型均显式声明。
- [x] UX.ACTIONS.HAVE_EFFECT：提交后更新 state，状态标签与查看规格均回显。
- [x] SELECT.DEFAULT_VALUE：规格默认当前值；确认弹窗生效时间默认立即生效。
- [x] UI.TAG.FULLY_ROUNDED_NO_BORDER：状态 Tag 无描边、全圆角。
- [x] UI.FIELD_LINK_ONLY_IF_NAV：升配/降配链接均打开弹窗。
- [x] CHANGE.SAFETY.NO_BREAKING：查看规格默认值与原 mock 一致。

## 测试用例（最小自测）
- Case 1
  - Input: Mongo 分片实例点「升配」。
  - Expected: shard/config 存储为输入框，最小值 20，上限分别 16000 / 1270。
- Case 2
  - Input: 同实例点「升配」，shard 规格改 8核16G，提交申请。
  - Expected: 显示「升配审批中」→ 4 秒后「升配」置灰，hover 提示「升配申请已通过，请确认」→ 点击打开规格比对弹窗，选立即生效 →「升配中」→ 查看规格 Shard 为 8核16G。
- Case 3
  - Input: 点「降配」。
  - Expected: 存储只读显示当前值 20GB，标注「当前值，不支持缩减」。

## Review 清单（Reviewer）
Reviewer Gate: PASS

- [x] 是否违反 `AIdocs/ai_constraints.md` 的 MUST 规则
- [x] 是否复用已有模块/类型
- [x] 关键交互处有注释

Reviewer Notes: 规格候选列表为原型示意，真实环境应由阿里云可用规格接口返回。

## 实施记录（Builder）
- 实际改动：见方案设计。
- 自测结果：`tsc --noEmit` 通过；新增文件 eslint 通过；Playwright 走通 Case 1–3。

## 交付物
- 变更文件清单：`ContainerDatabase.tsx`、`StorageResizeModal.tsx`、`storageResizeMeta.ts`、本 Work Item。
