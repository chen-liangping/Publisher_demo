'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Drawer, Steps, Form, Input, Radio, Select, InputNumber, Space, Typography, Tag, Button, Divider, Switch, Alert } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  METRIC_TYPES,
  DATASOURCE_OPTIONS,
  OPERATOR_OPTIONS,
  DURATION_OPTIONS,
  CHANNEL_TYPE_OPTIONS,
  LOKI_CONDITION_OPERATOR_OPTIONS,
  generateRuleName,
  createDefaultFormValue,
  createDefaultLokiCondition,
  normalizeKeywordList,
  normalizeLokiConditions,
  normalizeLokiParserStages,
  parseListInput,
  type DatasourceType,
  type AlertRuleFormValue,
  type GrafanaAlertRule,
  type MetricTypeOption,
  type AlertChannel,
  type LokiFilterCondition,
} from './mock-data'

const { Text } = Typography

type LogAggregationChoice = 'sum' | 'keyword' | 'field'

interface CreateAlertRuleDrawerProps {
  open: boolean
  channels: AlertChannel[]
  appId?: string
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

function getLogAggregationChoice(form: AlertRuleFormValue): LogAggregationChoice {
  if (form.aggregationMode === 'sum') return 'sum'
  return form.aggregationLabels[0] && form.aggregationLabels[0] !== 'keyword' ? 'field' : 'keyword'
}

function getFieldAggregationLabel(form: AlertRuleFormValue): string {
  return form.aggregationLabels[0] && form.aggregationLabels[0] !== 'keyword'
    ? form.aggregationLabels[0]
    : ''
}

function getAggregationChoiceLabel(value: LogAggregationChoice): string {
  switch (value) {
    case 'keyword':
      return '按关键词统计'
    case 'field':
      return '按提取字段统计'
    default:
      return '总数统计'
  }
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
  appId = 'gametest',
  onClose,
  onSubmit,
  onCreateChannel,
}: CreateAlertRuleDrawerProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState<AlertRuleFormValue>(createDefaultFormValue())
  const [aggregateKeywordInput, setAggregateKeywordInput] = useState('')

