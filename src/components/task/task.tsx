'use client'

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
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

type TaskKind = 'function' | 'container'
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
  /** 本次执行的 console 输出，截断到 4KB；函数任务用，容器任务日志仍走 Grafana */
  output?: string
}

interface FunctionTask {
  id: string
  name: string
  applicationName: string
  runtime: 'Node.js 20'
  expression: string
  jobType: JobType
  /** 只保存函数体；平台负责补齐 handler 外壳 */
  code: string
  timeoutSeconds: number
  concurrencyPolicy: ConcurrentPolicy
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
  timeoutSeconds: number
  concurrencyPolicy: ConcurrentPolicy
}

interface ContainerTaskFormValues {
  name: string
  imageRepoName: string
  tag: string
  expression: string
  command: string
  concurrencyPolicy: ConcurrentPolicy
}

type FunctionTaskItem = FunctionTask & { kind: 'function' }
type ContainerTaskItem = ContainerTask & { kind: 'container' }
type TaskItem = FunctionTaskItem | ContainerTaskItem

type DetailState = TaskItem | null

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
  /** 本次调用耗时，毫秒 */
  durationMs: number
  /** handler 的返回值，成功时回显 */
  returnValue?: string
  /** 异常摘要，失败时回显 */
  errorSummary?: string
  /** 本次运行的 console 输出，截断到 4KB */
  output?: string
}

