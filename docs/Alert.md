# 告警配置（Alert）需求与交互文档

> 本文档描述 `src/components/alert.tsx` 的业务目标、字段说明、交互逻辑与业务限制，用于产品、设计与前端协作。实现基于 Next.js + Ant Design v5（前端原型，纯前端态）。

## 1. 模块范围
- 页面入口：侧边栏一级菜单「告警配置」。
- 页面包含三个子模块：
  - Webhook 管理（新增、编辑、删除、测试）
  - 人员配置（新增、删除）
  - 告警管理（核心矩阵：消息类型树 x 通道/人员）

## 2. 术语与对象
- 消息类型（Message Type）：树形层级（Level1、Level2、Level3）。示例：
  - 客户端（Level1） → 客户端版本（Level2） → 客户端创建新版本（Level3）
  - 服务端（Level1） → 自动开服（Level2） → 自动开服成功（Level3）
  - CDN（Level1） → CDN部署成功/失败（Level2）
- 通道：
  - 自建群机器人（Webhook）
  - 小包（独立通道）
- 人员：被 @ 的联系人集合（动态列）。

## 3. 字段与数据结构
- WebhookItem
  - id: string
  - name: string（示例：kumo_webhook）
  - url: string
  - secret?: string
- Person
  - id: string
  - name: string
  - dingId: string
- TreeRow（用于渲染消息类型树表格）
  - key: string（唯一主键）
  - name: string（显示名）
  - level: 1 | 2 | 3（层级）
  - robot: TriState（true | false | 'indeterminate'）
  - children?: TreeRow[]
- 前端状态（内存态，仅用于原型演示）
  - robotMatrix: Record<string, boolean>
  - packageMatrix: Record<string, boolean>（小包通道）
  - personChannelMatrix: Record<string, Record<string, boolean>>
  - rowWebhookByKey: Record<string, string[]>（自建群机器人选择，字符串为机器人名称/ID；可多选；空数组=不触发）

## 4. 告警管理矩阵（核心交互）
表格列：
- 消息类型（树形缩进：Level1=0、Level2=16、Level3=24）
- 小包（Switch）
- 自建群机器人（Checkbox + 配置按钮）
- 人员列（动态：每个人员一列，Switch）

### 4.1 通道开关与三态（小包/机器人）
- 三态计算基于叶子回溯：true/false/'indeterminate'。
- 父级任意开关影响全部子级（级联）。
- 人员列可用性：当任一通道开启（小包=on 或 机器人=on）时，人员可用；两者都关闭时，人员强制关闭并禁用。

### 4.2 机器人配置按钮
- 当机器人通道开启但未配置时：
  - 按钮 danger=红色，提示“请配置机器人”，并带轻微动效。
- 点击打开 Modal（Table 列表：名称 + Webhook 地址），支持多选、不选。
  - 保存后：将选择应用到当前节点及其全部子节点（级联继承）。
  - 不选=不触发（该节点 rowWebhookByKey[key] = []）。

### 4.3 CDN 作为一级分组
- CDN告警（例如：CDN部署成功/失败）与客户端/服务端同级（Level1）。
- 渲染数据源为三棵根：客户端、服务端、CDN。

### 4.4 告警规则配置（示例：服务端部署）
- 在“服务端部署”行右侧显示“编辑”图标，点击打开规则配置 Modal。
- 规则项字段：
  - 告警应用（Select，不可与同列表内其他规则重复）
  - 报警频率（Select）
- 支持新增/删除多条规则；首次打开预填两条：open-platform/1h，flashlaunch/1h。

## 5. 业务规则与限制
- 任一通道开启即允许人员开关；两通道均关闭时人员强制关闭并禁用。
- 机器人配置支持多选；子节点继承父级保存时的配置。
- 规则配置内“应用”不可重复（保存与渲染时均校验）。
- 初始：
  - 机器人默认内置 1 个：kumo_webhook。
  - 人员示例：史迪仔、徐音。

## 6. Webhook 管理
- 列表：展示多个机器人（名称、地址、可选的加签密钥）。
- 操作：新增、编辑、删除、测试。
- 默认内置 1 个机器人：`kumo_webhook`。

### 6.1 Webhook CRUD 字段与校验
- name：必填，1~32 个字符，字符集受限。
- url：必填，合法 http(s) URL，长度 ≤ 200。
- secret：可选，长度 ≤ 128。
- 唯一性：name/url 不可重复。
- 删除引用：若被矩阵使用，删除时二次确认；引用节点视为未配置。

## 7. 人员配置
- 列表：展示人员（名称、dingId）。
- 操作：新增、删除。
- 删除会同步清理矩阵内该人员的状态。

## 8. 可用性与提示
- 未配置机器人时给出红色提示与动效。
- Webhook 选择列表截断显示长 URL，Modal 允许横向滚动。

## 9. 分页策略（全局化）
- 提供全局分页工具 `src/components/Common/GlobalPagination.ts`：
  - `getTablePagination(pageSize, pageSizeOptions)` 返回统一配置（含 showSizeChanger 与选项）。
  - 预设：
    - `BUSINESS_DEFAULT_PAGINATION`：默认 5 条，选项 [5, 10, 20, 50]
    - `CDN_DEFAULT_PAGINATION`：默认 10 条，选项 [10, 20, 50, 100]

---

# 告警历史

> 文件：`src/components/alert/alert_history.tsx`

## 1. 页面结构
- 顶部卡片标题“告警事件”，下含 Tabs：
  - 业务告警：历史记录列表（搜索 + 时间范围筛选 + 分页）
  - CDN告警：问题 URI 列表（Status、URI、Counts、操作）

## 2. 业务告警字段
- 告警类型：文本
- 消息内容：文本（超长省略）
- 通知渠道：字符串数组，值为“自建群机器人名称”“小包”，示例：`['kumo_webhook', '小包']`
- @负责人：人员名称列表，以 Tag 展示
- 时间：精确到秒，可排序

## 3. CDN告警字段
- Status：例如 4XX
- URI：路径，示例数据包含
  - /、/favicon.ico、/offliciate、/images/favicon-icon.png、/images/favicon.png、/imgs/logox.png、/image/favicon.ico、/images/favicon-196x196.png、/assets/img/favicon.png、/favicon.ico
- Counts：出现次数（其中 2 会出现多次）
- 操作：每条有“重新扫描”链接（点击后提示“已发起重新扫描：{URI}”）

## 4. 分页
- 业务告警表：使用 `BUSINESS_DEFAULT_PAGINATION`
- CDN告警表：使用 `CDN_DEFAULT_PAGINATION`

---
最后更新：与实现保持同步（以 `src/components/alert.tsx` 与 `src/components/alert/alert_history.tsx` 为准）。