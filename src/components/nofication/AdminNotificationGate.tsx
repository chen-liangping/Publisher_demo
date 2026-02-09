'use client'

import React, { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { buildNoticeTreeMaps, buildNoticeTreeRoots } from './noticeCatalog'

/**
 * 用户侧“管理员统一开关”门禁组件：
 * - 管理员关闭时：对其子内容做交互禁用遮罩（不改子组件内部实现）
 * - 管理员开启时：正常可编辑
 *
 * 注意：按需求 `alert.tsx` 内容保持不变，所以这里采用“外层遮罩 + pointer-events”实现禁用。
 */
const ADMIN_NOTICE_ENABLED_MAP_KEY = 'pp:admin_notice_enabled_map'
const ADMIN_NOTICE_EVENT = 'pp:admin_notice_switch'

type NoticeEnabledMap = Record<string, boolean>

function safeParseMap(raw: string | null): NoticeEnabledMap | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== 'object') return null
    return v as NoticeEnabledMap
  } catch {
    return null
  }
}

function collectLeafKeysUnderRoot(maps: ReturnType<typeof buildNoticeTreeMaps>, rootKey: string): string[] {
  const out: string[] = []
  const dfs = (k: string) => {
    const kids = maps.childrenByKey[k] ?? []
    kids.forEach(child => {
      if (maps.leafKeys.includes(child)) out.push(child)
      dfs(child)
    })
  }
  dfs(rootKey)
  return out
}

function makeDefaultNoticeEnabledMap(maps: ReturnType<typeof buildNoticeTreeMaps>): NoticeEnabledMap {
  // 默认策略与管理台一致：通知类默认禁用（false），告警类默认允许（true）
  const base: NoticeEnabledMap = {}
  collectLeafKeysUnderRoot(maps, 'alert-root').forEach(k => { base[k] = true })
  collectLeafKeysUnderRoot(maps, 'notification-root').forEach(k => { base[k] = false })
  return base
}

