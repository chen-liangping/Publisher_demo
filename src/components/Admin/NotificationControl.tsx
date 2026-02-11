'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, Space, Typography, Tag, Alert, Button, Input, Table, Checkbox, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BellOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  buildNoticeTreeMaps,
  buildNoticeTreeRoots,
  type NoticeTreeNode,
} from '../nofication/noticeCatalog'

const { Title, Text } = Typography

/**
 * 管理员对“每个消息类型”进行开关控制（用户侧只读联动）。
 * - 开启：用户侧该消息类型允许配置（可勾选接收渠道/联系人）
 * - 关闭：用户侧该消息类型禁用且显示为关闭
 *
 * 说明：原型项目使用 localStorage 作为跨页面共享状态源。
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
  /**
   * 默认策略（按你的需求）：
   * - 告警类：默认允许用户配置（true）
   * - 通知类：默认不允许用户配置（false），用户侧呈现“禁用且关闭”
   */
  const base: NoticeEnabledMap = {}
  const alertLeaves = collectLeafKeysUnderRoot(maps, 'alert-root')
  const notificationLeaves = collectLeafKeysUnderRoot(maps, 'notification-root')

  alertLeaves.forEach(k => { base[k] = true })
  notificationLeaves.forEach(k => { base[k] = false })
  return base
}

function readNoticeEnabledMap(maps: ReturnType<typeof buildNoticeTreeMaps>): NoticeEnabledMap {
  if (typeof window === 'undefined') return makeDefaultNoticeEnabledMap(maps)
  const parsed = safeParseMap(window.localStorage.getItem(ADMIN_NOTICE_ENABLED_MAP_KEY))
  const base = makeDefaultNoticeEnabledMap(maps)
  if (!parsed) return base
  // 只接受 leafKeys 范围内的值，避免脏数据影响
  maps.leafKeys.forEach(k => {
    if (typeof parsed[k] === 'boolean') base[k] = parsed[k]
  })
  return base
}

function writeNoticeEnabledMap(next: NoticeEnabledMap): void {
  window.localStorage.setItem(ADMIN_NOTICE_ENABLED_MAP_KEY, JSON.stringify(next))
  // 交互逻辑：同标签页内同步
  window.dispatchEvent(new CustomEvent(ADMIN_NOTICE_EVENT))
}

