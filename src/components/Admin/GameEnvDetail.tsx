'use client'

/**
 * 这段代码实现了「按 appId 查看/配置测试&生产环境的初始化配置、限额配置和开服失败配置」的详情页，
 * 使用了 Ant Design 的 Tabs、Card、Form 等组件，并基于 ResourceConfiguration 中的限额字段。
 */

import React, { useState } from 'react'
import {
  Card,
  Collapse,
  Descriptions,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Tag,
  Tabs,
  message,
  Modal,
  Checkbox,
  Input,
  Radio,
  Select,
  Row,
  Col
} from 'antd'
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudServerOutlined,
  RadarChartOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

// 自动开服模版步骤配置（用于展示和勾选）
const autoLaunchStepOptions: { key: string; label: string }[] = [
  { key: 'strategy', label: '配置开服策略' },
  { key: 'monitor', label: '开启默认监控' },
  { key: 'notify', label: '发送部署通知' },
  { key: 'reserve', label: '新建预备服' }
]

// Lambda 模板步骤（用于可视化 & 勾选）
type LambdaStepKey = 'zipSlip' | 'filter' | 'symlink' | 'pathCheck'

const lambdaStepOptions: { key: LambdaStepKey; title: string; desc: string }[] = [
  {
    key: 'zipSlip',
    title: '防止路径穿越 (Zip-Slip)',
    desc: '拒绝包含 .. 的路径，保证解压后文件不会逃出目标目录。'
  },
  {
    key: 'filter',
    title: '过滤无关文件',
    desc: '通过 should_skip_member 规则跳过不需要的文件，只保留版本相关内容。'
  },
  {
    key: 'symlink',
    title: '拒绝软链接文件',
    desc: '检测 zip 条目是否为 symlink，如是则报错，防止利用符号链接攻击。'
  },
  {
    key: 'pathCheck',
    title: '真实路径校验',
    desc: '使用 realpath 校验最终落盘路径必须在 dest_dir 之下，防止任意路径写入。'
  }
]

// 客户端版本文件 Lambda 模板源码（只读展示用）
const lambdaTemplateSource = `for zi in zf.infolist():
    # 防 zip slip: 拒绝 .. 段
    raw_name = zi.filename
    parts = [p for p in name.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        raise ValueError(f"zip-slip detected: {raw_name}")

    # 过滤不要的
    normalized_name = "/".join(parts)
    if should_skip_member(normalized_name):
        logger.info("Skip zip member: %s", raw_name)
        continue

    # 拒绝 symlink
    if is_symlink(zi):
        raise ValueError(f"symlink in zip is not allowed: {raw_name}")

    target_path = os.path.join(dest_dir, *parts)

    # 最终路径落在 dest_dir 下
    real_dest = os.path.realpath(dest_dir)
    real_target = os.path.realpath(target_path)
    if not (real_target == real_dest or real_target.startswith(real_dest + os.sep)):
        raise ValueError(f"path escapes dest dir: {raw_name}")`

// 环境枚举类型
type EnvKey = 'test' | 'prod'

// 实例规格选项（MySQL/Mongo/Zookeeper：CPU+内存）
const INSTANCE_SPEC_OPTIONS = [
  { value: '2核4G', label: '2核4G' },
  { value: '2核8G', label: '2核8G' },
  { value: '4核8G', label: '4核8G' },
  { value: '8核16G', label: '8核16G' },
  { value: '16核32G', label: '16核32G' }
]

// Redis 规格（内存）
const REDIS_SPEC_OPTIONS = [
  { value: '1GB', label: '1 GB' },
  { value: '2GB', label: '2 GB' },
  { value: '4GB', label: '4 GB' },
  { value: '8GB', label: '8 GB' }
]

const MYSQL_VERSION_OPTIONS = [
  { value: '5.7', label: '5.7' },
  { value: '8.0', label: '8.0' }
]

const REDIS_VERSION_OPTIONS = [
  { value: '5.0', label: '5.0' },
  { value: '6.0', label: '6.0' },
  { value: '7.0', label: '7.0' }
]

const MONGO_VERSION_OPTIONS = [
  { value: '5.0', label: '5.0' },
  { value: '6.0', label: '6.0' },
  { value: '7.0', label: '7.0' }
]

const ZOOKEEPER_VERSION_OPTIONS = [
  { value: '3.8', label: '3.8' },
  { value: '3.9', label: '3.9' }
]

// 资源限额：云原生仅 CPU；虚机为核数+内存；含中间件实例配额（数量+规格）
interface EnvironmentQuota {
  cpuCores: number
  vmCpuCores: number
  memoryGB: number
  // 虚机架构专属配额
  vmDiskTotalSizeGB: number
  vmAllowedSpecs: string[]
  // 容器架构专属配额
  maxPodReplicasPerPod: number
  maxAppsPerGame: number
  maxCronJobsPerGame: number
  maxImagesPerGame: number
  gracefulShutdownThresholdSec: number
  // 存储总限额
  storageInstancesLimit: number
  storageBackupEnabled: boolean
  // MySQL
  mysqlVersions: string[]
  mysqlSpecs: string[]
  // Redis：主从架构
  redisMasterSlaveVersions: string[]
  redisMasterSlaveSpecs: string[]
  // Redis：分片架构
  redisShardVersions: string[]
  redisShardSpecs: string[]
  redisShardCountMin: number
  redisShardCountMax: number
  // Mongo：副本集与分片集群均展示
  mongoReplicaVersions: string[]
  mongoReplicaSpecs: string[]
  mongoShardedVersions: string[]
  mongoShardMongosCountMin: number
  mongoShardMongosCountMax: number
  mongoShardMongodCountMin: number
  mongoShardMongodCountMax: number
  mongoShardConfigCountMin: number
  mongoShardConfigCountMax: number
  mongoShardMongosSpecs: string[]
  mongoShardMongodSpecs: string[]
  mongoShardConfigSpecs: string[]
  // Zookeeper
  zookeeperVersions: string[]
  zookeeperSpecs: string[]
  zookeeperNodeCount: number
}

// 配额默认值（用于表单初始值与合并）
const DEFAULT_QUOTA: EnvironmentQuota = {
  cpuCores: 2,
  vmCpuCores: 4,
  memoryGB: 128,
  vmDiskTotalSizeGB: 500,
  vmAllowedSpecs: ['2核4G', '2核8G', '4核8G'],
  maxPodReplicasPerPod: 9,
  maxAppsPerGame: 50,
  maxCronJobsPerGame: 20,
  maxImagesPerGame: 100,
  gracefulShutdownThresholdSec: 30,
  storageInstancesLimit: 5,
  storageBackupEnabled: false,
  mysqlVersions: ['5.7', '8.0'],
  mysqlSpecs: ['2核8G'],
  redisMasterSlaveVersions: ['5.0', '6.0', '7.0'],
  redisMasterSlaveSpecs: ['1GB'],
  redisShardVersions: ['5.0', '6.0', '7.0'],
  redisShardSpecs: ['1GB'],
  redisShardCountMin: 2,
  redisShardCountMax: 3,
  mongoReplicaVersions: ['5.0'],
  mongoReplicaSpecs: ['2核8G'],
  mongoShardedVersions: ['5.0'],
  mongoShardMongosCountMin: 2,
  mongoShardMongosCountMax: 2,
  mongoShardMongodCountMin: 2,
  mongoShardMongodCountMax: 2,
  mongoShardConfigCountMin: 1,
  mongoShardConfigCountMax: 1,
  mongoShardMongosSpecs: ['2核8G'],
  mongoShardMongodSpecs: ['2核8G'],
  mongoShardConfigSpecs: ['4核8G'],
  zookeeperVersions: ['3.8'],
  zookeeperSpecs: ['1核2G'],
  zookeeperNodeCount: 1
}

type ComputeUsage = Pick<
  EnvironmentQuota,
  | 'cpuCores'
  | 'vmCpuCores'
  | 'memoryGB'
  | 'vmDiskTotalSizeGB'
  | 'maxPodReplicasPerPod'
  | 'maxAppsPerGame'
  | 'maxCronJobsPerGame'
  | 'maxImagesPerGame'
  | 'gracefulShutdownThresholdSec'
>

const MOCK_COMPUTE_USAGE_BY_ENV: Record<EnvKey, ComputeUsage> = {
  test: {
    cpuCores: 1,
    vmCpuCores: 2,
    memoryGB: 64,
    vmDiskTotalSizeGB: 200,
    maxPodReplicasPerPod: 3,
    maxAppsPerGame: 12,
    maxCronJobsPerGame: 4,
    maxImagesPerGame: 10,
    gracefulShutdownThresholdSec: 20
  },
  prod: {
    cpuCores: 2,
    vmCpuCores: 8,
    memoryGB: 256,
    vmDiskTotalSizeGB: 1200,
    maxPodReplicasPerPod: 8,
    maxAppsPerGame: 80,
    maxCronJobsPerGame: 24,
    maxImagesPerGame: 120,
    gracefulShutdownThresholdSec: 30
  }
}

// 自动开服配置：包含自动开服模版步骤 & 自动回退开关
interface FailureConfig {
  // 是否支持自动开服回退
  rollbackEnabled: boolean
  // 自动开服模版中启用的步骤 key 列表
  steps: string[]
}

// MSE 网关接入配置（按环境区分）
interface MseConfig {
  enabled: boolean
  gatewayName: string
  namespace: string
  serviceName: string
  routePrefix: string
}

// 健康检查规则配置（按环境区分）
interface HealthCheckConfig {
  enabled: boolean
  intervalSeconds: number
  appThresholds: { appName: string; thresholdPercent: number }[]
}

// 单个环境的初始化配置：客户端 / 服务端各自有独立的初始化状态与配置
interface InitConfig {
  clientStatus: 'not_initialized' | 'completed'
  clientLastInitializedAt?: string
  serverStatus: 'not_initialized' | 'completed'
  serverLastInitializedAt?: string
  clientResource: boolean
  serverResource: boolean
  globalAcceleration: boolean
  deployType: 'vm' | 'container' | ''
}

// 初始化配置表单仅负责编辑资源开关及部署方式，不修改状态/时间
type InitFormValues = Pick<
  InitConfig,
  | 'clientResource'
  | 'serverResource'
  | 'globalAcceleration'
  | 'deployType'
