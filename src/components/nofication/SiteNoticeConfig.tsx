'use client'

import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Checkbox
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, SearchOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

type MethodType = 'cp-dingtalk' | 'custom-webhook'

interface NotificationMethod {
  id: string
  type: MethodType
  name: string
  description: string
  owners: string[] // 负责人（示例：邮箱）
  webhookUrl?: string // 仅 custom-webhook 需要
}

type HealthStatus = 'normal' | 'error'

function getMethodStatus(m: NotificationMethod): HealthStatus {
  if (m.owners.length === 0) return 'error'
  if (m.type === 'custom-webhook') return m.webhookUrl ? 'normal' : 'error'
  return 'normal'
}

function statusTag(status: HealthStatus): React.ReactElement {
  if (status === 'normal') {
    return (
      <Tag color="green" style={{ borderRadius: 999, paddingInline: 10, opacity: 0.9 }}>
        正常
      </Tag>
    )
  }
  return (
    <Tag color="red" style={{ borderRadius: 999, paddingInline: 10, opacity: 0.9 }}>
      异常
    </Tag>
  )
}

const PEOPLE_POOL: { label: string; value: string }[] = [
  { label: 'chen.lp@ctw.inc', value: 'chen.lp@ctw.inc' },
  { label: 'lin.y@ctw.inc', value: 'lin.y@ctw.inc' },
  { label: 'yu.t@ctw.inc', value: 'yu.t@ctw.inc' },
  { label: 'wu.yuni@ctw.inc', value: 'wu.yuni@ctw.inc' }
]

type Topic =
  | '自动开服'
  | '静态资源与CDN'
  | '运行时健康'

interface NoticeRuleRow {
  id: string
  topic: Topic
  typeName: string
  // 每个通知方式是否启用（勾选）
  channelEnabled: Record<string, boolean>
}

const createInitialMethods = (): NotificationMethod[] => [
  {
    id: 'method_cp',
    type: 'cp-dingtalk',
    name: 'CP 钉钉群通知',
    description: '通过 AI 助手小包在钉钉群里发送消息并 @ 负责人',
    owners: ['yu.t@ctw.inc']
  },
  {
    id: 'method_custom',
    type: 'custom-webhook',
    name: '自定义消息通知',
    description: '通过自定义 Webhook 在飞书等外部群里发送消息',
    owners: [],
    webhookUrl: ''
  }
]

const createInitialRules = (methods: NotificationMethod[]): NoticeRuleRow[] => {
  const baseChannels = Object.fromEntries(methods.map((m) => [m.id, true])) as Record<string, boolean>
  return [
    { id: 'r1', topic: '自动开服', typeName: 'Pod 健康检查失败', channelEnabled: { ...baseChannels } },
    { id: 'r2', topic: '自动开服', typeName: '自动开服失败', channelEnabled: { ...baseChannels } },
    { id: 'r3', topic: '自动开服', typeName: '通知 CP 新预备服失败', channelEnabled: { ...baseChannels } },
    { id: 'r4', topic: '自动开服', typeName: '预备服部署失败', channelEnabled: { ...baseChannels } },
    { id: 'r5', topic: '自动开服', typeName: '自动开服执行计划获取失败', channelEnabled: { ...baseChannels } },
    { id: 'r6', topic: '静态资源与CDN', typeName: '翻译文本同步 CDN 失败', channelEnabled: { ...baseChannels } },
    { id: 'r7', topic: '静态资源与CDN', typeName: 'S3 zip 解压失败', channelEnabled: { ...baseChannels } },
    { id: 'r8', topic: '静态资源与CDN', typeName: 'flashlaunch 静态资源计算阻塞', channelEnabled: { ...baseChannels } },
    { id: 'r9', topic: '静态资源与CDN', typeName: 'CDN 部署失败', channelEnabled: { ...baseChannels } },
    { id: 'r10', topic: '静态资源与CDN', typeName: 'CDN 部署成功', channelEnabled: { ...baseChannels } },
    { id: 'r11', topic: '运行时健康', typeName: 'Pod 更新异常', channelEnabled: { ...baseChannels } }
  ]
}

