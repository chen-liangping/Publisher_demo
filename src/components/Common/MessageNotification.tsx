'use client'

import React, { useState, useMemo } from 'react'
import { Card, Space, Table, Tag, Typography, Input, DatePicker, Tabs, Button, Divider } from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { 
  SearchOutlined, 
  BellOutlined, 
  NotificationOutlined, 
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { BUSINESS_DEFAULT_PAGINATION } from './GlobalPagination'
import AlertPage from '../alert/alert'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

// 系统公告数据类型
interface SystemAnnouncement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  time: string
  read: boolean
}

// 告警消息数据类型（复用alert_history的HistoryRecord）
interface AlertMessage {
  id: string
  type: string // 告警类型（告警项）
  content: string // 消息内容
  channels: string[] // 通知渠道：自建群机器人名称、小包
  people: string[] // 相关人员名称
  time: string // 时间（ISO 或可读字符串）
}

// 模拟系统公告数据
const mockAnnouncements: SystemAnnouncement[] = [
  {
    id: '1',
    title: '系统维护通知',
    content: '系统将于2025年10月25日凌晨2:00-4:00进行例行维护，期间可能影响部分功能使用，请提前做好相关准备。',
    type: 'warning',
    time: '2025-10-23 14:30:00',
    read: false
  },
  {
    id: '2', 
    title: '新功能上线',
    content: 'HPA弹性伸缩功能已正式上线，支持基于CPU和内存指标的自动扩缩容，欢迎体验使用。',
    type: 'success',
    time: '2025-10-22 10:15:00',
    read: true
  },
  {
    id: '3',
    title: '安全提醒',
    content: '请定期更新您的访问密钥，建议每90天更换一次，确保账户安全。',
    type: 'info',
    time: '2025-10-21 16:45:00',
    read: true
  },
  {
    id: '4',
    title: '紧急通知',
    content: '检测到异常访问行为，已自动启用安全防护，如有疑问请联系管理员。',
    type: 'error',
    time: '2025-10-20 09:20:00',
    read: false
  }
]

// 模拟告警消息数据（从alert_history复制）
const allMessageTypes: string[] = [
  // 客户端
  '客户端创建新版本', '客户端版本切换', '翻译文本同步CDN失败',
  'S3 zip解压成功', 'S3 zip解压失败', 'flashlaunch静态资源计算阻塞', 'oss配置文件变更',
  // 服务端
  '自动开服成功', '自动开服失败', '通知CP新预备服失败', '预备服部署失败', '自动开服执行计划获取失败', '自动开服策略变更',
  '服务端部署失败', '服务端部署成功',
  '灰度回滚', '灰度回滚完成', '追加灰度', '灰度追加完成', '灰度全量部署',
  'pod健康检查失败', 'Pod故障', 'Pod更新异常',
  // CDN
  'CDN部署成功', 'CDN部署失败'
]

