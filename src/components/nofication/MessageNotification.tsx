'use client'

import React, { useMemo, useState } from 'react'
import { Button, DatePicker, Drawer, Input, Select, Space, Table, Tag, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TabsProps } from 'antd'
import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { BUSINESS_DEFAULT_PAGINATION } from '../Common/GlobalPagination'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

type NoticeType = '异常告警' | '系统公告' | 'AI Bot'

interface SiteNotice {
  id: string
  title: string
  type: NoticeType
  content: string
  time: string // YYYY-MM-DD HH:mm:ss
  read: boolean
}

type StatusFilter = 'unread' | 'all' | 'read'
type TabKey = 'all' | 'alert' | 'announcement' | 'ai'

function createMockNotices(): SiteNotice[] {
  return [
    {
      id: 'n-1001',
      title: '定时任务模块优化',
      type: '系统公告',
      content: '支持了创建 cronjob 单次任务、多行的场景请进行展示，文本示例是这样的，最多展示 2 行，如果超出的请就需要…',
      time: '2026-03-20 18:43:00',
      read: false
    },
    {
      id: 'n-1002',
      title: '定时任务模块优化',
      type: '系统公告',
      content: '支持了创建 cronjob 单次任务、多行的场景请进行展示，文本示例是这样的，最多展示 2 行，如果超出的请就需要…',
      time: '2026-03-20 18:43:00',
      read: false
    },
    {
      id: 'n-1003',
      title: '定时任务模块优化',
      type: '系统公告',
      content: '支持了创建 cronjob 单次任务、多行的场景请进行展示，文本示例是这样的，最多展示 2 行，如果超出的请就需要…',
      time: '2026-03-20 18:43:00',
      read: true
    },
    {
      id: 'n-2001',
      title: '翻译文本同步 CDN 失败',
      type: '异常告警',
      content: '请查看日志与错误码，及时处理。',
      time: '2026-03-20 14:16:08',
      read: false
    },
    {
      id: 'n-2002',
      title: '翻译文本同步 CDN 失败',
      type: '异常告警',
      content: '请查看日志与错误码，及时处理。',
      time: '2026-03-20 14:16:08',
      read: true
    },
    {
      id: 'n-3001',
      title: 'AI Bot：发布进度提醒',
      type: 'AI Bot',
      content: '检测到你有 2 个发布任务接近截止时间，建议优先处理资源校验与灰度配置。',
      time: '2026-03-19 11:05:22',
      read: false
    }
  ]
}

function badge(count: number): React.ReactElement | null {
  if (count <= 0) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        paddingInline: 6,
        fontSize: 12,
        lineHeight: '18px',
        background: '#ff4d4f',
        color: '#fff',
        borderRadius: 999
      }}
    >
      {count}
    </span>
  )
}

function pickTypeTag(type: NoticeType): { color: string; label: string } {
  if (type === '异常告警') return { color: 'red', label: '异常告警' }
  if (type === 'AI Bot') return { color: 'purple', label: 'AI Bot' }
  return { color: 'blue', label: '系统公告' }
}

