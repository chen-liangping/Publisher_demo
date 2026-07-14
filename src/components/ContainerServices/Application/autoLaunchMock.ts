// 自动开服卡片的 mock 数据与类型定义
// 对照真实控制台 g123-cp-publisher 的 DisplayInfoCard 语义重写，仅用于原型演示
// 字段含义与生产对齐，数据为占位 mock，未与后端/OpenAPI 打通

// 开服策略类型：cron = 定时开服，strategy = 条件开服
export type StrategyType = 'cron' | 'strategy'

// 开服流程状态：idle = 待机，processing = 开服进行中
export type AutoLaunchStatus = 'idle' | 'processing'

// 开服步骤状态：等待执行 / 执行中 / 等待回调 / 成功 / 失败
export type ActionStepStatus = 'need_execute' | 'executing' | 'wait_callback' | 'ok' | 'failed'

export type ActionStep = {
  name: string
  title: string
  status: ActionStepStatus
  errMsg?: string
  docLink?: string
}

// 条件开服的进度项（创角人数 / 付费人数 / 前次开服经过时长）
export type ProgressItem = {
  label: string
  current: number
  target: number
  unit: string
}

// 下次部署资源：单个应用的聚合资源
export type AppResource = {
  appName: string
  displayName: string
  memoryNum: number
  memoryUnit: string
  cpuNum: number
  cpuUnit: string
  replicasText: string
  // 资源明细，用于 Popover 展开查看
  details: Array<{ name: string; cpu: string; memory: string }>
}

// 分区 ID：global 为全局默认策略，ja/en/ko 为语种区覆盖
export type ZoneId = 'global' | 'ja' | 'en' | 'ko'

// 导流服组（AI 开服）：语种 + 当前最大服 ID
export type ZoneServiceId = {
  lang: string
  serverId: number
}

// 开服记录条目：AI 与策略开服共用，带来源与分区
export type LaunchHistoryItem = {
  serverId: number
  triggeredAt: string
  lang: string
  reason: string
  // 来源：strategy = 策略开服，ai = AI(导流服)开服
  source: 'strategy' | 'ai'
  // 所属分区
  zone: ZoneId
  // 是否为当前语种导流服（导流服条目不可展开）
  isOnboarding?: boolean
}

// AI 开服（导流服）子状态：每个分区独立
export type AiLaunchState = {
  status: 'running' | 'idle'
  openedCount: number
  // 该分区的导流服组
  onboardingServers: ZoneServiceId[]
}

// 单个分区的开服状态
export type ZoneLaunch = {
  zoneId: ZoneId
  zoneName: string
  // 是否覆盖全局默认策略（global 自身恒为 true；非 global 区为 false 时继承 global 策略）
  override: boolean
  // 策略开服
  strategyType: StrategyType
  autoLaunchStatus: AutoLaunchStatus
  curMaxServiceId: number
  rollbackProdOpen: boolean
  // 定时开服
  cron?: {
    cronTimeAt: string
    lastTriggerAt: string
  }
  // 条件开服进度
  progressList?: ProgressItem[]
  // 生效时间段文案
  effectPeriodText?: string
  // 下次开服策略文案
  nextStrategyText?: string
  // 下次部署资源
  applications: AppResource[]
  // 开服步骤
  steps: ActionStep[]
  // AI 开服（导流服）
  ai: AiLaunchState
  // 该分区开服记录
  launchHistory: LaunchHistoryItem[]
}

// 步骤名与标题映射（对照生产 autoLaunchActionStepName）
export const STEP_TITLES: Record<string, string> = {
  open_server_notify: '调用游戏开服通知API',
  new_server_notify: '调用游戏部署通知API',
  new_server_alert_update: '部署新游服监控',
  new_server_provision: '部署预备服',
  prepare_redis: '准备下一个预备服的redis实例',
  prepare_mysql: '准备下一个预备服的mysql账号',
}

