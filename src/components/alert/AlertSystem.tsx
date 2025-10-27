'use client'

import React, { useState, useMemo } from 'react'
import { Card, Collapse, Table, Button, Switch, Space, Typography, Select, Tooltip } from 'antd'
import { RightOutlined, CloseOutlined, SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { CardProps } from 'antd'

const { Title, Text } = Typography

// 应用告警配置接口
interface AlertConfig {
  id: string
  appName: string
  channel: string
  frequency: string
  enabled: boolean
}

// 模拟告警配置数据
const mockAlertConfigs: AlertConfig[] = [
  {
    id: '60066',
    appName: 'open-platform',
    channel: '钉钉大群消息',
    frequency: '5 分钟',
    enabled: true
  },
  {
    id: '60081',
    appName: 'game',
    channel: '钉钉大群消息',
    frequency: '5 分钟',
    enabled: true
  },
  {
    id: '60086',
    appName: 'testplat',
    channel: '钉钉大群消息',
    frequency: '5 分钟',
    enabled: true
  },
  {
    id: '60087',
    appName: 'test',
    channel: '钉钉大群消息',
    frequency: '5 分钟',
    enabled: true
  },
  {
    id: '90051',
    appName: 'master',
    channel: '钉钉大群消息',
    frequency: '5 分钟',
    enabled: true
  },
  {
    id: '90057',
    appName: 'test-delete-pods',
    channel: '钉钉大群消息',
    frequency: '5 分钟',
    enabled: true
  }
]


export default function AlertSystem(): React.ReactElement {
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>(mockAlertConfigs)

  // 切换告警开关
  const handleToggleAlert = (id: string, enabled: boolean) => {
    setAlertConfigs(prev => 
      prev.map(config => 
        config.id === id ? { ...config, enabled } : config
      )
    )
  }

  // 删除告警配置
  const handleDeleteAlert = (id: string) => {
    setAlertConfigs(prev => prev.filter(config => config.id !== id))
  }

  // 故障报警表格列配置
  const alertColumns: ColumnsType<AlertConfig> = useMemo(() => [
    {
      title: '应用名称',
      dataIndex: 'appName',
      key: 'appName',
      width: 400,
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
            icon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                width="14" 
                height="14"
                style={{ color: 'rgba(0,0,0,0.45)' }}
              >
                <path d="M4.08 5.227A3 3 0 0 1 6.979 3H17.02a3 3 0 0 1 2.9 2.227l2.113 7.926A5.228 5.228 0 0 0 18.75 12H5.25a5.228 5.228 0 0 0-3.284 1.153L4.08 5.227Z"></path>
                <path fillRule="evenodd" d="M5.25 13.5a3.75 3.75 0 1 0 0 7.5h13.5a3.75 3.75 0 1 0 0-7.5H5.25Zm10.5 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm3.75-.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd"></path>
              </svg>
            }
          >
            {appName}
          </Button>
        </Space>
      )
    },
    {
      title: '通知渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 140
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
      width: 120,
      render: (frequency: string) => (
        <Select
          size="small"
          variant="borderless"
          disabled
          value={frequency}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record: AlertConfig) => (
        <Space size={24}>
          <Switch
            checked={record.enabled}
            onChange={(checked) => handleToggleAlert(record.id, checked)}
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
          <Button
            type="link"
            danger
            onClick={() => handleDeleteAlert(record.id)}
            style={{ paddingLeft: 8, paddingRight: 8 }}
          >
            删除
          </Button>
        </Space>
      )
    }
  ], [handleToggleAlert, handleDeleteAlert])

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

  // 标签页配置
  const cardItems: CardProps[] = [
    {
      title: '故障报警',
      extra: (
        <Button icon={<SettingOutlined />}>
          设置
        </Button>
      ),
      children: (
          <Table
            rowKey="id"
            columns={alertColumns}
            dataSource={alertConfigs}
            pagination={false}
            scroll={{ x: 740 }}
            style={{ minWidth: '100%' }}
          />
      )
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

      {/* 主要内容标签页 */}
      {cardItems.map(item => (
        <Card key={item.title as string} title={item.title} extra={item.extra} children={item.children} />
      ))}
    </div>
  )
}
