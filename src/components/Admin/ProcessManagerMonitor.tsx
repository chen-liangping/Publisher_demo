'use client'

import React, { useEffect, useMemo, useState } from 'react'
import ProcessAgentInstanceDetail from './ProcessAgentInstanceDetail'
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Modal,
  message,
  Tabs,
} from 'antd'
import type { TableColumnsType, MenuProps, BadgeProps, TabsProps } from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'

const { Text, Title } = Typography

// ==================== 类型定义 ====================

type InstallStatus = 'installed' | 'uninstalled' | 'installing' | 'uninstalling'
type AgentOnline = boolean

interface AgentInstance {
  instanceId: string
  appId: string
  instanceName: string
  privateIp: string
  installStatus: InstallStatus
  online: boolean
  lastSeenAt?: string
  agentVersion?: string
  targetVersion: string
  createdAt?: string
}

interface SummaryData {
  totalInstances: number
  installedCount: number
  onlineCount: number
  offlineCount: number
}

// ==================== 状态主题配置 ====================

type StatusTheme = {
  dotInner: string
  dotOuter: string
  text: string
  border: string
}

type StatusPaletteKey = 'success' | 'danger' | 'primary' | 'warning' | 'neutral' | 'error'

const STATUS_PALETTE: Record<StatusPaletteKey, StatusTheme> = {
  success: {
    dotInner: '#52C41A',
    dotOuter: '#D9F7BE',
    text: '#52C41A',
    border: '#F0F0F0',
  },
  danger: {
    dotInner: '#F5222D',
    dotOuter: '#FFF1F0',
    text: '#F5222D',
    border: '#F5222D',
  },
  primary: {
    dotInner: '#2F54EB',
    dotOuter: '#F0F5FF',
    text: '#2F54EB',
    border: '#85A5FF',
  },
  warning: {
    dotInner: '#FADB14',
    dotOuter: '#FFFFB8',
    text: '#FADB14',
    border: '#D4B106',
  },
  neutral: {
    dotInner: 'rgba(0, 0, 0, 0.65)',
    dotOuter: 'rgba(0, 0, 0, 0.15)',
    text: 'rgba(0, 0, 0, 0.65)',
    border: 'rgba(0, 0, 0, 0.15)',
  },
  error: {
    dotInner: '#F5222D',
    dotOuter: '#FFF1F0',
    text: '#F5222D',
    border: '#FFA39E',
  },
}

// 安装状态映射
const installStatusThemeMap: Record<InstallStatus, StatusTheme> = {
  installed: STATUS_PALETTE.success,
  uninstalled: STATUS_PALETTE.neutral,
  installing: STATUS_PALETTE.primary,
  uninstalling: STATUS_PALETTE.danger,
}

const installStatusConfig: Record<
  InstallStatus,
  { label: string; status: BadgeProps['status'] }
> = {
  installed: { label: '已安装', status: 'success' },
  uninstalled: { label: '未安装', status: 'default' },
  installing: { label: '安装中', status: 'processing' },
  uninstalling: { label: '卸载中', status: 'processing' },
}

// 在线状态映射
const onlineStatusThemeMap: {
  true: StatusTheme
  false: StatusTheme
} = {
  true: STATUS_PALETTE.success,
  false: STATUS_PALETTE.neutral,
}

// ==================== 常量配置 ====================

const HEARTBEAT_TIMEOUT = 30

const installStatusFilterOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'installed', label: '已安装' },
  { value: 'uninstalled', label: '未安装' },
]

const onlineFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' },
]

// ==================== Mock 数据 ====================

const mockAppIds = [
  { value: 'gamedemo', label: 'gamedemo' },
  { value: 'battle-royale', label: 'battle-royale' },
  { value: 'racing-moba', label: 'racing-moba' },
  { value: 'puzzle-game', label: 'puzzle-game' },
]

const agentVersions = [
  { value: 'v1.0.0', label: 'v1.0.0' },
  { value: 'v1.1.0', label: 'v1.1.0' },
  { value: 'v1.2.0', label: 'v1.2.0' },
  { value: 'v1.2.3', label: 'v1.2.3' },
]

