'use client'

import React from 'react'
import { Alert, Card, Progress, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

const WARNING_THRESHOLD = 80 // 与「资源使用率」卡片同一套预警阈值

// ==================== appId 维度聚合口径（详见 20260902-应用详情页新增资源使用率-prd.md「三/四」） ====================
//
// appId 级 CPU/内存使用率 = 用量加权聚合：
//   Σ(该 appId 下参与统计应用的实际用量) ÷ Σ(这些应用已配置的限额)
// 而不是把各应用自己的使用率百分比直接取算术平均——避免小应用的极端百分比拉偏整体判断。
// 当前无运行 Pod 的应用（hasRunningPod: false）从分子分母中一并剔除，不计为 0。
//
// 注意：分母里的"已配置限额之和"只是聚合计算过程中的中间量，管理台不存在对应的 appId 级
// 配额/限额字段（限额只在单个应用维度真实存在），因此这里不把它展示成"CPU 4C"这类 UI 文案，
// 页面上只展示聚合后的使用率百分比本身。

interface UnderlyingApp {
  name: string
  hasRunningPod: boolean
  cpuLimitC: number
  cpuUsagePercent?: number // hasRunningPod 为 false 时不适用
  memoryLimitGB: number
  memoryUsagePercent?: number // hasRunningPod 为 false 时不适用
}

interface AppIdConfig {
  key: string
  appId: string
  description: string
  apps: UnderlyingApp[]
}

// mock 数据：前三个 appId（gamedemo/testgame/rpgworld）沿用「游戏管理」页面里已有的示例项目，
// 其余为补充的演示数据，覆盖低/中/接近预警阈值等不同使用率区间，以及单个 appId 下多个应用、
// 整个 appId 当前均无运行 Pod 等场景
const APP_ID_CONFIGS: AppIdConfig[] = [
  {
    key: 'gamedemo',
    appId: 'gamedemo',
    description: '示例游戏应用',
    apps: [
      { name: 'gamedemo-main', hasRunningPod: true, cpuLimitC: 48, cpuUsagePercent: 55, memoryLimitGB: 192, memoryUsagePercent: 60 },
      { name: 'gamedemo-canary', hasRunningPod: true, cpuLimitC: 16, cpuUsagePercent: 68, memoryLimitGB: 64, memoryUsagePercent: 72 },
    ],
  },
  {
    key: 'testgame',
    appId: 'testgame',
    description: '测试游戏',
    apps: [
      { name: 'testgame-main', hasRunningPod: true, cpuLimitC: 4, cpuUsagePercent: 88, memoryLimitGB: 128, memoryUsagePercent: 71 },
      // 演示边界情况：该应用当前无运行 Pod，不计入 appId 聚合的分子分母
      { name: 'testgame-staging', hasRunningPod: false, cpuLimitC: 2, memoryLimitGB: 16 },
    ],
  },
  {
    key: 'rpgworld',
    appId: 'rpgworld',
    description: 'RPG世界',
    apps: [{ name: 'rpgworld-main', hasRunningPod: true, cpuLimitC: 4, cpuUsagePercent: 45, memoryLimitGB: 128, memoryUsagePercent: 82 }],
  },
  {
    key: 'puzzlequest',
    appId: 'puzzlequest',
    description: '休闲益智游戏',
    apps: [{ name: 'puzzlequest-main', hasRunningPod: true, cpuLimitC: 8, cpuUsagePercent: 22, memoryLimitGB: 32, memoryUsagePercent: 18 }],
  },
  {
    key: 'cardmaster',
    appId: 'cardmaster',
    description: '卡牌对战游戏',
    apps: [
      { name: 'cardmaster-main', hasRunningPod: true, cpuLimitC: 8, cpuUsagePercent: 70, memoryLimitGB: 32, memoryUsagePercent: 62 },
      { name: 'cardmaster-canary', hasRunningPod: true, cpuLimitC: 4, cpuUsagePercent: 55, memoryLimitGB: 16, memoryUsagePercent: 48 },
    ],
  },
  {
    key: 'strategyx',
    appId: 'strategyx',
    description: '策略经营游戏',
    apps: [{ name: 'strategyx-main', hasRunningPod: true, cpuLimitC: 8, cpuUsagePercent: 92, memoryLimitGB: 32, memoryUsagePercent: 85 }],
  },
  {
    key: 'mobalegend',
    appId: 'mobalegend',
    description: 'MOBA 多人对战游戏，多个海外分组',
    apps: [
      { name: 'mobalegend-cn', hasRunningPod: true, cpuLimitC: 16, cpuUsagePercent: 60, memoryLimitGB: 64, memoryUsagePercent: 55 },
      { name: 'mobalegend-us', hasRunningPod: true, cpuLimitC: 8, cpuUsagePercent: 45, memoryLimitGB: 32, memoryUsagePercent: 50 },
      { name: 'mobalegend-jp', hasRunningPod: true, cpuLimitC: 8, cpuUsagePercent: 70, memoryLimitGB: 32, memoryUsagePercent: 65 },
      { name: 'mobalegend-kr', hasRunningPod: true, cpuLimitC: 4, cpuUsagePercent: 40, memoryLimitGB: 16, memoryUsagePercent: 38 },
    ],
  },
  {
    key: 'idleclicker',
    appId: 'idleclicker',
    description: '放置类小游戏',
    apps: [{ name: 'idleclicker-main', hasRunningPod: true, cpuLimitC: 2, cpuUsagePercent: 5, memoryLimitGB: 8, memoryUsagePercent: 12 }],
  },
  {
    key: 'racingpro',
    appId: 'racingpro',
    description: '赛车竞速游戏',
    // 演示边界情况：整个 appId 下所有应用当前都没有运行中 Pod，CPU/内存使用率整行展示为 -
    apps: [{ name: 'racingpro-main', hasRunningPod: false, cpuLimitC: 4, memoryLimitGB: 16 }],
  },
  {
    key: 'fishinggame',
    appId: 'fishinggame',
    description: '休闲钓鱼游戏',
    apps: [{ name: 'fishinggame-main', hasRunningPod: true, cpuLimitC: 8, cpuUsagePercent: 76, memoryLimitGB: 32, memoryUsagePercent: 68 }],
  },
]

function aggregateResource(
  apps: UnderlyingApp[],
  limitKey: 'cpuLimitC' | 'memoryLimitGB',
  usageKey: 'cpuUsagePercent' | 'memoryUsagePercent'
): number | null {
  const active = apps.filter((a) => a.hasRunningPod && a[usageKey] !== undefined)
  const totalLimit = active.reduce((sum, a) => sum + a[limitKey], 0)
  if (active.length === 0 || totalLimit === 0) return null
  const totalUsage = active.reduce((sum, a) => sum + (a[limitKey] * (a[usageKey] as number)) / 100, 0)
  return Math.round((totalUsage / totalLimit) * 100)
}

interface AppResourceRow {
  key: string
  appId: string
  description: string
  cpuUsagePercent: number | null // null = appId 下参与统计的应用均无运行 Pod
  memoryUsagePercent: number | null
}

const APP_RESOURCE_ROWS: AppResourceRow[] = APP_ID_CONFIGS.map((cfg) => ({
  key: cfg.key,
  appId: cfg.appId,
  description: cfg.description,
  cpuUsagePercent: aggregateResource(cfg.apps, 'cpuLimitC', 'cpuUsagePercent'),
  memoryUsagePercent: aggregateResource(cfg.apps, 'memoryLimitGB', 'memoryUsagePercent'),
}))

const maxOf = (r: AppResourceRow) => Math.max(r.cpuUsagePercent ?? -1, r.memoryUsagePercent ?? -1)

function UsageCell({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <div style={{ minWidth: 120 }}>
        <Text type="secondary">-</Text>
      </div>
    )
  }

  const isWarning = percent >= WARNING_THRESHOLD
  return (
    <div style={{ minWidth: 120 }}>
      <Text strong style={{ color: isWarning ? '#ff4d4f' : undefined }}>
        {percent}%
      </Text>
      <Progress
        percent={percent}
        showInfo={false}
        size="small"
        strokeColor={isWarning ? '#ff4d4f' : '#3b82f6'}
      />
    </div>
  )
}

