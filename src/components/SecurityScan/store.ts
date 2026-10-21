/**
 * 安全扫描状态的前端 mock store。
 *
 * 用户侧控制台与管理后台（window.open('/admin') 打开的独立标签页）共享状态：
 * 写 localStorage + 监听 storage 事件，做到「CP 开启扫描 / 确认作用 → 管理后台立刻看到」。
 * 写法与 Admin/credential-ban/mock.ts 保持一致。
 */

import { useSyncExternalStore } from 'react'

import { parsedApis, scannedApps } from './mock'
import type { ApiAsset, ApiKind, DocApi, PurposeRecord, ScanState, ScanStore, UploadedDoc } from './types'

const STORAGE_KEY = 'publisher-demo:security-scan:v3'
/** 模拟解析镜像耗时 */
const PARSE_DURATION_MS = 2600

const createState = (appId: string): ScanState => ({
  appId,
  status: 'disabled',
  enabledAt: '',
  lastParsedAt: '',
  purposes: {},
  manualApis: [],
  uploadedDocs: []
})

let store: ScanStore = {}
const listeners = new Set<() => void>()

const persist = (): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // 原型环境忽略写入失败
  }
}

const emit = (): void => {
  listeners.forEach(listener => listener())
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = (): ScanStore => store

const ensure = (appId: string): ScanState => {
  const s = store[appId]
  return s ? { ...createState(appId), ...s } : createState(appId)
}

const now = (): string => new Date().toISOString().slice(0, 19).replace('T', ' ')

const commit = (appId: string, next: ScanState): void => {
  store = { ...store, [appId]: next }
  persist()
  emit()
}

/**
 * 报告生成完成（CP 侧）。
 * 平台解析结果本身在部署时就已存在，管理后台不依赖 CP 开启。
 */
const finishParse = (appId: string): void => {
  const state = ensure(appId)
  if (state.status !== 'scanning') return
  commit(appId, { ...state, status: 'ready', lastParsedAt: now() })
}

/** 开启安全扫描：进入解析中，完成后展示应用 API */
export const enableScan = (appId: string): void => {
  const state = ensure(appId)
  if (state.status !== 'disabled') return
  commit(appId, { ...state, status: 'scanning', enabledAt: now() })
  setTimeout(() => finishParse(appId), PARSE_DURATION_MS)
}

/** 重新解析：已确认的作用保留，新增接口按推断值待确认 */
export const reparse = (appId: string): void => {
  const state = ensure(appId)
  if (state.status !== 'ready') return
  commit(appId, { ...state, status: 'scanning' })
  setTimeout(() => finishParse(appId), PARSE_DURATION_MS)
}

/** 关闭安全扫描：清空解析结果与确认记录（原型内用于回到引导页） */
export const disableScan = (appId: string): void => {
  commit(appId, createState(appId))
}

/** CP 修改作用：之后以 CP 填写的为准 */
export const updatePurpose = (appId: string, apiId: string, text: string): void => {
  const state = ensure(appId)
  commit(appId, {
    ...state,
    purposes: { ...state.purposes, [apiId]: { text, confirmed: true, confirmedAt: now() } }
  })
}

/** CP 补充解析遗漏的接口：作用由 CP 填写，直接视为已确认 */
export const addManualApi = (appId: string, api: ApiAsset): void => {
  const state = ensure(appId)
  commit(appId, {
    ...state,
    manualApis: [...state.manualApis, api],
    purposes: { ...state.purposes, [api.id]: { text: api.aiPurpose, confirmed: true, confirmedAt: now() } }
  })
}

/**
 * 导入 API 文档：与扫描结果取并集，相同接口（应用 + 方法 + 路径）以文档为准。
 * 文档里写了说明的接口，之前的作用确认记录作废，改用文档说明。
 */
export const importDoc = (appId: string, doc: UploadedDoc): void => {
  const state = ensure(appId)
  const next: ScanState = { ...state, uploadedDocs: [...state.uploadedDocs, doc] }
  const purposes: Record<string, PurposeRecord> = { ...state.purposes }
  allApis(next).forEach(api => {
    if (api.docFile === doc.fileName && api.docUploadedAt === doc.uploadedAt && api.docPurpose) delete purposes[api.id]
  })
  commit(appId, { ...next, purposes })
}

/** 删除文档：文档带来的接口与覆盖一并撤回，恢复为扫描结果 */
export const removeDoc = (appId: string, docId: string): void => {
  const state = ensure(appId)
  commit(appId, { ...state, uploadedDocs: state.uploadedDocs.filter(d => d.id !== docId) })
}

export const nowStamp = now

/** 只在客户端 useEffect 里调用，避免 SSR / CSR 首屏不一致 */
let hydrated = false
export const hydrateScanStore = (): void => {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      store = { ...store, ...(JSON.parse(raw) as ScanStore) }
      // 刷新时若停在「解析中」，补一个完成定时器
      Object.values(store).forEach(s => {
        if (s.status === 'scanning') setTimeout(() => finishParse(s.appId), PARSE_DURATION_MS)
      })
      emit()
    }
  } catch {
    // 忽略损坏的本地数据
  }
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      store = JSON.parse(event.newValue) as ScanStore
      emit()
    } catch {
      // 忽略损坏的本地数据
    }
  })
}

