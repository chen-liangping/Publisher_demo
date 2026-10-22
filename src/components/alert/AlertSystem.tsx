'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { menuPath } from '../Console/routes'
import { Alert, Card, Collapse, Table, Button, Space, Typography, Select, Tooltip, Drawer, Popconfirm, message, Switch, Tabs } from 'antd'
import { RightOutlined, CloseOutlined, SettingOutlined, QuestionCircleOutlined, ExportOutlined, CopyOutlined, DeleteOutlined, PlusOutlined, HddOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

// 导入自定义告警规则组件
import CustomAlertRule from './CustomAlertRule'

// 故障报警配置：一条配置可覆盖多个应用；Pod 故障 / Pod 重启 两类告警在列表中分别开关
interface AlertConfig {
  id: string
  appNames: string[]
  // Pod 故障：异常持续期间按 frequency 重复报警
  podFailureEnabled: boolean
  frequency: string
  // Pod 重启：restartWindow 内重启次数 ≥ restartThreshold 即报警
  podRestartEnabled: boolean
  restartWindow: string
  restartThreshold: number
}

const DEFAULT_FREQUENCY = '5 分钟'
const DEFAULT_RESTART_WINDOW = '15 分钟'
const DEFAULT_RESTART_THRESHOLD = 3

const FREQUENCY_OPTIONS = ['5 分钟', '10 分钟', '30 分钟', '1 小时', '2 小时', '4 小时']
const RESTART_WINDOW_OPTIONS = ['5 分钟', '10 分钟', '15 分钟', '30 分钟', '1 小时']
const RESTART_THRESHOLD_OPTIONS = [1, 2, 3, 5, 10]

// 可选应用（模拟数据）
const ALL_APP_NAMES = [
  'single-container-server',
  'multi-container-server',
  'open-platform',
  'sts-service',
  'game',
  'master',
  'testplat'
]

// 模拟告警配置数据
const mockAlertConfigs: AlertConfig[] = [
  { id: '60066', appNames: ['single-container-server', 'multi-container-server'], podFailureEnabled: false, frequency: '1 小时', podRestartEnabled: true, restartWindow: DEFAULT_RESTART_WINDOW, restartThreshold: DEFAULT_RESTART_THRESHOLD },
  { id: '60081', appNames: ['open-platform'], podFailureEnabled: false, frequency: '5 分钟', podRestartEnabled: true, restartWindow: DEFAULT_RESTART_WINDOW, restartThreshold: DEFAULT_RESTART_THRESHOLD },
  { id: '60086', appNames: ['multi-container-server'], podFailureEnabled: true, frequency: '5 分钟', podRestartEnabled: false, restartWindow: DEFAULT_RESTART_WINDOW, restartThreshold: DEFAULT_RESTART_THRESHOLD },
  { id: '60087', appNames: ['sts-service'], podFailureEnabled: true, frequency: '5 分钟', podRestartEnabled: true, restartWindow: DEFAULT_RESTART_WINDOW, restartThreshold: DEFAULT_RESTART_THRESHOLD }
]

// 规则标签样式：Pod 故障（红）/ Pod 重启（橙）/ 已关闭（灰）
const ruleTagBase: React.CSSProperties = {
  display: 'inline-block',
  width: 64,
  flexShrink: 0,
  textAlign: 'center',
  fontSize: 12,
  lineHeight: '22px',
  borderRadius: 4
}
const RULE_TAG_STYLE: Record<'failure' | 'restart' | 'off', React.CSSProperties> = {
  failure: { ...ruleTagBase, background: '#FFF1F0', color: '#A8071A' },
  restart: { ...ruleTagBase, background: '#FFF7E6', color: '#873800' },
  off: { ...ruleTagBase, background: '#F5F5F5', color: '#8C8C8C' }
}


export default function AlertSystem(): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [messageApi, contextHolder] = message.useMessage()
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>(mockAlertConfigs)
  const [configDrawerOpen, setConfigDrawerOpen] = useState<boolean>(false)
  const [editingConfigs, setEditingConfigs] = useState<AlertConfig[]>(mockAlertConfigs)
  const [faroConfigOpen, setFaroConfigOpen] = useState<boolean>(false)

  // 列表内直接切换某类告警的开关
  const handleToggleRule = useCallback(
    (id: string, key: 'podFailureEnabled' | 'podRestartEnabled', checked: boolean) => {
      setAlertConfigs(prev => prev.map(config => (config.id === id ? { ...config, [key]: checked } : config)))
      const label = key === 'podFailureEnabled' ? 'Pod 故障' : 'Pod 重启'
      messageApi.success(`${label}告警已${checked ? '开启' : '关闭'}`)
    },
    [messageApi]
  )

  // 删除告警配置
  const handleDeleteAlert = useCallback(
    (id: string) => {
      setAlertConfigs(prev => prev.filter(config => config.id !== id))
      messageApi.success('配置已删除')
    },
    [messageApi]
  )

  // 打开“故障报警配置”抽屉
  const handleOpenConfigDrawer = useCallback(() => {
    setEditingConfigs(alertConfigs)
    setConfigDrawerOpen(true)
  }, [alertConfigs])

  // 抽屉中修改某条配置的字段
  const handlePatchEditing = useCallback((id: string, patch: Partial<AlertConfig>) => {
    setEditingConfigs(prev => prev.map(config => (config.id === id ? { ...config, ...patch } : config)))
  }, [])

  // 抽屉中删除某条配置
  const handleRemoveEditingRow = useCallback((id: string) => {
    setEditingConfigs(prev => prev.filter(config => config.id !== id))
  }, [])

  // 跳转到“消息中心”的“消息配置”Tab（即 alert.tsx 消息配置页面）
  const handleGoToAlertPage = useCallback(() => {
    // 每个菜单都有独立路由，见 components/Console/routes.ts
    const url = menuPath('message-notification', {
      mode: searchParams.get('mode') === 'container' ? 'container' : undefined,
      query: { tab: 'message-config' }
    })
    router.push(url)
  }, [pathname, router, searchParams])

  // 抽屉中新增一条配置：Pod 故障 / Pod 重启 默认开启，重启阈值默认 15 分钟内 ≥ 3 次
  const handleAddConfigRow = useCallback(() => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setEditingConfigs(prev => [
      ...prev,
      {
        id,
        appNames: [],
        podFailureEnabled: true,
        frequency: DEFAULT_FREQUENCY,
        podRestartEnabled: true,
        restartWindow: DEFAULT_RESTART_WINDOW,
        restartThreshold: DEFAULT_RESTART_THRESHOLD
      }
    ])
  }, [])

  // 抽屉中保存配置
  const handleSaveConfigs = useCallback(() => {
    if (editingConfigs.some(config => config.appNames.length === 0)) {
      messageApi.error('请为每条配置至少选择一个应用')
      return
    }
    setAlertConfigs(editingConfigs)
    setConfigDrawerOpen(false)
    messageApi.success('故障报警配置已保存')
  }, [editingConfigs, messageApi])

  const appNameOptions = useMemo(() => ALL_APP_NAMES.map(name => ({ label: name, value: name })), [])

  // Faro 初始化代码示例字符串（仅用于展示与复制）
  const faroInitCode = `import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: 'https://faro-collector-prod-ap-southeast-0.grafana.net/collect/g123743be98abaec9cc8a3bb074ae188',
  app: {
    name: 'gametest',
    version: '1.0.0',
    environment: 'staging', // 可手动更改至正式或测试环境
  },
  instrumentations: [
    // Mandatory, omits default instrumentations otherwise.
    ...getWebInstrumentations(),
    // Tracing package to get end-to-end visibility for HTTP requests.
    new TracingInstrumentation(),
  ],
});`

  // 报警规则单元格中的一行：标签 + 开关 + 规则描述
  const renderRuleLine = (record: AlertConfig, kind: 'failure' | 'restart'): React.ReactElement => {
    const enabled = kind === 'failure' ? record.podFailureEnabled : record.podRestartEnabled
    const label = kind === 'failure' ? 'Pod 故障' : 'Pod 重启'
    const desc =
      kind === 'failure'
        ? `每 ${record.frequency}报警`
        : `${record.restartWindow}内重启 ≥ ${record.restartThreshold} 次报警`
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={enabled ? RULE_TAG_STYLE[kind] : RULE_TAG_STYLE.off}>{label}</span>
        <Switch
          size="small"
          checked={enabled}
          aria-label={`${enabled ? '关闭' : '开启'} ${label}告警`}
          onChange={checked =>
            handleToggleRule(record.id, kind === 'failure' ? 'podFailureEnabled' : 'podRestartEnabled', checked)
          }
        />
        {enabled ? <Text>{desc}</Text> : <Text type="secondary">已关闭 · 开启后{desc}</Text>}
      </div>
    )
  }

  // 故障报警表格列配置
  const alertColumns: ColumnsType<AlertConfig> = [
    {
      title: '应用名称',
      dataIndex: 'appNames',
      key: 'appNames',
      render: (appNames: string[]) => (
        <Space size={8} wrap>
          {appNames.map(name => (
            <span
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '1px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                color: 'rgba(0, 0, 0, 0.88)'
              }}
            >
              <HddOutlined />
              {name}
            </span>
          ))}
        </Space>
      )
    },
    {
      title: (
        <Space size={6}>
          <span>报警规则</span>
          <Tooltip title="Pod 故障：Pod 异常期间按所选频率重复报警；Pod 重启：时间窗口内重启次数达到阈值即报警。两类告警可分别开关">
            <QuestionCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)', cursor: 'help' }} />
          </Tooltip>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>（可分别开关）</Text>
        </Space>
      ),
      key: 'rules',
      width: 460,
      render: (_: unknown, record: AlertConfig) => (
        <Space direction="vertical" size={10} style={{ display: 'flex', paddingBlock: 2 }}>
          {renderRuleLine(record, 'failure')}
          {renderRuleLine(record, 'restart')}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: AlertConfig) => (
        <Popconfirm
          title="确定删除这条报警配置？"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteAlert(record.id)}
        >
          <Button type="link" style={{ padding: 0 }}>删除</Button>
        </Popconfirm>
      )
    }
  ]
  // FAQ 数据
  const faqItems = [
    {
      key: 'people-config',
      label: '什么是故障报警？',
      children: (
        <div>
          <Text><strong>故障报警：</strong>系统自动监测应用运行状态的功能。当检测到应用异常、服务中断或性能问题时，系统会立即向相关人员发送告警通知，帮助团队快速响应和处理问题。</Text>
          <br />
          <Text><strong>Pod 故障 / Pod 重启：</strong>Pod 故障监测 Pod 存活与就绪状态，异常期间按所选频率重复报警；Pod 重启监测容器重启次数（如 OOMKilled、存活探针失败），在时间窗口内重启次数达到阈值即报警。两类告警可在列表中分别开关。</Text>
          <br />
          <Text><strong>人员配置：</strong>用于管理接收告警通知的人员信息，包括钉钉账号等联系方式。当系统检测到异常时，会向配置的人员发送通知。</Text>
        </div>
      ),
      extra: <CloseOutlined />
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      {/* 页面标题和描述 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 2, paddingBottom: 2 }}>
          <Title level={1} style={{ marginBottom: 4, fontSize: 22 }}>
            告警系统
          </Title>
          <Text type="secondary">
            告警系统用于在游戏部署中监测运行状态，发现异常时向相关人员发送警报，帮助团队及时处理问题，减少对玩家的影响。
          </Text>
        </div>
        {/* FAQ 折叠面板 */}
        <Collapse
          ghost
          expandIcon={({ isActive }) => (
            <RightOutlined rotate={isActive ? 90 : 0} />
          )}
          style={{ 
            paddingInline: 24, 
            paddingBlock: 12, 
            borderBottom: '1px solid #f0f0f0',
            borderRadius: 0 
          }}
          items={faqItems.slice(0, 1)} // 只显示第一个FAQ
        />


      </Card>

      {/* 运行时指标采集（独立卡片） */}
      <Card
        style={{ marginBottom: 24, borderRadius: 12, padding: 0, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            backgroundImage: 'url(/assets/landscape.jpg)',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            position: 'relative'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(0deg, white 45%, rgba(255, 255, 255, 0.3) 100%)',
              padding: '200px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <Text strong style={{ fontSize: 18 }}>
              运行时指标采集
            </Text>
            <Text type="secondary" style={{ maxWidth: 720, fontSize: 13 }}>
            运行时指标采集 是平台内置的服务端可观测能力，用于持续采集应用运行时指标。<br />
            通过这些指标，可在 Grafana Dashboard 中实时监控应用性能与资源使用情况，及时发现性能瓶颈、异常波动及容量风险。<br />
            配置完成后，可在 Grafana Dashboard 中查看并实时监控应用的运行时性能与资源指标。
            </Text>
            <Space size={16} style={{ marginTop: 8 }}>
              <Button
                icon={<ExportOutlined />}
                size="small"
                type="default"
                onClick={() => window.open('https://publisher.grafana.net/explore', '_blank')}
              >
                前往面板
              </Button>
              <Button type="text" onClick={() => setFaroConfigOpen(true)}>
                配置指导
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {/* 主要内容 - Tabs：故障报警 / 自定义告警规则 */}
      <Tabs
        defaultActiveKey="pod-alert"
        items={[
          {
            key: 'pod-alert',
            label: '故障报警',
            children: (
      <Card
        title="故障报警"
        extra={
          <Space>
            <Button icon={<ExportOutlined />} onClick={handleGoToAlertPage}>
              更多设置
            </Button>
            <Button type="primary" icon={<SettingOutlined />} onClick={handleOpenConfigDrawer}>
              编辑
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={alertColumns}
          dataSource={alertConfigs}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无报警配置，点击右上角「编辑」添加应用' }}
        />
      </Card>
            ),
          },
          {
            key: 'custom-alert',
            label: '自定义告警规则',
            children: (
      <Card>
        {/* 自定义告警规则说明 */}
        <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0f5ff', borderRadius: 4, color: '#1d39c4' }}>
          通过引导式表单配置自定义监控指标与阈值，系统将在 Grafana 中自动创建对应的告警规则。告警通知将通过当前配置的通知渠道发送。
        </div>
        <CustomAlertRule />
      </Card>
            ),
          },
        ]}
      />

      {/* 故障报警配置抽屉：配置应用、Pod 故障报警频率、Pod 重启阈值 */}
      <Drawer
        title="故障报警配置"
        placement="right"
        width={720}
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        destroyOnClose
        footer={
          <Space>
            <Button type="primary" onClick={handleSaveConfigs}>
              确定
            </Button>
            <Button onClick={() => setConfigDrawerOpen(false)}>关闭</Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message="请选择需要监控的游戏应用并设置报警规则；告警关闭时也可修改规则，在列表开启后按最新配置生效"
          style={{ marginBottom: 4 }}
        />

        {editingConfigs.map(config => (
          <div
            key={config.id}
            style={{
              padding: '16px 0 20px',
              borderBottom: '1px dashed #e5e5e5',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            {/* 应用 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 72, flexShrink: 0 }}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
                <Text strong>应用</Text>
              </div>
              <Select
                mode="multiple"
                placeholder="请选择应用"
                value={config.appNames}
                onChange={(value: string[]) => handlePatchEditing(config.id, { appNames: value })}
                options={appNameOptions}
                allowClear
                showSearch
                style={{ flex: 1, minWidth: 0 }}
              />
              <Tooltip title="删除该配置">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  aria-label="删除该配置"
                  onClick={() => handleRemoveEditingRow(config.id)}
                />
              </Tooltip>
            </div>

            {/* Pod 故障：报警频率 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 84 }}>
              <span style={config.podFailureEnabled ? RULE_TAG_STYLE.failure : RULE_TAG_STYLE.off}>Pod 故障</span>
              <Select
                value={config.frequency}
                onChange={(value: string) => handlePatchEditing(config.id, { frequency: value })}
                options={FREQUENCY_OPTIONS.map(v => ({ label: v, value: v }))}
                style={{ width: 120 }}
              />
              <Text type="secondary">报警一次</Text>
              {!config.podFailureEnabled && (
                <Text type="secondary" style={{ fontSize: 12 }}></Text>
              )}
            </div>

            {/* Pod 重启：时间窗口 + 次数阈值 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 84 }}>
              <span style={config.podRestartEnabled ? RULE_TAG_STYLE.restart : RULE_TAG_STYLE.off}>Pod 重启</span>
              <Select
                value={config.restartWindow}
                onChange={(value: string) => handlePatchEditing(config.id, { restartWindow: value })}
                options={RESTART_WINDOW_OPTIONS.map(v => ({ label: v, value: v }))}
                style={{ width: 120 }}
              />
              <Text type="secondary">内重启 ≥</Text>
              <Select
                value={config.restartThreshold}
                onChange={(value: number) => handlePatchEditing(config.id, { restartThreshold: value })}
                options={RESTART_THRESHOLD_OPTIONS.map(n => ({ label: `${n} 次`, value: n }))}
                style={{ width: 88 }}
              />
              <Text type="secondary">报警</Text>
              {!config.podRestartEnabled && (
                <Text type="secondary" style={{ fontSize: 12 }}>（）</Text>
              )}
            </div>
          </div>
        ))}

        <div style={{ paddingTop: 20 }}>
          <Button icon={<PlusOutlined />} onClick={handleAddConfigRow}>
            添加配置
          </Button>
          <div style={{ marginTop: 10 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              新增配置时 Pod 故障与 Pod 重启告警默认开启，重启阈值默认 15 分钟内重启 ≥ 3 次
            </Text>
          </div>
        </div>
      </Drawer>

      {/* Faro 配置说明 Drawer（与客户端告警一致） */}
      <Drawer
        title="配置运行时指标采集"
        width={720}
        open={faroConfigOpen}
        onClose={() => setFaroConfigOpen(false)}
        footer={
          <div style={{ textAlign: 'left' }}>
            <Button onClick={() => setFaroConfigOpen(false)}>
              关闭
            </Button>
          </div>
        }
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* 打开监控面板 */}
          <div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>打开监控面板</Text>
              <Text type="secondary">
                确认 Grafana 监控面板可以正常访问后，再进行后续步骤
              </Text>
              <Space style={{ marginTop: 4 }} size={16}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 13,
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    https://publisher.grafana.net/explore
                  </div>
                </div>
                <Button
                  type="primary"
                  onClick={() => window.open('https://publisher.grafana.net/explore', '_blank')}
                  style={{ height: 38 }}
                >
                  打开面板
                </Button>
              </Space>
            </Space>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.06)',
              marginTop: 4,
              paddingTop: 4
            }}
          >
            <Text type="secondary" style={{ fontSize: 14 }}>
            你需要做什么：
            <br />让你的应用在 Pod 内提供一个符合 Prometheus 格式的指标端点（`/metrics`），并且将容器端口 <strong>声明为 `9095`</strong>，平台就会自动发现并采集。
            </Text>
          </div>

          {/* 第一步：安装依赖包 */}
          <div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>第一步：配置参数</Text>
              <Text type="secondary">在你的应用内暴露 `/metrics`（只需集群内可访问，无需公网暴露）</Text>
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                  position: 'relative',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>  - 端口：`9095`</span><br />
                <span>  - 路径：`/metrics`</span><br />
                <Button
                  size="small"
                  type="default"
                  icon={<CopyOutlined />}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    backgroundColor: '#fff'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText('npm install @grafana/faro-web-sdk')
                    messageApi.success('命令已复制')
                  }}
                >
                  复制
                </Button>
              </div>

              <Text type="secondary">在部署配置中声明容器端口 `9095`，确保 Pod 的容器端口列表里包含 `9095`（通常在容器 `ports`/`containerPort` 配置里）</Text>

                <Button
                  size="small"
                  type="default"
                  icon={<CopyOutlined />}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    backgroundColor: '#fff'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText('npm install @grafana/faro-web-tracing')
                    messageApi.success('命令已复制')
                  }}
                >
                  复制
                </Button>
            </Space>
          </div>

          {/* 第二步：在 Grafana 验证 */}
          <div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>第2步：在 Grafana 验证</Text>

              {/* 进入 Explore 提示 */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                <Text type="secondary">
                  1）进入 <Text strong>Explore → 选择 Prometheus 数据源 → 左上角选择appid-Metrics → 输入查询语句</Text>
                </Text>
              </div>

              {/* 查询 1：检查采集是否成功 */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <Text strong>2）输入以下sql先查采集是否成功：</Text>
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: '#fff',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                    overflowX: 'auto',
                  }}
                >
                  <Button
                    size="small"
                    type="default"
                    icon={<CopyOutlined />}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 8,
                      backgroundColor: '#fff',
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText('up{job="metrics_9095"}')
                      messageApi.success('查询语句已复制')
                    }}
                  >
                    复制
                  </Button>
                  <pre style={{ margin: 0 }}>{'up{job="metrics_9095"}'}</pre>
                </div>
              </div>

              {/* 查询 2：按集群 / 命名空间 / 应用过滤 */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <Text strong>3）采集成功后，可按集群 / 命名空间 / 应用过滤（参考以下SQL）：</Text>
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: '#fff',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                    overflowX: 'auto',
                  }}
                >
                  <Button
                    size="small"
                    type="default"
                    icon={<CopyOutlined />}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 8,
                      backgroundColor: '#fff',
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(
                        'up{job="metrics_9095", cluster="cpp-stg-k8s", namespace="<your-namespace>", app="<your-app>"}'
                      )
                      messageApi.success('查询语句已复制')
                    }}
                  >
                    复制
                  </Button>
                  <pre style={{ margin: 0 }}>
                    {'up{job="metrics_9095", cluster="cpp-stg-k8s", namespace="<your-namespace>", app="<your-app>"}'}
                  </pre>
                </div>
              </div>

              {/* 通用标签说明 */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                <Text strong>可通过哪些通用标签过滤 / 聚合：</Text>
                <ul style={{ paddingLeft: 18, marginTop: 6, marginBottom: 0 }}>
                  <li>
                    <code>cluster</code>： <code>cpp-stg-k8s</code> / <code>cpp-pro-k8s</code>
                  </li>
                  <li>
                    <code>env</code>： <code>staging</code> / <code>production</code>
                  </li>
                  <li>
                    <code>namespace</code> 、 <code>pod</code> 、 <code>instance</code>、<code>app</code>（来自 Pod label <code>app</code>，如未设置可能为空）
                  </li>
                </ul>
              </div>
              <Text strong>更多配置</Text>
                <Text type="secondary">如果你需要更深的运行时信息、或者需要 <strong>分布式追踪（Trace）</strong>，可以使用 <strong>OpenTelemetry Java Agent</strong> 通过 <strong>OTLP（推送）</strong> 发送数据到 Alloy。或想了解更多grafana操作，请参考 <a href="https://developers.g123.jp/docs/infra#grafana-cloud" target="_blank">developer文档</a></Text>
            </Space>
          </div>
        </Space>
      </Drawer>
    </div>
  )
}
