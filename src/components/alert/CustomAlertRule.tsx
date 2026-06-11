'use client'

import React, { useState, useMemo } from 'react'
import { Card, Space, Typography, Tag, Button, Switch, Empty, Divider } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'

import {
  INITIAL_MOCK_CHANNELS,
  METRIC_TYPES,
  DURATION_OPTIONS,
  LOKI_CONDITION_OPERATOR_OPTIONS,
  LOKI_VISUAL_AGGREGATION_OPTIONS,
  normalizeKeywordList,
  normalizeLokiConditions,
  type GrafanaAlertRule,
  type AlertChannel,
  type AlertRuleState,
  type DatasourceType,
  type LokiFilterCondition,
} from './mock-data'
import CreateAlertRuleDrawer from './CreateAlertRuleDrawer'

const { Text } = Typography

const DS_TAG_MAP: Record<DatasourceType, { color: string; label: string }> = {
  prometheus: { color: 'blue', label: 'Prometheus' },
  loki: { color: 'purple', label: 'Loki' },
}

function renderKeywordTags(keywords: string[], color: string): React.ReactElement | null {
  const normalized = normalizeKeywordList(keywords)
  if (normalized.length === 0) return null

  return (
    <Space wrap>
      {normalized.map(keyword => (
        <Tag key={keyword} color={color}>{keyword}</Tag>
      ))}
    </Space>
  )
}

function getConditionName(index: number): string {
  const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return `条件${chineseNumbers[index] ?? index + 1}`
}

function getConditionOperatorLabel(value: LokiFilterCondition['operator']): string {
  return LOKI_CONDITION_OPERATOR_OPTIONS.find(option => option.value === value)?.label ?? value
}

function getConditionTagColor(operator: LokiFilterCondition['operator']): string {
  return operator === 'not_contains' || operator === 'regex_not_contains' ? 'red' : 'green'
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
  const queryMode = rule.metricScope.queryMode ?? 'visual'
  const aggregateKeywords = normalizeKeywordList(
    rule.metricScope.aggregateKeywords?.length
      ? rule.metricScope.aggregateKeywords
      : rule.metricScope.keyword
        ? [rule.metricScope.keyword]
        : [],
  )
  const legacyRequiredConditions = normalizeKeywordList(rule.metricScope.requiredKeywords ?? []).map((value, index) => ({
    id: `legacy-required-${index}`,
    operator: 'contains' as const,
    value,
  }))
  const legacyExcludedConditions = normalizeKeywordList(rule.metricScope.excludedKeywords ?? []).map((value, index) => ({
    id: `legacy-excluded-${index}`,
    operator: 'not_contains' as const,
    value,
  }))
  const lokiConditions = normalizeLokiConditions(
    rule.metricScope.lokiConditions?.length
      ? rule.metricScope.lokiConditions
      : [...legacyRequiredConditions, ...legacyExcludedConditions],
  )
  const aggregationMode = rule.metricScope.aggregationMode ?? 'sum_by'
  const lokiRange = rule.metricScope.range ?? `${rule.condition.timeRangeMinutes ?? 5}m`
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

            {rule.datasource === 'loki' && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>配置方式</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color={queryMode === 'raw' ? 'geekblue' : 'green'}>
                    {queryMode === 'raw' ? '直接输入 LogQL' : '可视化条件'}
                  </Tag>
                </div>
              </div>
            )}

            {rule.datasource === 'loki' && queryMode === 'visual' && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>统计方式</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">
                    {LOKI_VISUAL_AGGREGATION_OPTIONS.find(option => option.value === aggregationMode)?.label}
                  </Tag>
                </div>
              </div>
            )}

            {rule.datasource === 'loki' && queryMode === 'visual' && aggregateKeywords.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>统计关键词</Text>
                <div style={{ marginTop: 4 }}>
                  {renderKeywordTags(aggregateKeywords, 'orange')}
                </div>
              </div>
            )}

            {rule.datasource === 'loki' && queryMode === 'visual' && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>大小写</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color={rule.metricScope.ignoreCase === false ? 'default' : 'blue'}>
                    {rule.metricScope.ignoreCase === false ? '区分大小写' : '不区分大小写'}
                  </Tag>
                </div>
              </div>
            )}
          </Space>

          {rule.datasource === 'loki' && queryMode === 'visual' && lokiConditions.length > 0 && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>匹配条件</Text>
                <div style={{ marginTop: 4 }}>
                  <Space wrap>
                    {lokiConditions.map((condition, index) => (
                      <Tag key={condition.id} color={getConditionTagColor(condition.operator)}>
                        {getConditionName(index)}：{getConditionOperatorLabel(condition.operator)} {condition.value}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            </>
          )}

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>触发条件</Text>
            <div style={{ marginTop: 4 }}>
              {rule.datasource === 'loki' ? (
                <Text>
                  {queryMode === 'visual' ? (
                    <>
                      <Text strong>{lokiRange}</Text> 内出现 <Text strong>{rule.condition.threshold}</Text> 次或以上
                    </>
                  ) : (
                    <>
                      LogQL 查询结果达到 <Text strong>{rule.condition.threshold}</Text> 或以上
                    </>
                  )}
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
