'use client'

import React, { useMemo, useState } from 'react'
import { Card, Space, Table, Tag, Typography, Input, DatePicker } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'
import { BUSINESS_DEFAULT_PAGINATION } from '../Common/GlobalPagination'

const { RangePicker } = DatePicker
const { Text } = Typography

interface HistoryRecord {
  id: string
  type: string // 告警类型（告警项）
  content: string // 消息内容
  channels: string[] // 通知渠道：自建群机器人名称、小包
  people: string[] // 相关人员名称
  time: string // 时间（ISO 或可读字符串）
}

// 为所有消息类型各生成一条模拟记录
const allMessageTypes: string[] = [
  // 客户端
  '客户端创建新版本', '客户端版本切换', '翻译文本同步CDN失败',
  'S3 zip解压成功', 'S3 zip解压失败', 'flashlaunch静态资源计算阻塞', 'oss配置文件变更',
  // 服务端
  '自动开服成功', '自动开服失败', '通知CP新预备服失败', '预备服部署失败', '自动开服执行计划获取失败', '自动开服策略变更',
  '服务端部署失败', '服务端部署成功',
  '灰度回滚', '灰度回滚完成', '追加灰度', '灰度追加完成', '灰度全量部署',
  'pod健康检查失败', 'Pod故障', 'Pod更新异常',
  // CDN
  'CDN部署成功', 'CDN部署失败'
]

const buildMock = (): HistoryRecord[] => {
  const baseTime = new Date('2025-08-20T10:00:00').getTime()
  return allMessageTypes.map((t, idx) => {
    const fail = t.includes('失败')
    const success = t.includes('成功')
    const channels: string[] = fail ? ['kumo_webhook', '小包'] : ['kumo_webhook']
    const people = fail ? ['徐音', 'slime'] : (success ? ['slime'] : [])
    const time = new Date(baseTime + idx * 7 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const content = success
      ? `${t}：操作已完成，系统运行正常`
      : fail
        ? `${t}：请查看日志与错误码，及时处理`
        : `${t}：已触发事件，系统已记录`
    return {
      id: String(idx + 1),
      type: t,
      content,
      channels,
      people,
      time
    }
  })
}

const mockData: HistoryRecord[] = buildMock()

export default function AlertHistory(): React.ReactElement {
  const [keyword, setKeyword] = useState<string>('')
  const [range, setRange] = useState<[string | null, string | null]>([null, null])

  const columns: ColumnsType<HistoryRecord> = useMemo(() => ([
    { title: '告警类型', dataIndex: 'type', key: 'type', width: 160 },
    { title: '消息内容', dataIndex: 'content', key: 'content', render: (v: string) => (
      <Text ellipsis style={{ maxWidth: 520, display: 'inline-block' }}>{v}</Text>
    ) },
    { title: '通知渠道', dataIndex: 'channels', key: 'channels', width: 240, render: (_: unknown, r) => (
      <Space size={6} wrap>
        {r.channels.map(ch => (
          <Tag key={ch} color={ch === '小包' ? 'gold' : 'processing'}>{ch}</Tag>
        ))}
      </Space>
    ) },
    { title: '@负责人', key: 'owners', width: 200, render: (_: unknown, r) => (
      r.people.length ? (
        <Space size={6} wrap>
          {r.people.map(p => <Tag key={p}>{p}</Tag>)}
        </Space>
      ) : <Tag>无</Tag>
    ) },
    { title: '时间', dataIndex: 'time', key: 'time', width: 200, sorter: (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime() }
  ]), [])

  const dataSource = useMemo(() => {
    const [start, end] = range
    return mockData.filter(r => {
      const inKeyword = keyword ? (r.type.includes(keyword) || r.content.includes(keyword)) : true
      const ts = new Date(r.time).getTime()
      const inRange = start && end ? (ts >= new Date(start).getTime() && ts <= new Date(end).getTime()) : true
      return inKeyword && inRange
    })
  }, [keyword, range])


  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>告警事件</span>} styles={{ body: { paddingTop: 8 } }}>
        <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
          <Input
            allowClear
            placeholder="搜索告警类型或消息内容"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <RangePicker
            showTime
            onChange={(vals) => setRange([
              vals?.[0]?.format('YYYY-MM-DD HH:mm:ss') ?? null,
              vals?.[1]?.format('YYYY-MM-DD HH:mm:ss') ?? null
            ])}
          />
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          pagination={BUSINESS_DEFAULT_PAGINATION}
        />
      </Card>
    </Space>
  )
}