export default function MessageNotification(props: {
  initialActiveTab?: TabKey
  onClose?: () => void
  containerPadding?: number
}): React.ReactElement {
  const [tabKey, setTabKey] = useState<TabKey>(props.initialActiveTab ?? 'all')
  const [status, setStatus] = useState<StatusFilter>('unread')
  const [keyword, setKeyword] = useState<string>('')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [notices, setNotices] = useState<SiteNotice[]>(() => createMockNotices())
  const [detailId, setDetailId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const byType = (t: NoticeType): number => notices.filter((x) => x.type === t && !x.read).length
    const unreadAll = notices.filter((x) => !x.read).length
    return {
      allUnread: unreadAll,
      alertUnread: byType('异常告警'),
      announcementUnread: byType('系统公告'),
      aiUnread: byType('AI Bot')
    }
  }, [notices])

  const filtered = useMemo(() => {
    const matchTab = (n: SiteNotice): boolean => {
      if (tabKey === 'all') return true
      if (tabKey === 'alert') return n.type === '异常告警'
      if (tabKey === 'announcement') return n.type === '系统公告'
      return n.type === 'AI Bot'
    }

    const matchStatus = (n: SiteNotice): boolean => {
      if (status === 'all') return true
      if (status === 'unread') return !n.read
      return n.read
    }

    const kw = keyword.trim().toLowerCase()
    const [start, end] = range

    return notices.filter((n) => {
      if (!matchTab(n)) return false
      if (!matchStatus(n)) return false
      if (kw) {
        const hay = `${n.id} ${n.title} ${n.content} ${n.type}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      if (start && end) {
        const t = dayjs(n.time)
        if (t.isBefore(start) || t.isAfter(end)) return false
      }
      return true
    })
  }, [keyword, notices, range, status, tabKey])

  const unreadVisibleCount = useMemo(() => filtered.filter((x) => !x.read).length, [filtered])

  const columns: ColumnsType<SiteNotice> = useMemo(
    () => [
      {
        title: '名称',
        dataIndex: 'title',
        key: 'title',
        width: 220,
        render: (value: string, record: SiteNotice) => (
          <Button
            type="link"
            style={{ padding: 0, fontWeight: record.read ? 400 : 600 }}
            onClick={() => {
              // 交互逻辑：点击“名称”进入详情（同时将该条标记为已读），符合“标题字段进入详情页”的规范。
              setDetailId(record.id)
              setNotices((prev) => prev.map((x) => (x.id === record.id ? { ...x, read: true } : x)))
            }}
          >
            {value}
          </Button>
        )
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (type: NoticeType) => {
          const t = pickTypeTag(type)
          return (
            <Tag bordered={false} color={t.color} style={{ borderRadius: 999, paddingInline: 10, opacity: 0.9 }}>
              {t.label}
            </Tag>
          )
        }
      },
      {
        title: '消息内容',
        dataIndex: 'content',
        key: 'content',
        ellipsis: true
      },
      {
        title: '时间',
        dataIndex: 'time',
        key: 'time',
        width: 180
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        align: 'right',
        render: (_: unknown, record: SiteNotice) => (
          <Button
            type="link"
            disabled={record.read}
            style={{ padding: 0 }}
            onClick={() => {
              // 交互逻辑：将单条消息标记为已读（真实业务效果：状态变化 + 列表更新）。
              setNotices((prev) => prev.map((x) => (x.id === record.id ? { ...x, read: true } : x)))
            }}
          >
            标记已读
          </Button>
        )
      }
    ],
    []
  )

  const tabItems: TabsProps['items'] = useMemo(
    () => [
      { key: 'all', label: <Space size={8}>全部消息 {badge(counts.allUnread)}</Space> },
      { key: 'alert', label: <Space size={8}>异常告警 {badge(counts.alertUnread)}</Space> },
      { key: 'announcement', label: <Space size={8}>系统公告 {badge(counts.announcementUnread)}</Space> },
      { key: 'ai', label: <Space size={8}>AI Bot {badge(counts.aiUnread)}</Space> }
    ],
    [counts]
  )

  const detailNotice = useMemo(() => notices.find((x) => x.id === detailId) ?? null, [detailId, notices])

  return (
    <div style={{ padding: props.containerPadding ?? 24, background: '#fff', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Title level={3} style={{ margin: 0 }}>
          站内通知
        </Title>
        {props.onClose && (
          <Button
            type="text"
            icon={<CloseOutlined />}
            aria-label="关闭站内通知"
            onClick={() => {
              // 交互逻辑：关闭弹层/抽屉，返回到原页面。
              props.onClose?.()
            }}
            style={{ width: 36, height: 36, borderRadius: 999 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Select<StatusFilter>
          value={status}
          style={{ width: 160 }}
          onChange={(v) => {
            // 交互逻辑：按“未读/已读/全部”切换过滤条件，默认落在“未读消息”与设计保持一致。
            setStatus(v)
          }}
          options={[
            { value: 'unread', label: '未读消息' },
            { value: 'read', label: '已读消息' },
            { value: 'all', label: '全部消息' }
          ]}
        />

        <Input.Search
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={(v) => {
            // 交互逻辑：点击搜索按钮/回车触发查询（原型中即为更新关键字状态并实时过滤）。
            setKeyword(v)
          }}
          placeholder="搜索关键词"
          allowClear
          enterButton={<SearchOutlined />}
          style={{ width: 260 }}
        />

        <RangePicker
          showTime
          value={range}
          allowClear
          placeholder={['开始时间', '结束时间']}
          onChange={(vals) => {
            // 交互逻辑：按时间范围过滤列表，便于快速定位某一时段内的通知。
            setRange([vals?.[0] ?? null, vals?.[1] ?? null])
          }}
        />
      </div>

      <div style={{ border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.02)' }}>
          <Tabs
            activeKey={tabKey}
            items={tabItems}
            onChange={(k) => {
              // 交互逻辑：切换消息分类（全部/告警/公告/AI Bot），同时保持筛选条件不变。
              setTabKey(k as TabKey)
            }}
            tabBarExtraContent={{
              right: (
                <Button
                  onClick={() => {
                    // 交互逻辑：“全部已读”仅对当前筛选可见的未读消息生效（真实业务效果：批量更新状态）。
                    const visibleUnreadIds = new Set(filtered.filter((x) => !x.read).map((x) => x.id))
                    setNotices((prev) => prev.map((x) => (visibleUnreadIds.has(x.id) ? { ...x, read: true } : x)))
                  }}
                  disabled={unreadVisibleCount === 0}
                  style={{ borderRadius: 999 }}
                >
                  全部已读
                </Button>
              )
            }}
          />
        </div>

        <Table<SiteNotice>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={BUSINESS_DEFAULT_PAGINATION}
          size="middle"
          rowClassName={(record) => (record.read ? 'pp-notice-read-row' : '')}
        />
      </div>

      <Drawer
        title="通知详情"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        width={520}
        destroyOnClose
      >
        {detailNotice ? (
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{detailNotice.title}</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Tag
                  bordered={false}
                  color={pickTypeTag(detailNotice.type).color}
                  style={{ borderRadius: 999, paddingInline: 10, opacity: 0.9 }}
                >
                  {detailNotice.type}
                </Tag>
                <Text type="secondary">{detailNotice.time}</Text>
                <Text type="secondary">ID: {detailNotice.id}</Text>
              </div>
            </div>
            <div style={{ color: '#111827' }}>{detailNotice.content}</div>
          </div>
        ) : (
          <Text type="secondary">未找到该通知</Text>
        )}
      </Drawer>

      <style>{`
        /* 视觉细节：已读行略微降低对比度，但不使用 link 视觉误导 */
        .pp-notice-read-row td {
          color: rgba(17, 24, 39, 0.55);
        }
      `}</style>
    </div>
  )
}
