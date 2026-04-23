'use client'

/**
 * 这段代码实现了「平台游戏列表视图」，用于按 appId 查看测试/正式环境的基础开通状态，
 * 并在同一个菜单内在「列表视图 / 详情视图」之间切换（不做路由跳转）。
 *
 * 在同一个菜单中采用 VirtualMachineList 相同的交互模式：
 * - 默认展示「平台游戏」
 * - 点击某一行的 App ID 后，切换为「环境详情页」
 * - 详情页顶部提供「返回列表」按钮，回到列表视图
 *
 * 备注：数据均为前端 mock，用于原型展示。
 */

import React, { useState } from 'react'
import { Card, Table, Input, Typography, Button, Space, Modal, message, Select, Avatar, Radio, Progress, Alert } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import GameEnvDetail from './GameEnvDetail'
import { PlusOutlined, CheckOutlined, FileSearchOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

// 资源盘点相关类型
interface ResourceItem {
  id: string
  name: string
  category: string
  type: string
  count: number
  details?: string[]
}

interface ResourceInventory {
  gameId: string
  appId: string
  environment: 'test' | 'prod'
  deployType: 'vm' | 'container' | ''
  resources: ResourceItem[]
  totalCount: number
}

// 环境配置类型（保留以便后续扩展，目前仅在 Game 类型中使用）
interface EnvironmentConfig {
  clientResource: boolean
  serverResource: boolean
  globalAcceleration: boolean
  grafanaConfig?: boolean
  initStatus: 'completed' | 'not_initialized'
  deployType: 'vm' | 'cloud-native' | ''
}

const deployTypeLabel: Record<EnvironmentConfig['deployType'], string> = {
  vm: '云虚拟机部署',
  'cloud-native': '云原生部署',
  '': '-'
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${active ? '#52c41a' : '#d9d9d9'}`,
        background: active ? '#52c41a' : 'transparent',
        color: active ? '#fff' : 'transparent',
        flex: '0 0 auto'
      }}
      aria-label={active ? 'enabled' : 'disabled'}
    >
      {active ? <CheckOutlined style={{ fontSize: 10, lineHeight: 1 }} /> : null}
    </span>
  )
}

function EnvStatusBlock({
  clientEnabled,
  serverEnabled
}: {
  clientEnabled: boolean
  serverEnabled: boolean
}) {
  return (
    <Space direction="vertical" size={6}>
      <Space size={8}>
        <StatusDot active={clientEnabled} />
        <Text type="secondary">客户端</Text>
      </Space>
      <Space size={8}>
        <StatusDot active={serverEnabled} />
        <Text type="secondary">服务端</Text>
      </Space>
    </Space>
  )
}

// 游戏数据类型定义（列表只用到部分字段，其他字段为后续扩展保留）
interface Game {
  id: string
  appId: string
  description: string
  testEnv: EnvironmentConfig
  prodEnv: EnvironmentConfig
  globalMonitoring: { grafanaConfig: boolean; cdnConfig: boolean }
  aliyunAccountName: string
  mseInstanceType: 'dedicated' | 'shared'
  createTime: string
  // 生产环境资源限额汇总（用于当前列表展示）
  prodQuotaSummary?: string
  // 是否支持自动开服配置 / 自动回退（当前列表展示用）
  autoStartRollbackSupported?: boolean
}

// 环境配置精简列表的行类型
interface EnvListRow {
  key: string
  appId: string
  description: string
  serverDeployType: EnvironmentConfig['deployType']
  testClientEnabled: boolean
  testServerEnabled: boolean
  prodClientEnabled: boolean
  prodServerEnabled: boolean
  aliyunAccountName: string
  mseInstanceType: Game['mseInstanceType']
}


const aliyunAccountOptions: Array<{ label: string; value: string }> = [
  { label: 'g123-jp', value: 'g123-jp' },
  { label: 'cp-g123', value: 'cp-g123' }
]

// 获取游戏资源清单（用于资源盘点）
const getGameResources = (appId: string, environment: 'test' | 'prod', deployType: 'vm' | 'container' | ''): ResourceItem[] => {
  const envPrefix = environment === 'test' ? 'test' : 'prod'
  const isProd = environment === 'prod'
  
  // AWS 资源（所有部署类型都有）
  const awsResources: ResourceItem[] = [
    { 
      id: 'aws-iam', 
      name: 'IAM', 
      type: 'IAM User',
      category: 'AWS', 
      count: 1,
      details: [`${appId}-${envPrefix}-user`]
    },
    { 
      id: 'aws-cloudfront', 
      name: 'CloudFront', 
      type: 'CDN 分发',
      category: 'AWS', 
      count: isProd ? 2 : 1,
      details: isProd 
        ? [`${appId}-${envPrefix}-main-dist`, `${appId}-${envPrefix}-backup-dist`]
        : [`${appId}-${envPrefix}-distribution`]
    },
    { 
      id: 'aws-s3', 
      name: 'S3', 
      type: 'S3 Bucket',
      category: 'AWS', 
      count: isProd ? 4 : 2,
      details: isProd 
        ? [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-logs`, `${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-temp`]
        : [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-logs`]
    },
    { 
      id: 'aws-route53', 
      name: 'Route53', 
      type: 'DNS 记录',
      category: 'AWS', 
      count: isProd ? 3 : 2,
      details: isProd 
        ? [`${appId}-${envPrefix}.example.com`, `api-${appId}-${envPrefix}.example.com`, `cdn-${appId}-${envPrefix}.example.com`]
        : [`${appId}-${envPrefix}.example.com`, `api-${appId}-${envPrefix}.example.com`]
    }
  ]

  // 阿里云基础资源
  const aliBaseResources: ResourceItem[] = [
    { 
      id: 'ali-ram', 
      name: 'RAM', 
      type: 'RAM User',
      category: 'AliCloud', 
      count: 2,
      details: [`${appId}-${envPrefix}-oss-user`, `${appId}-${envPrefix}-ecs-user`]
    },
    { 
      id: 'ali-tair', 
      name: 'Tair', 
      type: 'Redis 缓存',
      category: 'AliCloud', 
      count: isProd ? 3 : 2,
      details: isProd 
        ? [`${appId}-${envPrefix}-session`, `${appId}-${envPrefix}-data`, `${appId}-${envPrefix}-cache`]
        : [`${appId}-${envPrefix}-session`, `${appId}-${envPrefix}-data`]
    },
    { 
      id: 'ali-oss', 
      name: 'OSS', 
      type: 'OSS Bucket',
      category: 'AliCloud', 
      count: isProd ? 3 : 2,
      details: isProd 
        ? [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-logs`]
        : [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-backup`]
    }
  ]

  if (deployType === 'vm') {
    // VM 部署架构资源
    const vmResources: ResourceItem[] = [
      { 
        id: 'ali-ecs', 
        name: 'ECS', 
        type: '虚拟机实例',
        category: 'AliCloud', 
        count: isProd ? 6 : 3,
        details: isProd 
          ? [`${appId}-${envPrefix}-app-01`, `${appId}-${envPrefix}-app-02`, `${appId}-${envPrefix}-app-03`, `${appId}-${envPrefix}-gateway-01`, `${appId}-${envPrefix}-gateway-02`, `${appId}-${envPrefix}-monitor`]
          : [`${appId}-${envPrefix}-app-01`, `${appId}-${envPrefix}-gateway-01`, `${appId}-${envPrefix}-monitor`]
      },
      { 
        id: 'ali-clb', 
        name: 'CLB', 
        type: '经典负载均衡',
        category: 'AliCloud', 
        count: isProd ? 2 : 1,
        details: isProd 
          ? [`${appId}-${envPrefix}-app-clb`, `${appId}-${envPrefix}-gateway-clb`]
          : [`${appId}-${envPrefix}-main-clb`]
      }
    ]
    return [...awsResources, ...aliBaseResources, ...vmResources]
  } else if (deployType === 'container') {
    // 云原生 Kubernetes 资源
    const k8sResources: ResourceItem[] = [
      { 
        id: 'k8s-deployment', 
        name: 'K8sDeployment', 
        type: 'Deployment',
        category: 'Kubernetes', 
        count: isProd ? 8 : 5,
        details: isProd 
          ? [`${appId}-${envPrefix}-server`, `${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-worker`, `${appId}-${envPrefix}-scheduler`, `${appId}-${envPrefix}-monitor`]
          : [`${appId}-${envPrefix}-server`, `${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-worker`]
      },
      { 
        id: 'k8s-service', 
        name: 'K8sService', 
        type: 'Service 服务',
        category: 'Kubernetes', 
        count: isProd ? 8 : 5,
        details: isProd 
          ? [`${appId}-${envPrefix}-server-svc`, `${appId}-${envPrefix}-gateway-svc`, `${appId}-${envPrefix}-worker-svc`]
          : [`${appId}-${envPrefix}-server-svc`, `${appId}-${envPrefix}-gateway-svc`]
      },
      { 
        id: 'k8s-configmap', 
        name: 'K8sConfigMap', 
        type: 'ConfigMap 配置',
        category: 'Kubernetes', 
        count: isProd ? 6 : 4,
        details: isProd 
          ? [`${appId}-${envPrefix}-app-config`, `${appId}-${envPrefix}-db-config`, `${appId}-${envPrefix}-cache-config`]
          : [`${appId}-${envPrefix}-app-config`, `${appId}-${envPrefix}-db-config`]
      }
    ]

    return [...awsResources, ...aliBaseResources, ...k8sResources]
  }

  // 默认返回基础资源
  return [...awsResources, ...aliBaseResources]
}

// 模拟游戏数据：仅用于前端原型
const mockGameData: Game[] = [
  {
    id: 'game-001',
    appId: 'gamedemo',
    description: '示例游戏应用',
    globalMonitoring: { grafanaConfig: true, cdnConfig: false },
    aliyunAccountName: 'g123-jp',
    mseInstanceType: 'dedicated',
    testEnv: {
      clientResource: true,
      serverResource: true,
      globalAcceleration: false,
      grafanaConfig: false,
      initStatus: 'completed',
      deployType: 'vm'
    },
    prodEnv: {
      clientResource: true,
      serverResource: true,
      globalAcceleration: true,
      grafanaConfig: false,
      initStatus: 'completed',
      deployType: 'vm'
    },
    createTime: '2024-01-15 10:30:00',
    prodQuotaSummary: '内存 256GB / CPU 64C / MySQL 2 / Mongo 1 / Redis 2 / ZK 1',
    autoStartRollbackSupported: true
  },
  {
    id: 'game-002',
    appId: 'testgame',
    description: '测试游戏',
    globalMonitoring: { grafanaConfig: false, cdnConfig: false },
    aliyunAccountName: 'cp-g123',
    mseInstanceType: 'dedicated',
    testEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      grafanaConfig: false,
      initStatus: 'not_initialized',
      deployType: 'cloud-native'
    },
    prodEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      grafanaConfig: false,
      initStatus: 'not_initialized',
      deployType: 'cloud-native'
    },
    createTime: '2024-01-14 15:20:00',
    prodQuotaSummary: '内存 128GB / CPU 4C / MySQL 1 / Mongo 0 / Redis 1 / ZK 0',
    autoStartRollbackSupported: false
  },
  {
    id: 'game-003',
    appId: 'rpgworld',
    description: 'RPG世界',
    globalMonitoring: { grafanaConfig: true, cdnConfig: true },
    aliyunAccountName: 'g123-jp',
    mseInstanceType: 'shared',
    testEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      grafanaConfig: false,
      initStatus: 'completed',
      deployType: 'vm'
    },
    prodEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      grafanaConfig: false,
      initStatus: 'not_initialized',
      deployType: 'vm'
    },
    createTime: '2024-01-13 09:15:00',
    prodQuotaSummary: '内存 128GB / CPU 4C / MySQL 1 / Mongo 1 / Redis 1 / ZK 0',
    autoStartRollbackSupported: false
  }
]


export default function GameManagement() {
  const [games, setGames] = useState<Game[]>(mockGameData)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false)
  const [newAppId, setNewAppId] = useState('')
  const [selectedAliyunAccountName, setSelectedAliyunAccountName] = useState<string>(
    aliyunAccountOptions[0]?.value ?? 'g123-jp'
  )
  const [selectedMseInstanceType, setSelectedMseInstanceType] = useState<Game['mseInstanceType']>(
    'dedicated'
  )

  // 资源盘点相关状态
  const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false)
  const [selectedGameForInventory, setSelectedGameForInventory] = useState<Game | null>(null)
  const [selectedEnvironment, setSelectedEnvironment] = useState<'test' | 'prod'>('test')
  const [inventoryData, setInventoryData] = useState<ResourceInventory | null>(null)
  const [isInventoryLoading, setIsInventoryLoading] = useState(false)


  const createInitEnv = (): EnvironmentConfig => ({
    clientResource: false,
    serverResource: false,
    globalAcceleration: false,
    grafanaConfig: false,
    initStatus: 'not_initialized',
    deployType: ''
  })

  const handleAddGame = (): void => {
    const trimmed = newAppId.trim()
    if (!trimmed) {
      message.warning('请输入 appId')
      return
    }
    if (games.some(game => game.appId === trimmed)) {
      message.warning('该 appId 已存在')
      return
    }
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const envTemplate = createInitEnv()
    setGames(prev => [
      {
        id: `game-${Date.now()}`,
        appId: trimmed,
        description: '新建游戏，待补充描述',
        globalMonitoring: { grafanaConfig: false, cdnConfig: false },
        aliyunAccountName: selectedAliyunAccountName,
        mseInstanceType: selectedMseInstanceType,
        testEnv: { ...envTemplate },
        prodEnv: { ...envTemplate },
        createTime: now,
        prodQuotaSummary: '待配置资源',
        autoStartRollbackSupported: false
      },
      ...prev
    ])
    setNewAppId('')
    setSelectedAliyunAccountName(aliyunAccountOptions[0]?.value ?? 'g123-jp')
    setSelectedMseInstanceType('dedicated')
    setIsAddModalVisible(false)
    message.success('已新增游戏')
  }

  // 开始资源盘点
  const handleStartInventory = (game: Game): void => {
    setSelectedGameForInventory(game)
    setSelectedEnvironment('test')
    setInventoryData(null)
    setIsInventoryModalVisible(true)
  }

  // 执行资源盘点
  const handleExecuteInventory = (): void => {
    if (!selectedGameForInventory) return

    setIsInventoryLoading(true)
    
    // 模拟盘点过程
    setTimeout(() => {
      const envConfig = selectedEnvironment === 'test' ? selectedGameForInventory.testEnv : selectedGameForInventory.prodEnv
      const deployType = envConfig.deployType as 'vm' | 'container' | ''
      const resources = getGameResources(selectedGameForInventory.appId, selectedEnvironment, deployType)
      const totalCount = resources.reduce((sum, resource) => sum + resource.count, 0)
      
      const inventory: ResourceInventory = {
        gameId: selectedGameForInventory.id,
        appId: selectedGameForInventory.appId,
        environment: selectedEnvironment,
        deployType,
        resources,
        totalCount
      }
      
      setInventoryData(inventory)
      setIsInventoryLoading(false)
      message.success(`${selectedEnvironment === 'test' ? '测试' : '正式'}环境资源盘点完成`)
    }, 2000)
  }

  // 关闭资源盘点弹窗
  const handleCloseInventory = (): void => {
    setIsInventoryModalVisible(false)
    setSelectedGameForInventory(null)
    setInventoryData(null)
    setIsInventoryLoading(false)
  }

  // 搜索关键字（按 appId 过滤）
  const [keyword, setKeyword] = useState<string>('')

  // 过滤后的游戏数据
  const filteredGames = games.filter(game =>
    game.appId.toLowerCase().includes(keyword.toLowerCase())
  )

  // 当前选中的游戏（用于切换到 GameEnvDetail）
  const [selectedGame, setSelectedGame] = useState<{
    appId: string
    description?: string
    aliyunAccountName: string
    mseInstanceType: Game['mseInstanceType']
  } | null>(null)

  // 列表行数据：从游戏数据映射而来
  const envListData: EnvListRow[] = filteredGames.map(game => ({
    key: game.id,
    appId: game.appId,
    description: game.description,
    serverDeployType: game.prodEnv.deployType,
    testClientEnabled: game.testEnv.clientResource,
    testServerEnabled: game.testEnv.serverResource,
    prodClientEnabled: game.prodEnv.clientResource,
    prodServerEnabled: game.prodEnv.serverResource,
    aliyunAccountName: game.aliyunAccountName,
    mseInstanceType: game.mseInstanceType
  }))

  const handleEnterConfig = (record: EnvListRow): void => {
    // 让列表中的「进入配置」按钮复用 selectedGame 逻辑，保持在当前菜单展示详情页
    setSelectedGame({
      appId: record.appId,
      description: record.description,
      aliyunAccountName: record.aliyunAccountName,
      mseInstanceType: record.mseInstanceType
    })
  }

  // 列定义：App ID + 部署方式 + 测试/正式环境（客户端/服务端状态）
  const envColumns: ColumnsType<EnvListRow> = [
    {
      title: 'App ID',
      dataIndex: 'appId',
      width: 260,
      render: (_value, record) => (
        <Space size={12}>
          <Avatar
            shape="square"
            size={32}
            style={{
              borderRadius: 8,
              background: '#f5f5f5',
              color: '#595959',
              fontWeight: 700
            }}
          >
            {record.appId.slice(0, 1).toUpperCase()}
          </Avatar>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <Button type="link" style={{ padding: 0, height: 20 }} onClick={() => handleEnterConfig(record)}>
              {record.appId}
            </Button>
          </div>
        </Space>
      )
    },
    {
      title: '部署方式',
      dataIndex: 'serverDeployType',
      width: 220,
      render: (deployType: EnvironmentConfig['deployType']) => (
        <Text type={deployType ? undefined : 'secondary'}>{deployTypeLabel[deployType]}</Text>
      )
    },
    {
      title: '测试环境',
      key: 'testEnv',
      width: 220,
      render: (_value, record) => (
        <EnvStatusBlock clientEnabled={record.testClientEnabled} serverEnabled={record.testServerEnabled} />
      )
    },
    {
      title: '正式环境',
      key: 'prodEnv',
      width: 220,
      render: (_value, record) => (
        <EnvStatusBlock clientEnabled={record.prodClientEnabled} serverEnabled={record.prodServerEnabled} />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_value, record) => {
        const game = games.find(g => g.appId === record.appId)
        if (!game) return null
        
        return (
          <Space size={8}>
            <Button 
              type="text" 
              icon={<FileSearchOutlined />} 
              size="small"
              onClick={() => handleStartInventory(game)}
              title="资源盘点"
            >
              盘点
            </Button>
          </Space>
        )
      }
    }
  ]

  // 详情视图：参考 VirtualMachineList 的 selectedVm 逻辑
  if (selectedGame) {
    return (
      <GameEnvDetail
        appId={selectedGame.appId}
        description={selectedGame.description}
        aliyunAccountName={selectedGame.aliyunAccountName}
        mseInstanceType={selectedGame.mseInstanceType}
        onBack={() => setSelectedGame(null)}
      />
    )
  }

  // 列表视图
  return (
    <Card>
      {/* 顶部：标题 + 筛选 + 新增 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Title level={4} style={{ margin: 0 }}>
            平台游戏
          </Title>
          <Select
            value={keyword || 'ALL'}
            onChange={v => setKeyword(v === 'ALL' ? '' : v)}
            style={{ width: 160 }}
            options={[
              { label: '全部游戏', value: 'ALL' },
              ...Array.from(new Set(games.map(g => g.appId))).map(appId => ({ label: appId, value: appId }))
            ]}
          />
        </div>
        <Button onClick={() => setIsAddModalVisible(true)} type="primary" icon={<PlusOutlined />}>
          添加游戏
        </Button>
      </div>

      {/* 列表本体 */}
      <Table<EnvListRow>
        columns={envColumns}
        dataSource={envListData}
        size="middle"
        pagination={{ pageSize: 10 }}
        rowKey="key"
        scroll={{ x: 920 }}
      />

      <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
        点击 App ID 可在当前菜单内进入环境详情页，继续配置测试 / 正式环境资源与策略。
      </Text>

      <Modal
        title="新增游戏"
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false)
          setNewAppId('')
          setSelectedAliyunAccountName(aliyunAccountOptions[0]?.value ?? 'g123-jp')
          setSelectedMseInstanceType('dedicated')
        }}
        onOk={handleAddGame}
        okText="提交"
        cancelText="取消"
        destroyOnHidden
      >
        <Input
          value={newAppId}
          onChange={e => setNewAppId(e.target.value)}
          placeholder="请输入 appId"
        />
        <div style={{ height: 12 }} />
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
          阿里云账号
        </div>
        <Select
          value={selectedAliyunAccountName}
          onChange={v => setSelectedAliyunAccountName(v)}
          options={aliyunAccountOptions}
          style={{ width: '100%' }}
        />
        <div style={{ height: 12 }} />
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
          MSE 实例类型
        </div>
        <Select
          value={selectedMseInstanceType}
          onChange={v => setSelectedMseInstanceType(v)}
          options={[
            { label: '独占实例', value: 'dedicated' },
            { label: '共享实例', value: 'shared' }
          ]}
          style={{ width: '100%' }}
        />
      </Modal>

      {/* 资源盘点弹窗 */}
      <Modal
        title={`资源盘点 - ${selectedGameForInventory?.appId || ''}`}
        open={isInventoryModalVisible}
        onCancel={handleCloseInventory}
        footer={
          inventoryData ? (
            <Button type="primary" onClick={handleCloseInventory}>
              关闭
            </Button>
          ) : (
            <Space>
              <Button onClick={handleCloseInventory}>取消</Button>
              <Button 
                type="primary" 
                onClick={handleExecuteInventory}
                loading={isInventoryLoading}
                disabled={!selectedGameForInventory}
              >
                开始盘点
              </Button>
            </Space>
          )
        }
        width={700}
        destroyOnHidden
      >
        {!inventoryData ? (
          <div>
            <Alert
              message="资源盘点"
              description={`将统计游戏 ${selectedGameForInventory?.appId} 在指定环境中的所有资源使用情况，包括云服务、存储、网络配置等。`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <Text strong>选择盘点环境：</Text>
              <div style={{ marginTop: 8 }}>
                <Radio.Group 
                  value={selectedEnvironment} 
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                >
                  <Radio value="test">测试环境</Radio>
                  <Radio value="prod">正式环境</Radio>
                </Radio.Group>
              </div>
            </div>

            {selectedGameForInventory && (
              <div style={{ 
                padding: 12, 
                background: '#f5f5f5', 
                borderRadius: 6,
                marginBottom: 16
              }}>
                <div><Text strong>游戏信息：</Text></div>
                <div style={{ marginTop: 4 }}>
                  <Text>App ID: {selectedGameForInventory.appId}</Text>
                </div>
                <div>
                  <Text>部署方式: {deployTypeLabel[
                    (selectedEnvironment === 'test' ? selectedGameForInventory.testEnv : selectedGameForInventory.prodEnv).deployType
                  ]}</Text>
                </div>
                <div>
                  <Text>创建时间: {selectedGameForInventory.createTime}</Text>
                </div>
              </div>
            )}

            {isInventoryLoading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Progress type="circle" percent={66} size={80} />
                <div style={{ marginTop: 12 }}>
                  <Text>正在盘点资源...</Text>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Alert
              message={`${inventoryData.environment === 'test' ? '测试' : '正式'}环境资源盘点完成`}
              description={`共发现 ${inventoryData.totalCount} 个资源实例，分布在 ${inventoryData.resources.length} 个资源类型中。`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <Text strong>资源汇总统计：</Text>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {['AWS', 'AliCloud', 'Kubernetes'].map(category => {
                    const categoryResources = inventoryData.resources.filter(r => r.category === category)
                    const categoryCount = categoryResources.reduce((sum, r) => sum + r.count, 0)
                    return (
                      <div key={category} style={{ 
                        padding: 8, 
                        background: '#fafafa', 
                        borderRadius: 4,
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: 500 }}>{category}</div>
                        <div style={{ fontSize: 18, color: '#1890ff', fontWeight: 600 }}>
                          {categoryCount}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {categoryResources.length} 类型
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>资源详情列表：</Text>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
                {inventoryData.resources.map(resource => (
                  <div 
                    key={resource.id}
                    style={{
                      padding: '12px',
                      marginBottom: 8,
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 500, fontSize: 14 }}>{resource.name}</span>
                          <span style={{ 
                            background: '#e6f7ff', 
                            padding: '2px 6px', 
                            borderRadius: 4, 
                            fontSize: 11,
                            color: '#1890ff'
                          }}>
                            {resource.count} 个
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                          {resource.category} · {resource.type}
                        </div>
                        {resource.details && (
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {resource.details.slice(0, 2).map((detail, index) => (
                              <div key={index} style={{ marginBottom: 1 }}>• {detail}</div>
                            ))}
                            {resource.details.length > 2 && (
                              <div style={{ fontStyle: 'italic' }}>... 等 {resource.details.length} 个实例</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}


