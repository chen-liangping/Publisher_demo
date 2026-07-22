'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  Form,
  Steps,
  Button,
  Flex,
  Typography,
  Input,
  Select,
  Switch,
  Alert,
  Divider,
  Space,
  Collapse,
  Tag,
  Popconfirm,
  Radio,
} from 'antd'
import { ArrowRightOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { AutoLaunchStrategyForm, type StrategyFormValues, type StrategyRow } from './AutoLaunchStrategyForm'
import { type ZoneLaunch, type StrategyType, type PartitionDimension, createZone, formatZoneValueLabel, formatDimensionLabel, partitionValueOptions, PARTITION_DIMENSION_OPTIONS } from './autoLaunchMock'
import type { FormInstance } from 'antd'

const { Text } = Typography

type Step = 0 | 1 | 2

const STEP_ITEMS = [
  { title: '配置开服策略' },
  { title: '添加开服配置' },
  { title: '确认配置' },
]

// 开服配置步骤名（对照生产 ActionStepName）
type StepConfigure = {
  name: string
  enabled?: boolean
  domain?: string
  path?: string
  apiToken?: string
  gameAppNames?: string[]
}

type ConfigFormValues = StrategyFormValues & {
  stepConfigures: StepConfigure[]
}

const DEFAULT_DOMAIN = 'https://g123-jp-gametest-slb.stg.g123-cpp.com/'

// 由分区现有策略推导初始 strategies 行
const deriveStrategies = (zone: ZoneLaunch): StrategyRow[] => {
  if (zone.strategyType !== 'strategy' || !zone.progressList?.length) return []
  const p = zone.progressList
  return [
    {
      createRole: p[0]?.target,
      paidUsers: p[1]?.target,
      afterValue: p[2]?.target,
      afterUnit: p[2]?.unit === '天' ? 'day' : 'hour',
    },
  ]
}

const buildInitialValues = (zone: ZoneLaunch): ConfigFormValues => ({
  strategyType: zone.strategyType,
  autoLaunchCron: {
    mode: 'daily',
    hour: 0,
    minute: 0,
    ...(zone.cron
      ? {
          hour: Number(zone.cron.cronTimeAt?.slice(11, 13)) || 0,
          minute: Number(zone.cron.cronTimeAt?.slice(14, 16)) || 0,
        }
      : {}),
  },
  strategies: deriveStrategies(zone),
  effectPeriodType: 'all',
  stepConfigures: [
    {
      name: 'open_server_notify',
      domain: DEFAULT_DOMAIN,
      path: 'open-platform/api/v1/webhook/openServerNotify?code=',
      apiToken: '12345678',
    },
    { name: 'new_server_alert_update', enabled: true },
    {
      name: 'new_server_notify',
      enabled: false,
      domain: DEFAULT_DOMAIN,
      path: 'open-platform/api/v1/webhook/newServerNotify?code=',
    },
    { name: 'new_server_provision', enabled: false, gameAppNames: [] },
  ],
})

// 定时开服预览文案
const formatCronPreview = (cron: ConfigFormValues['autoLaunchCron']): string => {
  if (!cron) return ''
  const time = `JST ${String(cron.hour ?? 0).padStart(2, '0')}:${String(cron.minute ?? 0).padStart(2, '0')}`
  switch (cron.mode) {
    case 'daily':
      return `每天 ${time} 执行`
    case 'weekly':
      return `每周${['日', '一', '二', '三', '四', '五', '六'][cron.dayOfWeek ?? 0]} ${time} 执行`
    case 'monthly':
      return `每月第 ${cron.dayOfMonth ?? 1} 日 ${time} 执行`
    case 'interval':
      return `每间隔 ${cron.interval ?? 1} ${cron.intervalUnit === 'day' ? '天' : cron.intervalUnit === 'week' ? '周' : '小时'} 执行`
  }
}

const formatStrategyRowText = (s: StrategyRow): string => {
  const parts: string[] = []
  if (s.createRole) parts.push(`创角人数 ${s.createRole}`)
  if (s.paidUsers) parts.push(`付费人数 ${s.paidUsers}`)
  if (s.afterValue) parts.push(`前次开服经过 ${s.afterValue}${s.afterUnit === 'day' ? '天' : '小时'}`)
  return parts.join('，')
}

// 自定义分区策略摘要：定时 / 条件
const summarizeStrategy = (v: StrategyFormValues | undefined): string => {
  if (!v) return '-'
  if (v.strategyType === 'cron') return formatCronPreview(v.autoLaunchCron)
  if (v.strategies?.length) return v.strategies.map((s, i) => `【条件${i + 1}】${formatStrategyRowText(s)}`).join('；')
  return '策略开服'
}

// 配置向导确认时回传：策略表单值 + 分区维度 + 分区开服开关 + 新增/编辑后的分区列表（不含 global）+ 各自定义分区的策略值
export type ConfigConfirmResult = {
  strategy: StrategyFormValues
  partitionDimension: PartitionDimension
  zoneLaunchEnabled: boolean
  zones: ZoneLaunch[]
  // zoneId -> 自定义策略值（仅 override=true 的分区）
  customStrategies: Record<string, StrategyFormValues>
}

type ConfigAutoLaunchModalProps = {
  open: boolean
  zone: ZoneLaunch
  gameApps: { name: string; displayName: string }[]
  // 当前全部分区（含 global），用于初始化分区列表
  zones: ZoneLaunch[]
  // 分区维度（启用前可改，启用后锁定）：用于初始化向导本地态
  partitionDimension: PartitionDimension
  onClose: () => void
  onConfirm: (result: ConfigConfirmResult) => void
}

export default function ConfigAutoLaunchModal({
  open,
  zone,
  gameApps,
  zones,
  partitionDimension: initialDimension,
  onClose,
  onConfirm,
}: ConfigAutoLaunchModalProps) {
  const [form] = Form.useForm<ConfigFormValues>()
  const [current, setCurrent] = useState<Step>(0)
  const [showCronPreview, setShowCronPreview] = useState(false)

  // 分区开服本地态：开关 + 分区维度（启用前可选，启用后锁定）+ 分区列表（不含 global）+ 新增区所选分区值
  const [zoneLaunchEnabled, setZoneLaunchEnabled] = useState(false)
  // 分区维度：lang/country/currency，默认 lang；启用自动开服后锁定，运行态不可改
  const [partitionDimension, setPartitionDimension] = useState<PartitionDimension>(initialDimension)
  const [localZones, setLocalZones] = useState<ZoneLaunch[]>(() => zones.filter(z => z.zoneId !== 'global'))
  const [newZoneLang, setNewZoneLang] = useState('')
  // 各自定义分区的策略值（zoneId -> StrategyFormValues）
  const [customStrategies, setCustomStrategies] = useState<Record<string, StrategyFormValues>>({})
  // 各自定义分区表单实例（用于分步校验与最终取值）
  const zoneFormsRef = useRef<Record<string, FormInstance<StrategyFormValues> | null>>({})

  const initialValues = useMemo(() => buildInitialValues(zone), [zone])

  const cron = Form.useWatch(['autoLaunchCron'], form)
  const strategyType = Form.useWatch('strategyType', form) as StrategyType | undefined
  const stepConfigures = Form.useWatch('stepConfigures', form) as StepConfigure[] | undefined

  // 新增区：区名由分区值推导（如 en → 英语区、JP → 日本区、JPY → 日元区），导流服 ID 默认 1，默认继承默认服
  const addZone = () => {
    const value = newZoneLang.trim()
    if (!value || localZones.some(z => z.zoneId === value)) return
    const zoneName = `${formatZoneValueLabel(partitionDimension, value)}区`
    setLocalZones(prev => [...prev, createZone(zoneName, value, 1, partitionDimension)])
    setNewZoneLang('')
  }

  // 切换分区维度：清空已配分区（维度变更后旧分区值不再适用），回到无分区状态
  const onDimensionChange = (dim: PartitionDimension) => {
    setPartitionDimension(dim)
    setLocalZones([])
    setCustomStrategies({})
    setNewZoneLang('')
    zoneFormsRef.current = {}
  }

  const removeZone = (zoneId: string) => {
    setLocalZones(prev => prev.filter(z => z.zoneId !== zoneId))
    setCustomStrategies(prev => {
      const next = { ...prev }
      delete next[zoneId]
      return next
    })
    zoneFormsRef.current[zoneId] = null
  }

  // 切换分区策略模式：继承默认服 / 自定义
  const toggleOverride = (zoneId: string, toCustom: boolean) => {
    setLocalZones(prev => prev.map(z => (z.zoneId === zoneId ? { ...z, override: toCustom } : z)))
    if (toCustom) {
      // 切到自定义时，以上方默认服策略（主表单当前值）作为初始值
      const g = form.getFieldsValue(true) as ConfigFormValues
      setCustomStrategies(prev => ({
        ...prev,
        [zoneId]: {
          strategyType: g.strategyType,
          autoLaunchCron: g.autoLaunchCron,
          strategies: g.strategies,
          effectPeriodType: g.effectPeriodType,
          effectPeriod: g.effectPeriod,
        },
      }))
    } else {
      setCustomStrategies(prev => {
        const next = { ...prev }
        delete next[zoneId]
        return next
      })
    }
  }

  // 自定义分区表单实例注册（供分步校验与最终取值）
  const registerZoneForm = (zoneId: string, formInst: FormInstance<StrategyFormValues> | null) => {
    zoneFormsRef.current[zoneId] = formInst
  }

  // 自定义分区表单值变更（供确认页摘要展示）
  const onCustomValuesChange = (zoneId: string, values: StrategyFormValues) => {
    setCustomStrategies(prev => ({ ...prev, [zoneId]: values }))
  }

  const handleNext = async () => {
    try {
      // 分步校验：仅校验当前步骤相关字段
      if (current === 0) {
        await form.validateFields(['strategyType', 'autoLaunchCron', 'strategies', 'effectPeriodType', 'effectPeriod'])
        // 同步校验所有自定义分区表单
        await Promise.all(Object.values(zoneFormsRef.current).map(f => f?.validateFields()))
      } else if (current === 1) {
        await form.validateFields(['stepConfigures'])
      }
      setCurrent(s => (Math.min(2, s + 1) as Step))
    } catch {
      // 校验失败留在当前步
    }
  }

  const handlePrev = () => setCurrent(s => (Math.max(0, s - 1) as Step))

  const handleOk = async () => {
    try {
      await form.validateFields()
      await Promise.all(Object.values(zoneFormsRef.current).map(f => f?.validateFields()))
    } catch {
      return
    }
    const values = form.getFieldsValue() as ConfigFormValues
    onConfirm({ strategy: values, partitionDimension, zoneLaunchEnabled, zones: localZones, customStrategies })
  }

  const okText = current === 2 ? '开启自动开服' : '保存并下一步'

  return (
    <Modal
      title={
        <Flex vertical gap={0}>
          <Text strong style={{ fontSize: 16 }}>配置自动开服</Text>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
            所有游服应用统一的自动开服策略及 Webhook
          </Text>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      footer={
        <Flex align="center" justify="center" gap={16}>
          {current > 0 ? <Button onClick={handlePrev}>上一步</Button> : null}
          <Button type="primary" onClick={current === 2 ? handleOk : handleNext}>
            {okText}
          </Button>
          <Button onClick={onClose}>{current === 2 ? '关闭' : '取消'}</Button>
        </Flex>
      }
    >
      <Form<ConfigFormValues>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        requiredMark
      >
        <Steps size="small" current={current} items={STEP_ITEMS} style={{ marginBottom: 24 }} />

        {/* 步骤一：配置开服策略 */}
        {current === 0 ? (
          <Flex vertical gap={12}>
            <Alert
              type="info"
              showIcon
              message="默认服策略（全局兜底）"
              description="未自定义的分区将继承此默认服策略。"
              style={{ marginBottom: 4 }}
            />
            <AutoLaunchStrategyForm />
            {strategyType === 'cron' ? (
              <Flex vertical gap={4}>
                <Button
                  type="link"
                  icon={<ArrowRightOutlined />}
                  style={{ paddingInline: 0 }}
                  onClick={() => setShowCronPreview(v => !v)}
                >
                  预览执行时间（JST）
                </Button>
                {showCronPreview ? (
                  <Text type="secondary" style={{ fontSize: 12, paddingLeft: 20 }}>
                    {formatCronPreview(cron)}
                  </Text>
                ) : null}
              </Flex>
            ) : null}

            {/* AI 开服：纯提示，策略由运营人员配置脚本维护；实际启停由运营脚本，不影响导流服触发，本页不提供开关 */}
            <Alert
              type="info"
              showIcon
              message={<Text strong>AI 开服</Text>}
              description={
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    AI 开服策略由运营人员配置脚本维护；实际启停由运营脚本控制，本页不提供开关。
                  </Text>
                  <Text type="warning" style={{ fontSize: 12 }}>
                    导流服始终按下方策略触发自动开服；AI 推断触发是否生效取决于运营脚本配置。
                  </Text>
                </Flex>
              }
              style={{ padding: '10px 12px' }}
            />

            {/* 分区开服（可折叠）：开启后可为各分区单独配置开服策略 */}
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 4 }}
              items={[
                {
                  key: 'zone-launch',
                  label: (
                    <Flex align="center" gap={8} onClick={e => e.stopPropagation()}>
                      <Text strong>分区开服</Text>
                      <Switch
                        size="small"
                        checked={zoneLaunchEnabled}
                        onChange={setZoneLaunchEnabled}
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        开启后，可为各分区单独配置开服策略；关闭则所有分区继承默认服策略
                      </Text>
                    </Flex>
                  ),
                  children: zoneLaunchEnabled ? (
                    <ZoneLaunchSection
                      zones={localZones}
                      partitionDimension={partitionDimension}
                      onDimensionChange={onDimensionChange}
                      customStrategies={customStrategies}
                      newZoneLang={newZoneLang}
                      onNewZoneLangChange={setNewZoneLang}
                      onAdd={addZone}
                      onRemove={removeZone}
                      onToggleOverride={toggleOverride}
                      onEditorReady={registerZoneForm}
                      onEditorValuesChange={onCustomValuesChange}
                    />
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      未开启分区开服
                    </Text>
                  ),
                },
              ]}
            />
          </Flex>
        ) : null}

        {/* 步骤二：添加开服配置 */}
        {current === 1 ? <ConfigsStep stepConfigures={stepConfigures} gameApps={gameApps} /> : null}

        {/* 步骤三：确认配置 */}
        {current === 2 ? (
          <ConfirmStep
            strategyType={strategyType}
            cron={cron}
            stepConfigures={stepConfigures}
            strategies={form.getFieldValue('strategies')}
            effectPeriodType={form.getFieldValue('effectPeriodType')}
            partitionDimension={partitionDimension}
            zoneLaunchEnabled={zoneLaunchEnabled}
            zones={localZones}
            customStrategies={customStrategies}
          />
        ) : null}
      </Form>
    </Modal>
  )
}

