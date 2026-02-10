'use client'

import React, { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  message,
  Tooltip,
  Typography,
  Descriptions,
  Empty,
  Tabs,
  Tag
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TabsProps } from 'antd'
import {
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  SendOutlined,
  BellOutlined
} from '@ant-design/icons'

const { Title } = Typography

// 人员数据类型定义
interface Person {
  id: string
  name: string
  dingId: string
}

// 机器人 Webhook 类型定义
interface Webhook {
  name: string
  url: string
  secret?: string
}

interface WebhookItem extends Webhook {
  id: string
}

interface PeopleManagementProps {
  initialActiveTab?: string
}

export default function PeopleManagement({ initialActiveTab }: PeopleManagementProps): React.ReactElement {
  // 人员配置相关状态
  const [addPersonOpen, setAddPersonOpen] = useState<boolean>(false)
  const [people, setPeople] = useState<Person[]>([
    { id: 'yu.b', name: 'yu.bo', dingId: 'dingtalk:yu.b' },
    { id: 'xuyin', name: '刘悦', dingId: 'dingtalk:xuyin' }
  ])
  const [personForm] = Form.useForm<Person>()

  // 自建接收渠道配置相关状态
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    // 默认示例机器人：方便演示绑定效果
    { id: 'kumo_cp', name: '小包', url: 'https://oapi.dingtalk.com/robot/send?access_token=demo' }
  ])
  const [addWebhookOpen, setAddWebhookOpen] = useState<boolean>(false)
  const [editWebhookOpen, setEditWebhookOpen] = useState<boolean>(false)
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null)
  const [webhookForm] = Form.useForm<Webhook>()
  const [webhookEditForm] = Form.useForm<Webhook>()

  // 人员管理相关处理函数
  const handleAddPerson = (): void => {
    personForm.resetFields()
    setAddPersonOpen(true)
  }

  const handleDeletePerson = (personId: string): void => {
    setPeople(prev => prev.filter(p => p.id !== personId))
    message.success('人员删除成功')
  }

  const onSubmitAddPerson = (): void => {
    personForm.validateFields().then((values: Person) => {
      const newPerson: Person = {
        ...values,
        id: `person_${Date.now()}`
      }
      setPeople(prev => [...prev, newPerson])
      setAddPersonOpen(false)
      message.success('人员添加成功')
    }).catch(() => {
      message.error('请检查表单信息')
    })
  }

  // 机器人管理：打开新增抽屉
  const handleAddWebhook = (): void => {
    // 点击图标按钮：重置表单并打开新增抽屉
    webhookForm.resetFields()
    setAddWebhookOpen(true)
  }

  // 机器人管理：提交新增
  const onSubmitAddWebhook = (): void => {
    webhookForm.validateFields().then((values: Webhook) => {
      const item: WebhookItem = {
        id: Date.now().toString(),
        ...values
      }
      setWebhooks(prev => [item, ...prev])
      setAddWebhookOpen(false)
      message.success('Webhook 添加成功')
      webhookForm.resetFields()
    }).catch(() => {
      // 校验失败时仅给出提示，不改动状态
      message.error('请检查机器人表单信息')
    })
  }

  // 机器人管理：打开编辑抽屉
  const handleEditWebhook = (item: WebhookItem): void => {
    // 将选中项写入编辑表单，并打开编辑抽屉
    setEditingWebhookId(item.id)
    webhookEditForm.setFieldsValue(item)
    setEditWebhookOpen(true)
  }

  // 机器人管理：提交编辑
  const onSubmitEditWebhook = (): void => {
    webhookEditForm.validateFields().then((values: Webhook) => {
      setWebhooks(prev => prev.map(w => (w.id === editingWebhookId ? { ...w, ...values } : w)))
      setEditWebhookOpen(false)
      message.success('Webhook 已更新')
    }).catch(() => {
      message.error('请检查机器人表单信息')
    })
  }

  // 机器人管理：发送测试消息（仅模拟）
  const handleTestWebhook = (): void => {
    // 这里只做简单的成功提示，不实际发网络请求
    message.success('测试消息已发送')
  }

  // 人员表格列定义
  const peopleColumns: ColumnsType<Person> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '钉钉ID',
      dataIndex: 'dingId',
      key: 'dingId'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Person) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => message.info(`编辑 ${record.name}`)}
          />
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeletePerson(record.id)}
          />
        </Space>
      )
    }
  ]

  // 机器人列表列定义（以表格形式展示 webhook）
  const webhookColumns: ColumnsType<WebhookItem> = [
    {
      title: '机器人名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: 'Webhook 地址',
      dataIndex: 'url',
      key: 'url',
      render: (v: string) => (
        <Typography.Text ellipsis style={{ maxWidth: 520, display: 'inline-block' }}>
          {v}
        </Typography.Text>
      )
    },
    {
      title: '加签密钥',
      dataIndex: 'secret',
      key: 'secret',
      width: 220,
      render: (v?: string) =>
        v ? (
          <Typography.Text>{v}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">未配置</Typography.Text>
        )
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, item: WebhookItem) => (
        <Space>
          {/* 测试：模拟发送测试消息 */}
          <Tooltip title="发送测试消息">
            <Button icon={<SendOutlined />} onClick={handleTestWebhook} />
          </Tooltip>
          {/* 编辑：打开编辑抽屉（针对该条目） */}
          <Tooltip title="编辑机器人">
            <Button icon={<EditOutlined />} onClick={() => handleEditWebhook(item)} />
          </Tooltip>
        </Space>
      )
    }
  ]

  // Tab 配置：人员管理 / webhook 管理 / 消息配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'people',
      label: (
        <Space>
          <TeamOutlined />
          <span>联系人管理</span>
        </Space>
      ),
      children: (
        <Card styles={{ body: { paddingTop: 8 } }} bordered={false}>
          {/* 人员 Tab 内部操作：新增人员 */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Tooltip title="新增人员">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPerson}>
                  新增人员
                </Button>
              </Tooltip>
            </Space>
          </div>

          <Table<Person>
            rowKey="id"
            columns={peopleColumns}
            dataSource={people}
            pagination={{ pageSize: 10 }}
          />

          {/* 新增人员抽屉：在人力 Tab 内管理联系人 */}
          <Drawer
            title="新增人员"
            open={addPersonOpen}
            width={480}
            onClose={() => setAddPersonOpen(false)}
            destroyOnClose
            footer={
              <div style={{ textAlign: 'left' }}>
                <Space>
                  <Button onClick={() => setAddPersonOpen(false)}>取消</Button>
                  <Button type="primary" onClick={onSubmitAddPerson}>保存</Button>
                </Space>
              </div>
            }
          >
            <Form<Person> form={personForm} layout="vertical">
              <Form.Item
                label="钉钉名称"
                name="name"
                rules={[{ required: true, message: '请输入钉钉联系人名称' }]}
              >
                <Input placeholder="例如：王小明" />
              </Form.Item>
              <Form.Item
                label="钉钉ID"
                name="dingId"
                rules={[{ required: true, message: '请输入 dingtalk ID' }]}
              >
                <Input placeholder="例如：dingtalk:123456" />
              </Form.Item>
            </Form>
          </Drawer>
        </Card>
      )
    },
    {
      key: 'webhook',
      label: (
        <Space>
          <RobotOutlined />
          <span>接收渠道管理</span>
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card styles={{ body: { paddingTop: 8 } }} bordered={false}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">
                支持配置多个自建接收渠道，用于将告警/提醒发送到不同群。
              </Typography.Text>
              <Tooltip title="新增机器人">
                {/* 图标按钮：打开新增机器人抽屉 */}
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWebhook} />
              </Tooltip>
            </div>

            {webhooks.length === 0 ? (
              <Empty description="尚未添加机器人" />
            ) : (
              <Table<WebhookItem>
                rowKey="id"
                columns={webhookColumns}
                dataSource={webhooks}
                pagination={false}
              />
            )}
          </Card>

          {/* 新增 Webhook 抽屉：用于新增自建接收渠道 */}
          <Drawer
            title="新增机器人"
            open={addWebhookOpen}
            width={520}
            onClose={() => setAddWebhookOpen(false)}
            destroyOnClose
            footer={
              <div style={{ textAlign: 'left' }}>
                <Space>
                  <Button onClick={() => setAddWebhookOpen(false)}>取消</Button>
                  <Button type="primary" onClick={onSubmitAddWebhook}>保存</Button>
                </Space>
              </div>
            }
          >
            <Form<Webhook> form={webhookForm} layout="vertical">
              <Form.Item
                label="机器人名称"
                name="name"
                rules={[
                  { required: true, message: '请输入机器人名称' },
                  { min: 2, max: 12, message: '长度为 2-12 个字符' },
                  { pattern: /^[\u4e00-\u9fa5A-Za-z0-9]+$/, message: '仅支持汉字、英文、数字' }
                ]}
              >
                <Input placeholder="例如：CP群" />
              </Form.Item>
              <Form.Item
                label="Webhook 地址"
                name="url"
                rules={[
                  { required: true, message: '请输入钉钉 Webhook 地址' },
                  { max: 256, message: '最长不超过 256 个字符' },
                  { pattern: /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=.+$/, message: '请输入合法的钉钉 Webhook 地址' }
                ]}
              >
                <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
              </Form.Item>
              <Form.Item label="加签密钥（可选）" name="secret">
                <Input.Password placeholder="用于钉钉安全设置（可选）" />
              </Form.Item>
            </Form>
          </Drawer>

          {/* 编辑 Webhook 抽屉：用于编辑已有机器人 */}
          <Drawer
            title="编辑机器人"
            open={editWebhookOpen}
            width={520}
            onClose={() => setEditWebhookOpen(false)}
            destroyOnClose
            footer={
              <div style={{ textAlign: 'left' }}>
                <Space>
                  <Button onClick={() => setEditWebhookOpen(false)}>取消</Button>
                  <Button type="primary" onClick={onSubmitEditWebhook}>保存</Button>
                </Space>
              </div>
            }
          >
            <Form<Webhook> form={webhookEditForm} layout="vertical">
              <Form.Item
                label="机器人名称"
                name="name"
                rules={[
                  { required: true, message: '请输入机器人名称' },
                  { min: 2, max: 12, message: '长度为 2-12 个字符' },
                  { pattern: /^[\u4e00-\u9fa5A-Za-z0-9]+$/, message: '仅支持汉字、英文、数字' }
                ]}
              >
                <Input placeholder="例如：CP群" />
              </Form.Item>
              <Form.Item
                label="Webhook 地址"
                name="url"
                rules={[
                  { required: true, message: '请输入钉钉 Webhook 地址' },
                  { max: 256, message: '最长不超过 256 个字符' },
                  { pattern: /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=.+$/, message: '请输入合法的钉钉 Webhook 地址' }
                ]}
              >
                <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
              </Form.Item>
              <Form.Item label="加签密钥（可选）" name="secret">
                <Input.Password placeholder="用于钉钉安全设置（可选）" />
              </Form.Item>
            </Form>
          </Drawer>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>人员与机器人配置</Title>
      </div>
      {/* 使用 Tabs 将“人员管理 / 机器人管理”分栏展示 */}
      <Tabs
        defaultActiveKey={initialActiveTab ?? 'people'}
        items={tabItems}
        tabBarGutter={24}
      />
    </div>
  )
}

