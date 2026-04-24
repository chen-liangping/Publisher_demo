"use client"
//游服
import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { ColumnsType } from 'antd/es/table'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Table,
  Tabs,
  // Progress,
  Dropdown,
  Collapse,
  Drawer,
  Form,
  InputNumber,
  Select,
  Input,
  Modal,
  Switch,
  Divider,
  Popover,
  Spin
} from 'antd'
import {
  MoreOutlined,
  EditOutlined,
  CopyOutlined,
  UpOutlined,
  DownOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  RobotOutlined
} from '@ant-design/icons'
import HPAConfigModal, { type HPAFormValues } from './HPAConfigModal'
import DeploymentRecords, { 
  type DeployGroup as CommonDeployGroup, 
  type DeployConfig as CommonDeployConfig 
} from './DeploymentRecords'
import FileDownload, { type ServerItem, type DownloadInfo } from './FileDownload'

const { Title, Text } = Typography

/** 对齐 K8s ContainerStatus：waiting/terminated 的 reason + message，描述容器进程/探针等 */
interface PodContainerStatusSummary {
  containerName?: string
  stateReason: string
  stateMessage: string
}

interface K8sPodEventRow {
  key: string
  eventType: 'Normal' | 'Warning'
  objectKind: string
  objectName: string
  message: string
  reason: string
  time: string
}

/** 对齐 Pod.status.conditions，用于状态旁 (i) Popover */
interface PodConditionRow {
  type: string
  status: 'True' | 'False' | 'Unknown'
}

interface Pod {
  key: string
  service: string
  group: string
  startTime: string
  updatedTime: string
  policy: string
  resources: string
  status: string
  containerStatus?: PodContainerStatusSummary
  podEvents?: K8sPodEventRow[]
  /** 主行展示的阶段文案，如 Running（与 ACK Pod 列表一致） */
  k8sPhaseLabel?: string
  podConditions?: PodConditionRow[]
  /** 重启次数，与折线图标同列展示 */
  restartCount?: number
}

/** 服务列表 Mock（含 K8s 事件与容器状态摘要） */
const MOCK_SERVICE_PODS: Pod[] = [
  {
    key: 'p1',
    service: 'game1',
    group: '默认',
    startTime: '2025-02-05 14:14:41',
    updatedTime: '2025-02-05 12:00:00',
    policy: '手动开服',
    resources: '0.5C/1538Mi 推荐值：0.1C/448Mi',
    status: '故障',
    k8sPhaseLabel: 'Running',
    restartCount: 0,
    podConditions: [
      { type: 'PodReadyToStartContainers', status: 'True' },
      { type: 'Initialized', status: 'True' },
      { type: 'Ready', status: 'False' },
      { type: 'ContainersReady', status: 'False' },
      { type: 'PodScheduled', status: 'True' }
    ],
    containerStatus: {
      containerName: 'open-platform',
      stateReason: 'Unhealthy',
      stateMessage:
        'Startup probe failed: Get "http://10.15.135.64:8080/health": dial tcp 10.15.135.64:8080: connect: connection refused'
    },
    podEvents: [
      {
        key: 'e1',
        eventType: 'Warning',
        objectKind: 'Pod',
        objectName: 'open-platform-5b98b44949-rgkkf',
        message:
          'Startup probe failed: Get "http://10.15.135.64:8080/health": dial tcp 10.15.135.64:8080: connect: connection refused',
        reason: 'Unhealthy',
        time: '2026-04-22 17:22:04'
      },
      {
        key: 'e2',
        eventType: 'Normal',
        objectKind: 'Pod',
        objectName: 'open-platform-5b98b44949-rgkkf',
        message: 'Started container open-platform',
        reason: 'Started',
        time: '2026-04-22 17:21:46'
      },
      {
        key: 'e3',
        eventType: 'Normal',
        objectKind: 'Pod',
        objectName: 'open-platform-5b98b44949-rgkkf',
        message: 'Successfully pulled image "registry/open-platform:v1.2.0"',
        reason: 'Pulled',
        time: '2026-04-22 17:21:45'
      },
      {
        key: 'e4',
        eventType: 'Normal',
        objectKind: 'Pod',
        objectName: 'open-platform-5b98b44949-rgkkf',
        message: 'Pulling image "registry/open-platform:v1.2.0"',
        reason: 'Pulling',
        time: '2026-04-22 17:21:44'
      },
      {
        key: 'e5',
        eventType: 'Normal',
        objectKind: 'Pod',
        objectName: 'open-platform-5b98b44949-rgkkf',
        message: 'Created container open-platform',
        reason: 'Created',
        time: '2026-04-22 17:21:43'
      }
    ]
  },
  {
    key: 'p2',
    service: 'game2',
    group: '默认',
    startTime: '2025-02-04 10:00:00',
    updatedTime: '2025-02-05 12:00:00',
    policy: '自动开服',
    resources: '0.3C/768Mi',
    status: '正常',
    k8sPhaseLabel: 'Running',
    restartCount: 0,
    podConditions: [
      { type: 'PodReadyToStartContainers', status: 'True' },
      { type: 'Initialized', status: 'True' },
      { type: 'Ready', status: 'True' },
      { type: 'ContainersReady', status: 'True' },
      { type: 'PodScheduled', status: 'True' }
    ],
    containerStatus: {
      containerName: 'game2',
      stateReason: 'Running',
      stateMessage: 'Started container main'
    },
    podEvents: [
      {
        key: 'n1',
        eventType: 'Normal',
        objectKind: 'Pod',
        objectName: 'game2-7d4f8c9d4-xk2mn',
        message: 'Started container main',
        reason: 'Started',
        time: '2025-02-04 10:05:02'
      },
      {
        key: 'n2',
        eventType: 'Normal',
        objectKind: 'Pod',
        objectName: 'game2-7d4f8c9d4-xk2mn',
        message: 'Successfully pulled image "registry/game2:7.8.0"',
        reason: 'Pulled',
        time: '2025-02-04 10:05:00'
      }
    ]
  }
]