>

type InitToggleField = 'globalAcceleration'

interface GlobalMonitoringConfig {
  grafanaConfig: boolean
  cdnConfig: boolean
}

// 页面内部使用的游戏配置类型
interface GameEnvConfig {
  appId: string
  description?: string
  createdAt: string
  testInit: InitConfig
  prodInit: InitConfig
  testQuota: EnvironmentQuota
  prodQuota: EnvironmentQuota
  testFailure: FailureConfig
  prodFailure: FailureConfig
  testMse: MseConfig
  prodMse: MseConfig
  testHealthCheck: HealthCheckConfig
  prodHealthCheck: HealthCheckConfig
  globalMonitoring: GlobalMonitoringConfig
}

// 模拟数据：虚机架构示例
const mockVmGameConfig: GameEnvConfig = {
  appId: 'gamedemo',
  description: '虚机部署示例应用，用于演示环境配置详情页',
  createdAt: '2024-01-15 10:30:00',
  testInit: {
    clientStatus: 'completed',
    serverStatus: 'completed',
    clientResource: true,
    serverResource: true,
    globalAcceleration: true,
    deployType: 'vm'
  },
  prodInit: {
    clientStatus: 'not_initialized',
    serverStatus: 'not_initialized',
    clientResource: true,
    serverResource: true,
    globalAcceleration: true,
    deployType: 'vm'
  },
  testQuota: {
    cpuCores: 2,
    vmCpuCores: 4,
    memoryGB: 128,
    vmDiskTotalSizeGB: 500,
    vmAllowedSpecs: ['2核4G', '2核8G', '4核8G'],
    maxPodReplicasPerPod: 9,
    maxAppsPerGame: 50,
    maxCronJobsPerGame: 20,
    maxImagesPerGame: 100,
    gracefulShutdownThresholdSec: 30,
    storageInstancesLimit: 5,
    storageBackupEnabled: false,
    mysqlVersions: ['5.7', '8.0'],
    mysqlSpecs: ['2核8G'],
    redisMasterSlaveVersions: ['5.0', '6.0', '7.0'],
    redisMasterSlaveSpecs: ['1GB'],
    redisShardVersions: ['5.0', '6.0', '7.0'],
    redisShardSpecs: ['1GB'],
    redisShardCountMin: 2,
    redisShardCountMax: 3,
    mongoReplicaVersions: ['5.0'],
    mongoReplicaSpecs: ['2核8G'],
    mongoShardedVersions: ['5.0'],
    mongoShardMongosCountMin: 2,
    mongoShardMongosCountMax: 2,
    mongoShardMongodCountMin: 2,
    mongoShardMongodCountMax: 2,
    mongoShardConfigCountMin: 1,
    mongoShardConfigCountMax: 1,
    mongoShardMongosSpecs: ['2核8G'],
    mongoShardMongodSpecs: ['2核8G'],
    mongoShardConfigSpecs: ['4核8G'],
    zookeeperVersions: ['3.8'],
    zookeeperSpecs: ['1核2G'],
    zookeeperNodeCount: 1
  },
  prodQuota: {
    cpuCores: 4,
    vmCpuCores: 16,
    memoryGB: 512,
    vmDiskTotalSizeGB: 2000,
    vmAllowedSpecs: ['2核4G', '2核8G', '4核8G', '4核16G', '8核16G', '8核32G', '12核48G'],
    maxPodReplicasPerPod: 20,
    maxAppsPerGame: 200,
    maxCronJobsPerGame: 80,
    maxImagesPerGame: 500,
    gracefulShutdownThresholdSec: 60,
    storageInstancesLimit: 5,
    storageBackupEnabled: true,
    mysqlVersions: ['5.7', '8.0'],
    mysqlSpecs: ['2核8G', '4核16G', '8核32G'],
    redisMasterSlaveVersions: ['5.0', '6.0', '7.0'],
    redisMasterSlaveSpecs: ['1GB', '2GB', '4GB'],
    redisShardVersions: ['5.0', '6.0', '7.0'],
    redisShardSpecs: ['1GB', '2GB', '4GB'],
    redisShardCountMin: 2,
    redisShardCountMax: 3,
    mongoReplicaVersions: ['5.0'],
    mongoReplicaSpecs: ['2核8G'],
    mongoShardedVersions: ['5.0'],
    mongoShardMongosCountMin: 2,
    mongoShardMongosCountMax: 6,
    mongoShardMongodCountMin: 2,
    mongoShardMongodCountMax: 6,
    mongoShardConfigCountMin: 1,
    mongoShardConfigCountMax: 1,
    mongoShardMongosSpecs: ['2核8G'],
    mongoShardMongodSpecs: ['2核8G'],
    mongoShardConfigSpecs: ['4核8G'],
    zookeeperVersions: ['3.8'],
    zookeeperSpecs: ['1核2G', '2核4G'],
    zookeeperNodeCount: 3
  },
  testFailure: {
    rollbackEnabled: true,
    steps: ['strategy', 'monitor', 'notify', 'reserve']
  },
  prodFailure: {
    rollbackEnabled: false,
    steps: ['strategy', 'monitor']
  },
  testMse: {
    enabled: true,
    gatewayName: 'mse-gateway-stg',
    namespace: 'game-gamedemo-stg',
    serviceName: 'game-gamedemo-service',
    routePrefix: '/game/gamedemo'
  },
  prodMse: {
    enabled: true,
    gatewayName: 'mse-gateway-prd',
    namespace: 'game-gamedemo-prd',
    serviceName: 'game-gamedemo-service',
    routePrefix: '/game/gamedemo'
  },
  testHealthCheck: {
    enabled: true,
    intervalSeconds: 60,
    appThresholds: [{ appName: 'game-server', thresholdPercent: 50 }]
  },
  prodHealthCheck: {
    enabled: true,
    intervalSeconds: 60,
    appThresholds: [{ appName: 'game-server', thresholdPercent: 50 }]
  },
  globalMonitoring: {
    grafanaConfig: false ,
    cdnConfig: false
  }
}

// 模拟数据：容器架构示例
const mockContainerGameConfig: GameEnvConfig = {
  ...mockVmGameConfig,
  appId: 'testgame',
  description: '容器部署示例应用，用于演示环境配置详情页',
  testInit: {
    ...mockVmGameConfig.testInit,
    deployType: 'container'
  },
  prodInit: {
    ...mockVmGameConfig.prodInit,
    deployType: 'container'
  },
  testQuota: {
    ...mockVmGameConfig.testQuota,
    cpuCores: 2,
    maxPodReplicasPerPod: 9,
    maxAppsPerGame: 50,
    maxCronJobsPerGame: 20,
    maxImagesPerGame: 100,
    gracefulShutdownThresholdSec: 30
  },
  prodQuota: {
    ...mockVmGameConfig.prodQuota,
    cpuCores: 4,
    maxPodReplicasPerPod: 20,
    maxAppsPerGame: 200,
    maxCronJobsPerGame: 80,
    maxImagesPerGame: 500,
    gracefulShutdownThresholdSec: 60
  }
}

const mockGameConfigByAppId: Record<string, GameEnvConfig> = {
  gamedemo: mockVmGameConfig,
  testgame: mockContainerGameConfig
}

const resolveMockGameConfig = (nextAppId?: string): GameEnvConfig => {
  if (nextAppId && mockGameConfigByAppId[nextAppId]) {
    return mockGameConfigByAppId[nextAppId]
  }
  return mockVmGameConfig
}

interface GameEnvDetailProps {
  appId?: string
  description?: string
  aliyunAccountName?: string
  mseInstanceType?: 'dedicated' | 'shared'
  // 可选：从列表进入详情时，用于返回列表的回调
  onBack?: () => void
}

