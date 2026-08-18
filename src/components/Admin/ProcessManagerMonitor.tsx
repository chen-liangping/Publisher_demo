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
  Dropdown,
  Segmented,
} from 'antd'
import type { TableColumnsType, MenuProps } from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'

const { Text, Title } = Typography

// ==================== 类型定义 ====================

type VmStatus = 'running' | 'stopped' | 'starting' | 'stopping'
type InstallStatus = 'installed' | 'uninstalled' | 'installing' | 'uninstalling'
type OnlineStatus = 'online' | 'offline'
type AgentVersion = string

interface AgentInstance {
  instanceId: string      // 云厂商 instanceId，如 i-bp1234567890abcdef
  appId: string            // 游戏项目标识
  instanceName: string     // 实例名称
  privateIp: string        // 内网 IP
  installStatus: InstallStatus
  online: boolean          // 最近 30s 内上报过
  lastSeenAt?: string      // 最后上报时间，相对时间格式 "2分钟前"
  agentVersion?: string    // 当前运行的 agent 版本
  targetVersion: string    // 目标版本
  createdAt?: string
}

interface SummaryData {
  totalInstances: number
  installedCount: number
  onlineCount: number
  offlineCount: number
}

// ==================== 常量配置 ====================

const HEARTBEAT_TIMEOUT = 30 // 30s 心跳超时判定离线

const installStatusConfig: Record<
  InstallStatus,
  { text: string; color: string; icon: string }
> = {
  installed: { text: '已安装', color: 'success', icon: '✓' },
  uninstalled: { text: '未安装', color: 'default', icon: '○' },
  installing: { text: '安装中', color: 'processing', icon: '⟳' },
  uninstalling: { text: '卸载中', color: 'processing', icon: '⟳' },
}

const refreshIntervalOptions = [
  { value: 0, label: '关闭' },
  { value: 10, label: '10 秒' },
  { value: 15, label: '15 秒' },
  { value: 30, label: '30 秒' },
]

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
    lastSeenAt: '10秒前',
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
    lastSeenAt: '15秒前',
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
    lastSeenAt: '5秒前',
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
    lastSeenAt: '20秒前',
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
    lastSeenAt: '5分钟前',
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
    lastSeenAt: '8秒前',
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
    lastSeenAt: '2分钟前',
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
    lastSeenAt: '12秒前',
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
    lastSeenAt: '25秒前',
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
    lastSeenAt: '18秒前',
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

// ==================== 主组件 ====================

type Env = 'stg' | 'prod'
type InstallStatusFilter = InstallStatus | 'all'
type OnlineFilter = OnlineStatus | 'all'

