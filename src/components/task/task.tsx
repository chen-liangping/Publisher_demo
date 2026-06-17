'use client'

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Dropdown,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popover,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ApiOutlined,
  CloudServerOutlined,
  CodeOutlined,
  FieldTimeOutlined,
  MoreOutlined,
  PlusOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { apps as demoApps } from '../ContainerServices/Application/apps'

const { Title, Text } = Typography
const { TextArea } = Input

type TaskMode = 'function' | 'container'
type JobType = 'manual' | 'scheduled'
type CronJobStatus = 'failed' | 'complete' | 'suspend' | 'progressing'
type ConcurrentPolicy = 'Allow' | 'Forbid' | 'Replace'
type ExpressionKind = 'manual' | 'per_day' | 'per_month' | 'interval' | 'custom'

interface CronJobHistory {
  id: string
  startAt: number
  endAt: number
  status: CronJobStatus
  message: string
  image: Record<string, string>
}

interface FunctionTask {
  id: string
  name: string
  applicationName: string
  runtime: 'Node.js 20'
  expression: string
  jobType: JobType
  code: string
  input: string
  timeoutSeconds: number
  notifyOnFailure: boolean
  switchOn: boolean
  histories: CronJobHistory[]
}

interface ContainerTask {
  id: string
  name: string
  imageRepoName: string
  tag: string
  command: string
  expression: string
  concurrencyPolicy: ConcurrentPolicy
  jobType: JobType
  switchOn: boolean
  histories: CronJobHistory[]
}

interface FunctionTaskFormValues {
  name: string
  applicationName: string
  runtime: 'Node.js 20'
  expression: string
  code: string
  input: string
  timeoutSeconds: number
  notifyOnFailure: boolean
}

interface ContainerTaskFormValues {
  name: string
  imageRepoName: string
  tag: string
  expression: string
  command: string
  concurrencyPolicy: ConcurrentPolicy
}

type DetailState =
  | { kind: 'function'; task: FunctionTask }
  | { kind: 'container'; task: ContainerTask }
  | null

type DeleteState =
  | { kind: 'function'; id: string }
  | { kind: 'container'; id: string }
  | null

type SwitchState =
  | { kind: 'function'; id: string; checked: boolean }
  | { kind: 'container'; id: string; checked: boolean }
  | null

interface TestRunResult {
  status: CronJobStatus
  message: string
}

