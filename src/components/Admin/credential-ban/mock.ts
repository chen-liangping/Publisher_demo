/**
 * appId 状态的前端 mock store。
 *
 * 管理后台是 window.open('/admin') 打开的独立标签页，与用户侧控制台不共享 JS 运行时，
 * 所以写 localStorage 并监听 storage 事件，做到「在 admin 封禁 → 切到用户侧立刻生效」，刷新也不丢。
 */

import { useSyncExternalStore } from 'react'

import type { CredentialState, CredentialStore, ScanFinding } from './types'

const OPERATOR = 'zhangsan'
// 带版本号：扫描快照的数据结构变更后，旧 key 的数据直接作废，避免渲染成空白对比表
const STORAGE_KEY = 'publisher-demo:credential-store:v4'

const createState = (appId: string): CredentialState => ({
  appId,
  status: 'ACTIVE',
  banInfo: null,
  rotatedAt: '',
  lastScan: []
})

let store: CredentialStore = {}
const listeners = new Set<() => void>()

const persist = (): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // 原型环境忽略写入失败（隐私模式 / 存储被禁用）
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

const getSnapshot = (): CredentialStore => store

const ensure = (appId: string): CredentialState => {
  const existing = store[appId]
  if (existing) return existing
  const created = createState(appId)
  store = { ...store, [appId]: created }
  return created
}

const now = (): string => new Date().toISOString().slice(0, 19).replace('T', ' ')

const commit = (appId: string, next: CredentialState): void => {
  store = { ...store, [appId]: next }
  persist()
  emit()
}

/**
 * 封禁：翻状态位，不删除任何资源与配置。
 * scan 是封禁流程第二步的扫描结果，存为快照随封禁记录保留，此后不再更新。
 */
export const banApp = (params: { appId: string; scan: ScanFinding[] }): void => {
  const state = ensure(params.appId)
  if (state.status === 'BANNED') return // 幂等：重复提交不产生第二条记录
  commit(params.appId, {
    ...state,
    status: 'BANNED',
    banInfo: {
      bannedAt: now(),
      operator: OPERATOR,
      scan: params.scan
    },
    lastScan: params.scan
  })
}

/** 解封：完全恢复，原 AK/SK 重新生效，不遗留只读限制 */
export const unbanApp = (params: { appId: string }): void => {
  const state = ensure(params.appId)
  if (state.status !== 'BANNED') return
  commit(params.appId, {
    ...state,
    status: 'ACTIVE',
    banInfo: null,
    rotatedAt: ''
  })
}

/**
 * 轮转：封禁的另一条恢复路径。
 * 原 AK/SK 立即永久失效、换发新的，恢复编辑权限，但轮转前已创建的资源转为只读。
 * 返回新密钥明文，仅用于弹窗一次性展示，不落库。
 */
export const rotateKeys = (appId: string): { ak: string; sk: string } => {
  const state = ensure(appId)
  const stamp = now()
  commit(appId, {
    ...state,
    status: 'RESTRICTED',
    banInfo: null,
    rotatedAt: stamp
  })
  return {
    ak: `LTAI${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
    sk: `${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`
  }
}

/**
 * 从 localStorage 恢复状态，并订阅其他标签页的变更。
 * 只在客户端 useEffect 里调用：模块初始化时读取会造成 SSR / CSR 首屏不一致。
 */
let hydrated = false
export const hydrateFromStorage = (): void => {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      store = { ...store, ...(JSON.parse(raw) as CredentialStore) }
      emit()
    }
  } catch {
    // 忽略损坏的本地数据
  }
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      store = JSON.parse(event.newValue) as CredentialStore
      emit()
    } catch {
      // 忽略损坏的本地数据
    }
  })
}

/** 为列表里的 appId 预填充初始状态 */
export const seedApps = (appIds: string[]): void => {
  let changed = false
  appIds.forEach(appId => {
    if (!store[appId]) {
      store = { ...store, [appId]: createState(appId) }
      changed = true
    }
  })
  if (changed) {
    persist()
    emit()
  }
}

/** 供列表页读取全量状态 */
export const useCredentialStore = (): CredentialStore =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** 供详情页读取单个 appId 状态；未初始化时返回一份默认的正常态 */
export const useCredential = (appId: string): CredentialState => {
  const snapshot = useCredentialStore()
  return snapshot[appId] ?? createState(appId)
}
