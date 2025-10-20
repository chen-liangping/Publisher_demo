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
  Popconfirm,
  Tag,
  Modal,
  Collapse,
  Cascader,
  Checkbox,
  List,
  Radio,
  Select
} from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { 
  PlusOutlined,
  EditOutlined,
  SendOutlined,
  DeleteOutlined,
  RobotOutlined,
  TeamOutlined,
  BellOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
  UndoOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

// 数据类型定义，避免使用 any
interface Webhook {
  name: string
  url: string
  secret?: string
}

// 多个 webhook 项（包含唯一 id）
interface WebhookItem extends Webhook {
  id: string
}

interface Person {
  id: string
  name: string
  dingId: string
}

// 通用矩阵行类型（用于“客户端告警”和“服务端告警”）
type MatrixRowKind = 'webhook' | 'person' | 'empty'
interface MatrixRow { kind: MatrixRowKind; id: string; label: string }
const isEmptyMatrixRow = (row: MatrixRow): boolean => row.kind === 'empty'

interface NoticeItem {
  key: string
  name: string
}

// 合并后的告警行类型（客户端/服务端合并展示）
interface CombinedNotice {
  key: string
  name: string
  group: '客户端' | '服务端'
}

// 客户端告警类提醒（开关表）
const alarmNoticeList: NoticeItem[] = [
  { key: 'clientNewVersion', name: '客户端创建新版本' },
  { key: 'clientVersionSwitch', name: '客户端版本切换' },
  { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败' },
  { key: 's3UnzipSuccess', name: 'S3 zip解压成功' },
  { key: 's3UnzipFail', name: 'S3 zip解压失败' },
  { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞' },
  { key: 'ossConfigChange', name: 'oss配置文件变更' }
]

// 服务端告警类（矩阵: 通知项 x 人员）
const reminderNoticeList: NoticeItem[] = [
  { key: 'autoOpenServerSuccess', name: '自动开服成功' },
  { key: 'autoOpenServerFail', name: '自动开服失败' },
  { key: 'notifyCPFail', name: '通知CP新预备服失败' },
  { key: 'prepareDeployFail', name: '预备服部署失败' },
  { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败' },
  { key: 'autoOpenPolicyChange', name: '自动开服策略变更' },
  { key: 'serverDeployFail', name: '服务端部署失败' },
  { key: 'serverDeploySuccess', name: '服务端部署成功' },
  { key: 'grayRollback', name: '灰度回滚' },
  { key: 'grayRollbackDone', name: '灰度回滚完成' },
  { key: 'grayAppend', name: '追加灰度' },
  { key: 'grayAppendDone', name: '灰度追加完成' },
  { key: 'grayFullDeploy', name: '灰度全量部署' },
  { key: 'podHealthCheckFail', name: 'pod健康检查失败' },
  { key: 'podFailure', name: 'Pod故障' },
  { key: 'podUpdateAbnormal', name: 'Pod更新异常' }
]
const CDNNoticeList: NoticeItem[] = [
  { key: 'CDNDeploySuccess', name: 'CDN部署成功' },
  { key: 'CDNDeployFail', name: 'CDN部署失败' }
]

export default function AlertPage(): React.ReactElement {
  // Webhook：支持多个（默认包含一名机器人 kumo_cp）
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    { id: 'kumo_cp', name: 'kumo_webhook', url: 'https://oapi.dingtalk.com/robot/send?access_token=demo' }
  ])
  const [addWebhookOpen, setAddWebhookOpen] = useState<boolean>(false)
  const [editWebhookOpen, setEditWebhookOpen] = useState<boolean>(false)
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null)
  const [webhookForm] = Form.useForm<Webhook>()
  const [webhookEditForm] = Form.useForm<Webhook>()

  // 人员配置（默认包含一名联系人 slime）
  const [people, setPeople] = useState<Person[]>([
    { id: 'slime', name: '史迪仔', dingId: 'dingtalk:slime' },
    { id: 'xuyin', name: '徐音', dingId: 'dingtalk:xuyin' }
  ])
  const [addPersonOpen, setAddPersonOpen] = useState<boolean>(false)
  const [personForm] = Form.useForm<Person>()

  // 客户端提醒矩阵：noticeKey -> { personId: boolean }，默认开启
  const [reminderMatrix, setReminderMatrix] = useState<Record<string, Record<string, boolean>>>(
    () => reminderNoticeList.reduce((acc, item) => ({ ...acc, [item.key]: {} }), {})
  )

  // 客户端告警类（人员 x 告警项）矩阵
  const [alarmPersonMatrix, setAlarmPersonMatrix] = useState<Record<string, Record<string, boolean>>>(
    () => alarmNoticeList.reduce((acc, item) => ({ ...acc, [item.key]: {} }), {})
  )

  // Webhook 配置（整行应用 + 每告警项专属配置）
  const [webhookSelectionAlarmRow, setWebhookSelectionAlarmRow] = useState<string | undefined>('kumo_cp')
  const [webhookSelectionReminderRow, setWebhookSelectionReminderRow] = useState<string | undefined>('kumo_cp')
  const [webhookModalOpen, setWebhookModalOpen] = useState<boolean>(false)
  const [webhookModalMode, setWebhookModalMode] = useState<'alarm' | 'reminder'>('alarm')
  const [tempWebhookIds, setTempWebhookIds] = useState<string[]>([])
  // 每告警项：选择触发的 webhook（null 表示不触发）
  const [alarmWebhookByNotice, setAlarmWebhookByNotice] = useState<Record<string, string | null>>(
    () => alarmNoticeList.reduce((acc, n) => ({ ...acc, [n.key]: 'kumo_cp' }), {} as Record<string, string | null>)
  )
  const [reminderWebhookByNotice, setReminderWebhookByNotice] = useState<Record<string, string | null>>(
    () => reminderNoticeList.reduce((acc, n) => ({ ...acc, [n.key]: 'kumo_cp' }), {} as Record<string, string | null>)
  )
  const webhookOptions = useMemo(() => webhooks.map(w => ({ label: w.name, value: w.id })), [webhooks])

  // 合并表：数据与工具方法
  const alarmKeySet = useMemo(() => new Set(alarmNoticeList.map(n => n.key)), [])
  const allNotices: CombinedNotice[] = useMemo(() => [
    ...alarmNoticeList.map(n => ({ ...n, group: '客户端' as const })),
    ...reminderNoticeList.map(n => ({ ...n, group: '服务端' as const }))
  ], [])

  const [configNoticeKey, setConfigNoticeKey] = useState<string | null>(null)

  const getNoticeWebhook = (noticeKey: string): string | null => (
    alarmKeySet.has(noticeKey) ? (alarmWebhookByNotice[noticeKey] ?? null) : (reminderWebhookByNotice[noticeKey] ?? null)
  )
  const setNoticeWebhook = (noticeKey: string, webhookId: string | null): void => {
    if (alarmKeySet.has(noticeKey)) {
      setAlarmWebhookByNotice(prev => ({ ...prev, [noticeKey]: webhookId }))
    } else {
      setReminderWebhookByNotice(prev => ({ ...prev, [noticeKey]: webhookId }))
    }
  }
  const getPersonChecked = (noticeKey: string, personId: string): boolean => (
    alarmKeySet.has(noticeKey) ? (alarmPersonMatrix[noticeKey]?.[personId] ?? true) : (reminderMatrix[noticeKey]?.[personId] ?? true)
  )
  const setPersonChecked = (noticeKey: string, personId: string, checked: boolean): void => {
    if (alarmKeySet.has(noticeKey)) {
      setAlarmPersonMatrix(prev => ({ ...prev, [noticeKey]: { ...(prev[noticeKey] ?? {}), [personId]: checked } }))
    } else {
      setReminderMatrix(prev => ({ ...prev, [noticeKey]: { ...(prev[noticeKey] ?? {}), [personId]: checked } }))
    }
  }
  const handleWebhookSwitch = (noticeKey: string, on: boolean): void => {
    if (on) {
      if (webhooks.length <= 1) {
        setNoticeWebhook(noticeKey, webhooks[0]?.id ?? null)
      } else {
        setConfigNoticeKey(noticeKey)
        const preset = getNoticeWebhook(noticeKey)
        setTempWebhookIds(preset ? [preset] : [])
        setWebhookModalOpen(true)
      }
    } else {
      // 关闭 webhook，则清空 webhook 且关闭所有人员开关
      setNoticeWebhook(noticeKey, null)
      people.forEach(p => setPersonChecked(noticeKey, p.id, false))
    }
  }
  const handleWebhookConfig = (noticeKey: string): void => {
    setConfigNoticeKey(noticeKey)
    const preset = getNoticeWebhook(noticeKey)
    setTempWebhookIds(preset ? [preset] : [])
    setWebhookModalOpen(true)
  }
  const handleWebhookModalOk = (): void => {
    if (!configNoticeKey) return
    const picked = tempWebhookIds[0] ?? null
    setNoticeWebhook(configNoticeKey, picked)
    setWebhookModalOpen(false)
    message.success('Webhook 配置已更新')
  }

  // 添加 Webhook（打开抽屉）
  const handleAddWebhook = (): void => {
    setAddWebhookOpen(true)
  }

  // 提交新增 Webhook
  const onSubmitAddWebhook = async (): Promise<void> => {
    try {
      const values = await webhookForm.validateFields()
      const item: WebhookItem = { id: Date.now().toString(), ...values }
      setWebhooks(prev => [item, ...prev])
      setAddWebhookOpen(false)
      message.success('Webhook 添加成功')
      webhookForm.resetFields()
    } catch {
      // 校验失败不做处理
    }
  }

  // 打开编辑 Webhook
  const handleEditWebhook = (item: WebhookItem): void => {
    setEditingWebhookId(item.id)
    // 预填充编辑表单
    webhookEditForm.setFieldsValue(item)
    setEditWebhookOpen(true)
  }

  // 提交编辑 Webhook
  const onSubmitEditWebhook = async (): Promise<void> => {
    try {
      const values = await webhookEditForm.validateFields()
      setWebhooks(prev => prev.map(w => (w.id === editingWebhookId ? { ...w, ...values } : w)))
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

  // 告警-人员矩阵切换
  const onToggleAlarmPerson = (noticeKey: string, personId: string, checked: boolean): void => {
    setAlarmPersonMatrix(prev => ({
      ...prev,
      [noticeKey]: { ...prev[noticeKey], [personId]: checked }
    }))
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
            <span style={{ fontSize: 18 }}>机器人管理</span>
          </Space>
        }
        extra={
          <Tooltip title="新增机器人">
            {/* 图标按钮：打开新增抽屉 */}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWebhook} />
          </Tooltip>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">支持配置多个自建群机器人，用于将告警/提醒发送到不同群。</Text>
        </div>

        {webhooks.length === 0 ? (
          <Empty description="尚未添加机器人" />
        ) : (
          <Space direction="vertical" size={12} style={{ display: 'flex' }}>
            {webhooks.map(item => (
              <Card key={item.id} size="small" styles={{ body: { paddingTop: 8 } }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={<strong>机器人名称</strong>}>{item.name}</Descriptions.Item>
                  <Descriptions.Item label={<strong>Webhook 地址</strong>}>
                    <Text ellipsis style={{ maxWidth: 620 }}>{item.url}</Text>
                  </Descriptions.Item>
                  {item.secret ? (
                    <Descriptions.Item label={<strong>加签密钥</strong>}>
                      <Text>{item.secret}</Text>
                    </Descriptions.Item>
                  ) : null}
                </Descriptions>

                <div style={{ marginTop: 8 }}>
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
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Card>

      {/* 新增 Webhook 抽屉 */}
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
        </Form>
      </Drawer>

      {/* 编辑 Webhook 抽屉 */}
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
    </Space>
  )

  // 旧的客户端告警矩阵已合并为统一表格

  const alarmRows: MatrixRow[] = useMemo(() => {
    const rows: MatrixRow[] = [{ kind: 'webhook' as const, id: '__webhook__', label: 'Webhook' }]
    if (people.length === 0) {
      rows.push({ kind: 'empty' as const, id: '__empty__', label: '' })
    } else {
      rows.push(...people.map(p => ({ kind: 'person' as const, id: p.id, label: p.name })))
    }
    return rows
  }, [people])

  // 旧的服务端告警矩阵已合并为统一表格

  const reminderRows: MatrixRow[] = useMemo(() => {
    const rows: MatrixRow[] = [{ kind: 'webhook' as const, id: '__webhook__', label: 'Webhook' }]
    if (people.length === 0) {
      rows.push({ kind: 'empty' as const, id: '__empty__', label: '' })
    } else {
      rows.push(...people.map(p => ({ kind: 'person' as const, id: p.id, label: p.name })))
    }
    return rows
  }, [people])

  // 模拟“Element 风格”的树形表格（机器人 + 人员列）
  type TriState = boolean | 'indeterminate'
  interface TreeRow {
    key: string
    name: string
    level: 1 | 2 | 3
    robot: TriState
    children?: TreeRow[]
  }

  const renderChannelCheckbox = (value: TriState, onChange?: (checked: boolean) => void): React.ReactElement => (
    <Checkbox
      indeterminate={value === 'indeterminate'}
      checked={value === true}
      onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
    />
  )

  // 每个“消息类型 x 人员”的开关状态矩阵（仅 UI）
  const [personChannelMatrix, setPersonChannelMatrix] = useState<Record<string, Record<string, boolean>>>({})
  // 机器人勾选状态（消息类型 -> 是否启用机器人渠道）
  const [robotMatrix, setRobotMatrix] = useState<Record<string, boolean>>({})
  // 小包开关状态（消息类型 -> 是否启用小包）
  const [packageMatrix, setPackageMatrix] = useState<Record<string, boolean>>({})
  // 行级 webhook 选择（key -> webhookId 数组，支持多选；空数组=不触发）
  const [rowWebhookByKey, setRowWebhookByKey] = useState<Record<string, string[]>>({})
  
  // 告警规则：每个节点可配置多条（服务端部署等）
  interface AlertRule { id: string; app: string; frequency: string }
  const [alertRulesByKey, setAlertRulesByKey] = useState<Record<string, AlertRule[]>>({})
  const [rulesModalOpen, setRulesModalOpen] = useState<boolean>(false)
  const [rulesEditingKey, setRulesEditingKey] = useState<string | null>(null)
  const [tempRules, setTempRules] = useState<AlertRule[]>([])
  
  // 规则下拉：示例应用与频率（可按需扩展）
  const appSelectOptions = useMemo(() => ([
    { label: 'open-platform', value: 'open-platform' },
    { label: 'flashlaunch', value: 'flashlaunch' },
    { label: 'oss', value: 'oss' },
    { label: 'server', value: 'server' },
    { label: 'client', value: 'client' }
  ]), [])
  const freqSelectOptions = useMemo(() => ([
    { label: '每5分钟', value: '5m' },
    { label: '每1小时', value: '1h' },
    { label: '每8小时', value: '8h' },
    { label: '每12小时', value: '12h' },
    { label: '每24小时', value: '24h' }

  ]), [])
  
  // 默认规则：用于首次打开“服务端部署”等节点时预填
  const makeDefaultRules = (): AlertRule[] => {
    const ts = Date.now()
    return [
      { id: `def-${ts}-1`, app: 'open-platform', frequency: '1h' },
      { id: `def-${ts}-2`, app: 'flashlaunch', frequency: '1h' }
    ]
  }
  // 当前配置中的节点 key
  const [configKey, setConfigKey] = useState<string | null>(null)

  // 客户端与服务端树数据（按文档层级）
  const clientTreeDataA: TreeRow[] = useMemo(() => ([
    {
      key: 'client-root', name: '客户端告警', level: 1, robot: false,
      children: [
        {
          key: 'client-version', name: '客户端版本', level: 2, robot: false,
          children: [
            { key: 'clientNewVersion', name: '客户端创建新版本', level: 3, robot: false },
            { key: 'clientVersionSwitch', name: '客户端版本切换', level: 3, robot: false },
            { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败', level: 3, robot: false }
          ]
        },
        {
          key: 'client-s3', name: 'S3 解压', level: 2, robot: false,
          children: [
            { key: 's3UnzipSuccess', name: 'S3 zip解压成功', level: 3, robot: false },
            { key: 's3UnzipFail', name: 'S3 zip解压失败', level: 3, robot: false }
          ]
        },
        { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞', level: 2, robot: false },
        { key: 'ossConfigChange', name: 'oss配置文件变更', level: 2, robot: false }
      ]
    }
  ]), [])

  const serverTreeDataA: TreeRow[] = useMemo(() => ([
    {
      key: 'server-root', name: '服务端告警', level: 1, robot: false,
      children: [
        {
          key: 'server-auto-open', name: '自动开服', level: 2, robot: false,
          children: [
            { key: 'autoOpenServerSuccess', name: '自动开服成功', level: 3, robot: false },
            { key: 'autoOpenServerFail', name: '自动开服失败', level: 3, robot: false },
            { key: 'notifyCPFail', name: '通知CP新预备服失败', level: 3, robot: false },
            { key: 'prepareDeployFail', name: '预备服部署失败', level: 3, robot: false },
            { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败', level: 3, robot: false },
            { key: 'autoOpenPolicyChange', name: '自动开服策略变更', level: 3, robot: false }
          ]
        },
        {
          key: 'server-deploy', name: '服务端', level: 2, robot: false,
          children: [
            { key: 'serverDeployFail', name: '服务端部署失败', level: 3, robot: false },
            { key: 'serverDeploySuccess', name: '服务端部署成功', level: 3, robot: false }
          ]
        },
        {
          key: 'server-gray', name: '灰度发布', level: 2, robot: false,
          children: [
            { key: 'grayRollback', name: '灰度回滚', level: 3, robot: false },
            { key: 'grayRollbackDone', name: '灰度回滚完成', level: 3, robot: false },
            { key: 'grayAppend', name: '追加灰度', level: 3, robot: false },
            { key: 'grayAppendDone', name: '灰度追加完成', level: 3, robot: false },
            { key: 'grayFullDeploy', name: '灰度全量部署', level: 3, robot: false }
          ]
        },
        {
          key: 'server-pod', name: 'pod 状态', level: 2, robot: false,
          children: [
            { key: 'podHealthCheckFail', name: 'pod健康检查失败', level: 3, robot: false },
            { key: 'podFailure', name: 'Pod故障', level: 3, robot: false },
            { key: 'podUpdateAbnormal', name: 'Pod更新异常', level: 3, robot: false }
          ]
        }
      ]
    }
  ]), [])

  // CDN 与客户端、服务端同级（Level1）
  const cdnTreeDataA: TreeRow[] = useMemo(() => ([
    {
      key: 'cdn-root', name: 'CDN 部署告警', level: 1, robot: false,
      children: [
        { key: 'CDNDeploySuccess', name: 'CDN部署成功', level: 2, robot: false },
        { key: 'CDNDeployFail', name: 'CDN部署失败', level: 2, robot: false }
      ]
    }
  ]), [])

  

  // 辅助：构建 key -> node、父子关系，用于级联与三态计算
  type NodeMaps = {
    nodeByKey: Record<string, TreeRow>
    childrenByKey: Record<string, string[]>
    parentByKey: Record<string, string | null>
    allKeys: string[]
  }
  const maps: NodeMaps = useMemo(() => {
    const nodeByKey: Record<string, TreeRow> = {}
    const childrenByKey: Record<string, string[]> = {}
    const parentByKey: Record<string, string | null> = {}
    const walk = (nodes: TreeRow[], parent: string | null) => {
      nodes.forEach(n => {
        nodeByKey[n.key] = n
        parentByKey[n.key] = parent
        if (n.children && n.children.length) {
          childrenByKey[n.key] = n.children.map(c => c.key)
          walk(n.children, n.key)
        } else {
          childrenByKey[n.key] = []
        }
      })
    }
    const allRoots: TreeRow[] = [...clientTreeDataA, ...serverTreeDataA, ...cdnTreeDataA]
    walk(allRoots, null)
    return { nodeByKey, childrenByKey, parentByKey, allKeys: Object.keys(nodeByKey) }
  }, [clientTreeDataA, serverTreeDataA, cdnTreeDataA])

  const getDescendants = (key: string): string[] => {
    const out: string[] = []
    const dfs = (k: string) => {
      const kids = maps.childrenByKey[k] || []
      kids.forEach(c => {
        out.push(c)
        dfs(c)
      })
    }
    dfs(key)
    return out
  }

  const getAncestors = (key: string): string[] => {
    const out: string[] = []
    let cur: string | null = key
    while (cur) {
      const parentKey: string | null = maps.parentByKey[cur] ?? null
      if (parentKey) out.push(parentKey)
      cur = parentKey
    }
    return out
  }

  // 机器人三态：从叶子汇总
  const getRobotTri = (key: string): TriState => {
    const keys = [key, ...getDescendants(key)]
    let hasTrue = false
    let hasFalse = false
    for (const k of keys) {
      const base = robotMatrix[k] ?? (maps.nodeByKey[k]?.robot === true)
      if (base) hasTrue = true; else hasFalse = true
      if (hasTrue && hasFalse) return 'indeterminate'
    }
    return hasTrue ? true : false
  }

  // 小包三态：从叶子汇总
  const getPackageTri = (key: string): TriState => {
    const keys = [key, ...getDescendants(key)]
    let hasTrue = false
    let hasFalse = false
    for (const k of keys) {
      const base = packageMatrix[k] ?? false
      if (base) hasTrue = true; else hasFalse = true
      if (hasTrue && hasFalse) return 'indeterminate'
    }
    return hasTrue ? true : false
  }

  // 人员三态：从叶子汇总（不考虑机器人，仅计算开关状态）
  const getPersonTri = (key: string, personId: string): TriState => {
    const keys = [key, ...getDescendants(key)]
    let hasTrue = false
    let hasFalse = false
    for (const k of keys) {
      const base = (personChannelMatrix[k]?.[personId] ?? true)
      if (base) hasTrue = true; else hasFalse = true
      if (hasTrue && hasFalse) return 'indeterminate'
    }
    return hasTrue ? true : false
  }

  const setRobotCascade = (key: string, value: boolean): void => {
    const keys = [key, ...getDescendants(key)]
    setRobotMatrix(prev => {
      const next = { ...prev }
      keys.forEach(k => { next[k] = value })
      return next
    })
    if (!value) {
      // 机器人关闭时，所有人员关闭
      setPersonChannelMatrix(prev => {
        const next = { ...prev }
        keys.forEach(k => {
          const row = { ...(next[k] ?? {}) }
          people.forEach(p => { row[p.id] = false })
          next[k] = row
        })
        return next
      })
    }
  }

  const setPackageCascade = (key: string, value: boolean): void => {
    const keys = [key, ...getDescendants(key)]
    setPackageMatrix(prev => {
      const next = { ...prev }
      keys.forEach(k => { next[k] = value })
      return next
    })
    if (!value) {
      // 当小包也关闭，且机器人同样关闭时，人员默认关闭
      const robotOffEverywhere = (k: string) => (robotMatrix[k] ?? false) === false
      setPersonChannelMatrix(prev => {
        const next = { ...prev }
        keys.forEach(k => {
          if (robotOffEverywhere(k)) {
            const row = { ...(next[k] ?? {}) }
            people.forEach(p => { row[p.id] = false })
            next[k] = row
          }
        })
        return next
      })
    }
  }

  const setPersonCascade = (key: string, personId: string, value: boolean): void => {
    const keys = [key, ...getDescendants(key)]
    setPersonChannelMatrix(prev => {
      const next = { ...prev }
      keys.forEach(k => {
        const row = { ...(next[k] ?? {}) }
        row[personId] = value
        next[k] = row
      })
      return next
    })
  }

  const treeColumns: ColumnsType<TreeRow> = useMemo(() => {
    const base: ColumnsType<TreeRow> = [
      {
        title: '消息类型', dataIndex: 'name', key: 'name', width: 40, fixed: 'left',
        render: (_: unknown, r: TreeRow) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ paddingLeft: r.level === 1 ? 0 : r.level === 2 ? 16 : 24, flex: '0 1 auto' }}>{r.name}</div>
            {r.key === 'server-deploy' && (
              <Tooltip title="编辑告警规则">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setRulesEditingKey(r.key)
                    setTempRules((alertRulesByKey[r.key] && alertRulesByKey[r.key].length > 0) ? alertRulesByKey[r.key] : makeDefaultRules())
                    setRulesModalOpen(true)
                  }}
                />
              </Tooltip>
            )}
          </div>
        )
      },
      { title: '小包', key: 'smallpkg', width: 40, render: (_: unknown, r: TreeRow) => {
        const tri = getPackageTri(r.key)
        const enabled = tri === true
        return (
          <Switch
            checkedChildren="on"
            unCheckedChildren="off"
            checked={enabled}
            onChange={(checked) => setPackageCascade(r.key, checked)}
          />
        )
      } },
      { title: '自建群机器人', key: 'robot', width: 40, render: (_: unknown, r: TreeRow) => {
        const tri = getRobotTri(r.key)
        const enabled = tri === true
        const configuredIds = rowWebhookByKey[r.key] ?? []
        const needConfig = enabled && configuredIds.length === 0
        return (
          <Space>
            <Checkbox
              indeterminate={tri === 'indeterminate'}
              checked={enabled}
              onChange={(e) => setRobotCascade(r.key, e.target.checked)}
            />
            <Tooltip title={enabled ? (needConfig ? '请配置机器人' : '配置机器人') : '请先开启自建群机器人'}>
              <Button
                size="small"
                type="text"
                icon={<SettingOutlined />}
                danger={needConfig}
                className={needConfig ? 'alert-config-pulse' : undefined}
                disabled={!enabled}
                onClick={() => {
                  setConfigKey(r.key)
                  const preset = rowWebhookByKey[r.key] ?? []
                  setTempWebhookIds(preset)
                  setWebhookModalOpen(true)
                }}
              />
            </Tooltip>
          </Space>
        )
      } }
    ]
    const personCols: ColumnsType<TreeRow> = people.map((p: Person): ColumnType<TreeRow> => ({
      title: p.name,
      key: `person_${p.id}`,
      width: 40,
      render: (_: unknown, r: TreeRow) => {
        const robotEnabled = getRobotTri(r.key) === true
        const packageEnabled = getPackageTri(r.key) === true
        const channelEnabled = robotEnabled || packageEnabled
        const personTri = getPersonTri(r.key, p.id)
        const personChecked = personTri === true
        return (
          <Switch
            checkedChildren="on"
            unCheckedChildren="off"
            checked={channelEnabled && personChecked}
            disabled={!channelEnabled}
            onChange={(checked) => setPersonCascade(r.key, p.id, checked)}
          />
        )
      }
    }))
    return [...base, ...personCols]
  }, [people, personChannelMatrix, robotMatrix, packageMatrix, rowWebhookByKey])

  const clientTreeData: TreeRow[] = useMemo(() => ([
    {
      key: 'client-root', name: '客户端告警', level: 1, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false, person: 'indeterminate',
      children: [
        {
          key: 'client-version', name: '客户端版本', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'clientNewVersion', name: '客户端创建新版本', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' },
            { key: 'clientVersionSwitch', name: '客户端版本切换', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' },
            { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' }
          ]
        },
        {
          key: 'client-s3', name: 'S3 解压', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 's3UnzipSuccess', name: 'S3 zip解压成功', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 's3UnzipFail', name: 'S3 zip解压失败', level: 3, siteMsg: true, sms: true, email: true, robot: false }
          ]
        },
        { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞', level: 2, siteMsg: true, sms: true, email: true, robot: false },
        { key: 'ossConfigChange', name: 'oss配置文件变更', level: 2, siteMsg: true, sms: true, email: true, robot: false }
      ]
    }
  ]), [])

  const serverTreeData: TreeRow[] = useMemo(() => ([
    {
      key: 'server-root', name: '服务端告警', level: 1, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
      children: [
        {
          key: 'server-auto-open', name: '自动开服', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'autoOpenServerSuccess', name: '自动开服成功', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'autoOpenServerFail', name: '自动开服失败', level: 3, siteMsg: true, sms: true, email: true, robot: false }, 
            { key: 'notifyCPFail', name: '通知CP新预备服失败', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'prepareDeployFail', name: '预备服部署失败', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'autoOpenPolicyChange', name: '自动开服策略变更', level: 3, siteMsg: true, sms: true, email: true, robot: false }
          ]
        },
        {
          key: 'server-deploy', name: '服务端', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'serverDeployStart', name: '服务端部署', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'serverDeployDone', name: '服务端部署完成', level: 3, siteMsg: true, sms: true, email: true, robot: false }
          ]
        },
        {
          key: 'server-gray', name: '灰度发布', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'grayRollback', name: '灰度回滚', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'grayRollbackDone', name: '灰度回滚完成', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'grayAppend', name: '追加灰度', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'grayAppendDone', name: '灰度追加完成', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'grayFullDeploy', name: '灰度全量部署', level: 3, siteMsg: true, sms: true, email: true, robot: false }
          ]
        },
        {
          key: 'server-pod', name: 'pod 状态', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'podHealthCheckFail', name: 'pod健康检查失败', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'podFailure', name: 'Pod故障', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'podUpdateAbnormal', name: 'Pod更新异常', level: 3, siteMsg: true, sms: true, email: true, robot: false }
          ]
        },
        {
          key: 'server-CDN', name: 'CDN 部署告警', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'CDNDeploySuccess', name: 'CDN部署成功', level: 3, siteMsg: true, sms: true, email: true, robot: false },
            { key: 'CDNDeployFail', name: 'CDN部署失败', level: 3, siteMsg: true, sms: true, email: true, robot: false }
          ]
        }
      ]
    }
  ]), [])

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
        <>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Input placeholder="请输入消息类型" style={{ width: 240 }} suffix={<SearchOutlined />} />
            </Space>
          </div>
          <Table
            rowKey="key"
            columns={treeColumns}
            dataSource={[...clientTreeDataA, ...serverTreeDataA, ...cdnTreeDataA]}
            pagination={false}
            scroll={{ x: 1190, y: 420 }}
            expandable={{ defaultExpandAllRows: false }}
          />
        </>
      </Card>
    </Space>
  )

  const items: TabsProps['items'] = [
    { key: 'notice', label: '告警管理', children: NoticeSection },
    { key: 'people', label: '人员配置', children: PeopleSection },
    { key: 'webhook', label: '自建群机器人', children: WebhookSection }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>告警配置</Title>
      </div>

      <Card>
        <Tabs items={items} />
      </Card>

      {/* Webhook 配置 Modal：应用于被点击的节点（整行） */}
      <Modal
        title="配置 Webhook"
        open={webhookModalOpen}
        onCancel={() => setWebhookModalOpen(false)}
        onOk={() => {
          const key = configKey
          if (key) {
            const picked = [...tempWebhookIds]
            const keysToApply = [key, ...getDescendants(key)]
            setRowWebhookByKey(prev => {
              const next = { ...prev }
              keysToApply.forEach(k => { next[k] = picked })
              return next
            })
          }
          setWebhookModalOpen(false)
        }}
      >
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>
          <Typography.Text type="secondary">选择一个或多个机器人（不选择=不触发）。</Typography.Text>
          <Table
            rowKey="id"
            size="small"
            dataSource={webhooks}
            pagination={false}
            columns={[
              { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
              { title: 'Webhook 地址', dataIndex: 'url', key: 'url', render: (v: string) => <Typography.Text ellipsis style={{ maxWidth: 520, display: 'inline-block' }}>{v}</Typography.Text> }
            ]}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: tempWebhookIds,
              onChange: (keys) => setTempWebhookIds(keys as string[])
            }}
            onRow={(record) => ({ onClick: () => {
              const exists = tempWebhookIds.includes(record.id)
              setTempWebhookIds(exists ? tempWebhookIds.filter(k => k !== record.id) : [...tempWebhookIds, record.id])
            } })}
            scroll={{ x: '100%' }}
          />
        </Space>
      </Modal>

      {/* 告警规则配置 Modal（例如：服务端部署） */}
      <Modal
        title="告警规则配置"
        open={rulesModalOpen}
        onCancel={() => setRulesModalOpen(false)}
        onOk={() => {
          if (!rulesEditingKey) return
          // 校验：应用不可重复
          const apps = tempRules.map(r => r.app).filter(Boolean) as string[]
          const hasDup = new Set(apps).size !== apps.length
          if (hasDup) {
            message.error('告警应用不可重复选择')
            return
          }
          // 保存到当前节点
          setAlertRulesByKey(prev => ({ ...prev, [rulesEditingKey]: [...tempRules] }))
          // 若为父级，按需可扩展：级联应用到后代
          setRulesModalOpen(false)
          message.success('告警规则已保存')
        }}
      >
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>
          <Typography.Text type="secondary">可配置多条告警规则：选择“告警应用”和“报警频率”。</Typography.Text>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={tempRules}
            columns={[
              { title: '告警应用', dataIndex: 'app', key: 'app', width: 200, render: (_: unknown, r: AlertRule, idx: number) => {
                const disabledSet = new Set((tempRules.map(it => it.app).filter(Boolean) as string[]))
                // 当前行已选的值不禁用，允许保留
                if (r.app) disabledSet.delete(r.app)
                const opts = appSelectOptions.map(opt => ({ ...opt, disabled: disabledSet.has(opt.value) }))
                return (
                  <Select
                    style={{ width: '100%' }}
                    placeholder="请选择应用"
                    options={opts}
                    value={r.app}
                    onChange={(v) => {
                      setTempRules(list => list.map((it, i) => i === idx ? { ...it, app: v } : it))
                    }}
                  />
                )
              } },
              { title: '报警频率', dataIndex: 'frequency', key: 'frequency', width: 200, render: (_: unknown, r: AlertRule, idx: number) => (
                <Select
                  style={{ width: '100%' }}
                  placeholder="请选择频率"
                  options={freqSelectOptions}
                  value={r.frequency}
                  onChange={(v) => {
                    setTempRules(list => list.map((it, i) => i === idx ? { ...it, frequency: v } : it))
                  }}
                />
              ) },
              { title: '操作', key: 'actions', width: 120, render: (_: unknown, r: AlertRule, idx: number) => (
                <Space>
                  <Button size="small" onClick={() => {
                    setTempRules(list => list.filter((_, i) => i !== idx))
                  }}>删除</Button>
                </Space>
              ) }
            ]}
          />
          <Button
            type="dashed"
            onClick={() => {
              const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
              setTempRules(list => [...list, { id, app: undefined as unknown as string, frequency: undefined as unknown as string }])
            }}
          >新增规则</Button>
        </Space>
      </Modal>
    </div>
  )
}

