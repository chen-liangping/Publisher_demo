'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Input, Progress, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CalendarOutlined,
  CheckSquareOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  SendOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Line } from '@antv/g2plot'

const { Title, Text } = Typography

// ==================== mock 数据（纯前端原型，不接真实接口） ====================

const SUGGESTIONS = [
  { icon: <CheckSquareOutlined />, text: '最近7天导流服高频告警内容？' },
  { icon: <CalendarOutlined />, text: '下一次开服时间什么时候？' },
  { icon: <WarningOutlined />, text: '当前有哪些风险预警？' },
]

interface TrendPoint {
  date: string
  value: number
  /** 仅“双线对比”类指标（如 CPU/内存使用率 vs 平台平均值）才会用到 */
  series?: string
}

function genTrend(base: number, volatility: number, days = 30): TrendPoint[] {
  const arr: TrendPoint[] = []
  let v = base
  for (let i = 0; i < days; i++) {
    v = Math.max(1, v + (Math.random() - 0.5) * volatility)
    const day = i + 1
    arr.push({ date: `06/${String(day).padStart(2, '0')}`, value: Math.round(v) })
  }
  return arr
}

// 百分比类指标（CPU/内存使用率）需要限定在 [1, 99] 区间内做随机游走
function genPercentTrend(base: number, volatility: number, days = 30): TrendPoint[] {
  const arr: TrendPoint[] = []
  let v = base
  for (let i = 0; i < days; i++) {
    v = Math.min(99, Math.max(1, v + (Math.random() - 0.5) * volatility))
    const day = i + 1
    arr.push({ date: `06/${String(day).padStart(2, '0')}`, value: Math.round(v) })
  }
  return arr
}

// 双线对比：该 AppID 自身使用率 vs 平台平均值，两条独立的随机游走序列
function genCompareTrend(
  appBase: number,
  appVolatility: number,
  platformAvgBase: number,
  platformAvgVolatility: number,
  days = 30
): TrendPoint[] {
  const appSeries = genPercentTrend(appBase, appVolatility, days).map((p) => ({ ...p, series: 'appid' }))
  const platformSeries = genPercentTrend(platformAvgBase, platformAvgVolatility, days).map((p) => ({ ...p, series: 'platformAvg' }))
  return [...appSeries, ...platformSeries]
}

interface MetricCardConfig {
  title: string
  total: string
  subLabel: string
  subValue: string
  /** 单线时传字符串；双线对比（该 AppID vs 平台平均值）时传两个颜色组成的数组，顺序对应 legend */
  color: string | string[]
  data: TrendPoint[]
  /** 百分比类指标（如 CPU/内存使用率）：数值超过 80 时高亮警示色，趋势图固定 0-100 并画阈值线 */
  isPercent?: boolean
  /** 当前百分比数值，仅 isPercent 时使用 */
  valueNumber?: number
  /** 补充说明，展示在标题旁的 icon tooltip 里 */
  tooltip?: string
  /** 双线对比图例，仅 data 里带 series 字段时需要 */
  legend?: { label: string; color: string }[]
}

// CPU/内存使用率：口径为该 AppID（gamedemo）下所有运行中 Pod 的汇总使用率，
// 超过 80% 时数值变警示色（与应用详情页的资源使用率卡片口径一致）。
// 同时叠加“平台平均值”作为对比基线，两条线画在同一张图里，方便看出这个 AppID 是否明显高于平台平均水位。
const APP_CPU_VALUE = 62
const APP_MEM_VALUE = 74
const PLATFORM_AVG_CPU_VALUE = 45
const PLATFORM_AVG_MEM_VALUE = 52
const COMPARE_COLORS = ['#3b82f6', '#94a3b8'] // [该 AppID, 平台平均值]
const COMPARE_LEGEND = [
  { label: 'AppID（gamedemo）', color: COMPARE_COLORS[0] },
  { label: '平台平均值', color: COMPARE_COLORS[1] },
]

