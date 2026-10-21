/**
 * 安全扫描 mock 数据：模拟「部署时解析镜像」得到的应用、API 与凭证。
 * 原型内所有 appId 共用同一份解析结果。
 */

import type { ApiAsset, ApiParam, Credential, ScannedApp } from './types'

const p = (name: string, type: string, required = true, location = 'body'): ApiParam => ({
  name,
  type,
  required,
  location
})

/**
 * 平台在部署时自动解析的时间（与 CP 是否开启无关，管理后台始终可见）。
 */
export const PLATFORM_PARSED_AT = '2026-10-20 14:30:00'

export const scannedApps: ScannedApp[] = [
  { name: 'admin-data', kind: 'GM 平台', image: 'admin-data:v2.3.0', isPublic: true },
  { name: 'kumo游服', kind: '游戏服', image: 'game-server:v0.8.1', isPublic: true },
  { name: 'cfgplt', kind: '配表平台', image: 'cfgplt:v1.0.8', isPublic: false }
]

const GM_TOKEN_DETAIL = {
  carrier: 'Header X-GM-Token',
  verify: '与配置值做等值比较',
  valueSource: 'config/gm.yaml#gm.token',
  evidence: '路由组 /gm 挂载中间件 GMAuth()',
  replayProtect: false
}

