/**
 * appId 封禁 / 解封 / 密钥轮转 —— 类型定义
 * 对应需求文档：agent-SKILL/PRD/20260916-appid封禁与密钥轮转-prd.md
 */

/** appId 状态：正常 / 已封禁 / 轮转后的旧资源只读 */
export type CredentialStatus = 'ACTIVE' | 'BANNED' | 'RESTRICTED'

/**
 * 左右对比的一行：左列是平台基线（预期），右列是扫描到的实际配置。
 * meta    分组标题，跨两列
 * same    两侧一致
 * changed 同一项两侧取值不同
 * added   基线没有、实际多出来的
 * removed 基线要求、实际缺失的
 */
export type DiffRowType = 'meta' | 'same' | 'changed' | 'added' | 'removed'

export interface DiffRow {
  type: DiffRowType
  /** 预期（平台基线） */
  left: string
  /** 实际（当前配置） */
  right: string
}

/** 一项扫描差异（PRD 三、封禁前资源扫描） */
export interface ScanFinding {
  id: string
  /** 扫描项名称，如「桶策略 / PAB」 */
  category: string
  /** 资源标识：Bucket 名称 / RAM 用户名 / namespace */
  target: string
  /** 一句话差异摘要 */
  summary: string
  /** 该项是否可绕过封禁——决定是否计入顶部提示的 N */
  bypassable: boolean
  /** 扫描失败时为 true：不计入 N，也不阻断封禁 */
  failed: boolean
  /** 扫描失败原因，failed 为 true 时展示 */
  failReason: string
  diff: DiffRow[]
}

/** 封禁信息：解封或轮转后清空 */
export interface BanInfo {
  bannedAt: string
  operator: string
  /** 封禁当时的扫描快照，此后不随资源变化更新 */
  scan: ScanFinding[]
}

export interface CredentialState {
  appId: string
  status: CredentialStatus
  banInfo: BanInfo | null
  /** 轮转时间点：此前创建的资源转为只读，此后新建的不受限 */
  rotatedAt: string
  /** 最近一次封禁时的扫描快照，解封与轮转都不清除 */
  lastScan: ScanFinding[]
}

/** 全部 appId 的状态表 */
export type CredentialStore = Record<string, CredentialState>

export const statusLabel: Record<CredentialStatus, string> = {
  ACTIVE: '正常',
  BANNED: '已封禁',
  RESTRICTED: '旧资源只读'
}

/** Tag 配色：按值分色，无描边、全圆角（见 .cursor/skills/UI规范） */
export const statusTagStyle: Record<CredentialStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: 'rgba(82, 196, 26, 0.12)', color: '#389e0d' },
  BANNED: { bg: 'rgba(255, 77, 79, 0.14)', color: '#cf1322' },
  RESTRICTED: { bg: 'rgba(250, 173, 20, 0.16)', color: '#d48806' }
}

/**
 * 原型内的 appId 清单：管理后台「平台游戏」与用户侧控制台顶部切换器共用同一份。
 * 与 GameManagement.tsx 的 mockGameData 保持一致。
 */
export const DEMO_APP_IDS: string[] = ['gamedemo', 'testgame', 'rpgworld']