export default function GameEnvDetail(props: GameEnvDetailProps) {
  const { appId, description, onBack, aliyunAccountName, mseInstanceType } = props
  // 当前展示的游戏配置（真实项目里应由路由/接口决定，这里先用 mock 数据）
  const [gameConfig, setGameConfig] = useState<GameEnvConfig>(() => {
    const selectedMock = resolveMockGameConfig(appId)
    return {
      ...selectedMock,
      appId: appId ?? selectedMock.appId,
      description: description ?? selectedMock.description
    }
  })

  // 初始化日志弹窗（原型：点击“日志”查看对应模块的部署/初始化日志）
  const [initLogModalOpen, setInitLogModalOpen] = useState<boolean>(false)
  const [initLogModalTitle, setInitLogModalTitle] = useState<string>('')
  const [initLogModalContent, setInitLogModalContent] = useState<string>('')

  // 当上层传入的 appId / description 变化时，更新当前配置的基础信息
  React.useEffect(() => {
    if (!appId && !description) return
    const selectedMock = resolveMockGameConfig(appId)
    setGameConfig({
      ...selectedMock,
      appId: appId ?? selectedMock.appId,
      description: description ?? selectedMock.description
    })
  }, [appId, description])

  // 顶层 Tab：游戏初始化 | 资源限额配置 | 自动开服配置 | MSE配置 | Lambda模版
  const [activeMainTab, setActiveMainTab] = useState<string>('init')
  // 限额 / 开服失败 / MSE / Lambda 编辑态：null 表示未编辑，'test'|'prod' 表示正在编辑该环境
  const [quotaEditingEnv, setQuotaEditingEnv] = useState<EnvKey | null>(null)
  const [failureEditingEnv, setFailureEditingEnv] = useState<EnvKey | null>(null)
  const [mseEditingEnv, setMseEditingEnv] = useState<EnvKey | null>(null)
  const [lambdaEditingEnv, setLambdaEditingEnv] = useState<EnvKey | null>(null)
  const [healthCheckEditingEnv, setHealthCheckEditingEnv] = useState<EnvKey | null>(null)
  // 兼容旧逻辑：当前焦点环境（用于表单回填、确认弹窗等）
  const activeEnv =
    quotaEditingEnv ??
    failureEditingEnv ??
    mseEditingEnv ??
    lambdaEditingEnv ??
    healthCheckEditingEnv ??
    'test'

  // 限额表单实例（每次切换环境复用同一个表单）
  const [quotaForm] = Form.useForm<EnvironmentQuota>()
  // 自动开服配置表单
  const [failureForm] = Form.useForm<FailureConfig>()
  // Lambda 模板源码查看弹窗
  const [lambdaModalVisible, setLambdaModalVisible] = useState<boolean>(false)
  const [lambdaStepsByEnv, setLambdaStepsByEnv] = useState<Record<EnvKey, LambdaStepKey[]>>({
    test: ['zipSlip', 'filter', 'symlink', 'pathCheck'],
    prod: ['zipSlip', 'symlink', 'pathCheck']
  })
  const [mseForm] = Form.useForm<MseConfig>()
  const [healthCheckForm] = Form.useForm<HealthCheckConfig>()
  const [pendingMse, setPendingMse] = useState<MseConfig | null>(null)
  const [mseConfirmVisible, setMseConfirmVisible] = useState<boolean>(false)
  // 二次确认用的待提交数据 & 弹窗可见性
  const [pendingInit, setPendingInit] = useState<InitFormValues | null>(null)
  const [pendingInitMeta, setPendingInitMeta] = useState<
    { envKey: EnvKey; label: string; value: boolean } | null
  >(null)
  const [initConfirmVisible, setInitConfirmVisible] = useState<boolean>(false)
  const [pendingQuota, setPendingQuota] = useState<EnvironmentQuota | null>(null)
  const [quotaConfirmVisible, setQuotaConfirmVisible] = useState<boolean>(false)
  const [pendingFailure, setPendingFailure] = useState<FailureConfig | null>(null)
  const [failureConfirmVisible, setFailureConfirmVisible] = useState<boolean>(false)
  const [pendingHealthCheck, setPendingHealthCheck] = useState<HealthCheckConfig | null>(null)
  const [healthCheckConfirmVisible, setHealthCheckConfirmVisible] = useState<boolean>(false)
  // 按环境获取数据
  const getEnvData = (envKey: EnvKey): {
    init: InitConfig
    quota: EnvironmentQuota
    failure: FailureConfig
    mse: MseConfig
    healthCheck: HealthCheckConfig
    lambdaSteps: LambdaStepKey[]
  } => {
    if (envKey === 'test') {
      return {
        init: gameConfig.testInit,
        quota: gameConfig.testQuota,
        failure: gameConfig.testFailure,
        mse: gameConfig.testMse,
        healthCheck: gameConfig.testHealthCheck,
        lambdaSteps: lambdaStepsByEnv.test
      }
    }
    return {
      init: gameConfig.prodInit,
      quota: gameConfig.prodQuota,
      failure: gameConfig.prodFailure,
      mse: gameConfig.prodMse,
      healthCheck: gameConfig.prodHealthCheck,
      lambdaSteps: lambdaStepsByEnv.prod
    }
  }


  // 保存限额配置（当前环境）
  const handleSaveQuota = async (): Promise<void> => {
    try {
      const values = await quotaForm.validateFields()
      const envKey = quotaEditingEnv ?? 'test'
      const currentQuota = envKey === 'test' ? gameConfig.testQuota : gameConfig.prodQuota
      // 校验通过后，不直接落地，先存入待提交数据并展示二次确认弹窗
      setPendingQuota({ ...DEFAULT_QUOTA, ...currentQuota, ...values })
      setQuotaConfirmVisible(true)
    } catch {
      // 校验错误由 Form.Item 展示，这里不需要额外处理
    }
  }

  // 保存开服失败配置（当前环境）
  const handleSaveFailureConfig = async (): Promise<void> => {
    try {
      const values = await failureForm.validateFields()
      setPendingFailure(values)
      setFailureConfirmVisible(true)
    } catch {
      // 校验错误由 Form.Item 展示
    }
  }

  // 保存健康检查规则（当前环境）
  const handleSaveHealthCheckConfig = async (): Promise<void> => {
    try {
      const values = await healthCheckForm.validateFields()
      setPendingHealthCheck(values)
      setHealthCheckConfirmVisible(true)
    } catch {
      // 校验错误由 Form.Item 展示
    }
  }

  const getDeployLabel = (deployType: string) =>
    deployType === 'vm' ? '虚机部署' : deployType === 'container' ? '容器部署' : '待配置'
  const deployLabel = getDeployLabel(gameConfig.testInit.deployType)

  const mseInstanceTypeLabel =
    mseInstanceType === 'shared' ? '共享实例' : mseInstanceType === 'dedicated' ? '独占实例' : '—'
  const monitoringStatusList: Array<{
    key: keyof GlobalMonitoringConfig
    label: string
    enabled: boolean
  }> = [
    {
      key: 'grafanaConfig',
      label: 'Grafana 配置',
      enabled: gameConfig.globalMonitoring.grafanaConfig
    },
    {
      key: 'cdnConfig',
      label: 'CDN 配置',
      enabled: gameConfig.globalMonitoring.cdnConfig
    }
  ]

  const handleCompleteGlobalMonitoring = (field: keyof GlobalMonitoringConfig): void => {
    // 交互意图：用户点击“完成配置”后，直接将全局配置标记为已完成（无弹窗编辑）
    setGameConfig(prev => ({
      ...prev,
      globalMonitoring: {
        ...prev.globalMonitoring,
        [field]: true
      }
    }))
    message.success('全局配置已更新')
  }

  const confirmCompleteGlobalMonitoring = (
    field: keyof GlobalMonitoringConfig,
    label: string
  ): void => {
    Modal.confirm({
      title: '确认完成配置？',
      content: `将「${label}」标记为已完成（全局生效）。`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => handleCompleteGlobalMonitoring(field)
    })
  }

  const buildCursorLikeInitLog = (params: {
    envKey: EnvKey
    target: 'client' | 'server'
    appId: string
    success: boolean
  }): string => {
    const envLabel = params.envKey === 'test' ? 'test' : 'prod'
    const targetLabel = params.target === 'client' ? 'client' : 'server'
    const basePrefix = `[${envLabel}] [${targetLabel}] [appId=${params.appId}]`
    if (params.success) {
      return [
        `${basePrefix} INFO  start init`,
        `${basePrefix} INFO  preparing resources...`,
        `${basePrefix} INFO  applying config...`,
        `${basePrefix} INFO  waiting for healthcheck...`,
        `${basePrefix} SUCCESS init completed`
      ].join('\n')
    }
    // 失败日志（原型示例）：用于满足“成功/失败都展示日志”的需求
    return [
      `${basePrefix} INFO  start init`,
      `${basePrefix} INFO  preparing resources...`,
      `${basePrefix} WARN  retrying: dependency not ready`,
      `${basePrefix} ERROR init failed: upstream timeout`,
      `${basePrefix} HINT  check cloud resource status and retry`
    ].join('\n')
  }

  const openInitLogModal = (params: {
    envKey: EnvKey
    envTitle: string
    target: 'client' | 'server'
    targetTitle: string
    success: boolean
  }): void => {
    // 交互意图：点击“日志”打开弹窗查看初始化日志（不改变原来的状态/布局展示）
    setInitLogModalTitle(`${params.envTitle} · ${params.targetTitle} · 初始化日志`)
    setInitLogModalContent(
      buildCursorLikeInitLog({
        envKey: params.envKey,
        target: params.target,
        appId: gameConfig.appId,
        success: params.success
      })
    )
    setInitLogModalOpen(true)
  }
  const handleInitToggle = (
    envKey: EnvKey,
    field: InitToggleField,
    label: string,
    nextValue: boolean
  ): void => {
    // 初始化配置开关：支持按环境（测试/生产）独立修改，点击后弹二次确认
    const envInit = envKey === 'test' ? gameConfig.testInit : gameConfig.prodInit
    const nextInit: InitFormValues = {
      clientResource: envInit.clientResource,
      serverResource: envInit.serverResource,
      globalAcceleration: envInit.globalAcceleration,
      deployType: envInit.deployType
    }
    nextInit[field] = nextValue
    setPendingInit(nextInit)
    setPendingInitMeta({ envKey, label, value: nextValue })
    setInitConfirmVisible(true)
  }

  return (
    <Card>
      {/* 顶部：APP 基本信息 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <Button
              type="link"
              onClick={onBack}
              style={{ paddingLeft: 0 }}
            >
              返回列表
            </Button>
          )}
          <Title level={4} style={{ marginBottom: 4 }}>
            应用环境配置 - {gameConfig.appId}
          </Title>
          <Text type="secondary">
            {gameConfig.description || '用于配置测试/生产环境的初始化策略、资源限额与自动开服策略。'}
          </Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            创建时间：{gameConfig.createdAt}
          </Text>
        </div>
      </div>

      {/* 顶层 Tab：每个 Tab 内区分测试环境和正式环境 */}
      <Tabs
        activeKey={activeMainTab}
        onChange={setActiveMainTab}
        items={[
          {
            key: 'init',
            label: '游戏初始化',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
        <Card bodyStyle={{ padding: 0 }}>
          <div
            style={{
              padding: '16px 20px 14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))',
              gap: '16px 24px',
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            <div>
              <Text strong style={{ fontSize: 13 }}>部署方式</Text>
              <div style={{ marginTop: 6 }}><Text type="secondary">{deployLabel}</Text></div>
            </div>
            <div>
              <Text strong style={{ fontSize: 13 }}>阿里云账号</Text>
              <div style={{ marginTop: 6 }}><Text type="secondary">{aliyunAccountName || '-'}</Text></div>
            </div>
            <div>
              <Text strong style={{ fontSize: 13 }}>Grafana 配置</Text>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary">{gameConfig.globalMonitoring.grafanaConfig ? '已配置' : '待配置'}</Text>
                {!gameConfig.globalMonitoring.grafanaConfig && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, marginLeft: 8 }}
                    onClick={() => confirmCompleteGlobalMonitoring('grafanaConfig', 'Grafana 配置')}
                  >
                    完成
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Text strong style={{ fontSize: 13 }}>CDN 配置</Text>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary">{gameConfig.globalMonitoring.cdnConfig ? '已配置' : '待配置'}</Text>
                {!gameConfig.globalMonitoring.cdnConfig && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, marginLeft: 8 }}
                    onClick={() => confirmCompleteGlobalMonitoring('cdnConfig', 'CDN 配置')}
                  >
                    完成
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Collapse
            ghost
            expandIconPosition="start"
            defaultActiveKey={['test-init', 'prod-init']}
            items={([
              { envKey: 'test' as const, title: '测试环境初始化', key: 'test-init' },
              { envKey: 'prod' as const, title: '正式环境初始化', key: 'prod-init' }
            ] as const).map(env => {
              const envInit = env.envKey === 'test' ? gameConfig.testInit : gameConfig.prodInit
              const envClientInitialized = envInit.clientStatus === 'completed'
              const envServerInitialized = envInit.serverStatus === 'completed'
              const envDone = envClientInitialized && envServerInitialized
              return {
                key: env.key,
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
                    <Text>{env.title}</Text>
                    <Space size={6}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          border: `1px solid ${envDone ? '#52c41a' : '#d48806'}`,
                          display: 'inline-block',
                          marginTop: 6
                        }}
                      />
                      <Text style={{ color: envDone ? '#52c41a' : '#d48806' }}>{envDone ? '已完成' : '未完成'}</Text>
                    </Space>
                  </div>
                ),
                children: (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))',
                      gap: '14px 24px',
                      paddingBottom: 6
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 13 }}>客户端</Text>
                      <div style={{ marginTop: 6 }}><Text type="secondary">{envClientInitialized ? '已初始化' : '待开始'}</Text></div>
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>服务端</Text>
                      <div style={{ marginTop: 6 }}><Text type="secondary">{envServerInitialized ? '已初始化' : '待开始'}</Text></div>
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>MSE 实例类型</Text>
                      <div style={{ marginTop: 6 }}><Text type="secondary">{mseInstanceTypeLabel}</Text></div>
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>客户端全球加速(GA)</Text>
                      <div style={{ marginTop: 8 }}>
                        <Switch
                          checked={envInit.globalAcceleration}
                          disabled={initConfirmVisible}
                          onChange={checked =>
                            handleInitToggle(env.envKey, 'globalAcceleration', '客户端全球加速(GA)', checked)
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>服务端全球加速(GA)</Text>
                      <div style={{ marginTop: 8 }}>
                        <Switch
                          checked={envInit.globalAcceleration}
                          disabled={initConfirmVisible}
                          onChange={checked =>
                            handleInitToggle(env.envKey, 'globalAcceleration', '服务端全球加速(GA)', checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          />
        </Card>
              </Space>
            )
          },
          {
            key: 'quota',
            label: '资源限额配置',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
        {/* 限额配置 Card：测试/正式环境上下排列 */}
        <Card title="限额配置">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {(['test', 'prod'] as const).map(envKey => {
              const envData = getEnvData(envKey)
              const envQuota = envData.quota
              const isContainer = envData.init.deployType === 'container'
              const computeUsed = MOCK_COMPUTE_USAGE_BY_ENV[envKey]
              const isEditing = quotaEditingEnv === envKey
              const renderUsageCompareCard = (label: string, total: number, used: number, unit = '') => {
                const safeTotal = Math.max(total, 0)
                const safeUsed = Math.max(Math.min(used, safeTotal), 0)
                const unused = Math.max(safeTotal - safeUsed, 0)
                const usedPercent = safeTotal > 0 ? (safeUsed / safeTotal) * 100 : 0
                const valueWithUnit = (v: number) => `${v}${unit ? ` ${unit}` : ''}`
                const usedColor = '#1677ff'
                const unusedColor = '#f0f0f0'
                return (
                  <div
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 12,
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text>{label}</Text>
                      <Text type="secondary">总配额 {valueWithUnit(safeTotal)}</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background: `conic-gradient(${usedColor} 0% ${usedPercent}%, ${unusedColor} ${usedPercent}% 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: 600 }}>{Math.round(usedPercent)}%</Text>
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'grid', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <Space size={6}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                display: 'inline-block',
                                background: usedColor
                              }}
                            />
                            <Text type="secondary">已使用</Text>
                          </Space>
                          <Text>{valueWithUnit(safeUsed)}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <Space size={6}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                display: 'inline-block',
                                background: unusedColor,
                                border: '1px solid #d9d9d9'
                              }}
                            />
                            <Text type="secondary">未使用</Text>
                          </Space>
                          <Text>{valueWithUnit(unused)}</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <div key={envKey} style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text strong>{envKey === 'test' ? '测试环境' : '正式环境'}</Text>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() => {
                        if (!isEditing) {
                          quotaForm.setFieldsValue({ ...DEFAULT_QUOTA, ...envQuota })
                          setQuotaEditingEnv(envKey)
                        } else {
                          quotaForm.setFieldsValue({ ...DEFAULT_QUOTA, ...envQuota })
                          setQuotaEditingEnv(null)
                        }
                      }}
                    >
                      {isEditing ? '取消' : '编辑'}
                    </Button>
                  </Space>
                  {!isEditing ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                        gap: 16
                      }}
                    >
                      <Card
                        size="small"
                        title={
                          <Space direction="vertical" size={0}>
                            <Text strong>计算资源</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {isContainer ? '云机部署' : '虚机部署'}
                            </Text>
                          </Space>
                        }
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 10
                          }}
                        >
                          {isContainer ? (
                            <>
                              {renderUsageCompareCard('CPU', envQuota.cpuCores, computeUsed.cpuCores, 'C')}
                              {renderUsageCompareCard('Pod 副本上限', envQuota.maxPodReplicasPerPod, computeUsed.maxPodReplicasPerPod)}
                              {renderUsageCompareCard('应用上限', envQuota.maxAppsPerGame, computeUsed.maxAppsPerGame)}
                              {renderUsageCompareCard('定时任务上限', envQuota.maxCronJobsPerGame, computeUsed.maxCronJobsPerGame)}
                              {renderUsageCompareCard('镜像上限', envQuota.maxImagesPerGame, computeUsed.maxImagesPerGame)}
                            </>
                          ) : (
                            <>
                              {renderUsageCompareCard('CPU', envQuota.vmCpuCores, computeUsed.vmCpuCores, 'C')}
                              {renderUsageCompareCard('内存', envQuota.memoryGB, computeUsed.memoryGB, 'GB')}
                              {renderUsageCompareCard('磁盘总容量', envQuota.vmDiskTotalSizeGB, computeUsed.vmDiskTotalSizeGB, 'GB')}
                            </>
                          )}
                        </div>
                      </Card>

                      {false && <Card
                        size="small"
                        title={
                          <Space direction="vertical" size={0}>
                            <Text strong>存储资源</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>4 类服务</Text>
                          </Space>
                        }
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="每游戏存储实例上限">{envQuota.storageInstancesLimit}</Descriptions.Item>
                          {envKey === 'prod' && (
                            <Descriptions.Item label="生产存储实例备份功能开关">
                              <Switch checked={envQuota.storageBackupEnabled} disabled />
                            </Descriptions.Item>
                          )}
                        </Descriptions>
                        <Collapse
                          ghost
                          size="small"
                          defaultActiveKey={[]}
                          items={[
                            {
                              key: 'storageSpec',
                              label: '规格详情',
                              children: (
                                <Collapse
                                  size="small"
                                  defaultActiveKey={[
                                    'storageSpecMysql',
                                    'storageSpecMongo',
                                    'storageSpecRedis',
                                    'storageSpecZk'
                                  ]}
                                  items={[
                                    {
                                      key: 'storageSpecMysql',
                                      label: 'MySQL',
                                      children: (
                                        <Descriptions column={1} size="small">
                                          <Descriptions.Item label="版本">{envQuota.mysqlVersions.join('、') || '-'}</Descriptions.Item>
                                          <Descriptions.Item label="规格">{envQuota.mysqlSpecs.join('、') || '-'}</Descriptions.Item>
                                        </Descriptions>
                                      )
                                    },
                                    {
                                      key: 'storageSpecMongo',
                                      label: 'MongoDB',
                                      children: (
                                        <Collapse
                                          ghost
                                          size="small"
                                          defaultActiveKey={['storageSpecMongoReplica', 'storageSpecMongoShard']}
                                          items={[
                                            {
                                              key: 'storageSpecMongoReplica',
                                              label: '副本集',
                                              children: (
                                                <Descriptions column={2} size="small">
                                                  <Descriptions.Item label="版本">{envQuota.mongoReplicaVersions.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="实例规格">{envQuota.mongoReplicaSpecs.join('、') || '-'}</Descriptions.Item>
                                                </Descriptions>
                                              )
                                            },
                                            {
                                              key: 'storageSpecMongoShard',
                                              label: '分片集群',
                                              children: (
                                                <Descriptions column={2} size="small">
                                                  <Descriptions.Item label="版本" span={2}>{envQuota.mongoShardedVersions.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="Mongos 数量范围">{envQuota.mongoShardMongosCountMin}~{envQuota.mongoShardMongosCountMax}</Descriptions.Item>
                                                  <Descriptions.Item label="Mongos 规格">{envQuota.mongoShardMongosSpecs.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="Mongod 数量范围">{envQuota.mongoShardMongodCountMin}~{envQuota.mongoShardMongodCountMax}</Descriptions.Item>
                                                  <Descriptions.Item label="Mongod 规格">{envQuota.mongoShardMongodSpecs.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="Config 数量范围">{envQuota.mongoShardConfigCountMin}~{envQuota.mongoShardConfigCountMax}</Descriptions.Item>
                                                  <Descriptions.Item label="Config 规格">{envQuota.mongoShardConfigSpecs.join('、') || '-'}</Descriptions.Item>
                                                </Descriptions>
                                              )
                                            }
                                          ]}
                                        />
                                      )
                                    },
                                    {
                                      key: 'storageSpecRedis',
                                      label: 'Redis',
                                      children: (
                                        <Collapse
                                          ghost
                                          size="small"
                                          defaultActiveKey={['storageSpecRedisMasterSlave', 'storageSpecRedisShard']}
                                          items={[
                                            {
                                              key: 'storageSpecRedisMasterSlave',
                                              label: '主从架构',
                                              children: (
                                                <Descriptions column={2} size="small">
                                                  <Descriptions.Item label="版本">{envQuota.redisMasterSlaveVersions.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="规格">{envQuota.redisMasterSlaveSpecs.join('、') || '-'}</Descriptions.Item>
                                                </Descriptions>
                                              )
                                            },
                                            {
                                              key: 'storageSpecRedisShard',
                                              label: '分片架构',
                                              children: (
                                                <Descriptions column={2} size="small">
                                                  <Descriptions.Item label="版本">{envQuota.redisShardVersions.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="规格">{envQuota.redisShardSpecs.join('、') || '-'}</Descriptions.Item>
                                                  <Descriptions.Item label="Cluster 分片阈值" span={2}>
                                                    {envQuota.redisShardCountMin}~{envQuota.redisShardCountMax}
                                                  </Descriptions.Item>
                                                </Descriptions>
                                              )
                                            }
                                          ]}
                                        />
                                      )
                                    },
                                    {
                                      key: 'storageSpecZk',
                                      label: 'Zookeeper',
                                      children: (
                                        <Descriptions column={1} size="small">
                                          <Descriptions.Item label="版本">{envQuota.zookeeperVersions.join('、') || '-'}</Descriptions.Item>
                                          <Descriptions.Item label="规格">{envQuota.zookeeperSpecs.join('、') || '-'}</Descriptions.Item>
                                          <Descriptions.Item label="节点数">{envQuota.zookeeperNodeCount}</Descriptions.Item>
                                        </Descriptions>
                                      )
                                    }
                                  ]}
                                />
                              )
                            }
                          ]}
                        />
                      </Card>}
                    </div>
                  ) : (
                    <Form<EnvironmentQuota>
                      form={quotaForm}
                      layout="vertical"
                      initialValues={{ ...DEFAULT_QUOTA, ...envQuota }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                          gap: 16
                        }}
                      >
                        <Card
                          size="small"
                          title={
                            <Space direction="vertical" size={0}>
                              <Text strong>计算资源</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {isContainer ? '云机部署' : '虚机部署'}
                              </Text>
                            </Space>
                          }
                        >
                          {isContainer ? (
                            <Form.Item
                              label="单个应用 CPU 核数"
                              name="cpuCores"
                              rules={[
                                { required: true, message: '请输入 CPU 核数' },
                                { type: 'number', min: 1, max: 64, message: 'CPU 核数需在 1–64 之间' },
                                {
                                  validator(_, value) {
                                    if (value === undefined || value >= computeUsed.cpuCores) return Promise.resolve()
                                    return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.cpuCores}C`))
                                  }
                                }
                              ]}
                            >
                              <InputNumber style={{ width: '100%' }} addonAfter="C" />
                            </Form.Item>
                          ) : (
                            <>
                              <Form.Item
                                label="虚机 CPU 总核数"
                                name="vmCpuCores"
                                rules={[
                                  { required: true, message: '请输入虚机核数' },
                                  { type: 'number', min: 1, max: 128, message: '核数需在 1–128 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.vmCpuCores) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.vmCpuCores}C`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} addonAfter="C" />
                              </Form.Item>
                              <Form.Item
                                label="虚机内存"
                                name="memoryGB"
                                rules={[
                                  { required: true, message: '请输入内存' },
                                  { type: 'number', min: 1, max: 2048, message: '内存需在 1–2048 GB 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.memoryGB) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.memoryGB}GB`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} addonAfter="GB" />
                              </Form.Item>
                            </>
                          )}

                          {isContainer ? (
                            <>
                              <Form.Item
                                label="每个 Pod 副本数上限"
                                name="maxPodReplicasPerPod"
                                rules={[
                                  { required: true, message: '请输入每个 Pod 副本数上限' },
                                  { type: 'number', min: 1, max: 1000, message: '需在 1–1000 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.maxPodReplicasPerPod) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.maxPodReplicasPerPod}`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} min={1} max={1000} />
                              </Form.Item>
                              <Form.Item
                                label="每游戏应用上限配置"
                                name="maxAppsPerGame"
                                rules={[
                                  { required: true, message: '请输入每游戏应用上限' },
                                  { type: 'number', min: 1, max: 10000, message: '需在 1–10000 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.maxAppsPerGame) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.maxAppsPerGame}`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} min={1} max={10000} />
                              </Form.Item>
                              <Form.Item
                                label="每游戏定时任务上限配置"
                                name="maxCronJobsPerGame"
                                rules={[
                                  { required: true, message: '请输入每游戏定时任务上限' },
                                  { type: 'number', min: 1, max: 10000, message: '需在 1–10000 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.maxCronJobsPerGame) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.maxCronJobsPerGame}`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} min={1} max={10000} />
                              </Form.Item>
                              <Form.Item
                                label="每游戏镜像上限配置"
                                name="maxImagesPerGame"
                                rules={[
                                  { required: true, message: '请输入每游戏镜像上限' },
                                  { type: 'number', min: 1, max: 10000, message: '需在 1–10000 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.maxImagesPerGame) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.maxImagesPerGame}`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} min={1} max={10000} />
                              </Form.Item>
                            </>
                          ) : (
                            <>
                              <Form.Item
                                label="磁盘总容量"
                                name="vmDiskTotalSizeGB"
                                rules={[
                                  { required: true, message: '请输入磁盘总容量' },
                                  { type: 'number', min: 1, max: 65536, message: '需在 1–65536 GB 之间' },
                                  {
                                    validator(_, value) {
                                      if (value === undefined || value >= computeUsed.vmDiskTotalSizeGB) return Promise.resolve()
                                      return Promise.reject(new Error(`不能小于已使用值 ${computeUsed.vmDiskTotalSizeGB}GB`))
                                    }
                                  }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} min={1} max={65536} addonAfter="GB" />
                              </Form.Item>
                            </>
                          )}
                        </Card>

                        {false && <Card
                          size="small"
                          title={
                            <Space direction="vertical" size={0}>
                              <Text strong>存储资源</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>4 类服务</Text>
                            </Space>
                          }
                        >
                          <Form.Item
                            label="每游戏存储实例上限（kumo 加白）"
                            name="storageInstancesLimit"
                            rules={[
                              { required: true, message: '请输入存储实例上限' },
                              { type: 'number', min: 0, max: 100, message: '数量需在 0–100 之间' }
                            ]}
                          >
                            <InputNumber style={{ width: '100%' }} min={0} max={100} />
                          </Form.Item>
                          {envKey === 'prod' && (
                            <Form.Item
                              label="生产存储实例备份功能开关"
                              name="storageBackupEnabled"
                              valuePropName="checked"
                            >
                              <Switch />
                            </Form.Item>
                          )}

                          <Collapse
                            ghost
                            size="small"
                            defaultActiveKey={['storageSpecEdit']}
                            items={[
                              {
                                key: 'storageSpecEdit',
                                label: '规格详情',
                                children: (
                                  <Collapse
                                    size="small"
                                    defaultActiveKey={[
                                      'storageSpecEditMysql',
                                      'storageSpecEditMongo',
                                      'storageSpecEditRedis',
                                      'storageSpecEditZk'
                                    ]}
                                    items={[
                                      {
                                        key: 'storageSpecEditMysql',
                                        label: 'MySQL',
                                        children: (
                                          <>
                                            <Form.Item
                                              label="版本"
                                              name="mysqlVersions"
                                              rules={[{ required: true, message: '请选择 MySQL 版本' }]}
                                            >
                                              <Select mode="multiple" style={{ width: '100%' }} options={MYSQL_VERSION_OPTIONS} />
                                            </Form.Item>
                                            <Form.Item
                                              label="规格"
                                              name="mysqlSpecs"
                                              rules={[{ required: true, message: '请选择 MySQL 规格' }]}
                                            >
                                              <Select mode="multiple" style={{ width: '100%' }} options={INSTANCE_SPEC_OPTIONS} />
                                            </Form.Item>
                                          </>
                                        )
                                      },
                                      {
                                        key: 'storageSpecEditMongo',
                                        label: 'MongoDB',
                                        children: (
                                          <Collapse
                                            ghost
                                            size="small"
                                            defaultActiveKey={['storageSpecEditMongoReplica', 'storageSpecEditMongoShard']}
                                            items={[
                                              {
                                                key: 'storageSpecEditMongoReplica',
                                                label: '副本集',
                                                children: (
                                                  <Row gutter={12}>
                                                    <Col span={12}>
                                                      <Form.Item
                                                        label="版本"
                                                        name="mongoReplicaVersions"
                                                        rules={[{ required: true, message: '请选择副本集版本' }]}
                                                      >
                                                        <Select mode="multiple" style={{ width: '100%' }} options={MONGO_VERSION_OPTIONS} />
                                                      </Form.Item>
                                                    </Col>
                                                    <Col span={12}>
                                                      <Form.Item
                                                        label="实例规格"
                                                        name="mongoReplicaSpecs"
                                                        rules={[{ required: true }]}
                                                      >
                                                        <Select mode="multiple" style={{ width: '100%' }} options={INSTANCE_SPEC_OPTIONS} />
                                                      </Form.Item>
                                                    </Col>
                                                  </Row>
                                                )
                                              },
                                              {
                                                key: 'storageSpecEditMongoShard',
                                                label: '分片集群',
                                                children: (
                                                  <>
                                                    <Form.Item
                                                      label="版本"
                                                      name="mongoShardedVersions"
                                                      rules={[{ required: true, message: '请选择分片集版本' }]}
                                                    >
                                                      <Select mode="multiple" style={{ width: '100%' }} options={MONGO_VERSION_OPTIONS} />
                                                    </Form.Item>
                                                    <Row gutter={12}>
                                                      <Col span={12}>
                                                        <Form.Item label="Mongos 数量范围">
                                                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                            <Form.Item
                                                              name="mongoShardMongosCountMin"
                                                              noStyle
                                                              rules={[{ required: true }, { type: 'number', min: 0, max: 20 }]}
                                                            >
                                                              <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={0} max={20} placeholder="起始值" />
                                                            </Form.Item>
                                                            <div
                                                              style={{
                                                                width: 48,
                                                                height: 32,
                                                                lineHeight: '30px',
                                                                textAlign: 'center',
                                                                borderTop: '1px solid #d9d9d9',
                                                                borderBottom: '1px solid #d9d9d9',
                                                                background: '#fafafa'
                                                              }}
                                                            >
                                                              ~
                                                            </div>
                                                            <Form.Item
                                                              name="mongoShardMongosCountMax"
                                                              noStyle
                                                              rules={[
                                                                { required: true },
                                                                { type: 'number', min: 0, max: 20 },
                                                                ({ getFieldValue }) => ({
                                                                  validator(_, value) {
                                                                    const min = getFieldValue('mongoShardMongosCountMin')
                                                                    if (value === undefined || min === undefined || value >= min) {
                                                                      return Promise.resolve()
                                                                    }
                                                                    return Promise.reject(new Error('最大值需大于等于最小值'))
                                                                  }
                                                                })
                                                              ]}
                                                            >
                                                              <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={0} max={20} placeholder="结束值" />
                                                            </Form.Item>
                                                          </div>
                                                        </Form.Item>
                                                      </Col>
                                                      <Col span={12}>
                                                        <Form.Item
                                                          label="Mongos 规格"
                                                          name="mongoShardMongosSpecs"
                                                          rules={[{ required: true }]}
                                                        >
                                                          <Select mode="multiple" style={{ width: '100%' }} options={INSTANCE_SPEC_OPTIONS} />
                                                        </Form.Item>
                                                      </Col>
                                                      <Col span={12}>
                                                        <Form.Item label="Mongod 数量范围">
                                                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                            <Form.Item
                                                              name="mongoShardMongodCountMin"
                                                              noStyle
                                                              rules={[{ required: true }, { type: 'number', min: 0, max: 20 }]}
                                                            >
                                                              <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={0} max={20} placeholder="起始值" />
                                                            </Form.Item>
                                                            <div
                                                              style={{
                                                                width: 48,
                                                                height: 32,
                                                                lineHeight: '30px',
                                                                textAlign: 'center',
                                                                borderTop: '1px solid #d9d9d9',
                                                                borderBottom: '1px solid #d9d9d9',
                                                                background: '#fafafa'
                                                              }}
                                                            >
                                                              ~
                                                            </div>
                                                            <Form.Item
                                                              name="mongoShardMongodCountMax"
                                                              noStyle
                                                              rules={[
                                                                { required: true },
                                                                { type: 'number', min: 0, max: 20 },
                                                                ({ getFieldValue }) => ({
                                                                  validator(_, value) {
                                                                    const min = getFieldValue('mongoShardMongodCountMin')
                                                                    if (value === undefined || min === undefined || value >= min) {
                                                                      return Promise.resolve()
                                                                    }
                                                                    return Promise.reject(new Error('最大值需大于等于最小值'))
                                                                  }
                                                                })
                                                              ]}
                                                            >
                                                              <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={0} max={20} placeholder="结束值" />
                                                            </Form.Item>
                                                          </div>
                                                        </Form.Item>
                                                      </Col>
                                                      <Col span={12}>
                                                        <Form.Item
                                                          label="Mongod 规格"
                                                          name="mongoShardMongodSpecs"
                                                          rules={[{ required: true }]}
                                                        >
                                                          <Select mode="multiple" style={{ width: '100%' }} options={INSTANCE_SPEC_OPTIONS} />
                                                        </Form.Item>
                                                      </Col>
                                                      <Col span={12}>
                                                        <Form.Item label="Config 数量范围">
                                                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                            <Form.Item
                                                              name="mongoShardConfigCountMin"
                                                              noStyle
                                                              rules={[{ required: true }, { type: 'number', min: 0, max: 20 }]}
                                                            >
                                                              <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={0} max={20} placeholder="起始值" />
                                                            </Form.Item>
                                                            <div
                                                              style={{
                                                                width: 48,
                                                                height: 32,
                                                                lineHeight: '30px',
                                                                textAlign: 'center',
                                                                borderTop: '1px solid #d9d9d9',
                                                                borderBottom: '1px solid #d9d9d9',
                                                                background: '#fafafa'
                                                              }}
                                                            >
                                                              ~
                                                            </div>
                                                            <Form.Item
                                                              name="mongoShardConfigCountMax"
                                                              noStyle
                                                              rules={[
                                                                { required: true },
                                                                { type: 'number', min: 0, max: 20 },
                                                                ({ getFieldValue }) => ({
                                                                  validator(_, value) {
                                                                    const min = getFieldValue('mongoShardConfigCountMin')
                                                                    if (value === undefined || min === undefined || value >= min) {
                                                                      return Promise.resolve()
                                                                    }
                                                                    return Promise.reject(new Error('最大值需大于等于最小值'))
                                                                  }
                                                                })
                                                              ]}
                                                            >
                                                              <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={0} max={20} placeholder="结束值" />
                                                            </Form.Item>
                                                          </div>
                                                        </Form.Item>
                                                      </Col>
                                                      <Col span={12}>
                                                        <Form.Item
                                                          label="Config 规格"
                                                          name="mongoShardConfigSpecs"
                                                          rules={[{ required: true }]}
                                                        >
                                                          <Select mode="multiple" style={{ width: '100%' }} options={INSTANCE_SPEC_OPTIONS} />
                                                        </Form.Item>
                                                      </Col>
                                                    </Row>
                                                  </>
                                                )
                                              }
                                            ]}
                                          />
                                        )
                                      },
                                      {
                                        key: 'storageSpecEditRedis',
                                        label: 'Redis',
                                        children: (
                                          <Collapse
                                            ghost
                                            size="small"
                                            defaultActiveKey={['storageSpecEditRedisMasterSlave', 'storageSpecEditRedisShard']}
                                            items={[
                                              {
                                                key: 'storageSpecEditRedisMasterSlave',
                                                label: '主从架构',
                                                children: (
                                                  <>
                                                    <Form.Item
                                                      label="版本"
                                                      name="redisMasterSlaveVersions"
                                                      rules={[{ required: true, message: '请选择 Redis 版本' }]}
                                                    >
                                                      <Select mode="multiple" style={{ width: '100%' }} options={REDIS_VERSION_OPTIONS} />
                                                    </Form.Item>
                                                    <Form.Item
                                                      label="规格"
                                                      name="redisMasterSlaveSpecs"
                                                      rules={[{ required: true, message: '请选择 Redis 规格' }]}
                                                    >
                                                      <Select mode="multiple" style={{ width: '100%' }} options={REDIS_SPEC_OPTIONS} />
                                                    </Form.Item>
                                                  </>
                                                )
                                              },
                                              {
                                                key: 'storageSpecEditRedisShard',
                                                label: '分片架构',
                                                children: (
                                                  <>
                                                    <Form.Item
                                                      label="版本"
                                                      name="redisShardVersions"
                                                      rules={[{ required: true, message: '请选择分片架构 Redis 版本' }]}
                                                    >
                                                      <Select mode="multiple" style={{ width: '100%' }} options={REDIS_VERSION_OPTIONS} />
                                                    </Form.Item>
                                                    <Form.Item
                                                      label="规格"
                                                      name="redisShardSpecs"
                                                      rules={[{ required: true, message: '请选择分片架构 Redis 规格' }]}
                                                    >
                                                      <Select mode="multiple" style={{ width: '100%' }} options={REDIS_SPEC_OPTIONS} />
                                                    </Form.Item>
                                                    <Form.Item label="分片数量范围">
                                                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                        <Form.Item
                                                          name="redisShardCountMin"
                                                          noStyle
                                                          rules={[
                                                            { required: true, message: '请输入最小分片数' },
                                                            { type: 'number', min: 1, max: 128, message: '最小值需在 1–128 之间' }
                                                          ]}
                                                        >
                                                          <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={1} max={128} placeholder="起始值" />
                                                        </Form.Item>
                                                        <div
                                                          style={{
                                                            width: 48,
                                                            height: 32,
                                                            lineHeight: '30px',
                                                            textAlign: 'center',
                                                            borderTop: '1px solid #d9d9d9',
                                                            borderBottom: '1px solid #d9d9d9',
                                                            background: '#fafafa'
                                                          }}
                                                        >
                                                          ~
                                                        </div>
                                                        <Form.Item
                                                          name="redisShardCountMax"
                                                          noStyle
                                                          rules={[
                                                            { required: true, message: '请输入最大分片数' },
                                                            { type: 'number', min: 1, max: 128, message: '最大值需在 1–128 之间' },
                                                            ({ getFieldValue }) => ({
                                                              validator(_, value) {
                                                                const min = getFieldValue('redisShardCountMin')
                                                                if (value === undefined || min === undefined || value >= min) {
                                                                  return Promise.resolve()
                                                                }
                                                                return Promise.reject(new Error('最大值需大于等于最小值'))
                                                              }
                                                            })
                                                          ]}
                                                        >
                                                          <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={1} max={128} placeholder="结束值" />
                                                        </Form.Item>
                                                      </div>
                                                    </Form.Item>
                                                  </>
                                                )
                                              }
                                            ]}
                                          />
                                        )
                                      },
                                      {
                                        key: 'storageSpecEditZk',
                                        label: 'Zookeeper',
                                        children: (
                                          <>
                                            <Form.Item
                                              label="版本"
                                              name="zookeeperVersions"
                                              rules={[{ required: true, message: '请选择 Zookeeper 版本' }]}
                                            >
                                              <Select mode="multiple" style={{ width: '100%' }} options={ZOOKEEPER_VERSION_OPTIONS} />
                                            </Form.Item>
                                            <Form.Item
                                              label="规格"
                                              name="zookeeperSpecs"
                                              rules={[{ required: true, message: '请选择 Zookeeper 规格' }]}
                                            >
                                              <Select mode="multiple" style={{ width: '100%' }} options={INSTANCE_SPEC_OPTIONS} />
                                            </Form.Item>
                                            <Form.Item
                                              label="节点数"
                                              name="zookeeperNodeCount"
                                              rules={[{ required: true }, { type: 'number', min: 1, max: 9 }]}
                                            >
                                              <InputNumber style={{ width: '100%' }} min={1} max={9} />
                                            </Form.Item>
                                          </>
                                        )
                                      }
                                    ]}
                                  />
                                )
                              }
                            ]}
                          />
                        </Card>}
                      </div>
                      <Space style={{ marginTop: 16 }}>
                        <Button
                          onClick={() => {
                            quotaForm.setFieldsValue({ ...DEFAULT_QUOTA, ...envQuota })
                            setQuotaEditingEnv(null)
                          }}
                        >
                          取消
                        </Button>
                        <Button type="primary" onClick={handleSaveQuota}>
                          确认
                        </Button>
                      </Space>
                    </Form>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
              </Space>
            )
          },
          {
            key: 'failure',
            label: '自动开服配置',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
        {/* 自动开服配置 Card：测试/正式环境上下排列 */}
        <Card title="自动开服配置">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {(['test', 'prod'] as const).map(envKey => {
              const envFailure = getEnvData(envKey).failure
              const isEditing = failureEditingEnv === envKey
              return (
                <div key={envKey} style={{ width: '100%' }}>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>
                    {envKey === 'test' ? '测试环境' : '正式环境'}
                  </Text>
                  {!isEditing ? (
                    <Space direction="vertical" size={8}>
                      <Space direction="vertical" size={4}>
                        {autoLaunchStepOptions.map(step => (
                          <Space key={step.key} align="center" size={8}>
                            {envFailure.steps.includes(step.key) ? (
                              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                            ) : (
                              <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 14 }} />
                            )}
                            <Text>{step.label}</Text>
                          </Space>
                        ))}
                      </Space>
                      <Space align="center" size={8}>
                        <Text>自动开服回退：</Text>
                        <Text style={{ color: envFailure.rollbackEnabled ? '#52c41a' : '#999' }}>
                          {envFailure.rollbackEnabled ? '已开启' : '未开启'}
                        </Text>
                      </Space>
                      <Button
                        type="link"
                        size="small"
                        style={{ paddingLeft: 0 }}
                        onClick={() => {
                          failureForm.setFieldsValue(envFailure)
                          setFailureEditingEnv(envKey)
                        }}
                      >
                        编辑
                      </Button>
                    </Space>
                  ) : (
                    <Form<FailureConfig>
                      form={failureForm}
                      layout="vertical"
                      initialValues={envFailure}
                    >
                      <Form.Item label="启用的自动开服步骤" name="steps">
                        <Checkbox.Group style={{ width: '100%' }}>
                          <Space direction="vertical">
                            <Checkbox value="strategy">配置开服策略</Checkbox>
                            <Checkbox value="monitor">开启默认监控</Checkbox>
                            <Checkbox value="notify">发送部署通知</Checkbox>
                            <Checkbox value="reserve">新建预备服</Checkbox>
                          </Space>
                        </Checkbox.Group>
                      </Form.Item>
                      <Form.Item label="自动开服回退" name="rollbackEnabled" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Space>
                        <Button
                          onClick={() => {
                            failureForm.setFieldsValue(envFailure)
                            setFailureEditingEnv(null)
                          }}
                        >
                          取消
                        </Button>
                        <Button type="primary" onClick={handleSaveFailureConfig}>
                          确认
                        </Button>
                      </Space>
                    </Form>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
              </Space>
            )
          },
          {
            key: 'healthCheck',
            label: '健康检查规则',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
                <Card title="健康检查规则">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {(['test', 'prod'] as const).map(envKey => {
                      const envHealthCheck = getEnvData(envKey).healthCheck
                      const isEditing = healthCheckEditingEnv === envKey
                      return (
                        <div key={envKey} style={{ width: '100%' }}>
                          <Text strong style={{ display: 'block', marginBottom: 12 }}>
                            {envKey === 'test' ? '测试环境' : '正式环境'}
                          </Text>
                          {!isEditing ? (
                            <Space direction="vertical" size={8}>
                              <Space align="center" size={8}>
                                <Text>是否开启健康检查：</Text>
                                <Text style={{ color: envHealthCheck.enabled ? '#52c41a' : '#999' }}>
                                  {envHealthCheck.enabled ? '是' : '否'}
                                </Text>
                              </Space>
                              <Space align="center" size={8}>
                                <Text>健康检查间隔：</Text>
                                <Text>{envHealthCheck.intervalSeconds} 秒</Text>
                              </Space>
                              {envHealthCheck.appThresholds.length > 0 && (
                                <Space direction="vertical" size={4}>
                                  <Text>应用与流量阈值：</Text>
                                  {envHealthCheck.appThresholds.map((item, i) => (
                                    <Text key={i} type="secondary">
                                      {item.appName}：流量低于平均值的 {item.thresholdPercent}% 时触发
                                    </Text>
                                  ))}
                                </Space>
                              )}
                              <Button
                                type="link"
                                size="small"
                                style={{ paddingLeft: 0 }}
                                onClick={() => {
                                  healthCheckForm.setFieldsValue(envHealthCheck)
                                  setHealthCheckEditingEnv(envKey)
                                }}
                              >
                                编辑
                              </Button>
                            </Space>
                          ) : (
                            <Form<HealthCheckConfig>
                              form={healthCheckForm}
                              layout="vertical"
                              initialValues={envHealthCheck}
                            >
                              <Form.Item
                                label="是否开启健康检查"
                                name="enabled"
                                rules={[{ required: true, message: '请选择是否开启' }]}
                              >
                                <Radio.Group>
                                  <Radio value={true}>是</Radio>
                                  <Radio value={false}>否</Radio>
                                </Radio.Group>
                              </Form.Item>
                              <Form.Item
                                label="健康检查间隔 (秒)"
                                name="intervalSeconds"
                                rules={[
                                  { required: true, message: '请输入健康检查间隔' },
                                  { type: 'number', min: 1, message: '间隔需大于 0' }
                                ]}
                              >
                                <InputNumber style={{ width: '100%' }} addonAfter="秒" />
                              </Form.Item>
                              <Form.Item label="应用与流量阈值">
                                <Form.List name="appThresholds">
                                  {(fields, { add, remove }) => (
                                    <>
                                      {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} align="center" style={{ display: 'flex', marginBottom: 8 }}>
                                          <Form.Item
                                            {...restField}
                                            name={[name, 'appName']}
                                            rules={[{ required: true, message: '请输入应用名称' }]}
                                            style={{ marginBottom: 0 }}
                                          >
                                            <Input placeholder="应用名称" style={{ width: 160 }} />
                                          </Form.Item>
                                          <Form.Item
                                            {...restField}
                                            name={[name, 'thresholdPercent']}
                                            rules={[{ required: true, message: '请输入阈值' }]}
                                            style={{ marginBottom: 0 }}
                                          >
                                            <InputNumber style={{ width: 100 }} placeholder="50" />
                                          </Form.Item>
                                          <Text type="secondary">流量低于平均值的 % 时触发健康检查</Text>
                                          <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => remove(name)}
                                          />
                                        </Space>
                                      ))}
                                      <Button
                                        type="dashed"
                                        onClick={() => add({ appName: '', thresholdPercent: 50 })}
                                        block
                                        icon={<PlusOutlined />}
                                      >
                                        添加一对
                                      </Button>
                                    </>
                                  )}
                                </Form.List>
                              </Form.Item>
                              <Space>
                                <Button
                                  onClick={() => {
                                    healthCheckForm.setFieldsValue(envHealthCheck)
                                    setHealthCheckEditingEnv(null)
                                  }}
                                >
                                  取消
                                </Button>
                                <Button type="primary" onClick={handleSaveHealthCheckConfig}>
                                  确认
                                </Button>
                              </Space>
                            </Form>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </Space>
            )
          },
          {
            key: 'mse',
            label: 'MSE 配置',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
        {/* MSE 配置 Card：测试/正式环境上下排列 */}
        <Card title="MSE 配置">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {(['test', 'prod'] as const).map(envKey => {
              const envMse = getEnvData(envKey).mse
              const isEditing = mseEditingEnv === envKey
              return (
                <div key={envKey} style={{ width: '100%' }}>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>
                    {envKey === 'test' ? '测试环境' : '正式环境'}
                  </Text>
                  {!isEditing ? (
                    <Space direction="vertical" size={8}>
                      <Space>
                        <Text>状态：</Text>
                        <Text style={{ color: envMse.enabled ? '#52c41a' : '#999' }}>
                          {envMse.enabled ? '已接入' : '未接入'}
                        </Text>
                      </Space>
                      {envMse.enabled ? (
                        <>
                          <Text>网关实例：{envMse.gatewayName}</Text>
                          <Text>命名空间：{envMse.namespace}</Text>
                          <Text>服务名：{envMse.serviceName}</Text>
                          <Text>路由前缀：{envMse.routePrefix}</Text>
                        </>
                      ) : (
                        <Text type="secondary">当前环境未接入 MSE 网关。</Text>
                      )}
                      <Button
                        type="link"
                        size="small"
                        style={{ paddingLeft: 0 }}
                        onClick={() => {
                          mseForm.setFieldsValue(envMse)
                          setMseEditingEnv(envKey)
                        }}
                      >
                        编辑
                      </Button>
                    </Space>
                  ) : (
                    <Form<MseConfig> form={mseForm} layout="vertical" initialValues={envMse}>
              <Form.Item
                label="启用 MSE 网关接入"
                name="enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const enabled = getFieldValue('enabled') as boolean
                  return (
                    <div
                      style={{
                        opacity: enabled ? 1 : 0.5,
                        pointerEvents: enabled ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      <Form.Item
                        label="网关实例名称"
                        name="gatewayName"
                        rules={[
                          { required: enabled, message: '请输入网关实例名称' }
                        ]}
                      >
                        <Input placeholder="例如：mse-gateway-prd" />
                      </Form.Item>
                      <Form.Item
                        label="命名空间"
                        name="namespace"
                        rules={[{ required: enabled, message: '请输入命名空间' }]}
                      >
                        <Input placeholder="例如：game-xxx-prd" />
                      </Form.Item>
                      <Form.Item
                        label="服务名"
                        name="serviceName"
                        rules={[{ required: enabled, message: '请输入服务名' }]}
                      >
                        <Input placeholder="例如：game-xxx-service" />
                      </Form.Item>
                      <Form.Item
                        label="路由前缀"
                        name="routePrefix"
                        rules={[{ required: enabled, message: '请输入路由前缀' }]}
                      >
                        <Input placeholder="例如：/game/xxx" />
                      </Form.Item>
                    </div>
                  )
                }}
              </Form.Item>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      mseForm.setFieldsValue(envMse)
                      setMseEditingEnv(null)
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    onClick={async () => {
                      try {
                        const values = await mseForm.validateFields()
                        setPendingMse(values)
                        setMseConfirmVisible(true)
                      } catch {
                        // 校验错误由表单项提示
                      }
                    }}
                  >
                    确认
                  </Button>
                </Space>
              </div>
            </Form>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
              </Space>
            )
          },
          {
            key: 'lambda',
            label: '客户端 Lambda 模版',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
        {/* 客户端 Lambda 模板：测试/正式环境并排展示 */}
        <Card title="客户端 Lambda 模版">
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            该 Lambda 模板用于从 S3 上下载并安全解压客户端版本 zip，结合以上步骤保障路径和文件安全。
          </Text>
          <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
            <Text>
              模板存储位置（示例）：
              <span style={{ color: '#1890ff' }}>
                s3://game-version-bucket/{gameConfig.appId}/version_handler.py
              </span>
            </Text>
          </Space>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {(['test', 'prod'] as const).map(envKey => {
              const envSteps = getEnvData(envKey).lambdaSteps
              const isEditing = lambdaEditingEnv === envKey
              return (
                <div key={envKey} style={{ width: '100%' }}>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>
                    {envKey === 'test' ? '测试环境' : '正式环境'}
                  </Text>
                  {!isEditing ? (
                    <Space direction="vertical" size={8}>
                      <Space direction="vertical" size={6}>
                        {lambdaStepOptions.map((step, index) => {
                          const enabled = envSteps.includes(step.key)
                          return (
                            <Space key={step.key} align="start" size={8}>
                              {enabled ? (
                                <CheckCircleFilled
                                  style={{ color: '#52c41a', fontSize: 14, marginTop: 2 }}
                                />
                              ) : (
                                <ClockCircleOutlined
                                  style={{ color: '#d9d9d9', fontSize: 14, marginTop: 2 }}
                                />
                              )}
                              <div>
                                <Text style={{ display: 'block' }}>
                                  {index + 1}. {step.title}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {step.desc}
                                </Text>
                              </div>
                            </Space>
                          )
                        })}
                      </Space>
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          style={{ paddingLeft: 0 }}
                          onClick={() => setLambdaEditingEnv(envKey)}
                        >
                          编辑步骤
                        </Button>
                        <Button type="link" size="small" onClick={() => setLambdaModalVisible(true)}>
                          查看 Lambda 源码
                        </Button>
                      </Space>
                    </Space>
                  ) : (
                    <Space direction="vertical" size={8}>
                      <Checkbox.Group
                        style={{ width: '100%' }}
                        value={envSteps}
                        onChange={values => {
                          setLambdaStepsByEnv(prev => ({
                            ...prev,
                            [envKey]: values as LambdaStepKey[]
                          }))
                        }}
                      >
                        <Space direction="vertical">
                          {lambdaStepOptions.map(step => (
                            <Checkbox key={step.key} value={step.key}>
                              <span style={{ fontWeight: 500 }}>{step.title}</span>
                              <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                                {step.desc}
                              </span>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                      <Space>
                        <Button onClick={() => setLambdaEditingEnv(null)}>取消</Button>
                        <Button
                          type="primary"
                          onClick={() => {
                            setLambdaEditingEnv(null)
                            message.success(`Lambda 步骤配置已更新（${envKey === 'test' ? '测试' : '正式'}环境）`)
                          }}
                        >
                          确认
                        </Button>
                      </Space>
                    </Space>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
              </Space>
            )
          }
        ]}
      />

      {/* 初始化配置二次确认弹窗 */}
      <Modal
        open={initConfirmVisible}
        title="确认更新？"
        onOk={() => {
          if (!pendingInit) {
            setInitConfirmVisible(false)
            return
          }
          setGameConfig(prev => {
            const envKey = pendingInitMeta?.envKey ?? activeEnv
            const sharedDeployType =
              pendingInit.deployType ??
              (envKey === 'test' ? prev.testInit.deployType : prev.prodInit.deployType)

            if (envKey === 'test') {
              return {
                ...prev,
                testInit: {
                  ...prev.testInit,
                  ...pendingInit,
                  deployType: sharedDeployType
                },
                prodInit: {
                  ...prev.prodInit,
                  deployType: sharedDeployType
                }
              }
            }

            return {
              ...prev,
              prodInit: {
                ...prev.prodInit,
                ...pendingInit,
                deployType: sharedDeployType
              },
              testInit: {
                ...prev.testInit,
                deployType: sharedDeployType
              }
            }
          })
          setInitConfirmVisible(false)
          setPendingInit(null)
          setPendingInitMeta(null)
          message.success('初始化配置已保存（仅当前环境）')
        }}
        onCancel={() => {
          setInitConfirmVisible(false)
          setPendingInit(null)
          setPendingInitMeta(null)
        }}
        okText="确认"
        cancelText="取消"
      >
        <p>
          {pendingInitMeta
            ? `将${pendingInitMeta.value ? '开启' : '关闭'} ${pendingInitMeta.label}（${pendingInitMeta.envKey === 'test' ? '测试环境' : '生产环境'}），是否继续？`
            : '将更新当前环境的初始化资源配置，是否继续？'}
        </p>
      </Modal>

      {/* MSE 配置二次确认弹窗 */}
      <Modal
        open={mseConfirmVisible}
        title="确认保存 MSE 配置"
        onOk={() => {
          if (!pendingMse) {
            setMseConfirmVisible(false)
            return
          }
          setGameConfig(prev => {
            const env = mseEditingEnv ?? activeEnv
            if (env === 'test') {
              return { ...prev, testMse: pendingMse }
            }
            return { ...prev, prodMse: pendingMse }
          })
          setMseConfirmVisible(false)
          setMseEditingEnv(null)
          setPendingMse(null)
          message.success('MSE 配置已保存（仅当前环境）')
        }}
        onCancel={() => {
          setMseConfirmVisible(false)
        }}
        okText="确认保存"
        cancelText="取消"
      >
        <p>将更新当前环境的 MSE 网关接入信息，可能影响流量入口与路由行为，是否继续？</p>
      </Modal>

      {/* 限额配置二次确认弹窗 */}
      <Modal
        open={quotaConfirmVisible}
        title="确认保存限额配置"
        onOk={() => {
          if (!pendingQuota) {
            setQuotaConfirmVisible(false)
            return
          }
          setGameConfig(prev => {
            const env = quotaEditingEnv ?? activeEnv
            if (env === 'test') {
              return { ...prev, testQuota: pendingQuota }
            }
            return { ...prev, prodQuota: pendingQuota }
          })
          setQuotaConfirmVisible(false)
          setQuotaEditingEnv(null)
          setPendingQuota(null)
          message.success('限额配置已保存（仅当前环境）')
        }}
        onCancel={() => {
          setQuotaConfirmVisible(false)
        }}
        okText="确认保存"
        cancelText="取消"
      >
        <p>将更新当前环境的资源限额配置，保存后会影响实际资源占用上限，是否继续？</p>
      </Modal>

      {/* 自动开服配置二次确认弹窗 */}
      <Modal
        open={failureConfirmVisible}
        title="确认保存自动开服配置"
        onOk={() => {
          if (!pendingFailure) {
            setFailureConfirmVisible(false)
            return
          }
          setGameConfig(prev => {
            const env = failureEditingEnv ?? activeEnv
            if (env === 'test') {
              return { ...prev, testFailure: pendingFailure }
            }
            return { ...prev, prodFailure: pendingFailure }
          })
          setFailureConfirmVisible(false)
          setFailureEditingEnv(null)
          setPendingFailure(null)
          message.success('自动开服配置已保存（仅当前环境）')
        }}
        onCancel={() => {
          setFailureConfirmVisible(false)
        }}
        okText="确认保存"
        cancelText="取消"
      >
        <p>将更新当前环境的自动开服模版步骤与自动回退开关，可能影响开服流程行为，是否继续？</p>
      </Modal>

      {/* 健康检查规则二次确认弹窗 */}
      <Modal
        open={healthCheckConfirmVisible}
        title="确认保存健康检查规则"
        onOk={() => {
          if (!pendingHealthCheck) {
            setHealthCheckConfirmVisible(false)
            return
          }
          setGameConfig(prev => {
            const config: HealthCheckConfig = {
              ...pendingHealthCheck,
              appThresholds: pendingHealthCheck.appThresholds ?? []
            }
            const env = healthCheckEditingEnv ?? activeEnv
            if (env === 'test') {
              return { ...prev, testHealthCheck: config }
            }
            return { ...prev, prodHealthCheck: config }
          })
          setHealthCheckConfirmVisible(false)
          setHealthCheckEditingEnv(null)
          setPendingHealthCheck(null)
          message.success('健康检查规则已保存（仅当前环境）')
        }}
        onCancel={() => {
          setHealthCheckConfirmVisible(false)
        }}
        okText="确认保存"
        cancelText="取消"
      >
        <p>将更新当前环境的健康检查规则，可能影响流量监控与告警行为，是否继续？</p>
      </Modal>

      {/* Lambda 模板源码查看弹窗（只读） */}
      <Modal
        open={lambdaModalVisible}
        title="客户端版本文件 Lambda 模板源码（只读）"
        footer={
          <Button type="primary" onClick={() => setLambdaModalVisible(false)}>
            关闭
          </Button>
        }
        onCancel={() => setLambdaModalVisible(false)}
        width={720}
      >
        <div
          style={{
            maxHeight: 480,
            overflow: 'auto',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 8,
            fontFamily:
              '"Fira Code","JetBrains Mono","Monaco","Consolas",monospace',
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {lambdaTemplateSource}
          </pre>
        </div>
      </Modal>

      {/* 初始化日志弹窗 */}
      <Modal
        open={initLogModalOpen}
        title={initLogModalTitle}
        onCancel={() => setInitLogModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => setInitLogModalOpen(false)}>
            关闭
          </Button>
        }
        width={720}
      >
        <div
          style={{
            maxHeight: 420,
            overflow: 'auto',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 8,
            fontFamily: '"Fira Code","JetBrains Mono","Monaco","Consolas",monospace',
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{initLogModalContent}</pre>
        </div>
      </Modal>
    </Card>
  )
}


