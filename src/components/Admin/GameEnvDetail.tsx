'use client'

/**
 * 这段代码实现了「按 appId 查看/配置测试&生产环境的初始化配置、限额配置和开服失败配置」的详情页，
 * 使用了 Ant Design 的 Tabs、Card、Form 等组件，并基于 ResourceConfiguration 中的限额字段。
 */

import React, { useState } from 'react'
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Tag,
  message,
  Modal,
  Checkbox,
  Input
} from 'antd'
import type { ResourceQuota } from './ResourceConfiguration'
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudServerOutlined,
  RadarChartOutlined
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

// 复用资源配额字段，去掉 id / appId，只保留每个环境的配额字段
type EnvironmentQuota = Pick<
  ResourceQuota,
  'memoryGB' | 'cpuCores' | 'mysqlInstances' | 'mongoInstances' | 'redisInstances' | 'zookeeperInstances'
>

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
  globalMonitoring: GlobalMonitoringConfig
}

// 模拟一条游戏配置数据，用于作为详情页的示例
const mockGameConfig: GameEnvConfig = {
  appId: 'gamedemo',
  description: '示例游戏应用，用于演示环境配置详情页',
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
    memoryGB: 256,
    cpuCores: 2,
    mysqlInstances: 1,
    mongoInstances: 1,
    redisInstances: 1,
    zookeeperInstances: 1
  },
  prodQuota: {
    memoryGB: 256,
    cpuCores: 8,
    mysqlInstances: 2,
    mongoInstances: 1,
    redisInstances: 2,
    zookeeperInstances: 1
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
  globalMonitoring: {
    grafanaConfig: false ,
    cdnConfig: false
  }
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
  const [gameConfig, setGameConfig] = useState<GameEnvConfig>(() => ({
    ...mockGameConfig,
    appId: appId ?? mockGameConfig.appId,
    description: description ?? mockGameConfig.description
  }))

  // 初始化日志弹窗（原型：点击“日志”查看对应模块的部署/初始化日志）
  const [initLogModalOpen, setInitLogModalOpen] = useState<boolean>(false)
  const [initLogModalTitle, setInitLogModalTitle] = useState<string>('')
  const [initLogModalContent, setInitLogModalContent] = useState<string>('')

  // 当上层传入的 appId / description 变化时，更新当前配置的基础信息
  React.useEffect(() => {
    if (!appId && !description) return
    setGameConfig(prev => ({
      ...prev,
      appId: appId ?? prev.appId,
      description: description ?? prev.description
    }))
  }, [appId, description])

  // 当前选中的环境 Tab
  const [activeEnv, setActiveEnv] = useState<EnvKey>('test')

  // 限额表单实例（每次切换环境复用同一个表单）
  const [quotaForm] = Form.useForm<EnvironmentQuota>()
  // 自动开服配置表单
  const [failureForm] = Form.useForm<FailureConfig>()
  // 限额 / 开服失败配置是否处于编辑态
  const [quotaEditing, setQuotaEditing] = useState<boolean>(false)
  const [failureEditing, setFailureEditing] = useState<boolean>(false)
  // Lambda 模板源码查看弹窗
  const [lambdaModalVisible, setLambdaModalVisible] = useState<boolean>(false)
  // Lambda 模板步骤编辑态
  const [lambdaEditing, setLambdaEditing] = useState<boolean>(false)
  const [lambdaStepsByEnv, setLambdaStepsByEnv] = useState<Record<EnvKey, LambdaStepKey[]>>({
    test: ['zipSlip', 'filter', 'symlink', 'pathCheck'],
    prod: ['zipSlip', 'symlink', 'pathCheck']
  })
  // MSE 配置编辑
  const [mseEditing, setMseEditing] = useState<boolean>(false)
  const [mseForm] = Form.useForm<MseConfig>()
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
  // 根据当前选中环境获取对应的数据（避免在 JSX 中写大量三元运算）
  const getCurrentEnvData = (): {
    init: InitConfig
    quota: EnvironmentQuota
    failure: FailureConfig
  } => {
    if (activeEnv === 'test') {
      return {
        init: gameConfig.testInit,
        quota: gameConfig.testQuota,
        failure: gameConfig.testFailure
      }
    }
    return {
      init: gameConfig.prodInit,
      quota: gameConfig.prodQuota,
      failure: gameConfig.prodFailure
    }
  }

  // 切换环境 Tab 时，将表单值回填为对应环境的数据
  const handleEnvChange = (key: string): void => {
    const envKey = key === 'prod' ? 'prod' : 'test'
    setActiveEnv(envKey)
    setQuotaEditing(false)
    setFailureEditing(false)
    setPendingInit(null)
    setPendingInitMeta(null)
  }

  // 保存限额配置（当前环境）
  const handleSaveQuota = async (): Promise<void> => {
    try {
      const values = await quotaForm.validateFields()
      // 校验通过后，不直接落地，先存入待提交数据并展示二次确认弹窗
      setPendingQuota(values)
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

  const current = getCurrentEnvData()
  const clientInitialized = current.init.clientStatus === 'completed'
  const serverInitialized = current.init.serverStatus === 'completed'
  const currentMse: MseConfig =
    activeEnv === 'test' ? gameConfig.testMse : gameConfig.prodMse
  const currentLambdaSteps = lambdaStepsByEnv[activeEnv]
  const currentDeployType = current.init.deployType
  const deployLabel =
    currentDeployType === 'vm'
      ? '虚机部署'
      : currentDeployType === 'container'
        ? '容器部署'
        : '待配置'

  const mseInstanceTypeLabel =
    mseInstanceType === 'shared' ? '共享实例' : mseInstanceType === 'dedicated' ? '独占实例' : '—'
  const isContainerDeploy = currentDeployType === 'container'
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

      {/* 当前环境下的三个配置块：全局监控 / 初始化 / 限额 / 开服失败配置 */}
      <Space
        direction="vertical"
        size={16}
        style={{ width: '100%', marginTop: 12 }}
      >
        {/* 初始化配置 Card：展示 ToDo 样式概览，开关可直接点击，操作前需确认 */}
        <Card
          styles={{ header: { paddingTop: 16, paddingBottom: 16 } }}
          title={
            <div>
              <div>初始化配置</div>

              <Text type="secondary" style={{ fontSize: 14 }}>
                部署方式：{deployLabel}
              </Text>
              <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
                阿里云账号：{aliyunAccountName || '—'}
              </Text>
              <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
                MSE 实例类型：{mseInstanceTypeLabel}
              </Text>
              {monitoringStatusList.map(status => (
                <Text
                  key={status.key}
                  type="secondary"
                  style={{ fontSize: 13, display: 'block' }}
                >
                  {status.label}：{status.enabled ? '已完成' : '待配置'}
                  {!status.enabled && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, height: 'auto', marginLeft: 8 }}
                      onClick={() => {
                        // 交互意图：把全局监控配置放到“初始化配置”标题区展示，点击需二次确认后才标记为完成
                        confirmCompleteGlobalMonitoring(status.key, status.label)
                      }}
                    >
                      完成
                    </Button>
                  )}
                </Text>
              ))}
            </div>
          }
        >
          <div
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: 16
            }}
          >
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {([
                { envKey: 'test' as const, title: '测试环境' },
                { envKey: 'prod' as const, title: '生产环境' }
              ] as const).map(env => {
                const envInit = env.envKey === 'test' ? gameConfig.testInit : gameConfig.prodInit
                const envClientInitialized = envInit.clientStatus === 'completed'
                const envServerInitialized = envInit.serverStatus === 'completed'
                return (
                  <div key={env.envKey} style={{ flex: 1, minWidth: 360 }}>
                    <Space
                      align="center"
                      style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
                    >
                      <Space align="center" size={8}>
                        <Text strong>{env.title}</Text>
                      </Space>
                    </Space>

                    {/* 参考“开服模版步骤”样式：图标 + 标题 + 说明，纵向排列 */}
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      {[
                        {
                          key: 'client',
                          label: '客户端',
                          done: envClientInitialized,
                          desc: envClientInitialized ? '已完成初始化' : '待初始化'
                        },
                        {
                          key: 'server',
                          label: '服务端',
                          done: envServerInitialized,
                          desc: envServerInitialized ? '已完成初始化' : '待初始化'
                        }
                      ].map(item => (
                        <Space
                          key={item.key}
                          align="start"
                          style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                          <Space align="start" size={8}>
                            {item.done ? (
                              <CheckCircleFilled
                                style={{ color: '#52c41a', fontSize: 14, marginTop: 2 }}
                              />
                            ) : (
                              <ClockCircleOutlined
                                style={{ color: '#d9d9d9', fontSize: 14, marginTop: 2 }}
                              />
                            )}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text style={{ display: 'block' }}>{item.label}</Text>
                                {item.done && (
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{
                                      padding: '0 8px',
                                      minHeight: 32,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      color: '#ff4d4f'
                                    }}
                                    onClick={() => {
                                      openInitLogModal({
                                        envKey: env.envKey,
                                        envTitle: env.title,
                                        target: item.key as 'client' | 'server',
                                        targetTitle: item.label,
                                        success: item.done
                                      })
                                    }}
                                  >
                                    日志
                                  </Button>
                                )}
                              </div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.desc}
                              </Text>
                            </div>
                          </Space>
                        {/* 仅展示状态行，不额外在最右侧重复展示“已完成/待初始化” */}
                        </Space>
                      ))}

                      {[
                        {
                          key: 'globalAcceleration' as const,
                          label: '全球加速(GA)',
                          checked: envInit.globalAcceleration
                        }
                      ].map(item => (
                        <Space
                          key={item.key}
                          align="start"
                          style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                          <Space align="start" size={8}>
                            {item.checked ? (
                              <CheckCircleFilled
                                style={{ color: '#52c41a', fontSize: 14, marginTop: 2 }}
                              />
                            ) : (
                              <ClockCircleOutlined
                                style={{ color: '#d9d9d9', fontSize: 14, marginTop: 2 }}
                              />
                            )}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Text style={{ display: 'block' }}>{item.label}</Text>
                                <Button
                                  type="link"
                                  size="small"
                                  disabled={initConfirmVisible}
                                  onClick={() => {
                                    // 交互意图：用“开启/关闭”明文操作替代 Switch，但仍需二次确认后生效
                                    handleInitToggle(
                                      env.envKey,
                                      item.key,
                                      item.label,
                                      !item.checked
                                    )
                                  }}
                                  style={{ minHeight: 32, padding: '0 8px' }}
                                >
                                  {item.checked ? '关闭' : '开启'}
                                </Button>
                              </div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.checked ? '已开启' : '未开启'}
                              </Text>
                            </div>
                          </Space>
                          {/* 右侧不再重复展示“开启/关闭”，仅保留名称旁的明文操作 */}
                        </Space>
                      ))}
                    </Space>
                  </div>
                )
              })}
            </div>

            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 12 }}>
              初始化会在云侧创建该环境所需的存储、计算、网络等基础资源。
            </Text>
          </div>
        </Card>

        {/* 限额配置 Card：默认纯文本，点击编辑进入表单态 */}
        <Card
          title="限额配置"
          extra={
            !quotaEditing && (
              <Button
                type="link"
                onClick={() => {
                  quotaForm.setFieldsValue(current.quota)
                  setQuotaEditing(true)
                }}
              >
                编辑
              </Button>
            )
          }
        >
          {!quotaEditing ? (
            <Space direction="vertical" size={4}>
                <Text>
                  {isContainerDeploy ? '单个应用内存' : '虚机总内存'}：{current.quota.memoryGB} GB
                </Text>
                <Text>
                  {isContainerDeploy ? '单个应用 CPU 核数' : '虚机 CPU 总核数'}：{current.quota.cpuCores} C
                </Text>
              <Text>
                MySQL 实例数量：{current.quota.mysqlInstances}
              </Text>
              <Text>
                Mongo 实例数量：{current.quota.mongoInstances}
              </Text>
              <Text>
                Redis 实例数量：{current.quota.redisInstances}
              </Text>
              <Text>
                Zookeeper 实例数量：{current.quota.zookeeperInstances}
              </Text>
            </Space>
          ) : (
            <Form<EnvironmentQuota>
              form={quotaForm}
              layout="vertical"
              initialValues={current.quota}
            >
              <Space size={24} style={{ width: '100%' }} align="start">
                <div style={{ flex: 1, minWidth: 260 }}>
                  <Form.Item
                    label={isContainerDeploy ? '单个应用内存 (GB)' : '虚机总内存 (GB)'}
                    name="memoryGB"
                    rules={[
                      { required: true, message: '请输入内存大小' },
                      {
                        type: 'number',
                        min: 1,
                        max: 1024,
                        message: '内存需在 1–1024 GB 之间'
                      }
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} addonAfter="GB" />
                  </Form.Item>

                  <Form.Item
                    label={isContainerDeploy ? '单个应用 CPU 核数' : '虚机 CPU 总核数'}
                    name="cpuCores"
                    rules={[
                      { required: true, message: '请输入 CPU 核数' },
                      {
                        type: 'number',
                        min: 1,
                        max: 64,
                        message: 'CPU 核数需在 1–64 之间'
                      }
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} addonAfter="C" />
                  </Form.Item>

                  <Form.Item
                    label="MySQL 实例数量"
                    name="mysqlInstances"
                    rules={[
                      { required: true, message: '请输入 MySQL 实例数量' },
                      { type: 'number', min: 0, max: 10, message: '0–10 之间' }
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                  <Form.Item
                    label="Mongo 实例数量"
                    name="mongoInstances"
                    rules={[
                      { required: true, message: '请输入 Mongo 实例数量' },
                      { type: 'number', min: 0, max: 10, message: '0–10 之间' }
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    label="Redis 实例数量"
                    name="redisInstances"
                    rules={[
                      { required: true, message: '请输入 Redis 实例数量' },
                      { type: 'number', min: 0, max: 10, message: '0–10 之间' }
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    label="Zookeeper 实例数量"
                    name="zookeeperInstances"
                    rules={[
                      { required: true, message: '请输入 Zookeeper 实例数量' },
                      { type: 'number', min: 0, max: 10, message: '0–10 之间' }
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </Space>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      quotaForm.setFieldsValue(current.quota)
                      setQuotaEditing(false)
                    }}
                  >
                    取消
                  </Button>
                  <Button type="primary" onClick={handleSaveQuota}>
                    确认
                  </Button>
                </Space>
              </div>
            </Form>
          )}
        </Card>

        {/* 自动开服配置 Card */}
        <Card
          title="自动开服配置"
          extra={
            !failureEditing && (
              <Button
                type="link"
                onClick={() => {
                  failureForm.setFieldsValue(current.failure)
                  setFailureEditing(true)
                }}
              >
                编辑
              </Button>
            )
          }
        >
          {/* 自动开服模版：四个固定步骤，使用 icon 表示是否启用（静态展示，不可编辑） */}
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              backgroundColor: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 8
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              自动开服模版
            </Text>
            <Space direction="vertical" size={6}>
              {autoLaunchStepOptions.map((step, index) => {
                const enabled = current.failure.steps.includes(step.key)
                return (
                  <Space key={step.key} align="center" size={8}>
                    {enabled ? (
                      <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 14 }} />
                    )}
                    <Text>
                      {index + 1}. {step.label}
                    </Text>
                  </Space>
                )
              })}
            </Space>
          </div>

          {/* 自动开服回退开关：纯文本展示 + 编辑态可切换 */}
          {!failureEditing ? (
            <Space align="center" size={8}>
              <Text>自动开服回退：</Text>
              <Text
                style={{
                  color: current.failure.rollbackEnabled ? '#52c41a' : '#999'
                }}
              >
                {current.failure.rollbackEnabled ? '已开启' : '未开启'}
              </Text>
            </Space>
          ) : (
            <Form<FailureConfig>
              form={failureForm}
              layout="vertical"
              initialValues={current.failure}
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

              <Form.Item
                label="自动开服回退"
                name="rollbackEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      failureForm.setFieldsValue(current.failure)
                      setFailureEditing(false)
                    }}
                  >
                    取消
                  </Button>
                  <Button type="primary" onClick={handleSaveFailureConfig}>
                    确认
                  </Button>
                </Space>
              </div>
            </Form>
          )}
        </Card>

        {/* MSE 配置 Card：展示 / 编辑当前环境的 MSE 接入配置 */}
        <Card
          title="MSE 配置(待定）"
          extra={
            !mseEditing && (
              <Button
                type="link"
                onClick={() => {
                  mseForm.setFieldsValue(currentMse)
                  setMseEditing(true)
                }}
              >
                编辑
              </Button>
            )
          }
        >
          {!mseEditing ? (
            <Space direction="vertical" size={4}>
              <Space>
                <Text>状态：</Text>
                <Text
                  style={{
                    color: currentMse.enabled ? '#52c41a' : '#999'
                  }}
                >
                  {currentMse.enabled ? '已接入' : '未接入'}
                </Text>
              </Space>
              {currentMse.enabled ? (
                <>
                  <Text>网关实例：{currentMse.gatewayName}</Text>
                  <Text>命名空间：{currentMse.namespace}</Text>
                  <Text>服务名：{currentMse.serviceName}</Text>
                  <Text>路由前缀：{currentMse.routePrefix}</Text>
                </>
              ) : (
                <Text type="secondary">当前环境未接入 MSE 网关。</Text>
              )}
            </Space>
          ) : (
            <Form<MseConfig> form={mseForm} layout="vertical" initialValues={currentMse}>
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
                      mseForm.setFieldsValue(currentMse)
                      setMseEditing(false)
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
        </Card>

        {/* 客户端版本文件 Lambda 模板（S3 上的 py 文件，仅展示用途 & 源码预览按钮） */}
        <Card
          title="客户端 Lambda 模板(待定）"
          extra={
            !lambdaEditing && (
              <Button type="link" onClick={() => setLambdaEditing(true)}>
                编辑步骤
              </Button>
            )
          }
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {/* 步骤式可视化 */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 8
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                版本文件处理步骤
              </Text>
              {!lambdaEditing ? (
                <Space direction="vertical" size={6}>
                  {lambdaStepOptions.map((step, index) => {
                    const enabled = currentLambdaSteps.includes(step.key)
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
              ) : (
                <Checkbox.Group
                  style={{ width: '100%' }}
                  value={currentLambdaSteps}
                  onChange={values => {
                    setLambdaStepsByEnv(prev => ({
                      ...prev,
                      [activeEnv]: values as LambdaStepKey[]
                    }))
                  }}
                >
                  <Space direction="vertical">
                    {lambdaStepOptions.map(step => (
                      <Checkbox key={step.key} value={step.key}>
                        <span style={{ fontWeight: 500 }}>{step.title}</span>
                        <span
                          style={{
                            marginLeft: 8,
                            color: '#999',
                            fontSize: 12
                          }}
                        >
                          {step.desc}
                        </span>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              )}
            </div>

            {/* 模板说明 & 源码查看 */}
            <Text type="secondary" style={{ fontSize: 13 }}>
              该 Lambda 模板用于从 S3 上下载并安全解压客户端版本 zip，结合以上步骤保障路径和文件安全。
            </Text>
            <Space direction="vertical" size={4}>
              <Text>
                模板存储位置（示例）：
                <span style={{ color: '#1890ff' }}>
                  s3://game-version-bucket/{gameConfig.appId}/version_handler.py
                </span>
              </Text>
            </Space>
            <div style={{ textAlign: 'right' }}>
              {lambdaEditing ? (
                <Space>
                  <Button onClick={() => setLambdaEditing(false)}>取消</Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      setLambdaEditing(false)
                      message.success('Lambda 步骤配置已更新（仅当前环境）')
                    }}
                  >
                    确认
                  </Button>
                </Space>
              ) : (
                <Button type="link" onClick={() => setLambdaModalVisible(true)}>
                  查看 Lambda 源码
                </Button>
              )}
            </div>
          </Space>
        </Card>
      </Space>

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
            if (activeEnv === 'test') {
              return { ...prev, testMse: pendingMse }
            }
            return { ...prev, prodMse: pendingMse }
          })
          setMseConfirmVisible(false)
          setMseEditing(false)
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
            if (activeEnv === 'test') {
              return { ...prev, testQuota: pendingQuota }
            }
            return { ...prev, prodQuota: pendingQuota }
          })
          setQuotaConfirmVisible(false)
          setQuotaEditing(false)
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
            if (activeEnv === 'test') {
              return { ...prev, testFailure: pendingFailure }
            }
            return { ...prev, prodFailure: pendingFailure }
          })
          setFailureConfirmVisible(false)
          setFailureEditing(false)
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