const mockData: AgentInstance[] = [
  {
    instanceId: 'i-bp1234567890abcdef',
    appId: 'gamedemo',
    instanceName: 'web-server-01',
    privateIp: '172.16.0.10',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:30:00',
    agentVersion: 'v1.2.3',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp0987654321fedcba',
    appId: 'gamedemo',
    instanceName: 'web-server-02',
    privateIp: '172.16.0.11',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:29:55',
    agentVersion: 'v1.2.3',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp1111111111111111',
    appId: 'gamedemo',
    instanceName: 'api-server-01',
    privateIp: '172.16.0.12',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:30:05',
    agentVersion: 'v1.2.0',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp2222222222222222',
    appId: 'battle-royale',
    instanceName: 'db-server-01',
    privateIp: '172.16.0.13',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:29:50',
    agentVersion: 'v1.2.2',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp3333333333333333',
    appId: 'battle-royale',
    instanceName: 'db-server-02',
    privateIp: '172.16.0.14',
    installStatus: 'installed',
    online: false,
    lastSeenAt: '2024-01-15 10:25:00',
    agentVersion: 'v1.2.2',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp4444444444444444',
    appId: 'racing-moba',
    instanceName: 'cache-server-01',
    privateIp: '172.16.0.15',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:29:52',
    agentVersion: 'v1.2.3',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp5555555555555555',
    appId: 'racing-moba',
    instanceName: 'game-server-01',
    privateIp: '172.16.0.16',
    installStatus: 'installed',
    online: false,
    lastSeenAt: '2024-01-15 10:28:00',
    agentVersion: 'v1.2.1',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp6666666666666666',
    appId: 'puzzle-game',
    instanceName: 'game-server-02',
    privateIp: '172.16.0.17',
    installStatus: 'uninstalled',
    online: false,
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp7777777777777777',
    appId: 'puzzle-game',
    instanceName: 'mq-server-01',
    privateIp: '172.16.0.18',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:29:48',
    agentVersion: 'v1.2.0',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp8888888888888888',
    appId: 'gamedemo',
    instanceName: 'worker-01',
    privateIp: '172.16.0.19',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:29:35',
    agentVersion: 'v1.2.3',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bp9999999999999999',
    appId: 'battle-royale',
    instanceName: 'worker-02',
    privateIp: '172.16.0.20',
    installStatus: 'installed',
    online: true,
    lastSeenAt: '2024-01-15 10:29:42',
    agentVersion: 'v1.1.0',
    targetVersion: 'v1.2.3',
  },
  {
    instanceId: 'i-bpaaaaaaaaaaaaaaaa',
    appId: 'racing-moba',
    instanceName: 'backup-server-01',
    privateIp: '172.16.0.21',
    installStatus: 'uninstalled',
    online: false,
    targetVersion: 'v1.2.3',
  },
]

// ==================== 状态组件 ====================

interface StatusDotProps {
  theme: StatusTheme
}

const StatusDot = ({ theme }: StatusDotProps) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 12,
      height: 12,
      background: theme.dotOuter,
      borderRadius: '50%',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        background: theme.dotInner,
        borderRadius: '50%',
      }}
    />
  </span>
)

interface StatusBadgeProps {
  status: InstallStatus | AgentOnline
  type: 'install' | 'online'
  text?: string
}

const StatusBadge = ({ status, type, text }: StatusBadgeProps) => {
  const theme = type === 'install'
    ? installStatusThemeMap[status as InstallStatus]
    : (status ? onlineStatusThemeMap.true : onlineStatusThemeMap.false)

  const config = type === 'install'
    ? installStatusConfig[status as InstallStatus]
    : { label: status ? '在线' : '离线', status: (status ? 'success' : 'default') as BadgeProps['status'] }

  const isProcessing = type === 'install' && (status === 'installing' || status === 'uninstalling')

  if (isProcessing) {
    return (
      <Space size={4}>
        <LoadingOutlined style={{ color: theme.text }} />
        <Text style={{ color: theme.text }}>{config.label}</Text>
      </Space>
    )
  }

  return (
    <Space size={6}>
      <StatusDot theme={theme} />
      <Text style={{ color: theme.text }}>{text || config.label}</Text>
    </Space>
  )
}

// ==================== 主组件 ====================

type Env = 'stg' | 'prod'
type InstallStatusFilter = InstallStatus | 'all'
type OnlineFilter = 'online' | 'offline' | 'all'

