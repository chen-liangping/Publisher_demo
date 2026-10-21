'use client'

import React, { useMemo, useRef, useState } from 'react'
import {
  Card,
  Button,
  Flex,
  Typography,
  Tag,
  Progress,
  Tooltip,
  Popover,
  Modal,
  Form,
  Alert,
  Select,
  Input,
  Steps,
  Collapse,
  Switch,
  Checkbox,
  Badge,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RollbackOutlined,
  SyncOutlined,
  ArrowRightOutlined,
  HistoryOutlined,
  SettingOutlined,
  PauseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import AutoLaunchSteps from './AutoLaunchSteps'
import ZoneStrategyModal from './ZoneStrategyModal'
import LaunchHistoryModal from './LaunchHistoryModal'
import ConfigAutoLaunchModal, { type ConfigConfirmResult } from './ConfigAutoLaunchModal'
import { type StrategyFormValues, type StrategyRow } from './AutoLaunchStrategyForm'
import {
  type ZoneLaunch,
  type ZoneId,
  type StrategyType,
  type ActionStep,
  type AppResource,
  type ZoneServiceId,
  type PartitionDimension,
  initialZones,
  STEP_TITLES,
  formatZoneValueLabel,
  formatDimensionLabel,
  getEffectiveStrategy,
} from './autoLaunchMock'

dayjs.extend(utc)
dayjs.extend(timezone)

const { Text } = Typography

const LABEL_WIDTH = 108

// 单个下次部署资源项：hover 弹出资源明细表
const ResourceItem = ({ app }: { app: AppResource }) => (
  <Popover
    trigger="hover"
    title={
      <span>
        {app.displayName} <Text type="secondary">{app.appName}</Text> · {app.replicasText}
      </span>
    }
    content={
      <table style={{ width: 260, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>名称</th>
            <th style={{ textAlign: 'left' }}>CPU</th>
            <th style={{ textAlign: 'left' }}>内存</th>
          </tr>
        </thead>
        <tbody>
          {app.details.map(d => (
            <tr key={d.name}>
              <td>{d.name}</td>
              <td>{d.cpu}</td>
              <td>{d.memory}</td>
            </tr>
          ))}
        </tbody>
      </table>
    }
  >
    <Text type="secondary" style={{ cursor: 'default' }}>
      应用 {app.displayName}，内存 {app.memoryNum}
      {app.memoryUnit}，CPU {app.cpuNum}
      {app.cpuUnit}
    </Text>
  </Popover>
)

// 自动开服运行态主卡：默认展示全局策略；多区域策略在「更新开服策略」弹窗统一管理
export default function AutoLaunchCard() {
  const [allZones, setZones] = useState<ZoneLaunch[]>(initialZones)
  // 演示开关：是否展示分区开服 / AI 开服（关闭时页面只有默认服，分区数据保留不丢）
  const [showZoneAndAi, setShowZoneAndAi] = useState(false)
  const zones = useMemo(
    () => (showZoneAndAi ? allZones : allZones.filter(z => z.zoneId === 'global')),
    [allZones, showZoneAndAi],
  )
  // 分区维度：lang/country/currency，启用自动开服前在向导配置，启用后锁定，运行态不可改
  const [partitionDimension, setPartitionDimension] = useState<PartitionDimension>('lang')
  // 分区开服：由是否存在非 global 分区派生（有分区即视为开启），不再用独立 state，避免与 zones 不同步
  const zoneLaunchEnabled = zones.some(z => z.zoneId !== 'global')
  // 主卡片固定展示全局默认策略
  const cardZone = zones.find(z => z.zoneId === 'global')!
  // 导流服组点击切换：选中某分区导流服时，左栏展示该分区生效策略；未选则展示默认服策略
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const selectedZone = selectedLang ? zones.find(z => z.zoneId === selectedLang) : undefined
  // 生效策略：自定义分区用自身，继承分区回退到 global
  const displayZone = selectedZone ? getEffectiveStrategy(zones, selectedZone.zoneId) : cardZone

  const isProcessing = cardZone.autoLaunchStatus === 'processing'
  // 未开启自动开服（回退至启用自动开服前）：展示独立的状态卡片
  const isSuspended = cardZone.autoLaunchStatus === 'suspended'
  // 已暂停：展示形态同未开启，但配置保留，可直接恢复
  const isPaused = cardZone.autoLaunchStatus === 'paused'
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 弹窗开关
  const [manualOpen, setManualOpen] = useState(false)
  // 手动开服目标分区（分区开服开启时可选），默认 global
  const [manualZoneId, setManualZoneId] = useState<ZoneId>('global')
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [strategyConfirmOpen, setStrategyConfirmOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // 启用自动开服二次确认
  const [enableOpen, setEnableOpen] = useState(false)
  // 暂停 / 恢复自动开服确认
  const [pauseOpen, setPauseOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  // 暂停期间是否修改过开服策略（恢复后生效）
  const [strategyChangedWhilePaused, setStrategyChangedWhilePaused] = useState(false)
  // 暂停期间修改的开服配置（开服步骤），恢复后才生效；null = 未修改
  const [pendingStepNames, setPendingStepNames] = useState<string[] | null>(null)
  const [stepConfigOpen, setStepConfigOpen] = useState(false)
  const [stepConfigDraft, setStepConfigDraft] = useState<string[]>([])
  // 配置自动开服向导弹窗
  const [configOpen, setConfigOpen] = useState(false)
  // 未开启态卡片折叠展开（对照源前端 ConfigStepsCard）
  const [configCollapsed, setConfigCollapsed] = useState(true)
  const [remark, setRemark] = useState('')
  // 待确认的策略：分区 + 表单值
  const pendingStrategyRef = useRef<{ zoneId: ZoneId; values: StrategyFormValues } | null>(null)
  const [manualForm] = Form.useForm()
  const [rollbackForm] = Form.useForm()

  // 已暂停时长：每分钟刷新一次
  const [nowTick, setNowTick] = useState(() => Date.now())
  React.useEffect(() => {
    if (!isPaused) return
    setNowTick(Date.now())
    const t = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [isPaused])

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  React.useEffect(() => () => clearTimer(), [])
  // 打开手动开服弹窗时重置目标分区为默认服
  React.useEffect(() => {
    if (manualOpen) setManualZoneId('global')
  }, [manualOpen])

  // 更新指定分区
  const patchZone = (zoneId: ZoneId, patch: Partial<ZoneLaunch>) => {
    setZones(prev => prev.map(z => (z.zoneId === zoneId ? { ...z, ...patch } : z)))
  }

  // 独立分区恢复继承全局默认策略：清除覆盖标记，策略字段回退到 global
  const onResetZone = (zoneId: ZoneId) => {
    patchZone(zoneId, {
      override: false,
      cron: undefined,
      progressList: undefined,
      effectPeriodText: undefined,
      nextStrategyText: undefined,
    })
    const z = zones.find(x => x.zoneId === zoneId)
    message.success(`${z?.zoneName ?? zoneId}已恢复继承全局默认策略`)
  }

  // 删除某个分区：移除该分区及其导流服，global 不可删除
  const onDeleteZone = (zoneId: ZoneId) => {
    if (zoneId === 'global') return
    const z = zones.find(x => x.zoneId === zoneId)
    setZones(prev => prev.filter(x => x.zoneId !== zoneId))
    if (selectedLang === zoneId) setSelectedLang(null)
    message.success(`${z?.zoneName ?? zoneId}已删除`)
  }

  // CRON 进度（全局策略为 cron 时展示）
  const cronProgress = useMemo(() => {
    if (displayZone.strategyType !== 'cron' || !displayZone.cron) return null
    const last = dayjs(displayZone.cron.lastTriggerAt)
    const next = dayjs(displayZone.cron.cronTimeAt)
    const now = dayjs()
    const hoursSinceLast = Math.max(0, now.diff(last, 'hour', true))
    const intervalHours = Math.max(0.01, next.diff(last, 'hour', true))
    const percent = Math.min(100, (hoursSinceLast / intervalHours) * 100)
    const nextTimeText = `${next.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')} (JST)`
    return { hoursSinceLast, intervalHours, percent, nextTimeText }
  }, [displayZone.strategyType, displayZone.cron])

  // 模拟开服流程：逐步推进步骤，完成后写入目标分区历史
  const simulateLaunchCycle = (newServerId: number, targetZoneId: ZoneId = 'global', lang?: string) => {
    const target = zones.find(z => z.zoneId === targetZoneId) ?? cardZone
    const baseSteps = target.steps.length ? target.steps : cardZone.steps
    const initialSteps: ActionStep[] = baseSteps.map(s => ({ ...s, status: 'need_execute', errMsg: undefined }))
    patchZone(targetZoneId, {
      autoLaunchStatus: 'processing',
      curMaxServiceId: newServerId,
      steps: initialSteps,
    })

    let idx = 0
    clearTimer()
    timerRef.current = setInterval(() => {
      setZones(prev =>
        prev.map(z => {
          if (z.zoneId !== targetZoneId) return z
          if (idx >= z.steps.length) {
            clearTimer()
            const historyItem = {
              serverId: newServerId,
              triggeredAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              lang: lang ?? z.lang ?? 'ja',
              reason: '手动开服',
              source: 'strategy' as const,
              zone: targetZoneId,
            }
            message.success(`已开启 ${newServerId} 服`)
            return {
              ...z,
              autoLaunchStatus: 'idle',
              launchHistory: [historyItem, ...z.launchHistory],
            }
          }
          const nextSteps = z.steps.map((s, i) =>
            i <= idx ? { ...s, status: 'ok' as const, errMsg: undefined } : s,
          )
          idx += 1
          return { ...z, steps: nextSteps }
        }),
      )
    }, 1200)
  }

  const onManualOk = () => {
    // 游服 ID 不可修改，固定为目标分区当前最大服 ID + 1
    const targetZone = zones.find(z => z.zoneId === manualZoneId) ?? cardZone
    const newServerId = targetZone.curMaxServiceId + 1
    setManualOpen(false)
    simulateLaunchCycle(newServerId, manualZoneId, targetZone.lang)
  }

  const formatStrategyRowText = (s: StrategyRow): string => {
    const parts: string[] = []
    if (s.createRole) parts.push(`创角人数${s.createRole}`)
    if (s.paidUsers) parts.push(`付费人数${s.paidUsers}`)
    if (s.afterValue) parts.push(`前次开服经过 ${s.afterUnit === 'day' ? `${s.afterValue}天` : `${s.afterValue}小时`}`)
    return parts.join('，')
  }

  const formatCronText = (c: NonNullable<StrategyFormValues['autoLaunchCron']>): string => {
    const time = `JST ${String(c.hour ?? 0).padStart(2, '0')}:${String(c.minute ?? 0).padStart(2, '0')}`
    const weekLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    switch (c.mode) {
      case 'daily':
        return `每日 ${time} 定时开服`
      case 'weekly':
        return `每周${weekLabels[c.dayOfWeek ?? 0]} ${time} 定时开服`
      case 'monthly':
        return `每月第${c.dayOfMonth ?? 1}日 ${time} 定时开服`
      case 'interval': {
        const unitMap = { hour: '小时', day: '天', week: '周' } as const
        return `每间隔${c.interval ?? 1}${unitMap[c.intervalUnit ?? 'hour']}开服`
      }
    }
  }

  const formatEffectPeriodText = (v: StrategyFormValues): string => {
    if (v.effectPeriodType !== 'part' || !v.effectPeriod) return '全时段'
    const { effectStartTime: s, effectEndTime: e } = v.effectPeriod
    const fmt = (t: { hour: number; minute: number }) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
    return `JST ${fmt(s)} ~ ${fmt(e)}`
  }

  // 由策略表单值构造写入 ZoneLaunch 的策略字段补丁（供 global 与各自定义分区复用）
  const buildStrategyPatch = (values: StrategyFormValues): Partial<ZoneLaunch> => {
    const nextType: StrategyType = values.strategyType === 'cron' ? 'cron' : 'strategy'
    const patch: Partial<ZoneLaunch> = { strategyType: nextType }
    if (nextType === 'strategy') {
      const first = values.strategies?.[0] ?? {}
      patch.progressList = [
        { label: `创角人数 ${first.createRole ?? 0}人`, current: 0, target: Number(first.createRole ?? 0), unit: '人' },
        { label: `付费人数 ${first.paidUsers ?? 0}人`, current: 0, target: Number(first.paidUsers ?? 0), unit: '人' },
        {
          label: `前次开服经过 ${first.afterValue ?? 0}${first.afterUnit === 'day' ? '天' : '小时'}`,
          current: 0,
          target: Number(first.afterValue ?? 0),
          unit: first.afterUnit === 'day' ? '天' : '小时',
        },
      ]
      patch.effectPeriodText = formatEffectPeriodText(values)
      const nextStrategyText = values.strategies
        ?.map((s, i) => `【条件${i + 1}】${formatStrategyRowText(s)}`)
        .join('；')
      patch.nextStrategyText = nextStrategyText ? `${nextStrategyText} 任一条件后自动开服` : undefined
    } else if (values.autoLaunchCron) {
      patch.cron = {
        cronTimeAt: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
        lastTriggerAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      patch.effectPeriodText = formatCronText(values.autoLaunchCron)
      patch.progressList = undefined
      patch.nextStrategyText = undefined
    }
    return patch
  }

  // 多分区弹窗保存：先弹备注二次确认
  const onStrategySave = (zoneId: ZoneId, values: StrategyFormValues) => {
    pendingStrategyRef.current = { zoneId, values }
    setStrategyOpen(false)
    setStrategyConfirmOpen(true)
  }

  // 二次确认：写入对应分区策略（非覆盖分区保存即创建独立覆盖）
  const onStrategyConfirmOk = () => {
    const pending = pendingStrategyRef.current
    if (!pending) return
    const { zoneId, values } = pending
    const nextType: StrategyType = values.strategyType === 'cron' ? 'cron' : 'strategy'
    const targetZone = zones.find(z => z.zoneId === zoneId)!

    if (nextType === 'strategy') {
      const first = values.strategies?.[0] ?? {}
      const freshList = [
        { label: `创角人数 ${first.createRole ?? 0}人`, current: 0, target: Number(first.createRole ?? 0), unit: '人' },
        { label: `付费人数 ${first.paidUsers ?? 0}人`, current: 0, target: Number(first.paidUsers ?? 0), unit: '人' },
        {
          label: `前次开服经过 ${first.afterValue ?? 0}${first.afterUnit === 'day' ? '天' : '小时'}`,
          current: 0,
          target: Number(first.afterValue ?? 0),
          unit: first.afterUnit === 'day' ? '天' : '小时',
        },
      ]
      // 暂停期间改策略：只换条件阈值，累计进度保留，恢复后按新阈值判断
      const progressList = isPaused
        ? freshList.map((p, i) => ({ ...p, current: targetZone.progressList?.[i]?.current ?? 0 }))
        : freshList
      const nextStrategyText = values.strategies
        ?.map((s, i) => `【条件${i + 1}】${formatStrategyRowText(s)}`)
        .join('；')
      patchZone(zoneId, {
        override: true,
        strategyType: 'strategy',
        effectPeriodText: formatEffectPeriodText(values),
        progressList,
        nextStrategyText: nextStrategyText ? `${nextStrategyText} 任一条件后自动开服` : targetZone.nextStrategyText,
      })
    } else if (values.autoLaunchCron) {
      patchZone(zoneId, {
        override: true,
        strategyType: 'cron',
        cron: {
          cronTimeAt: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
          lastTriggerAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        },
        effectPeriodText: formatCronText(values.autoLaunchCron),
      })
    }
    setStrategyConfirmOpen(false)
    const zoneLabel = zoneId === 'global' ? '全局默认' : targetZone.zoneName
    if (isPaused) {
      setStrategyChangedWhilePaused(true)
      message.success(`${zoneLabel}开服策略已保存，恢复自动开服后生效`)
      return
    }
    message.success(remark ? `${zoneLabel}开服策略已更新（备注：${remark}）` : `${zoneLabel}开服策略已更新`)
  }

  const onTerminateOk = () => {
    clearTimer()
    patchZone('global', {
      autoLaunchStatus: 'idle',
      steps: cardZone.steps.map(s => ({
        ...s,
        status: s.status === 'ok' ? ('ok' as const) : ('failed' as const),
        errMsg: s.status === 'ok' ? undefined : '已终止开服并回退',
      })),
    })
    setTerminateOpen(false)
    message.success('已终止开服并回退')
  }

  const onRollbackOk = async () => {
    const values = await rollbackForm.validateFields()
    const target = Number(values.serverId)
    // 回退到 0 服 = 回退到启用自动开服前的状态：进入未开启态
    patchZone('global', {
      curMaxServiceId: target,
      rollbackProdOpen: target > 0,
      ...(target === 0 ? { autoLaunchStatus: 'suspended' as const } : {}),
      launchHistory:
        target === 0
          ? cardZone.launchHistory
          : [
              {
                serverId: target,
                triggeredAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                lang: 'ja',
                reason: `手动回退到 ${target} 服开启状态`,
                source: 'strategy',
                zone: 'global',
              },
              ...cardZone.launchHistory,
            ],
    })
    setRollbackOpen(false)
    message.success(`已回退到 ${target === 0 ? '启用自动开服前' : `${target} 服`} 的状态`)
  }

  // 启用自动开服：从 suspended 回到 idle，并按生产语义自动触发一次开服流程
  const onEnableOk = () => {
    patchZone('global', { autoLaunchStatus: 'idle', rollbackProdOpen: true })
    setEnableOpen(false)
    simulateLaunchCycle(cardZone.curMaxServiceId + 1)
    message.success('自动开服已启用')
  }

  // 暂停自动开服：所有分区停止监控与自动开服，策略/步骤/开服记录全部保留
  const onPauseOk = () => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    setZones(prev => prev.map(z => ({ ...z, autoLaunchStatus: 'paused' as const, pausedAt: now })))
    setSelectedLang(null)
    setStrategyChangedWhilePaused(false)
    setPendingStepNames(null)
    setPauseOpen(false)
    message.success('自动开服已暂停')
  }

  // 原型模拟：暂停期间的累计数据（真实环境由后端返回导流服实际数据）
  // 人数类按 2.5 倍模拟增长；时长类加上已暂停时长
  const getAccumulated = (list?: ZoneLaunch['progressList'], pausedAt?: string) => {
    const pausedHours = pausedAt ? Math.max(0, dayjs().diff(dayjs(pausedAt), 'hour', true)) : 0
    return list?.map(p => {
      if (p.unit === '人') return { ...p, current: Math.round(p.current * 2.5) }
      const add = p.unit === '天' ? pausedHours / 24 : pausedHours
      return { ...p, current: Math.floor(p.current + add) }
    })
  }
  const isProgressMet = (list?: ZoneLaunch['progressList']) => !!list?.some(p => p.target > 0 && p.current >= p.target)

  // 恢复自动开服：重新开启监控，按最新开服策略 + 暂停期间累计数据判断
  // - 服 ID 延续暂停前序号（curMaxServiceId + 1），不可修改
  // - 已满足条件则立即开服，最多 1 次；开服后新导流服从 0 计数，不会连续开服
  // - 定时开服：暂停期间错过的时间点不补，按下一个时间点执行
  // 开服配置可选步骤：通知与监控固定执行，部署通知 / 预备服可开关
  const STEP_CONFIG_OPTIONS: { name: string; fixed: boolean }[] = [
    { name: 'open_server_notify', fixed: true },
    { name: 'new_server_alert_update', fixed: true },
    { name: 'new_server_notify', fixed: false },
    { name: 'new_server_provision', fixed: false },
  ]
  // 由步骤名构造步骤列表：沿用已有步骤的链接等信息，新增步骤为等待执行
  const buildSteps = (names: string[]): ActionStep[] =>
    STEP_CONFIG_OPTIONS.filter(o => names.includes(o.name)).map(
      o => cardZone.steps.find(st => st.name === o.name) ?? { name: o.name, title: STEP_TITLES[o.name], status: 'need_execute' as const },
    )
  // 最新开服步骤：暂停期间改过则用待生效配置
  const latestSteps = pendingStepNames ? buildSteps(pendingStepNames) : cardZone.steps

  const openStepConfig = () => {
    setStepConfigDraft(latestSteps.map(st => st.name))
    setStepConfigOpen(true)
  }
  // 暂停期间保存开服配置：只存为待生效，恢复后应用
  const onStepConfigSave = () => {
    const current = cardZone.steps.map(st => st.name)
    const same = current.length === stepConfigDraft.length && current.every(n => stepConfigDraft.includes(n))
    setPendingStepNames(same ? null : [...stepConfigDraft])
    setStepConfigOpen(false)
    message.success(same ? '开服配置未变化' : '开服配置已保存，恢复自动开服后生效')
  }

  const onResumeOk = () => {
    const resetProgress = (list?: ZoneLaunch['progressList']) => list?.map(p => ({ ...p, current: 0 }))
    const resumeCron = (c?: ZoneLaunch['cron']) =>
      c && dayjs(c.cronTimeAt).isBefore(dayjs()) ? { ...c, cronTimeAt: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss') } : c

    const globalProgress = getAccumulated(cardZone.progressList, cardZone.pausedAt)
    const globalMet = cardZone.strategyType === 'strategy' && isProgressMet(globalProgress)

    setZones(prev =>
      prev.map(z => ({
        ...z,
        autoLaunchStatus: 'idle' as const,
        pausedAt: undefined,
        cron: resumeCron(z.cron),
        progressList:
          z.zoneId === 'global' ? (globalMet ? resetProgress(globalProgress) : globalProgress) : z.progressList,
        // 暂停期间修改的开服配置在恢复时生效
        steps: z.zoneId === 'global' && pendingStepNames ? buildSteps(pendingStepNames) : z.steps,
      })),
    )
    setStrategyChangedWhilePaused(false)
    setPendingStepNames(null)
    setResumeOpen(false)
    if (globalMet) {
      simulateLaunchCycle(cardZone.curMaxServiceId + 1)
      message.success(`自动开服已恢复，已满足开服条件，开启 ${cardZone.curMaxServiceId + 1} 服`)
    } else {
      message.success('自动开服已恢复，未满足开服条件，继续监控')
    }
  }

  // 配置向导确认：将向导中配置的策略应用到全局分区，启用自动开服并触发一次开服流程
  // 同时写回分区开服开关与分区列表（新增/删除的用户分区）
  const onConfigConfirm = (result: ConfigConfirmResult) => {
    const { strategy: values, partitionDimension: nextDim, zoneLaunchEnabled: nextZoneLaunchEnabled, zones: nextZones, customStrategies } = result
    // 写回分区维度（启用后锁定）
    setPartitionDimension(nextDim)
    // 分区开服关闭时，所有非 global 分区强制继承默认服策略
    const forceInherit = (z: ZoneLaunch): ZoneLaunch =>
      z.zoneId === 'global' || nextZoneLaunchEnabled
        ? z
        : { ...z, override: false, strategyType: 'strategy' as StrategyType, progressList: undefined, nextStrategyText: undefined, effectPeriodText: undefined, cron: undefined }
    // 合并分区：保留 global，非 global 用向导回传的列表替换；自定义分区写入其独立策略，继承分区清空策略字段回退到 global
    setZones(prev => {
      const global = prev.find(z => z.zoneId === 'global') ?? prev[0]
      // 分区/AI 隐藏时，向导里看不到分区，不改动已有分区
      if (!showZoneAndAi) return prev
      const merged = nextZones.map(z => {
        const inherited = forceInherit(z)
        if (inherited.override && customStrategies[inherited.zoneId]) {
          return { ...inherited, autoLaunchStatus: 'idle' as const, rollbackProdOpen: true, ...buildStrategyPatch(customStrategies[inherited.zoneId]) }
        }
        return {
          ...inherited,
          override: false,
          strategyType: 'strategy' as StrategyType,
          progressList: undefined,
          nextStrategyText: undefined,
          effectPeriodText: undefined,
          cron: undefined,
        }
      })
      return [global, ...merged]
    })
    // 默认服（global）写入主策略
    patchZone('global', { autoLaunchStatus: 'idle', rollbackProdOpen: true, ...buildStrategyPatch(values) })
    setConfigOpen(false)
    simulateLaunchCycle(cardZone.curMaxServiceId + 1)
    message.success('自动开服已启用')
  }

  const onTriggerCallback = (step: ActionStep) => {
    patchZone('global', {
      steps: cardZone.steps.map(s => (s.name === step.name ? { ...s, status: 'ok', errMsg: undefined } : s)),
    })
    message.success('触发回调成功')
  }

  // 标题区
  const title = (
    <Flex align="center" gap={12} wrap="wrap">
      <span>自动开服</span>
      {!showZoneAndAi && !isPaused ? null : isPaused ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '1px 10px',
            borderRadius: 999,
            background: 'rgba(250,140,22,0.10)',
            color: '#D46B08',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '20px',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FA8C16' }} />
          已暂停
        </span>
      ) : isSuspended ? null : selectedLang && selectedZone ? (
        <Tag style={{ borderRadius: 999, border: 0, background: '#722ED1', color: '#fff', margin: 0 }}>
          {selectedZone.zoneName}{selectedZone.override ? '' : '·继承默认'}
        </Tag>
      ) : (
        <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.65)', margin: 0 }}>
          全局默认策略
        </Tag>
      )}
      {isProcessing ? (
        <Tooltip title="开服进行中">
          <SyncOutlined spin style={{ fontSize: 14, color: '#1677ff' }} />
        </Tooltip>
      ) : null}
    </Flex>
  )

  // 操作区
  const extra = (
    <Flex gap={12} wrap="wrap" align="center">
      {/* 演示开关：分区 / AI 开服 */}
      <Flex align="center" gap={6} style={{ marginRight: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>分区/AI</Text>
        <Switch
          size="small"
          checked={showZoneAndAi}
          onChange={v => {
            setShowZoneAndAi(v)
            setSelectedLang(null)
          }}
        />
      </Flex>
      {isPaused ? (
        <>
          {/* 暂停期间改过：按钮右上角小红点，hover 提示待恢复后生效 */}
          <Tooltip title={strategyChangedWhilePaused ? '策略已修改，待恢复后生效' : undefined}>
            <Badge dot={strategyChangedWhilePaused} offset={[-2, 2]}>
              <Button icon={<ArrowRightOutlined />} onClick={() => setStrategyOpen(true)}>
                更新开服策略
              </Button>
            </Badge>
          </Tooltip>
          <Tooltip title={pendingStepNames ? '配置已修改，待恢复后生效' : undefined}>
            <Badge dot={!!pendingStepNames} offset={[-2, 2]}>
              <Button icon={<ArrowRightOutlined />} onClick={openStepConfig}>
                更新开服配置
              </Button>
            </Badge>
          </Tooltip>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setResumeOpen(true)}
          >
            恢复自动开服
          </Button>
        </>
      ) : isSuspended ? (
        <>
          <Button icon={<SettingOutlined />} onClick={() => setConfigOpen(true)}>
            配置
          </Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setEnableOpen(true)}>
            启用
          </Button>
        </>
      ) : (
        <>
          <Button icon={<ArrowRightOutlined />} onClick={() => setStrategyOpen(true)}>
            更新开服策略
          </Button>
          <Button icon={<ArrowRightOutlined />} onClick={() => message.info('跳转开服配置页（原型占位）')}>
            更新开服配置
          </Button>
          <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
            开服记录
          </Button>
          <Tooltip title={isProcessing ? '开服进行中，完成后才能暂停' : undefined}>
            <Button icon={<PauseCircleOutlined />} disabled={isProcessing} onClick={() => setPauseOpen(true)}>
              暂停自动开服
            </Button>
          </Tooltip>
          {isProcessing ? (
            <Button danger type="primary" icon={<PauseCircleOutlined />} onClick={() => setTerminateOpen(true)}>
              终止开服并回退
            </Button>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setManualOpen(true)}>
              手动开服
            </Button>
          )}
        </>
      )}
    </Flex>
  )

  // 左栏：当前选中分区的生效策略视图（未选导流服时展示默认服策略）
  const renderLeft = () => (
    <Flex vertical gap={8} style={{ flex: 1 }}>
      {/* 当前开服策略 */}
      <Flex>
        <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>当前开服策略</div>
        <div style={{ flex: 1 }}>
          {displayZone.strategyType === 'cron' ? (
            <Text>{displayZone.effectPeriodText ?? '定时开服'}</Text>
          ) : (
            <div>
              <Text>
                在 {displayZone.effectPeriodText ?? '全时段'} 时间段内，满足以下
                {displayZone.progressList && displayZone.progressList.length > 1 ? '任一' : ''}条件后自动开服
              </Text>
            </div>
          )}
        </div>
      </Flex>

      {/* CRON 进度 */}
      {displayZone.strategyType === 'cron' && cronProgress ? (
        <Flex vertical style={{ marginLeft: LABEL_WIDTH }}>
          <Flex justify="space-between" style={{ marginBottom: -4 }}>
            <Text>下次开服时间：{cronProgress.nextTimeText}</Text>
            <Text>
              <Text style={{ color: '#1677ff' }}>{cronProgress.hoursSinceLast.toFixed(0)}</Text>
              <Text type="secondary">/{cronProgress.intervalHours.toFixed(0)} 小时</Text>
            </Text>
          </Flex>
          <Tooltip title={`${cronProgress.percent.toFixed(2)}%`}>
            <Progress percent={cronProgress.percent} status="active" showInfo={false} />
          </Tooltip>
        </Flex>
      ) : null}

      {/* STRATEGY 进度 */}
      {displayZone.strategyType === 'strategy' && displayZone.progressList?.length ? (
        <Flex vertical style={{ marginLeft: LABEL_WIDTH }}>
          {displayZone.progressList.map(p => {
            const percent = (p.current / p.target) * 100
            return (
              <Flex vertical key={p.label}>
                <Flex justify="space-between" style={{ marginBottom: -4 }}>
                  <Text>{p.label}</Text>
                  <Text>
                    <Text style={{ color: '#1677ff' }}>{p.current.toLocaleString()}</Text>
                    <Text type="secondary">
                      /{p.target} {p.unit}
                    </Text>
                  </Text>
                </Flex>
                <Tooltip title={percent > 100 ? '> 100%' : `${percent.toFixed(2)}%`}>
                  <Progress percent={percent} status="active" showInfo={false} />
                </Tooltip>
              </Flex>
            )
          })}
        </Flex>
      ) : null}

      {/* 下次开服策略（仅 strategy） */}
      {displayZone.strategyType === 'strategy' ? (
        <Flex>
          <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>下次开服策略</div>
          <div style={{ flex: 1 }}>
            {displayZone.nextStrategyText ? (
              <Text type="secondary">{displayZone.nextStrategyText}</Text>
            ) : (
              <Text type="secondary">N/A</Text>
            )}
          </div>
        </Flex>
      ) : null}

      {/* 下次部署资源 */}
      {displayZone.applications.length ? (
        <Flex>
          <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>下次部署资源</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {displayZone.applications.map(app => (
              <ResourceItem key={app.appName} app={app} />
            ))}
          </div>
        </Flex>
      ) : null}
    </Flex>
  )

  // 右栏导流服组：聚合所有语种区导流服。导流服始终按策略触发开服；AI 推断触发是否生效由运营脚本配置，与页面无关
  const onboardingServers: ZoneServiceId[] = zones
    .filter(z => z.zoneId !== 'global')
    .flatMap(z => z.ai.onboardingServers)

  // 未开启自动开服（回退至启用自动开服前）的配置步骤卡片主体
  // 对照源前端 ConfigStepsCard：展示配置开服策略 / 配置开服步骤 / 确认配置 三步，不展示当前策略与下次开服策略
  const renderSuspended = () => {
    // 回退至启用前 = 配置已完成、等待启用，三步均完成
    const currentStep = 3
    // 步骤一摘要：已配置的开服策略
    const strategySummary =
      cardZone.strategyType === 'cron'
        ? `定时开服：${cardZone.effectPeriodText ?? '定时开服'}`
        : cardZone.nextStrategyText ?? '策略开服'
    // 步骤二摘要：已配置的开服步骤标题
    const configuredStepsText = cardZone.steps.map(s => s.title).join('、')

    const configSteps = [
      {
        title: '配置开服策略',
        description: <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>{strategySummary}</Text>,
      },
      {
        title: '配置开服步骤',
        description: (
          <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
            {currentStep > 1 ? `已配置：${configuredStepsText}` : '可配置开服通知API、部署通知API、新建预备服'}
          </Text>
        ),
      },
      {
        title: '确认配置',
        description: <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>确认已填写的自动开服配置</Text>,
      },
    ]

    return (
      <Flex vertical gap={16} style={{ paddingInline: 24 }}>
        <Alert
          type="warning"
          showIcon
          closable={false}
          message="需要持续开启新区（滚服）的多区服游戏，请务必接入，便于平台持续优化导量效果。"
        />
        <Steps size="small" current={currentStep} items={configSteps} style={{ marginTop: 4 }} />
      </Flex>
    )
  }

  // 暂停态主体：不展示策略进度/下次策略/下次资源，只展示暂停状态、保留的配置与导流服现状
  const renderPaused = () => {
    const pausedAt = cardZone.pausedAt ? dayjs(cardZone.pausedAt) : null
    const mins = pausedAt ? Math.max(0, Math.floor((nowTick - pausedAt.valueOf()) / 60000)) : 0
    const durationText = mins < 1 ? '不到 1 分钟' : mins < 60 ? `${mins} 分钟` : `${Math.floor(mins / 60)} 小时 ${mins % 60} 分钟`
    const lastLaunch = cardZone.launchHistory[0]
    const subZones = zones.filter(z => z.zoneId !== 'global')
    const keptItems = [
      cardZone.strategyType === 'cron'
        ? '定时开服'
        : `条件开服 · ${cardZone.progressList?.filter(p => p.target > 0).length ?? 0} 个条件`,
      ...(showZoneAndAi
        ? [zoneLaunchEnabled ? `分区开服 · ${formatDimensionLabel(partitionDimension)} ${subZones.length} 区` : '未分区']
        : []),
      `开服步骤 · ${latestSteps.length} 步`,
    ]
    const labelStyle: React.CSSProperties = { fontSize: 12, color: 'rgba(0,0,0,0.45)' }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', paddingInline: 24, gap: 0 }}>
        {/* 左：暂停状态 */}
        <div style={{ flex: '1 1 0', minWidth: 280, paddingInline: 4 }}>
          <div
            style={{
              borderRadius: 12,
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(250,140,22,0.06) 0%, rgba(0,0,0,0.015) 60%)',
              border: '1px solid rgba(250,140,22,0.16)',
            }}
          >
            <Flex gap={16} align="flex-start">
              <div
                style={{
                  flex: 'none',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#fff',
                  color: '#FA8C16',
                  fontSize: 20,
                  boxShadow: '0 1px 3px rgba(250,140,22,0.18)',
                }}
              >
                <PauseOutlined />
              </div>
              <Flex vertical gap={4} style={{ minWidth: 0 }}>
                <Text strong style={{ fontSize: 16 }}>
                  监控与自动开服已暂停
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  已开的服正常运行，不会新开服；配置已保留，随时可以恢复
                </Text>
                <Flex align="center" gap={6} style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                  <ClockCircleOutlined />
                  <span>
                    暂停于 {pausedAt ? pausedAt.format('MM-DD HH:mm') : '-'} · 已暂停 {durationText}
                  </span>
                </Flex>
              </Flex>
            </Flex>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '16px 0 12px' }} />

            <Flex align="center" gap={8} wrap="wrap">
              <span style={labelStyle}>已保留</span>
              {keptItems.map(t => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.06)',
                    color: 'rgba(0,0,0,0.65)',
                  }}
                >
                  {t}
                </span>
              ))}
            </Flex>
          </div>
        </div>

        <div aria-hidden style={{ width: 1, alignSelf: 'stretch', background: 'rgba(0,0,0,0.08)', marginInline: 20 }} />

        {/* 右：导流服现状（暂停期间保持不变） */}
        <Flex vertical gap={16} style={{ flex: '1 1 0', minWidth: 240, paddingBlock: 4 }}>
          <Flex gap={40} wrap="wrap">
            <Flex vertical gap={2}>
              <span style={labelStyle}>导流服 ID</span>
              <Text strong style={{ fontSize: 26, lineHeight: '34px', fontFamily: 'DIN Alternate', color: 'rgba(0,0,0,0.65)' }}>
                {cardZone.curMaxServiceId}
              </Text>
            </Flex>
            <Flex vertical gap={2}>
              <span style={labelStyle}>恢复后下一个开服</span>
              <Text style={{ fontSize: 14, lineHeight: '34px' }}>
                {cardZone.curMaxServiceId + 1} 服 <Text type="secondary" style={{ fontSize: 12 }}>延续序号</Text>
              </Text>
            </Flex>
            <Flex vertical gap={2}>
              <span style={labelStyle}>最近一次开服</span>
              <Text style={{ fontSize: 14, lineHeight: '34px' }}>
                {lastLaunch ? `${lastLaunch.serverId} 服 · ${dayjs(lastLaunch.triggeredAt).format('MM-DD HH:mm')}` : '暂无'}
              </Text>
            </Flex>
          </Flex>

          {zoneLaunchEnabled && onboardingServers.length ? (
            <Flex vertical gap={6}>
              <span style={labelStyle}>导流服组</span>
              <Flex gap={8} wrap="wrap">
                {onboardingServers.map(z => (
                  <Tag
                    key={z.lang}
                    style={{ borderRadius: 999, border: 0, margin: 0, background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.55)' }}
                  >
                    {formatZoneValueLabel(partitionDimension, z.lang)}·ID {z.serverId}
                  </Tag>
                ))}
              </Flex>
            </Flex>
          ) : null}

          <Text type="secondary" style={{ fontSize: 12 }}>
            服 ID 延续暂停前序号；恢复时可选择开服条件从恢复时刻重新计数，避免暂停期间累计的人数导致连续开服
          </Text>
        </Flex>
      </div>
    )
  }

  // 回退选项：0 ~ 全局 curMaxServiceId
  const rollbackOptions = Array.from({ length: cardZone.curMaxServiceId + 1 }, (_, id) => ({
    value: id,
    label: id === 0 ? '回退到启用自动开服前的状态' : `回退到 ${id} 服开启状态`,
  })).reverse()

  // 弹窗集合：两种态共用，避免重复
  const modals = (
    <>
      {/* 手动开服弹窗 */}
      <Modal
        title={`手动开服 · ${manualZoneId === 'global' ? '全局默认' : zones.find(z => z.zoneId === manualZoneId)?.zoneName ?? manualZoneId}`}
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onOk={onManualOk}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={manualForm} layout="vertical" initialValues={{ serverId: cardZone.curMaxServiceId + 1 }}>
          {/* 分区开服开启时，可选择对哪个分区手动开服 */}
          {zoneLaunchEnabled && zones.filter(z => z.zoneId !== 'global').length ? (
            <Form.Item label="开服分区">
              <Select
                value={manualZoneId}
                onChange={setManualZoneId}
                options={[
                  { value: 'global', label: '默认服（全局默认）' },
                  ...zones
                    .filter(z => z.zoneId !== 'global')
                    .map(z => ({ value: z.zoneId, label: `${z.zoneName}（${partitionDimension}=${z.lang}）` })),
                ]}
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : null}
          {(() => {
            const targetZone = zones.find(z => z.zoneId === manualZoneId) ?? cardZone
            const apps = getEffectiveStrategy(zones, manualZoneId).applications
            const nextServerId = targetZone.curMaxServiceId + 1
            return (
              <>
                {apps.length ? (
                  <div style={{ marginBottom: 16 }}>
                    <Text>确定后，将开启以下新的服务：</Text>
                    <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                      {apps.map(app => (
                        <li key={app.appName}>
                          <Text>
                            {app.displayName} {nextServerId} 服
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {/* 游服 ID 为纯展示：自动取目标分区当前最大服 ID + 1，不可修改 */}
                <Form.Item label="游服 ID">
                  <Text strong style={{ fontSize: 16 }}>{nextServerId}</Text>
                </Form.Item>
              </>
            )
          })()}
        </Form>
      </Modal>

      {/* 终止开服并回退确认弹窗 */}
      <Modal
        title="终止开服并回退"
        open={terminateOpen}
        onCancel={() => setTerminateOpen(false)}
        onOk={onTerminateOk}
        okText="继续"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <Alert type="warning" showIcon message="执行该操作会终止当前开服操作并回退到本次开服前的状态，是否继续？" />
      </Modal>

      {/* 回退开服弹窗 */}
      <Modal
        title="回退开服"
        open={rollbackOpen}
        onCancel={() => setRollbackOpen(false)}
        onOk={onRollbackOk}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Alert type="warning" showIcon message="请务必做好游服数据清理与客户端导流同步" style={{ marginBottom: 16 }} />
        <Form form={rollbackForm} layout="vertical" initialValues={{ serverId: cardZone.curMaxServiceId }}>
          <Form.Item
            label="请选择需要回退到的开服状态"
            name="serverId"
            rules={[{ required: true, message: '请选择开服状态' }]}
          >
            <Select options={rollbackOptions} placeholder="选择开服状态" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 启用自动开服确认弹窗 */}
      <Modal
        title="启用自动开服"
        open={enableOpen}
        onCancel={() => setEnableOpen(false)}
        onOk={onEnableOk}
        okText="启用"
        cancelText="取消"
      >
        <Alert
          type="info"
          showIcon
          message="启用自动开服后，将自动触发一次开服操作。确定启用自动开服吗？"
        />
      </Modal>

      {/* 暂停自动开服确认弹窗 */}
      <Modal
        title="暂停自动开服"
        open={pauseOpen}
        onCancel={() => setPauseOpen(false)}
        onOk={onPauseOk}
        okText="暂停"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <Alert
          type="warning"
          showIcon
          message="暂停后将停止所有分区的开服监控与自动开服（含导流服），已开的服不受影响；开服策略与配置会保留，可随时恢复。确定暂停吗？"
        />
      </Modal>

      {/* 恢复自动开服确认弹窗：只读确认 服 ID / 最新开服策略 / 开服步骤，无选项 */}
      <Modal
        title="恢复自动开服"
        open={resumeOpen}
        onCancel={() => setResumeOpen(false)}
        onOk={onResumeOk}
        okText="确认恢复"
        cancelText="取消"
        destroyOnHidden
        width={560}
      >
        {(() => {
          const nextId = cardZone.curMaxServiceId + 1
          const isCron = cardZone.strategyType === 'cron'
          // 恢复瞬间无法预知是否满足条件：只展示条件本身，不展示累计进度
          const rows = (cardZone.progressList ?? []).filter(p => p.target > 0)
          const sectionTitle: React.CSSProperties = { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }
          const box: React.CSSProperties = { padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.03)' }
          return (
            <Flex vertical gap={16} style={{ marginTop: 8 }}>
              {/* 服 ID */}
              <div>
                <div style={sectionTitle}>服 ID · 延续暂停前序号，不可修改</div>
                <div style={box}>
                  <Text>
                    当前导流服 <Text strong>{cardZone.curMaxServiceId}</Text> 服，下一个开服为{' '}
                    <Text strong style={{ color: '#1677ff' }}>{nextId}</Text> 服
                  </Text>
                </div>
              </div>

              {/* 开服策略（最新） */}
              <div>
                <Flex align="center" gap={8} style={sectionTitle}>
                  <span>开服策略 · 以最新策略为准</span>
                  {strategyChangedWhilePaused ? (
                    <Tag color="orange" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>
                      待开服恢复后生效
                    </Tag>
                  ) : null}
                </Flex>
                <div style={box}>
                  {isCron ? (
                    <Flex vertical gap={4}>
                      <Text>{cardZone.effectPeriodText ?? '定时开服'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        暂停期间错过的时间点不补开，恢复后按下一个时间点执行
                      </Text>
                    </Flex>
                  ) : (
                    <Flex vertical gap={8}>
                      <Text>
                        在 {cardZone.effectPeriodText ?? '全时段'} 内，满足以下{rows.length > 1 ? '任一' : ''}条件后自动开服
                      </Text>
                      {rows.map((p, i) => (
                        <Flex key={p.label} align="center" gap={8}>
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', width: 44 }}>条件{i + 1}</span>
                          <Text>{p.label}</Text>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </div>
              </div>

              {/* 开服步骤 */}
              <div>
                <Flex align="center" gap={8} style={sectionTitle}>
                  <span>开服步骤 · 以最新配置为准</span>
                  {pendingStepNames ? (
                    <Tag color="orange" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>
                      待开服恢复后生效
                    </Tag>
                  ) : null}
                </Flex>
                <div style={box}>
                  <Flex vertical gap={6}>
                    {latestSteps.map((st, i) => (
                      <Flex key={st.name} align="center" gap={10}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#fff',
                            border: '1px solid rgba(0,0,0,0.12)',
                            fontSize: 11,
                            display: 'grid',
                            placeItems: 'center',
                            color: 'rgba(0,0,0,0.55)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <Text>{st.title}</Text>
                      </Flex>
                    ))}
                  </Flex>
                </div>
              </div>

              <Alert
                type="warning"
                showIcon
                message={`恢复后若满足开服条件，会在恢复瞬间开启 ${nextId} 服，请提前做好导流策略等准备`}
              />
            </Flex>
          )
        })()}
      </Modal>

      {/* 更新开服配置（暂停态）：勾选开服步骤，恢复后生效 */}
      <Modal
        title="更新开服配置"
        open={stepConfigOpen}
        onCancel={() => setStepConfigOpen(false)}
        onOk={onStepConfigSave}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        width={520}
      >
        <Alert
          type="warning"
          showIcon
          message="自动开服已暂停，修改后的开服配置需恢复自动开服后才会生效"
          style={{ marginBottom: 16 }}
        />
        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
          开服步骤 · 开服时按顺序执行
        </Text>
        <Flex vertical gap={8}>
          {STEP_CONFIG_OPTIONS.map(o => {
            const checked = o.fixed || stepConfigDraft.includes(o.name)
            return (
              <Flex
                key={o.name}
                align="center"
                justify="space-between"
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <Checkbox
                  checked={checked}
                  disabled={o.fixed}
                  onChange={e =>
                    setStepConfigDraft(prev =>
                      e.target.checked ? [...prev, o.name] : prev.filter(n => n !== o.name),
                    )
                  }
                >
                  {STEP_TITLES[o.name]}
                </Checkbox>
                {o.fixed ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>必选</Text>
                ) : null}
              </Flex>
            )
          })}
        </Flex>
      </Modal>

      {/* 更新开服策略：多分区统一管理弹窗 */}
      <ZoneStrategyModal
        open={strategyOpen}
        zones={zones}
        defaultZoneId="global"
        partitionDimension={partitionDimension}
        onClose={() => setStrategyOpen(false)}
        onSave={onStrategySave}
        onResetZone={onResetZone}
        onDeleteZone={onDeleteZone}
        paused={isPaused}
        showZoneAndAi={showZoneAndAi}
      />

      {/* 保存策略二次确认：备注 */}
      <Modal
        title="开服策略已更新，确定保存吗?"
        open={strategyConfirmOpen}
        onCancel={() => setStrategyConfirmOpen(false)}
        onOk={onStrategyConfirmOk}
        okText="确定保存"
        cancelText="取消"
        destroyOnHidden
      >
        {isPaused ? (
          <Alert
            type="warning"
            showIcon
            message="自动开服已暂停，本次修改需恢复自动开服后才会生效"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form layout="vertical">
          <Form.Item label="备注（可选）">
            <Input.TextArea
              placeholder="填写本次开服策略更新原因，便于历史追溯"
              rows={3}
              value={remark}
              onChange={e => setRemark(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 开服记录全屏弹窗 */}
      <LaunchHistoryModal
        open={historyOpen}
        zones={zones}
        showZoneAndAi={showZoneAndAi}
        onClose={() => setHistoryOpen(false)}
      />

      {/* 配置自动开服向导：配置开服策略 + 开服配置 + 确认 */}
      <ConfigAutoLaunchModal
        open={configOpen}
        showZoneAndAi={showZoneAndAi}
        zone={cardZone}
        zones={zones}
        partitionDimension={partitionDimension}
        gameApps={cardZone.applications.map(a => ({ name: a.appName, displayName: a.displayName }))}
        onClose={() => setConfigOpen(false)}
        onConfirm={onConfigConfirm}
      />
    </>
  )

  // 未开启自动开服：Collapse 包裹的配置步骤卡片（对照源前端 ConfigStepsCard）
  if (isSuspended) {
    return (
      <>
        <Collapse
          ghost
          size="small"
          activeKey={configCollapsed ? ['1'] : []}
          onChange={keys => setConfigCollapsed(keys.length > 0)}
          items={[
            {
              key: '1',
              label: configCollapsed ? '收起自动开服' : '展开自动开服',
              styles: {
                header: { padding: 0, fontSize: 14, fontWeight: 600, lineHeight: '22px' },
                body: { padding: '16px 0 0' },
              },
              children: (
                <Card
                  variant="borderless"
                  style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                  styles={{ body: { paddingInline: 0, paddingBlock: 16 } }}
                  title={
                    <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                      {title}
                      {extra}
                    </Flex>
                  }
                >
                  {renderSuspended()}
                </Card>
              ),
            },
          ]}
        />
        {modals}
      </>
    )
  }

  if (isPaused) {
    return (
      <Card
        variant="borderless"
        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        styles={{ body: { paddingInline: 0, paddingBlock: 16 } }}
        title={
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            {title}
            {extra}
          </Flex>
        }
      >
        {renderPaused()}
        {modals}
      </Card>
    )
  }

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      styles={{ body: { paddingInline: 0, paddingBlock: 16 } }}
      title={
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          {title}
          {extra}
        </Flex>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', paddingInline: 24 }}>
        <div style={{ flex: '1 1 0', minWidth: 0, paddingInline: 4 }}>{renderLeft()}</div>
        <div aria-hidden style={{ width: 1, alignSelf: 'stretch', background: 'rgba(0,0,0,0.08)' }} />
        <Flex vertical gap={8} style={{ flex: '1 1 0', minWidth: 0, paddingInline: 24 }}>
          {/* 导流服ID */}
          <Flex align="center">
            <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>导流服ID</div>
            <Flex align="center" gap={8}>
              <Text strong style={{ color: '#389E0D', fontSize: 22, fontFamily: 'DIN Alternate' }}>
                {cardZone.curMaxServiceId}
              </Text>
              {cardZone.rollbackProdOpen ? (
                <Button type="link" danger size="small" icon={<RollbackOutlined />} onClick={() => setRollbackOpen(true)}>
                  回退开服
                </Button>
              ) : null}
            </Flex>
          </Flex>

          {/* 导流服组：分区开服开启时按 lang 展示并可点击切换；关闭时展示单一全局导流服。
              AI 开服关闭时导流服仍会触发自动开服，只是改为按策略触发（非 AI 推断） */}
          {zoneLaunchEnabled && onboardingServers.length ? (
            <Flex vertical gap={4}>
              <Flex>
                <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>导流服组</div>
                <Flex align="center" gap={8} wrap="wrap">
                  <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.65)', margin: 0 }}>
                    维度：{formatDimensionLabel(partitionDimension)}
                  </Tag>
                  {onboardingServers.map(z => {
                    const active = selectedLang === z.lang
                    return (
                      <Tooltip key={z.lang} title={active ? '再次点击回到默认策略' : '点击查看该区开服策略'}>
                        <Tag
                          onClick={() => setSelectedLang(prev => (prev === z.lang ? null : z.lang))}
                          style={{
                            borderRadius: 999,
                            border: 0,
                            margin: 0,
                            cursor: 'pointer',
                            userSelect: 'none',
                            background: active ? '#722ED1' : 'rgba(114,46,209,0.08)',
                            color: active ? '#fff' : '#722ED1',
                            transition: 'all 0.15s',
                          }}
                        >
                          {formatZoneValueLabel(partitionDimension, z.lang)}·ID {z.serverId}
                        </Tag>
                      </Tooltip>
                    )
                  })}
                </Flex>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: LABEL_WIDTH }}>
                {selectedLang
                  ? `当前展示：${selectedZone?.zoneName ?? `${formatZoneValueLabel(partitionDimension, selectedLang)}区`}策略${selectedZone?.override ? '' : '（继承默认服）'}`
                  : '当前展示：默认服策略；点击上方导流服可切换查看该区策略。导流服按策略触发开服，AI 推断触发是否生效由运营脚本配置'}
              </Text>
            </Flex>
          ) : !showZoneAndAi ? null : (
            <Flex vertical gap={4}>
              <Flex>
                <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>导流服组</div>
                <Flex align="center" gap={8}>
                  <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(114,46,209,0.08)', color: '#722ED1', margin: 0 }}>
                    默认服·ID {cardZone.curMaxServiceId}
                  </Tag>
                </Flex>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: LABEL_WIDTH }}>
                分区开服已关闭，导流服并入默认服统一管理；导流服按策略触发开服，AI 推断触发是否生效由运营脚本配置
              </Text>
            </Flex>
          )}

          {/* 开服步骤 */}
          <Flex>
            <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>开服步骤</div>
            <div style={{ flex: 1 }}>
              <AutoLaunchSteps steps={cardZone.steps} onTriggerCallback={onTriggerCallback} />
            </div>
          </Flex>
        </Flex>
      </div>
      {modals}
    </Card>
  )
}
