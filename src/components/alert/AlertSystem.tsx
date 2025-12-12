'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Card, Collapse, Table, Button, Switch, Space, Typography, Select, Tooltip, Drawer, Dropdown } from 'antd'
import { RightOutlined, CloseOutlined, SettingOutlined, QuestionCircleOutlined, DownOutlined } from '@ant-design/icons'
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
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>(mockAlertConfigs)
  const [configDrawerOpen, setConfigDrawerOpen] = useState<boolean>(false)
  const [editingConfigs, setEditingConfigs] = useState<AlertConfig[]>(mockAlertConfigs)
  // 模拟的告警参与者：人员 + 机器人（参考“消息配置”中的配置）
  const [actors] = useState<AlertActor[]>([
    { id: 'person_slime', name: 'slime', kind: 'person' },
    { id: 'person_xuyin', name: '徐音',  kind: 'person' },
    { id: 'webhook_kumo', name: '小包', kind: 'webhook' }
  ])
  // 每个应用 x 参与者的开关矩阵
  const [actorMatrix, setActorMatrix] = useState<Record<string, Record<string, boolean>>>({})

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

  // 获取某个应用在某个参与者上的开关状态
  const getActorCheckedForApp = useCallback(
    (appId: string, actorId: string): boolean => {
      return actorMatrix[appId]?.[actorId] ?? false
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

  // 跳转到“人员配置”页面的“消息配置”Tab
  const handleGoToAlertPage = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('menu', 'people-config')
    params.set('tab', 'message-config')
    const url = `${pathname}?${params.toString()}`
    router.push(url)
  }, [pathname, router, searchParams])

  // 在抽屉中新增一条配置
  const handleAddConfigRow = useCallback(() => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setEditingConfigs(prev => [
      ...prev,
      {
        id,
        appName: '',
        channel: '钉钉大群消息',
        frequency: '5 分钟',
        enabled: true
      }
    ])
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

    // 动态追加“通知渠道参与者”列：每个人/每个 webhook 一列带开关
    const actorCols: ColumnsType<AlertConfig> = actors.map(actor => ({
      title: actor.name,
      key: `actor_${actor.id}`,
      width: 100,
      render: (_: unknown, record: AlertConfig) => (
        <Switch
          checked={getActorCheckedForApp(record.id, actor.id)}
          onChange={checked => handleToggleActorForApp(record.id, actor.id, checked)}
          checkedChildren="on"
          unCheckedChildren="off"
        />
      )
    }))

    return [...base, ...actorCols]
  }, [actors, frequencyOptions, handleChangeFrequencyInline, handleDeleteAlert, getActorCheckedForApp, handleToggleActorForApp])

  // FAQ 数据
  const faqItems = [
    {
      key: 'people-config',
      label: '什么是人员配置？',
      children: (
        <div>
          <Text>人员配置用于管理接收告警通知的人员信息，包括钉钉账号等联系方式。当系统检测到异常时，会向配置的人员发送通知。</Text>
        </div>
      ),
      extra: <CloseOutlined />
    },
    {
      key: 'fault-alert',
      label: '什么是故障报警？',
      children: (
        <div>
          <Text>故障报警是系统自动监测应用运行状态的功能。当检测到应用异常、服务中断或性能问题时，系统会立即向相关人员发送告警通知，帮助团队快速响应和处理问题。</Text>
        </div>
      ),
      extra: <CloseOutlined />
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      
      {/* 页面标题和描述 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 16, paddingBottom: 16 }}>
          <Title level={1} style={{ marginBottom: 4, fontSize: 22 }}>
            告警系统
          </Title>
          <Text type="secondary">
            告警系统用于在游戏部署中监测运行状态，发现异常时向相关人员发送警报，帮助团队及时处理问题，减少对玩家的影响。
          </Text>
        </div>

        {/* 分割线 */}
        <div style={{ borderTop: '1px solid #f0f0f0', margin: 0 }} />

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

        <Collapse
          ghost
          expandIcon={({ isActive }) => (
            <RightOutlined rotate={isActive ? 90 : 0} />
          )}
          style={{ 
            paddingInline: 24, 
            paddingBlock: 12, 
            borderBottom: 'none',
            borderRadius: 0 
          }}
          items={faqItems.slice(1, 2)} // 只显示第二个FAQ
        />
      </Card>

      {/* 主要内容 - 故障报警 */}
      <Card 
        title="故障报警"
        extra={
          <Button type="link" onClick={handleGoToAlertPage}>
            更多告警配置
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={alertColumns}
          dataSource={alertConfigs}
          pagination={false}
          scroll={{ x: 740 }}
          style={{ minWidth: '100%' }}
        />
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
    </div>
  )
}
