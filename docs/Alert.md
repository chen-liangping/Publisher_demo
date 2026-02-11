# 告警消息与消息配置（Alert）需求与交互文档

> 本文档描述“告警消息列表 + 消息类型配置 + 管理员管控”的业务目标、字段说明与关键交互，用于产品、设计与前端协作。实现基于 Next.js（App Router）+ Ant Design v5（前端原型，纯前端态）。

## 0. 文件与入口概览

- **用户侧：消息类型配置页**：`src/components/nofication/alert.tsx`
  - 入口 1：`/`（`src/app/page.tsx`）菜单 `menu=alert`
  - 入口 2：消息通知页（见下）
- **用户侧：告警消息列表（“告警消息”Tab）**：`src/components/nofication/MessageNotification.tsx`
  - 入口：`/` 菜单 `menu=message-notification`
- **管理侧：消息类型开关（按条控制）**：`src/components/Admin/NotificationControl.tsx`（挂载于 `/admin`）
- **用户侧：管理员联动门禁**：`src/components/nofication/AdminNotificationGate.tsx`

> 说明：目录名为 `nofication`（历史拼写），本文按现状引用路径。

## 1. 模块范围（本次原型覆盖）

- **告警消息列表**：展示告警/通知消息，支持搜索、时间筛选、分页。
- **消息类型配置（核心）**：树形“消息类型”配置渠道与联系人绑定。
- **管理员管控（核心）**：管理员按“消息类型”逐条开关，控制用户侧是否可配置对应项。

## 2. 术语与对象

- **消息类型（Message Type）**：树形层级（Level1/2/3）。
  - Level1：`告警` / `通知`
  - Level2：业务场景（如 自动开服 / 静态资源与 CDN / 配置变更）
  - Level3：具体消息项（如 自动开服成功 / pod健康检查失败）
- **接收渠道（Channel）**：当前原型里等价于“群机器人/Webhook 渠道”（可以有多个）。
- **联系人（Receiver/People）**：每个渠道可以配置一组联系人（渠道 → 联系人绑定）。

## 3. 数据结构（前端原型态）

### 3.1 消息类型配置相关

- **Actor**
  - `id: string`
  - `name: string`
  - `kind: 'robot' | 'person'`
- **actorChannelMatrix**：消息类型节点 × 渠道开关矩阵（用于三态与级联）
  - `Record<nodeKey, Record<actorId, boolean>>`
- **channelReceiversByKey（方案 A 核心）**：消息类型节点 × 渠道 × 联系人绑定
  - `Record<nodeKey, Record<channelActorId, personActorId[]>>`

### 3.2 管理员管控相关

- **pp:admin_notice_enabled_map**（localStorage）
  - `Record<noticeLeafKey, boolean>`
  - `false` 表示该消息类型（叶子项）在用户侧“禁用且显示为关闭”

### 3.3 业务规则（有效配置与发送逻辑）

**核心规则：实际发送时的有效配置 = 管理员已开启 ∩ 用户配置**

| 层级 | 规则 | 说明 |
|------|------|------|
| 管理员 | 管理员关闭某消息类型 → 该类型**不发送** | 无论用户如何配置，管理员关闭即生效 |
| 用户 | 管理员开启时，用户配置的渠道与联系人生效 | 用户可自定义接收渠道、联系人 |
| 有效配置 | `有效配置(noticeKey) = admin_enabled(noticeKey) ? 用户配置(noticeKey) : 空` | 发送逻辑必须基于有效配置，而非仅用户配置 |

**实现说明：**

- **本原型**：当前仅在前端 UI 层做禁用（控件不可操作、置灰），无真实发送逻辑，故未实现“发送前校验”。
- **线上系统**：建议在发送链路（后端或网关）中再次校验 `pp:admin_notice_enabled_map`（或等价的配置源），确保管理员关闭的消息类型绝不投递。

## 4. 用户侧：消息类型配置（核心交互）

### 4.1 表格结构（树形表格）

列结构：
- **消息类型**：树形缩进（Level1=0、Level2=16、Level3=24）
- **接收渠道**：单列；单元格里竖排多条渠道项（checkbox）
- **联系人**：单列；只读汇总（按渠道展示已绑定联系人）

### 4.2 渠道开关与三态（级联）

- 三态计算：某节点与其后代节点在同一渠道上的状态聚合为 `true / false / indeterminate`。
- 父级切换会级联影响所有后代节点（用于快速批量开关）。

### 4.3 渠道 → 联系人绑定（方案 A）

目标：让用户明确“联系人是绑定在某个渠道下的收件人”，避免“联系人像第二个渠道”的误解。

交互：
- 在“接收渠道”列中，每条渠道项展示：
  - 渠道 checkbox
  - 当渠道 **已勾选** 时，显示 `联系人（N）` 与 **编辑 icon**（tooltip：编辑联系人）
- 点击编辑 icon 打开 Modal：
  - 多选联系人
  - 支持“全选/清空”
  - 保存后生效

默认与约束：
- **首次开启渠道**且当前未设置联系人时，默认预置第一个联系人，避免“开了渠道但没人接收”的空状态。
- 关闭渠道时，会清空该渠道在当前节点及后代节点的联系人绑定（避免残留配置产生误解）。
- 绑定关系保存时，按节点级联：对父级节点设置会同步到后代节点（与渠道开关级联保持一致）。

### 4.4 联系人列（只读汇总）

- 按渠道展示绑定结果：
  - 渠道未开启：显示“未开启”
  - 渠道已开但无联系人：显示“未设置”
  - 否则用 Tag 展示联系人名单

## 5. 管理侧：消息类型开关（按条控制）

页面：管理台 `/admin` 菜单「消息类型开关」

交互：
- 树形结构与用户侧一致（告警/通知 → 场景 → 具体项）。
- 叶子节点：单条开/关
- 父节点：级联开/关（支持 indeterminate）

存储：
- 写入 localStorage：`pp:admin_notice_enabled_map`

默认策略（原型）：
- 告警类默认 `true`
- 通知类默认 `false`（减少误配置）

## 6. 用户侧联动：禁用与视觉反馈

当管理员将某叶子项关闭（`false`）时：
- 用户侧对应行（以及包含该叶子的父级行）**不可操作**
- 视觉上：仅“可操作控件”（checkbox/switch/button/select）呈禁用态（置灰），文字不必整行置灰
- 且控件强制显示为“关闭”状态（避免禁用但看起来开启的歧义）

## 7. 告警消息列表（MessageNotification 的“告警消息”Tab）

文件：`src/components/nofication/MessageNotification.tsx`

字段与列：
- **类型**：`通知 / 告警`
- **告警名称**：消息类型名称（Tag 渲染）
- **消息内容**：文本（超长省略）
- **通知渠道 / 相关人员**：合并为一列
  - 上行：渠道 Tag（不同值不同颜色）
  - 下行：人员 Tag（不同值不同颜色；为空显示 `—`）
- **时间**：精确到秒，可排序

搜索：
- 关键词可匹配：告警名称、消息内容、渠道、人员、类型

## 8. 分页策略（全局）

- 全局分页工具：`src/components/Common/GlobalPagination.ts`
  - `BUSINESS_DEFAULT_PAGINATION`：默认 5 条，选项 `[5, 10, 20, 50]`
  - `CDN_DEFAULT_PAGINATION`：默认 10 条，选项 `[10, 20, 50, 100]`

---

最后更新：以实现为准（重点文件：`src/components/nofication/alert.tsx`、`src/components/Admin/NotificationControl.tsx`、`src/components/nofication/MessageNotification.tsx`）。