export default function PlatformResourceMonitor() {
  const columns: ColumnsType<AppResourceRow> = [
    {
      title: 'AppID',
      dataIndex: 'appId',
      key: 'appId',
      render: (val: string, record) => (
        <div>
          <Text strong>{val}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'CPU 使用率',
      key: 'cpu',
      render: (_, record) => <UsageCell percent={record.cpuUsagePercent} />,
      sorter: (a, b) => (a.cpuUsagePercent ?? -1) - (b.cpuUsagePercent ?? -1),
    },
    {
      title: '内存使用率',
      key: 'memory',
      render: (_, record) => <UsageCell percent={record.memoryUsagePercent} />,
      sorter: (a, b) => (a.memoryUsagePercent ?? -1) - (b.memoryUsagePercent ?? -1),
    },
  ]

  const sortedRows = [...APP_RESOURCE_ROWS].sort((a, b) => maxOf(b) - maxOf(a))

  const criticalCount = APP_RESOURCE_ROWS.filter((r) => maxOf(r) >= WARNING_THRESHOLD).length

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        资源使用率监控
      </Typography.Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        按 appId 查看 CPU、内存使用率，定位哪些 appId 使用率偏高、需要重点关注。
      </Text>

      <Card title="各 appId 资源使用率" styles={{ body: { padding: 20 } }}>
        {criticalCount > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`有 ${criticalCount} 个 appId 的 CPU 或内存使用率已超过 ${WARNING_THRESHOLD}%，建议关注`}
          />
        )}
        <Table columns={columns} dataSource={sortedRows} pagination={false} />
      </Card>
    </div>
  )
}