const METRIC_PAGES: MetricCardConfig[][] = [
  [
    {
      title: 'CPU 使用率',
      total: `${APP_CPU_VALUE}%`,
      subLabel: '预警阈值',
      subValue: '80%',
      color: COMPARE_COLORS,
      data: genCompareTrend(APP_CPU_VALUE, 10, PLATFORM_AVG_CPU_VALUE, 6),
      isPercent: true,
      valueNumber: APP_CPU_VALUE,
      tooltip: '该 AppID（gamedemo）下所有运行中 Pod 的 CPU 实际使用量占已配置限额的百分比，并与平台平均值做对比',
      legend: COMPARE_LEGEND,
    },
    {
      title: '内存使用率',
      total: `${APP_MEM_VALUE}%`,
      subLabel: '预警阈值',
      subValue: '80%',
      color: COMPARE_COLORS,
      data: genCompareTrend(APP_MEM_VALUE, 8, PLATFORM_AVG_MEM_VALUE, 5),
      isPercent: true,
      valueNumber: APP_MEM_VALUE,
      tooltip: '该 AppID（gamedemo）下所有运行中 Pod 的内存实际使用量占已配置限额的百分比，并与平台平均值做对比',
      legend: COMPARE_LEGEND,
    },
    { title: 'Pod故障消息', total: '834 条', subLabel: '待查看', subValue: '2条', color: '#60a5fa', data: genTrend(28, 6) },
  ],
  [
    { title: '近期告警记录', total: '342 条', subLabel: '待处理', subValue: '0条', color: '#60a5fa', data: genTrend(11, 3) },
    { title: 'CDN报错请求', total: '456', subLabel: '待处理', subValue: '1条', color: '#60a5fa', data: genTrend(15, 4) },
    { title: '开服失败次数', total: '3 次', subLabel: '待处理', subValue: '1条', color: '#60a5fa', data: genTrend(0.3, 0.4) },
  ],
  [
    { title: '客诉工单', total: '58 单', subLabel: '待跟进', subValue: '4单', color: '#60a5fa', data: genTrend(2, 1) },
    { title: 'SDK异常上报', total: '129 条', subLabel: '待查看', subValue: '0条', color: '#60a5fa', data: genTrend(4, 2) },
  ],
]

interface RecentOperation {
  key: string
  api: string
  desc: string
  status: number
  time: string
  operator: string
}

const RECENT_OPERATIONS: RecentOperation[] = [
  { key: '1', api: 'gameApp/updateAppService', desc: '更新服务资源配置', status: 200, time: '2025-6-23 13:51:45', operator: 'liu.j@ctw.inc' },
  { key: '2', api: 'gameApp/addPlugin', desc: '添加插件', status: 200, time: '2025-6-23 12:59:02', operator: 'liu.j@ctw.inc' },
  { key: '3', api: 'gameApp/deploy', desc: '服务端部署', status: 200, time: '2025-6-23 11:24:42', operator: 'chen.liangping@ctw.inc' },
  { key: '4', api: 'gameApp/addApp', desc: '新增应用', status: 200, time: '2025-6-23 11:14:24', operator: 'chen.liangping@ctw.inc' },
  { key: '5', api: 'gameApp/deleteGameApp', desc: '删除应用', status: 200, time: '2025-06-23 10:55:38', operator: 'chen.liangping@ctw.inc' },
]

// ==================== 迷你趋势折线图（@antv/g2plot） ====================

const SERIES_LABEL: Record<string, string> = { appid: '该 AppID', platformAvg: '平台平均值' }

