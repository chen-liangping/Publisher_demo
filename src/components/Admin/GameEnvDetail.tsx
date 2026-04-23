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
  Col,
  Progress,
  Popconfirm,
  Alert
} from 'antd'
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudServerOutlined,
  RadarChartOutlined,
  PlusOutlined,
  DeleteOutlined,
  PoweroffOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

// 下线资源类型
interface OfflineResource {
  id: string
  name: string
  category: string
  type: string
  count: number
  status: 'pending' | 'deleting' | 'completed' | 'failed'
  details?: string[]
}

// 下线进度状态
interface OfflineProgress {
  environment: 'test' | 'prod'
  appId: string
  isOfflineInProgress: boolean
  resources: OfflineResource[]
  currentStep: number
  totalSteps: number
}

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
    clientStatus: 'completed',
    serverStatus: 'completed',
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


// 模拟数据：云原生架构示例
const mockContainerGameConfig: GameEnvConfig = {
  appId: 'testgame',
  description: '云原生部署示例应用，用于演示容器化环境配置',
  createdAt: '2024-01-14 15:20:00',
  testInit: {
    clientStatus: 'completed',
    serverStatus: 'completed',
    clientResource: true,
    serverResource: true,
    globalAcceleration: false,
    deployType: 'container'
  },
  prodInit: {
    clientStatus: 'completed',
    serverStatus: 'not_initialized',
    clientResource: true,
    serverResource: false,
    globalAcceleration: false,
    deployType: 'container'
  },
  testQuota: {
    cpuCores: 4,
    vmCpuCores: 0,
    memoryGB: 64,
    vmDiskTotalSizeGB: 0,
    vmAllowedSpecs: [],
    maxPodReplicasPerPod: 15,
    maxAppsPerGame: 80,
    maxCronJobsPerGame: 30,
    maxImagesPerGame: 200,
    gracefulShutdownThresholdSec: 45,
    storageInstancesLimit: 8,
    storageBackupEnabled: true,
    mysqlVersions: ['8.0'],
    mysqlSpecs: ['4核8G'],
    redisMasterSlaveVersions: ['6.0', '7.0'],
    redisMasterSlaveSpecs: ['2GB'],
    redisShardVersions: ['6.0', '7.0'],
    redisShardSpecs: ['2GB'],
    redisShardCountMin: 3,
    redisShardCountMax: 6,
    mongoReplicaVersions: ['5.0', '6.0'],
    mongoReplicaSpecs: ['4核8G'],
    mongoShardedVersions: ['5.0', '6.0'],
    mongoShardMongosCountMin: 3,
    mongoShardMongosCountMax: 3,
    mongoShardMongodCountMin: 3,
    mongoShardMongodCountMax: 3,
    mongoShardConfigCountMin: 1,
    mongoShardConfigCountMax: 1,
    mongoShardMongosSpecs: ['4核8G'],
    mongoShardMongodSpecs: ['4核8G'],
    mongoShardConfigSpecs: ['4核8G'],
    zookeeperVersions: ['3.8', '3.9'],
    zookeeperSpecs: ['2核4G'],
    zookeeperNodeCount: 3
  },
  prodQuota: {
    cpuCores: 16,
    vmCpuCores: 0,
    memoryGB: 512,
    vmDiskTotalSizeGB: 0,
    vmAllowedSpecs: [],
    maxPodReplicasPerPod: 50,
    maxAppsPerGame: 300,
    maxCronJobsPerGame: 100,
    maxImagesPerGame: 800,
    gracefulShutdownThresholdSec: 60,
    storageInstancesLimit: 20,
    storageBackupEnabled: true,
    mysqlVersions: ['8.0'],
    mysqlSpecs: ['8核16G', '16核32G'],
    redisMasterSlaveVersions: ['7.0'],
    redisMasterSlaveSpecs: ['4GB', '8GB'],
    redisShardVersions: ['7.0'],
    redisShardSpecs: ['4GB', '8GB'],
    redisShardCountMin: 6,
    redisShardCountMax: 12,
    mongoReplicaVersions: ['6.0'],
    mongoReplicaSpecs: ['8核16G'],
    mongoShardedVersions: ['6.0'],
    mongoShardMongosCountMin: 3,
    mongoShardMongosCountMax: 6,
    mongoShardMongodCountMin: 6,
    mongoShardMongodCountMax: 12,
    mongoShardConfigCountMin: 3,
    mongoShardConfigCountMax: 3,
    mongoShardMongosSpecs: ['8核16G'],
    mongoShardMongodSpecs: ['8核16G'],
    mongoShardConfigSpecs: ['8核16G'],
    zookeeperVersions: ['3.9'],
    zookeeperSpecs: ['4核8G'],
    zookeeperNodeCount: 5
  },
  testFailure: {
    rollbackEnabled: true,
    steps: ['strategy', 'monitor', 'notify']
  },
  prodFailure: {
    rollbackEnabled: true,
    steps: ['strategy', 'monitor', 'notify', 'reserve']
  },
  testMse: {
    enabled: true,
    gatewayName: 'testgame-test-gateway',
    namespace: 'testgame-test',
    serviceName: 'testgame-test-service',
    routePrefix: '/api/test'
  },
  prodMse: {
    enabled: false,
    gatewayName: '',
    namespace: '',
    serviceName: '',
    routePrefix: ''
  },
  testHealthCheck: {
    enabled: true,
    intervalSeconds: 30,
    appThresholds: [
      { appName: 'testgame-server', thresholdPercent: 85 },
      { appName: 'testgame-gateway', thresholdPercent: 90 }
    ]
  },
  prodHealthCheck: {
    enabled: false,
    intervalSeconds: 60,
    appThresholds: []
  },
  globalMonitoring: {
    grafanaConfig: false,
    cdnConfig: false
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

// 根据环境和部署类型获取下线资源列表
const getOfflineResources = (appId: string, environment: 'test' | 'prod', deployType: 'vm' | 'container' | ''): OfflineResource[] => {
  const envPrefix = environment === 'test' ? 'test' : 'prod'
  const isProd = environment === 'prod'
  
  // AWS 资源（所有部署类型都有）
  const awsResources: OfflineResource[] = [
    { 
      id: 'aws-iam', 
      name: 'IAM', 
      type: 'IAM User',
      category: 'AWS', 
      count: 1,
      status: 'pending',
      details: [`${appId}-${envPrefix}-user`]
    },
    { 
      id: 'aws-cloudfront', 
      name: 'CloudFront', 
      type: 'CDN 分发',
      category: 'AWS', 
      count: isProd ? 2 : 1,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-main-dist`, `${appId}-${envPrefix}-backup-dist`]
        : [`${appId}-${envPrefix}-distribution`]
    },
    { 
      id: 'aws-s3', 
      name: 'S3', 
      type: 'S3 Bucket',
      category: 'AWS', 
      count: isProd ? 4 : 2,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-logs`, `${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-temp`]
        : [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-logs`]
    },
    { 
      id: 'aws-route53', 
      name: 'Route53', 
      type: 'DNS 记录',
      category: 'AWS', 
      count: isProd ? 3 : 2,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}.example.com`, `api-${appId}-${envPrefix}.example.com`, `cdn-${appId}-${envPrefix}.example.com`]
        : [`${appId}-${envPrefix}.example.com`, `api-${appId}-${envPrefix}.example.com`]
    }
  ]

  // 阿里云基础资源
  const aliBaseResources: OfflineResource[] = [
    { 
      id: 'ali-ram', 
      name: 'RAM', 
      type: 'RAM User',
      category: 'AliCloud', 
      count: 2,
      status: 'pending',
      details: [`${appId}-${envPrefix}-oss-user`, `${appId}-${envPrefix}-ecs-user`]
    },
    { 
      id: 'ali-tair', 
      name: 'Tair', 
      type: 'Redis 缓存',
      category: 'AliCloud', 
      count: isProd ? 3 : 2,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-session`, `${appId}-${envPrefix}-data`, `${appId}-${envPrefix}-cache`]
        : [`${appId}-${envPrefix}-session`, `${appId}-${envPrefix}-data`]
    },
    { 
      id: 'ali-acr', 
      name: 'ACR_NS', 
      type: 'ACR Namespace',
      category: 'AliCloud', 
      count: isProd ? 5 : 3,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-server`, `${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-tools`, `${appId}-${envPrefix}-monitor`, `${appId}-${envPrefix}-backup`]
        : [`${appId}-${envPrefix}-server`, `${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-tools`]
    },
    { 
      id: 'ali-polardb', 
      name: 'PolarDB', 
      type: '数据库集群',
      category: 'AliCloud', 
      count: isProd ? 2 : 1,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-main-cluster`, `${appId}-${envPrefix}-backup-cluster`]
        : [`${appId}-${envPrefix}-cluster`]
    },
    { 
      id: 'ali-mongodb', 
      name: 'MongoDB', 
      type: 'MongoDB 集群',
      category: 'AliCloud', 
      count: isProd ? 2 : 1,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-replica-set`, `${appId}-${envPrefix}-shard-cluster`]
        : [`${appId}-${envPrefix}-replica-set`]
    },
    { 
      id: 'ali-mse', 
      name: 'MSE', 
      type: 'MSE Gateway',
      category: 'AliCloud', 
      count: isProd ? 4 : 2,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-nacos`, `${appId}-${envPrefix}-ingress`, `${appId}-${envPrefix}-config`]
        : [`${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-nacos`]
    },
    { 
      id: 'ali-oss', 
      name: 'OSS', 
      type: 'OSS Bucket',
      category: 'AliCloud', 
      count: isProd ? 3 : 2,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-logs`]
        : [`${appId}-${envPrefix}-assets`, `${appId}-${envPrefix}-backup`]
    },
    { 
      id: 'ali-ga', 
      name: 'GA', 
      type: '全球加速',
      category: 'AliCloud', 
      count: isProd ? 2 : 1,
      status: 'pending',
      details: isProd 
        ? [`${appId}-${envPrefix}-accelerator`, `${appId}-${envPrefix}-backup-acc`]
        : [`${appId}-${envPrefix}-accelerator`]
    }
  ]

  if (deployType === 'vm') {
    // VM 部署架构资源
    const vmResources: OfflineResource[] = [
      { 
        id: 'ali-ecs', 
        name: 'ECS', 
        type: '虚拟机实例',
        category: 'AliCloud', 
        count: isProd ? 6 : 3,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-app-01`, `${appId}-${envPrefix}-app-02`, `${appId}-${envPrefix}-app-03`, `${appId}-${envPrefix}-gateway-01`, `${appId}-${envPrefix}-gateway-02`, `${appId}-${envPrefix}-monitor`]
          : [`${appId}-${envPrefix}-app-01`, `${appId}-${envPrefix}-gateway-01`, `${appId}-${envPrefix}-monitor`]
      },
      { 
        id: 'ali-clb', 
        name: 'CLB', 
        type: '经典负载均衡',
        category: 'AliCloud', 
        count: isProd ? 2 : 1,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-app-clb`, `${appId}-${envPrefix}-gateway-clb`]
          : [`${appId}-${envPrefix}-main-clb`]
      }
    ]
    return [...awsResources, ...aliBaseResources, ...vmResources]
  } else if (deployType === 'container') {
    // 云原生 Kubernetes 资源
    const k8sResources: OfflineResource[] = [
      { 
        id: 'k8s-deployment', 
        name: 'K8sDeployment', 
        type: 'Deployment',
        category: 'Kubernetes', 
        count: isProd ? 8 : 5,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-server`, `${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-worker`, `${appId}-${envPrefix}-scheduler`, `${appId}-${envPrefix}-monitor`, `${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-cache`, `${appId}-${envPrefix}-proxy`]
          : [`${appId}-${envPrefix}-server`, `${appId}-${envPrefix}-gateway`, `${appId}-${envPrefix}-worker`, `${appId}-${envPrefix}-scheduler`, `${appId}-${envPrefix}-monitor`]
      },
      { 
        id: 'k8s-hpa', 
        name: 'K8sHPA', 
        type: 'HPA 自动扩缩',
        category: 'Kubernetes', 
        count: isProd ? 6 : 4,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-server-hpa`, `${appId}-${envPrefix}-gateway-hpa`, `${appId}-${envPrefix}-worker-hpa`, `${appId}-${envPrefix}-scheduler-hpa`, `${appId}-${envPrefix}-cache-hpa`, `${appId}-${envPrefix}-proxy-hpa`]
          : [`${appId}-${envPrefix}-server-hpa`, `${appId}-${envPrefix}-gateway-hpa`, `${appId}-${envPrefix}-worker-hpa`, `${appId}-${envPrefix}-scheduler-hpa`]
      },
      { 
        id: 'k8s-cronjob', 
        name: 'K8sCronJob', 
        type: 'CronJob 定时任务',
        category: 'Kubernetes', 
        count: isProd ? 4 : 2,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-cleanup`, `${appId}-${envPrefix}-report`, `${appId}-${envPrefix}-health-check`]
          : [`${appId}-${envPrefix}-backup`, `${appId}-${envPrefix}-cleanup`]
      },
      { 
        id: 'k8s-job', 
        name: 'K8sJob', 
        type: 'Job 任务',
        category: 'Kubernetes', 
        count: isProd ? 3 : 2,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-init-db`, `${appId}-${envPrefix}-migrate`, `${appId}-${envPrefix}-seed-data`]
          : [`${appId}-${envPrefix}-init-db`, `${appId}-${envPrefix}-migrate`]
      },
      { 
        id: 'k8s-service', 
        name: 'K8sService', 
        type: 'Service 服务',
        category: 'Kubernetes', 
        count: isProd ? 8 : 5,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-server-svc`, `${appId}-${envPrefix}-gateway-svc`, `${appId}-${envPrefix}-worker-svc`, `${appId}-${envPrefix}-scheduler-svc`, `${appId}-${envPrefix}-monitor-svc`, `${appId}-${envPrefix}-cache-svc`, `${appId}-${envPrefix}-proxy-svc`, `${appId}-${envPrefix}-backup-svc`]
          : [`${appId}-${envPrefix}-server-svc`, `${appId}-${envPrefix}-gateway-svc`, `${appId}-${envPrefix}-worker-svc`, `${appId}-${envPrefix}-scheduler-svc`, `${appId}-${envPrefix}-monitor-svc`]
      },
      { 
        id: 'k8s-ingress', 
        name: 'K8sIngress', 
        type: 'Ingress 路由',
        category: 'Kubernetes', 
        count: isProd ? 3 : 2,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-api-ingress`, `${appId}-${envPrefix}-web-ingress`, `${appId}-${envPrefix}-admin-ingress`]
          : [`${appId}-${envPrefix}-api-ingress`, `${appId}-${envPrefix}-web-ingress`]
      },
      { 
        id: 'k8s-configmap', 
        name: 'K8sConfigMap', 
        type: 'ConfigMap 配置',
        category: 'Kubernetes', 
        count: isProd ? 6 : 4,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-app-config`, `${appId}-${envPrefix}-db-config`, `${appId}-${envPrefix}-cache-config`, `${appId}-${envPrefix}-monitor-config`, `${appId}-${envPrefix}-log-config`, `${appId}-${envPrefix}-backup-config`]
          : [`${appId}-${envPrefix}-app-config`, `${appId}-${envPrefix}-db-config`, `${appId}-${envPrefix}-cache-config`, `${appId}-${envPrefix}-monitor-config`]
      },
      { 
        id: 'k8s-pvc', 
        name: 'K8sPVC', 
        type: 'PVC 存储卷',
        category: 'Kubernetes', 
        count: isProd ? 5 : 3,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-data-pvc`, `${appId}-${envPrefix}-logs-pvc`, `${appId}-${envPrefix}-backup-pvc`, `${appId}-${envPrefix}-cache-pvc`, `${appId}-${envPrefix}-temp-pvc`]
          : [`${appId}-${envPrefix}-data-pvc`, `${appId}-${envPrefix}-logs-pvc`, `${appId}-${envPrefix}-backup-pvc`]
      },
      { 
        id: 'k8s-pv', 
        name: 'K8sPV', 
        type: 'PV 持久卷',
        category: 'Kubernetes', 
        count: isProd ? 5 : 3,
        status: 'pending',
        details: isProd 
          ? [`${appId}-${envPrefix}-data-pv`, `${appId}-${envPrefix}-logs-pv`, `${appId}-${envPrefix}-backup-pv`, `${appId}-${envPrefix}-cache-pv`, `${appId}-${envPrefix}-temp-pv`]
          : [`${appId}-${envPrefix}-data-pv`, `${appId}-${envPrefix}-logs-pv`, `${appId}-${envPrefix}-backup-pv`]
      },
      { 
        id: 'k8s-namespace', 
        name: 'K8sNamespace', 
        type: 'Namespace 命名空间',
        category: 'Kubernetes', 
        count: 1,
        status: 'pending',
        details: [`${appId}-${envPrefix}`]
      }
    ]

    // 平台内部数据
    const platformResources: OfflineResource[] = [
      { 
        id: 'platform-appdata', 
        name: 'AppData', 
        type: '应用数据',
        category: '平台内部数据', 
        count: isProd ? 8 : 5,
        status: 'pending',
        details: isProd 
          ? [`用户数据表`, `游戏配置表`, `统计数据表`, `日志数据表`, `缓存数据表`, `备份数据表`, `监控数据表`, `审计数据表`]
          : [`用户数据表`, `游戏配置表`, `统计数据表`, `日志数据表`, `缓存数据表`]
      }
    ]

    return [...awsResources, ...aliBaseResources, ...k8sResources, ...platformResources]
  }

  // 默认返回基础资源
  return [...awsResources, ...aliBaseResources]
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

  React.useEffect(() => {
    // 产品意图：把“测试环境是否完成初始化”同步到全局，供顶栏环境切换做前置校验。
    const isTestEnvInitialized =
      gameConfig.testInit.clientStatus === 'completed' &&
      gameConfig.testInit.serverStatus === 'completed'
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'publisher_demo_test_env_initialized',
        isTestEnvInitialized ? '1' : '0'
      )
    }
  }, [gameConfig.testInit.clientStatus, gameConfig.testInit.serverStatus])

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

  // 下线相关状态
  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress | null>(null)
  const [isOfflineModalVisible, setIsOfflineModalVisible] = useState(false)

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

  // 开始环境下线
  const handleStartOffline = (environment: 'test' | 'prod'): void => {
    const envData = getEnvData(environment)
    const deployType = envData.init.deployType as 'vm' | 'container' | ''
    const resources = getOfflineResources(gameConfig.appId, environment, deployType)
    const totalResourceCount = resources.reduce((sum, resource) => sum + resource.count, 0)
    
    const progress: OfflineProgress = {
      environment,
      appId: gameConfig.appId,
      isOfflineInProgress: true,
      resources,
      currentStep: 0,
      totalSteps: totalResourceCount
    }
    setOfflineProgress(progress)
    setIsOfflineModalVisible(true)
    
    // 开始异步删除资源
    startResourceDeletion(progress)
  }

  // 模拟资源删除过程
  const startResourceDeletion = (progress: OfflineProgress): void => {
    let currentIndex = 0
    let completedResourceCount = 0
    
    const deleteNextResource = () => {
      if (currentIndex >= progress.resources.length) {
        // 所有资源删除完成
        setOfflineProgress(prev => prev ? {
          ...prev,
          isOfflineInProgress: false,
          currentStep: progress.totalSteps
        } : null)
        
        // 更新游戏配置，标记环境为未初始化
        setGameConfig(prev => {
          if (progress.environment === 'test') {
            return {
              ...prev,
              testInit: { 
                ...prev.testInit, 
                clientStatus: 'not_initialized',
                serverStatus: 'not_initialized'
              }
            }
          } else {
            return {
              ...prev,
              prodInit: { 
                ...prev.prodInit, 
                clientStatus: 'not_initialized',
                serverStatus: 'not_initialized'
              }
            }
          }
        })
        
        message.success(`${progress.environment === 'test' ? '测试' : '正式'}环境已成功下线`)
        
        setTimeout(() => {
          setIsOfflineModalVisible(false)
          setOfflineProgress(null)
        }, 2000)
        return
      }

      const resource = progress.resources[currentIndex]
      
      // 更新当前资源状态为删除中
      setOfflineProgress(prev => prev ? {
        ...prev,
        resources: prev.resources.map(r => 
          r.id === resource.id ? { ...r, status: 'deleting' } : r
        )
      } : null)

      // 模拟删除时间（2-4秒，根据资源数量调整）
      const deleteTime = Math.random() * 2000 + 2000 + (resource.count * 200)
      
      setTimeout(() => {
        // 模拟删除成功/失败（90%成功率）
        const isSuccess = Math.random() > 0.1
        
        setOfflineProgress(prev => prev ? {
          ...prev,
          currentStep: completedResourceCount + (isSuccess ? resource.count : 0),
          resources: prev.resources.map(r => 
            r.id === resource.id ? { 
              ...r, 
              status: isSuccess ? 'completed' : 'failed' 
            } : r
          )
        } : null)

        if (isSuccess) {
          completedResourceCount += resource.count
          currentIndex++
          // 继续删除下一个资源
          setTimeout(deleteNextResource, 800)
        } else {
          message.error(`删除 ${resource.type} 失败，请重试`)
        }
      }, deleteTime)
    }

    deleteNextResource()
  }

  // 重试失败的资源
  const retryFailedResource = (resourceId: string): void => {
    if (!offlineProgress) return
    
    const resource = offlineProgress.resources.find(r => r.id === resourceId)
    if (!resource) return

    setOfflineProgress(prev => prev ? {
      ...prev,
      resources: prev.resources.map(r => 
        r.id === resourceId ? { ...r, status: 'deleting' } : r
      )
    } : null)

    // 模拟重试删除
    const retryTime = Math.random() * 1500 + 1500 + (resource.count * 150)
    
    setTimeout(() => {
      const isSuccess = Math.random() > 0.15 // 重试时85%成功率
      
      setOfflineProgress(prev => {
        if (!prev) return null
        
        const updatedResources = prev.resources.map(r => 
          r.id === resourceId ? { 
            ...r, 
            status: (isSuccess ? 'completed' : 'failed') as OfflineResource['status']
          } : r
        )
        
        // 重新计算当前步骤
        const completedCount = updatedResources
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + r.count, 0)
        
        return {
          ...prev,
          currentStep: completedCount,
          resources: updatedResources
        }
      })

      if (isSuccess) {
        message.success(`${resource.type} 删除成功`)
        
        // 检查是否所有资源都删除完成
        setTimeout(() => {
          if (!offlineProgress) return
          
          const allCompleted = offlineProgress.resources.every(r => 
            r.status === 'completed'
          )
          
          if (allCompleted) {
            setOfflineProgress(prev => prev ? {
              ...prev,
              isOfflineInProgress: false,
              currentStep: prev.totalSteps
            } : null)
            
            // 更新游戏配置，标记环境为未初始化
            setGameConfig(prev => {
              if (offlineProgress.environment === 'test') {
                return {
                  ...prev,
                  testInit: { 
                    ...prev.testInit, 
                    clientStatus: 'not_initialized',
                    serverStatus: 'not_initialized'
                  }
                }
              } else {
                return {
                  ...prev,
                  prodInit: { 
                    ...prev.prodInit, 
                    clientStatus: 'not_initialized',
                    serverStatus: 'not_initialized'
                  }
                }
              }
            })
            
            message.success(`${offlineProgress.environment === 'test' ? '测试' : '正式'}环境已成功下线`)
            
            setTimeout(() => {
              setIsOfflineModalVisible(false)
              setOfflineProgress(null)
            }, 2000)
          }
        }, 100)
      } else {
        message.error(`重试删除 ${resource.type} 失败`)
      }
    }, retryTime)
  }

  const getDeployLabel = (deployType: string) =>
    deployType === 'vm' ? '虚机部署' : deployType === 'container' ? '云原生部署' : '待配置'
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
              icon={<ArrowLeftOutlined />}
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

          {(() => {
            const testEnvDone =
              gameConfig.testInit.clientStatus === 'completed' &&
              gameConfig.testInit.serverStatus === 'completed'

            return (
          <Collapse
            ghost
            expandIconPosition="start"
            defaultActiveKey={testEnvDone ? ['test-init', 'prod-init'] : ['test-init']}
            items={([
              { envKey: 'test' as const, title: '测试环境初始化', key: 'test-init' },
              { envKey: 'prod' as const, title: '正式环境初始化', key: 'prod-init' }
            ] as const).map(env => {
              const envInit = env.envKey === 'test' ? gameConfig.testInit : gameConfig.prodInit
              const envClientInitialized = envInit.clientStatus === 'completed'
              const envServerInitialized = envInit.serverStatus === 'completed'
              const envDone = envClientInitialized && envServerInitialized
              const isProdLocked = env.envKey === 'prod' && !testEnvDone
              return {
                key: env.key,
                disabled: isProdLocked,
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
                    <Space size={8}>
                      <Text>{env.title}</Text>
                      {isProdLocked ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          （请先完成测试环境初始化）
                        </Text>
                      ) : null}
                    </Space>
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
                  <div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))',
                        gap: '14px 24px',
                        paddingBottom: 16
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
                    
                    {/* 环境管理操作区 */}
                    {(envClientInitialized || envServerInitialized) && (
                      <div style={{ 
                        borderTop: '1px solid #f0f0f0', 
                        paddingTop: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>环境管理</Text>
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              下线将删除该环境的所有资源，包括云服务、存储、网络配置等
                            </Text>
                          </div>
                        </div>
                        <Popconfirm
                          title={`确认下线${env.envKey === 'test' ? '测试' : '正式'}环境`}
                          description={
                            <div>
                              <div style={{ marginBottom: 8 }}>
                                下线操作将删除 <strong>{gameConfig.appId}</strong> {env.envKey === 'test' ? '测试' : '正式'}环境的所有相关资源。
                              </div>
                              <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                ⚠️ 此操作不可撤销，请谨慎操作！
                              </div>
                            </div>
                          }
                          onConfirm={() => handleStartOffline(env.envKey)}
                          okText="确认下线"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                        >
                          <Button 
                            icon={<PoweroffOutlined />}
                            danger
                            size="small"
                          >
                            下线环境
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                )
              }
            })}
          />
            )
          })()}
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
                              {isContainer ? '云原生部署' : '虚机部署'}
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
                                {isContainer ? '云原生部署' : '虚机部署'}
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

      {/* 环境下线进度弹窗 */}
      <Modal
        title={`${offlineProgress?.environment === 'test' ? '测试' : '正式'}环境下线进度 - ${offlineProgress?.appId || ''}`}
        open={isOfflineModalVisible}
        footer={
          offlineProgress?.isOfflineInProgress ? (
            <Button onClick={() => setIsOfflineModalVisible(false)}>
              后台运行
            </Button>
          ) : (
            <Button type="primary" onClick={() => setIsOfflineModalVisible(false)}>
              关闭
            </Button>
          )
        }
        closable={!offlineProgress?.isOfflineInProgress}
        maskClosable={false}
        width={700}
      >
        {offlineProgress && (
          <div>
            <Alert
              message={`正在下线 ${offlineProgress.environment === 'test' ? '测试' : '正式'} 环境`}
              description={`将删除 ${offlineProgress.appId} ${offlineProgress.environment === 'test' ? '测试' : '正式'}环境的所有相关资源，包括云服务、存储、网络配置等。`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>整体进度</span>
                <span>{offlineProgress.currentStep} / {offlineProgress.totalSteps}</span>
              </div>
              <Progress 
                percent={Math.round((offlineProgress.currentStep / offlineProgress.totalSteps) * 100)}
                status={offlineProgress.isOfflineInProgress ? 'active' : 'success'}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Typography.Title level={5}>资源删除详情</Typography.Title>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {offlineProgress.resources.map(resource => (
                  <div 
                    key={resource.id}
                    style={{
                      padding: '12px',
                      marginBottom: 12,
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      background: resource.status === 'completed' ? '#f6ffed' : 
                                 resource.status === 'failed' ? '#fff2f0' :
                                 resource.status === 'deleting' ? '#e6f7ff' : '#fafafa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 500, fontSize: 14 }}>{resource.name}</span>
                          <span style={{ 
                            background: '#f0f0f0', 
                            padding: '2px 6px', 
                            borderRadius: 4, 
                            fontSize: 11,
                            color: '#666'
                          }}>
                            {resource.count} 个
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                          {resource.category} · {resource.type}
                        </div>
                        {resource.details && (
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {resource.details.slice(0, 3).map((detail, index) => (
                              <div key={index} style={{ marginBottom: 2 }}>• {detail}</div>
                            ))}
                            {resource.details.length > 3 && (
                              <div style={{ fontStyle: 'italic' }}>... 等 {resource.details.length} 个资源</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                        {resource.status === 'pending' && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>等待中</Typography.Text>
                        )}
                        {resource.status === 'deleting' && (
                          <Typography.Text style={{ color: '#1890ff', fontSize: 12 }}>删除中...</Typography.Text>
                        )}
                        {resource.status === 'completed' && (
                          <Typography.Text style={{ color: '#52c41a', fontSize: 12, fontWeight: 500 }}>
                            ✓ 已完成
                          </Typography.Text>
                        )}
                        {resource.status === 'failed' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Typography.Text type="danger" style={{ fontSize: 12 }}>删除失败</Typography.Text>
                            <Button 
                              size="small" 
                              type="link"
                              style={{ padding: '0 4px', height: 20, fontSize: 11 }}
                              onClick={() => retryFailedResource(resource.id)}
                            >
                              重试
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!offlineProgress.isOfflineInProgress && (
              <div style={{ 
                padding: 12, 
                background: '#f6ffed', 
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                textAlign: 'center'
              }}>
                <Typography.Text style={{ color: '#52c41a', fontWeight: 500 }}>
                  🎉 {offlineProgress.environment === 'test' ? '测试' : '正式'}环境下线完成！所有资源已成功删除。
                </Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  )
}


