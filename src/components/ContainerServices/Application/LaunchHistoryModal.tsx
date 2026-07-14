'use client'

import React, { useMemo, useState } from 'react'
import { Modal, Table, Tag, Select, Typography, Flex, Space, DatePicker } from 'antd'
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  type LaunchHistoryItem,
  type ZoneId,
  type ZoneLaunch,
  formatZoneLangLabel,
} from './autoLaunchMock'

dayjs.extend(utc)
dayjs.extend(timezone)

const { Text } = Typography

// 开服记录全屏弹窗：AI + 策略记录合并，按 分区 / 类型 / 时间 筛选
export default function LaunchHistoryModal({
  open,
  zones,
  onClose,
}: {
  open: boolean
  zones: ZoneLaunch[]
  onClose: () => void
}) {
  const [zoneFilter, setZoneFilter] = useState<ZoneId | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'strategy' | 'ai'>('all')
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // 汇总所有分区的开服记录
  const allHistory = useMemo<LaunchHistoryItem[]>(() => {
    const items: LaunchHistoryItem[] = []
    zones.forEach(z => z.launchHistory.forEach(it => items.push(it)))
    return items.sort((a, b) => dayjs(b.triggeredAt).valueOf() - dayjs(a.triggeredAt).valueOf())
  }, [zones])

  const filtered = useMemo(() => {
    return allHistory.filter(it => {
      if (zoneFilter !== 'all' && it.zone !== zoneFilter) return false
      if (sourceFilter !== 'all' && it.source !== sourceFilter) return false
      if (range && range[0] && range[1]) {
        const t = dayjs(it.triggeredAt)
        if (t.isBefore(range[0], 'day') || t.isAfter(range[1], 'day')) return false
      }
      return true
    })
  }, [allHistory, zoneFilter, sourceFilter, range])

  const columns = [
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (s: LaunchHistoryItem['source']) =>
        s === 'ai' ? (
          <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(114,46,209,0.12)', color: '#722ED1', margin: 0 }}>
            <RobotOutlined /> AI 开服
          </Tag>
        ) : (
          <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(22,119,255,0.12)', color: '#1677ff', margin: 0 }}>
            <ThunderboltOutlined /> 策略开服
          </Tag>
        ),
    },
    {
      title: '分区',
      dataIndex: 'zone',
      key: 'zone',
      width: 110,
      render: (z: ZoneId) => {
        const name = zones.find(x => x.zoneId === z)?.zoneName ?? z
        return <span>{z === 'global' ? '全局默认' : `${name}（${z}）`}</span>
      },
    },
    {
      title: '语种',
      dataIndex: 'lang',
      key: 'lang',
      width: 80,
      render: (l: string) => formatZoneLangLabel(l),
    },
    {
      title: '游服 ID',
      dataIndex: 'serverId',
      key: 'serverId',
      width: 90,
      render: (id: number) => <Text strong>{id}</Text>,
    },
    {
      title: '触发时间（JST）',
      dataIndex: 'triggeredAt',
      key: 'triggeredAt',
      width: 200,
      render: (t: string) => `${dayjs.utc(t).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')} (JST)`,
    },
    {
      title: '触发原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (r: string) => <Text type="secondary">{r}</Text>,
    },
  ]

  const zoneOptions = [
    { value: 'all', label: '全部分区' },
    ...zones.map(z => ({
      value: z.zoneId,
      label: z.zoneId === 'global' ? '全局默认' : `${z.zoneName}（${z.zoneId}）`,
    })),
  ]

  const sourceOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'strategy', label: '策略开服' },
    { value: 'ai', label: 'AI 开服' },
  ]

  return (
    <Modal
      title="开服记录"
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflow: 'auto' } }}
      destroyOnHidden
    >
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 160 }}
            value={zoneFilter}
            onChange={v => setZoneFilter(v as ZoneId | 'all')}
            options={zoneOptions}
          />
          <Select
            style={{ width: 140 }}
            value={sourceFilter}
            onChange={v => setSourceFilter(v as 'all' | 'strategy' | 'ai')}
            options={sourceOptions}
          />
          <DatePicker.RangePicker
            value={range as never}
            onChange={r => setRange(r as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
          />
        </Space>
        <Text type="secondary">共 {filtered.length} 条记录</Text>
      </Flex>

      <Table
        rowKey={row => `${row.source}-${row.zone}-${row.serverId}-${row.triggeredAt}`}
        size="small"
        dataSource={filtered.map(r => ({ ...r, key: `${r.source}-${r.zone}-${r.serverId}-${r.triggeredAt}` }))}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
      />
    </Modal>
  )
}
