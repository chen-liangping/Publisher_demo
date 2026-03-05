'use client'//系统公告页面

import React, { useState, useMemo } from 'react'
import { Card, Space, Table, Tag, Typography, Input, DatePicker, Tabs, Button } from 'antd'
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
import { BUSINESS_DEFAULT_PAGINATION } from '../Common/GlobalPagination'
import AlertPage from './alert'
import AdminNotificationGate from './AdminNotificationGate'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

// 系统公告数据类型
interface SystemAnnouncement {
  id: string
  title: string
  content: string
  time: string
  read: boolean
}

// 告警消息数据类型（复用alert_history的HistoryRecord）
interface AlertMessage {
  id: string
  category: '通知' | '告警' // 类型：通知 / 告警
  type: string // 告警名称（告警项）
  content: string // 消息内容
  channels: string[] // 通知渠道：自建接收渠道名称、小包
  people: string[] // 相关人员名称
  time: string // 时间（ISO 或可读字符串）
}

// 模拟系统公告数据
const mockAnnouncements: SystemAnnouncement[] = [
  {
    id: '1',
    title: '系统维护通知',
    content: '系统将于2025年10月25日凌晨2:00-4:00进行例行维护，期间可能影响部分功能使用，请提前做好相关准备。',
    time: '2025-10-23 14:30:00',
    read: false
  },
  {
    id: '2', 
    title: '新功能上线',
    content: 'HPA弹性伸缩功能已正式上线，支持基于CPU和内存指标的自动扩缩容，欢迎体验使用。',
    time: '2025-10-22 10:15:00',
    read: true
  },
  {
    id: '3',
    title: '安全提醒',
    content: '请定期更新您的访问密钥，建议每90天更换一次，确保账户安全。',
    time: '2025-10-21 16:45:00',
    read: true
  },
  {
    id: '4',
    title: '紧急通知',
    content: '检测到异常访问行为，已自动启用安全防护，如有疑问请联系管理员。',
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
    const isAlert = fail || t.includes('故障') || t.includes('异常') || t.includes('阻塞')
    const channels: string[] = fail ? [ '小包'] : ['cp 群']
    const people = fail ? ['刘悦', 'yu.b'] : (success ? ['yu.b'] : ['chen.z'])
    const time = new Date(baseTime + idx * 7 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const content = success
      ? `${t}：操作已完成，系统运行正常`
      : fail
        ? `${t}：请查看日志与错误码，及时处理`
        : `${t}：已触发事件，系统已记录`
    return {
      id: String(idx + 1),
      category: isAlert ? '告警' : '通知',
      type: t,
      content,
      channels,
      people,
      time
    }
  })
}

interface MessageNotificationProps {
  initialActiveTab?: string
}

export default function MessageNotification({ initialActiveTab }: MessageNotificationProps): React.ReactElement {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(mockAnnouncements)
  const [keyword, setKeyword] = useState<string>('')
  const [range, setRange] = useState<[string | null, string | null]>([null, null])
  
  // 消息配置中用到的机器人列表（与“人员配置”中的 webhook 管理保持示例一致）
  interface WebhookItem {
    id: string
    name: string
    url: string
    secret?: string
  }
  const [webhooks] = useState<WebhookItem[]>([
    {
      id: 'robot-1',
      name: 'CP群',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=dummy-token-1'
    },
    {
      id: 'robot-2',
      name: '小包',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=dummy-token-2'
    }
  ])
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
  const pickTagColor = (value: string, palette: string[]): string => {
    // 交互/展示逻辑：不同值的标签用不同颜色（稳定映射，避免每次渲染变色）
    let hash = 0
    for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
    return palette[hash % palette.length] ?? 'default'
  }
  const channelPalette = ['geekblue', 'cyan', 'blue', 'purple', 'magenta']
  const peoplePalette = ['green', 'lime', 'gold', 'orange', 'volcano']

  const alertColumns: ColumnsType<AlertMessage> = useMemo(() => [
    {
      title: '类型',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: AlertMessage['category']) => (
        <Tag
          bordered={false}
          color={category === '告警' ? 'red' : 'blue'}
          style={{ borderRadius: 999, paddingInline: 10 }}
        >
          {category}
        </Tag>
      )
    },
    {
      title: '告警名称',
      dataIndex: 'type',
      key: 'type',
      width: 200,
      render: (value: unknown) => {
        // 交互/展示逻辑：表格字段可能为空，需做兜底，避免运行时 includes 报错
        const type = typeof value === 'string' ? value : ''
        const isError = type.includes('失败') || type.includes('故障') || type.includes('异常')
        const isSuccess = type.includes('成功')
        const color = isError ? 'red' : isSuccess ? 'green' : 'blue'
        return (
          <Tag bordered={false} color={color} style={{ borderRadius: 999, paddingInline: 10 }}>
            {type}
          </Tag>
        )
      }
    },
    {
      title: '消息内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true
    },
    {
      title: '通知渠道 / 相关人员',
      key: 'receivers',
      width: 260,
      render: (_: unknown, record: AlertMessage) => (
        <Space direction="vertical" size={6} style={{ display: 'flex' }}>
          <Space size={6} wrap>
            {(record.channels ?? []).map(ch => (
              <Tag
                key={`ch_${ch}`}
                bordered={false}
                color={pickTagColor(ch, channelPalette)}
                style={{ borderRadius: 999, paddingInline: 10, opacity: 0.9 }}
              >
                {ch}
              </Tag>
            ))}
          </Space>
          <Space size={6} wrap>
            {(record.people ?? []).map(p => (
              <Tag
                key={`p_${p}`}
                bordered={false}
                color={pickTagColor(p, peoplePalette)}
                style={{ borderRadius: 999, paddingInline: 10, opacity: 0.9 }}
              >
                {p}
              </Tag>
            ))}
            {(record.people ?? []).length === 0 && (
              <Text type="secondary">—</Text>
            )}
          </Space>
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
        item.content.toLowerCase().includes(keyword.toLowerCase()) ||
        (item.channels ?? []).join(' ').toLowerCase().includes(keyword.toLowerCase()) ||
        (item.people ?? []).join(' ').toLowerCase().includes(keyword.toLowerCase()) ||
        (item.category ?? '').includes(keyword)
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
              placeholder="搜索告警名称或消息内容"
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
      key: 'message-config',
      label: (
        <Space>
          <SettingOutlined />
          <span>消息配置</span>
        </Space>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
          {/* 交互逻辑：消息配置同样受管理员“通知总开关”控制（关闭时只读且不可操作）。 */}
          <AdminNotificationGate>
            <AlertPage webhooks={webhooks} />
          </AdminNotificationGate>
        </div>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>消息通知</Title>
      </div>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs defaultActiveKey={initialActiveTab ?? 'announcements'} items={tabItems} />
      </Card>
    </div>
  )
}
