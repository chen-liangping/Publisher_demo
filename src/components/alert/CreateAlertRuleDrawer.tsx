'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Drawer, Steps, Form, Input, Radio, Select, InputNumber, Space, Typography, Tag, Button, Divider, Switch } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  METRIC_TYPES,
  DATASOURCE_OPTIONS,
  OPERATOR_OPTIONS,
  DURATION_OPTIONS,
  CHANNEL_TYPE_OPTIONS,
  LOKI_CONDITION_OPERATOR_OPTIONS,
  LOKI_VISUAL_AGGREGATION_OPTIONS,
  translateToQuery,
  generateRuleName,
  createDefaultFormValue,
  createDefaultLokiCondition,
  normalizeKeywordList,
  normalizeLokiConditions,
  parseListInput,
  type DatasourceType,
  type AlertRuleFormValue,
  type GrafanaAlertRule,
  type MetricTypeOption,
  type AlertChannel,
  type LokiFilterCondition,
} from './mock-data'

const { Text } = Typography

interface CreateAlertRuleDrawerProps {
  open: boolean
  channels: AlertChannel[]
  onClose: () => void
  onSubmit: (rule: GrafanaAlertRule) => void
  onCreateChannel: (channel: AlertChannel) => void
}

function getMetricTypeOptions(datasource: DatasourceType): { label: string; value: string }[] {
  return METRIC_TYPES[datasource].map(m => ({ label: m.label, value: m.key }))
}

function findMetricOption(datasource: DatasourceType, key: string): MetricTypeOption | undefined {
  return METRIC_TYPES[datasource].find(m => m.key === key)
}