const DEFAULT_EXPRESSION = '0 0 * * *'
const GRAFANA_LINK = 'https://publisher.grafana.net/'
const entrypointReg = /^(?!.*[[\]"，。（）“”：；！\u4e00-\u9fa5])[\s\S]*$/

/**
 * 平台提供的 handler 外壳，用户不可编辑、也不需要自己写。
 *
 * 只有一个形参 ctx：v1 砍掉了「事件入参」——一个任务只干一件固定的事，参数直接写在代码里。
 * 以后若真需要传参，也应挂在 ctx 上（如 ctx.params），不要改成 handler(event, ctx)：
 * 调整位置参数会让所有已存在任务的第一个形参含义变掉，属于破坏性变更。
 */
const HANDLER_PREFIX = 'export default async function handler(ctx) {'
const HANDLER_SUFFIX = '}'

/** 容器任务沿用平台既有的 10 分钟下限；函数任务是托管 Runner，放开到 1 分钟 */
const CONTAINER_MIN_INTERVAL_MINUTES = 10
const FUNCTION_MIN_INTERVAL_MINUTES = 1

/**
 * 不允许 import 的前提下，ctx 就是用户能用的全部能力，必须完整列出。
 *
 * 只放「必须由平台代理才能保证安全或可审计」的能力，其余一概不进 ctx：
 * - 没有 ctx.notify：通知归「告警规则」统一管理，函数任务只负责打日志或让本次执行失败。
 * - 没有 ctx.log / ctx.error：日志不需要平台代理，直接用标准 console 即可。
 * - 没有 ctx.state：v1 只支持应用资源、任务都是幂等的，需要跨次记状态的场景还不存在。
 * - 没有 ctx.requestId：平台采集日志时会自动打上执行 ID，用户不必自己打印。
 * 以上都可以在真出现场景时再加，往 ctx 加能力是向后兼容的。
 */
const ctxCapabilities: { signature: string; desc: string }[] = [
  { signature: 'ctx.app(name)', desc: '调用目标应用（get / post / health）' },
  { signature: 'ctx.secret(key)', desc: '读取该应用已配置的密钥' }
]

/**
 * console 的归属要在表单里点一句，否则用户会疑惑「我打的日志去哪了」。
 * 函数任务的输出不接 Grafana，而是随执行记录保存（截断 4KB、只留最近 10 次）。
 */
const CONSOLE_NOTE = 'console.log / console.error 的输出会记入本次执行记录（最多 4KB）。'

const functionTemplate = `  const app = ctx.app("xcron-cloud");

  const res = await app.post("/admin/cache/clear", {
    key: "rank_cache"
  });

  console.log("缓存已清理", res);
  return res;`

// 检查不通过时直接抛错：本次执行被记为「故障」，由告警规则去通知，函数任务不自己发消息
const healthCheckTemplate = `  const app = ctx.app("kumo游服");
  const status = await app.health();

  if (!status.ok) {
    console.error("kumo游服健康检查失败", status);
    throw new Error("health check failed: " + status.reason);
  }

  return status;`

const appOptions = demoApps.map((app) => ({
  value: app.name,
  label: `${app.name}（${app.tags.join('、')}）`
}))

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

function createHistory(
  status: CronJobStatus,
  message: string,
  image: Record<string, string> = {},
  output?: string
): CronJobHistory {
  historyCounter += 1
  const endAt = dayjs().unix() - historyCounter * 900

  return {
    id: `history-${historyCounter}`,
    startAt: endAt - 120,
    endAt: status === 'progressing' ? 0 : endAt,
    status,
    message,
    image,
    output
  }
}

function createFunctionTestResult(status: CronJobStatus): TestRunResult {
  const ok = status === 'complete'

  return {
    status,
    message: ok ? '测试运行成功' : '测试运行失败',
    durationMs: ok ? 412 : 265,
    returnValue: ok ? JSON.stringify({ ok: true, cleared: 128 }, null, 2) : undefined,
    errorSummary: ok ? undefined : 'RequestError: POST /admin/cache/clear 返回 500 (Internal Server Error)',
    output: ok
      ? '缓存已清理 { ok: true, cleared: 128 }'
      : '缓存已清理前置检查通过\nRequestError: POST /admin/cache/clear 返回 500'
  }
}

function createContainerTestResult(status: CronJobStatus): TestRunResult {
  const ok = status === 'complete'

  return {
    status,
    message: ok ? '测试运行成功' : '测试运行失败',
    durationMs: ok ? 8320 : 5140,
    returnValue: ok ? '容器退出码 0' : undefined,
    errorSummary: ok ? undefined : '容器退出码 1：ENTRYPOINT 执行失败'
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
    timeoutSeconds: 60,
    concurrencyPolicy: 'Forbid',
    switchOn: true,
    histories: [
      createHistory('complete', '清理应用缓存完成', {}, '缓存已清理 { ok: true, cleared: 128 }'),
      createHistory(
        'failed',
        '应用接口返回 500',
        {},
        '开始清理 rank_cache\nRequestError: POST /admin/cache/clear 返回 500\n... 输出已截断，仅保留最后 4KB'
      ),
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
    timeoutSeconds: 120,
    concurrencyPolicy: 'Forbid',
    switchOn: true,
    histories: [
      createHistory('complete', '健康检查完成', {}, 'health ok: { ok: true, latencyMs: 42 }'),
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

const initialTasks: TaskItem[] = [
  ...initialFunctionTasks.map((task) => ({ ...task, kind: 'function' as const })),
  ...initialContainerTasks.map((task) => ({ ...task, kind: 'container' as const }))
]

export default function Task(): React.ReactElement {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskKind, setTaskKind] = useState<TaskKind>('function')
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [detailState, setDetailState] = useState<DetailState>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)
  const [switchState, setSwitchState] = useState<SwitchState>(null)
  // 手动执行 / 保存 均需二次确认：函数代码可以对目标应用做任意操作，风险不低于容器任务部署
  const [runState, setRunState] = useState<TaskItem | null>(null)
  const [saveConfirmKind, setSaveConfirmKind] = useState<TaskKind | null>(null)
  const [functionTestRunning, setFunctionTestRunning] = useState(false)
  const [functionTestResult, setFunctionTestResult] = useState<TestRunResult | null>(null)
  const [containerTestRunning, setContainerTestRunning] = useState(false)
  const [containerTestResult, setContainerTestResult] = useState<TestRunResult | null>(null)
  const [functionForm] = Form.useForm<FunctionTaskFormValues>()
  const [containerForm] = Form.useForm<ContainerTaskFormValues>()
  const functionExpression = Form.useWatch('expression', functionForm)
  const containerExpression = Form.useWatch('expression', containerForm)
  const imageRepoName = Form.useWatch('imageRepoName', containerForm)
  const editingFunctionTask = editingTask?.kind === 'function' ? editingTask : null
  const editingContainerTask = editingTask?.kind === 'container' ? editingTask : null

  const tagOptions = useMemo(() => {
    return (imageTags[imageRepoName || 'proxyman'] || []).map((tag) => ({ value: tag, label: tag }))
  }, [imageRepoName])

  const clearTaskEditorResult = () => {
    setFunctionTestResult(null)
    setContainerTestResult(null)
    setFunctionTestRunning(false)
    setContainerTestRunning(false)
  }

  const setDefaultFunctionTaskValues = () => {
    functionForm.setFieldsValue({
      name: 'clear-rank-cache',
      applicationName: 'xcron-cloud',
      runtime: 'Node.js 20',
      expression: DEFAULT_EXPRESSION,
      code: functionTemplate,
        timeoutSeconds: 60,
      concurrencyPolicy: 'Forbid'
    })
  }

  const setDefaultContainerTaskValues = () => {
    containerForm.setFieldsValue({
      name: 'demo',
      imageRepoName: 'proxyman',
      tag: 'v1.0.5',
      expression: DEFAULT_EXPRESSION,
      command: 'echo demo',
      concurrencyPolicy: 'Forbid'
    })
  }

  const openCreateTask = () => {
    setEditingTask(null)
    setTaskKind('function')
    clearTaskEditorResult()
    functionForm.resetFields()
    containerForm.resetFields()
    setDefaultFunctionTaskValues()
    setDefaultContainerTaskValues()
    setTaskDrawerOpen(true)
  }

  const openEditTask = (task: TaskItem) => {
    setEditingTask(task)
    setTaskKind(task.kind)
    clearTaskEditorResult()

    if (task.kind === 'function') {
      functionForm.setFieldsValue({
        name: task.name,
        applicationName: task.applicationName,
        runtime: task.runtime,
        expression: task.expression,
        code: task.code,
        timeoutSeconds: task.timeoutSeconds,
        concurrencyPolicy: task.concurrencyPolicy
      })
    } else {
      containerForm.setFieldsValue({
        name: task.name,
        imageRepoName: task.imageRepoName,
        tag: task.tag,
        expression: task.expression,
        command: task.command,
        concurrencyPolicy: task.concurrencyPolicy
      })
    }

    setTaskDrawerOpen(true)
  }

  const closeTaskDrawer = () => {
    setTaskDrawerOpen(false)
    setEditingTask(null)
    clearTaskEditorResult()
  }

  const updateTaskKind = (nextKind: TaskKind) => {
    setTaskKind(nextKind)
    clearTaskEditorResult()
  }

  /** 先校验再弹二次确认，避免用户在确认框里才看到校验错误 */
  const requestSave = async (kind: TaskKind) => {
    if (kind === 'function') await functionForm.validateFields()
    else await containerForm.validateFields()
    setSaveConfirmKind(kind)
  }

  const submitFunctionTask = async () => {
    const values = await functionForm.validateFields()
    const nextTask: FunctionTaskItem = {
      kind: 'function',
      id: editingFunctionTask?.id ?? `fn-${values.name}-${Date.now()}`,
      name: values.name,
      applicationName: values.applicationName,
      runtime: values.runtime,
      expression: values.expression,
      jobType: values.expression === '' ? 'manual' : 'scheduled',
      code: values.code,
      timeoutSeconds: values.timeoutSeconds,
      concurrencyPolicy: values.expression === '' ? 'Forbid' : values.concurrencyPolicy,
      switchOn: editingFunctionTask?.switchOn ?? true,
      histories: editingFunctionTask?.histories ?? [createHistory('complete', '函数任务执行完成')]
    }

    setTasks((prev) => {
      if (!editingFunctionTask) return [nextTask, ...prev]
      return prev.map((item) => (item.kind === 'function' && item.id === editingFunctionTask.id ? nextTask : item))
    })
    setSaveConfirmKind(null)
    closeTaskDrawer()
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

  const submitContainerTask = async () => {
    const values = await containerForm.validateFields()
    const image = { [values.imageRepoName]: values.tag }
    const nextTask: ContainerTaskItem = {
      kind: 'container',
      id: editingContainerTask?.id ?? `container-${values.name}-${Date.now()}`,
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

    setTasks((prev) => {
      if (!editingContainerTask) return [nextTask, ...prev]
      return prev.map((item) => (item.kind === 'container' && item.id === editingContainerTask.id ? nextTask : item))
    })
    setSaveConfirmKind(null)
    closeTaskDrawer()
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
    setTasks((prev) => prev.map((item) => {
      if (item.kind !== 'function' || item.id !== task.id) return item
      return { ...item, histories: [record, ...item.histories].slice(0, 10) }
    }))
    message.success('任务已触发执行')
  }

  const runContainerTask = (task: ContainerTask) => {
    const status: CronJobStatus = Math.random() > 0.35 ? 'complete' : 'failed'
    const image = { [task.imageRepoName]: task.tag }
    const record = createHistory(status, status === 'failed' ? '容器任务执行失败' : '容器任务执行完成', image)
    setTasks((prev) => prev.map((item) => {
      if (item.kind !== 'container' || item.id !== task.id) return item
      return { ...item, histories: [record, ...item.histories].slice(0, 10) }
    }))
    message.success('任务已触发执行')
  }

  const confirmRun = () => {
    if (!runState) return
    if (runState.kind === 'function') runFunctionTask(runState)
    else runContainerTask(runState)
    setRunState(null)
  }

  const updateSwitch = (next: SwitchState) => {
    if (!next) return
    setTasks((prev) => prev.map((item) => {
      if (item.kind !== next.kind || item.id !== next.id) return item
      return { ...item, switchOn: next.checked }
    }))
  }

  const confirmDelete = () => {
    if (!deleteState) return
    setTasks((prev) => prev.filter((item) => item.kind !== deleteState.kind || item.id !== deleteState.id))
    setDeleteState(null)
    message.success('该任务已删除')
  }

  const taskColumns: ColumnsType<TaskItem> = [
    {
      dataIndex: 'kind',
      title: '类型',
      width: 120,
      render: (_: TaskKind, record: TaskItem) => <TaskKindTag kind={record.kind} />
    },
    {
      dataIndex: 'name',
      title: '名称',
      width: 150
    },
    {
      key: 'target',
      title: '目标资源',
      width: 220,
      render: (_: unknown, record: TaskItem) => {
        if (record.kind === 'function') {
          return (
            <Space size={6}>
              <CloudServerOutlined style={{ color: '#1677ff' }} />
              <Text>{record.applicationName}</Text>
            </Space>
          )
        }
        return <Text>{`${record.imageRepoName}:${record.tag}`}</Text>
      }
    },
    {
      key: 'runtime',
      title: '运行配置',
      width: 220,
      render: (_: unknown, record: TaskItem) => record.kind === 'function' ? record.runtime : (record.command || '-')
    },
    {
      dataIndex: 'expression',
      title: '执行计划（北京时间）',
      width: 180,
      render: (value: string, record: TaskItem) => record.jobType === 'manual' ? '手动执行' : formatExpression(value)
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
      render: (_: unknown, record: TaskItem) => (
        <Flex gap={16}>
          {record.expression === '' ? (
            <Button
              type="link"
              size="small"
              onClick={() => setRunState(record)}
              style={{ paddingInline: 0 }}
            >
              执行任务
            </Button>
          ) : (
            <Switch
              checkedChildren="ON"
              unCheckedChildren="OFF"
              checked={record.switchOn}
              onChange={(checked) => {
                const next = record.kind === 'function'
                  ? { kind: 'function' as const, id: record.id, checked }
                  : { kind: 'container' as const, id: record.id, checked }
                if (!checked) {
                  setSwitchState(next)
                  return
                }
                updateSwitch(next)
              }}
            />
          )}
          <TaskActionDropdown
            onEdit={() => openEditTask(record)}
            onView={() => setDetailState(record)}
            onDelete={() => setDeleteState(record.kind === 'function'
              ? { kind: 'function', id: record.id }
              : { kind: 'container', id: record.id })}
          />
        </Flex>
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Flex vertical gap={16}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>任务</Title>
          <Text type="secondary">
            可按设定周期或手动触发执行任务（如重启服务、备份数据、清理缓存、更新配置），支持并发控制与失败重试，保障服务稳定性并提升运维效率。
          </Text>
        </div>

        <Alert
          showIcon
          type="info"
          message="任务类型"
          description="列表统一展示函数任务和容器任务。函数任务只需贴一段函数体，handler 外壳与 ctx 能力由平台提供，最小间隔 1 分钟；容器任务沿用镜像版本、ENTRYPOINT 和执行计划，最小间隔 10 分钟。"
        />

        <Card
          title="列表"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask}>
              添加
            </Button>
          }
        >
          <Table<TaskItem>
            rowKey={(record) => `${record.kind}-${record.id}`}
            columns={taskColumns}
            dataSource={tasks}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </Flex>

      <Drawer
        title={editingTask ? '编辑任务' : '新增任务'}
        width={taskKind === 'function' ? 720 : 560}
        open={taskDrawerOpen}
        onClose={closeTaskDrawer}
        destroyOnClose
        footer={
          <Space>
            <Tooltip
              title={
                taskKind === 'function'
                  ? '测试运行执行的是同一段逻辑，对目标应用产生的副作用（清缓存、改配置等）是真实的，只是不写入正式执行记录。'
                  : '测试运行会真实拉起一次容器，只是不写入正式执行记录。'
              }
            >
              <Button
                onClick={taskKind === 'function' ? testRunFunctionTask : testRunContainerTask}
                loading={taskKind === 'function' ? functionTestRunning : containerTestRunning}
              >
                测试运行
              </Button>
            </Tooltip>
            <Button type="primary" onClick={() => requestSave(taskKind)}>确 定</Button>
            <Button onClick={closeTaskDrawer}>关 闭</Button>
          </Space>
        }
      >
        <Form layout="vertical" requiredMark>
          <Form.Item label="任务类型" required>
            <Segmented
              value={taskKind}
              disabled={!!editingTask}
              onChange={(value) => updateTaskKind(value as TaskKind)}
              options={[
                { label: '函数任务', value: 'function', icon: <CodeOutlined /> },
                { label: '容器任务', value: 'container', icon: <ApiOutlined /> }
              ]}
            />
          </Form.Item>
        </Form>

        {taskKind === 'function' ? (
          <>
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
                            timeoutSeconds: 60,
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

              <Form.Item
                label="执行计划"
                name="expression"
                required
                extra={functionExpression ? <ExpressionPreview value={functionExpression} /> : null}
                rules={[{ validator: (_, value: string | undefined) => validateExpression(value, FUNCTION_MIN_INTERVAL_MINUTES) }]}
              >
                <CronExpressionSelect
                  minIntervalMinutes={FUNCTION_MIN_INTERVAL_MINUTES}
                  disabled={!!editingFunctionTask && editingFunctionTask.jobType === 'manual'}
                  restrictToManualMode={!!editingFunctionTask && editingFunctionTask.jobType === 'manual'}
                  restrictToScheduledMode={!!editingFunctionTask && editingFunctionTask.jobType === 'scheduled'}
                />
              </Form.Item>

              {functionExpression !== '' && (
                <Form.Item
                  name="concurrencyPolicy"
                  label={<QuestionLabel title="上一次还没跑完时本次怎么处理。选择「阻止并发」时被跳过的执行会在执行状态里记为「跳过」。">并发逻辑</QuestionLabel>}
                >
                  <Select options={concurrentPolicyOptions} />
                </Form.Item>
              )}

              <Form.Item
                label={<QuestionLabel title={<FunctionCodeHelp />}>函数逻辑</QuestionLabel>}
                required
              >
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
                  <ScaffoldLine>{HANDLER_PREFIX}<ScaffoldHint>平台生成，不可编辑</ScaffoldHint></ScaffoldLine>
                  <Form.Item
                    name="code"
                    noStyle
                    rules={[
                      { required: true, message: '请输入函数逻辑' },
                      { validator: (_, value: string) => validateFunctionBody(value) }
                    ]}
                  >
                    <TextArea
                      rows={11}
                      variant="borderless"
                      placeholder="  // 在这里写逻辑，可直接使用 ctx"
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        borderRadius: 0
                      }}
                    />
                  </Form.Item>
                  <ScaffoldLine>{HANDLER_SUFFIX}</ScaffoldLine>
                </div>
              </Form.Item>

              <Collapse
                ghost
                items={[
                  {
                    key: 'advanced',
                    label: '高级设置',
                    children: (
                      <Flex vertical>
                        <Form.Item label="运行时">
                          <Input disabled value="Node.js 20" style={{ width: 200 }} />
                        </Form.Item>
                        <Form.Item label="超时时间" required>
                          <Space.Compact>
                            <Form.Item name="timeoutSeconds" noStyle rules={[{ required: true, message: '请输入超时时间' }]}>
                              <InputNumber min={10} max={600} />
                            </Form.Item>
                            <DisabledLabel>秒</DisabledLabel>
                          </Space.Compact>
                        </Form.Item>

                        {/*
                          本期不做任何失败通知：ctx 不含通知方法、表单不设开关、平台也不上报指标。
                          用户在列表的「执行状态」和「查看记录」里自行查看结果。
                        */}
                      </Flex>
                    )
                  }
                ]}
              />

              {/* 运行时字段被隐藏进高级设置，但仍需提交，用隐藏项占位 */}
              <Form.Item name="runtime" hidden>
                <Input />
              </Form.Item>
            </Form>

            {functionTestResult && (
              <FunctionTestResultPanel result={functionTestResult} />
            )}
          </>
        ) : (
          <>
            <Form
              form={containerForm}
              layout="vertical"
              requiredMark
              initialValues={{
                name: 'demo',
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
                rules={[{ validator: (_, value: string | undefined) => validateExpression(value, CONTAINER_MIN_INTERVAL_MINUTES) }]}
              >
                <CronExpressionSelect
                  minIntervalMinutes={CONTAINER_MIN_INTERVAL_MINUTES}
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
          </>
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

      <Modal
        title={saveConfirmKind === 'function' ? '确认保存函数任务' : '确认保存容器任务'}
        open={saveConfirmKind !== null}
        okText="确认保存"
        cancelText="返回修改"
        onOk={saveConfirmKind === 'function' ? submitFunctionTask : submitContainerTask}
        onCancel={() => setSaveConfirmKind(null)}
      >
        <SaveConfirmSummary
          kind={saveConfirmKind}
          functionValues={functionForm.getFieldsValue()}
          containerValues={containerForm.getFieldsValue()}
        />
      </Modal>

      <Modal
        title="执行任务"
        open={runState !== null}
        okText="立即执行"
        cancelText="取消"
        onOk={confirmRun}
        onCancel={() => setRunState(null)}
      >
        {runState && <RunConfirmSummary task={runState} />}
      </Modal>
    </div>
  )
}

function TaskKindTag({ kind }: { kind: TaskKind }) {
  if (kind === 'function') {
    return <Tag color="blue" icon={<CodeOutlined />}>函数任务</Tag>
  }
  return <Tag color="cyan" icon={<ApiOutlined />}>容器任务</Tag>
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
              { key: 'duration', label: '耗时', children: `${result.durationMs} ms` },
              { key: 'message', label: '说明', children: result.message }
            ]}
            styles={{ label: { width: 80 } }}
          />

          {/* 回显返回值 / 异常摘要：只显示成功失败的话，测试运行没有调试价值 */}
          {ok && result.returnValue ? (
            <Flex vertical gap={6}>
              <Typography.Text strong style={{ fontSize: 13 }}>返回值</Typography.Text>
              <CodeBlock>{result.returnValue}</CodeBlock>
            </Flex>
          ) : null}

          {!ok && result.errorSummary ? (
            <Flex vertical gap={6}>
              <Typography.Text strong style={{ fontSize: 13 }}>异常摘要</Typography.Text>
              <CodeBlock>{result.errorSummary}</CodeBlock>
            </Flex>
          ) : null}

          {result.output ? (
            <Flex vertical gap={6}>
              <Typography.Text strong style={{ fontSize: 13 }}>输出</Typography.Text>
              <CodeBlock>{result.output}</CodeBlock>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                测试运行的输出不写入执行记录，关闭抽屉即丢弃。
              </Typography.Text>
            </Flex>
          ) : null}
        </Flex>
      }
    />
  )
}

/**
 * 平台生成的 handler 外壳，展示为不可编辑的灰色代码行。
 * 这只是在线编辑模式的便利：真正的契约是「导出一个 handler(ctx)」，
 * 以后支持上传代码包时用户自己写 handler，这里不再出现外壳。
 */
function ScaffoldLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.03)',
        color: 'rgba(0,0,0,0.45)',
        fontSize: 13,
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
      }}
    >
      {children}
    </div>
  )
}

