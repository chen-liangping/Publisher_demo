### Figma UI 结构与设计解析（节点 46:312）

- 文件：my design
- 节点：客户端（id: 46:312, type: FRAME）
- 数据来源：[Figma 设计文件](https://www.figma.com/design/rDH0NOpnIxLOebfcX9liwI/my-design?node-id=46-312)

#### 顶层信息
- 布局尺寸：1499 × 937（frame 尺寸）
- 全局填充色：#FFFFFF（fill_MX13D6）
- 全局字体与字重（主要出现）：
  - SF Pro Display（标题、标签，700/400）
  - Inter（正文/说明，400/500/700）
  - 苹方 PingFang SC（中文标题/说明，400/600）

#### 页面大纲
1) 客户端（frame: 46:3198）
     - Main（主内容区）
       - 顶部说明卡片（Section）
         - 标题：客户端
         - 说明：关于客户端资源与版本管理的引导文案
         - 链接按钮：了解更多
       - 折叠/解释卡片（“什么是共享文件？”）
       - 顶部 Tabs（导航标签）
         - 应用（激活）
         - 共享文件
         - CDN
         - 跨域配置
       - 应用区块（“应用” + “创建版本”主按钮）
       - 版本表格（多行）
         - 列：游戏版本 / 发版详情 / 创建时间 / 操作
         - 行：
           - v1.0.1（当前版本标签）
             - 发版详情：长文案（初始化部署...）
             - 创建时间：2024/07/22  23:56:08
             - 操作：切换版本 / 删除
           - v1.0.2（“8/28上线版本”）
           - v1.0.3（“9/02上线版本”）
           - v1.0.2_test（“test”）
           - v1.0.3_test（强调色背景，含“测试用，请勿删除该版本”）

#### 组件与样式库（Component Sets）
- 按钮：*Button*（18:1263）、Button（46:465）
- 标签/徽标：*Tag* / Basic（46:3068）、*Tag* / Colorful（46:3105）、*Badge* / Status（46:3128）
- 选项卡：Tabs / SingleTab（46:316）、Tab Item / Basic（46:333）
- 表格头/项：Table Item / Header Control（46:2896）、Header Item（46:2953/46:2954）、Row Control（46:3016）、Collapse（46:2997）
- 上传按钮：*Upload* / Button（46:2721）
- 侧栏菜单：Listitem / SidebarMenu（18:1167）、Outdated but Using（18:1198）

#### 交互与状态
- 下拉菜单：selector / chevron-down 图标，hover/active 视觉（描边、填充、边角 4px/6px）
- 开关（Switch）：带文本“测试环境”，句柄阴影（box-shadow: 0px 2px 4px rgba(0, 35, 11, 0.2)）
- 按钮：主按钮（Primary）、文本按钮（Link）、禁用（Disabled）等变体
- 标签/徽标：颜色预设（Magenta、Geekblue），状态（Success、Default、Error）
- 表格：中等尺寸、中性分隔线、阴影/描边较弱（rgba(0,0,0,0.06)）

#### 设计风格要点（可映射到 Ant Design）
- 布局：Layout/Header/Sider/Content + Grid（Row/Col）
- 导航：Menu + Dropdown + Tabs
- 数据：Table + Tag + Badge + Alert + Divider
- 表单/控件：Button + Switch + Select + Input + Tooltip
- 字体与层级：标题采用 SF Pro Display 700，正文 Inter/PingFang，字号 12/14/16/20/24 随场景递进
- 圆角：4px/6px/8px，一致而克制
- 分隔线与描边：灰度弱化（#E5E7EB / rgba(0,0,0,0.06)）

#### 关键样式 Token（节选）
- 颜色
  - 文字主色：rgba(0, 0, 0, 0.88)
  - 次级文字：rgba(0, 0, 0, 0.45/0.65)
  - 品牌/高亮：#2F54EB（蓝）、彩色标签预设（Magenta/Geekblue 等）
  - 背景：#FFFFFF、#F9FAFB、#FAFAFA、#F0F5FF
- 阴影：0px 2px 4px rgba(0, 35, 11, 0.2)（用于 Switch 句柄）
- 圆角：4px / 6px / 8px / 16px
- 边框：#E5E7EB、rgba(0,0,0,0.06/0.15)
- 间距：导航 12×24，Tabs 高度 38，表格单元 12×16

#### 可落地的组件映射建议（Next.js + Ant Design）
- Header：`Layout.Header` + `Dropdown` + `Button` + 账号菜单
- Sidebar：`Layout.Sider` + `Menu`，支持分组与图标
- Content：`Tabs` 切分内容域；顶部 `Alert`+说明块
- 表格：`Table` + `Tag` + 行操作（Link Button），支持长文案单元格
- 版本操作：右上“创建版本”（`Button type="primary" icon`）
- 主题 Token：以 AntD 5 `theme.token` 统一控制色彩/半径/阴影