const DEFAULT_EXPRESSION = '0 0 * * *'
const GRAFANA_LINK = 'https://publisher.grafana.net/'
const entrypointReg = /^(?!.*[[\]"，。（）“”：；！\u4e00-\u9fa5])[\s\S]*$/

const functionTemplate = `export default async function handler(ctx) {
  const app = ctx.app("xcron-cloud");

  const res = await app.post("/admin/cache/clear", {
    key: "rank_cache"
  });

  return res;
}`

const healthCheckTemplate = `export default async function handler(ctx) {
  const app = ctx.app("kumo游服");
  const status = await app.health();

  if (!status.ok) {
    await ctx.notify.dingTalk("kumo游服健康检查失败");
  }

  return status;
}`

const appOptions = demoApps.map((app) => ({
  value: app.name,
  label: `${app.name}（${app.tags.join('、')}）`
}))

const runtimeOptions = [{ value: 'Node.js 20', label: 'Node.js 20' }]

const imageRepoOptions = [
  { value: 'proxyman', label: 'proxyman' },
  { value: 'publisher', label: 'publisher' },
  { value: 'tools', label: 'tools' }
]

const imageTags: Record<string, string[]> = {
  proxyman: ['v1.0.5', 'v1.0.6', 'latest'],
  publisher: ['v2.3.0', 'v2.3.1', 'latest'],
  tools: ['v0.9.8', 'v0.9.9', 'latest']
}

const concurrentPolicyOptions: { label: string; value: ConcurrentPolicy }[] = [
  { label: '允许并发', value: 'Allow' },
  { label: '阻止并发', value: 'Forbid' },
  { label: '覆盖旧任务', value: 'Replace' }
]

const statusOptions: { label: string; value: CronJobStatus; status: 'error' | 'success' | 'default' | 'processing' }[] = [
  { label: '故障', value: 'failed', status: 'error' },
  { label: '正常', value: 'complete', status: 'success' },
  { label: '跳过', value: 'suspend', status: 'default' },
  { label: '执行中', value: 'progressing', status: 'processing' }
]

const expressionKindOptions: { label: string; value: ExpressionKind; defaults: string[] }[] = [
  { label: '手动执行', value: 'manual', defaults: [''] },
  { label: '每天定时执行（北京时间）', value: 'per_day', defaults: [DEFAULT_EXPRESSION] },
  { label: '每月定时执行（北京时间）', value: 'per_month', defaults: ['0 0 1 * *'] },
  { label: '间隔固定时间执行', value: 'interval', defaults: ['*/10 * * * *', '0 */10 * * *'] },
  { label: '自定义Cron表达式（北京时间）', value: 'custom', defaults: ['0 0 * * 1'] }
]

let historyCounter = 0

function createHistory(status: CronJobStatus, message: string, image: Record<string, string> = {}): CronJobHistory {
  historyCounter += 1
  const endAt = dayjs().unix() - historyCounter * 900

  return {
    id: `history-${historyCounter}`,
    startAt: endAt - 120,
    endAt: status === 'progressing' ? 0 : endAt,
    status,
    message,
    image
  }
}

function createFunctionTestResult(status: CronJobStatus): TestRunResult {
  const ok = status === 'complete'

  return {
    status,
    message: ok ? '测试运行成功' : '测试运行失败'
  }
}

function createContainerTestResult(status: CronJobStatus): TestRunResult {
  const ok = status === 'complete'

  return {
    status,
    message: ok ? '测试运行成功' : '测试运行失败'
  }
}

const initialFunctionTasks: FunctionTask[] = [
  {
    id: 'fn-clear-rank-cache',
    name: 'clear-rank-cache',
    applicationName: 'xcron-cloud',
    runtime: 'Node.js 20',
    expression: '',
    jobType: 'manual',
    code: functionTemplate,
    input: JSON.stringify({ key: 'rank_cache' }, null, 2),
    timeoutSeconds: 60,
    notifyOnFailure: true,
    switchOn: true,
    histories: [
      createHistory('complete', '清理应用缓存完成'),
      createHistory('failed', '应用接口返回 500'),
      createHistory('complete', '清理应用缓存完成'),
      createHistory('complete', '清理应用缓存完成'),
      createHistory('suspend', '上次任务仍在运行，本次跳过'),
      createHistory('complete', '清理应用缓存完成'),
      createHistory('complete', '清理应用缓存完成'),
      createHistory('complete', '清理应用缓存完成'),
      createHistory('failed', '应用接口返回 500'),
      createHistory('complete', '清理应用缓存完成')
    ]
  },
  {
    id: 'fn-health-check',
    name: 'daily-health-check',
    applicationName: 'kumo游服',
    runtime: 'Node.js 20',
    expression: DEFAULT_EXPRESSION,
    jobType: 'scheduled',
    code: healthCheckTemplate,
    input: JSON.stringify({ notify: true }, null, 2),
    timeoutSeconds: 120,
    notifyOnFailure: true,
    switchOn: true,
    histories: [
      createHistory('complete', '健康检查完成'),
      createHistory('complete', '健康检查完成'),
      createHistory('complete', '健康检查完成'),
      createHistory('progressing', '任务执行中'),
      createHistory('complete', '健康检查完成'),
      createHistory('complete', '健康检查完成'),
      createHistory('complete', '健康检查完成'),
      createHistory('suspend', '上次任务仍在运行，本次跳过'),
      createHistory('complete', '健康检查完成'),
      createHistory('complete', '健康检查完成')
    ]
  }
]

const initialContainerTasks: ContainerTask[] = [
  {
    id: 'demo',
    name: 'demo',
    imageRepoName: 'proxyman',
    tag: 'v1.0.5',
    command: 'echo demo',
    expression: DEFAULT_EXPRESSION,
    concurrencyPolicy: 'Forbid',
    jobType: 'scheduled',
    switchOn: true,
    histories: [
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' })
    ]
  },
  {
    id: 'demo2',
    name: 'demo2',
    imageRepoName: 'proxyman',
    tag: 'v1.0.5',
    command: 'echo demo2',
    expression: '',
    concurrencyPolicy: 'Forbid',
    jobType: 'manual',
    switchOn: true,
    histories: [
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('failed', '容器任务执行失败', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' }),
      createHistory('complete', '容器任务执行完成', { proxyman: 'v1.0.5' })
    ]
  }
]

export default function Task(): React.ReactElement {
  const [mode, setMode] = useState<TaskMode>('function')
  const [functionTasks, setFunctionTasks] = useState<FunctionTask[]>(initialFunctionTasks)
  const [containerTasks, setContainerTasks] = useState<ContainerTask[]>(initialContainerTasks)
  const [functionDrawerOpen, setFunctionDrawerOpen] = useState(false)
  const [containerDrawerOpen, setContainerDrawerOpen] = useState(false)
  const [editingFunctionTask, setEditingFunctionTask] = useState<FunctionTask | null>(null)
  const [editingContainerTask, setEditingContainerTask] = useState<ContainerTask | null>(null)
  const [detailState, setDetailState] = useState<DetailState>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)
  const [switchState, setSwitchState] = useState<SwitchState>(null)
  const [functionTestRunning, setFunctionTestRunning] = useState(false)
  const [functionTestResult, setFunctionTestResult] = useState<TestRunResult | null>(null)
  const [containerTestRunning, setContainerTestRunning] = useState(false)
  const [containerTestResult, setContainerTestResult] = useState<TestRunResult | null>(null)
  const [functionForm] = Form.useForm<FunctionTaskFormValues>()
  const [containerForm] = Form.useForm<ContainerTaskFormValues>()
  const functionExpression = Form.useWatch('expression', functionForm)
  const containerExpression = Form.useWatch('expression', containerForm)
  const imageRepoName = Form.useWatch('imageRepoName', containerForm)

  const tagOptions = useMemo(() => {
    return (imageTags[imageRepoName || 'proxyman'] || []).map((tag) => ({ value: tag, label: tag }))
  }, [imageRepoName])

  const openCreateFunctionTask = () => {
    setEditingFunctionTask(null)
    setFunctionTestResult(null)
    functionForm.setFieldsValue({
      name: 'clear-rank-cache',
      applicationName: 'xcron-cloud',
      runtime: 'Node.js 20',
      expression: DEFAULT_EXPRESSION,
      code: functionTemplate,
      input: JSON.stringify({ key: 'rank_cache' }, null, 2),
      timeoutSeconds: 60,
      notifyOnFailure: true
    })
    setFunctionDrawerOpen(true)
  }

  const openEditFunctionTask = (task: FunctionTask) => {
    setEditingFunctionTask(task)
    setFunctionTestResult(null)
    functionForm.setFieldsValue({
      name: task.name,
      applicationName: task.applicationName,
      runtime: task.runtime,
      expression: task.expression,
      code: task.code,
      input: task.input,
      timeoutSeconds: task.timeoutSeconds,
      notifyOnFailure: task.notifyOnFailure
    })
    setFunctionDrawerOpen(true)
  }

  const closeFunctionDrawer = () => {
    setFunctionDrawerOpen(false)
    setEditingFunctionTask(null)
    setFunctionTestResult(null)
    setFunctionTestRunning(false)
  }

  const submitFunctionTask = async () => {
    const values = await functionForm.validateFields()
    const nextTask: FunctionTask = {
      id: editingFunctionTask?.id ?? `${values.name}-${Date.now()}`,
      name: values.name,
      applicationName: values.applicationName,
      runtime: values.runtime,
      expression: values.expression,
      jobType: values.expression === '' ? 'manual' : 'scheduled',
      code: values.code,
      input: values.input,
      timeoutSeconds: values.timeoutSeconds,
      notifyOnFailure: values.notifyOnFailure,
      switchOn: editingFunctionTask?.switchOn ?? true,
      histories: editingFunctionTask?.histories ?? [createHistory('complete', '函数任务执行完成')]
    }

    setFunctionTasks((prev) => {
      if (!editingFunctionTask) return [nextTask, ...prev]
      return prev.map((item) => (item.id === editingFunctionTask.id ? nextTask : item))
    })
    closeFunctionDrawer()
    functionForm.resetFields()
    message.success(editingFunctionTask ? '函数任务已更新' : '函数任务已创建')
  }

  const testRunFunctionTask = async () => {
    await functionForm.validateFields()
    setFunctionTestRunning(true)
    setFunctionTestResult(null)

    await new Promise((resolve) => setTimeout(resolve, 700))

    const status: CronJobStatus = Math.random() > 0.15 ? 'complete' : 'failed'
    const result = createFunctionTestResult(status)
    setFunctionTestResult(result)
    setFunctionTestRunning(false)
    message[status === 'complete' ? 'success' : 'error'](status === 'complete' ? '测试运行完成' : '测试运行失败')
  }

  const openCreateContainerTask = () => {
    setEditingContainerTask(null)
    setContainerTestResult(null)
    containerForm.setFieldsValue({
      name: 'demo',
      imageRepoName: 'proxyman',
      tag: 'v1.0.5',
      expression: DEFAULT_EXPRESSION,
      command: 'echo demo',
      concurrencyPolicy: 'Forbid'
    })
    setContainerDrawerOpen(true)
  }

  const openEditContainerTask = (task: ContainerTask) => {
    setEditingContainerTask(task)
    setContainerTestResult(null)
    containerForm.setFieldsValue({
      name: task.name,
      imageRepoName: task.imageRepoName,
      tag: task.tag,
      expression: task.expression,
      command: task.command,
      concurrencyPolicy: task.concurrencyPolicy
    })
    setContainerDrawerOpen(true)
  }

  const closeContainerDrawer = () => {
    setContainerDrawerOpen(false)
    setEditingContainerTask(null)
    setContainerTestResult(null)
    setContainerTestRunning(false)
  }

  const submitContainerTask = async () => {
    const values = await containerForm.validateFields()
    const image = { [values.imageRepoName]: values.tag }
    const nextTask: ContainerTask = {
      id: editingContainerTask?.id ?? `${values.name}-${Date.now()}`,
      name: values.name,
      imageRepoName: values.imageRepoName,
      tag: values.tag,
      command: values.command,
      expression: values.expression,
      concurrencyPolicy: values.expression === '' ? 'Forbid' : values.concurrencyPolicy,
      jobType: values.expression === '' ? 'manual' : 'scheduled',
      switchOn: editingContainerTask?.switchOn ?? true,
      histories: editingContainerTask?.histories ?? [createHistory('complete', '容器任务执行完成', image)]
    }

    setContainerTasks((prev) => {
      if (!editingContainerTask) return [nextTask, ...prev]
      return prev.map((item) => (item.id === editingContainerTask.id ? nextTask : item))
    })
    closeContainerDrawer()
    containerForm.resetFields()
    message.success(editingContainerTask ? '容器任务已更新' : '容器任务已创建')
  }

  const testRunContainerTask = async () => {
    await containerForm.validateFields()
    setContainerTestRunning(true)
    setContainerTestResult(null)

    await new Promise((resolve) => setTimeout(resolve, 900))

    const status: CronJobStatus = Math.random() > 0.18 ? 'complete' : 'failed'
    const result = createContainerTestResult(status)
    setContainerTestResult(result)
    setContainerTestRunning(false)
    message[status === 'complete' ? 'success' : 'error'](status === 'complete' ? '测试运行完成' : '测试运行失败')
  }

  const runFunctionTask = (task: FunctionTask) => {
    const status: CronJobStatus = Math.random() > 0.2 ? 'complete' : 'failed'
    const record = createHistory(status, status === 'failed' ? '应用函数任务执行失败' : '应用函数任务执行完成')
    setFunctionTasks((prev) => prev.map((item) => {
      if (item.id !== task.id) return item
      return { ...item, histories: [record, ...item.histories].slice(0, 10) }
    }))
    message.success('任务已触发执行')
  }

  const runContainerTask = (task: ContainerTask) => {
    const status: CronJobStatus = Math.random() > 0.35 ? 'complete' : 'failed'
    const image = { [task.imageRepoName]: task.tag }
    const record = createHistory(status, status === 'failed' ? '容器任务执行失败' : '容器任务执行完成', image)
    setContainerTasks((prev) => prev.map((item) => {
      if (item.id !== task.id) return item
      return { ...item, histories: [record, ...item.histories].slice(0, 10) }
    }))
    message.success('任务已触发执行')
  }

  const updateSwitch = (next: SwitchState) => {
    if (!next) return
    if (next.kind === 'function') {
      setFunctionTasks((prev) => prev.map((item) => item.id === next.id ? { ...item, switchOn: next.checked } : item))
    } else {
      setContainerTasks((prev) => prev.map((item) => item.id === next.id ? { ...item, switchOn: next.checked } : item))
    }
  }

  const confirmDelete = () => {
    if (!deleteState) return
    if (deleteState.kind === 'function') {
      setFunctionTasks((prev) => prev.filter((item) => item.id !== deleteState.id))
    } else {
      setContainerTasks((prev) => prev.filter((item) => item.id !== deleteState.id))
    }
    setDeleteState(null)
    message.success('该任务已删除')
  }

  const functionColumns: ColumnsType<FunctionTask> = useMemo(() => [
    {
      dataIndex: 'name',
      title: '名称',
      width: 100
    },
    {
      dataIndex: 'applicationName',
      title: '目标应用',
      width: 180,
      render: (value: string) => (
        <Space size={6}>
          <CloudServerOutlined style={{ color: '#1677ff' }} />
          <Text>{value}</Text>
        </Space>
      )
    },
    {
      dataIndex: 'runtime',
      title: '运行时',
      width: 120
    },
    {
      dataIndex: 'expression',
      title: '执行计划（北京时间）',
      width: 180,
      render: (value: string, record: FunctionTask) => record.jobType === 'manual' ? '手动执行' : formatExpression(value)
    },
    {
      dataIndex: 'histories',
      width: 180,
      title: <StatusTitle />,
      render: (histories: CronJobHistory[]) => <StatusHistory histories={histories} />
    },
    {
      key: 'action',
      title: '操作',
      width: 100,
      render: (_: unknown, record: FunctionTask) => (
        <Flex gap={16}>
          {record.expression === '' ? (
            <Button type="link" size="small" onClick={() => runFunctionTask(record)} style={{ paddingInline: 0 }}>
              执行任务
            </Button>
          ) : (
            <Switch
              checkedChildren="ON"
              unCheckedChildren="OFF"
              checked={record.switchOn}
              onChange={(checked) => {
                const next = { kind: 'function' as const, id: record.id, checked }
                if (!checked) {
                  setSwitchState(next)
                  return
                }
                updateSwitch(next)
              }}
            />
          )}
          <TaskActionDropdown
            onEdit={() => openEditFunctionTask(record)}
            onView={() => setDetailState({ kind: 'function', task: record })}
            onDelete={() => setDeleteState({ kind: 'function', id: record.id })}
          />
        </Flex>
      )
    }
  ], [])

  const containerColumns: ColumnsType<ContainerTask> = useMemo(() => [
    {
      dataIndex: 'name',
      title: '名称',
      width: 100
    },
    {
      dataIndex: 'command',
      title: <QuestionLabel title="该命令会覆盖Dockerfile内定义的ENTRYPOINT。若Dockfile内已定义ENTRYPOINT，此处可为空">启动命令ENTRYPOINT</QuestionLabel>,
      width: 220
    },
    {
      dataIndex: 'tag',
      title: '镜像版本',
      width: 200,
      render: (tag: string, { imageRepoName }: ContainerTask) => `${imageRepoName}:${tag}`
    },
    {
      dataIndex: 'expression',
      title: '执行计划（北京时间）',
      width: 180,
      render: (value: string, record: ContainerTask) => record.jobType === 'manual' ? '手动执行' : formatExpression(value)
    },
    {
      dataIndex: 'histories',
      width: 180,
      title: <StatusTitle />,
      render: (histories: CronJobHistory[]) => <StatusHistory histories={histories} />
    },
    {
      key: 'action',
      title: '操作',
      width: 100,
      render: (_: unknown, record: ContainerTask) => (
        <Flex gap={16}>
          {record.expression === '' ? (
            <Button type="link" size="small" onClick={() => runContainerTask(record)} style={{ paddingInline: 0 }}>
              执行任务
            </Button>
          ) : (
            <Switch
              checkedChildren="ON"
              unCheckedChildren="OFF"
              checked={record.switchOn}
              onChange={(checked) => {
                const next = { kind: 'container' as const, id: record.id, checked }
                if (!checked) {
                  setSwitchState(next)
                  return
                }
                updateSwitch(next)
              }}
            />
          )}
          <TaskActionDropdown
            onEdit={() => openEditContainerTask(record)}
            onView={() => setDetailState({ kind: 'container', task: record })}
            onDelete={() => setDeleteState({ kind: 'container', id: record.id })}
          />
        </Flex>
      )
    }
  ], [])

  return (
    <div style={{ padding: 24 }}>
      <Flex vertical gap={16}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 24px' }}>
          <Flex align="flex-start" justify="space-between" gap={16}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>任务</Title>
              <Text type="secondary">
                可按设定周期或手动触发执行任务（如重启服务、备份数据、清理缓存、更新配置），支持并发控制与失败重试，保障服务稳定性并提升运维效率。
              </Text>
            </div>
            <Segmented
              value={mode}
              onChange={(value) => setMode(value as TaskMode)}
              options={[
                { label: '函数任务', value: 'function', icon: <CodeOutlined /> },
                { label: '容器任务', value: 'container', icon: <ApiOutlined /> }
              ]}
            />
          </Flex>
        </div>

        {mode === 'function' ? (
          <Alert
            showIcon
            type="info"
            message="应用函数任务"
            description="用户不需要上传镜像。平台使用统一 Runner 运行代码，并把所选应用的访问能力放进 ctx.app。若要清应用进程内缓存，需要应用本身提供管理接口，函数任务负责安全调用。"
          />
        ) : (
          <Alert
            showIcon
            type="warning"
            message="容器任务"
            description="这是当前生产控制台的任务形态：先上传镜像，再配置镜像版本、ENTRYPOINT 和执行计划。"
          />
        )}

        <Card
          title="列表"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={mode === 'function' ? openCreateFunctionTask : openCreateContainerTask}>
              添加
            </Button>
          }
        >
          {mode === 'function' ? (
            <Table<FunctionTask> rowKey="name" columns={functionColumns} dataSource={functionTasks} pagination={false} />
          ) : (
            <Table<ContainerTask> rowKey="name" columns={containerColumns} dataSource={containerTasks} pagination={false} />
          )}
        </Card>
      </Flex>

      <Drawer
        title={editingFunctionTask ? '编辑任务' : '新增任务'}
        width={720}
        open={functionDrawerOpen}
        onClose={closeFunctionDrawer}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={testRunFunctionTask} loading={functionTestRunning}>测试运行</Button>
            <Button type="primary" onClick={submitFunctionTask}>确 定</Button>
            <Button onClick={closeFunctionDrawer}>关 闭</Button>
          </Space>
        }
      >
        <Form
          form={functionForm}
          layout="vertical"
          requiredMark
          initialValues={{
            name: 'clear-rank-cache',
            applicationName: 'xcron-cloud',
            runtime: 'Node.js 20',
            expression: DEFAULT_EXPRESSION,
            code: functionTemplate,
            input: JSON.stringify({ key: 'rank_cache' }, null, 2),
            timeoutSeconds: 60,
            notifyOnFailure: true
          }}
        >
          <Form.Item
            name="name"
            label="名称"
            required
            rules={[
              { required: true, message: '请输入名称' },
              { pattern: /^[a-z0-9-]+$/, message: '只能输入小写英文或数字或-' }
            ]}
          >
            <Input placeholder="请输入小写英文或数字或-" disabled={!!editingFunctionTask} />
          </Form.Item>

          <Form.Item label="目标资源" required>
            <Space.Compact style={{ width: '100%' }}>
              <Input disabled value="应用" style={{ width: 120 }} />
              <Form.Item name="applicationName" noStyle rules={[{ required: true, message: '请选择应用' }]}>
                <Select options={appOptions} showSearch placeholder="请选择应用" />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="运行时" name="runtime" rules={[{ required: true }]}>
            <Select options={runtimeOptions} />
          </Form.Item>

          <Form.Item
            label="执行计划"
            name="expression"
            required
            extra={functionExpression ? <ExpressionPreview value={functionExpression} /> : null}
            rules={[{ validator: (_, value: string | undefined) => validateExpression(value) }]}
          >
            <CronExpressionSelect
              disabled={!!editingFunctionTask && editingFunctionTask.jobType === 'manual'}
              restrictToManualMode={!!editingFunctionTask && editingFunctionTask.jobType === 'manual'}
              restrictToScheduledMode={!!editingFunctionTask && editingFunctionTask.jobType === 'scheduled'}
            />
          </Form.Item>

          <Form.Item
            label="函数代码"
            name="code"
            rules={[
              { required: true, message: '请输入函数代码' },
              {
                validator: (_, value: string) => {
                  if (!value || value.includes('handler')) return Promise.resolve()
                  return Promise.reject(new Error('代码中需要包含 handler 函数'))
                }
              }
            ]}
            extra="函数任务不会暴露接口；它在平台 Runner 中执行，并通过 ctx.app 调用所选应用。"
          >
            <TextArea rows={12} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} />
          </Form.Item>

          <Form.Item label="测试入参 JSON" name="input" rules={[{ validator: (_, value) => validateJson(value) }]}>
            <TextArea rows={5} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} />
          </Form.Item>

          <Space size={16} style={{ width: '100%' }} align="start">
            <Form.Item label="超时时间" required>
              <Space.Compact>
                <Form.Item name="timeoutSeconds" noStyle rules={[{ required: true, message: '请输入超时时间' }]}>
                  <InputNumber min={10} max={600} />
                </Form.Item>
                <DisabledLabel>秒</DisabledLabel>
              </Space.Compact>
            </Form.Item>
            <Form.Item label="失败通知" name="notifyOnFailure" valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          </Space>
        </Form>

        {functionTestResult && (
          <FunctionTestResultPanel result={functionTestResult} />
        )}
      </Drawer>

      <Drawer
        title={editingContainerTask ? '编辑任务' : '新增任务'}
        width={520}
        open={containerDrawerOpen}
        onClose={closeContainerDrawer}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={testRunContainerTask} loading={containerTestRunning}>测试运行</Button>
            <Button type="primary" onClick={submitContainerTask}>确 定</Button>
            <Button onClick={closeContainerDrawer}>关 闭</Button>
          </Space>
        }
      >
        <Form
          form={containerForm}
          layout="vertical"
          requiredMark
          initialValues={{
            imageRepoName: 'proxyman',
            tag: 'v1.0.5',
            expression: DEFAULT_EXPRESSION,
            command: 'echo demo',
            concurrencyPolicy: 'Forbid'
          }}
        >
          <Form.Item
            name="name"
            label="名称"
            required
            rules={[
              { required: true, message: '请输入名称' },
              { pattern: /^[a-z0-9-]+$/, message: '只能输入小写英文或数字或-' }
            ]}
          >
            <Input placeholder="请输入小写英文或数字或-" disabled={!!editingContainerTask} />
          </Form.Item>

          <Form.Item label="镜像" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item noStyle name="imageRepoName" rules={[{ required: true, message: '请选择镜像仓库' }]}>
                <Select
                  disabled={!!editingContainerTask}
                  allowClear={false}
                  options={imageRepoOptions}
                  placeholder="请选择镜像仓库"
                  onChange={() => {
                    containerForm.setFieldsValue({ tag: undefined })
                  }}
                />
              </Form.Item>
              <Form.Item
                noStyle
                name="tag"
                rules={[
                  ({ getFieldValue }) => ({
                    async validator(_, value) {
                      const repo = getFieldValue('imageRepoName')
                      if (!repo) return
                      if (!value) throw new Error('请选择镜像版本')
                    }
                  })
                ]}
              >
                <Select options={tagOptions} placeholder="请选择镜像版本" />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            label="执行计划"
            name="expression"
            required
            extra={containerExpression ? <ExpressionPreview value={containerExpression} /> : null}
            rules={[{ validator: (_, value: string | undefined) => validateExpression(value) }]}
          >
            <CronExpressionSelect
              disabled={!!editingContainerTask && editingContainerTask.jobType === 'manual'}
              restrictToManualMode={!!editingContainerTask && editingContainerTask.jobType === 'manual'}
              restrictToScheduledMode={!!editingContainerTask && editingContainerTask.jobType === 'scheduled'}
            />
          </Form.Item>

          <Form.Item
            name="command"
            label={<QuestionLabel title="该命令会覆盖Dockerfile内定义的ENTRYPOINT。若Dockfile内已定义ENTRYPOINT，此处可为空">启动命令ENTRYPOINT</QuestionLabel>}
            rules={[{ pattern: entrypointReg, message: '启动命令不能包含中文字符及[]、"等特殊字符' }]}
          >
            <Input placeholder="使用空格分隔，例：executable param1 param2" />
          </Form.Item>

          {containerExpression !== '' && (
            <Form.Item name="concurrencyPolicy" label="并发逻辑">
              <Select options={concurrentPolicyOptions} />
            </Form.Item>
          )}
        </Form>

        {containerTestResult && (
          <ContainerTestResultPanel result={containerTestResult} />
        )}
      </Drawer>

      <Drawer
        title="查看记录"
        width={760}
        open={detailState !== null}
        onClose={() => setDetailState(null)}
        destroyOnClose
        footer={<Button onClick={() => setDetailState(null)}>关 闭</Button>}
      >
        {detailState && <TaskDetail detail={detailState} />}
      </Drawer>

      <Modal
        title="修改任务状态"
        open={switchState !== null}
        okText="确 定"
        cancelText="取 消"
        onOk={() => {
          updateSwitch(switchState)
          setSwitchState(null)
        }}
        onCancel={() => setSwitchState(null)}
      >
        确定暂停该定时任务吗？
      </Modal>

      <Modal
        title="删除任务"
        open={deleteState !== null}
        okText="删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        onOk={confirmDelete}
        onCancel={() => setDeleteState(null)}
      >
        确认删除该任务吗？
      </Modal>
    </div>
  )
}

