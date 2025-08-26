'use client'

import React, { useMemo, useState } from 'react'
import { 
  Card,
  Tabs,
  Space,
  Button,
  Typography,
  Drawer,
  Form,
  Input,
  Table,
  Tooltip,
  message,
  Switch,
  Descriptions,
  Empty,
  Popconfirm
} from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { 
  PlusOutlined,
  EditOutlined,
  SendOutlined,
  DeleteOutlined,
  RobotOutlined,
  TeamOutlined,
  BellOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

// 数据类型定义，避免使用 any
interface Webhook {
  name: string
  url: string
  secret?: string
}

interface Person {
  id: string
  name: string
  dingId: string
}

// 提醒矩阵空行：用于无人员时展示提示语
type EmptyRow = { id: '__empty__'; name: string; dingId: string }
type ReminderRow = Person | EmptyRow

const isEmptyRow = (row: ReminderRow): row is EmptyRow => row.id === '__empty__'

interface NoticeItem {
  key: string
  name: string
}

// 告警类提醒（开关表）
const alarmNoticeList: NoticeItem[] = [
  { key: 'podHealthCheckFail', name: 'pod健康检查失败' },
  { key: 'autoOpenServerFail', name: '自动开服失败' },
  { key: 'notifyCPFail', name: '通知CP新预备服失败' },
  { key: 'prepareDeployFail', name: '预备服部署失败' },
  { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败' },
  { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞' },
  { key: 'podFailure', name: 'Pod故障' },
  { key: 'podUpdateAbnormal', name: 'Pod更新异常' },
  { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败' },
  { key: 's3UnzipFail', name: 'S3 zip解压失败' }
]

// 提醒类（矩阵: 通知项 x 人员）
const reminderNoticeList: NoticeItem[] = [
  { key: 'autoOpenServerSuccess', name: '自动开服成功' },
  { key: 'serverDeployStart', name: '服务端部署' },
  { key: 'serverDeployDone', name: '服务端部署完成' },
  { key: 'grayRollback', name: '灰度回滚' },
  { key: 'grayRollbackDone', name: '灰度回滚完成' },
  { key: 'grayAppend', name: '追加灰度' },
  { key: 'grayAppendDone', name: '灰度追加完成' },
  { key: 'grayFullDeploy', name: '灰度全量部署' },
  { key: 'clientNewVersion', name: '客户端创建新版本' },
  { key: 'autoOpenPolicyChange', name: '自动开服策略变更' },
  { key: 's3UnzipSuccess', name: 'S3 zip解压成功' },
  { key: 'clientVersionSwitch', name: '客户端版本切换' },
  { key: 'ossConfigChange', name: 'oss配置文件变更' }
]

export default function AlertPage(): React.ReactElement {
  // Webhook：仅支持一个
  const [webhook, setWebhook] = useState<Webhook | null>(null)
  const [addWebhookOpen, setAddWebhookOpen] = useState<boolean>(false)
  const [editWebhookOpen, setEditWebhookOpen] = useState<boolean>(false)
  const [webhookForm] = Form.useForm<Webhook>()
  const [webhookEditForm] = Form.useForm<Webhook>()

  // 人员配置（默认包含一名联系人 slime）
  const [people, setPeople] = useState<Person[]>([
    { id: 'slime', name: 'slime', dingId: 'dingtalk:slime' }
  ])
  const [addPersonOpen, setAddPersonOpen] = useState<boolean>(false)
  const [personForm] = Form.useForm<Person>()

  // 告警类提醒开关
  const [alarmSwitches, setAlarmSwitches] = useState<Record<string, boolean>>(
    () => alarmNoticeList.reduce((acc, item) => ({ ...acc, [item.key]: true }), {})
  )

  // 提醒类矩阵：noticeKey -> { personId: boolean }，默认开启
  const [reminderMatrix, setReminderMatrix] = useState<Record<string, Record<string, boolean>>>(
    () => reminderNoticeList.reduce((acc, item) => ({ ...acc, [item.key]: {} }), {})
  )

  // 添加 Webhook
  const handleAddWebhook = (): void => {
    if (webhook) {
      // 只支持一个 webhook
      message.warning('当前仅支持一个机器人，已存在的机器人可编辑但不可新增')
      return
    }
    setAddWebhookOpen(true)
  }

  // 提交新增 Webhook
  const onSubmitAddWebhook = async (): Promise<void> => {
    try {
      const values = await webhookForm.validateFields()
      setWebhook(values)
      setAddWebhookOpen(false)
      message.success('Webhook 添加成功')
      webhookForm.resetFields()
    } catch {
      // 校验失败不做处理
    }
  }

  // 打开编辑 Webhook
  const handleEditWebhook = (): void => {
    if (!webhook) return
    // 预填充编辑表单
    webhookEditForm.setFieldsValue(webhook)
    setEditWebhookOpen(true)
  }

  // 提交编辑 Webhook
  const onSubmitEditWebhook = async (): Promise<void> => {
    try {
      const values = await webhookEditForm.validateFields()
      setWebhook(values)
      setEditWebhookOpen(false)
      message.success('Webhook 已更新')
    } catch {
      // 校验失败不做处理
    }
  }

  // 发送测试消息（仅模拟）
  const handleTestWebhook = (): void => {
    // 这里只做 UI 反馈，不实际发请求
    message.success('测试消息已发送')
  }

  // 添加人员
  const handleAddPerson = (): void => {
    setAddPersonOpen(true)
  }

  const onSubmitAddPerson = async (): Promise<void> => {
    try {
      const values = await personForm.validateFields()
      const newPerson: Person = {
        id: Date.now().toString(),
        name: values.name,
        dingId: values.dingId
      }
      setPeople(prev => [newPerson, ...prev])
      personForm.resetFields()
      setAddPersonOpen(false)
      message.success('人员已添加')
    } catch {
      // 校验失败不处理
    }
  }

  // 删除人员
  const onDeletePerson = (person: Person): void => {
    setPeople(prev => prev.filter(p => p.id !== person.id))
    // 同步移除矩阵记录
    setReminderMatrix(prev => {
      const next: Record<string, Record<string, boolean>> = {}
      Object.keys(prev).forEach(k => {
        const row = { ...prev[k] }
        delete row[person.id]
        next[k] = row
      })
      return next
    })
    message.success('人员已移除')
  }

  // 告警开关切换
  const onToggleAlarm = (key: string, checked: boolean): void => {
    setAlarmSwitches(prev => ({ ...prev, [key]: checked }))
  }

  // 提醒矩阵切换（单元格开关）
  const onToggleReminder = (noticeKey: string, personId: string, checked: boolean): void => {
    setReminderMatrix(prev => ({
      ...prev,
      [noticeKey]: { ...prev[noticeKey], [personId]: checked }
    }))
  }

  // Webhook 区域
  const WebhookSection = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title={
          <Space>
            <RobotOutlined />
            <span style={{ fontSize: 18 }}>Webhook 管理</span>
          </Space>
        }
        extra={
          <Tooltip title="新增机器人">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWebhook} disabled={!!webhook} />
          </Tooltip>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">当前仅支持一个 webhook 机器人，添加后不可删除，仅可编辑。</Text>
        </div>

        {!webhook ? (
          <Empty description="尚未添加机器人" />
        ) : (
          <Card size="small" styles={{ body: { paddingTop: 8 } }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={<strong>机器人名称</strong>}>{webhook.name}</Descriptions.Item>
              <Descriptions.Item label={<strong>Webhook 地址</strong>}>
                <Text ellipsis style={{ maxWidth: 620 }}>{webhook.url}</Text>
              </Descriptions.Item>
              {webhook.secret ? (
                <Descriptions.Item label={<strong>加签密钥</strong>}>
                  <Text>{webhook.secret}</Text>
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            <div style={{ marginTop: 8 }}>
              <Space>
                {/* 测试：模拟发送测试消息 */}
                <Tooltip title="发送测试消息">
                  <Button icon={<SendOutlined />} onClick={handleTestWebhook} />
                </Tooltip>
                {/* 编辑：打开编辑抽屉 */}
                <Tooltip title="编辑机器人">
                  <Button icon={<EditOutlined />} onClick={handleEditWebhook} />
                </Tooltip>
              </Space>
            </div>
          </Card>
        )}
      </Card>

      {/* 新增 Webhook 抽屉 */}
      <Drawer
        title="新增机器人"
        open={addWebhookOpen}
        width={520}
        onClose={() => setAddWebhookOpen(false)}
        destroyOnClose
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
            <Input placeholder="例如：发布告警机器人" />
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
          <Space>
            <Button type="primary" onClick={onSubmitAddWebhook}>保存</Button>
            <Button onClick={() => setAddWebhookOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Drawer>

      {/* 编辑 Webhook 抽屉 */}
      <Drawer
        title="编辑机器人"
        open={editWebhookOpen}
        width={520}
        onClose={() => setEditWebhookOpen(false)}
        destroyOnClose
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
            <Input placeholder="例如：发布告警机器人" />
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
          <Space>
            <Button type="primary" onClick={onSubmitEditWebhook}>保存</Button>
            <Button onClick={() => setEditWebhookOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Drawer>
    </Space>
  )

  // 人员配置
  const peopleColumns: ColumnsType<Person> = useMemo(() => ([
    { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '钉钉ID', dataIndex: 'dingId', key: 'dingId', width: 260 },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_, person) => (
        <Space>
          <Popconfirm
            title="确认移除该人员？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => onDeletePerson(person)}
          >
            {/* 图标操作：仅显示图标，并用 Tooltip 解释含义 */}
            <Tooltip title="删除人员">
              <Button danger type="text" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]), [])

  const PeopleSection = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span style={{ fontSize: 18 }}>人员配置</span>
          </Space>
        }
        extra={
          <Tooltip title="新增人员">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPerson} />
          </Tooltip>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <Table<Person>
          rowKey="id"
          columns={peopleColumns}
          dataSource={people}
          pagination={{ pageSize: 8 }}
        />

        {/* 新增人员抽屉 */}
        <Drawer
          title="新增人员"
          open={addPersonOpen}
          width={480}
          onClose={() => setAddPersonOpen(false)}
          destroyOnClose
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
            <Space>
              <Button type="primary" onClick={onSubmitAddPerson}>保存</Button>
              <Button onClick={() => setAddPersonOpen(false)}>取消</Button>
            </Space>
          </Form>
        </Drawer>
      </Card>
    </Space>
  )

  // 告警类：表头为告警项名称，表体单行“开关”
  interface AlarmRow { id: string; label: string }
  const alarmColumns: ColumnsType<AlarmRow> = useMemo(() => {
    const base: ColumnsType<AlarmRow> = [
      { title: '告警项', dataIndex: 'label', key: 'label', fixed: 'left', width: 100 }
    ]
    const alertCols: ColumnsType<AlarmRow> = alarmNoticeList.map(a => ({
      title: a.name,
      key: a.key,
      width: 180,
      render: () => (
        <Switch
          checkedChildren="on"
          unCheckedChildren="off"
          checked={!!alarmSwitches[a.key]}
          onChange={(checked) => onToggleAlarm(a.key, checked)}
        />
      )
    }))
    return [...base, ...alertCols]
  }, [alarmSwitches])

  const alarmDataSource: AlarmRow[] = useMemo(() => ([{ id: 'row', label: '操作' }]), [])

  // 提醒类矩阵 Table 列：表头为提醒项（横轴），行首为人员
  const reminderColumns: ColumnsType<ReminderRow> = useMemo(() => {
    const totalCols = 1 + reminderNoticeList.length
    const base: ColumnsType<ReminderRow> = [
      {
        title: '提醒项',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 100,
        render: (_, row) => (
          isEmptyRow(row)
            ? <Text type="secondary">暂无人员配置，请新增联系人，否则群消息不会@相关人员</Text>
            : row.name
        ),
        onCell: (row) => (isEmptyRow(row) ? { colSpan: totalCols } : { colSpan: 1 })
      }
    ]
    const noticeCols: ColumnsType<ReminderRow> = reminderNoticeList.map(n => ({
      title: n.name,
      key: n.key,
      width: 160,
      render: (_, row) => (
        isEmptyRow(row)
          ? null
          : (
            <Switch
              checkedChildren="on"
              unCheckedChildren="off"
              checked={reminderMatrix[n.key]?.[row.id] ?? true}
              onChange={(checked) => onToggleReminder(n.key, row.id, checked)}
            />
          )
      ),
      onCell: (row) => (isEmptyRow(row) ? { colSpan: 0 } : { colSpan: 1 })
    }))
    return [...base, ...noticeCols]
  }, [reminderMatrix])

  const NoticeSection = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title={
          <Space>
            <BellOutlined />
            <span style={{ fontSize: 18 }}>告警管理</span>
          </Space>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card size="small" title="告警类提醒" styles={{ body: { paddingTop: 8 } }}>
            <Table
              rowKey="id"
              columns={alarmColumns}
              dataSource={alarmDataSource}
              pagination={false}
              scroll={{ x: 800 }}
            />
          </Card>

          <Card size="small" title="提醒类提醒" styles={{ body: { paddingTop: 8 } }}>
            <Table
              rowKey="id"
              columns={reminderColumns}
              dataSource={
                (people.length === 0
                  ? ([{ id: '__empty__', name: '', dingId: '' }] as ReminderRow[])
                  : (people as ReminderRow[]))
              }
              pagination={false}
              scroll={{ x: 800 }}
            />
          </Card>
        </Space>
      </Card>
    </Space>
  )

  const items: TabsProps['items'] = [
    { key: 'notice', label: '告警管理', children: NoticeSection },
    { key: 'people', label: '人员配置', children: PeopleSection },
    { key: 'webhook', label: 'Webhook 管理', children: WebhookSection }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>告警配置</Title>
      </div>

      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  )
}