export const useScanState = (appId: string): ScanState => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const s = snapshot[appId]
  return s ? { ...createState(appId), ...s } : createState(appId)
}

/** 路径归一：{id} 与 :id 视为同一占位，去掉末尾斜杠 */
export const normPath = (path: string): string =>
  path.trim().replace(/\/+$/, '').replace(/\{[^}]+\}|:[A-Za-z_]\w*/g, '{}') || '/'

export const apiKeyOf = (appName: string, method: string, path: string): string => `${appName}|${method}|${normPath(path)}`

const inferKind = (path: string): ApiKind => {
  if (/\/(debug|pprof|actuator|swagger)(\/|$)/i.test(path)) return 'debug'
  if (/\/(gm|admin|manage)(\/|$)/i.test(path)) return 'gm'
  return 'normal'
}

const fromDoc = (doc: UploadedDoc, d: DocApi): ApiAsset => {
  const app = scannedApps.find(a => a.name === d.appName)
  return {
    id: `doc-${d.appName}-${d.method}-${normPath(d.path)}`,
    appName: d.appName,
    method: d.method,
    path: d.path,
    params: d.params,
    aiPurpose: d.summary,
    auths: d.auths.length > 0 ? d.auths : ['unknown'],
    authDetail: null,
    exposure: app?.isPublic ? 'public' : 'internal',
    kind: d.isAdmin ? 'gm' : inferKind(d.path),
    credentialId: null,
    isNew: false,
    source: 'doc',
    docFile: doc.fileName,
    docPurpose: d.summary || undefined,
    docDetail: d.detail || undefined,
    docUploadedAt: doc.uploadedAt
  }
}

export type AssignHow = 'matched' | 'prefix' | 'default'

/**
 * 一份文档包含多个应用的接口时，逐条判断归属：
 * 1. 方法 + 路径与某应用已有接口相同 → 归到该应用
 * 2. 否则按路径前缀：与哪个应用的已有接口共同前缀段最多 → 归到该应用
 * 3. 都匹配不上 → 默认第一个应用，预览中提示用户确认
 */
export const assignApp = (d: DocApi, existing: ApiAsset[]): { appName: string; how: AssignHow } => {
  const key = `${d.method}|${normPath(d.path)}`
  const hit = existing.find(a => `${a.method}|${normPath(a.path)}` === key)
  if (hit) return { appName: hit.appName, how: 'matched' }
  const segs = normPath(d.path).split('/').filter(Boolean)
  let best = { appName: '', score: 0 }
  existing.forEach(a => {
    const other = normPath(a.path).split('/').filter(Boolean)
    let n = 0
    while (n < segs.length && n < other.length && segs[n] === other[n]) n++
    if (n > best.score) best = { appName: a.appName, score: n }
  })
  if (best.score > 0) return { appName: best.appName, how: 'prefix' }
  return { appName: scannedApps[0]?.name ?? '', how: 'default' }
}

/**
 * 当前 appId 的全部接口 = 平台扫描 ∪ 上传文档 ∪ CP 手动补充。
 * 相同接口以文档为准：入参、说明取文档；鉴权、暴露等安全信息仍取扫描结果（文档无法反映实际实现）。
 */
export const allApis = (state: ScanState): ApiAsset[] => {
  const map = new Map<string, ApiAsset>()
  parsedApis.forEach(a => map.set(apiKeyOf(a.appName, a.method, a.path), a))
  state.uploadedDocs.forEach(doc => {
    doc.apis.forEach(d => {
      const key = apiKeyOf(d.appName, d.method, d.path)
      const exist = map.get(key)
      if (exist && exist.source !== 'doc') {
        map.set(key, {
          ...exist,
          path: d.path,
          params: d.params,
          docFile: doc.fileName,
          docPurpose: d.summary || exist.docPurpose,
          docDetail: d.detail || exist.docDetail,
          docUploadedAt: doc.uploadedAt
        })
      } else {
        map.set(key, fromDoc(doc, d))
      }
    })
  })
  state.manualApis.forEach(a => {
    const key = apiKeyOf(a.appName, a.method, a.path)
    if (!map.has(key)) map.set(key, a)
  })
  return Array.from(map.values())
}

/** 当前生效的作用：CP 修改 > 文档说明 > 系统推断（confirmed 表示由 CP 提供，非推断） */
export const purposeOf = (state: ScanState, api: ApiAsset): PurposeRecord => {
  const rec = state.purposes[api.id]
  if (rec) return rec
  if (api.docPurpose) return { text: api.docPurpose, confirmed: true, confirmedAt: api.docUploadedAt ?? '' }
  return { text: api.aiPurpose, confirmed: false, confirmedAt: '' }
}