function TaskActionDropdown({ onEdit, onView, onDelete }: { onEdit: () => void; onView: () => void; onDelete: () => void }) {
  return (
    <Dropdown
      menu={{
        items: [
          { key: 'edit', label: '编辑' },
          { key: 'view', label: '查看记录' },
          { key: 'delete', label: '删除' }
        ],
        onClick: ({ key }) => {
          if (key === 'edit') onEdit()
          if (key === 'view') onView()
          if (key === 'delete') onDelete()
        }
      }}
      overlayStyle={{ width: 108 }}
      trigger={['click']}
    >
      <Button size="small" type="text" icon={<MoreOutlined />} />
    </Dropdown>
  )
}

function FunctionTestResultPanel({ result }: { result: TestRunResult }) {
  return <TestRunResultPanel result={result} />
}

function ContainerTestResultPanel({ result }: { result: TestRunResult }) {
  return <TestRunResultPanel result={result} />
}

function TestRunResultPanel({ result }: { result: TestRunResult }) {
  const ok = result.status === 'complete'
  const resultText = ok ? '成功' : '失败'

  return (
    <Alert
      style={{ marginTop: 16 }}
      type={ok ? 'success' : 'error'}
      showIcon
      message={`测试运行${resultText}`}
      description={
        <Flex vertical gap={12}>
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: 'result', label: '运行结果', children: <Tag color={ok ? 'success' : 'error'}>{resultText}</Tag> },
              { key: 'message', label: '说明', children: result.message }
            ]}
            styles={{ label: { width: 80 } }}
          />
          <Space>
            <Typography.Text type="secondary">执行日志请前往</Typography.Text>
            <Typography.Link target="_blank" href={GRAFANA_LINK}>Grafana</Typography.Link>
          </Space>
        </Flex>
      }
    />
  )
}