export default function AdminNotificationGate(props: {
  children: React.ReactNode
}): React.ReactElement {
  const [noticeEnabledMap, setNoticeEnabledMap] = useState<NoticeEnabledMap>({})
  const roots = buildNoticeTreeRoots()
  const maps = buildNoticeTreeMaps(roots)

  useEffect(() => {
    // 交互逻辑：进入页面时读取管理员“按消息类型”开关；并监听跨标签页/同标签页的变更事件，实现即时生效。
    setNoticeEnabledMap(
      safeParseMap(window.localStorage.getItem(ADMIN_NOTICE_ENABLED_MAP_KEY)) ?? makeDefaultNoticeEnabledMap(maps)
    )

    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_NOTICE_ENABLED_MAP_KEY) {
        setNoticeEnabledMap(
          safeParseMap(window.localStorage.getItem(ADMIN_NOTICE_ENABLED_MAP_KEY)) ?? makeDefaultNoticeEnabledMap(maps)
        )
      }
    }
    const onCustom = () => {
      setNoticeEnabledMap(
        safeParseMap(window.localStorage.getItem(ADMIN_NOTICE_ENABLED_MAP_KEY)) ?? makeDefaultNoticeEnabledMap(maps)
      )
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(ADMIN_NOTICE_EVENT, onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(ADMIN_NOTICE_EVENT, onCustom as EventListener)
    }
  }, [])

  const getDescendants = (key: string): string[] => {
    const out: string[] = []
    const dfs = (k: string) => {
      const kids = maps.childrenByKey[k] ?? []
      kids.forEach(c => {
        out.push(c)
        dfs(c)
      })
    }
    dfs(key)
    return out
  }

  // 计算“哪些行需要禁用交互”：包含
  // - 被管理员关闭的叶子项
  // - 以及包含任何“关闭叶子项”的父节点（避免用户通过父级一键级联修改到被锁子项）
  const disabledRowKeySet = (() => {
    const disabledLeaves = new Set<string>()
    maps.leafKeys.forEach(k => {
      const v = noticeEnabledMap[k]
      if (v === false) disabledLeaves.add(k)
    })
    const disabledRows = new Set<string>(disabledLeaves)
    Object.keys(maps.childrenByKey).forEach(parentKey => {
      const desc = getDescendants(parentKey).filter(k => maps.leafKeys.includes(k))
      if (desc.some(k => disabledLeaves.has(k))) disabledRows.add(parentKey)
    })
    return disabledRows
  })()

  return (
    <div>
      {disabledRowKeySet.size > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Alert
            type="info"
            showIcon
            message="部分通知项由管理员锁定"
            description="被锁定的行（以及其父级行）在用户侧将不可操作；其余项仍可自定义。"
          />
        </div>
      )}

      <div
        onClickCapture={(e) => {
          // 交互逻辑：被锁定行需要“既不可交互，也不可被默认行为改变显示”
          const target = e.target as HTMLElement | null
          const row = target?.closest?.('tr[data-row-key]') as HTMLElement | null
          const rowKey = row?.getAttribute?.('data-row-key') ?? null
          if (rowKey && disabledRowKeySet.has(rowKey)) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        onPointerDownCapture={(e) => {
          // 交互逻辑：按行锁定时，仅拦截落在“被锁行”里的交互
          const target = e.target as HTMLElement | null
          const row = target?.closest?.('tr[data-row-key]') as HTMLElement | null
          const rowKey = row?.getAttribute?.('data-row-key') ?? null
          if (rowKey && disabledRowKeySet.has(rowKey)) {
            e.stopPropagation()
            // 这里不阻止默认行为，避免影响滚动；真正阻断切换由 click/change capture 负责。
          }
        }}
        onChangeCapture={(e) => {
          // 交互逻辑：兜底拦截 change（部分控件的状态变更不一定来自 click，例如键盘 Space）
          const target = e.target as HTMLElement | null
          const row = target?.closest?.('tr[data-row-key]') as HTMLElement | null
          const rowKey = row?.getAttribute?.('data-row-key') ?? null
          if (rowKey && disabledRowKeySet.has(rowKey)) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        onKeyDownCapture={(e) => {
          // 交互逻辑：被锁定行禁用键盘触发（Space/Enter 等）
          const target = e.target as HTMLElement | null
          const row = target?.closest?.('tr[data-row-key]') as HTMLElement | null
          const rowKey = row?.getAttribute?.('data-row-key') ?? null
          if (rowKey && disabledRowKeySet.has(rowKey)) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        {props.children}
      </div>

      {/* 仅在锁定态注入“禁用交互”样式：不影响滚动，仅阻止点击/切换类操作 */}
      {disabledRowKeySet.size > 0 && (
        <style>{`
          ${Array.from(disabledRowKeySet)
            .map((k) => `
            /* 最稳妥的禁用：整行所有元素不可交互（避免 checkbox label/span/input 命中差异导致漏禁用） */
            .ant-table-tbody > tr[data-row-key="${k}"] * {
              pointer-events: none !important;
            }

            /* 禁用样式：整行置灰 + 轻背景 + 禁用态光标 + 去掉 hover 高亮 */
            .ant-table-tbody > tr[data-row-key="${k}"] {
              cursor: not-allowed;
            }
            .ant-table-tbody > tr[data-row-key="${k}"] > td {
              background: rgba(0, 0, 0, 0.02) !important;
              color: rgba(0, 0, 0, 0.35) !important;
            }
            .ant-table-tbody > tr[data-row-key="${k}"] > td * {
              color: rgba(0, 0, 0, 0.35) !important;
              border-color: rgba(0, 0, 0, 0.15) !important;
            }
            .ant-table-tbody > tr[data-row-key="${k}"]:hover > td {
              background: rgba(0, 0, 0, 0.02) !important;
            }

            .ant-table-tbody > tr[data-row-key="${k}"] .ant-btn,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-switch,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-checkbox-wrapper,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-radio-wrapper,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-select,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-select-selector {
              pointer-events: none !important;
              opacity: 0.55;
            }

            /* 被管理员锁定的行：视觉上也显示为“关闭” */
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-checkbox-checked .ant-checkbox-inner,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-checkbox-indeterminate .ant-checkbox-inner {
              background-color: #fff !important;
              border-color: #d9d9d9 !important;
            }
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-checkbox-checked .ant-checkbox-inner:after,
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-checkbox-indeterminate .ant-checkbox-inner:after {
              opacity: 0 !important;
              transform: rotate(45deg) scale(0) !important;
            }

            .ant-table-tbody > tr[data-row-key="${k}"] .ant-switch-checked {
              background: rgba(0, 0, 0, 0.25) !important;
            }
            .ant-table-tbody > tr[data-row-key="${k}"] .ant-switch-checked .ant-switch-handle {
              inset-inline-start: 2px !important;
            }
          `)
            .join('\n')}
        `}</style>
      )}
    </div>
  )
}