#### 备注
- 本文档据 Figma 节点 46:312 抽取结构层级、组件集与样式 Token，便于快速对齐前端实现与 Design System。

### CDN 页面结构与设计（节点 46:4850）

- 页面：cdn（id: 46:4850, type: FRAME）
- 数据来源：[Figma 设计文件（节点 46:4850）](https://www.figma.com/design/rDH0NOpnIxLOebfcX9liwI/my-design?node-id=46-4850)

#### 页面大纲
- 顶部 Navbar：
  - 左侧应用选择（头像方块 + 应用名“Ginei” + 展开图标）。
  - 右侧操作：
    - 按钮：帮助文档（启用）、开发者论坛（禁用）。
    - 环境切换 Switch（“测试环境”）+ 账号下拉（“CP@ctw.inc”）。
- 左侧 Sidebar：分组菜单（我的工作台、客户端、服务端、镜像/应用/存储/共享文件/定时任务、告警配置/CDN告警、账号/支付/好友/国际化/礼包推送/数据埋点、活动数据/礼包数据 等），与“部署/监控/接入/运营”等组标签。
- 主区域 Main：
  - 顶部信息卡：
    - 标题“客户端”+ 简短说明 + “了解更多”链接。
    - 折叠项“什么是共享文件？”
  - 顶部 Tabs：应用 / 共享文件 / CDN（激活）/ 跨域配置。
  - Section / CDN：
    - 基础信息：ID、域名、HTTP版本（HTTP2/HTTP3）、凭证ID、凭证Secret（带复制图标）、CLI“查看”。
  - Section / Origin：
    - 标题“源站配置” + “添加源站”按钮。
    - 源站表格列：
      - 源站ID / 域名 / 访问路径 / HTTP端口 / HTTPS端口 / 回源协议 / 回源ssl协议 / 操作（默认配置/编辑/删除）。
      - 示例：S3 + //{staging/production}-legolas-{appid}-statics + 80/443 + 仅限HTTPS + SSLv3。
  - SectionGroup：
    - Section / Cache（缓存配置）：
      - 顶部操作：缓存检测、添加缓存配置。
      - 缓存规则表格列：访问路径 / 源站ID / 访问协议 / HTTP方法 / 智能压缩 / 缓存时间（秒）/ 操作（默认配置/编辑/排序/删除）。
      - 规则示例：
        - /errors/* → Default / 仅限HTTPS / GET, HEAD, OPTIONS / ON / 600。
        - *.html → Default / 仅限HTTPS / GET, HEAD, OPTIONS / ON / 600。
        - .svg → Default / 仅限HTTPS / GET, HEAD, OPTIONS / ON / 2592000。
        - *（兜底）→ Default / 仅限HTTPS / GET, HEAD, OPTIONS / ON / 600。

#### 组件集与样式要点（节选）
- 导航与分组：Tabs / SingleTab、Tab Item / Basic；Dropdown 菜单；侧栏 Listitem / SidebarMenu。
- 表格：Table Item / Header Item、Tables / Cell / Body、操作单元 Type=Operation(Text)。
- 按钮：*Upload* / Button 用于“添加源站”“添加缓存配置”“缓存检测”。
- 图标：复制 duplicate、chevron/arrow、rss、plus 等。
- 视觉：
  - 背景：#FFFFFF / #F9FAFB；表头底色 rgba(0,0,0,0.02)。
  - 描边：#E5E7EB；弱分隔 rgba(0,0,0,0.06/0.15)。
  - 主字号：12/14/16/18；标题 SF Pro Display 700；正文 Inter/PingFang。
  - 圆角：表格与卡片 8px；按钮 6px；开关 16px。
  - 间距：卡片内 16×24；Tabs 高 38；表格单元 12×16；行高 54/72。

#### Ant Design 实现建议
- 顶部：`Layout.Header` + `Dropdown` + `Button` + `Switch` + 账号菜单。
- 左侧：`Layout.Sider` + `Menu`（含分组/图标路由）。
- 主体：
  - `Tabs` 默认激活 CDN；
  - 基础信息用 `Descriptions`/`Card` + 复制交互（`Typography.Text copyable`）；
  - 源站/缓存为 `Table`：
    - 源站列：id/domain/path/httpPort/httpsPort/backProto/backSSL/actions；
    - 缓存列：pattern/sourceId/accessProto/httpMethods/autoCompress/ttl/actions；
  - 顶部操作按钮：`Button type="primary" icon`（添加/检测）。
- 表单与交互：
  - 新增/编辑源站：`Modal + Form`（域名、路径、端口、协议选择）。
  - 新增/编辑缓存规则：`Modal + Form`（pattern、协议、方法、压缩、TTL）。