function QuestionLabel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Space size={4}>
      <span>{children}</span>
      <Tooltip title={title}>
        <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
      </Tooltip>
    </Space>
  )
}

function StatusTitle() {
  return (
    <Popover
      content={
        <Flex vertical gap={2}>
          <Typography.Text>显示最近10次任务的执行状态：</Typography.Text>
          <CronStatusBadge value="complete" />
          <CronStatusBadge value="suspend" />
          <CronStatusBadge value="failed" />
          <CronStatusBadge value="progressing" />
        </Flex>
      }
    >
      <Space size={4}>
        <span>执行状态</span>
        <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
      </Space>
    </Popover>
  )
}

function StatusHistory({ histories }: { histories: CronJobHistory[] }) {
  return (
    <Flex gap={2}>
      {histories.map(({ status, message }, index) => (
        <Tooltip key={`${status}-${index}`} title={message}>
          <span>
            <CronStatusBadge value={status} dot style={{ marginLeft: index === 5 ? 10 : undefined }} />
          </span>
        </Tooltip>
      ))}
    </Flex>
  )
}

function CronStatusBadge({ value, dot, style }: { value?: CronJobStatus; dot?: boolean; style?: React.CSSProperties }) {
  const option = statusOptions.find((item) => item.value === value) || { label: '未知', status: 'default' as const }
  return <Badge status={option.status} text={dot ? undefined : option.label} style={style} />
}