/** 原型：根据 Pod Conditions 与 containerStatus 生成 AI 诊断文案（未调用真实 LLM） */
function buildMockAiDiagnosisText(pod: Pod): string {
  const cond = pod.podConditions ?? []
  const notReady = cond.some(c => (c.type === 'Ready' || c.type === 'ContainersReady') && c.status === 'False')
  const phase = pod.k8sPhaseLabel ?? (pod.status === '正常' ? 'Running' : '异常')

  if (pod.status === '正常' && !notReady) {
    return [
      `【服务】${pod.service}`,
      '',
      `展示阶段为「${phase}」，Pod Conditions 均为 True，容器状态为「${pod.containerStatus?.stateReason ?? '—'}」。`,
      '',
      '从当前输入推断：工作负载就绪，暂无「未就绪却承担流量」的典型风险。若刚发版，可继续观察事件与监控是否出现探针抖动。',
      '',
      '（Mock：由本地规则生成，未接入大模型 API）'
    ].join('\n')
  }

  const lines: string[] = []
  lines.push(`【服务】${pod.service}`)
  lines.push(`【展示阶段】${phase}（业务标注：${pod.status}）`)
  lines.push('')
  lines.push('1. 根因推断')
  if (notReady) {
    lines.push(
      'Pod 可能已在运行，但 Ready / ContainersReady 为 False：就绪或健康检查未通过，或应用未在探针期望的地址与端口监听。'
    )
  } else {
    lines.push('业务态为异常，请结合容器退出原因与「查看事件」中的 Warning 交叉确认。')
  }
  lines.push('')

  const cs = pod.containerStatus
  if (cs) {
    lines.push('2. 与容器状态的关联')
    lines.push(`- ${cs.stateReason}${cs.containerName ? `（容器 ${cs.containerName}）` : ''}`)
    lines.push(`- ${cs.stateMessage}`)
    lines.push('')
    if (/connection refused|dial tcp|probe|health/i.test(cs.stateMessage)) {
      lines.push(
        '上述信息多见于 Startup/Liveness/Readiness 探针在启动阶段访问 Pod IP:端口被拒绝：进程尚未监听、仅监听 127.0.0.1、或端口与探针配置不一致。'
      )
      lines.push('')
    }
  }

  lines.push('3. 建议动作（按优先级）')
  lines.push('- 在 Pod 网络命名空间内对探针 URL 或 podIP:port/path 执行 curl / nc 复现。')
  lines.push('- 核对 Deployment 的 containerPort、Service targetPort 与探针 port、进程实际监听是否一致。')
  lines.push('- 冷启动较慢时：适当增大 startupProbe 的 initialDelaySeconds、failureThreshold，避免启动完成前被判定失败。')
  lines.push('- 结合「查看事件」中 Warning 时间与镜像变更、扩缩容记录排查。')
  lines.push('')
  lines.push('（Mock：未接入真实大模型；接入流式 API 后可替换为模型输出）')

  return lines.join('\n')
}

interface AiDiagnoseChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/** 多轮对话 Mock：按关键词返回占位回复（未接 LLM） */
function mockAiFollowUpReply(userText: string, pod: Pod): string {
  if (/探针|健康|health|probe|就绪|readiness|liveness|startup/i.test(userText)) {
    return '（Mock）建议依次核对：① 探针端口与进程监听是否一致；② 路径是否被鉴权拦截（如 401）；③ initialDelaySeconds 是否短于冷启动时间。修改 YAML 后滚动发布，并在「查看事件」里观察 Warning 是否消失。'
  }
  if (/重启|restart|crash|oom|退出|exit/i.test(userText)) {
    return `（Mock）服务「${pod.service}」可对照重启次数与事件中 Last State（如 OOMKilled）。若是内存，先调高 limit 或排查泄漏；若是 CrashLoop，请结合上文 stateMessage 与容器日志定位。`
  }
  if (/日志|log|事件|event/i.test(userText)) {
    return '（Mock）请使用本页「查看事件」打开底部事件表，按时间查看 Warning；标准输出日志需在集群控制台 Pod 详情「日志」Tab 查看（本原型未接真实日志流）。'
  }
  if (/为什么|原因|根因|怎么回事/i.test(userText)) {
    return `（Mock）综合当前 Pod Conditions 与容器 stateMessage，仍优先从「就绪/探针未通过」方向排查；业务标注为「${pod.status}」。具体步骤见首条诊断摘要。`
  }
  return `（Mock）已记录你的问题：「${userText}」。接入大模型 API 后，将把本对话与集群元数据一并作为上下文；当前请优先对照首条「诊断摘要」中的排查顺序。`
}

