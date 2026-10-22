/**
 * 安全扫描 —— 类型定义
 *
 * 用户侧（监控 → 安全扫描）：CP 开启后，平台在应用部署时解析镜像，列出各应用的 API（入参、作用），CP 确认作用。
 * 管理后台（平台游戏详情 → 安全扫描）：只读查看每个 API 的鉴权、暴露、风险等级与命中原因，用于封禁决策。
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 鉴权类型（一个接口可能叠加多种） */
export type AuthType =
  | 'none'
  | 'static_token'
  | 'basic'
  | 'ip_whitelist'
  | 'signature'
  | 'jwt'
  | 'session'
  | 'platform_token'
  | 'unknown'

export type Exposure = 'public' | 'internal'

/** 接口性质：决定是否命中「管理接口 / 调试接口暴露公网」规则 */
export type ApiKind = 'normal' | 'gm' | 'debug'

export type RiskLevel = 'high' | 'mid' | 'low'

export interface ApiParam {
  name: string
  type: string
  required: boolean
  /** body / query / path / header */
  location: string
  /** 字段说明（来自上传文档） */
  description?: string
}

/** 鉴权明细：管理后台详情抽屉展示 */
export interface AuthDetail {
  /** 携带方式，如 Header X-GM-Token */
  carrier: string
  /** 校验方式 */
  verify: string
  /** 值来源（静态 Token 的配置位置） */
  valueSource: string
  /** 识别依据：挂在哪个路由组的哪个中间件 */
  evidence: string
  /** 签名类鉴权是否带时间戳 / nonce */
  replayProtect: boolean
}

export interface ApiAsset {
  id: string
  /** 所属应用 */
  appName: string
  method: HttpMethod
  path: string
  params: ApiParam[]
  /** 系统推断的作用（CP 未确认时展示） */
  aiPurpose: string
  auths: AuthType[]
  authDetail: AuthDetail | null
  exposure: Exposure
  kind: ApiKind
  /** 鉴权关联的凭证 id（见 Credential） */
  credentialId: string | null
  /** 本次解析新增 */
  isNew: boolean
  /** 来源：平台扫描 / CP 手动补充 / CP 上传的 API 文档（扫描未覆盖的接口） */
  source: 'parsed' | 'manual' | 'doc'
  /** 由哪份上传文档定义或覆盖（同一接口以文档为准） */
  docFile?: string
  /** 文档里的接口标题，作为作用 */
  docPurpose?: string
  /** 文档里的详细说明 */
  docDetail?: string
  docUploadedAt?: string
}

/** 从 Swagger / OpenAPI 文档中解析出的接口 */
export interface DocApi {
  /** 归属应用：导入时按已有接口 / 路径前缀自动归属，可在预览中调整 */
  appName: string
  method: HttpMethod
  path: string
  params: ApiParam[]
  /** 一句话作用（文档标题） */
  summary: string
  /** 详细说明 */
  detail: string
  /** 文档声明的鉴权；未声明时为空，按扫描结果为准 */
  auths: AuthType[]
  /** 文档将其归为管理类接口（如 ADMIN API 分类） */
  isAdmin: boolean
}

/** CP 上传的 API 文档 */
export interface UploadedDoc {
  id: string
  fileName: string
  uploadedAt: string
  apis: DocApi[]
}

export interface ScannedApp {
  name: string
  /** 应用类型，如 GM 平台 / 游戏服 / 配表平台 */
  kind: string
  /** 当前部署镜像（含版本） */
  image: string
  /** 是否存在公网入口（Ingress host） */
  isPublic: boolean
}

/** 镜像内扫描出的凭证 */
export interface Credential {
  id: string
  name: string
  appName: string
  /** 所在文件 */
  location: string
  /** 命中平台凭证指纹（如 center-key） */
  platformHit: boolean
  /** 关联说明 */
  linkedDesc: string
  reason: string
  suggestion: string
}

/** CP 对作用的确认记录 */
export interface PurposeRecord {
  text: string
  confirmed: boolean
  confirmedAt: string
}

export type ScanStatus = 'disabled' | 'scanning' | 'ready'

/** 单个 appId 的安全扫描状态（用户侧与管理后台共享） */
export interface ScanState {
  appId: string
  status: ScanStatus
  enabledAt: string
  lastParsedAt: string
  /** key = ApiAsset.id */
  purposes: Record<string, PurposeRecord>
  /** CP 手动补充的接口 */
  manualApis: ApiAsset[]
  /** CP 上传的 API 文档，按上传顺序；后上传的覆盖先上传的 */
  uploadedDocs: UploadedDoc[]
  /** 管理后台扫描：仅在管理员点击「开启扫描」时发起 */
  adminStatus: 'never' | 'scanning' | 'done'
  adminScanStartedAt: string
  /** 最近一次扫描完成时间 */
  adminScannedAt: string
}

export type ScanStore = Record<string, ScanState>

export interface RiskHit {
  level: RiskLevel
  reason: string
}

export interface RiskResult {
  level: RiskLevel
  hits: RiskHit[]
}