function Sparkline({
  data,
  color,
  thresholdValue,
}: {
  data: TrendPoint[]
  color: string | string[]
  thresholdValue?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<Line | null>(null)
  const isMultiSeries = data.some((d) => d.series)

  useEffect(() => {
    if (!containerRef.current) return
    if (!plotRef.current) {
      plotRef.current = new Line(containerRef.current, {
        data,
        xField: 'date',
        yField: 'value',
        height: 120,
        padding: [8, 12, 28, 12],
        smooth: true,
        color,
        seriesField: isMultiSeries ? 'series' : undefined,
        lineStyle: { lineWidth: 2 },
        point: { size: 0 },
        legend: false, // 用卡片里自定义的小圆点图例，不用 G2Plot 默认图例
        // 百分比类指标固定 0-100 区间，方便和 80% 预警线做对照；其余指标保持自适应
        yAxis: thresholdValue !== undefined ? { min: 0, max: 100, label: null, grid: null } : false,
        xAxis: {
          tickCount: 7,
          line: null,
          tickLine: null,
          label: { style: { fill: '#94a3b8', fontSize: 11 } },
        },
        tooltip: {
          shared: isMultiSeries,
          formatter: (d: Record<string, unknown>) => ({
            name: isMultiSeries ? SERIES_LABEL[d.series as string] ?? (d.series as string) : '数值',
            value: thresholdValue !== undefined ? `${d.value as number}%` : `${d.value as number}`,
          }),
        },
      })
      plotRef.current.render()
    } else {
      plotRef.current.changeData(data)
    }
  }, [data, color, thresholdValue, isMultiSeries])

  useEffect(() => {
    return () => {
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%' }} />
}

// ==================== 指标数据小卡片 ====================

function MetricMiniCard({ config }: { config: MetricCardConfig }) {
  const isWarning = config.isPercent && (config.valueNumber ?? 0) >= 80

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, cursor: 'pointer', color: '#111827' }}>
        <Text style={{ fontSize: 14, fontWeight: 500 }}>{config.title}</Text>
        {config.tooltip ? (
          <Tooltip title={config.tooltip}>
            <QuestionCircleOutlined style={{ fontSize: 12, color: '#bfbfbf' }} />
          </Tooltip>
        ) : (
          <RightOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
        )}
      </div>
      <Space align="baseline" size={8} style={{ marginBottom: config.legend ? 6 : 12 }}>
        <Text strong style={{ fontSize: 22, color: isWarning ? '#ff4d4f' : undefined }}>
          {config.total}
        </Text>
        <Text style={{ fontSize: 13, color: '#9ca3af' }}>
          {config.subLabel} {config.subValue}
        </Text>
      </Space>

      {config.legend && (
        <Space size={12} style={{ marginBottom: 8 }}>
          {config.legend.map((item) => (
            <Space key={item.label} size={4}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: item.color, display: 'inline-block' }} />
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>{item.label}</Text>
            </Space>
          ))}
        </Space>
      )}

      <Sparkline data={config.data} color={config.color} thresholdValue={config.isPercent ? 80 : undefined} />
    </div>
  )
}

// ==================== 主页面：我的工作台 ====================

