'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Row, Col, Select, DatePicker, Space, Typography, message, Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Line } from '@antv/g2plot'
import dayjs, { Dayjs } from 'dayjs'

const { Text } = Typography
const { RangePicker } = DatePicker

// ==================== 常量（对应 PRD：20260902-应用详情页新增资源使用率-prd.md） ====================

const WARNING_THRESHOLD = 80 // 预警阈值，固定 80%，不支持自定义（PRD 三、2）
const REFRESH_INTERVAL_MS = 15000 // 当前数值 / 趋势图最新数据点刷新间隔（PRD 一、2；二、4）
const MAX_CUSTOM_DAYS = 7 // 自定义范围最长 7 天（PRD 二、2）

type RangeKey = '1h' | '6h' | '24h' | 'custom'

// 仅用于原型演示，让评审者可以直接切换查看各种边界状态，不是真实交互
type DemoState = 'normal' | 'noPod' | 'noData'

interface UsagePoint {
  time: string
  value: number
}



const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '1h', label: '1小时' },
  { value: '6h', label: '6小时' },
  { value: '24h', label: '24小时' },
  { value: 'custom', label: '自定义' },
]

// 三档预设的采样粒度（PRD 二、2）
const PRESET_RANGE_CONFIG: Record<'1h' | '6h' | '24h', { points: number; stepMinutes: number }> = {
  '1h': { points: 60, stepMinutes: 1 },
  '6h': { points: 72, stepMinutes: 5 },
  '24h': { points: 96, stepMinutes: 15 },
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const disabledRange = (start: number, end: number) => Array.from({ length: end - start }, (_, i) => i + start)

function genPresetSeries(points: number, stepMinutes: number, base: number, volatility: number): UsagePoint[] {
  const now = dayjs()
  const arr: UsagePoint[] = []
  let v = base
  for (let i = points - 1; i >= 0; i--) {
    v = clamp(v + (Math.random() - 0.5) * volatility, 1, 99)
    arr.push({
      time: now.subtract(i * stepMinutes, 'minute').format('MM-DD HH:mm'),
      value: Math.round(v),
    })
  }
  return arr
}

// 自定义范围固定按每小时一个点采样（PRD 二、2）
function genCustomSeries(start: Dayjs, end: Dayjs, base: number, volatility: number): UsagePoint[] {
  const hours = Math.max(1, end.diff(start, 'hour'))
  const arr: UsagePoint[] = []
  let v = base
  for (let i = 0; i <= hours; i++) {
    v = clamp(v + (Math.random() - 0.5) * volatility, 1, 99)
    arr.push({
      time: start.add(i, 'hour').format('MM-DD HH:00'),
      value: Math.round(v),
    })
  }
  return arr
}

// ==================== 趋势折线图（封装 @antv/g2plot Line） ====================

function TrendLine({ data, color }: { data: UsagePoint[]; color: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<Line | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!plotRef.current) {
      plotRef.current = new Line(containerRef.current, {
        data,
        xField: 'time',
        yField: 'value',
        height: 160,
        padding: [16, 16, 32, 40],
        smooth: true,
        color,
        point: { size: 0 },
        yAxis: {
          min: 0,
          max: 100,
          label: { formatter: (v: string) => `${v}%` },
        },
        xAxis: { tickCount: 6 },
        tooltip: {
          formatter: (d: Record<string, unknown>) => ({ name: '使用率', value: `${d.value as number}%` }),
        },
        annotations: [
          {
            type: 'line',
            start: ['min', WARNING_THRESHOLD] as [string, number],
            end: ['max', WARNING_THRESHOLD] as [string, number],
            style: { stroke: '#ff4d4f', lineDash: [4, 4] },
            text: {
              content: `预警阈值 ${WARNING_THRESHOLD}%`,
              position: 'end',
              style: { fill: '#ff4d4f', fontSize: 12 },
              offsetY: -6,
            },
          },
        ],
      })
      plotRef.current.render()
    } else {
      plotRef.current.changeData(data)
    }
  }, [data, color])

  useEffect(() => {
    return () => {
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%' }} />
}

// ==================== 单个指标区块（当前值 + 趋势图） ====================

function UsageBlock({
  title,
  value,
  color,
  series,
  emptyReason,
}: {
  title: string
  value: number | null
  color: string
  series: UsagePoint[]
  emptyReason: '无运行 Pod' | '暂无数据' | null
}) {
  const isWarning = value !== null && value >= WARNING_THRESHOLD

  return (
    <div>
      <Space align="baseline" style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>{title}</Text>
        {value !== null && (
          <Text strong style={{ fontSize: 24, color: isWarning ? '#ff4d4f' : '#262626' }}>
            {value}%
          </Text>
        )}
        {value === null && (
          <Text strong style={{ fontSize: 24, color: '#bfbfbf' }}>
            {emptyReason === '无运行 Pod' ? '-' : '暂无数据'}
          </Text>
        )}
      </Space>

      {emptyReason ? (
        <div
          style={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            border: '1px dashed #e8e8e8',
            borderRadius: 4,
            color: '#bfbfbf',
            fontSize: 13,
          }}
        >
          暂无数据
        </div>
      ) : (
        <TrendLine data={series} color={color} />
      )}
    </div>
  )
}

// ==================== 资源使用率卡片 ====================

export default function ResourceUsageCard({
  aggregateNote,
  scopeLabel = '该应用',
}: {
  /** 补充说明文案，例如游服类应用需要说明使用率覆盖所有分组（PRD 一、6） */
  aggregateNote?: string
  /** 统计口径描述，用于 tooltip 文案里的主语，例如「该应用」「全平台」 */
  scopeLabel?: string
}) {
  const [rangeKey, setRangeKey] = useState<RangeKey>('1h')
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [demoState, setDemoState] = useState<DemoState>('normal')
  const [tick, setTick] = useState(0)
  const [cpuCurrent, setCpuCurrent] = useState(42)
  const [memCurrent, setMemCurrent] = useState(58)

  // 模拟「当前数值 / 趋势图最新数据点每 15 秒随后台推送更新」（PRD 一、2；二、4）
  useEffect(() => {
    if (demoState !== 'normal') return
    const timer = setInterval(() => {
      setCpuCurrent((v) => clamp(v + (Math.random() - 0.5) * 8, 1, 99))
      setMemCurrent((v) => clamp(v + (Math.random() - 0.5) * 6, 1, 99))
      setTick((t) => t + 1)
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [demoState])

  const cpuSeries = useMemo(() => {
    if (demoState !== 'normal') return []
    if (rangeKey === 'custom') {
      if (!customRange) return []
      return genCustomSeries(customRange[0], customRange[1], cpuCurrent, 10)
    }
    const cfg = PRESET_RANGE_CONFIG[rangeKey]
    return genPresetSeries(cfg.points, cfg.stepMinutes, cpuCurrent, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, customRange, tick, demoState])

  const memSeries = useMemo(() => {
    if (demoState !== 'normal') return []
    if (rangeKey === 'custom') {
      if (!customRange) return []
      return genCustomSeries(customRange[0], customRange[1], memCurrent, 8)
    }
    const cfg = PRESET_RANGE_CONFIG[rangeKey]
    return genPresetSeries(cfg.points, cfg.stepMinutes, memCurrent, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, customRange, tick, demoState])

  const handleRangeChange = (val: RangeKey) => {
    setRangeKey(val)
    if (val !== 'custom') setCustomRange(null)
  }

  // 自定义范围校验：结束时间需晚于开始时间，且不超过 7 天（PRD 二、5）
  const handleCustomRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (!dates || !dates[0] || !dates[1]) {
      setCustomRange(null)
      return
    }
    const [start, end] = dates as [Dayjs, Dayjs]
    const spanDays = end.diff(start, 'day', true)
    if (spanDays <= 0 || spanDays > MAX_CUSTOM_DAYS) {
      message.error('请选择不超过 7 天的时间范围')
      setCustomRange(null)
      return
    }
    setCustomRange([start, end])
  }

  const emptyReason: '无运行 Pod' | '暂无数据' | null =
    demoState === 'noPod' ? '无运行 Pod' : demoState === 'noData' ? '暂无数据' : null

  return (
    <Card
      title={
        <Space size={6}>
          <span>资源使用率</span>
          <Tooltip title={`CPU/内存使用率 = ${scopeLabel}当前所有运行中 Pod 的实际用量之和 ÷ 已配置限额之和，每 15 秒更新一次；超过 80% 时数值显示为警示色`}>
            <QuestionCircleOutlined style={{ color: '#bfbfbf', fontSize: 13 }} />
          </Tooltip>
        </Space>
      }
      style={{ marginBottom: 24 }}
      extra={
        <Space wrap>
          {/* 以下下拉仅用于原型演示不同状态，非最终交互的一部分 */}
          <Tooltip title="原型演示：切换查看不同状态下的展示效果">
            <Select
              size="small"
              value={demoState}
              onChange={setDemoState}
              style={{ width: 148 }}
              options={[
                { value: 'normal', label: '演示：正常' },
                { value: 'noPod', label: '演示：无运行 Pod' },
                { value: 'noData', label: '演示：暂无监控数据' },
              ]}
            />
          </Tooltip>

          <Select size="small" value={rangeKey} onChange={handleRangeChange} style={{ width: 96 }} options={RANGE_OPTIONS} />

          {rangeKey === 'custom' && (
            <RangePicker
              size="small"
              showTime={{
                format: 'HH:00',
                disabledMinutes: () => disabledRange(1, 60),
                disabledSeconds: () => disabledRange(1, 60),
              }}
              format="YYYY-MM-DD HH:00"
              disabledDate={(current) => !!current && current.isAfter(dayjs(), 'day')}
              onChange={(dates) => handleCustomRangeChange(dates as null | (Dayjs | null)[])}
              placeholder={['开始时间（精确到小时）', '结束时间（精确到小时）']}
            />
          )}
        </Space>
      }
    >
      {aggregateNote && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          {aggregateNote}
        </Text>
      )}

      <Row gutter={32}>
        <Col xs={24} lg={12}>
          <UsageBlock
            title="CPU 使用率"
            value={emptyReason ? null : Math.round(cpuCurrent)}
            color="#1677ff"
            series={cpuSeries}
            emptyReason={emptyReason}
          />
        </Col>
        <Col xs={24} lg={12}>
          <UsageBlock
            title="内存使用率"
            value={emptyReason ? null : Math.round(memCurrent)}
            color="#52c41a"
            series={memSeries}
            emptyReason={emptyReason}
          />
        </Col>
      </Row>
    </Card>
  )
}