export default function ProcessManagerMonitor() {
  // 环境选择（强制）
  const [env, setEnv] = useState<Env | null>(null)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [data, setData] = useState<AgentInstance[]>(mockData)
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [appIdFilter, setAppIdFilter] = useState<string[]>([])
  const [installStatusFilter, setInstallStatusFilter] = useState<InstallStatusFilter>('all')
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all')
  const [versionFilter, setVersionFilter] = useState<string | undefined>()
  const [refreshInterval, setRefreshInterval] = useState(15) // 默认 15 秒
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  // 操作状态
  const [operatingInstance, setOperatingInstance] = useState<AgentInstance | null>(null)
  const [upgradeVersion, setUpgradeVersion] = useState<string>('')

  // 过滤数据
  const filteredData = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return data.filter((item) => {
      // 关键词搜索（实例名称、实例ID、内网IP）
      const matchKeyword =
        !keyword ||
        item.instanceName.toLowerCase().includes(keyword) ||
        item.instanceId.toLowerCase().includes(keyword) ||
        item.privateIp.includes(keyword)

      // appId 筛选
      const matchAppId = appIdFilter.length === 0 || appIdFilter.includes(item.appId)

      // 安装状态筛选
      const matchInstallStatus = installStatusFilter === 'all' || item.installStatus === installStatusFilter

      // 在线状态筛选
      const matchOnline = onlineFilter === 'all' ||
        (onlineFilter === 'online' && item.online) ||
        (onlineFilter === 'offline' && !item.online)

      // 版本筛选
      const matchVersion = !versionFilter || item.agentVersion === versionFilter

      return matchKeyword && matchAppId && matchInstallStatus && matchOnline && matchVersion
    })
  }, [data, searchKeyword, appIdFilter, installStatusFilter, onlineFilter, versionFilter])

  // 汇总数据
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

  // 手动刷新
  const handleRefresh = async () => {
    setLoading(true)
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500))
    setLastRefreshTime(new Date())
    setLoading(false)
    message.success('刷新成功')
  }

  // 自动刷新
  useEffect(() => {
    if (refreshInterval === 0 || !env) return

    const interval = setInterval(() => {
      handleRefresh()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [refreshInterval, env])

  // 环境切换
  const handleEnvChange = (newEnv: Env) => {
    setEnv(newEnv)
    setData([]) // 切换环境清空数据
    setLastRefreshTime(null)
    // 模拟重新拉取数据
    setTimeout(() => {
      setData(mockData)
      setLastRefreshTime(new Date())
    }, 300)
  }

  // Install 操作
  const handleInstall = (instance: AgentInstance) => {
    Modal.confirm({
      title: `安装 Agent`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认在以下实例安装 Agent？</p>
          <p><Text strong>环境：</Text><Tag color={env === 'prod' ? 'red' : 'blue'}>{env?.toUpperCase()}</Tag></p>
          <p><Text strong>实例：</Text>{instance.instanceName}</p>
          <p><Text strong>实例ID：</Text><Text code>{instance.instanceId}</Text></p>
          <p><Text strong>目标版本：</Text>{instance.targetVersion}</p>
        </div>
      ),
      okText: '确认安装',
      cancelText: '取消',
      okButtonProps: { danger: env === 'prod' },
      onOk: async () => {
        setOperatingInstance(instance)
        // 模拟 API 调用
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

  // Uninstall 操作
  const handleUninstall = (instance: AgentInstance) => {
    Modal.confirm({
      title: `卸载 Agent`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认在以下实例卸载 Agent？</p>
          <p><Text strong>环境：</Text><Tag color={env === 'prod' ? 'red' : 'blue'}>{env?.toUpperCase()}</Tag></p>
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
        // 模拟 API 调用
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

  // Upgrade 操作
  const handleUpgrade = (instance: AgentInstance, version?: string) => {
    const targetVersion = version || instance.targetVersion
    setUpgradeVersion(targetVersion)

    Modal.confirm({
      title: `升级 Agent`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认在以下实例升级 Agent？</p>
          <p><Text strong>环境：</Text><Tag color={env === 'prod' ? 'red' : 'blue'}>{env?.toUpperCase()}</Tag></p>
          <p><Text strong>实例：</Text>{instance.instanceName}</p>
          <p><Text strong>实例ID：</Text><Text code>{instance.instanceId}</Text></p>
          <p><Text strong>当前版本：</Text>{instance.agentVersion || '-'}</p>
          <p><Text strong>目标版本：</Text>{targetVersion}</p>
        </div>
      ),
      okText: '确认升级',
      cancelText: '取消',
      okButtonProps: { danger: env === 'prod' },
      onOk: async () => {
        setOperatingInstance(instance)
        // 模拟 API 调用
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

  // 返回列表
  const handleBackToList = () => {
    setSelectedInstanceId(null)
  }

  // 跳转到详情
  const handleViewDetail = (instance: AgentInstance) => {
    setSelectedInstanceId(instance.instanceId)
  }

  // 升级下拉菜单
  const getUpgradeMenu = (instance: AgentInstance): MenuProps => ({
    items: agentVersions.map((v) => ({
      key: v.value,
      label: v.label,
      onClick: () => handleUpgrade(instance, v.value),
    })),
  })

  // 表格列定义
  const columns: TableColumnsType<AgentInstance> = [
    {
      title: '虚机 ID',
      dataIndex: 'instanceId',
      key: 'instanceId',
      width: 200,
      render: (instanceId: string, record) => (
        <Button
          type="link"
          onClick={() => handleViewDetail(record)}
          style={{ padding: 0, fontSize: 12, fontFamily: 'monospace' }}
        >
          {instanceId}
        </Button>
      ),
    },
    {
      title: 'App ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 140,
      render: (appId: string) => <Tag>{appId}</Tag>,
    },
    {
      title: '虚机名称',
      dataIndex: 'instanceName',
      key: 'instanceName',
      width: 160,
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.privateIp}</Text>
        </Space>
      ),
    },
    {
      title: '安装状态',
      dataIndex: 'installStatus',
      key: 'installStatus',
      width: 120,
      render: (status: InstallStatus) => {
        const config = installStatusConfig[status]
        return (
          <Space>
            <span>{config.icon}</span>
            <Tag color={config.color}>{config.text}</Tag>
          </Space>
        )
      },
    },
    {
      title: '在线状态',
      dataIndex: 'online',
      key: 'online',
      width: 120,
      render: (online: boolean, record) => {
        if (record.installStatus !== 'installed') {
          return <Text type="secondary">-</Text>
        }
        return online ? (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Tag color="success">在线</Tag>
          </Space>
        ) : (
          <Space>
            <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
            <Tag color="default">离线</Tag>
          </Space>
        )
      },
    },
    {
      title: '最后上报',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      width: 120,
      render: (lastSeenAt: string, record: any) => {
        if (record.installStatus !== 'installed') return <Text type="secondary">-</Text>
        const isOffline = !record.online
        return (
          <Space>
            <ClockCircleOutlined />
            <Text type={isOffline ? 'danger' : 'secondary'}>{lastSeenAt || '从未'}</Text>
          </Space>
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
      width: 180,
      fixed: 'right',
      render: (_, record) => {
        const isOperating = operatingInstance?.instanceId === record.instanceId

        if (record.installStatus === 'uninstalled') {
          return (
            <Button
              size="small"
              type="primary"
              onClick={() => handleInstall(record)}
              loading={isOperating}
            >
              安装
            </Button>
          )
        }

        if (record.installStatus === 'installed') {
          const needsUpgrade = record.agentVersion !== record.targetVersion
          return (
            <Space size={4}>
              <Button
                size="small"
                disabled={isOperating}
                onClick={() => handleUpgrade(record)}
              >
                升级
              </Button>
              {needsUpgrade && (
                <Tag color="warning" style={{ marginLeft: 4 }}>待升级</Tag>
              )}
              <Button
                size="small"
                danger
                disabled={isOperating}
                onClick={() => handleUninstall(record)}
              >
                卸载
              </Button>
            </Space>
          )
        }

        return null
      },
    },
  ]

  // 显示详情页
  if (selectedInstanceId && env) {
    return (
      <ProcessAgentInstanceDetail
        instanceId={selectedInstanceId}
        onBack={handleBackToList}
        env={env}
      />
    )
  }

  // 未选择环境时的占位页面
  if (!env) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Title level={3}>请先选择环境</Title>
        <Space size={16} style={{ marginTop: 24 }}>
          <Button
            type="primary"
            size="large"
            onClick={() => setEnv('stg')}
          >
            测试环境 (STG)
          </Button>
          <Button
            size="large"
            danger
            onClick={() => setEnv('prod')}
          >
            生产环境 (PROD)
          </Button>
        </Space>
      </div>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 环境指示器 - 醒目常驻 */}
      <Card size="small" style={{ background: env === 'prod' ? '#fff1f0' : '#e6f7ff' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                VM Agent 监控
              </Title>
              <Tag color={env === 'prod' ? 'red' : 'blue'} style={{ fontSize: 14, padding: '4px 12px' }}>
                {env.toUpperCase()} 环境
              </Tag>
              {lastRefreshTime && (
                <Text type="secondary">
                  最后刷新：{lastRefreshTime.toLocaleTimeString()}
                </Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                onClick={() => setEnv(null)}
              >
                切换环境
              </Button>
              <Select
                value={refreshInterval}
                options={refreshIntervalOptions}
                onChange={(value) => setRefreshInterval(value)}
                style={{ width: 100 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 概览卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">总实例数</Text>
              <Title level={3} style={{ margin: 0 }}>
                {summary.totalInstances}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">已安装</Text>
              <Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                {summary.installedCount}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">在线</Text>
              <Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                {summary.onlineCount}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">离线</Text>
              <Title
                level={3}
                style={{ margin: 0, color: summary.offlineCount > 0 ? '#cf1322' : '#389e0d' }}
              >
                {summary.offlineCount}
              </Title>
            </Space>
          </Card>
        </Col>
      </Row>

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
          scroll={{ x: 1300 }}
          size="middle"
          loading={loading}
        />
      </Card>
    </Space>
  )
}