export default function WorkbenchDashboard() {
  const [metricsPageIndex, setMetricsPageIndex] = useState(0)
  const [rangePreset, setRangePreset] = useState<'month' | 'week' | 'quarter'>('month')

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 11) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }, [])

  const recentOpColumns: ColumnsType<RecentOperation> = [
    {
      title: 'API',
      dataIndex: 'api',
      key: 'api',
      render: (val: string) => (
        <Text code style={{ background: '#f5f5f5' }}>
          {val}
        </Text>
      ),
    },
    { title: 'API描述', dataIndex: 'desc', key: 'desc' },
    {
      title: '响应状态',
      dataIndex: 'status',
      key: 'status',
      render: (val: number) => <Text style={{ color: val < 300 ? '#16a34a' : '#dc2626' }}>{val}</Text>,
    },
    { title: '请求时间', dataIndex: 'time', key: 'time' },
    { title: '操作人', dataIndex: 'operator', key: 'operator' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* 早上好 + AI 助手建议 卡片 */}
        <Col xs={24} lg={10}>
          <Card style={{ height: '100%' }} styles={{ body: { padding: 20 } }}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
              {greeting}，JJ 👋
            </Title>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined />}
                style={{ position: 'absolute', right: 0, top: -2, color: '#6b7280' }}
              >
                换一批
              </Button>

              <Space direction="vertical" size={8} style={{ width: '100%', paddingRight: 72 }}>
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s.text}
                    icon={s.icon}
                    style={{
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f5f6fa',
                      border: 'none',
                      color: '#374151',
                      height: 32,
                    }}
                  >
                    {s.text}
                  </Button>
                ))}
              </Space>
            </div>

            <Input
              size="large"
              placeholder="今天有什么可以帮你的？"
              style={{ borderRadius: 999, paddingRight: 6 }}
              suffix={
                <Button
                  type="primary"
                  shape="circle"
                  size="small"
                  icon={<SendOutlined />}
                  aria-label="发送"
                />
              }
            />
          </Card>
        </Col>

        {/* 导流服监控 卡片 */}
        <Col xs={24} lg={7}>
          <Card style={{ height: '100%' }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Space size={6}>
                <Text strong style={{ fontSize: 15 }}>
                  导流服监控
                </Text>
                <Tag color="blue">ID 5</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                开服时间：2025-06-22 23:59:00
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Space align="baseline" style={{ marginBottom: 6 }}>
                <Text style={{ color: '#6b7280' }}>开服进度</Text>
                <Text strong style={{ fontSize: 18 }}>
                  47 %
                </Text>
              </Space>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Progress percent={47} showInfo={false} strokeColor="#3b82f6" style={{ flex: 1 }} />
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  47,398/100,000人
                </Text>
              </div>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  导流服创建角色 <RightOutlined style={{ fontSize: 9 }} />
                </Text>
                <Text strong style={{ fontSize: 18 }}>
                  47,398
                </Text>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  导流服付费人数 <RightOutlined style={{ fontSize: 9 }} />
                </Text>
                <Text strong style={{ fontSize: 18 }}>
                  6,000
                </Text>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  距离上次开服已过{' '}
                  <Tooltip title="距最近一次执行开服操作的时长">
                    <QuestionCircleOutlined style={{ fontSize: 11 }} />
                  </Tooltip>
                </Text>
                <Text strong style={{ fontSize: 18 }}>
                  3 天 1 小时
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 部署总览 卡片 */}
        <Col xs={24} lg={7}>
          <Card style={{ height: '100%' }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 15 }}>
                部署总览
              </Text>
              <Button type="link" size="small" style={{ padding: 0 }}>
                详情 <RightOutlined style={{ fontSize: 10 }} />
              </Button>
            </div>

            <Space align="center" style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 22 }}>
                v.2.4
              </Text>
              <Tag color="green">当前客户端</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                33个应用
              </Text>
            </Space>

            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  运行中
                </Text>
                <Text strong style={{ fontSize: 18 }}>
                  32
                </Text>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  异常
                </Text>
                <Text strong style={{ fontSize: 18, color: '#dc2626' }}>
                  1
                </Text>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  未启动
                </Text>
                <Text strong style={{ fontSize: 18 }}>
                  0
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 指标数据 */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15 }}>
            指标数据
          </Text>
          <Space size={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              数据时间：2025-06-01 ~ 2026-07-01
            </Text>
            <Select
              size="small"
              value={rangePreset}
              onChange={setRangePreset}
              style={{ width: 88 }}
              options={[
                { value: 'week', label: '本周' },
                { value: 'month', label: '本月' },
                { value: 'quarter', label: '本季度' },
              ]}
            />
          </Space>
        </div>

        <Row gutter={32}>
          {METRIC_PAGES[metricsPageIndex].map((config) => (
            <Col xs={24} md={8} key={config.title}>
              <MetricMiniCard config={config} />
            </Col>
          ))}
        </Row>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {METRIC_PAGES.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setMetricsPageIndex(idx)}
              style={{
                width: idx === metricsPageIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: idx === metricsPageIndex ? '#3b82f6' : '#e5e7eb',
                cursor: 'pointer',
                transition: 'width 0.15s ease',
              }}
            />
          ))}
        </div>
      </Card>

      {/* 最近操作 */}
      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 15 }}>
            最近操作
          </Text>
          <Button type="link" size="small" style={{ padding: 0 }}>
            详情 <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        </div>

        <Table columns={recentOpColumns} dataSource={RECENT_OPERATIONS} pagination={false} size="middle" />

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button type="link" size="small">
            查看更多 ↓
          </Button>
        </div>
      </Card>
    </div>
  )
}
