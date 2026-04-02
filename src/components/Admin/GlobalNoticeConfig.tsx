'use client'

import React, { useMemo, useState } from 'react'
import { Card, Checkbox, Input, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

type Topic = 'HPA' | '静态资源与CDN' | '运行时健康'
type ChannelKey = 'publisher-project' | 'GameMonitoring'

interface NoticeRuleRow {
  id: string
  topic: Topic
  typeName: string
  channelEnabled: Record<ChannelKey, boolean>
}

const CHANNEL_OPTIONS: { key: ChannelKey; label: string }[] = [
  { key: 'publisher-project', label: 'Publisher项目群' },
  { key: 'GameMonitoring', label: 'GameMonitoring群' }
]

const CHANNEL_DESCRIPTION: Record<ChannelKey, string> = {
  'publisher-project': '用于发布游戏业务通知，覆盖主要协作成员。',
  'GameMonitoring': '用于监控告警同步，便于运维与值班同学跟进。'
}

const createInitialRules = (): NoticeRuleRow[] => [
  {
    id: 'r1',
    topic: 'HPA',
    typeName: '开启HPA ',
    channelEnabled: { 'publisher-group': true, 'monitor-group': true }
  },
  {
    id: 'r2',
    topic: 'HPA',
    typeName: '关闭HPA ',
    channelEnabled: { 'publisher-group': true, 'monitor-group': true }
  },
  {
    id: 'r3',
    topic: '静态资源与CDN',
    typeName: '翻译文本同步 CDN 失败',
    channelEnabled: { 'publisher-group': true, 'monitor-group': true }
  }
]

export default function GlobalNoticeConfig(): React.ReactElement {
  const [rules, setRules] = useState<NoticeRuleRow[]>(() => createInitialRules())
  const [keyword, setKeyword] = useState<string>('')

  const filteredRules = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (!normalizedKeyword) return rules
    return rules.filter(
      (row) =>
        row.topic.toLowerCase().includes(normalizedKeyword) ||
        row.typeName.toLowerCase().includes(normalizedKeyword) ||
        row.id.toLowerCase().includes(normalizedKeyword)
    )
  }, [keyword, rules])

  const toggleChannel = (rowId: string, channelKey: ChannelKey): void => {
    // 交互逻辑：切换每条通知规则的接收群，实时写入页面状态，产生真实配置效果。
    setRules((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        return {
          ...row,
          channelEnabled: {
            ...row.channelEnabled,
            [channelKey]: !row.channelEnabled[channelKey]
          }
        }
      })
    )
  }


  const channelCards = useMemo(
    () =>
      CHANNEL_OPTIONS.map((channel) => (
        <div
          key={channel.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 14px',
            borderRadius: 12,
            background: '#fff',
            border: '1px solid rgba(148, 163, 184, 0.22)'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>{channel.label}</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>{CHANNEL_DESCRIPTION[channel.key]}</div>
          </div>
        </div>
      )),
    []
  )

  const columns: ColumnsType<NoticeRuleRow> = useMemo(
    () => [
      { title: '通知主题', dataIndex: 'topic', key: 'topic', width: 180 },
      { title: '通知类型', dataIndex: 'typeName', key: 'typeName', width: 300 },
      {
        title: '接收渠道',
        key: 'channels',
        width: 320,
        render: (_: unknown, record: NoticeRuleRow) => (
          <Space direction="vertical" size={8} style={{ display: 'flex' }}>
            {CHANNEL_OPTIONS.map((channel) => (
              <Checkbox
                key={channel.key}
                checked={record.channelEnabled[channel.key]}
                onChange={() => toggleChannel(record.id, channel.key)}
              >
                <Text style={{ fontSize: 13 }}>{channel.label}</Text>
              </Checkbox>
            ))}
          </Space>
        )
      }
    ],
    []
  )

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          全局通知配置
        </Title>
      </div>

      <Card
        title={<span style={{ fontWeight: 700 }}>通知渠道配置</span>}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>
          {channelCards}
        </Space>
      </Card>

      <div style={{ height: 14 }} />

      <Card
        title={<span style={{ fontWeight: 700 }}>消息通知</span>}
        styles={{ body: { paddingTop: 12 } }}
        extra={
          <Input
            allowClear
            value={keyword}
            onChange={(event) => {
              // 交互逻辑：搜索用于快速定位通知项，不会改变配置数据。
              setKeyword(event.target.value)
            }}
            placeholder="搜索通知主题 / 通知类型 / ID"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            style={{ width: 320, borderRadius: 10 }}
          />
        }
      >
        <Table<NoticeRuleRow>
          rowKey="id"
          columns={columns}
          dataSource={filteredRules}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}
