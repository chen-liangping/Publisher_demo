'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Card, Collapse, Table, Button, Space, Typography, Select, Tooltip, Drawer, Dropdown, Checkbox, message, Switch } from 'antd'
import { RightOutlined, CloseOutlined, SettingOutlined, QuestionCircleOutlined, DownOutlined, ExportOutlined, CopyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

// 应用告警配置接口
interface AlertConfig {
  id: string
  appName: string
  frequency: string
}

// 通知参与者：人员 + 机器人
interface AlertActor {
  id: string
  name: string
  kind: 'person' | 'webhook'
}

// 模拟告警配置数据
const mockAlertConfigs: AlertConfig[] = [
  { id: '60066', appName: 'open-platform', frequency: '5 分钟' },
  { id: '60081', appName: 'game',          frequency: '5 分钟' },
  { id: '60086', appName: 'testplat',      frequency: '5 分钟' },
  { id: '60087', appName: 'test',          frequency: '5 分钟' },
  { id: '90051', appName: 'master',        frequency: '5 分钟' },
  { id: '90057', appName: 'test-delete-pods', frequency: '5 分钟' }
]


export default function AlertSystem(): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [messageApi, contextHolder] = message.useMessage()
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>(mockAlertConfigs)
  const [configDrawerOpen, setConfigDrawerOpen] = useState<boolean>(false)
  // Pod 故障监控全局开关：关闭时下方应用列表置灰锁定
  const [podMonitorEnabled, setPodMonitorEnabled] = useState<boolean>(true)
  const [editingConfigs, setEditingConfigs] = useState<AlertConfig[]>(mockAlertConfigs)
  const [faroConfigOpen, setFaroConfigOpen] = useState<boolean>(false)
  // 模拟的告警参与者：人员 + 机器人（参考“消息配置”中的配置）
  const [actors] = useState<AlertActor[]>([
    { id: 'person_yu.b',  name: 'yu.b', kind: 'person' },
    { id: 'person_xuyin',  name: '刘悦',  kind: 'person' },
    { id: 'webhook_kumo',  name: '小包',  kind: 'webhook' }
  ])
  // 每个应用 x 参与者的开关矩阵。Pod 开关打开时：接收渠道默认仅选“小包”，联系人默认全勾
  const XIAOBAO_WEBHOOK_ID = 'webhook_kumo'
  const [actorMatrix, setActorMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {}
    const defaultActors = [
      { id: 'person_yu.b', kind: 'person' as const },
      { id: 'person_xuyin', kind: 'person' as const },
      { id: 'webhook_kumo', kind: 'webhook' as const }
    ]
    mockAlertConfigs.forEach(cfg => {
      const row: Record<string, boolean> = {}
      defaultActors.forEach(a => {
        row[a.id] = a.kind === 'webhook' ? a.id === XIAOBAO_WEBHOOK_ID : true
      })
      initial[cfg.id] = row
    })
    return initial
  })

  // Pod 故障开关切换：开启时，接收渠道默认仅选“小包”，联系人默认全勾
  const handlePodMonitorSwitch = useCallback((nextEnabled: boolean) => {
    setPodMonitorEnabled(nextEnabled)
    if (nextEnabled) {
      setActorMatrix(prev => {
        const next: Record<string, Record<string, boolean>> = { ...prev }
        alertConfigs.forEach(cfg => {
          const row: Record<string, boolean> = {}
          actors.forEach(a => {
            if (a.kind === 'webhook') {
              row[a.id] = a.id === XIAOBAO_WEBHOOK_ID
            } else {
              row[a.id] = true // 联系人默认全勾
            }
          })
          next[cfg.id] = row
        })
        return next
      })
    }
  }, [actors, alertConfigs])

  // 切换告警开关
  const handleToggleAlert = useCallback((id: string, enabled: boolean) => {
    setAlertConfigs(prev => 
      prev.map(config => 
        config.id === id ? { ...config, enabled } : config
      )
    )
  }, [])

  // 删除告警配置
  const handleDeleteAlert = useCallback((id: string) => {
    setAlertConfigs(prev => prev.filter(config => config.id !== id))
    setActorMatrix(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // 打开“故障报警配置”抽屉
  const handleOpenConfigDrawer = useCallback(() => {
    setEditingConfigs(alertConfigs)
    setConfigDrawerOpen(true)
  }, [alertConfigs])

  // 在抽屉中修改应用名称
  const handleChangeAppName = useCallback((id: string, appName: string) => {
    setEditingConfigs(prev =>
      prev.map(config => (config.id === id ? { ...config, appName } : config))
    )
  }, [])

  // 在抽屉中修改报警频率
  const handleChangeFrequency = useCallback((id: string, frequency: string) => {
    setEditingConfigs(prev =>
      prev.map(config => (config.id === id ? { ...config, frequency } : config))
    )
  }, [])

  // 在列表页直接修改报警频率（同时同步到抽屉配置）
  const handleChangeFrequencyInline = useCallback((id: string, frequency: string) => {
    setAlertConfigs(prev =>
      prev.map(config => (config.id === id ? { ...config, frequency } : config))
    )
    setEditingConfigs(prev =>
      prev.map(config => (config.id === id ? { ...config, frequency } : config))
    )
  }, [])

  // 获取某个应用在某个参与者上的开关状态（默认视为勾选）
  const getActorCheckedForApp = useCallback(
    (appId: string, actorId: string): boolean => {
      const value = actorMatrix[appId]?.[actorId]
      // 如果尚未配置该参与者的状态，则默认认为是勾选（true）
      if (value === undefined) return true
      return value
    },
    [actorMatrix]
  )

  // 修改某个应用在某个参与者上的开关
  const handleToggleActorForApp = useCallback(
    (appId: string, actorId: string, checked: boolean) => {
      setActorMatrix(prev => {
        const next: Record<string, Record<string, boolean>> = { ...prev }
        const row = { ...(next[appId] ?? {}) }
        row[actorId] = checked
        next[appId] = row
        return next
      })
    },
    []
  )

  // 跳转到“消息中心”的“消息配置”Tab（即 alert.tsx 消息配置页面）
  const handleGoToAlertPage = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('menu', 'message-notification')
    params.set('tab', 'message-config')
    const url = `${pathname}?${params.toString()}`
    router.push(url)
  }, [pathname, router, searchParams])

  // 在抽屉中新增一条配置
  const handleAddConfigRow = useCallback(() => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setEditingConfigs(prev => [
      ...prev,
      { id, appName: '', frequency: '5 分钟' }
    ])
    // 交互逻辑：新增配置行时初始化矩阵行（默认未配置视为勾选）
    setActorMatrix(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}) } }))
  }, [])

  // 抽屉中保存配置
  const handleSaveConfigs = useCallback(() => {
    setAlertConfigs(editingConfigs)
    setConfigDrawerOpen(false)
  }, [editingConfigs])

  // 抽屉中可选的报警频率
  const frequencyOptions = useMemo(
    () => ['5 分钟', '10 分钟', '30 分钟', '1 小时', '2 小时', '4 小时'],
    []
  )

  // 抽屉中可选的应用名称（基于当前配置去重）
  const appNameOptions = useMemo(
    () =>
      Array.from(new Set(editingConfigs.map(c => c.appName).filter(Boolean))).map(name => ({
        label: name,
        value: name
      })),
    [editingConfigs]
  )

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

  // 故障报警表格列配置
  const alertColumns: ColumnsType<AlertConfig> = useMemo(() => {
    const base: ColumnsType<AlertConfig> = [
    {
      title: '应用名称',
      dataIndex: 'appName',
      key: 'appName',
        width: 260,
      render: (appName: string) => (
        <Space size="small">
          <Button 
            size="small" 
            disabled 
            style={{ 
              background: 'transparent', 
              color: 'rgba(0, 0, 0, 0.88)', 
              cursor: 'default',
              border: '1px solid #d9d9d9'
            }}
          >
            {appName}
          </Button>
        </Space>
      )
    },
    {
      title: (
        <Space>
          <span>报警频率</span>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>（仅 Pod 开启后生效）</Text>
          <Tooltip title="设置告警通知的发送频率">
            <QuestionCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)', cursor: 'help' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'frequency',
      key: 'frequency',
        width: 140,
        render: (frequency: string, record: AlertConfig) => (
          <div className="alert-frequency-cell">
            <span className="alert-frequency-cell-value">{frequency}</span>
            <Dropdown
              trigger={['click']}
              menu={{
                items: frequencyOptions.map(v => ({ key: v, label: v })),
                onClick: ({ key }) => handleChangeFrequencyInline(record.id, key as string)
              }}
            >
              <Button
                type="text"
          size="small"
                className="alert-frequency-switch"
                icon={<DownOutlined />}
              />
            </Dropdown>
          </div>
        )
      }
    ]

    // 动态追加“通知渠道参与者”列：按类别分组（人员 / 机器人）
    const personActors = actors.filter(actor => actor.kind === 'person')
    const webhookActors = actors.filter(actor => actor.kind === 'webhook')

    const renderActorChecklist = (
      actorList: AlertActor[],
      layout: 'vertical' | 'horizontal'
    ) => (_: unknown, record: AlertConfig): React.ReactElement => {
      const content = actorList.map(actor => (
        <div key={actor.id} style={{ minHeight: 32, display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={getActorCheckedForApp(record.id, actor.id)}
            onChange={e => handleToggleActorForApp(record.id, actor.id, e.target.checked)}
          >
            {actor.name}
          </Checkbox>
        </div>
      ))

      if (layout === 'horizontal') {
        return (
          <Space size={12} wrap style={{ display: 'flex', paddingBlock: 4 }}>
            {content}
          </Space>
        )
      }

      return (
        <Space direction="vertical" size={6} style={{ display: 'flex', paddingBlock: 4 }}>
          {content}
        </Space>
      )
    }

    const groupedActorCols: ColumnsType<AlertConfig> = []

    if (webhookActors.length > 0) {
      groupedActorCols.push({
        title: '接收渠道',
        key: 'channels',
        width: 220,
        render: renderActorChecklist(webhookActors, 'vertical')
      })
    }

    if (personActors.length > 0) {
      groupedActorCols.push({
        title: '联系人',
        key: 'contacts',
        width: 260,
        render: renderActorChecklist(personActors, 'horizontal')
      })
    }

    return [...base, ...groupedActorCols]
  }, [actors, frequencyOptions, handleChangeFrequencyInline, handleDeleteAlert, getActorCheckedForApp, handleToggleActorForApp])

  // FAQ 数据
  const faqItems = [
    {
      key: 'people-config',
      label: '什么是故障报警？',
      children: (
        <div>
          <Text><strong>故障报警：</strong>系统自动监测应用运行状态的功能。当检测到应用异常、服务中断或性能问题时，系统会立即向相关人员发送告警通知，帮助团队快速响应和处理问题。</Text>
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
        bodyStyle={{ padding: 0 }}
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

      {/* 主要内容 - 故障报警 */}
      <Card title="故障报警">
        {/* 顶部：全局前置控制区（快速开关） */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 16px',
            background: '#fafafa',
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #f0f0f0'
          }}
        >
          <Space align="center" size={16}>
            <SettingOutlined style={{ color: '#1677ff', fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                Pod 故障告警
              </div>
              <Space align="center">
                <Switch
                  checked={podMonitorEnabled}
                  onChange={handlePodMonitorSwitch}
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  开启后将监控所有 K8s Pod 存活状态
                </Text>
              </Space>
            </div>
          </Space>
          <Space>
            <Button
              type="default"
              icon={<SettingOutlined />}
              onClick={handleOpenConfigDrawer}
              disabled={!podMonitorEnabled}
            >
              配置应用
            </Button>
            <Button type="link" icon={<SettingOutlined />} onClick={handleGoToAlertPage}>
              更多告警配置
            </Button>
          </Space>
        </div>

        {/* Pod 关闭时的提示 */}
        {!podMonitorEnabled && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 8,
              marginBottom: 16,
              color: '#d46b08'
            }}
          >
            Pod 监控已关闭，无法配置应用级告警频率
          </div>
        )}

        {/* 应用列表表格 */}
        <div style={{ opacity: podMonitorEnabled ? 1 : 0.5, pointerEvents: podMonitorEnabled ? 'auto' : 'none' }}>
          <Table
            rowKey="id"
            columns={alertColumns}
            dataSource={alertConfigs}
            pagination={false}
            scroll={{ x: 740 }}
            style={{ minWidth: '100%' }}
          />
        </div>
      </Card>

      {/* 故障报警配置抽屉：配置应用与报警频率 */}
      <Drawer
        title="故障报警配置"
        placement="right"
        width={720}
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setConfigDrawerOpen(false)}>取消</Button>
              <Button type="primary" onClick={handleSaveConfigs}>
                确定
              </Button>
            </Space>
          </div>
        }
      >
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              background: '#f0f5ff',
              color: '#1d39c4'
            }}
          >
            请选择需要监控故障报警的游戏应用，并设置报警频率。
          </div>

          {editingConfigs.map(config => (
            <div
              key={config.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                columnGap: 12,
                rowGap: 8
              }}
            >
              {/* 左侧：* 应用 */}
              <div style={{ width: 80, textAlign: 'right', paddingRight: 8 }}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
                <Text strong>应用</Text>
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  placeholder="请选择应用"
                  value={config.appName || undefined}
                  onChange={value => handleChangeAppName(config.id, value)}
                  options={appNameOptions}
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                />
              </div>
              {/* 右侧：报警频率 */}
              <div style={{ width: 80, textAlign: 'right', paddingRight: 8 }}>
                <Text strong>报警频率</Text>
              </div>
              <div style={{ width: 160 }}>
                <Select
                  placeholder="请选择频率"
                  value={config.frequency}
                  onChange={value => handleChangeFrequency(config.id, value)}
                  options={frequencyOptions.map(v => ({ label: v, value: v }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          ))}

          <Button type="dashed" onClick={handleAddConfigRow}>
            + 添加配置
          </Button>
        </Space>
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