// 公共下次部署资源（所有分区复用）
const sharedApplications: AppResource[] = [
  {
    appName: 'game-server',
    displayName: 'kumo游服',
    memoryNum: 64,
    memoryUnit: 'Mi',
    cpuNum: 0.4,
    cpuUnit: 'C',
    replicasText: '副本数：3',
    details: [
      { name: 'game-server', cpu: '0.2 C', memory: '32 Mi' },
      { name: 'center-server', cpu: '0.2 C', memory: '32 Mi' },
    ],
  },
  {
    appName: 'worker-1',
    displayName: '多活服1',
    memoryNum: 64,
    memoryUnit: 'Mi',
    cpuNum: 0.4,
    cpuUnit: 'C',
    replicasText: '副本数：2',
    details: [{ name: 'worker-1', cpu: '0.4 C', memory: '64 Mi' }],
  },
]

// 全局默认策略：条件开服
const globalZone: ZoneLaunch = {
  zoneId: 'global',
  zoneName: '全局默认',
  override: true,
  strategyType: 'strategy',
  autoLaunchStatus: 'idle',
  curMaxServiceId: 3,
  rollbackProdOpen: true,
  effectPeriodText: '全时段',
  progressList: [
    { label: '创角人数 500人', current: 320, target: 500, unit: '人' },
    { label: '付费人数 100人', current: 48, target: 100, unit: '人' },
    { label: '前次开服经过 6小时', current: 2, target: 6, unit: '小时' },
  ],
  nextStrategyText: '创角人数 500人，付费人数 100人，前次开服经过 6小时 任一条件后自动开服',
  applications: sharedApplications,
  steps: [
    { name: 'open_server_notify', title: STEP_TITLES.open_server_notify, status: 'ok', docLink: 'https://developers.g123.jp/docs/infra#api-open-server' },
    { name: 'new_server_alert_update', title: STEP_TITLES.new_server_alert_update, status: 'ok' },
    { name: 'new_server_notify', title: STEP_TITLES.new_server_notify, status: 'ok', docLink: 'https://developers.g123.jp/docs/infra#api-new-server' },
    { name: 'new_server_provision', title: STEP_TITLES.new_server_provision, status: 'need_execute' },
  ],
  ai: { status: 'idle', openedCount: 0, onboardingServers: [] },
  launchHistory: [
    {
      serverId: 3,
      triggeredAt: '2026-07-12 09:00:00',
      lang: 'ja',
      reason: '策略触发：创角人数达到 500 人',
      source: 'strategy',
      zone: 'global',
    },
  ],
}

// 日语区：覆盖全局，条件开服，AI 开服运行中
const jaZone: ZoneLaunch = {
  zoneId: 'ja',
  zoneName: '日语区',
  override: true,
  strategyType: 'strategy',
  autoLaunchStatus: 'idle',
  curMaxServiceId: 5,
  rollbackProdOpen: true,
  effectPeriodText: '全时段',
  progressList: [
    { label: '创角人数 800人', current: 610, target: 800, unit: '人' },
    { label: '付费人数 150人', current: 90, target: 150, unit: '人' },
    { label: '前次开服经过 8小时', current: 3, target: 8, unit: '小时' },
  ],
  nextStrategyText: '创角人数 800人，付费人数 150人，前次开服经过 8小时 任一条件后自动开服',
  applications: sharedApplications,
  steps: [
    { name: 'open_server_notify', title: STEP_TITLES.open_server_notify, status: 'ok', docLink: 'https://developers.g123.jp/docs/infra#api-open-server' },
    { name: 'new_server_provision', title: STEP_TITLES.new_server_provision, status: 'executing' },
    { name: 'prepare_redis', title: STEP_TITLES.prepare_redis, status: 'need_execute' },
    { name: 'prepare_mysql', title: STEP_TITLES.prepare_mysql, status: 'need_execute' },
  ],
  ai: {
    status: 'running',
    openedCount: 5,
    onboardingServers: [{ lang: 'ja', serverId: 5 }],
  },
  launchHistory: [
    {
      serverId: 5,
      triggeredAt: '2026-07-13 14:00:00',
      lang: 'ja',
      reason: 'AI 判定：日语区付费人数达到阈值 150 人，触发自动开服',
      source: 'ai',
      zone: 'ja',
      isOnboarding: true,
    },
    {
      serverId: 4,
      triggeredAt: '2026-07-12 10:30:00',
      lang: 'ja',
      reason: 'AI 判定：日语区创角人数达到阈值 800 人，触发自动开服',
      source: 'ai',
      zone: 'ja',
    },
  ],
}