function CronExpressionSelect({
  disabled,
  value,
  onChange,
  restrictToManualMode,
  restrictToScheduledMode
}: {
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  restrictToManualMode?: boolean
  restrictToScheduledMode?: boolean
}) {
  // 原型里手写轻量版执行计划控件，字段值与生产 cronjob 的 expression 保持一致。
  const expression = value ?? DEFAULT_EXPRESSION
  const kind = getExpressionKind(expression)
  const parts = getExpressionParts(expression)
  const allowedOptions = expressionKindOptions.filter((option) => {
    if (restrictToManualMode) return option.value === 'manual'
    if (restrictToScheduledMode) return option.value !== 'manual'
    return true
  })

  const updateParts = (next: Partial<ReturnType<typeof getExpressionParts>>) => {
    const merged = { ...parts, ...next }
    onChange?.(`${merged.minute} ${merged.hour} ${merged.day} ${merged.month} ${merged.week}`)
  }

  const intervalUnit = parts.hour.startsWith('*/') ? 1 : 0
  const intervalValue = intervalUnit === 1 ? readInterval(parts.hour) : readInterval(parts.minute)

  return (
    <Flex vertical gap={12}>
      <Flex gap={16} align="center" justify="space-between">
        <Select<ExpressionKind>
          value={kind}
          options={allowedOptions}
          disabled={disabled}
          popupMatchSelectWidth={false}
          onChange={(nextKind) => {
            const option = expressionKindOptions.find((item) => item.value === nextKind)
            onChange?.(option?.defaults[0] ?? DEFAULT_EXPRESSION)
          }}
        />
        {kind === 'custom' ? (
          <>
            <Typography.Link href="https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/cron-jobs/#writing-a-cronjob-spec" target="_blank">
              Cron表达式语法
            </Typography.Link>
            <Typography.Link href="https://www.alibabacloud.com/help/zh/function-compute/latest/what-is-function-compute" target="_blank">
              函数计算
            </Typography.Link>
          </>
        ) : null}
      </Flex>

      {kind === 'manual' ? null : (
        <Space.Compact>
          {kind === 'per_day' && (
            <>
              <DisabledLabel>每天</DisabledLabel>
              <InputNumber disabled={disabled} value={toNumber(parts.hour)} min={0} max={23} onChange={(v) => updateParts({ hour: String(v ?? 0) })} />
              <DisabledLabel>时</DisabledLabel>
              <InputNumber disabled={disabled} value={toNumber(parts.minute)} min={0} max={59} onChange={(v) => updateParts({ minute: String(v ?? 0) })} />
              <DisabledLabel>分</DisabledLabel>
              <DisabledLabel>定时执行</DisabledLabel>
            </>
          )}

          {kind === 'per_month' && (
            <>
              <DisabledLabel>每月第</DisabledLabel>
              <InputNumber disabled={disabled} value={toNumber(parts.day)} min={1} max={31} onChange={(v) => updateParts({ day: String(v ?? 1) })} />
              <DisabledLabel>日</DisabledLabel>
              <InputNumber disabled={disabled} value={toNumber(parts.hour)} min={0} max={23} onChange={(v) => updateParts({ hour: String(v ?? 0) })} />
              <DisabledLabel>时</DisabledLabel>
              <InputNumber disabled={disabled} value={toNumber(parts.minute)} min={0} max={59} onChange={(v) => updateParts({ minute: String(v ?? 0) })} />
              <DisabledLabel>分</DisabledLabel>
              <DisabledLabel>定时执行</DisabledLabel>
            </>
          )}

          {kind === 'interval' && (
            <>
              <DisabledLabel>每隔</DisabledLabel>
              <InputNumber
                disabled={disabled}
                value={intervalValue}
                min={intervalUnit === 0 ? 10 : 1}
                max={intervalUnit === 0 ? 59 : 23}
                onChange={(v) => {
                  const nextValue = String(v ?? (intervalUnit === 0 ? 10 : 1))
                  onChange?.(intervalUnit === 1 ? `0 */${nextValue} * * *` : `*/${nextValue} * * * *`)
                }}
              />
              <Select<number>
                disabled={disabled}
                value={intervalUnit}
                style={{ width: 100 }}
                options={[
                  { label: '分钟', value: 0 },
                  { label: '小时', value: 1 }
                ]}
                onChange={(unit) => {
                  const nextValue = String(intervalValue || 10)
                  onChange?.(unit === 1 ? `0 */${nextValue} * * *` : `*/${nextValue} * * * *`)
                }}
              />
              <DisabledLabel>定时执行</DisabledLabel>
            </>
          )}

          {kind === 'custom' && (
            <>
              <Input disabled={disabled} value={parts.minute} addonAfter="分" onChange={({ target }) => updateParts({ minute: target.value })} />
              <Input disabled={disabled} value={parts.hour} addonAfter="时" onChange={({ target }) => updateParts({ hour: target.value })} />
              <Input disabled={disabled} value={parts.day} addonAfter="日" onChange={({ target }) => updateParts({ day: target.value })} />
              <Input disabled={disabled} value={parts.month} addonAfter="月" onChange={({ target }) => updateParts({ month: target.value })} />
              <Select
                disabled={disabled}
                value={parts.week}
                style={{ width: 112 }}
                options={[
                  { label: '*', value: '*' },
                  { label: '星期一', value: '1' },
                  { label: '星期二', value: '2' },
                  { label: '星期三', value: '3' },
                  { label: '星期四', value: '4' },
                  { label: '星期五', value: '5' },
                  { label: '星期六', value: '6' },
                  { label: '星期日', value: '0' }
                ]}
                onChange={(week) => updateParts({ week })}
              />
            </>
          )}
        </Space.Compact>
      )}
    </Flex>
  )
}