export default function SiteNoticeConfig(): React.ReactElement {
  const [methods, setMethods] = useState<NotificationMethod[]>(() => createInitialMethods())
  const [rules, setRules] = useState<NoticeRuleRow[]>(() => createInitialRules(createInitialMethods()))
  const [keyword, setKeyword] = useState<string>('')

  const [methodDrawerOpen, setMethodDrawerOpen] = useState<boolean>(false)
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null)
  const [methodForm] = Form.useForm<NotificationMethod>()

  const [addMethodOpen, setAddMethodOpen] = useState<boolean>(false)
  const [addForm] = Form.useForm<{ type: MethodType; name: string; webhookUrl?: string }>()

  const methodMap = useMemo(() => new Map(methods.map((m) => [m.id, m])), [methods])

  const openEditMethod = (m: NotificationMethod): void => {
    setEditingMethodId(m.id)
    methodForm.setFieldsValue(m)
    setMethodDrawerOpen(true)
  }

  const saveMethod = (): void => {
    methodForm
      .validateFields()
      .then((values) => {
        if (!editingMethodId) return
        setMethods((prev) => prev.map((m) => (m.id === editingMethodId ? { ...m, ...values, id: m.id } : m)))
        setMethodDrawerOpen(false)
        setEditingMethodId(null)
      })
      .catch(() => {})
  }

  const ensureRuleHasChannels = (row: NoticeRuleRow, nextMethods: NotificationMethod[]): NoticeRuleRow => {
    const next: Record<string, boolean> = { ...row.channelEnabled }
    nextMethods.forEach((m) => {
      if (typeof next[m.id] !== 'boolean') next[m.id] = true
    })
    // 移除已删除的通知方式
    Object.keys(next).forEach((k) => {
      if (!nextMethods.some((m) => m.id === k)) delete next[k]
    })
    return { ...row, channelEnabled: next }
  }

  const addMethod = (): void => {
    addForm
      .validateFields()
      .then((values) => {
        const id = `method_${Date.now()}`
        const m: NotificationMethod = {
          id,
          type: values.type,
          name: values.name,
          description: values.type === 'custom-webhook' ? '通过自定义 Webhook 在外部群里发送消息' : '通过钉钉群发送并 @ 负责人',
          owners: [],
          webhookUrl: values.type === 'custom-webhook' ? values.webhookUrl ?? '' : undefined
        }
        // 交互逻辑：新增通知方式后，表格里的“接收渠道”会同步出现该渠道（真实业务效果：数据结构发生变化）。
        setMethods((prev) => [...prev, m])
        setRules((prev) => prev.map((r) => ensureRuleHasChannels(r, [...methods, m])))
        setAddMethodOpen(false)
        addForm.resetFields()
      })
      .catch(() => {})
  }

  const filteredRules = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return rules
    return rules.filter((r) => r.typeName.toLowerCase().includes(k) || r.topic.toLowerCase().includes(k))
  }, [keyword, rules])

  const toggleChannel = (rowId: string, methodId: string): void => {
    // 交互逻辑：勾选/取消某个通知方式，实时影响该行的接收渠道与负责人展示（真实业务效果：状态更新）。
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        return { ...r, channelEnabled: { ...r.channelEnabled, [methodId]: !r.channelEnabled[methodId] } }
      })
    )
  }

  const columns: ColumnsType<NoticeRuleRow> = useMemo(
    () => [
      { title: '通知主题', dataIndex: 'topic', key: 'topic', width: 160 },
      { title: '通知类型', dataIndex: 'typeName', key: 'typeName', width: 260 },
      {
        title: '接收渠道',
        key: 'channels',
        width: 260,
        render: (_: unknown, record: NoticeRuleRow) => (
          <Space direction="vertical" size={8} style={{ display: 'flex' }}>
            {methods.map((m) => (
              <Checkbox
                key={m.id}
                checked={record.channelEnabled[m.id] ?? false}
                onChange={() => toggleChannel(record.id, m.id)}
              >
                <Text style={{ fontSize: 13 }}>{m.name}</Text>
              </Checkbox>
            ))}
            {methods.length === 0 && <Text type="secondary">暂无通知方式</Text>}
          </Space>
        )
      },
      {
        title: '接收负责人',
        key: 'owners',
        render: (_: unknown, record: NoticeRuleRow) => {
          const activeMethodIds = methods.filter((m) => record.channelEnabled[m.id])
          const owners = activeMethodIds.flatMap((m) => m.owners)
          const uniqOwners = Array.from(new Set(owners))
          if (uniqOwners.length === 0) return <Text type="secondary">—</Text>
          return (
            <Space size={6} wrap>
              {uniqOwners.map((o) => (
                <Tag
                  key={o}
                  
                  style={{
                    borderRadius: 999,
                    paddingInline: 10,
                    opacity: 0.92,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <UserOutlined style={{ fontSize: 12, opacity: 0.7 }} />
                  {o}
                </Tag>
              ))}
            </Space>
          )
        }
      }
    ],
    [methods]
  )

  const methodCards = useMemo(() => {
    return methods.map((m) => {
      const status = getMethodStatus(m)
      const ownerText = m.owners.length > 0 ? `已配置负责人：${m.owners.join('，')}` : '暂未配置负责人'
      return (
        <div
          key={m.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 14px',
            borderRadius: 12,
            background: '#fff',
            border: '1px solid rgba(148, 163, 184, 0.22)'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>{m.name}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>{m.description}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {ownerText}
            </Text>
          </div>

          <Space size={10}>
            {statusTag(status)}
            <Button
              type="text"
              aria-label={`配置${m.name}`}
              icon={<SettingOutlined />}
              onClick={() => {
                // 交互逻辑：打开“通知方式配置”抽屉，允许配置负责人/Webhook（真实业务效果：更新状态）。
                openEditMethod(m)
              }}
              style={{ width: 34, height: 34, borderRadius: 10 }}
            />
          </Space>
        </div>
      )
    })
  }, [methods])

  const currentMethod = editingMethodId ? methodMap.get(editingMethodId) ?? null : null

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          站内通知配置
        </Title>
      </div>

      <Card
        title={<span style={{ fontWeight: 700 }}>通知方式与联系人配置</span>}
        styles={{ body: { paddingTop: 12 } }}
        extra={
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              // 交互逻辑：新增通知方式（真实业务效果：新增渠道并同步到下方表格）。
              setAddMethodOpen(true)
              addForm.setFieldsValue({ type: 'custom-webhook', name: '' })
            }}
            style={{ borderRadius: 10 }}
          >
            添加通知方式
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>
          {methodCards}
          {methods.length === 0 && <Empty description="暂无通知方式" />}
        </Space>
      </Card>

      <div style={{ height: 14 }} />

      <Card
        title={<span style={{ fontWeight: 700 }}>消息通知</span>}
        styles={{ body: { paddingTop: 12 } }}
        extra={
          <Input
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索通知类型"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            style={{ width: 260, borderRadius: 10 }}
          />
        }
      >
        <Table<NoticeRuleRow>
          rowKey="id"
          columns={columns}
          dataSource={filteredRules}
          pagination={false}
          scroll={{ x: 860 }}
        />
      </Card>

      <Drawer
        title="通知方式配置"
        open={methodDrawerOpen}
        onClose={() => {
          setMethodDrawerOpen(false)
          setEditingMethodId(null)
        }}
        width={520}
        destroyOnClose
        footer={
          <Space>
            <Button
              onClick={() => {
                setMethodDrawerOpen(false)
                setEditingMethodId(null)
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={saveMethod}>
              保存
            </Button>
          </Space>
        }
      >
        {currentMethod ? (
          <Form layout="vertical" form={methodForm} initialValues={currentMethod}>
            <Form.Item label="通知方式名称" name="name" rules={[{ required: true, message: '请输入通知方式名称' }]}>
              <Input placeholder="例如：自定义消息通知" />
            </Form.Item>
            <Form.Item
              label="负责人"
              name="owners"
              rules={[{ type: 'array' as const, required: true, message: '请选择负责人' }]}
              extra="负责人用于接收消息时的 @ 提醒展示（原型示例）"
            >
              <Select
                mode="multiple"
                placeholder="请选择负责人"
                options={PEOPLE_POOL}
                style={{ width: '100%' }}
              />
            </Form.Item>
            {currentMethod.type === 'custom-webhook' && (
              <Form.Item
                label="Webhook 地址"
                name="webhookUrl"
                rules={[
                  { required: true, message: '请输入 Webhook 地址' },
                  { type: 'url' as const, message: '请输入合法 URL' }
                ]}
              >
                <Input placeholder="https://example.com/webhook" />
              </Form.Item>
            )}
          </Form>
        ) : (
          <Empty description="未找到该通知方式" />
        )}
      </Drawer>

      <Modal
        title="添加通知方式"
        open={addMethodOpen}
        onCancel={() => setAddMethodOpen(false)}
        onOk={addMethod}
        okText="添加"
        cancelText="取消"
        destroyOnHidden
      >
        <Form layout="vertical" form={addForm}>
          <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              options={[
                { value: 'custom-webhook', label: '自定义消息通知（Webhook）' },
                { value: 'cp-dingtalk', label: 'CP 钉钉群通知' }
              ]}
            />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：自定义消息通知" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.type !== next.type}
          >
            {({ getFieldValue }) => {
              const t = getFieldValue('type') as MethodType | undefined
              if (t !== 'custom-webhook') return null
              return (
                <Form.Item
                  label="Webhook 地址"
                  name="webhookUrl"
                  rules={[
                    { required: true, message: '请输入 Webhook 地址' },
                    { type: 'url' as const, message: '请输入合法 URL' }
                  ]}
                >
                  <Input placeholder="https://example.com/webhook" />
                </Form.Item>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 统一 Tag 样式：全圆角、无描边 */}
      <style>{`
        .ant-tag {
          border-radius: 999px !important;
          border: none !important;
        }
      `}</style>
    </div>
  )
}