// 英语区：不覆盖，继承全局默认策略；自有 AI 导流服
const enZone: ZoneLaunch = {
  zoneId: 'en',
  zoneName: '英语区',
  override: false,
  strategyType: 'strategy',
  autoLaunchStatus: 'idle',
  curMaxServiceId: 3,
  rollbackProdOpen: true,
  applications: sharedApplications,
  steps: globalZone.steps,
  ai: {
    status: 'idle',
    openedCount: 3,
    onboardingServers: [{ lang: 'en', serverId: 3 }],
  },
  launchHistory: [
    {
      serverId: 3,
      triggeredAt: '2026-07-11 09:12:00',
      lang: 'en',
      reason: 'AI 判定：英语区前次开服经过 6 小时，触发自动开服',
      source: 'ai',
      zone: 'en',
    },
  ],
}

// 韩语区：覆盖全局，定时开服
const koZone: ZoneLaunch = {
  zoneId: 'ko',
  zoneName: '韩语区',
  override: true,
  strategyType: 'cron',
  autoLaunchStatus: 'idle',
  curMaxServiceId: 2,
  rollbackProdOpen: true,
  cron: {
    cronTimeAt: '2026-07-13 20:00:00',
    lastTriggerAt: '2026-07-13 14:00:00',
  },
  effectPeriodText: '每日 JST 20:00 定时开服',
  applications: sharedApplications,
  steps: [
    { name: 'open_server_notify', title: STEP_TITLES.open_server_notify, status: 'ok', docLink: 'https://developers.g123.jp/docs/infra#api-open-server' },
    { name: 'new_server_provision', title: STEP_TITLES.new_server_provision, status: 'need_execute' },
  ],
  ai: {
    status: 'idle',
    openedCount: 2,
    onboardingServers: [{ lang: 'ko', serverId: 2 }],
  },
  launchHistory: [],
}

// 初始分区集合
export const initialZones: ZoneLaunch[] = [globalZone, jaZone, enZone, koZone]

// 取某分区的"生效策略"：非覆盖分区回退到 global 的策略字段（curMaxServiceId / ai / history 仍用自身）
export const getEffectiveStrategy = (zones: ZoneLaunch[], zoneId: ZoneId): ZoneLaunch => {
  const zone = zones.find(z => z.zoneId === zoneId)
  if (!zone) return zones[0]
  if (zone.override || zone.zoneId === 'global') return zone
  const globalZ = zones.find(z => z.zoneId === 'global')!
  return {
    ...zone,
    strategyType: globalZ.strategyType,
    cron: globalZ.cron,
    progressList: globalZ.progressList,
    effectPeriodText: globalZ.effectPeriodText,
    nextStrategyText: globalZ.nextStrategyText,
    applications: globalZ.applications,
    steps: globalZ.steps,
  }
}

// 语种标签展示文案
export const formatZoneLangLabel = (lang: string): string => {
  const map: Record<string, string> = { ja: '日语', en: '英语', ko: '韩语', zh: '中文' }
  return map[lang] ?? lang.toUpperCase()
}

// 分区下拉选项
export const zoneSelectOptions = (zones: ZoneLaunch[]) =>
  zones.map(z => ({
    value: z.zoneId,
    label: z.zoneId === 'global' ? '全局默认策略' : `${z.zoneName}（${z.zoneId}）`,
  }))