function DisabledLabel({ children }: { children: React.ReactNode }) {
  return (
    <Button disabled style={{ color: 'rgba(0,0,0,0.88)', cursor: 'default' }}>
      {children}
    </Button>
  )
}

function ExpressionPreview({ value }: { value?: string }) {
  const [show, setShow] = useState(false)
  const list = useMemo(() => buildPreviewTimes(value), [value])

  if (!value) return null

  return (
    <Flex vertical gap={4}>
      <span>
        <Typography.Link onClick={() => setShow(!show)}>
          <FieldTimeOutlined />
          <span> 预览执行时间（最近7次）</span>
        </Typography.Link>
      </span>
      {show && list.length ? (
        <List
          size="small"
          dataSource={list}
          renderItem={(item) => (
            <List.Item style={{ paddingBlock: 2 }}>
              <Text type="secondary">{item}</Text>
            </List.Item>
          )}
        />
      ) : null}
    </Flex>
  )
}

function TaskDetail({ detail }: { detail: Exclude<DetailState, null> }) {
  const task = detail.task
  const isFunction = detail.kind === 'function'

  const descriptionItems = isFunction
    ? [
        { key: 'name', label: '名称', children: (task as FunctionTask).name },
        { key: 'applicationName', label: '目标应用', children: (task as FunctionTask).applicationName },
        { key: 'runtime', label: '运行时', children: (task as FunctionTask).runtime },
        { key: 'expression', label: '执行计划', children: task.jobType === 'manual' ? '手动执行' : formatExpression(task.expression) }
      ]
    : [
        { key: 'name', label: '名称', children: (task as ContainerTask).name },
        { key: 'tag', label: '镜像版本', children: `${(task as ContainerTask).imageRepoName}:${(task as ContainerTask).tag}` },
        { key: 'expression', label: '执行计划', children: task.jobType === 'manual' ? '手动执行' : formatExpression(task.expression) },
        ...((task as ContainerTask).jobType !== 'manual'
          ? [{ key: 'concurrencyPolicy', label: '并发逻辑', children: viewConcurrentPolicy((task as ContainerTask).concurrencyPolicy) }]
          : [])
      ]

  return (
    <Flex vertical gap={24}>
      <Descriptions column={1} size="small" items={descriptionItems} styles={{ label: { width: 80 } }} />

      {isFunction ? (
        <>
          <Flex vertical gap={12}>
            <Typography.Title level={5} style={{ fontSize: 14, marginBottom: 0 }}>函数代码</Typography.Title>
            <CodeBlock>{(task as FunctionTask).code}</CodeBlock>
          </Flex>
          <Flex vertical gap={12}>
            <Typography.Title level={5} style={{ fontSize: 14, marginBottom: 0 }}>测试入参</Typography.Title>
            <CodeBlock>{(task as FunctionTask).input}</CodeBlock>
          </Flex>
        </>
      ) : (
        <Flex vertical gap={12}>
          <Typography.Title level={5} style={{ fontSize: 14, marginBottom: 0 }}>
            <QuestionLabel title="该命令会覆盖Dockerfile内定义的ENTRYPOINT。若Dockfile内已定义ENTRYPOINT，此处可为空">启动命令ENTRYPOINT</QuestionLabel>
          </Typography.Title>
          <CommandLineViewer>{(task as ContainerTask).command}</CommandLineViewer>
        </Flex>
      )}

      <Flex vertical gap={12}>
        <Typography.Title level={5} style={{ fontSize: 14, marginBottom: 0 }}>执行记录</Typography.Title>
        <Table<CronJobHistory>
          rowKey="id"
          columns={[
            { title: '开始时间（北京时间）', dataIndex: 'startAt', render: (startAt: number) => <TimeDisplay timestamp={startAt} /> },
            { title: '结束时间（北京时间）', dataIndex: 'endAt', render: (endAt: number) => <TimeDisplay timestamp={endAt} /> },
            ...(isFunction
              ? []
              : [{
                  title: '镜像版本',
                  render: (_: unknown, record: CronJobHistory) => <ImageHistory image={record.image} />
                }]),
            {
              title: '运行状态',
              dataIndex: 'status',
              render: (status: CronJobStatus, { message }) => (
                <Tooltip title={message}>
                  <span>
                    <CronStatusBadge value={status} />
                  </span>
                </Tooltip>
              )
            }
          ]}
          dataSource={task.histories}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
        <Space>
          <Typography.Text>更多信息请前往</Typography.Text>
          <Typography.Link target="_blank" href={GRAFANA_LINK}>Grafana</Typography.Link>
        </Space>
      </Flex>

    </Flex>
  )
}