export const parsedApis: ApiAsset[] = [
  {
    id: 'gm-item-send',
    appName: 'admin-data',
    method: 'POST',
    path: '/gm/api/item/send',
    params: [p('player_id', 'string'), p('item_id', 'int'), p('count', 'int')],
    aiPurpose: '给指定玩家发放道具，可指定任意道具 ID 和数量',
    auths: ['static_token'],
    authDetail: GM_TOKEN_DETAIL,
    exposure: 'public',
    kind: 'gm',
    credentialId: 'gm-token',
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'gm-mail-send',
    appName: 'admin-data',
    method: 'POST',
    path: '/gm/api/mail/send',
    params: [p('target', 'string'), p('title', 'string'), p('content', 'string'), p('attachments', 'array', false)],
    aiPurpose: '发送全服 / 个人邮件（可带附件）',
    auths: ['static_token'],
    authDetail: GM_TOKEN_DETAIL,
    exposure: 'public',
    kind: 'gm',
    credentialId: 'gm-token',
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'gm-player-ban',
    appName: 'admin-data',
    method: 'POST',
    path: '/gm/api/player/ban',
    params: [p('player_id', 'string'), p('reason', 'string'), p('days', 'int')],
    aiPurpose: '封禁玩家账号',
    auths: ['static_token', 'ip_whitelist'],
    authDetail: { ...GM_TOKEN_DETAIL, evidence: '路由组 /gm 挂载 GMAuth()，并额外挂载 IPAllow(officeCIDR)' },
    exposure: 'public',
    kind: 'gm',
    credentialId: 'gm-token',
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'gm-player-info',
    appName: 'admin-data',
    method: 'GET',
    path: '/gm/api/player/info',
    params: [p('player_id', 'string', true, 'query')],
    aiPurpose: '查询玩家详细信息',
    auths: ['none'],
    authDetail: null,
    exposure: 'public',
    kind: 'gm',
    credentialId: null,
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'api-login',
    appName: 'kumo游服',
    method: 'POST',
    path: '/api/login',
    params: [p('token', 'string'), p('device_id', 'string')],
    aiPurpose: '玩家登录',
    auths: ['platform_token'],
    authDetail: {
      carrier: 'Body token',
      verify: '调用平台 token 校验接口',
      valueSource: '—',
      evidence: '中间件 PlatformAuth() 调用平台校验接口',
      replayProtect: true
    },
    exposure: 'public',
    kind: 'normal',
    credentialId: null,
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'api-user-rename',
    appName: 'kumo游服',
    method: 'PUT',
    path: '/api/user/rename',
    params: [p('uid', 'string'), p('name', 'string')],
    aiPurpose: '修改玩家昵称',
    auths: ['jwt'],
    authDetail: {
      carrier: 'Header Authorization: Bearer',
      verify: 'JWT 本地验签',
      valueSource: '—',
      evidence: '路由组 /api 挂载 JWTAuth()',
      replayProtect: true
    },
    exposure: 'public',
    kind: 'normal',
    credentialId: null,
    isNew: true,
    source: 'parsed'
  },
  {
    id: 'api-bag-list',
    appName: 'kumo游服',
    method: 'GET',
    path: '/api/bag/list',
    params: [p('uid', 'string', true, 'query')],
    aiPurpose: '查询背包物品',
    auths: ['jwt'],
    authDetail: {
      carrier: 'Header Authorization: Bearer',
      verify: 'JWT 本地验签',
      valueSource: '—',
      evidence: '路由组 /api 挂载 JWTAuth()',
      replayProtect: true
    },
    exposure: 'public',
    kind: 'normal',
    credentialId: null,
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'api-activity-claim',
    appName: 'kumo游服',
    method: 'POST',
    path: '/api/activity/claim',
    params: [p('activity_id', 'int'), p('uid', 'string')],
    aiPurpose: '领取活动奖励',
    auths: ['unknown'],
    authDetail: {
      carrier: '—',
      verify: '—',
      valueSource: '—',
      evidence: '挂载自定义中间件 checkReq()，未匹配到已知鉴权特征',
      replayProtect: false
    },
    exposure: 'public',
    kind: 'normal',
    credentialId: null,
    isNew: true,
    source: 'parsed'
  },
  {
    id: 'api-pay-notify',
    appName: 'kumo游服',
    method: 'POST',
    path: '/api/pay/notify',
    params: [p('order_id', 'string'), p('amount', 'int'), p('sign', 'string')],
    aiPurpose: '接收支付平台到账通知并发货',
    auths: ['signature', 'ip_whitelist'],
    authDetail: {
      carrier: 'Body sign',
      verify: 'HMAC-SHA256 校验 sign，未校验时间戳 / nonce',
      valueSource: 'env PAY_SECRET',
      evidence: '路由挂载 PaySign() 与 IPAllow(payCIDR)',
      replayProtect: false
    },
    exposure: 'public',
    kind: 'normal',
    credentialId: null,
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'debug-pprof',
    appName: 'kumo游服',
    method: 'GET',
    path: '/debug/pprof/*',
    params: [],
    aiPurpose: 'Go 性能调试接口',
    auths: ['none'],
    authDetail: null,
    exposure: 'public',
    kind: 'debug',
    credentialId: null,
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'cfg-upload',
    appName: 'cfgplt',
    method: 'POST',
    path: '/cfg/upload',
    params: [p('file', 'file'), p('version', 'string')],
    aiPurpose: '上传配置表',
    auths: ['static_token'],
    authDetail: GM_TOKEN_DETAIL,
    exposure: 'internal',
    kind: 'normal',
    credentialId: 'gm-token',
    isNew: false,
    source: 'parsed'
  },
  {
    id: 'cfg-latest',
    appName: 'cfgplt',
    method: 'GET',
    path: '/cfg/latest',
    params: [p('version', 'string', false, 'query')],
    aiPurpose: '拉取最新配置表',
    auths: ['none'],
    authDetail: null,
    exposure: 'internal',
    kind: 'normal',
    credentialId: null,
    isNew: false,
    source: 'parsed'
  }
]

export const credentials: Credential[] = [
  {
    id: 'center-key',
    name: 'center-key',
    appName: 'admin-data',
    location: 'config.yaml',
    platformHit: true,
    linkedDesc: '调用平台 center 时使用',
    reason: '命中平台凭证指纹（center），与 kumo游服 共用同一把 key',
    suggestion: '无法通过封网解决，需要轮换并按游戏 / 用途拆分'
  },
  {
    id: 'gm-token',
    name: 'gm-token',
    appName: 'admin-data',
    location: 'config/gm.yaml',
    platformHit: false,
    linkedDesc: 'admin-data /gm/api/*（3）· cfgplt /cfg/upload',
    reason: '静态 Token 的值硬编码在镜像配置文件中，跨应用共用',
    suggestion: '迁移到 Secret 注入，并定期轮换'
  }
]

/** 首次进入（未开启）时展示的示例数据：只取少量接口做预览 */
export const demoPreviewApis: ApiAsset[] = parsedApis.filter(a =>
  ['gm-item-send', 'api-login', 'api-pay-notify'].includes(a.id)
)