export default function Deployment({ appId, appName, tags }: { appId?: string; appName?: string; tags?: string[] }) {
  const [activeKey, setActiveKey] = useState<string>('overview')
  const name = appName ?? 'kumo游服'
  const appTags = tags ?? ['游服']

  // ==================== 基本信息相关 ====================
  // 基本信息数据在组件内直接使用，无需额外状态

  // ==================== 高级配置相关 ====================
  // HPA 配置
  const [hpaVisible, setHpaVisible] = useState<boolean>(false)
  const [hpaForm] = Form.useForm<HPAFormValues>()

  // 高级配置卡片展开/收起状态
  const [advancedConfigExpanded, setAdvancedConfigExpanded] = useState<boolean>(true)

  // ==================== 资源变配相关 ====================
  // 资源类型定义
  interface ResourceItem {
    key: string
    container: string
    image: string
    // cpu 存为字符串展示（例如 "0.1C 可突发至0.4"）
    cpu: string
    // memory 存为字符串（例如 "128 Mi"）
    memory: string
  }

  // 资源变配数据（从常量改为 state，便于更新）
  const [resources, setResources] = useState<ResourceItem[]>([
    { key: '1', container: 'platform', image: 'platform:v0.1', cpu: '0.1C 可突发至0.4', memory: '128 Mi' },
    { key: '2', container: 'center', image: 'center:v0.2', cpu: '0.3C 可突发至1.2', memory: '768 Mi' }
  ])

  // 资源变配编辑抽屉状态
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)
  const [editForm] = Form.useForm()
  // 镜像/容器管理弹窗状态
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false)
  const [addingContainer, setAddingContainer] = useState<boolean>(false)
  const [newContainerName, setNewContainerName] = useState<string>('')
  const [newContainerImage, setNewContainerImage] = useState<string>('')
  // 新增容器后配置 CPU/内存 的独立弹窗
  const [cpuModalVisible, setCpuModalVisible] = useState<boolean>(false)
  const [pendingContainerKey, setPendingContainerKey] = useState<string | null>(null)
  const [cpuForm] = Form.useForm()
  // refs for resource rows inside Drawer to reliably scroll/focus
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  // 当打开抽屉时需要聚焦的新增资源 key
  const [, setFocusResourceKey] = useState<string | null>(null)

  // 资源变配卡片展开/收起状态
  const [resourceConfigExpanded, setResourceConfigExpanded] = useState<boolean>(true)

  // ==================== 服务相关 ====================
  // 服务详情 Drawer 状态
  const [serviceDrawerVisible, setServiceDrawerVisible] = useState<boolean>(false)
  const [selectedService, setSelectedService] = useState<Pod | null>(null)
  /** 底部抽屉展示的 Pod 事件所属行（故障时通过「查看日志」从视口下沿拉起，无需整页下滑） */
  const [podEventsPanelRecord, setPodEventsPanelRecord] = useState<Pod | null>(null)
  /** 底部事件抽屉内筛选（对齐控制台表头「类型/对象」下拉） */
  const [podEventTypeFilter, setPodEventTypeFilter] = useState<'all' | 'Normal' | 'Warning'>('all')
  const [podEventObjectFilter, setPodEventObjectFilter] = useState<string>('all')
  const [serviceListSearch, setServiceListSearch] = useState<string>('')
  const [aiDiagnoseModalOpen, setAiDiagnoseModalOpen] = useState<boolean>(false)
  const [aiDiagnosePod, setAiDiagnosePod] = useState<Pod | null>(null)
  const [aiDiagnoseMessages, setAiDiagnoseMessages] = useState<AiDiagnoseChatMessage[]>([])
  const [aiDiagnoseDraft, setAiDiagnoseDraft] = useState<string>('')
  const [aiDiagnoseSending, setAiDiagnoseSending] = useState<boolean>(false)
  const aiDiagnoseChatEndRef = useRef<HTMLDivElement | null>(null)

  const filteredPods = useMemo(() => {
    const q = serviceListSearch.trim().toLowerCase()
    if (!q) return MOCK_SERVICE_PODS
    return MOCK_SERVICE_PODS.filter(p => p.service.toLowerCase().includes(q))
  }, [serviceListSearch])

  const podEventObjectOptions = useMemo(() => {
    const kinds = new Set(podEventsPanelRecord?.podEvents?.map(e => e.objectKind) ?? [])
    return [{ label: '全部', value: 'all' }, ...[...kinds].sort().map(k => ({ label: k, value: k }))]
  }, [podEventsPanelRecord])

  const displayedPodEvents = useMemo(() => {
    const list = podEventsPanelRecord?.podEvents ?? []
    let rows = [...list]
    if (podEventTypeFilter !== 'all') {
      rows = rows.filter(r => r.eventType === podEventTypeFilter)
    }
    if (podEventObjectFilter !== 'all') {
      rows = rows.filter(r => r.objectKind === podEventObjectFilter)
    }
    return rows
  }, [podEventsPanelRecord, podEventTypeFilter, podEventObjectFilter])

  // 批量选择相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchActionModalVisible, setBatchActionModalVisible] = useState<boolean>(false)
  const [batchActionType, setBatchActionType] = useState<string>('')
  const [newGroupName, setNewGroupName] = useState<string>('')

  // ==================== 部署管理相关 ====================
  // 部署分组（用于展示分组列表）
  interface DeployGroup {
    key: string
    groupName: string
    note: string
    services: string[] | string
    imageVersion: string
    // 可选的分组层面配置，可能来自不同数据源
    graceful?: string
    exposePort?: number | string
  }

  const [deployGroups, _setDeployGroups] = useState<DeployGroup[]>([
    { key: 'g1', groupName: '默认', note: '基础分组', services: '1~3', imageVersion: 'integration-server:7.8.0-amd64', graceful: '5s', exposePort: 8080 },
    { key: 'g2', groupName: '灰度', note: '小流量灰度', services: '4~6', imageVersion: 'integration-server:7.6.0-amd64', graceful: '60s', exposePort: 8090 }
  ])

  const [deployDrawerVisible, setDeployDrawerVisible] = useState<boolean>(false)
  const [selectedGroup, setSelectedGroup] = useState<DeployGroup | null>(null)

  // 部署管理表格的 mock 数据与列定义
  const deployConfigs = [
    {
      key: 'd1',
      image: 'integration-server:7.8.0-amd64',
      envCount: 1,
      cmd: '未配置',
      ports: '8080',
      health: { type: 'httpGet', path: '/test', port: 8080, initialDelay: 300 },
      protocol: 'HTTP',
      mounts: 1,
      preStop: '未配置',
      graceful: '5s',
      externalPort: 8080
    }
  ]

  interface DeployConfig {
    key: string
    image: string
    envCount: number
    cmd: string
    ports: string
    health: { type: string; path: string; port: number; initialDelay: number }
    protocol: string
    mounts: number
    preStop: string
    graceful: string
    externalPort: number
  }


  // ==================== 文件下载相关 ====================
  const downloadInfo: DownloadInfo = {
    accessKeyId: 'LTAI5tEL*********U7dKm9R',
    secret: '6pwC81vC0F***********LV78KG2d0'
  }

  const servers: ServerItem[] = [
    { key: '2', name: 'Server2', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/2/' },
    { key: '3', name: 'Server3', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/3/' },
    { key: '4', name: 'Server4', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/4/' },
    { key: '5', name: 'Server5', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/5/' }
  ]

  // ==================== 插件相关 ====================
  // 插件相关数据和状态可以在这里定义

  // ==================== 函数定义区域 ====================
  
  // 基本信息相关函数
  // (基本信息主要是静态展示，无需特殊函数)

  // 高级配置相关函数
  const handleHpaSubmit = (values: HPAFormValues) => {
    console.log('HPA配置:', values)
    setHpaVisible(false)
  }

  // 资源变配相关函数
  // 将资源字符串解析为表单友好结构
  const parseResourcesForForm = (items: ResourceItem[]) => {
    return items.map(item => {
      // memory: e.g. "128 Mi"
      const memMatch = String(item.memory || '').match(/([\d.]+)\s*(\w+)/)
      const memoryNum = memMatch ? Number(memMatch[1]) : undefined
      const memoryUnit = memMatch ? memMatch[2] : 'Mi'

      // cpu: e.g. "0.1C" (只需要 base)，单位固定为 C
      const cpuMatch = String(item.cpu || '').match(/([\d.]+)C/) 
      const cpuBase = cpuMatch ? Number(cpuMatch[1]) : undefined
      const cpuUnit = 'C'

      return {
        key: item.key,
        container: item.container,
        image: item.image,
        memoryNum,
        memoryUnit,
        cpuBase,
        cpuUnit
      }
    });
  }

  // 表单中每一项的类型描述（用于从 Form.List 中读取值）
  interface ResourceFormItem {
    key: string
    container: string
    image: string
    memoryNum: number
    memoryUnit: string
    cpuBase: number
    cpuUnit: string
  }

  // 将表单值转换回资源字符串
  const buildResourcesFromForm = (vals: ResourceFormItem[]) : ResourceItem[] => {
    return vals.map(v => ({
      key: v.key,
      container: v.container,
      image: v.image,
      memory: `${v.memoryNum} ${v.memoryUnit}`,
      // 仅保留 base 值，单位为 C
      cpu: `${v.cpuBase}C`
    }))
  }

  // 打开编辑抽屉并填充表单
  const openEditDrawer = (focusKey?: string | null) => {
    // 填充表单并且确保容器名与镜像显示信息被设置为文本
    const initial = parseResourcesForForm(resources).map(item => ({
      ...item,
      // 将 container, image 直接放入对应字段以便只读展示
      container: item.container,
      image: item.image,
      // cpuUnit 固定为 C
      cpuUnit: item.cpuUnit || 'C'
    }))
    editForm.setFieldsValue({ resources: initial })
    // 记录需要聚焦的资源 key（可能为 undefined）
    setFocusResourceKey(focusKey || null)
    setDrawerVisible(true)

    // 延迟使用 refs 滚动并聚焦（等 Drawer 与表单渲染完成）
    if (focusKey) {
      setTimeout(() => {
        const el = rowRefs.current[focusKey]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // 尝试聚焦第一个可编辑 input（内存输入）
          const input = el.querySelector('input') as HTMLInputElement | null
          if (input) input.focus()
        }
        // 清理 focus key
        setFocusResourceKey(null)
      }, 400)
    }
  }

  // 打开镜像/容器管理弹窗
  const openImageModal = () => {
    // 可选镜像固定为业务需要的三类
    const availableImages = ['game', 'center', 'login']
    // 默认选择 game
    setNewContainerImage(availableImages[0])
    setNewContainerName('')
    setAddingContainer(false)
    setImageModalVisible(true)
  }

  // 在弹窗中新增容器并打开资源变配抽屉进行编辑
  const handleAddContainerConfirm = () => {
    if (!newContainerName || !newContainerImage) {
      Modal.warning({ title: '请填写容器名称并选择镜像' })
      return
    }
    const key = `c-${Date.now()}`
    const newItem: ResourceItem = {
      key,
      container: newContainerName,
      image: newContainerImage,
      cpu: '0.1C',
      memory: '128 Mi'
    }
    setResources(prev => [newItem, ...prev])
    setImageModalVisible(false)
    // 打开专用的 CPU/内存 配置弹窗（独立于资源变配抽屉）
    setPendingContainerKey(key)
    // 预填默认值在 cpuForm
    cpuForm.setFieldsValue({ cpuBase: 0.1, memoryNum: 128, memoryUnit: 'Mi' })
    setTimeout(() => setCpuModalVisible(true), 120)
  }

  // 保存编辑后的资源配置
  const handleSaveResources = async () => {
    try {
      const values = await editForm.validateFields()
      const list = values.resources || []
      const updated = buildResourcesFromForm(list)
      setResources(updated)
      setDrawerVisible(false)
    } catch {
      // 表单校验失败时不关闭抽屉
    }
  }

  // 服务相关函数
  // (服务相关的函数主要是表格操作，在表格定义中内联)

  // 服务批量操作函数
  // 处理批量操作
  const handleBatchAction = (actionType: string) => {
    if (selectedRowKeys.length === 0) {
      Modal.warning({
        title: '提示',
        content: '请先选择要操作的服务'
      })
      return
    }
    setBatchActionType(actionType)
    if (actionType === '新建分组') {
      setNewGroupName('')
    }
    setBatchActionModalVisible(true)
  }

  // 确认批量操作
  const confirmBatchAction = () => {
    console.log('批量操作:', batchActionType, '选中的服务:', selectedRowKeys)
    if (batchActionType === '新建分组' && newGroupName) {
      console.log('新建分组:', newGroupName)
    }
    setBatchActionModalVisible(false)
    setSelectedRowKeys([])
    setNewGroupName('')
  }

  // 部署管理相关函数
  // (部署管理相关的函数在需要时定义)

  // 文件相关函数
  // (文件相关的函数在需要时定义)

  // 插件相关函数
  // (插件相关的函数在需要时定义)

  // ==================== 表格列定义区域 ====================

  /** 打开底部 Pod 事件抽屉（列表「查看事件」） */
  const openPodEventsFromRow = (record: Pod) => {
    setPodEventTypeFilter('all')
    setPodEventObjectFilter('all')
    setPodEventsPanelRecord(record)
  }

  const openAiDiagnose = (record: Pod) => {
    setAiDiagnosePod(record)
    setAiDiagnoseDraft('')
    setAiDiagnoseSending(false)
    setAiDiagnoseMessages([
      {
        id: `seed-${Date.now()}`,
        role: 'assistant',
        content: `【${record.service}】根据当前 Pod 快照的初步诊断：\n\n${buildMockAiDiagnosisText(record)}`
      }
    ])
    setAiDiagnoseModalOpen(true)
  }

  const sendAiDiagnoseUserMessage = () => {
    const text = aiDiagnoseDraft.trim()
    const pod = aiDiagnosePod
    if (!text || !pod || aiDiagnoseSending) return
    const userId = `u-${Date.now()}`
    setAiDiagnoseMessages(prev => [...prev, { id: userId, role: 'user', content: text }])
    setAiDiagnoseDraft('')
    setAiDiagnoseSending(true)
    window.setTimeout(() => {
      const reply = mockAiFollowUpReply(text, pod)
      setAiDiagnoseMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }])
      setAiDiagnoseSending(false)
    }, 480)
  }

  useEffect(() => {
    if (!aiDiagnoseModalOpen) return
    aiDiagnoseChatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [aiDiagnoseModalOpen, aiDiagnoseMessages, aiDiagnoseSending])

  // 资源变配表格列定义
  const resourceColumns: ColumnsType<ResourceItem> = [
    { title: '容器', dataIndex: 'container', key: 'container' },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
      render: (val: string) => {
        if (!val) return null
        const m = String(val).match(/(.*?)(可突发至.*)/)
        if (m) {
          const base = (m[1] || '').trim()
          const burst = (m[2] || '').trim()
          return (
            <div>
              <span>{base} <span style={{ color: '#f1c40f' }}>{burst}</span></span>
            </div>
          )
        }
        return <div>{val}</div>
      }
    },
    { title: '内存', dataIndex: 'memory', key: 'memory' }
  ]

  // Pod 事件表列（对齐 ACK 控制台「事件」Tab：类型 / 对象 / 信息 / 内容 / 时间 + 智能诊断）
  const podEventColumns: ColumnsType<K8sPodEventRow> = [
    {
      title: '类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 108,
      render: (t: 'Normal' | 'Warning') => (
        <Tag
          color={t === 'Warning' ? 'gold' : 'green'}
          bordered={false}
          style={{ borderRadius: 9999, fontWeight: t === 'Warning' ? 600 : undefined }}
        >
          {t}
        </Tag>
      )
    },
    {
      title: '对象',
      key: 'object',
      width: 280,
      ellipsis: true,
      render: (_: unknown, r: K8sPodEventRow) => (
        <Text code style={{ fontSize: 12, background: 'transparent' }}>
          {r.objectKind} {r.objectName}
        </Text>
      )
    },
    {
      title: '信息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg: string, record: K8sPodEventRow) => (
        <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, maxWidth: '100%' }}>
          <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{msg}</span>
          {record.eventType === 'Warning' && <WarningOutlined style={{ color: '#faad14', flexShrink: 0, marginTop: 2 }} />}
        </span>
      )
    },
    { title: '内容', dataIndex: 'reason', key: 'reason', width: 132, ellipsis: true },
    { title: '时间', dataIndex: 'time', key: 'time', width: 172 },
    {
      title: ' ',
      key: 'diag',
      width: 112,
      render: (_: unknown, record: K8sPodEventRow) =>
        record.eventType === 'Warning' ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontSize: 12 }}
            onClick={() => {
              if (podEventsPanelRecord) openAiDiagnose(podEventsPanelRecord)
            }}
          >
            智能诊断
          </Button>
        ) : null
    }
  ]

  // 服务表格列定义
  const podColumns: ColumnsType<Pod> = [
    { 
      title: '服务名称', 
      dataIndex: 'service', 
      key: 'service',
      render: (text: string, record: Pod) => (
        <Button 
          type="link" 
          onClick={() => {
            setSelectedService(record)
            setServiceDrawerVisible(true)
          }}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      )
    },
    { title: '分组名称', dataIndex: 'group', key: 'group' },
    { title: '开服时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '更新时间', dataIndex: 'updatedTime', key: 'updatedTime' },
    { title: '策略', dataIndex: 'policy', key: 'policy' },
    { 
      title: '资源', 
      dataIndex: 'resources', 
      key: 'resources',
      render: (val: string) => {
        if (!val) return null
        // 尝试按"推荐值"分割，优先展示推荐值在下，实际值在上
        const m = val.match(/(.*?)\s*推荐值[:：]\s*(.*)/)
        if (m) {
          const actual = (m[1] || '').trim()
          const rec = (m[2] || '').trim()
          return (
            <div>
              <div style={{ marginTop: 6 }}>{actual}</div>
              <div style={{ color: '#74b9ff', fontSize: 12 }}>推荐值：{rec}</div>
            </div>
          )
        }
        // 如果没有匹配到推荐值关键字，按空格拆分换行展示
        const parts = String(val).split(/\s+/)
        if (parts.length > 1) {
          return (
            <div>
              {parts.map((p, i) => (
                <div key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>{p}</div>
              ))}
            </div>
          )
        }
        return <div>{val}</div>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 300,
      render: (_val: string, record: Pod) => {
        const conditions = record.podConditions ?? []
        const phaseLabel = record.k8sPhaseLabel ?? (record.status === '正常' ? 'Running' : '异常')
        const notReady = conditions.some(
          c => (c.type === 'Ready' || c.type === 'ContainersReady') && c.status === 'False'
        )
        // 对齐 ACK：Running 但未 Ready 用橙色；全就绪用绿色
        const accent =
          record.status === '正常' && !notReady ? '#52c41a' : '#fa8c16'
        const restarts = record.restartCount ?? 0

        const popoverBody = (
          <div style={{ maxWidth: 360 }}>
            {conditions.length > 0 ? (
              conditions.map(row => (
                <div key={row.type} style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(0,0,0,0.88)' }}>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
                    {row.type}:{' '}
                  </span>
                  <span
                    style={{
                      color: row.status === 'False' ? '#cf1322' : row.status === 'True' ? 'rgba(0,0,0,0.88)' : '#d48806'
                    }}
                  >
                    {row.status}
                  </span>
                </div>
              ))
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>暂无 Pod Conditions（Mock）</Text>
            )}
            {record.containerStatus && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  容器状态（stateReason / stateMessage）
                </Text>
                <Text style={{ fontSize: 12, wordBreak: 'break-all' }}>
                  {record.containerStatus.stateReason}
                  {record.containerStatus.containerName ? `（${record.containerStatus.containerName}）` : ''}：{' '}
                  {record.containerStatus.stateMessage}
                </Text>
              </div>
            )}
            <Divider style={{ margin: '12px 0 8px' }} />
          </div>
        )

        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: accent,
                    flexShrink: 0
                  }}
                />
                <span style={{ color: accent, fontWeight: 500, fontSize: 14 }}>{phaseLabel}</span>
                <Popover
                  placement="bottomLeft"
                  trigger="click"
                  zIndex={1100}
                  content={popoverBody}
                >
                  <InfoCircleOutlined
                    role="button"
                    aria-label="Pod 条件"
                    style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }}
                  />
                </Popover>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 2 }}>
                <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => openPodEventsFromRow(record)}>
                  查看事件
                </Button>
                <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => openAiDiagnose(record)}>
                  智能诊断
                </Button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1677ff', fontSize: 13, flexShrink: 0 }}>
              <LineChartOutlined />
              <span>{restarts}</span>
            </div>
          </div>
        )
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: () => (
          <Space>
          <Button type="link" onClick={() => openEditDrawer()}>编辑</Button>
          <Button type="link">重启</Button>
            <Dropdown
              menu={{
                items: [
                  { key: '1', label: '停止' },
                  { key: '2', label: '删除' }
                ]
              }}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      }
  ]

  // 部署分组表格列定义
  const groupColumns: ColumnsType<DeployGroup> = [
    { title: '分组名称', dataIndex: 'groupName', key: 'groupName' },
    { title: '备注', dataIndex: 'note', key: 'note' },
    { title: '服务', dataIndex: 'services', key: 'services' },
    { title: '镜像版本', dataIndex: 'imageVersion', key: 'imageVersion' },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: DeployGroup) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => {
              setSelectedGroup(record)
              setDeployDrawerVisible(true)
            }}
          >
            详情
          </Button>
          <Button type="link">编辑</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      )
    }
  ]

  // 部署配置表格列定义
  const deployColumns: ColumnsType<DeployConfig> = [
    { title: '镜像', dataIndex: 'image', key: 'image' },
    { title: '环境变量', dataIndex: 'envCount', key: 'envCount', render: (val: number) => `${val}个` },
    { title: '启动命令', dataIndex: 'cmd', key: 'cmd' },
    { title: '端口', dataIndex: 'ports', key: 'ports' },
    { 
      title: '健康检查', 
      dataIndex: 'health', 
      key: 'health',
      render: (val: { type: string; path: string; port: number; initialDelay: number }) => `${val.type}:${val.path}:${val.port}` 
    },
    { title: '协议', dataIndex: 'protocol', key: 'protocol' },
    { title: '挂载', dataIndex: 'mounts', key: 'mounts', render: (val: number) => `${val}个` },
    { title: '停止前命令', dataIndex: 'preStop', key: 'preStop' },
    { title: '优雅停机', dataIndex: 'graceful', key: 'graceful' },
    { title: '对外端口', dataIndex: 'externalPort', key: 'externalPort' }
  ]


  // ==================== 页面渲染区域 ====================
  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作按钮 */}
          <div style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Title level={3} style={{ margin: 0 }}>{name}</Title>
              {appTags.map(t => (
            <Tag key={t} color={t === '游服' ? '#fa8c16' : '#1890ff'}  style={{ marginLeft: 0 }}>{t}</Tag>
              ))}
            </div>

            <Space wrap>
              <Button>登入pod</Button>
              <Button type="primary">更新部署</Button>
            </Space>
          </div>

      {/* 标签页 */}
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'overview', label: '总览' },
          { key: 'deploy', label: '部署管理' },
          { key: 'download', label: '文件下载' },
          { key: 'plugins', label: '插件' }
        ]}
      />

      {/* 标签页内容 */}
      {activeKey === 'overview' ? (
        <div>
          {/* 基本信息 Card */}
          <Card >
            <Row gutter={[48, 24]}>
              <Col xs={24} sm={12} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>别名</div>
                  <div style={{ fontSize: 14 }}>测试</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>规格</div>
                  <div style={{ fontSize: 14 }}>多服务APP</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>容器</div>
                  <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {resources.map(r => {
                      const parts = String(r.image || '').split(':')
                      const version = parts.length > 1 ? parts[1] : 'latest'
                      return (
                        <Tag key={r.key} color="green"  style={{ marginBottom: 4 }}>{`${r.container}:${version}`}</Tag>
                      )
                    })}
                    <Button type="text" icon={<EditOutlined />} onClick={openImageModal} title="管理容器" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>标签</div>
                  <div style={{fontSize: 14, overflow: 'hidden' }}>
                    <Tag color="blue"  style={{ marginRight: 4 }}>gamedemo_efwe:wef</Tag>
                    <Tag color="blue"  style={{ marginRight: 4 }}>key:value</Tag>
                  </div>
                </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>名称</div>
                  <div style={{ fontSize: 14 }}>{name}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>部署方式</div>
                  <div style={{ fontSize: 14 }}>停服更新</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>私网</div>
                  <div style={{ fontSize: 14, fontFamily: 'Monaco, monospace' }}>http://master$SERVER_ID:[$PORT]</div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
              <div style={{ marginBottom: 16 }}>                              
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>状态</div>
                  <div><Tag color="green" >operable</Tag></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>日志</div>
                  <div style={{ fontSize: 14, fontFamily: 'Monaco, monospace' }}>前往grafana查看</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>公网</div>
                  <div style={{ fontSize: 14 }}>未配置</div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* 高级配置 Card */}
          <Card 
            title="更多高级配置" 
            style={{ marginBottom: 24 }}
            styles={{ body: { padding: advancedConfigExpanded ? 24 : 0 } }}
            extra={
              <Button 
                type="text" 
                icon={advancedConfigExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setAdvancedConfigExpanded(!advancedConfigExpanded)}
                size="small"
              />
            }
          >
            {advancedConfigExpanded && (
              <div style={{ fontSize: 14, color: '#333' }}>
                <strong>HPA 弹性伸缩：</strong>
                <Button 
                  type="text" 
                  icon={<EditOutlined />}
                  size="small" 
                  style={{ padding: 0, height: 'auto', fontSize: 14 }}
                  onClick={() => setHpaVisible(true)}
                >
                </Button>
              </div>
            )}
          </Card>

          {/* 资源变配 Card */}
          <Card 
            title="下次开服资源配置" 
            extra={
                        <Space>
                <Button size="small" style={{ fontSize: 14 }} icon={<EditOutlined />} onClick={() => openEditDrawer()}>编辑</Button>
                <Button 
                  type="text" 
                  icon={resourceConfigExpanded ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setResourceConfigExpanded(!resourceConfigExpanded)}
                  size="small"
                />
                        </Space>
            }
            style={{ marginBottom: 24 }}
            styles={{ body: { padding: resourceConfigExpanded ? 24 : 0 } }}
          >
            {resourceConfigExpanded && (
              <Table columns={resourceColumns} dataSource={resources} pagination={false} />
            )}
          </Card>

          {/* 服务 Card */}
          <Card 
            title="服务"
            extra={
              <Dropdown
                menu={{
                  items: [
                    { key: 'edit', label: '编辑' },
                    { key: 'start', label: '启动' },
                    { key: 'restart', label: '重启' },
                    { key: 'stop', label: '停止' },
                    { type: 'divider' },
                    { key: 'joinGroup', label: '加入分组' },
                    { key: 'newGroup', label: '新建分组' }
                  ],
                  onClick: ({ key }) => {
                    const actionMap: Record<string, string> = {
                      edit: '编辑',
                      start: '启动',
                      restart: '重启',
                      stop: '停止',
                      joinGroup: '加入分组',
                      newGroup: '新建分组'
                    }
                    handleBatchAction(actionMap[key])
                  }
                }}
                disabled={selectedRowKeys.length === 0}
              >
                <Button>
                  批量操作 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
                </Button>
              </Dropdown>
            }
          >
            <Input.Search
              allowClear
              placeholder="搜索服务名称"
              value={serviceListSearch}
              onChange={e => setServiceListSearch(e.target.value)}
              style={{ maxWidth: 280, marginBottom: 12 }}
            />
            <Table
              columns={podColumns}
              dataSource={filteredPods}
              pagination={false}
              scroll={{ x: 1100 }}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
              }}
            />
          </Card>

            {/* 批量操作 Modal */}
            <Modal
              title={`${batchActionType}`}
              open={batchActionModalVisible}
              onCancel={() => {
                setBatchActionModalVisible(false)
                setNewGroupName('')
              }}
              onOk={confirmBatchAction}
              okText="确认"
              cancelText="取消"
            >
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  已选择 <strong>{selectedRowKeys.length}</strong> 个服务：
                  <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>
                    {selectedRowKeys.map((key, index) => {
                      const pod = MOCK_SERVICE_PODS.find(p => p.key === key)
                      // 从服务名称中提取数字，如 'game1' -> '1'
                      const serviceNumber = pod?.service.match(/\d+/)?.[0] || key
                      return (
                        <span key={key}>
                          {index > 0 && '、'}
                          {serviceNumber}
                        </span>
                      )
                    })}
                  </span>
                </div>
              </div>
              
              {batchActionType === '新建分组' && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 8 }}>分组名称：</div>
                  <Input 
                    placeholder="请输入分组名称"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
              )}
              
              {batchActionType === '加入分组' && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 8 }}>选择分组：</div>
                  <Select 
                    style={{ width: '100%' }}
                    placeholder="请选择要加入的分组"
                    options={deployGroups.map(g => ({ label: g.groupName, value: g.key }))}
                  />
                </div>
              )}
              
              {['编辑', '启动', '重启', '停止'].includes(batchActionType) && (
                <div style={{ marginTop: 16, color: '#666' }}>
                  确认要对选中的 {selectedRowKeys.length} 个服务执行 <strong>{batchActionType}</strong> 操作吗？
                </div>
              )}
            </Modal>
            </div>
      ) : activeKey === 'deploy' ? (
        <DeploymentRecords
          deployGroups={deployGroups}
          deployConfigs={deployConfigs}
          onCreateGroup={() => console.log('创建新分组')}
        />
      ) : activeKey === 'download' ? (
        <FileDownload
          downloadInfo={downloadInfo}
          servers={servers}
          onViewCLI={() => console.log('查看CLI参考')}
          onCopyText={(text) => console.log('复制文本:', text)}
        />
      ) : activeKey === 'plugins' ? (
                  <div>
          <Title level={4}>插件管理</Title>
              <Card>
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无插件数据
                  </div>
              </Card>
            </div>
          ) : null}

      {/* ==================== 弹窗和抽屉区域 ==================== */}
      
      {/* HPA 配置弹窗 */}
      <HPAConfigModal
        open={hpaVisible}
        onCancel={() => setHpaVisible(false)}
        onOk={handleHpaSubmit}
        form={hpaForm}
        initialValues={{
          enabled: false,
          defaultReplicas: 1,
          minReplicas: 1,
          maxReplicas: 10,
          cpuEnabled: false,
          cpuTargetValue: 70,
          memEnabled: false,
          memTargetValue: 70,
          scaleInWait: 300,
          scaleOutWait: 60
        }}
      />

      {/* 资源变配编辑抽屉 */}
            <Drawer
        title="编辑下次开服资源配置"
        width={600}
              open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
              footer={
          <div style={{ textAlign: 'left' }}>
                  <Space>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleSaveResources}>保存</Button>
                  </Space>
                </div>
              }
            >
              <Form form={editForm} layout="vertical">
                <Form.List name="resources">
                  {(fields) => (
                    <div>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ marginBottom: 24, padding: 16, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                    <div style={{ marginBottom: 16 }}>
                      <Form.Item noStyle name={[name, 'container']}>
                        <Input style={{ display: 'none' }} />
                            </Form.Item>
                      <div style={{ fontSize: 14, color: '#333' }}>
                        <strong>容器名称：</strong>
                        <span>{editForm.getFieldValue(['resources', name, 'container'])}</span>
                          </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <Form.Item noStyle name={[name, 'image']}>
                        <Input style={{ display: 'none' }} />
                            </Form.Item>
                      <div style={{ fontSize: 14, color: '#333' }}>
                        <strong>镜像：</strong>
                        <span>{editForm.getFieldValue(['resources', name, 'image'])}</span>
                          </div>
                    </div>
                    {/* 内存 */}
                    <Form.Item
                      {...restField}
                      label={<span><span style={{ color: '#ff4d4f' }}>* </span>内存</span>}
                      required={false}
                      style={{ marginBottom: 8 }}
                    >
                      <Space.Compact style={{ width: '100%' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'memoryNum']}
                          noStyle
                          rules={[{ required: true, message: '请输入内存大小' }]}
                        >
                          <InputNumber min={1} placeholder="385" style={{ flex: 1 }} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'memoryUnit']}
                          noStyle
                          initialValue="Mi"
                        >
                          <Select style={{ width: 100 }}>
                            <Select.Option value="Mi">Mi</Select.Option>
                            <Select.Option value="Gi">Gi</Select.Option>
                          </Select>
                        </Form.Item>
                      </Space.Compact>
                    </Form.Item>
                    <div style={{ marginBottom: 16, fontSize: 13, color: '#faad14' }}>
                      检测到内存偏离推荐值，建议将内存调整为960Mi
                    </div>

                    {/* CPU */}
                    <Form.Item
                      {...restField}
                      label={<span><span style={{ color: '#ff4d4f' }}>* </span>CPU</span>}
                      required={false}
                      style={{ marginBottom: 8 }}
                    >
                      <Space.Compact style={{ width: '100%' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'cpuBase']}
                          noStyle
                          rules={[{ required: true, message: '请输入CPU配置' }]}
                        >
                          <InputNumber min={0.001} step={0.001} placeholder="0.1" style={{ flex: 1 }} />
                        </Form.Item>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0 11px', 
                          border: '1px solid #d9d9d9',
                          borderLeft: 'none',
                          backgroundColor: '#fafafa',
                          color: 'rgba(0, 0, 0, 0.45)'
                        }}>
                          可突发至0.4C
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0 11px', 
                          border: '1px solid #d9d9d9',
                          borderLeft: 'none',
                          backgroundColor: '#fff',
                          color: 'rgba(0, 0, 0, 0.88)'
                        }}>
                          C
                        </div>
                      </Space.Compact>
                    </Form.Item>
                    <div style={{ marginBottom: 16, fontSize: 13, color: '#faad14' }}>
                      检测到CPU偏离推荐值，建议将CPU调整为0.08C
                    </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </Form>
            </Drawer>

      {/* 镜像/容器管理弹窗 */}
            <Modal
              title="管理容器"
              open={imageModalVisible}
              onCancel={() => setImageModalVisible(false)}
        footer={null}
        width={600}
            >
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>当前容器</Title>
                  {resources.map(r => (
            <Tag key={r.key} style={{ marginRight: 8, marginBottom: 8 }}>
              {r.container}:{r.image}
            </Tag>
          ))}
        </div>
        
        <Divider />
        
        <div>
          <Title level={5}>添加新容器</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Input
                placeholder="容器名称"
                value={newContainerName}
                onChange={(e) => setNewContainerName(e.target.value)}
              />
            </Col>
            <Col span={12}>
                      <Select
                style={{ width: '100%' }}
                placeholder="选择镜像"
                        value={newContainerImage}
                onChange={setNewContainerImage}
              >
                <Select.Option value="game">game</Select.Option>
                <Select.Option value="center">center</Select.Option>
                <Select.Option value="login">login</Select.Option>
              </Select>
            </Col>
          </Row>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setImageModalVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleAddContainerConfirm}>添加</Button>
            </Space>
                </div>
              </div>
            </Modal>

      {/* CPU/内存配置弹窗 */}
            <Modal
              title="配置新容器资源"
              open={cpuModalVisible}
        onCancel={() => setCpuModalVisible(false)}
              onOk={() => {
          cpuForm.validateFields().then(values => {
            if (pendingContainerKey) {
              setResources(prev => prev.map(item => 
                item.key === pendingContainerKey 
                  ? { ...item, cpu: `${values.cpuBase}C`, memory: `${values.memoryNum} ${values.memoryUnit}` }
                  : item
              ))
            }
                    setCpuModalVisible(false)
                    setPendingContainerKey(null)
                  })
              }}
            >
              <Form form={cpuForm} layout="vertical">
          <Form.Item
            name="cpuBase"
            label="CPU (C)"
            rules={[{ required: true, message: '请输入CPU配置' }]}
          >
                  <InputNumber min={0.001} step={0.001} style={{ width: '100%' }} />
                </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="memoryNum"
                label="内存"
                rules={[{ required: true, message: '请输入内存大小' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="memoryUnit"
                label="单位"
                initialValue="Mi"
              >
                <Select>
                  <Select.Option value="Mi">Mi</Select.Option>
                  <Select.Option value="Gi">Gi</Select.Option>
                </Select>
                  </Form.Item>
            </Col>
          </Row>
              </Form>
            </Modal>

      {/* 服务详情 Drawer */}
      <Drawer
        title={`${selectedService?.service}-服务`}
        width={800}
        open={serviceDrawerVisible}
        onClose={() => {
          setServiceDrawerVisible(false)
          setSelectedService(null)
        }}
        destroyOnClose
      >
        {selectedService && (
          <div>
            <Card>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '16px 0' }}>
                      <Table
                        rowKey="key"
                        size="small"
                        pagination={false}
                        columns={[
                          { title: '容器名', dataIndex: 'container', key: 'container', width: 100 },
                          { title: '镜像', dataIndex: 'image', key: 'image', width: 200 },
                          { 
                            title: '资源', 
                            dataIndex: 'resources', 
                            key: 'resources',
                            render: (val: string) => (
                              <div>
                                <div>0.004C/128Mi</div>
                                <div style={{ color: '#74b9ff', fontSize: 12 }}>推荐值：0.002C/64Mi</div>
    </div>
  )
                          },
                          { 
                            title: '状态', 
                            dataIndex: 'status', 
                            key: 'status', 
                            width: 100,
                            render: () => <Tag color="green" >正常</Tag>
                          },
                          { 
                            title: '操作', 
                            key: 'actions', 
                            width: 100,
                            render: () => (
                              <Button type="link" size="small">登入</Button>
                            )
                          }
                        ]}
                        dataSource={[
                          {
                            key: 'container-1',
                            container: 'server',
                            image: 'game-server:3.1.8081-amd64',
                            resources: '0.004C/128Mi',
                            status: '正常'
                          }
                        ]}
                      />
                    </div>
                  ),
                  rowExpandable: () => true,
                }}
                columns={[
                  { title: 'Pod名称', dataIndex: 'podName', key: 'podName' },
                  { 
                    title: '资源', 
                    dataIndex: 'resources', 
                    key: 'resources',
                    render: (val: string) => (
                      <div>
                        <div>0.004C/128Mi</div>
                        <div style={{ color: '#74b9ff', fontSize: 12 }}>推荐值：0.002C/64Mi</div>
                      </div>
                    )
                  },
                  { 
                    title: '状态', 
                    dataIndex: 'status', 
                    key: 'status',
                    render: (val: string) => {
                      const color = val === '正常' ? 'green' : val === '故障' ? 'red' : 'orange'
                      return (
                        <div>
                          <Tag color={color} >{val}</Tag>
                          {val === '故障' && (
                            <div style={{ marginTop: 4 }}>
                              <Button 
                                type="link" 
                                size="small" 
                                style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                onClick={() => window.alert('原型：查看日志功能')}
                              >
                                查看日志
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    }
                  },
                  { 
                    title: '操作', 
                    key: 'actions',
                    render: () => (
                      <Button type="link" danger size="small">删除</Button>
                    )
                  }
                ]}
                dataSource={[
                  {
                    key: 'pod-1',
                    podName: `${selectedService.service}-6648d5cbf6-6k95p`,
                    resources: selectedService.resources,
                    status: selectedService.status
                  },
                  {
                    key: 'pod-2', 
                    podName: `${selectedService.service}-6648d5cbf6-qwcfn`,
                    resources: selectedService.resources,
                    status: selectedService.status === '故障' ? '故障' : '正常'
                  }
                ]}
              />
            </Card>
          </div>
        )}
      </Drawer>

      {/* AI 智能诊断：根据当前行 Pod Mock 数据生成原因与建议（未接真实 LLM） */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#722ed1' }} />
            <span>AI 智能诊断</span>
            {aiDiagnosePod ? (
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                {aiDiagnosePod.service}
              </Text>
            ) : null}
          </Space>
        }
        open={aiDiagnoseModalOpen}
        onCancel={() => {
          setAiDiagnoseModalOpen(false)
          setAiDiagnosePod(null)
          setAiDiagnoseMessages([])
          setAiDiagnoseDraft('')
          setAiDiagnoseSending(false)
        }}
        footer={
          <Space>
            <Button
              onClick={() => {
                if (aiDiagnosePod) {
                  setAiDiagnoseMessages([
                    {
                      id: `seed-${Date.now()}`,
                      role: 'assistant',
                      content: `【${aiDiagnosePod.service}】根据当前 Pod 快照的初步诊断：\n\n${buildMockAiDiagnosisText(aiDiagnosePod)}`
                    }
                  ])
                }
              }}
              disabled={!aiDiagnosePod}
            >
              关闭
            </Button>
          </Space>
        }
        width={720}
        styles={{ body: { paddingTop: 8, maxHeight: 'min(78vh, 720px)', display: 'flex', flexDirection: 'column' } }}
        destroyOnClose
      >
        {aiDiagnosePod && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                minHeight: 280,
                maxHeight: 'min(52vh, 480px)',
                overflowY: 'auto',
                paddingRight: 4,
                marginBottom: 12
              }}
            >
              {aiDiagnoseMessages.map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 12
                  }}
                >
                  <div
                    style={{
                      maxWidth: '88%',
                      background:
                        m.role === 'user'
                          ? '#e6f4ff'
                          : 'linear-gradient(135deg, #faf5ff 0%, #f9f0ff 100%)',
                      border: m.role === 'user' ? '1px solid #91caff' : '1px solid #d3adf7',
                      padding: '10px 14px',
                      borderRadius: 12,
                      fontSize: 13,
                      lineHeight: 1.75,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: 'rgba(0,0,0,0.88)'
                    }}
                  >
                    {m.role === 'assistant' && (
                      <Space size={6} style={{ marginBottom: 6 }}>
                        <RobotOutlined style={{ color: '#722ed1' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          助手
                        </Text>
                      </Space>
                    )}
                    {m.role === 'user' && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        你
                      </Text>
                    )}
                    <div>{m.content}</div>
                  </div>
                </div>
              ))}
              {aiDiagnoseSending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                  <Space style={{ color: '#722ed1' }}>
                    <Spin size="small" />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      正在生成回复…
                    </Text>
                  </Space>
                </div>
              )}
              <div ref={aiDiagnoseChatEndRef} />
            </div>
            <Divider style={{ margin: '0 0 12px' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Input.TextArea
                style={{ flex: 1 }}
                value={aiDiagnoseDraft}
                onChange={e => setAiDiagnoseDraft(e.target.value)}
                placeholder="补充现象或提问，例如：探针一直失败怎么办？"
                autoSize={{ minRows: 2, maxRows: 5 }}
                disabled={aiDiagnoseSending}
                onPressEnter={e => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    sendAiDiagnoseUserMessage()
                  }
                }}
              />
              <Button
                type="primary"
                onClick={sendAiDiagnoseUserMessage}
                disabled={!aiDiagnoseDraft.trim() || aiDiagnoseSending}
                style={{ minWidth: 88, marginBottom: 2 }}
              >
                发送
              </Button>
            </div>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Enter 发送，Shift+Enter 换行。回复为前端规则 Mock，未调用真实大模型 API。
            </Text>
          </div>
        )}
      </Modal>

      {/* Pod 事件：从视口底部拉起，避免插在卡片内导致需整页下滑才能看到 */}
      <Drawer
        title={
          <Space>
            <Text strong>事件</Text>
            {podEventsPanelRecord ? (
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                {podEventsPanelRecord.service}
              </Text>
            ) : null}
          </Space>
        }
        placement="bottom"
        height="58vh"
        open={Boolean(podEventsPanelRecord)}
        onClose={() => setPodEventsPanelRecord(null)}
        destroyOnClose
        styles={{ body: { paddingTop: 8 } }}
      >
        {podEventsPanelRecord && (
          <div>
            <Space wrap size={[12, 8]} style={{ marginBottom: 12 }}>
              <Space size={6} align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  类型
                </Text>
                <Select<'all' | 'Normal' | 'Warning'>
                  value={podEventTypeFilter}
                  onChange={v => setPodEventTypeFilter(v)}
                  style={{ width: 128 }}
                  options={[
                    { label: '全部', value: 'all' },
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Warning', value: 'Warning' }
                  ]}
                />
              </Space>
              
            </Space>
            <Table<K8sPodEventRow>
              size="small"
              rowKey="key"
              columns={podEventColumns}
              dataSource={displayedPodEvents}
              pagination={false}
              scroll={{ x: 1100, y: 'min(360px, 42vh)' }}
              locale={{ emptyText: '暂无事件' }}
              onRow={record => ({
                style: record.eventType === 'Warning' ? { background: 'rgba(250, 173, 20, 0.1)' } : undefined
              })}
            />
          </div>
        )}
      </Drawer>

      {/* 部署分组详情 Drawer */}
      <Drawer
        title={`分组详情 - ${selectedGroup?.groupName}`}
        width={800}
        open={deployDrawerVisible}
        onClose={() => {
          setDeployDrawerVisible(false)
          setSelectedGroup(null)
        }}
        destroyOnClose
      >
        {selectedGroup && (
          <div>
            <Card title="分组信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>分组名称:</strong> {selectedGroup.groupName}</div>
                  <div><strong>备注:</strong> {selectedGroup.note}</div>
                </Col>
                <Col span={12}>
                  <div><strong>服务:</strong> {selectedGroup.services}</div>
                  <div><strong>镜像版本:</strong> {selectedGroup.imageVersion}</div>
                </Col>
              </Row>
            </Card>
            <Card title="部署配置">
              <Table
                columns={deployColumns}
                dataSource={deployConfigs}
                pagination={false}
              />
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  )
}