function TimeDisplay({ timestamp }: { timestamp: number }) {
  if (timestamp > 0) {
    return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
  }
  return '-'
}

function ImageHistory({ image }: { image: Record<string, string> }) {
  const entries = Object.entries(image)
  if (!entries.length) return <>-</>
  return (
    <div>
      {entries.map(([key, value]) => (
        <span key={`${key}-${value}`}>
          {key}: {value}
          <br />
        </span>
      ))}
    </div>
  )
}

function CommandLineViewer({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.02)',
        borderRadius: 8,
        padding: '16px 24px',
        fontSize: 13,
        border: '1px solid rgba(0,0,0,0.06)',
        fontFamily: 'Menlo, Consolas, "Courier New", monospace, system-ui'
      }}
    >
      <span style={{ color: 'rgba(0,0,0,0.45)' }}>$ </span>
      {children}
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: '14px 16px',
        borderRadius: 8,
        border: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(0,0,0,0.02)',
        fontSize: 13,
        lineHeight: 1.6,
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
      }}
    >
      {children}
    </pre>
  )
}

function getExpressionKind(expression: string): ExpressionKind {
  if (expression === '') return 'manual'
  if (/^\d+ \d+ \* \* \*$/.test(expression)) return 'per_day'
  if (/^\d+ \d+ \d+ \* \*$/.test(expression)) return 'per_month'
  if (/^\*\/\d+ \* \* \* \*$/.test(expression) || /^0 \*\/\d+ \* \* \*$/.test(expression)) return 'interval'
  return 'custom'
}