export default function ProcessManagerMonitor() {
  const [env, setEnv] = useState<Env>('stg')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [data, setData] = useState<AgentInstance[]>(mockData)
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [appIdFilter, setAppIdFilter] = useState<string[]>([])
  const [installStatusFilter, setInstallStatusFilter] = useState<InstallStatusFilter>('all')
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all')
  const [versionFilter, setVersionFilter] = useState<string | undefined>()

  const [operatingInstance, setOperatingInstance] = useState<AgentInstance | null>(null)

  const filteredData = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return data.filter((item) => {
      const matchKeyword =
        !keyword ||
        item.instanceName.toLowerCase().includes(keyword) ||
        item.instanceId.toLowerCase().includes(keyword) ||
        item.privateIp.includes(keyword)

      const matchAppId = appIdFilter.length === 0 || appIdFilter.includes(item.appId)

      const matchInstallStatus = installStatusFilter === 'all' || item.installStatus === installStatusFilter

      const matchOnline = onlineFilter === 'all' ||
        (onlineFilter === 'online' && item.online) ||
        (onlineFilter === 'offline' && !item.online)

      const matchVersion = !versionFilter || item.agentVersion === versionFilter

      return matchKeyword && matchAppId && matchInstallStatus && matchOnline && matchVersion
    })
  }, [data, searchKeyword, appIdFilter, installStatusFilter, onlineFilter, versionFilter])

  const summary: SummaryData = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.totalInstances += 1
        if (item.installStatus === 'installed') acc.installedCount += 1
        if (item.online) acc.onlineCount += 1
        else acc.offlineCount += 1
        return acc
      },
      { totalInstances: 0, installedCount: 0, onlineCount: 0, offlineCount: 0 },
    )
  }, [data])

  const handleRefresh = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setLoading(false)
    message.success('刷新成功')
  }

  const handleBackToList = () => {
    setSelectedInstanceId(null)
  }

  const handleViewDetail = (instance: AgentInstance) => {
    setSelectedInstanceId(instance.instanceId)
  }

  const handleTabChange = (key: string) => {
    setEnv(key as Env)
  }

  const handleInstall = (instance: AgentInstance) => {
    Modal.confirm({
      title: `安装 Agent`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认在以下实例安装 Agent？</p>
          <p><Text strong>实例：</Text>{instance.instanceName}</p>
          <p><Text strong>实例ID：</Text><Text code>{instance.instanceId}</Text></p>
          <p><Text strong>目标版本：</Text>{instance.targetVersion}</p>
        </div>
      ),
      okText: '确认安装',
      cancelText: '取消',
      onOk: async () => {
        setOperatingInstance(instance)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setData((prev) =>
          prev.map((item) =>
            item.instanceId === instance.instanceId
              ? { ...item, installStatus: 'installed' as InstallStatus, online: true, agentVersion: instance.targetVersion }
              : item,
          ),
        )
        setOperatingInstance(null)
        message.success(`Agent 安装成功：${instance.instanceName}`)
      },
    })
  }

  const handleUninstall = (instance: AgentInstance) => {
    Modal.confirm({
      title: `卸载 Agent`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认在以下实例卸载 Agent？</p>
          <p><Text strong>实例：</Text>{instance.instanceName}</p>
          <p><Text strong>实例ID：</Text><Text code>{instance.instanceId}</Text></p>
          <Text type="danger">警告：卸载后将无法监控该实例的进程状态</Text>
        </div>
      ),
      okText: '确认卸载',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setOperatingInstance(instance)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setData((prev) =>
          prev.map((item) =>
            item.instanceId === instance.instanceId
              ? { ...item, installStatus: 'uninstalled' as InstallStatus, online: false, agentVersion: undefined }
              : item,
          ),
        )
        setOperatingInstance(null)
        message.success(`Agent 卸载成功：${instance.instanceName}`)
      },
    })
  }

  const handleUpgrade = (instance: AgentInstance, version?: string) => {
    const targetVersion = version || instance.targetVersion

    Modal.confirm({
      title: `升级 Agent`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认在以下实例升级 Agent？</p>
          <p><Text strong>实例：</Text>{instance.instanceName}</p>
          <p><Text strong>实例ID：</Text><Text code>{instance.instanceId}</Text></p>
          <p><Text strong>当前版本：</Text>{instance.agentVersion || '-'}</p>
          <p><Text strong>目标版本：</Text>{targetVersion}</p>
        </div>
      ),
      okText: '确认升级',
      cancelText: '取消',
      onOk: async () => {
        setOperatingInstance(instance)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setData((prev) =>
          prev.map((item) =>
            item.instanceId === instance.instanceId
              ? { ...item, agentVersion: targetVersion }
              : item,
          ),
        )
        setOperatingInstance(null)
        message.success(`Agent 升级成功：${instance.instanceName} → ${targetVersion}`)
      },
    })
  }

  const getUpgradeMenu = (instance: AgentInstance): MenuProps => ({
    items: agentVersions.map((v) => ({
      key: v.value,
      label: v.label,
      onClick: () => handleUpgrade(instance, v.value),
    })),
  })

  const columns: TableColumnsType<AgentInstance> = [
    {
      title: 'App ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 120,
      render: (appId: string) => <Tag>{appId}</Tag>,
    },
    {
      title: '虚机 ID / 名称',
      key: 'vm',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Button
            type="link"
            onClick={() => handleViewDetail(record)}
            style={{ padding: 0, fontSize: 12, fontFamily: 'monospace', height: 'auto', textAlign: 'left' }}
          >
            {record.instanceId}
          </Button>
          <Text strong>{record.instanceName}</Text>
        </Space>
      ),
    },
    {
      title: '虚机状态',
      dataIndex: 'online',
      key: 'online',
      width: 120,
      render: (online: boolean, record) => {
        if (record.installStatus !== 'installed') {
          return <Text type="secondary">-</Text>
        }
        return <StatusBadge status={online} type="online" />
      },
    },
    {
      title: '内网 IP',
      dataIndex: 'privateIp',
      key: 'privateIp',
      width: 140,
      render: (ip: string) => <Text code style={{ fontSize: 12 }}>{ip}</Text>,
    },
    {
      title: 'Agent 状态',
      dataIndex: 'installStatus',
      key: 'installStatus',
      width: 140,
      render: (status: InstallStatus) => (
        <StatusBadge status={status} type="install" />
      ),
    },
    {
      title: '最后上报',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      width: 180,
      render: (lastSeenAt: string | undefined, record: AgentInstance) => {
        if (record.installStatus !== 'installed') return <Text type="secondary">-</Text>
        const isOffline = !record.online
        return (
          <Text type={isOffline ? 'danger' : 'secondary'} style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {lastSeenAt || '从未'}
          </Text>
        )
      },
    },
    {
      title: 'Agent 版本',
      key: 'version',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>
            当前：<Text code>{record.agentVersion || '-'}</Text>
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            目标：{record.targetVersion}
          </Text>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => {
        const isOperating = operatingInstance?.instanceId === record.instanceId

        if (record.installStatus === 'uninstalled') {
          return (
            <Button
              type="link"
              onClick={() => handleInstall(record)}
              loading={isOperating}
            >
              安装
            </Button>
          )
        }

        if (record.installStatus === 'installed') {
          const needsUpgrade = record.agentVersion !== record.targetVersion

          if (needsUpgrade) {
            // 版本不一致，显示"升级"和"卸载"
            return (
              <Space size={8}>
                  <Button
                  type="link"
                  danger
                  disabled={isOperating}
                  onClick={() => handleUninstall(record)}
                >
                  卸载
                </Button>
                <Button
                  type="link"
                  disabled={isOperating}
                  onClick={() => handleUpgrade(record)}
                >
                  升级
                </Button>
              </Space>
            )
          } else {
            // 版本一致，只显示"卸载"
            return (
              <Button
                type="link"
                danger
                disabled={isOperating}
                onClick={() => handleUninstall(record)}
              >
                卸载
              </Button>
            )
          }
        }

        return null
      },
    },
  ]

  // 显示详情页
  if (selectedInstanceId) {
    return (
      <ProcessAgentInstanceDetail
        instanceId={selectedInstanceId}
        onBack={handleBackToList}
        env={env}
      />
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 页面标题栏 */}
      <Card size="small">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                VM Agent 监控
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 环境切换 Tab */}
      <Tabs
        activeKey={env}
        onChange={handleTabChange}
        items={[
          { key: 'stg', label: '测试环境' },
          { key: 'prod', label: '正式环境' },
        ]}
      />

      {/* 实例列表表格 */}
      <Card
        size="small"
        title={
          <Space>
            <Text strong>实例列表</Text>
            <Text type="secondary">({filteredData.length})</Text>
          </Space>
        }
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              placeholder="搜索实例名称/ID/IP"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ width: 200 }}
            />
            <Select
              mode="multiple"
              placeholder="App ID"
              value={appIdFilter}
              options={mockAppIds}
              onChange={(value) => setAppIdFilter(value)}
              style={{ width: 180 }}
              allowClear
            />
            <Select
              value={installStatusFilter}
              options={installStatusFilterOptions}
              onChange={(value) => setInstallStatusFilter(value as InstallStatusFilter)}
              style={{ width: 120 }}
            />
            <Select
              value={onlineFilter}
              options={onlineFilterOptions}
              onChange={(value) => setOnlineFilter(value as OnlineFilter)}
              style={{ width: 100 }}
            />
            <Select
              placeholder="版本筛选"
              value={versionFilter}
              options={agentVersions}
              onChange={(value) => setVersionFilter(value)}
              style={{ width: 140 }}
              allowClear
            />
          </Space>
        }
      >
        <Table
          rowKey="instanceId"
          columns={columns}
          dataSource={filteredData}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
          size="middle"
          loading={loading}
        />
      </Card>
    </Space>
  )
}
