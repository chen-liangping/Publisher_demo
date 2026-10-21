/**
 * 风险判定规则（静态分析，不向服务发送任何请求）。
 * 一个接口可命中多条规则：全部列出原因，等级取最高。
 */

import type { ApiAsset, AuthType, Credential, RiskHit, RiskLevel, RiskResult } from './types'

const LEVEL_ORDER: Record<RiskLevel, number> = { high: 3, mid: 2, low: 1 }

/** 鉴权强度：多种叠加时取最强的一种参与判定 */
const AUTH_STRENGTH: Record<AuthType, number> = {
  none: 0,
  unknown: 1,
  static_token: 2,
  basic: 2,
  ip_whitelist: 2,
  signature: 3,
  jwt: 3,
  session: 3,
  platform_token: 3
}

const UID_PARAMS = ['uid', 'player_id', 'user_id', 'role_id']

export const strongestAuth = (auths: AuthType[]): AuthType =>
  auths.reduce<AuthType>((best, a) => (AUTH_STRENGTH[a] > AUTH_STRENGTH[best] ? a : best), auths[0] ?? 'none')

export const evaluateRisk = (api: ApiAsset, creds: Credential[]): RiskResult => {
  const hits: RiskHit[] = []
  const isPublic = api.exposure === 'public'
  const auths = api.auths.length > 0 ? api.auths : (['none'] as AuthType[])
  const best = strongestAuth(auths)
  const cred = api.credentialId ? creds.find(c => c.id === api.credentialId) ?? null : null

  if (isPublic && best === 'none') hits.push({ level: 'high', reason: '公网 + 无鉴权' })
  if (isPublic && api.kind === 'debug') hits.push({ level: 'high', reason: '调试接口暴露公网' })
  if (isPublic && api.kind === 'gm') hits.push({ level: 'high', reason: '管理接口暴露公网' })
  if (isPublic && cred?.platformHit) hits.push({ level: 'high', reason: `鉴权凭证命中平台指纹（${cred.name}）` })

  if (isPublic && (best === 'static_token' || best === 'basic')) {
    hits.push({ level: 'mid', reason: best === 'basic' ? '公网 + 弱鉴权（Basic Auth）' : '公网 + 弱鉴权（静态 Token）' })
  }
  if (isPublic && auths.length === 1 && auths[0] === 'ip_whitelist') hits.push({ level: 'mid', reason: '公网 + 仅 IP 白名单' })
  if (auths.includes('signature') && api.authDetail && !api.authDetail.replayProtect) {
    hits.push({ level: 'mid', reason: '签名无时间戳 / nonce，可重放' })
  }
  if (best === 'unknown') hits.push({ level: 'mid', reason: '鉴权未识别' })
  if (cred && !cred.platformHit) hits.push({ level: 'mid', reason: `凭证硬编码（${cred.name}）` })
  if (api.method !== 'GET' && api.params.some(param => UID_PARAMS.includes(param.name))) {
    hits.push({ level: 'mid', reason: '写操作且入参含 uid，可能越权' })
  }

  const level = hits.reduce<RiskLevel>((acc, h) => (LEVEL_ORDER[h.level] > LEVEL_ORDER[acc] ? h.level : acc), 'low')
  return { level, hits }
}

/** 处置建议：给管理后台详情抽屉用 */
export const suggestAction = (api: ApiAsset, risk: RiskResult): string => {
  if (api.kind === 'gm' && api.exposure === 'public') {
    return '仅供运营后台使用，玩家无需访问。建议该应用整体封禁公网，只放行办公网 / VPN。'
  }
  if (api.kind === 'debug') return '调试接口不应对外，建议直接封禁该路径。'
  if (risk.level === 'low') return '风险较低，保持放行。'
  if (api.exposure === 'public') return '玩家侧接口不可直接封禁，建议补强鉴权或加限流后放行。'
  return '内网接口，建议整改凭证管理方式。'
}