const buildMockAlertMessages = (): AlertMessage[] => {
  const baseTime = new Date('2025-08-20T10:00:00').getTime()
  return allMessageTypes.map((t, idx) => {
    const fail = t.includes('失败')
    const success = t.includes('成功')
    const channels: string[] = fail ? ['kumo_webhook', '小包'] : ['kumo_webhook']
    const people = fail ? ['徐音', 'slime'] : (success ? ['slime'] : [])
    const time = new Date(baseTime + idx * 7 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const content = success
      ? `${t}：操作已完成，系统运行正常`
      : fail
        ? `${t}：请查看日志与错误码，及时处理`
        : `${t}：已触发事件，系统已记录`
    return {
      id: String(idx + 1),
      type: t,
      content,
      channels,
      people,
      time
    }
  })
}

export default function MessageNotification(): React.ReactElement {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(mockAnnouncements)
  const [keyword, setKeyword] = useState<string>('')
  const [range, setRange] = useState<[string | null, string | null]>([null, null])
  
  const alertMessages = useMemo(() => buildMockAlertMessages(), [])

  // 系统公告表格列定义
  const announcementColumns: ColumnsType<SystemAnnouncement> = useMemo(() => [
    {
      title: '状态',
      dataIndex: 'read',
      key: 'read',
      width: 80,
      render: (read: boolean) => (
        read ? (
          <Tag bordered={false} color="default">已读</Tag>
        ) : (
          <Tag bordered={false} color="red">未读</Tag>
        )
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: SystemAnnouncement['type']) => {
        const config = {
          info: { icon: <InfoCircleOutlined />, color: 'blue', text: '信息' },
          warning: { icon: <ExclamationCircleOutlined />, color: 'orange', text: '警告' },
          success: { icon: <CheckCircleOutlined />, color: 'green', text: '成功' },
          error: { icon: <ExclamationCircleOutlined />, color: 'red', text: '错误' }
        }[type]
        return (
          <Tag bordered={false} color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: SystemAnnouncement) => (
        <Text strong={!record.read}>{title}</Text>
      )
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      sorter: (a: SystemAnnouncement, b: SystemAnnouncement) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: SystemAnnouncement) => (
        <Space>
          {!record.read && (
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                setAnnouncements(prev => 
                  prev.map(item => 
                    item.id === record.id ? { ...item, read: true } : item
                  )
                )
              }}
            >
              标记已读
            </Button>
          )}
        </Space>
      )
    }
  ], [])

  // 告警消息表格列定义（复用alert_history的逻辑）
  const alertColumns: ColumnsType<AlertMessage> = useMemo(() => [
    {
      title: '告警类型',
      dataIndex: 'type',
      key: 'type',
      width: 200,
      render: (type: string) => {
        const isError = type.includes('失败') || type.includes('故障') || type.includes('异常')
        const isSuccess = type.includes('成功')
        const color = isError ? 'red' : isSuccess ? 'green' : 'blue'
        return <Tag bordered={false} color={color}>{type}</Tag>
      }
    },
    {
      title: '消息内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true
    },
    {
      title: '通知渠道',
      dataIndex: 'channels',
      key: 'channels',
      width: 150,
      render: (channels: string[]) => (
        <Space direction="vertical" size={2}>
          {channels.map(ch => (
            <Tag bordered={false} key={ch}>{ch}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '相关人员',
      dataIndex: 'people',
      key: 'people',
      width: 120,
      render: (people: string[]) => (
        <Space direction="vertical" size={2}>
          {people.map(p => (
            <Tag bordered={false} key={p} color="blue">{p}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      sorter: (a: AlertMessage, b: AlertMessage) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
    }
  ], [])

  // 过滤告警消息数据
  const filteredAlertMessages = useMemo(() => {
    let filtered = alertMessages

    // 关键词过滤
    if (keyword) {
      filtered = filtered.filter(item => 
        item.type.toLowerCase().includes(keyword.toLowerCase()) ||
        item.content.toLowerCase().includes(keyword.toLowerCase())
      )
    }

    // 时间范围过滤
    if (range[0] && range[1]) {
      filtered = filtered.filter(item => {
        const itemTime = new Date(item.time).getTime()
        const startTime = new Date(range[0]!).getTime()
        const endTime = new Date(range[1]!).getTime()
        return itemTime >= startTime && itemTime <= endTime
      })
    }

    return filtered
  }, [alertMessages, keyword, range])

  const tabItems: TabsProps['items'] = [
    {
      key: 'announcements',
      label: (
        <Space>
          <NotificationOutlined />
          <span>系统公告</span>
        </Space>
      ),
      children: (
        <Table<SystemAnnouncement>
          rowKey="id"
          columns={announcementColumns}
          dataSource={announcements}
          pagination={BUSINESS_DEFAULT_PAGINATION}
        />
      )
    },
    {
      key: 'alerts',
      label: (
        <Space>
          <BellOutlined />
          <span>告警消息</span>
        </Space>
      ),
      children: (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
            <Input
              allowClear
              placeholder="搜索告警类型或消息内容"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <RangePicker
              showTime
              onChange={(vals) => setRange([
                vals?.[0]?.format('YYYY-MM-DD HH:mm:ss') ?? null,
                vals?.[1]?.format('YYYY-MM-DD HH:mm:ss') ?? null
              ])}
            />
          </div>
          <Table<AlertMessage>
            rowKey="id"
            columns={alertColumns}
            dataSource={filteredAlertMessages}
            pagination={BUSINESS_DEFAULT_PAGINATION}
          />
        </>
      )
    },
    {
      key: 'config',
      label: (
        <Space>
          <SettingOutlined />
          <span>通知配置</span>
        </Space>
      ),
      children: <AlertPage />
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>消息通知</Title>
      </div>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