export default function NotificationControl(): React.ReactElement {
  const roots = useMemo(() => buildNoticeTreeRoots(), [])
  const maps = useMemo(() => buildNoticeTreeMaps(roots), [roots])
  const [noticeEnabledMap, setNoticeEnabledMap] = useState<NoticeEnabledMap>(() => makeDefaultNoticeEnabledMap(maps))
  const [keyword, setKeyword] = useState<string>('')

  useEffect(() => {
    // 交互逻辑：进入页面时从 localStorage 恢复管理员配置，保证刷新后状态一致。
    setNoticeEnabledMap(readNoticeEnabledMap(maps))

    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_NOTICE_ENABLED_MAP_KEY) {
        setNoticeEnabledMap(readNoticeEnabledMap(maps))
      }
    }
    const onCustom = () => {
      setNoticeEnabledMap(readNoticeEnabledMap(maps))
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(ADMIN_NOTICE_EVENT, onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(ADMIN_NOTICE_EVENT, onCustom as EventListener)
    }
  }, [maps.leafKeys])

  type TriState = boolean | 'indeterminate'
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
  const getNodeTri = (key: string): TriState => {
    // 仅依据“叶子节点”状态计算三态
    const keys = [key, ...getDescendants(key)].filter(k => maps.leafKeys.includes(k))
    if (keys.length === 0) return false
    let hasTrue = false
    let hasFalse = false
    keys.forEach(k => {
      const v = noticeEnabledMap[k] ?? true
      if (v) hasTrue = true
      else hasFalse = true
    })
    if (hasTrue && hasFalse) return 'indeterminate'
    return hasTrue
  }
  const setCascade = (key: string, checked: boolean): void => {
    // 交互逻辑：点击父级节点时，对其所有后代叶子节点做级联开关
    const keys = [key, ...getDescendants(key)].filter(k => maps.leafKeys.includes(k))
    setNoticeEnabledMap(prev => {
      const next = { ...prev }
      keys.forEach(k => { next[k] = checked })
      writeNoticeEnabledMap(next)
      return next
    })
  }
  const setLeaf = (key: string, checked: boolean): void => {
    setNoticeEnabledMap(prev => {
      const next = { ...prev, [key]: checked }
      writeNoticeEnabledMap(next)
      return next
    })
  }

  const renderTriCheckbox = (tri: TriState, onChange: (checked: boolean) => void): React.ReactElement => (
    <Checkbox
      indeterminate={tri === 'indeterminate'}
      checked={tri === true}
      onChange={(e) => onChange(e.target.checked)}
    />
  )

  const filterTree = (nodes: NoticeTreeNode[], term: string): NoticeTreeNode[] => {
    const t = term.trim().toLowerCase()
    if (!t) return nodes
    const match = (n: NoticeTreeNode) => n.name.toLowerCase().includes(t) || n.key.toLowerCase().includes(t)
    const walk = (list: NoticeTreeNode[]): NoticeTreeNode[] => {
      const out: NoticeTreeNode[] = []
      list.forEach(n => {
        const kids = n.children ? walk(n.children) : []
        if (match(n) || kids.length > 0) out.push({ ...n, children: kids.length ? kids : undefined })
      })
      return out
    }
    return walk(nodes)
  }

  const dataSource = useMemo(() => filterTree(roots, keyword), [roots, keyword])

  const columns: ColumnsType<NoticeTreeNode> = useMemo(() => ([
    {
      title: '消息类型',
      dataIndex: 'name',
      key: 'name',
      width: 360,
      fixed: 'left',
      render: (_: unknown, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ paddingLeft: r.level === 1 ? 0 : r.level === 2 ? 16 : 24 }}>
            <Text strong={r.level !== 3}>{r.name}</Text>
          </div>
          {r.level === 1 && (
            <Tag
              color={r.key === 'alert-root' ? 'volcano' : 'blue'}
              bordered={false}
              style={{ borderRadius: 999, paddingInline: 10 }}
            >
              {r.key === 'alert-root' ? '告警' : '通知'}
            </Tag>
          )}
        </div>
      )
    },
    {
      title: (
        <Space>
          <span>全局配置</span>
          <Tooltip title="关闭后，用户侧该项的开关会被禁用（只读）。">
            <Text type="secondary">说明</Text>
          </Tooltip>
        </Space>
      ),
      key: 'enabled',
      width: 160,
      align: 'center',
      render: (_: unknown, r) => {
        const tri = getNodeTri(r.key)
        const isLeaf = maps.leafKeys.includes(r.key)
        return (
          <Space direction="vertical" size={4} style={{ alignItems: 'center' }}>
            {renderTriCheckbox(tri, (checked) => {
              if (isLeaf) {
                // 交互逻辑：叶子节点单独开关
                setLeaf(r.key, checked)
              } else {
                // 交互逻辑：父级节点级联开关（indeterminate 视为“开启”）
                setCascade(r.key, checked)
              }
            })}
          </Space>
        )
      }
    }
  ]), [noticeEnabledMap, maps.leafKeys])

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title={
          <Space>
            <BellOutlined />
            <span style={{ fontSize: 18 }}>消息类型开关</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              // 交互逻辑：手动刷新一次读取，便于演示跨标签页/跨页面同步效果。
              setNoticeEnabledMap(readNoticeEnabledMap(maps))
            }}
          >
            刷新状态
          </Button>
        }
        styles={{ body: { paddingTop: 12 } }}
      >
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>

          <Card
            title={
              <Space>
                <span style={{ fontSize: 16 }}>全局通知配置</span>
                <Tag color="purple" bordered={false} style={{ borderRadius: 999, paddingInline: 10 }}>
                  可单独控制
                </Tag>
              </Space>
            }
            style={{ border: 'none' }}
            styles={{ body: { paddingTop: 8, paddingInline: 0 } }}
          >
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input
                  placeholder="搜索消息类型 / key"
                  value={keyword}
                  onChange={(e) => {
                    // 交互逻辑：搜索仅影响展示过滤，不修改任何开关状态
                    setKeyword(e.target.value)
                  }}
                  style={{ width: 260 }}
                  suffix={<SearchOutlined />}
                />
              </Space>
            </div>

            <Table<NoticeTreeNode>
              rowKey="key"
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              scroll={{ x: 560, y: 520 }}
              expandable={{ defaultExpandedRowKeys: ['alert-root', 'notification-root'] }}
            />
          </Card>
        </Space>
      </Card>
    </Space>
  )
}