function ScaffoldHint({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', fontFamily: 'inherit' }}>{children}</span>
  )
}

/**
 * 「函数逻辑」的提示。只保留写代码时当场需要知道的三件事：
 * 只写函数体、能用哪些能力、日志去哪。
 *
 * 有意不写进提示的内容（属于文档，不属于表单）：
 * - 契约是「导出一个 handler(ctx)」、以后换成上传代码包时外壳不再出现 —— 见 HANDLER_PREFIX 注释
 * - 关键字检查只是提示、真边界在运行时沙箱 —— 见 validateFunctionBody 注释
 */
function FunctionCodeHelp() {
  return (
    <Flex vertical gap={6} style={{ maxWidth: 340 }}>
      <div>只写函数体，外层 <code>handler(ctx)</code> 由平台生成。</div>
      <div>
        不支持 import，可用能力：
        <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
          {ctxCapabilities.map((item) => (
            <li key={item.signature}>
              <code>{item.signature}</code> — {item.desc}
            </li>
          ))}
        </ul>
      </div>
      <div>{CONSOLE_NOTE}</div>
    </Flex>
  )
}

function SaveConfirmSummary({
  kind,
  functionValues,
  containerValues
}: {
  kind: TaskKind | null
  functionValues: Partial<FunctionTaskFormValues>
  containerValues: Partial<ContainerTaskFormValues>
}) {
  if (kind === 'function') {
    const manual = functionValues.expression === ''
    return (
      <Flex vertical gap={12}>
        <Text type="secondary">函数逻辑会以平台身份调用目标应用，请确认以下配置：</Text>
        <Descriptions
          column={1}
          size="small"
          items={[
            { key: 'name', label: '名称', children: functionValues.name },
            { key: 'app', label: '目标应用', children: functionValues.applicationName },
            { key: 'expression', label: '执行计划', children: manual ? '手动执行' : formatExpression(functionValues.expression ?? '') },
            ...(manual ? [] : [{ key: 'policy', label: '并发逻辑', children: viewConcurrentPolicy(functionValues.concurrencyPolicy) }]),
            { key: 'timeout', label: '超时时间', children: `${functionValues.timeoutSeconds ?? '-'} 秒` }
          ]}
          styles={{ label: { width: 88 } }}
        />
      </Flex>
    )
  }

  const manual = containerValues.expression === ''
  return (
    <Flex vertical gap={12}>
      <Text type="secondary">请确认以下配置：</Text>
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'name', label: '名称', children: containerValues.name },
          { key: 'image', label: '镜像版本', children: `${containerValues.imageRepoName ?? '-'}:${containerValues.tag ?? '-'}` },
          { key: 'expression', label: '执行计划', children: manual ? '手动执行' : formatExpression(containerValues.expression ?? '') },
          ...(manual ? [] : [{ key: 'policy', label: '并发逻辑', children: viewConcurrentPolicy(containerValues.concurrencyPolicy) }])
        ]}
        styles={{ label: { width: 88 } }}
      />
    </Flex>
  )
}