function renderTags(values: string[], color: string): React.ReactElement {
  return (
    <Space wrap>
      {values.map(value => (
        <Tag key={value} color={color}>{value}</Tag>
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
  return operator === 'not_contains' || operator === 'regex_not_contains' || operator === 'any_not_contains'
    ? 'red'
    : 'green'
}

/**
 * 分步引导式表单 Drawer：创建自定义告警规则
 * Step 1 - 选择数据源、指标类型
 * Step 2 - 设置告警条件 + 选择告警渠道
 * Step 3 - 确认预览
 */
export default function CreateAlertRuleDrawer({
  open,
  channels,
  onClose,
  onSubmit,
  onCreateChannel,
}: CreateAlertRuleDrawerProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState<AlertRuleFormValue>(createDefaultFormValue())
  const [aggregateKeywordInput, setAggregateKeywordInput] = useState('')

  // 新建渠道表单状态
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'dingtalk' | 'feishu'>('dingtalk')
  const [newChannelWebhook, setNewChannelWebhook] = useState('')

  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setShowNewChannel(false)
      setNewChannelName('')
      setNewChannelWebhook('')
      setAggregateKeywordInput('')
      setForm(createDefaultFormValue())
    }
  }, [open])

  const metricTypeOptions = useMemo(() => getMetricTypeOptions(form.datasource), [form.datasource])
  const currentMetricOption = useMemo(() => findMetricOption(form.datasource, form.metricType), [form.datasource, form.metricType])
  const validLokiConditions = useMemo(() => normalizeLokiConditions(form.lokiConditions), [form.lokiConditions])
  const aggregateKeywords = useMemo(() => normalizeKeywordList(form.aggregateKeywords), [form.aggregateKeywords])
  const isKeywordAggregation = form.aggregationMode === 'sum_by'
  const isRawLogQL = form.queryMode === 'raw'

  const queryPreview = useMemo(() => {
    return translateToQuery(
      form.datasource,
      form.metricType,
      form.datasource === 'loki'
        ? {
            queryMode: form.queryMode,
            rawLogQL: form.rawLogQL,
            selectorMatchers: form.selectorMatchers,
            aggregateKeywords: form.queryMode === 'visual' ? aggregateKeywords : [],
            lokiConditions: form.queryMode === 'visual' ? form.lokiConditions : [],
            parserStages: [],
            aggregationMode: form.aggregationMode,
            aggregationLabels: form.aggregationMode === 'sum_by' ? ['keyword'] : [],
            range: form.timeRangeExpression,
            zeroFill: 'none',
            requiredKeywords: [],
            excludedKeywords: [],
            ignoreCase: form.ignoreCase,
          }
        : undefined,
      undefined,
    )
  }, [
    form.datasource,
    form.metricType,
    form.queryMode,
    form.rawLogQL,
    form.selectorMatchers,
    aggregateKeywords,
    form.lokiConditions,
    form.aggregationMode,
    form.timeRangeExpression,
    form.ignoreCase,
  ])

  const handleDatasourceChange = (value: DatasourceType) => {
    const firstMetric = METRIC_TYPES[value][0]
    setAggregateKeywordInput('')
    setForm(prev => ({
      ...prev,
      datasource: value,
      metricType: firstMetric.key,
      threshold: firstMetric.defaultThreshold,
      keyword: '',
      aggregateKeywords: [],
      lokiConditions: [createDefaultLokiCondition()],
      aggregationMode: 'sum',
      aggregationLabels: [],
      timeRangeExpression: '5m',
      queryMode: 'visual',
      rawLogQL: '',
      zeroFill: 'none',
      ignoreCase: true,
    }))
  }

  const handleMetricTypeChange = (value: string) => {
    const option = findMetricOption(form.datasource, value)
    setForm(prev => ({
      ...prev,
      metricType: value,
      threshold: option?.defaultThreshold ?? prev.threshold,
    }))
  }

  const handleQueryModeChange = (value: AlertRuleFormValue['queryMode']) => {
    setForm(prev => ({ ...prev, queryMode: value }))
  }

  const handleAggregationChange = (value: AlertRuleFormValue['aggregationMode']) => {
    const nextLabels = value === 'sum_by' ? ['keyword'] : []
    setForm(prev => ({
      ...prev,
      aggregationMode: value,
      aggregationLabels: nextLabels,
    }))
  }

  const handleAggregateKeywordInputChange = (value: string) => {
    setAggregateKeywordInput(value)
    setForm(prev => ({ ...prev, aggregateKeywords: parseListInput(value) }))
  }

  const handleLokiConditionChange = (id: string, patch: Partial<LokiFilterCondition>) => {
    setForm(prev => ({
      ...prev,
      lokiConditions: prev.lokiConditions.map(condition => (
        condition.id === id ? { ...condition, ...patch } : condition
      )),
    }))
  }

  const handleAddLokiCondition = () => {
    setForm(prev => ({
      ...prev,
      lokiConditions: [
        ...prev.lokiConditions,
        {
          ...createDefaultLokiCondition(prev.lokiConditions.length),
          id: `condition-${Date.now()}`,
        },
      ],
    }))
  }

  const handleRemoveLokiCondition = (id: string) => {
    setForm(prev => ({
      ...prev,
      lokiConditions: prev.lokiConditions.length > 1
        ? prev.lokiConditions.filter(condition => condition.id !== id)
        : prev.lokiConditions,
    }))
  }

  const handleNext = () => {
    if (currentStep === 1 && !form.name) {
      const autoName = generateRuleName(
        form.metricType,
        form.operator,
        form.threshold,
        form.datasource === 'loki' && form.queryMode === 'visual' ? aggregateKeywords : undefined,
      )
      setForm(prev => ({ ...prev, name: autoName }))
    }
    setCurrentStep(prev => Math.min(prev + 1, 2))
  }

  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  // 渠道选择变化
  const handleChannelChange = (selectedIds: string[]) => {
    setForm(prev => ({ ...prev, channelIds: selectedIds }))
  }

  // 新建渠道
  const handleConfirmNewChannel = useCallback(() => {
    if (!newChannelName.trim()) return
    if (newChannelType !== 'dingtalk' && newChannelType !== 'feishu') return
    if (!newChannelWebhook.trim()) return

    const id = `ch-${Date.now()}`
    const channel: AlertChannel = {
      id,
      name: newChannelName.trim(),
      type: newChannelType,
      webhookUrl: newChannelWebhook.trim(),
    }
    onCreateChannel(channel)
    setForm(prev => ({ ...prev, channelIds: [...prev.channelIds, id] }))
    setShowNewChannel(false)
    setNewChannelName('')
    setNewChannelWebhook('')
  }, [newChannelName, newChannelType, newChannelWebhook, onCreateChannel])

  // Step 校验
  const isStep1Valid = form.metricType !== ''
  const isStep1FullyValid = form.datasource === 'loki' && form.metricType === 'keyword_match'
    ? isStep1Valid && (
        isRawLogQL
          ? form.rawLogQL.trim() !== ''
          : isKeywordAggregation ? aggregateKeywords.length > 0 : validLokiConditions.length > 0
      )
    : isStep1Valid
  const isStep2Valid = form.threshold !== undefined && form.threshold !== null && form.channelIds.length > 0 &&
    (form.datasource === 'prometheus' ? form.duration !== '' : true) &&
    (form.datasource === 'loki' && form.queryMode === 'visual' ? form.timeRangeExpression.trim() !== '' : true)

  const handleSubmit = () => {
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const rule: GrafanaAlertRule = {
      id: `rule-${Date.now()}`,
      name: form.name || generateRuleName(
        form.metricType,
        form.operator,
        form.threshold,
        form.datasource === 'loki' && form.queryMode === 'visual' ? aggregateKeywords : undefined,
      ),
      datasource: form.datasource,
      state: 'normal',
      metricScope: {
        metricType: form.metricType,
        keyword: form.datasource === 'loki' && form.queryMode === 'visual' ? aggregateKeywords.join('、') : undefined,
        aggregateKeywords: form.datasource === 'loki' && form.queryMode === 'visual' ? aggregateKeywords : undefined,
        lokiConditions: form.datasource === 'loki' && form.queryMode === 'visual' ? validLokiConditions : undefined,
        aggregationMode: form.datasource === 'loki' && form.queryMode === 'visual' ? form.aggregationMode : undefined,
        aggregationLabels: form.datasource === 'loki' && form.queryMode === 'visual'
          ? form.aggregationMode === 'sum_by' ? ['keyword'] : []
          : undefined,
        range: form.datasource === 'loki' && form.queryMode === 'visual' ? form.timeRangeExpression.trim() : undefined,
        queryMode: form.datasource === 'loki' ? form.queryMode : undefined,
        rawLogQL: form.datasource === 'loki' && form.queryMode === 'raw' ? form.rawLogQL.trim() : undefined,
        ignoreCase: form.datasource === 'loki' && form.queryMode === 'visual' ? form.ignoreCase : undefined,
      },
      condition: {
        operator: form.operator,
        threshold: form.threshold,
        duration: form.duration,
      },
      channelIds: form.channelIds,
      createdAt: now,
      updatedAt: now,
    }
    onSubmit(rule)
  }

  return (
    <Drawer
      title="创建告警规则"
      placement="right"
      width={680}
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
          </Space>
          <Space>
            <Button onClick={onClose}>取消</Button>
            {currentStep < 2 ? (
              <Button
                type="primary"
                onClick={handleNext}
                disabled={currentStep === 0 ? !isStep1FullyValid : !isStep2Valid}
              >
                下一步
              </Button>
            ) : (
              <Button type="primary" onClick={handleSubmit}>
                创建
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择指标' },
          { title: '条件与通知' },
          { title: '确认预览' },
        ]}
      />

      {/* Step 1：选择数据源与指标类型 */}
      {currentStep === 0 && (
        <Form layout="vertical">
          <Form.Item label="数据源" required>
            <Radio.Group
              value={form.datasource}
              onChange={e => handleDatasourceChange(e.target.value)}
              options={DATASOURCE_OPTIONS}
            />
          </Form.Item>

          <Form.Item label="指标类型" required>
            <Select
              value={form.metricType || undefined}
              onChange={handleMetricTypeChange}
              options={metricTypeOptions}
              placeholder="请选择指标类型"
            />
            {currentMetricOption && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {currentMetricOption.description}
              </Text>
            )}
          </Form.Item>

          {form.datasource === 'loki' && (
            <>
              <Form.Item label="配置方式" required>
                <Radio.Group
                  value={form.queryMode}
                  onChange={e => handleQueryModeChange(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { label: '可视化条件', value: 'visual' },
                    { label: '直接输入 LogQL', value: 'raw' },
                  ]}
                />
              </Form.Item>

              {form.queryMode === 'raw' ? (
                <Form.Item label="LogQL" required>
                  <Input.TextArea
                    value={form.rawLogQL}
                    onChange={e => setForm(prev => ({ ...prev, rawLogQL: e.target.value }))}
                    autoSize={{ minRows: 10, maxRows: 18 }}
                    placeholder="粘贴完整 LogQL"
                  />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    label="匹配条件"
                    tooltip="条件之间是 AND 关系；只有任一包含、任一不包含输入框内的逗号表示 OR。"
                    extra="条件之间是 AND；只有“任一包含 / 任一不包含”的逗号表示 OR。普通“包含 / 不包含”请输入单个关键词。"
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {form.lokiConditions.map((condition, index) => (
                        <div
                          key={condition.id}
                          style={{
                            padding: 12,
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 8,
                            background: 'rgba(0,0,0,0.015)',
                          }}
                        >
                          <Space
                            align="center"
                            style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
                          >
                            <Text strong>{getConditionName(index)}</Text>
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              disabled={form.lokiConditions.length === 1}
                              onClick={() => handleRemoveLokiCondition(condition.id)}
                            />
                          </Space>

                          <Space.Compact style={{ width: '100%' }}>
                            <Select
                              value={condition.operator}
                              onChange={value => handleLokiConditionChange(condition.id, { operator: value })}
                              options={LOKI_CONDITION_OPERATOR_OPTIONS}
                              style={{ width: 138 }}
                            />
                            <Input
                              value={condition.value}
                              onChange={e => handleLokiConditionChange(condition.id, { value: e.target.value })}
                              placeholder={
                                condition.operator === 'any_contains'
                                  ? '多个关键词用逗号分隔，表示 OR'
                                  : condition.operator === 'any_not_contains'
                                    ? '多个排除词用逗号分隔，任一命中即排除'
                                    : condition.operator.includes('regex') ? '输入 LogQL 正则' : '输入单个关键词'
                              }
                            />
                          </Space.Compact>
                        </div>
                      ))}

                      <Button block icon={<PlusOutlined />} onClick={handleAddLokiCondition}>
                        添加条件
                      </Button>
                    </Space>
                  </Form.Item>

                  <Form.Item
                    label="大小写"
                    tooltip="开启后，普通包含/不包含会转换成 (?i) 正则匹配"
                  >
                    <Space>
                      <Switch
                        checked={form.ignoreCase}
                        onChange={checked => setForm(prev => ({ ...prev, ignoreCase: checked }))}
                      />
                      <Text>{form.ignoreCase ? '不区分大小写' : '区分大小写'}</Text>
                    </Space>
                  </Form.Item>

                  <Divider orientation="left" style={{ margin: '20px 0 16px' }}>统计方式</Divider>

                  <Form.Item label="统计方式" required>
                    <Select
                      value={form.aggregationMode}
                      onChange={handleAggregationChange}
                      options={LOKI_VISUAL_AGGREGATION_OPTIONS}
                    />
                  </Form.Item>

                  {isKeywordAggregation && (
                    <Form.Item
                      label="统计关键词"
                      required
                      tooltip="多个关键词用逗号分隔，按匹配到的 keyword 分组统计"
                    >
                      <Input
                        value={aggregateKeywordInput}
                        onChange={e => handleAggregateKeywordInputChange(e.target.value)}
                        placeholder="error, handle msg, 节点离线"
                      />
                    </Form.Item>
                  )}

                </>
              )}
            </>
          )}
        </Form>
      )}

      {/* Step 2：设置告警条件 + 选择告警渠道 */}
      {currentStep === 1 && (
        <Form layout="vertical">
          <Form.Item label="触发条件">
            {form.datasource === 'loki' ? (
              isRawLogQL ? (
                <Space align="center" size="middle">
                  <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>LogQL 查询结果达到</span>
                  <InputNumber
                    value={form.threshold}
                    onChange={value => setForm(prev => ({ ...prev, threshold: value ?? 0 }))}
                    min={1}
                    style={{ width: 120 }}
                    placeholder="阈值"
                  />
                  <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>或以上</span>
                </Space>
              ) : (
                <Space align="center" size="middle">
                  <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>最近</span>
                  <Input
                    value={form.timeRangeExpression}
                    onChange={e => setForm(prev => ({ ...prev, timeRangeExpression: e.target.value }))}
                    style={{ width: 120 }}
                    placeholder="如 3m"
                  />
                  <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>内出现</span>
                  <InputNumber
                    value={form.threshold}
                    onChange={value => setForm(prev => ({ ...prev, threshold: value ?? 0 }))}
                    min={1}
                    style={{ width: 120 }}
                    placeholder="次数"
                  />
                  <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>次或以上</span>
                </Space>
              )
            ) : (
              <Space align="center" size="middle">
                <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)', whiteSpace: 'nowrap' }}>
                  当指标值
                </span>
                <Select
                  value={form.operator}
                  onChange={value => setForm(prev => ({ ...prev, operator: value }))}
                  options={OPERATOR_OPTIONS}
                  style={{ width: 120 }}
                />
                <InputNumber
                  value={form.threshold}
                  onChange={value => setForm(prev => ({ ...prev, threshold: value ?? 0 }))}
                  min={0}
                  style={{ width: 140 }}
                  placeholder="阈值"
                />
                <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)', whiteSpace: 'nowrap' }}>
                  {currentMetricOption?.unit || ''}
                </span>
              </Space>
            )}
          </Form.Item>

          {form.datasource === 'prometheus' && (
            <Form.Item
              label="持续时间"
              required
              tooltip="指标持续满足条件多长时间后触发告警，避免短暂波动导致误报"
            >
              <Select
                value={form.duration}
                onChange={value => setForm(prev => ({ ...prev, duration: value }))}
                options={DURATION_OPTIONS}
                placeholder="请选择持续时间"
              />
            </Form.Item>
          )}

          <Divider style={{ margin: '16px 0' }} />

          <Form.Item label="告警渠道" required tooltip="选择接收告警通知的渠道，支持选择已有渠道或新建渠道">
            <Select
              mode="multiple"
              value={form.channelIds}
              onChange={handleChannelChange}
              placeholder="请选择告警渠道"
              options={channels.map(ch => ({ label: ch.name, value: ch.id }))}
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <div
                    style={{ padding: '4px 8px', cursor: 'pointer', color: '#1677ff' }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowNewChannel(true)}
                  >
                    <PlusOutlined /> 新建渠道
                  </div>
                </>
              )}
            />
          </Form.Item>

          {showNewChannel && (
            <div
              style={{
                padding: 16,
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 12 }}>新建告警渠道</Text>
              <Form layout="vertical" size="small">
                <Form.Item label="渠道名称" required style={{ marginBottom: 8 }}>
                  <Input
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="如：游戏告警群"
                  />
                </Form.Item>
                <Form.Item label="渠道类型" required style={{ marginBottom: 8 }}>
                  <Select
                    value={newChannelType}
                    onChange={value => {
                      setNewChannelType(value)
                      setNewChannelWebhook('')
                    }}
                    options={CHANNEL_TYPE_OPTIONS}
                  />
                </Form.Item>
                {newChannelType && (
                  <Form.Item label="Webhook 地址" required style={{ marginBottom: 8 }}>
                    <Input
                      value={newChannelWebhook}
                      onChange={e => setNewChannelWebhook(e.target.value)}
                      placeholder={newChannelType === 'dingtalk' ? 'https://oapi.dingtalk.com/robot/send?access_token=...' : 'https://...'}
                    />
                  </Form.Item>
                )}
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleConfirmNewChannel}
                    disabled={!newChannelName.trim() || !newChannelWebhook.trim()}
                  >
                    确认添加
                  </Button>
                  <Button size="small" onClick={() => setShowNewChannel(false)}>
                    取消
                  </Button>
                </Space>
              </Form>
            </div>
          )}
        </Form>
      )}

      {/* Step 3：确认预览 */}
      {currentStep === 2 && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ padding: 16, background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
            <Form layout="vertical">
              <Form.Item label="规则名称">
                <Input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入规则名称"
                />
              </Form.Item>

              <Form.Item label="数据源">
                <Text>{form.datasource === 'prometheus' ? 'Prometheus（指标）' : 'Loki（日志）'}</Text>
              </Form.Item>

              <Form.Item label="指标类型">
                <Tag color="blue">{currentMetricOption?.label ?? form.metricType}</Tag>
              </Form.Item>

              {form.datasource === 'loki' && (
                <>
                  <Form.Item label="配置方式">
                    <Tag color={isRawLogQL ? 'geekblue' : 'green'}>
                      {isRawLogQL ? '直接输入 LogQL' : '可视化条件'}
                    </Tag>
                  </Form.Item>

                  {!isRawLogQL && (
                    <>
                      {validLokiConditions.length > 0 && (
                        <Form.Item label="匹配条件">
                          <Space wrap>
                            {validLokiConditions.map((condition, index) => (
                              <Tag key={condition.id} color={getConditionTagColor(condition.operator)}>
                                {getConditionName(index)}：{getConditionOperatorLabel(condition.operator)} {condition.value}
                              </Tag>
                            ))}
                          </Space>
                        </Form.Item>
                      )}

                      <Form.Item label="统计方式">
                        <Tag color="blue">
                          {LOKI_VISUAL_AGGREGATION_OPTIONS.find(option => option.value === form.aggregationMode)?.label}
                        </Tag>
                      </Form.Item>

                      {aggregateKeywords.length > 0 && (
                        <Form.Item label="统计关键词">
                          {renderTags(aggregateKeywords, 'orange')}
                        </Form.Item>
                      )}

                      <Form.Item label="大小写">
                        <Tag color={form.ignoreCase ? 'blue' : 'default'}>
                          {form.ignoreCase ? '不区分大小写' : '区分大小写'}
                        </Tag>
                      </Form.Item>
                    </>
                  )}
                </>
              )}

              <Form.Item label="触发条件">
                {form.datasource === 'loki' ? (
                  isRawLogQL ? (
                    <Text>
                      LogQL 查询结果达到 <Text strong>{form.threshold}</Text> 或以上
                    </Text>
                  ) : (
                    <Text>
                      最近 <Text strong>{form.timeRangeExpression}</Text> 内出现 <Text strong>{form.threshold}</Text> 次或以上
                    </Text>
                  )
                ) : (
                  <Text>
                    指标值 <Text strong>{form.operator} {form.threshold} {currentMetricOption?.unit ?? ''}</Text>，
                    持续 <Text strong>{DURATION_OPTIONS.find(d => d.value === form.duration)?.label ?? form.duration}</Text>
                  </Text>
                )}
              </Form.Item>

              <Form.Item label="告警渠道">
                <Space wrap>
                  {form.channelIds.map(id => {
                    const ch = channels.find(c => c.id === id)
                    return ch ? (
                      <Tag key={id} color="cyan">{ch.name}</Tag>
                    ) : null
                  })}
                </Space>
              </Form.Item>
            </Form>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              {form.datasource === 'prometheus' ? 'PromQL' : 'LogQL'} 预览
            </Text>
            <div
              style={{
                background: '#1e1e1e',
                color: '#d4d4d4',
                borderRadius: 8,
                padding: '12px 16px',
                fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                fontSize: 12,
                lineHeight: 1.6,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {queryPreview}
              <br />
              <br />
              {form.datasource === 'loki' ? (
                <>
                  <span style={{ color: '#569cd6' }}># 配置方式:</span> {isRawLogQL ? '直接输入 LogQL' : '可视化条件'}<br />
                  <span style={{ color: '#569cd6' }}># 条件:</span> count &gt;= {form.threshold}
                </>
              ) : (
                <>
                  <span style={{ color: '#569cd6' }}># 条件:</span> {queryPreview} {form.operator} {form.threshold}<br />
                  <span style={{ color: '#569cd6' }}># 持续:</span> for: {form.duration}
                </>
              )}
            </div>
          </div>
        </Space>
      )}
    </Drawer>
  )
}