function getExpressionParts(expression: string) {
  if (expression === '') {
    return { minute: '0', hour: '0', day: '*', month: '*', week: '*' }
  }
  const [minute = '0', hour = '0', day = '*', month = '*', week = '*'] = expression.split(' ')
  return { minute, hour, day, month, week }
}

function formatExpression(expression: string): string {
  const kind = getExpressionKind(expression)
  const parts = getExpressionParts(expression)

  if (kind === 'manual') return '手动执行'
  if (kind === 'per_day') return `每天 ${formatNumberText(parts.hour)} 时 ${formatNumberText(parts.minute)} 分`
  if (kind === 'per_month') return `每月第 ${formatNumberText(parts.day)} 日 ${formatNumberText(parts.hour)} 时 ${formatNumberText(parts.minute)} 分`
  if (kind === 'interval') {
    if (parts.hour.startsWith('*/')) return `每隔 ${readInterval(parts.hour)} 小时`
    return `每隔 ${readInterval(parts.minute)} 分钟`
  }
  return expression
}

function formatNumberText(value: string) {
  const n = Number(value)
  return Number.isNaN(n) ? value : String(n)
}

function readInterval(value: string) {
  const raw = value.replace('*/', '')
  const n = Number(raw)
  return Number.isNaN(n) ? 10 : n
}

function toNumber(value: string) {
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function validateExpression(value?: string) {
  if (value === null || value === undefined) {
    return Promise.reject(new Error('请选择执行计划'))
  }
  if (value === '') return Promise.resolve()

  const fields = value.split(' ')
  if (fields.length !== 5 || fields.some((field) => field === '')) {
    return Promise.reject(new Error('无法解析Cron表达式'))
  }

  if (/^\*\/\d+ \* \* \* \*$/.test(value) && readInterval(fields[0]) < 10) {
    return Promise.reject(new Error('平台设定最小运行间隔为10分钟。小于10 min时、请使用使用其他功能。如：函数计算'))
  }

  return Promise.resolve()
}

function validateJson(value?: string) {
  if (!value) return Promise.resolve()
  try {
    JSON.parse(value)
    return Promise.resolve()
  } catch {
    return Promise.reject(new Error('请输入合法 JSON'))
  }
}

function viewConcurrentPolicy(value?: ConcurrentPolicy) {
  return concurrentPolicyOptions.find((item) => item.value === value)?.label || '未知'
}

function buildPreviewTimes(value?: string) {
  if (!value) return []
  const kind = getExpressionKind(value)
  const parts = getExpressionParts(value)
  const now = dayjs()
  const list: string[] = []

  if (kind === 'per_day' || kind === 'custom') {
    for (let i = 1; i <= 7; i += 1) {
      list.push(now.add(i, 'day').hour(toNumber(parts.hour) ?? 0).minute(toNumber(parts.minute) ?? 0).second(0).format('YYYY-MM-DD HH:mm:ss'))
    }
    return list
  }

  if (kind === 'per_month') {
    for (let i = 1; i <= 7; i += 1) {
      list.push(now.add(i, 'month').date(toNumber(parts.day) ?? 1).hour(toNumber(parts.hour) ?? 0).minute(toNumber(parts.minute) ?? 0).second(0).format('YYYY-MM-DD HH:mm:ss'))
    }
    return list
  }

  if (kind === 'interval') {
    const unit = parts.hour.startsWith('*/') ? 'hour' : 'minute'
    const amount = parts.hour.startsWith('*/') ? readInterval(parts.hour) : readInterval(parts.minute)
    for (let i = 1; i <= 7; i += 1) {
      list.push(now.add(amount * i, unit).second(0).format('YYYY-MM-DD HH:mm:ss'))
    }
  }

  return list
}
