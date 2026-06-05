'use client'

import React, { useState, useMemo } from 'react'
import { Card, Space, Typography, Tag, Button, Switch, Empty, Divider } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'

import {
  INITIAL_MOCK_CHANNELS,
  METRIC_TYPES,
  DURATION_OPTIONS,
  type GrafanaAlertRule,
  type AlertChannel,
  type AlertRuleState,
  type DatasourceType,
} from './mock-data'
import CreateAlertRuleDrawer from './CreateAlertRuleDrawer'

const { Text } = Typography

const DS_TAG_MAP: Record<DatasourceType, { color: string; label: string }> = {
  prometheus: { color: 'blue', label: 'Prometheus' },
  loki: { color: 'purple', label: 'Loki' },
}

interface CustomAlertRuleProps {
  gameName?: string
}

/**
 * 自定义告警规则：Card 展示单个规则 + 分步创建表单
 */
export default function CustomAlertRule({ gameName = 'gametest' }: CustomAlertRuleProps): React.ReactElement {
  const [rule, setRule] = useState<GrafanaAlertRule | null>(null)
  const [channels, setChannels] = useState<AlertChannel[]>(INITIAL_MOCK_CHANNELS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleSubmit = (newRule: GrafanaAlertRule) => {
    setRule(newRule)
    setDrawerOpen(false)
  }

  const handleCreateChannel = (channel: AlertChannel) => {
    setChannels(prev => [...prev, channel])
  }

  const isEnabled = rule?.state !== 'disabled'

  if (!rule) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            创建告警规则
          </Button>
        </div>
        <Empty
          description="暂无告警规则"
          style={{ padding: '60px 0' }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            立即创建
          </Button>
        </Empty>

        <CreateAlertRuleDrawer
          open={drawerOpen}
          channels={channels}
          onClose={() => setDrawerOpen(false)}
          onSubmit={handleSubmit}
          onCreateChannel={handleCreateChannel}
        />
      </div>
    )
  }

  const allMetrics = [...METRIC_TYPES.prometheus, ...METRIC_TYPES.loki]
  const metricLabel = allMetrics.find(m => m.key === rule.metricScope.metricType)?.label ?? rule.metricScope.metricType
  const dsConfig = DS_TAG_MAP[rule.datasource]
  const durationLabel = DURATION_OPTIONS.find(d => d.value === rule.condition.duration)?.label ?? rule.condition.duration
  const channelNames = rule.channelIds
    .map(id => channels.find(c => c.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Text strong style={{ fontSize: 16 }}>告警规则</Text>
        <Space>
          <Switch
            checked={isEnabled}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={checked => {
              setRule({ ...rule, state: checked ? 'normal' : 'disabled' })
            }}
          />
          <Button icon={<EditOutlined />} onClick={() => setDrawerOpen(true)}>
            编辑
          </Button>
        </Space>
      </Space>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>规则名称</Text>
            <div style={{ marginTop: 4 }}>
              <Text strong style={{ fontSize: 16 }}>{rule.name}</Text>
              <Tag color={isEnabled ? 'green' : 'default'} style={{ marginLeft: 8 }}>
                {isEnabled ? '已启用' : '已禁用'}
              </Tag>
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <Space size={32} wrap>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>数据源</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={dsConfig.color}>{dsConfig.label}</Tag>
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>指标类型</Text>
              <div style={{ marginTop: 4 }}>
                <Text>{metricLabel}</Text>
              </div>
            </div>

            {rule.metricScope.keyword && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>匹配关键字</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="orange">{rule.metricScope.keyword}</Tag>
                </div>
              </div>
            )}
          </Space>

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>触发条件</Text>
            <div style={{ marginTop: 4 }}>
              {rule.datasource === 'loki' ? (
                <Text>
                  <Text strong>5</Text> 分钟内出现 <Text strong>{rule.condition.threshold}</Text> 次或以上
                </Text>
              ) : (
                <Text>
                  指标值 <Text strong>{rule.condition.operator} {rule.condition.threshold}</Text>，
                  持续 <Text strong>{durationLabel}</Text>
                </Text>
              )}
            </div>
          </div>

          {channelNames && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>告警渠道</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>{channelNames}</Text>
                </div>
              </div>
            </>
          )}

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>创建时间</Text>
            <div style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 12 }}>{rule.createdAt}</Text>
            </div>
          </div>
        </Space>
      </Card>

      <CreateAlertRuleDrawer
        open={drawerOpen}
        channels={channels}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        onCreateChannel={handleCreateChannel}
      />
    </div>
  )
}