function RunConfirmSummary({ task }: { task: TaskItem }) {
  return (
    <Flex vertical gap={12}>
      <Text>
        {task.kind === 'function'
          ? '将立即执行该函数任务，对目标应用产生的副作用是真实的。'
          : '将立即执行该容器任务。'}
      </Text>
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'kind', label: '类型', children: <TaskKindTag kind={task.kind} /> },
          { key: 'name', label: '名称', children: task.name },
          task.kind === 'function'
            ? { key: 'app', label: '目标应用', children: task.applicationName }
            : { key: 'image', label: '镜像版本', children: `${task.imageRepoName}:${task.tag}` }
        ]}
        styles={{ label: { width: 88 } }}
      />
    </Flex>
  )
}

function QuestionLabel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
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
  restrictToScheduledMode,
  minIntervalMinutes = CONTAINER_MIN_INTERVAL_MINUTES
}: {
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  restrictToManualMode?: boolean
  restrictToScheduledMode?: boolean
  minIntervalMinutes?: number
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
                min={intervalUnit === 0 ? minIntervalMinutes : 1}
                max={intervalUnit === 0 ? 59 : 23}
                onChange={(v) => {
                  const nextValue = String(v ?? (intervalUnit === 0 ? minIntervalMinutes : 1))
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
                  const nextValue = String(unit === 0 ? Math.max(intervalValue || minIntervalMinutes, minIntervalMinutes) : intervalValue || 1)
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
  const isFunction = detail.kind === 'function'

  const descriptionItems = isFunction
    ? [
        { key: 'kind', label: '类型', children: <TaskKindTag kind={detail.kind} /> },
        { key: 'name', label: '名称', children: detail.name },
        { key: 'applicationName', label: '目标应用', children: detail.applicationName },
        { key: 'runtime', label: '运行时', children: detail.runtime },
        { key: 'expression', label: '执行计划', children: detail.jobType === 'manual' ? '手动执行' : formatExpression(detail.expression) },
        ...(detail.jobType !== 'manual'
          ? [{ key: 'concurrencyPolicy', label: '并发逻辑', children: viewConcurrentPolicy(detail.concurrencyPolicy) }]
          : []),
        { key: 'timeout', label: '超时时间', children: `${detail.timeoutSeconds} 秒` }
      ]
    : [
        { key: 'kind', label: '类型', children: <TaskKindTag kind={detail.kind} /> },
        { key: 'name', label: '名称', children: detail.name },
        { key: 'tag', label: '镜像版本', children: `${detail.imageRepoName}:${detail.tag}` },
        { key: 'expression', label: '执行计划', children: detail.jobType === 'manual' ? '手动执行' : formatExpression(detail.expression) },
        ...(detail.jobType !== 'manual'
          ? [{ key: 'concurrencyPolicy', label: '并发逻辑', children: viewConcurrentPolicy(detail.concurrencyPolicy) }]
          : [])
      ]

  return (
    <Flex vertical gap={24}>
      <Descriptions column={1} size="small" items={descriptionItems} styles={{ label: { width: 80 } }} />

      {isFunction ? (
        <>
          <Flex vertical gap={12}>
            <Typography.Title level={5} style={{ fontSize: 14, marginBottom: 0 }}>
              <QuestionLabel title="灰色部分是平台生成的 handler 外壳，用户只维护函数体。">函数逻辑</QuestionLabel>
            </Typography.Title>
            <div>
              <ScaffoldLine>{HANDLER_PREFIX}</ScaffoldLine>
              <CodeBlock>{detail.code}</CodeBlock>
              <ScaffoldLine>{HANDLER_SUFFIX}</ScaffoldLine>
            </div>
          </Flex>
        </>
      ) : (
        <Flex vertical gap={12}>
          <Typography.Title level={5} style={{ fontSize: 14, marginBottom: 0 }}>
            <QuestionLabel title="该命令会覆盖Dockerfile内定义的ENTRYPOINT。若Dockfile内已定义ENTRYPOINT，此处可为空">启动命令ENTRYPOINT</QuestionLabel>
          </Typography.Title>
          <CommandLineViewer>{detail.command}</CommandLineViewer>
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
          dataSource={detail.histories}
          pagination={false}
          scroll={{ x: 'max-content' }}
          expandable={
            isFunction
              ? {
                  // 函数任务的输出随执行记录保存，展开即看，不再跳 Grafana
                  rowExpandable: (record) => !!record.output,
                  expandedRowRender: (record) => <HistoryOutput output={record.output} />
                }
              : undefined
          }
        />
        {isFunction ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            展开某次执行可查看该次的 console 输出（最多 4KB，仅保留最近 10 次）。
          </Typography.Text>
        ) : (
          <Space>
            <Typography.Text>更多信息请前往</Typography.Text>
            <Typography.Link target="_blank" href={GRAFANA_LINK}>Grafana</Typography.Link>
          </Space>
        )}
      </Flex>

    </Flex>
  )
}

/** 执行记录展开后的输出。截断提示由后端在内容末尾追加，前端原样展示 */
function HistoryOutput({ output }: { output?: string }) {
  if (!output) {
    return <Text type="secondary" style={{ fontSize: 12 }}>本次执行没有输出。</Text>
  }
  return <CodeBlock>{output}</CodeBlock>
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

function validateExpression(value?: string, minIntervalMinutes = CONTAINER_MIN_INTERVAL_MINUTES) {
  if (value === null || value === undefined) {
    return Promise.reject(new Error('请选择执行计划'))
  }
  if (value === '') return Promise.resolve()

  const fields = value.split(' ')
  if (fields.length !== 5 || fields.some((field) => field === '')) {
    return Promise.reject(new Error('无法解析Cron表达式'))
  }

  if (/^\*\/\d+ \* \* \* \*$/.test(value) && readInterval(fields[0]) < minIntervalMinutes) {
    // 容器任务仍是 10 分钟；函数任务跑在托管 Runner 上，下限放开到 1 分钟
    return Promise.reject(
      new Error(
        minIntervalMinutes > 1
          ? `容器任务的最小运行间隔为 ${minIntervalMinutes} 分钟。需要更短间隔请改用函数任务。`
          : `最小运行间隔为 ${minIntervalMinutes} 分钟。`
      )
    )
  }

  return Promise.resolve()
}

/**
 * 在线编辑模式下的关键字检查。
 * 注意：这只是提前给用户的提示，字符串拼接、Function() 反射等手法都能绕过；
 * 真正的隔离边界必须由运行时沙箱保证。
 */
function validateFunctionBody(value?: string) {
  if (!value) return Promise.resolve()

  const banned: { pattern: RegExp; hint: string }[] = [
    { pattern: /(^|[^\w.])import\s*\(/, hint: '动态 import()' },
    { pattern: /(^|[^\w.])import\s+[\w{*]/, hint: 'ESM 静态导入' },
    { pattern: /(^|[^\w.])require\s*\(/, hint: 'CommonJS require()' },
    { pattern: /from\s+['"]\.{1,2}\//, hint: '相对路径文件引用' }
  ]

  const hit = banned.find((item) => item.pattern.test(value))
  if (hit) {
    return Promise.reject(new Error(`在线编辑模式暂不支持${hit.hint}，请使用平台提供的 ctx 能力`))
  }

  if (new Blob([value]).size > 64 * 1024) {
    return Promise.reject(new Error('函数逻辑不能超过 64KB'))
  }

  return Promise.resolve()
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