/* 步骤二：开服配置（发送开服通知 / 开启默认监控 / 发送部署通知 / 新建预备服） */
const ConfigsStep = ({
  stepConfigures,
  gameApps,
}: {
  stepConfigures: StepConfigure[] | undefined
  gameApps: { name: string; displayName: string }[]
}) => {
  const deployNotifyEnabled = stepConfigures?.[2]?.enabled
  const provisionEnabled = stepConfigures?.[3]?.enabled
  const gameAppOptions = gameApps.map(g => ({ label: g.displayName, value: g.name }))

  return (
    <Flex vertical gap={16}>
      {/* 1. 发送开服通知 */}
      <ConfigSection index={1} title="发送开服通知" question="当满足您设定的开服条件后，平台会调用您配置的 Webhook，通知新服务器即将开启。">
        <Form.Item label="开服通知API" required name={['stepConfigures', 0, 'path']} rules={[{ required: true, message: '请输入开服通知API' }]}>
          <Space.Compact style={{ width: '100%' }}>
            <div style={{ width: '40%', padding: '4px 11px', background: 'rgba(0,0,0,0.04)', border: '1px solid #d9d9d9', borderRadius: '6px 0 0 6px', color: 'rgba(0,0,0,0.45)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {DEFAULT_DOMAIN}
            </div>
            <Input style={{ flex: 1, borderRadius: '0 6px 6px 0' }} placeholder="path" />
          </Space.Compact>
        </Form.Item>
        <Flex vertical gap={2} style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            回调：https://game-cloud.stg.g123.jp/cp/api/v1/open_server/callback
          </Text>
        </Flex>
        <Form.Item label="API Token" required name={['stepConfigures', 0, 'apiToken']} rules={[{ required: true, message: '请输入 API Token' }]}>
          <Input placeholder="请输入 API Token" />
        </Form.Item>
      </ConfigSection>

      {/* 2. 开启默认监控 */}
      <ConfigSection index={2} title="开启默认监控">
        <Text>
          系统为新开服务器自动添加监控，并通过模拟玩家登录及游玩来检测新服是否能正常使用。如有异常，会及时告警到群。
        </Text>
      </ConfigSection>

      {/* 3. 发送部署通知 */}
      <ConfigSection
        index={3}
        title="发送部署通知"
        question="平台会调用您配置的Webhook，通知您下一个新服的预部署事件，便于提前做好资源和运营准备。"
        switchName={['stepConfigures', 2, 'enabled']}
      >
        {deployNotifyEnabled ? (
          <Form.Item label="部署通知API" required name={['stepConfigures', 2, 'path']} rules={[{ required: true, message: '请输入部署通知API' }]}>
            <Space.Compact style={{ width: '100%' }}>
              <div style={{ width: '40%', padding: '4px 11px', background: 'rgba(0,0,0,0.04)', border: '1px solid #d9d9d9', borderRadius: '6px 0 0 6px', color: 'rgba(0,0,0,0.45)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {DEFAULT_DOMAIN}
              </div>
              <Input style={{ flex: 1, borderRadius: '0 6px 6px 0' }} placeholder="path" />
            </Space.Compact>
          </Form.Item>
        ) : null}
      </ConfigSection>

      {/* 4. 新建预备服 */}
      <ConfigSection
        index={4}
        title="新建预备服"
        question="平台可先启动暂不接收玩家流量的容器，开服时仅需切换流量即可启用；若为无游服架构，则无需此步骤。"
        switchName={['stepConfigures', 3, 'enabled']}
      >
        {provisionEnabled ? (
          <Form.Item label="选择游服APP" name={['stepConfigures', 3, 'gameAppNames']} rules={[{ required: true, message: '请选择游服APP' }]}>
            <Select mode="multiple" placeholder="请选择游服APP" options={gameAppOptions} />
          </Form.Item>
        ) : null}
      </ConfigSection>
    </Flex>
  )
}

/* 配置区块：左侧序号 + 标题/开关 + 内容 */
const ConfigSection = ({
  index,
  title,
  question,
  switchName,
  children,
}: {
  index: number
  title: string
  question?: string
  switchName?: (string | number)[]
  children?: React.ReactNode
}) => (
  <Flex gap={16} style={{ width: '100%' }}>
    <Flex vertical align="center">
      <div style={{
        width: 24, height: 24, borderRadius: 999, background: 'rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.45)', fontSize: 12,
      }}>
        {index}
      </div>
    </Flex>
    <Flex vertical gap={8} style={{ flex: 1 }}>
      <Flex justify="space-between" align="center">
        <Text strong>{title}</Text>
        {switchName ? (
          <Form.Item noStyle name={switchName} valuePropName="checked">
            <Switch checkedChildren="ON" unCheckedChildren="OFF" />
          </Form.Item>
        ) : null}
      </Flex>
      {question ? <Text type="secondary" style={{ fontSize: 12 }}>{question}</Text> : null}
      <Divider style={{ margin: 0 }} />
      {children}
    </Flex>
  </Flex>
)

/* 步骤三：确认配置摘要 */
const ConfirmStep = ({
  strategyType,
  cron,
  stepConfigures,
  strategies,
  effectPeriodType,
  partitionDimension,
  zoneLaunchEnabled,
  zones,
  customStrategies,
}: {
  strategyType?: StrategyType
  cron?: ConfigFormValues['autoLaunchCron']
  stepConfigures?: StepConfigure[]
  strategies?: StrategyRow[]
  effectPeriodType?: 'all' | 'part'
  partitionDimension?: PartitionDimension
  zoneLaunchEnabled?: boolean
  zones?: ZoneLaunch[]
  customStrategies?: Record<string, StrategyFormValues>
}) => {
  const rows: { label: string; children: React.ReactNode }[] = []
  rows.push({
    label: '开服模式',
    children: strategyType === 'cron' ? '定时开服' : '策略开服',
  })
  rows.push({
    label: strategyType === 'cron' ? '开服时间' : '允许开服时间段',
    children: strategyType === 'cron' ? formatCronPreview(cron) : effectPeriodType === 'all' ? '全时段' : '指定时段',
  })
  if (strategyType === 'strategy' && strategies?.length) {
    rows.push({
      label: '开服策略',
      children: strategies.map((s, i) => `【条件${i + 1}】${formatStrategyRowText(s)}`).join('；'),
    })
  }
  const stepLabels: string[] = ['发送开服通知', '开启默认监控']
  if (stepConfigures?.[2]?.enabled) stepLabels.push('发送部署通知')
  if (stepConfigures?.[3]?.enabled) stepLabels.push('新建预备服')
  rows.push({ label: '开服步骤', children: stepLabels.join(' → ') })
  rows.push({
    label: '开服通知API',
    children: `${stepConfigures?.[0]?.domain}${stepConfigures?.[0]?.path}`,
  })
  rows.push({ label: 'API Token', children: stepConfigures?.[0]?.apiToken ?? '-' })
  if (stepConfigures?.[3]?.enabled) {
    rows.push({ label: '新建预备服应用', children: (stepConfigures?.[3]?.gameAppNames ?? []).join('、') || '-' })
  }
  // AI 开服摘要：纯提示，实际启停由运营脚本，本页不提供开关
  rows.push({
    label: 'AI 开服',
    children: <Text type="secondary" style={{ fontSize: 12 }}>由运营配置脚本维护，本页不提供开关；导流服始终按策略触发</Text>,
  })
  // 分区开服摘要
  rows.push({ label: '分区开服', children: zoneLaunchEnabled ? '已开启' : '未开启' })
  if (zoneLaunchEnabled) {
    rows.push({ label: '分区维度', children: formatDimensionLabel(partitionDimension ?? 'lang') })
  }
  if (zoneLaunchEnabled && zones?.length) {
    rows.push({
      label: '分区清单',
      children: (
        <Flex vertical gap={6}>
          {/* 固定的默认服 */}
          <Flex align="center" gap={6}>
            <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(82,196,26,0.12)', color: '#52c41a', margin: 0 }}>
              默认服
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>使用上方默认服策略</Text>
          </Flex>
          {zones.map(z => (
            <Flex key={z.zoneId} align="center" gap={6} wrap="wrap">
              <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(114,46,209,0.08)', color: '#722ED1', margin: 0 }}>
                {z.zoneName}·{z.lang}
              </Tag>
              {z.override ? (
                <>
                  <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(250,173,20,0.12)', color: '#fa8c16', margin: 0 }}>自定义</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>{summarizeStrategy(customStrategies?.[z.zoneId])}</Text>
                </>
              ) : (
                <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.45)', margin: 0 }}>继承默认服</Tag>
              )}
            </Flex>
          ))}
        </Flex>
      ),
    })
  }

  return (
    <Flex vertical gap={0}>
      {rows.map((r, i) => (
        <Flex key={i} style={{ padding: '8px 0' }}>
          <Text strong style={{ width: 120, color: 'rgba(0,0,0,0.65)' }}>{r.label}</Text>
          <div style={{ flex: 1 }}>{r.children}</div>
        </Flex>
      ))}
      <Alert type="info" showIcon message="启用自动开服后，将自动触发一次开服操作。" style={{ marginTop: 12 }} />
    </Flex>
  )
}

/* 自定义分区策略编辑器：独立 Form 实例（component=false 避免嵌套 <form>），复用 AutoLaunchStrategyForm */
const ZoneStrategyEditor = ({
  zoneId,
  initialValues,
  onReady,
  onValuesChange,
}: {
  zoneId: string
  initialValues: StrategyFormValues
  onReady: (zoneId: string, form: FormInstance<StrategyFormValues> | null) => void
  onValuesChange: (zoneId: string, values: StrategyFormValues) => void
}) => {
  const [form] = Form.useForm<StrategyFormValues>()
  // 注册/注销表单实例，供父级分步校验与最终取值
  useEffect(() => {
    onReady(zoneId, form)
    return () => onReady(zoneId, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Form<StrategyFormValues>
      form={form}
      layout="vertical"
      component={false}
      initialValues={initialValues}
      onValuesChange={(_, all) => onValuesChange(zoneId, all)}
    >
      <AutoLaunchStrategyForm />
    </Form>
  )
}

/* 分区开服区块：分区维度选择 + 固定默认服行 + 分区列表（继承/自定义切换 + 行内策略编辑）+ 新增区 */
const ZoneLaunchSection = ({
  zones,
  partitionDimension,
  onDimensionChange,
  customStrategies,
  newZoneLang,
  onNewZoneLangChange,
  onAdd,
  onRemove,
  onToggleOverride,
  onEditorReady,
  onEditorValuesChange,
}: {
  zones: ZoneLaunch[]
  partitionDimension: PartitionDimension
  onDimensionChange: (dim: PartitionDimension) => void
  customStrategies: Record<string, StrategyFormValues>
  newZoneLang: string
  onNewZoneLangChange: (value: string) => void
  onAdd: () => void
  onRemove: (zoneId: string) => void
  onToggleOverride: (zoneId: string, toCustom: boolean) => void
  onEditorReady: (zoneId: string, form: FormInstance<StrategyFormValues> | null) => void
  onEditorValuesChange: (zoneId: string, values: StrategyFormValues) => void
}) => {
  // 可选分区值：按当前维度取选项，去掉已占用，避免 zoneId（= 分区值）重复
  const takenValues = new Set(zones.map(z => z.zoneId))
  const valueOptions = partitionValueOptions(partitionDimension).filter(o => !takenValues.has(o.value))
  const dimLabel = formatDimensionLabel(partitionDimension)

  return (
    <Flex vertical gap={12} style={{ paddingInline: 4 }}>
      {/* 分区维度：启用前可选，启用后锁定；切换维度会清空已配分区 */}
      <Flex align="center" gap={8} wrap="wrap" style={{ padding: '6px 8px', background: 'rgba(22,119,255,0.06)', borderRadius: 6 }}>
        <Text strong>分区维度</Text>
        <Radio.Group
          size="small"
          value={partitionDimension}
          onChange={e => onDimensionChange(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          {PARTITION_DIMENSION_OPTIONS.map(o => (
            <Radio.Button key={o.value} value={o.value}>{o.label}</Radio.Button>
          ))}
        </Radio.Group>
        <Text type="secondary" style={{ fontSize: 12 }}>
          启用自动开服后维度锁定，运行态不可更改；切换维度会清空已配分区
        </Text>
      </Flex>

      {/* 固定的默认服行：不可删除，使用上方默认策略 */}
      <Flex align="center" justify="space-between" style={{ padding: '6px 8px', background: 'rgba(82,196,26,0.06)', borderRadius: 6 }}>
        <Flex align="center" gap={8}>
          <Text strong>默认服</Text>
          <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(82,196,26,0.12)', color: '#52c41a', margin: 0 }}>默认服</Tag>
        </Flex>
        <Text type="secondary" style={{ fontSize: 12 }}>使用上方默认策略</Text>
      </Flex>

      {/* 各分区：可切换 继承默认服 / 自定义 */}
      {zones.length ? (
        <Flex vertical gap={8}>
          {zones.map(z => (
            <Flex key={z.zoneId} vertical gap={8} style={{ padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={8}>
                  <Text strong>{z.zoneName}</Text>
                  <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', margin: 0 }}>{partitionDimension}={z.lang}</Tag>
                </Flex>
                <Flex align="center" gap={8}>
                  <Radio.Group
                    size="small"
                    value={z.override ? 'custom' : 'inherit'}
                    onChange={e => onToggleOverride(z.zoneId, e.target.value === 'custom')}
                  >
                    <Radio.Button value="inherit">继承默认服</Radio.Button>
                    <Radio.Button value="custom">自定义</Radio.Button>
                  </Radio.Group>
                  <Popconfirm title="删除该分区？" description="删除后该分区导流服将不再触发自动开服。" onConfirm={() => onRemove(z.zoneId)} okText="删除" cancelText="取消">
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Flex>
              </Flex>
              {z.override ? (
                <div style={{ padding: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6 }}>
                  <ZoneStrategyEditor
                    zoneId={z.zoneId}
                    initialValues={customStrategies[z.zoneId]}
                    onReady={onEditorReady}
                    onValuesChange={onEditorValuesChange}
                  />
                  <Flex justify="flex-end">
                    <Button type="link" size="small" onClick={() => onToggleOverride(z.zoneId, false)}>继承默认服策略</Button>
                  </Flex>
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12, paddingLeft: 4 }}>继承默认服策略</Text>
              )}
            </Flex>
          ))}
        </Flex>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>暂无分区，选择 {dimLabel} 即可新增对应分区</Text>
      )}

      {/* 新增区：只选分区值，区名在其下拉项括号内展示 */}
      <Divider style={{ margin: 0 }} />
      <Flex gap={8} align="center">
        <Select
          placeholder={`选择 ${dimLabel} 新增分区`}
          value={newZoneLang || undefined}
          onChange={onNewZoneLangChange}
          options={valueOptions.map(o => ({ value: o.value, label: `${o.value}（${formatZoneValueLabel(partitionDimension, o.value)}区）` }))}
          style={{ width: 240 }}
          showSearch
          optionFilterProp="label"
          notFoundContent={`已无可选 ${dimLabel}`}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!newZoneLang.trim()}
          onClick={onAdd}
        >
          添加
        </Button>
      </Flex>
      {!newZoneLang.trim() ? (
        <Text type="secondary" style={{ fontSize: 12 }}>只需选择 {dimLabel}，区名自动取「{`{${dimLabel}}区`}」，默认继承默认服</Text>
      ) : null}
    </Flex>
  )
}