  const createScopedFormValue = useCallback((): AlertRuleFormValue => {
    const value = createDefaultFormValue()
    return {
      ...value,
      selectorMatchers: [{ id: 'selector-1', label: 'namespace', operator: '=', value: appId }],
    }
  }, [appId])

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
      setForm(createScopedFormValue())
    }
  }, [createScopedFormValue, open])

  const metricTypeOptions = useMemo(() => getMetricTypeOptions(form.datasource), [form.datasource])
  const currentMetricOption = useMemo(() => findMetricOption(form.datasource, form.metricType), [form.datasource, form.metricType])
  const validLokiConditions = useMemo(() => normalizeLokiConditions(form.lokiConditions), [form.lokiConditions])
  const validParserStages = useMemo(() => normalizeLokiParserStages(form.parserStages), [form.parserStages])
  const aggregateKeywords = useMemo(() => normalizeKeywordList(form.aggregateKeywords), [form.aggregateKeywords])
  const logAggregationChoice = getLogAggregationChoice(form)
  const isKeywordAggregation = logAggregationChoice === 'keyword'
  const isFieldAggregation = logAggregationChoice === 'field'
  const fieldAggregationLabel = getFieldAggregationLabel(form)

  const handleDatasourceChange = (value: DatasourceType) => {
    const firstMetric = METRIC_TYPES[value][0]
    setAggregateKeywordInput('')
    setForm(prev => ({
      ...prev,
      datasource: value,
      metricType: firstMetric.key,
      threshold: firstMetric.defaultThreshold,
      keyword: '',
      selectorMatchers: [{ id: 'selector-1', label: 'namespace', operator: '=', value: appId }],
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

  const handleAggregationChange = (value: LogAggregationChoice) => {
    setForm(prev => ({
      ...prev,
      aggregationMode: value === 'sum' ? 'sum' : 'sum_by',
      aggregationLabels: value === 'sum' ? [] : value === 'keyword' ? ['keyword'] : [getFieldAggregationLabel(prev) || 'cname'],
      aggregateKeywords: value === 'keyword' ? prev.aggregateKeywords : [],
      parserStages: value === 'field'
        ? prev.parserStages.length > 0 ? prev.parserStages : [{ id: 'parser-1', type: 'regexp', expression: '' }]
        : [],
    }))
    if (value !== 'keyword') {
      setAggregateKeywordInput('')
    }
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

  const handleFieldNameChange = (value: string) => {
    const fieldName = value.trim()
    setForm(prev => ({
      ...prev,
      aggregationLabels: fieldName ? [fieldName] : [],
    }))
  }

  const handleFieldPatternChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      parserStages: [
        {
          id: prev.parserStages[0]?.id ?? 'parser-1',
          type: 'regexp',
          expression: value,
        },
      ],
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
        form.datasource === 'loki' && isKeywordAggregation ? aggregateKeywords : undefined,
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
    ? isStep1Valid &&
      validLokiConditions.length > 0 &&
      (isKeywordAggregation ? aggregateKeywords.length > 0 : true) &&
      (isFieldAggregation ? fieldAggregationLabel !== '' && validParserStages.length > 0 : true)
    : isStep1Valid
  const isStep2Valid = form.threshold !== undefined && form.threshold !== null && form.channelIds.length > 0 &&
    (form.datasource === 'prometheus' ? form.duration !== '' : true) &&
    (form.datasource === 'loki' ? form.timeRangeExpression.trim() !== '' : true)

  const handleSubmit = () => {
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const rule: GrafanaAlertRule = {
      id: `rule-${Date.now()}`,
      name: form.name || generateRuleName(
        form.metricType,
        form.operator,
        form.threshold,
        form.datasource === 'loki' && isKeywordAggregation ? aggregateKeywords : undefined,
      ),
      datasource: form.datasource,
      state: 'normal',
      metricScope: {
        metricType: form.metricType,
        keyword: form.datasource === 'loki' && isKeywordAggregation ? aggregateKeywords.join('、') : undefined,
        selectorMatchers: form.datasource === 'loki' ? form.selectorMatchers : undefined,
        aggregateKeywords: form.datasource === 'loki' && isKeywordAggregation ? aggregateKeywords : undefined,
        lokiConditions: form.datasource === 'loki' ? validLokiConditions : undefined,
        parserStages: form.datasource === 'loki' && isFieldAggregation ? validParserStages : undefined,
        aggregationMode: form.datasource === 'loki' ? form.aggregationMode : undefined,
        aggregationLabels: form.datasource === 'loki'
          ? form.aggregationMode === 'sum_by' ? form.aggregationLabels : []
          : undefined,
        range: form.datasource === 'loki' ? form.timeRangeExpression.trim() : undefined,
        queryMode: form.datasource === 'loki' ? 'visual' : undefined,
        rawLogQL: undefined,
        ignoreCase: form.datasource === 'loki' ? form.ignoreCase : undefined,
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
              <Form.Item label="日志范围">
                <Alert
                  type="info"
                  showIcon
                  message={(
                    <Space wrap>
                      <span>当前 AppID</span>
                      <Tag color="blue">{appId}</Tag>
                      <Text type="secondary">系统自动限定日志范围，不需要手动选择 cluster / namespace / logstore。</Text>
                    </Space>
                  )}
                />
              </Form.Item>

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
                                : condition.operator.includes('regex') ? '输入正则表达式' : '输入单个关键词'
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
                tooltip="开启后，普通包含/不包含会按不区分大小写匹配"
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
                  value={logAggregationChoice}
                  onChange={handleAggregationChange}
                  options={[
                    { label: '总数统计', value: 'sum' },
                    { label: '按关键词统计', value: 'keyword' },
                    { label: '按提取字段统计', value: 'field' },
                  ]}
                />
              </Form.Item>

              {isKeywordAggregation && (
                <Form.Item
                  label="统计关键词"
                  required
                  tooltip="多个关键词用逗号分隔。系统会按匹配到的关键词分别统计，任一关键词达到阈值即可触发。"
                >
                  <Input
                    value={aggregateKeywordInput}
                    onChange={e => handleAggregateKeywordInputChange(e.target.value)}
                    placeholder="error, handle msg, 节点离线"
                  />
                </Form.Item>
              )}

              {isFieldAggregation && (
                <>
                  <Form.Item
                    label="统计字段"
                    required
                    tooltip="例如 cname、pod、errorCode。系统会按这个字段分别统计。"
                  >
                    <Input
                      value={fieldAggregationLabel}
                      onChange={e => handleFieldNameChange(e.target.value)}
                      placeholder="如 cname"
                    />
                  </Form.Item>

                  <Form.Item
                    label="字段提取规则"
                    required
                    tooltip="用于从日志内容中提取统计字段。"
                    extra="示例：Container (?P<cname>\\w+) failed liveness probe"
                  >
                    <Input
                      value={form.parserStages[0]?.expression ?? ''}
                      onChange={e => handleFieldPatternChange(e.target.value)}
                      placeholder="输入带命名分组的正则，如 (?P<cname>\\w+)"
                    />
                  </Form.Item>
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
                <Text>{form.datasource === 'prometheus' ? 'Prometheus（指标）' : '日志（应用日志）'}</Text>
              </Form.Item>

              <Form.Item label="指标类型">
                <Tag color="blue">{currentMetricOption?.label ?? form.metricType}</Tag>
              </Form.Item>

              {form.datasource === 'loki' && (
                <>
                  <Form.Item label="日志范围">
                    <Space wrap>
                      <span>当前 AppID</span>
                      <Tag color="blue">{appId}</Tag>
                    </Space>
                  </Form.Item>

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
                    <Tag color="blue">{getAggregationChoiceLabel(logAggregationChoice)}</Tag>
                  </Form.Item>

                  {aggregateKeywords.length > 0 && (
                    <Form.Item label="统计关键词">
                      {renderTags(aggregateKeywords, 'orange')}
                    </Form.Item>
                  )}

                  {isFieldAggregation && (
                    <>
                      <Form.Item label="统计字段">
                        <Tag color="orange">{fieldAggregationLabel}</Tag>
                      </Form.Item>

                      <Form.Item label="字段提取规则">
                        <Text code>{form.parserStages[0]?.expression}</Text>
                      </Form.Item>
                    </>
                  )}

                  <Form.Item label="大小写">
                    <Tag color={form.ignoreCase ? 'blue' : 'default'}>
                      {form.ignoreCase ? '不区分大小写' : '区分大小写'}
                    </Tag>
                  </Form.Item>
                </>
              )}

              <Form.Item label="触发条件">
                {form.datasource === 'loki' ? (
                  <Text>
                    最近 <Text strong>{form.timeRangeExpression}</Text> 内出现 <Text strong>{form.threshold}</Text> 次或以上
                  </Text>
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
        </Space>
      )}
    </Drawer>
  )
}
