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
import { Card, Table, Input, Typography, Button, Space, Modal, message, Select, Avatar } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import GameEnvDetail from './GameEnvDetail'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

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
    </Card>
  )
}


