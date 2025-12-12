// 完整迁移自原来的 components/alert/alert.tsx，逻辑保持不变，仅文件路径调整到 Common 目录
// 消息配置页面
// 消息配置页面
'use client'

import React, { useMemo, useState } from 'react'
import PlausibleLikeDashboard from '../Analytics/PlausibleLikeDashboard'
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
  UndoOutlined,
  FileSearchOutlined,
  BarChartOutlined
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

// 合并后的告警行类型（按“告警 / 通知”归类）
interface CombinedNotice {
  key: string
  name: string
  category: '告警' | '通知'
}

// 告警类 - 自动开服
const alertAutoOpenNoticeList: NoticeItem[] = [
  { key: 'autoOpenServerSuccess', name: '自动开服成功' },
  { key: 'autoOpenServerFail', name: '自动开服失败' },
  { key: 'notifyCPFail', name: '通知CP新预备服失败' },
  { key: 'prepareDeployFail', name: '预备服部署失败' },
  { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败' }
]

// 告警类 - 静态资源与 CDN
const alertStaticCdnNoticeList: NoticeItem[] = [
  { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败' },
  { key: 's3UnzipFail', name: 'S3 zip解压失败' },
  { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞' },
  { key: 'CDNDeployFail', name: 'CDN部署失败' },
  { key: 'CDNDeploySuccess', name: 'CDN部署成功' }
]

// 告警类 - 运行时健康
const alertRuntimeHealthNoticeList: NoticeItem[] = [
  { key: 'podHealthCheckFail', name: 'pod健康检查失败' },
  { key: 'podFailure', name: 'Pod故障' },
  { key: 'podUpdateAbnormal', name: 'Pod更新异常' }
]

// 通知类 - 客户端版本
const notificationClientVersionNoticeList: NoticeItem[] = [
  { key: 'clientNewVersion', name: '客户端创建新版本' },
  { key: 'clientVersionSwitch', name: '客户端版本切换' },
  { key: 's3UnzipSuccess', name: 'S3 zip解压成功' }
]

// 通知类 - 配置变更
const notificationConfigChangeNoticeList: NoticeItem[] = [
  { key: 'ossConfigChange', name: 'oss配置文件变更' },
  { key: 'autoOpenPolicyChange', name: '自动开服策略变更' }
]

// 通知类 - 发布过程
const notificationReleaseProcessNoticeList: NoticeItem[] = [
  { key: 'serverDeployFail', name: '服务端部署失败' },
  { key: 'serverDeploySuccess', name: '服务端部署成功' },
  { key: 'grayRollback', name: '灰度回滚' },
  { key: 'grayRollbackDone', name: '灰度回滚完成' },
  { key: 'grayAppend', name: '追加灰度' },
  { key: 'grayAppendDone', name: '灰度追加完成' },
  { key: 'grayFullDeploy', name: '灰度全量部署' }
]

// 所有“告警类”与“通知类”列表
const alertNoticeList: NoticeItem[] = [
  ...alertAutoOpenNoticeList,
  ...alertStaticCdnNoticeList,
  ...alertRuntimeHealthNoticeList
]

const notificationNoticeList: NoticeItem[] = [
  ...notificationClientVersionNoticeList,
  ...notificationConfigChangeNoticeList,
  ...notificationReleaseProcessNoticeList
]

// 兼容原有结构：客户端 / 服务端列表（用于原有矩阵逻辑）
// 客户端相关（含静态资源 & CDN）
const alarmNoticeList: NoticeItem[] = [
  ...alertStaticCdnNoticeList,
  ...notificationClientVersionNoticeList,
  // 配置变更中客户端相关：ossConfigChange
  notificationConfigChangeNoticeList[0]
]

// 服务端相关
const reminderNoticeList: NoticeItem[] = [
  ...alertAutoOpenNoticeList,
  ...alertRuntimeHealthNoticeList,
  // 配置变更中服务端相关：autoOpenPolicyChange
  notificationConfigChangeNoticeList[1],
  ...notificationReleaseProcessNoticeList
]

interface AlertPageProps {
  /** 来自“webhook管理”页面的机器人列表；如果不传则使用内置示例数据 */
  webhooks?: WebhookItem[]
}

export default function AlertPage(props: AlertPageProps): React.ReactElement {
  // Webhook：来自父组件（人员配置 -> webhook 管理）；未传时使用一个默认示例
  const webhooks: WebhookItem[] = props.webhooks ?? [
    { id: 'kumo_cp', name: 'kumo_webhook', url: 'https://oapi.dingtalk.com/robot/send?access_token=demo' }
  ]

  // 人员配置（默认包含一名联系人 slime）
  const [people, setPeople] = useState<Person[]>([
    { id: 'slime', name: 'slime', dingId: 'dingtalk:slime' },
    { id: 'xuyin', name: '徐音', dingId: 'dingtalk:xuyin' }
  ])
  const [addPersonOpen, setAddPersonOpen] = useState<boolean>(false)
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false)
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
  const allNotices: CombinedNotice[] = useMemo(
    () => [
      ...alertNoticeList.map(n => ({ ...n, category: '告警' as const })),
      ...notificationNoticeList.map(n => ({ ...n, category: '通知' as const }))
    ],
    []
  )

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
    if (people.length === 0 && webhooks.length === 0) {
      rows.push({ kind: 'empty' as const, id: '__empty__', label: '' })
    } else {
      rows.push(...people.map(p => ({ kind: 'person' as const, id: p.id, label: p.name })))
      rows.push(...webhooks.map(w => ({ kind: 'person' as const, id: `robot:${w.id}`, label: w.name })))
    }
    return rows
  }, [people, webhooks])

  // 旧的服务端告警矩阵已合并为统一表格

  const reminderRows: MatrixRow[] = useMemo(() => {
    const rows: MatrixRow[] = [{ kind: 'webhook' as const, id: '__webhook__', label: 'Webhook' }]
    if (people.length === 0 && webhooks.length === 0) {
      rows.push({ kind: 'empty' as const, id: '__empty__', label: '' })
    } else {
      rows.push(...people.map(p => ({ kind: 'person' as const, id: p.id, label: p.name })))
      rows.push(...webhooks.map(w => ({ kind: 'person' as const, id: `robot:${w.id}`, label: w.name })))
    }
    return rows
  }, [people, webhooks])

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

  // 每个“消息类型 x 参与者（人员/机器人）”的开关状态矩阵（仅 UI）
  const [actorChannelMatrix, setActorChannelMatrix] = useState<Record<string, Record<string, boolean>>>({})
  // 保留行级 webhook 选择结构（仅供弹窗展示使用，简化为 key -> webhookId 数组）
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

  // 客户端与服务端树数据（按“告警类 / 通知类”分组）
  // 告警 / 通知树数据（Level1：告警 / 通知；Level2：业务场景；Level3：具体告警项）
  const clientTreeDataA: TreeRow[] = useMemo(
    () => [
      {
        key: 'alert-root',
        name: '告警',
        level: 1,
        robot: false,
        children: [
          {
            key: 'alert-auto-open',
            name: '自动开服',
            level: 2,
            robot: false,
            children: alertAutoOpenNoticeList.map((n: NoticeItem): TreeRow => ({
              key: n.key,
              name: n.name,
              level: 3,
              robot: false
            }))
          },
          {
            key: 'alert-static-cdn',
            name: '静态资源与 CDN',
            level: 2,
            robot: false,
            children: alertStaticCdnNoticeList.map((n: NoticeItem): TreeRow => ({
              key: n.key,
              name: n.name,
              level: 3,
              robot: false
            }))
          },
          {
            key: 'alert-runtime',
            name: '运行时健康',
            level: 2,
            robot: false,
            children: alertRuntimeHealthNoticeList.map((n: NoticeItem): TreeRow => ({
              key: n.key,
              name: n.name,
              level: 3,
              robot: false
            }))
          }
        ]
      }
    ],
    []
  )

  const serverTreeDataA: TreeRow[] = useMemo(
    () => [
      {
        key: 'notification-root',
        name: '通知',
        level: 1,
        robot: false,
        children: [
          {
            key: 'notification-client-version',
            name: '客户端版本',
            level: 2,
            robot: false,
            children: notificationClientVersionNoticeList.map((n: NoticeItem): TreeRow => ({
              key: n.key,
              name: n.name,
              level: 3,
              robot: false
            }))
          },
          {
            key: 'notification-config',
            name: '配置变更',
            level: 2,
            robot: false,
            children: notificationConfigChangeNoticeList.map((n: NoticeItem): TreeRow => ({
              key: n.key,
              name: n.name,
              level: 3,
              robot: false
            }))
          },
          {
            key: 'notification-release',
            name: '发布过程',
            level: 2,
            robot: false,
            children: notificationReleaseProcessNoticeList.map((n: NoticeItem): TreeRow => ({
              key: n.key,
              name: n.name,
              level: 3,
              robot: false
            }))
          }
        ]
      }
    ],
    []
  )

  // CDN 与客户端、服务端同级（Level1）
  /*const cdnTreeDataA: TreeRow[] = useMemo(() => ([
    {
      key: 'cdn-root', name: 'CDN 部署告警', level: 1, robot: false,
      children: [
        { key: 'CDNDeploySuccess', name: 'CDN部署成功', level: 2, robot: false },
        { key: 'CDNDeployFail', name: 'CDN部署失败', level: 2, robot: false }
      ]
    }
  ]), [])*/

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
    const allRoots: TreeRow[] = [...clientTreeDataA, ...serverTreeDataA] /*...cdnTreeDataA*/
    walk(allRoots, null)
    return { nodeByKey, childrenByKey, parentByKey, allKeys: Object.keys(nodeByKey) }
  }, [clientTreeDataA, serverTreeDataA]) /*cdnTreeDataA*/

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

  // 参与者：人员 + 机器人 + 站内信，在矩阵中每个参与者对应一列
  interface Actor {
    id: string
    name: string
    kind: 'person' | 'robot' | 'site'
  }

  const actors: Actor[] = useMemo(
    () => [
      { id: 'siteMsg', name: '站内信', kind: 'site' as const },
      ...webhooks.map(w => ({ id: `robot:${w.id}`, name: w.name, kind: 'robot' as const })),
      ...people.map(p => ({ id: p.id, name: p.name, kind: 'person' as const }))
        ],
    [people, webhooks]
  )

  // 三态：某个节点及其所有子节点，对同一参与者的整体状态
  const getActorTri = (key: string, actorId: string): TriState => {
    const keys = [key, ...getDescendants(key)]
    let hasTrue = false
    let hasFalse = false
    for (const k of keys) {
      const base = actorChannelMatrix[k]?.[actorId] ?? false
      if (base) hasTrue = true
      else hasFalse = true
      if (hasTrue && hasFalse) return 'indeterminate'
    }
    // 如果从未配置过，默认视为关闭
    return hasTrue ? true : false
  }

  // 级联设置：父级任意开关影响全部子级（包括多级）
  const setActorCascade = (key: string, actorId: string, checked: boolean): void => {
    const keys = [key, ...getDescendants(key)]
    setActorChannelMatrix(prev => {
      const next: Record<string, Record<string, boolean>> = { ...prev }
      keys.forEach(k => {
        const row = { ...(next[k] ?? {}) }
        row[actorId] = checked
        next[k] = row
      })
      return next
    })
  }

  const treeColumns: ColumnsType<TreeRow> = useMemo(() => {
    const base: ColumnsType<TreeRow> = [
      {
        title: '消息类型', dataIndex: 'name', key: 'name', width: 80, fixed: 'left',
        render: (_: unknown, r: TreeRow) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ paddingLeft: r.level === 1 ? 0 : r.level === 2 ? 16 : 24, flex: '0 1 auto' }}>{r.name}</div>
            {r.key === 'server-deploy' && (
              <Tooltip title="配置应用">
                <Button
                  size="small"
                  type="link"
                  color="primary"
                  onClick={() => {
                    setRulesEditingKey(r.key)
                    setTempRules((alertRulesByKey[r.key] && alertRulesByKey[r.key].length > 0) ? alertRulesByKey[r.key] : makeDefaultRules())
                    setRulesModalOpen(true)
                  }}
                >
                  配置应用
                </Button>
              </Tooltip>
            )}
          </div>
        )
      }
    ]

    const actorCols: ColumnsType<TreeRow> = actors.map((actor): ColumnType<TreeRow> => ({
      title: actor.name,
      key: `actor_${actor.id}`,
      width: 64,
      render: (_: unknown, r: TreeRow) => {
        const tri = getActorTri(r.key, actor.id)
        return renderChannelCheckbox(tri, (checked) => setActorCascade(r.key, actor.id, checked))
      }
    }))

    return [...base, ...actorCols]
  }, [actors, actorChannelMatrix])

  const clientTreeData: TreeRow[] = useMemo(() => ([
    {
      key: 'client-root', name: '客户端告警', level: 1, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false, person: 'indeterminate',
      children: [
        {
          key: 'client-version', name: '客户端版本', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
          children: [
            { key: 'clientNewVersion', name: '客户端创建新版本', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' },
            { key: 'clientVersionSwitch', name: '客户端版本切换', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' },
            { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' },
            { key: 'CDNDeployFail', name: 'CDN部署失败', level: 3, siteMsg: true, sms: true, email: true, robot: false, person: 'indeterminate' }
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
        { key: 'ossConfigChange', name: 'oss配置文件变更', level: 2, siteMsg: true, sms: true, email: true, robot: false },
        { key: 'CDNDeploySuccess', name: 'CDN部署成功', level: 2, siteMsg: true, sms: true, email: true, robot: false }
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
          key: 'server-deploy', name: '应用故障告警', level: 2, siteMsg: 'indeterminate', sms: 'indeterminate', email: 'indeterminate', robot: false,
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
    <>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input placeholder="请输入消息类型" style={{ width: 240 }} suffix={<SearchOutlined />} />
        </Space>
      </div>
      <Table
        rowKey="key"
        columns={treeColumns}
        dataSource={[...clientTreeDataA, ...serverTreeDataA]} /*...cdnTreeDataA*/
        pagination={false}
        scroll={{ x: 1190, y: 420 }}
        expandable={{ defaultExpandedRowKeys: ['alert-root', 'notification-root'] }}
      />
    </>
  )

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      {/* 告警矩阵主体：消息类型的配置 */}
      <Card

        
      >
        {NoticeSection}
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
            setRowWebhookByKey((prev: Record<string, string[]>) => {
              const next: Record<string, string[]> = { ...prev }
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

      {/* 数据看板 Drawer */}
      <Drawer
        title={<span>埋点数据仪表盘</span>}
        placement="left"
        width={'100%'}
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        destroyOnClose
      >
        <PlausibleLikeDashboard />
      </Drawer>
    </Space>
  )
}



