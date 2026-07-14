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
  InputNumber,
  Alert,
  Select,
  Input,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RollbackOutlined,
  SyncOutlined,
  ArrowRightOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import AutoLaunchSteps from './AutoLaunchSteps'
import ZoneStrategyModal from './ZoneStrategyModal'
import LaunchHistoryModal from './LaunchHistoryModal'
import { type StrategyFormValues, type StrategyRow } from './AutoLaunchStrategyForm'
import {
  type ZoneLaunch,
  type ZoneId,
  type StrategyType,
  type ActionStep,
  type AppResource,
  type ZoneServiceId,
  initialZones,
  formatZoneLangLabel,
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
  const [zones, setZones] = useState<ZoneLaunch[]>(initialZones)
  // AI 开服全局开关（单一按钮，对所有区域生效）
  const [aiEnabled, setAiEnabled] = useState(true)
  // 主卡片固定展示全局默认策略
  const cardZone = zones.find(z => z.zoneId === 'global')!

  const isProcessing = cardZone.autoLaunchStatus === 'processing'
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 弹窗开关
  const [manualOpen, setManualOpen] = useState(false)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [strategyConfirmOpen, setStrategyConfirmOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [remark, setRemark] = useState('')
  // 待确认的策略：分区 + 表单值
  const pendingStrategyRef = useRef<{ zoneId: ZoneId; values: StrategyFormValues } | null>(null)
  const [manualForm] = Form.useForm()
  const [rollbackForm] = Form.useForm()

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  React.useEffect(() => () => clearTimer(), [])

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

  // CRON 进度（全局策略为 cron 时展示）
  const cronProgress = useMemo(() => {
    if (cardZone.strategyType !== 'cron' || !cardZone.cron) return null
    const last = dayjs(cardZone.cron.lastTriggerAt)
    const next = dayjs(cardZone.cron.cronTimeAt)
    const now = dayjs()
    const hoursSinceLast = Math.max(0, now.diff(last, 'hour', true))
    const intervalHours = Math.max(0.01, next.diff(last, 'hour', true))
    const percent = Math.min(100, (hoursSinceLast / intervalHours) * 100)
    const nextTimeText = `${next.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')} (JST)`
    return { hoursSinceLast, intervalHours, percent, nextTimeText }
  }, [cardZone.strategyType, cardZone.cron])

  // 模拟开服流程：逐步推进步骤，完成后写入全局分区历史
  const simulateLaunchCycle = (newServerId: number) => {
    const initialSteps: ActionStep[] = cardZone.steps.map(s => ({ ...s, status: 'need_execute', errMsg: undefined }))
    patchZone('global', {
      autoLaunchStatus: 'processing',
      curMaxServiceId: newServerId,
      steps: initialSteps,
    })

    let idx = 0
    clearTimer()
    timerRef.current = setInterval(() => {
      setZones(prev =>
        prev.map(z => {
          if (z.zoneId !== 'global') return z
          if (idx >= z.steps.length) {
            clearTimer()
            const historyItem = {
              serverId: newServerId,
              triggeredAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              lang: 'ja',
              reason: '手动开服',
              source: 'strategy' as const,
              zone: 'global' as const,
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

  const onManualOk = async () => {
    const values = await manualForm.validateFields()
    const newServerId = Number(values.serverId) || cardZone.curMaxServiceId + 1
    setManualOpen(false)
    simulateLaunchCycle(newServerId)
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
      const progressList = [
        { label: `创角人数 ${first.createRole ?? 0}人`, current: 0, target: Number(first.createRole ?? 0), unit: '人' },
        { label: `付费人数 ${first.paidUsers ?? 0}人`, current: 0, target: Number(first.paidUsers ?? 0), unit: '人' },
        {
          label: `前次开服经过 ${first.afterValue ?? 0}${first.afterUnit === 'day' ? '天' : '小时'}`,
          current: 0,
          target: Number(first.afterValue ?? 0),
          unit: first.afterUnit === 'day' ? '天' : '小时',
        },
      ]
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
    patchZone('global', {
      curMaxServiceId: target,
      rollbackProdOpen: target > 0,
      launchHistory: [
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
      <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.65)', margin: 0 }}>
        全局默认策略
      </Tag>
      {isProcessing ? (
        <Tooltip title="开服进行中">
          <SyncOutlined spin style={{ fontSize: 14, color: '#1677ff' }} />
        </Tooltip>
      ) : null}
    </Flex>
  )

  // 操作区
  const extra = (
    <Flex gap={12} wrap="wrap">
      <Button icon={<ArrowRightOutlined />} onClick={() => setStrategyOpen(true)}>
        更新开服策略
      </Button>
      <Button icon={<ArrowRightOutlined />} onClick={() => message.info('跳转开服配置页（原型占位）')}>
        更新开服配置
      </Button>
      <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
        开服记录
      </Button>
      {isProcessing ? (
        <Button danger type="primary" icon={<PauseCircleOutlined />} onClick={() => setTerminateOpen(true)}>
          终止开服并回退
        </Button>
      ) : (
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setManualOpen(true)}>
          手动开服
        </Button>
      )}
    </Flex>
  )

  // 左栏：全局策略开服视图
  const renderLeft = () => (
    <Flex vertical gap={8} style={{ flex: 1 }}>
      {/* 当前开服策略 */}
      <Flex>
        <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>当前开服策略</div>
        <div style={{ flex: 1 }}>
          {cardZone.strategyType === 'cron' ? (
            <Text>{cardZone.effectPeriodText ?? '定时开服'}</Text>
          ) : (
            <div>
              <Text>
                在 {cardZone.effectPeriodText ?? '全时段'} 时间段内，满足以下
                {cardZone.progressList && cardZone.progressList.length > 1 ? '任一' : ''}条件后自动开服
              </Text>
            </div>
          )}
        </div>
      </Flex>

      {/* CRON 进度 */}
      {cardZone.strategyType === 'cron' && cronProgress ? (
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
      {cardZone.strategyType === 'strategy' && cardZone.progressList?.length ? (
        <Flex vertical style={{ marginLeft: LABEL_WIDTH }}>
          {cardZone.progressList.map(p => {
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
      {cardZone.strategyType === 'strategy' ? (
        <Flex>
          <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>下次开服策略</div>
          <div style={{ flex: 1 }}>
            {cardZone.nextStrategyText ? (
              <Text type="secondary">{cardZone.nextStrategyText}</Text>
            ) : (
              <Text type="secondary">N/A</Text>
            )}
          </div>
        </Flex>
      ) : null}

      {/* 下次部署资源 */}
      {cardZone.applications.length ? (
        <Flex>
          <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>下次部署资源</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cardZone.applications.map(app => (
              <ResourceItem key={app.appName} app={app} />
            ))}
          </div>
        </Flex>
      ) : null}
    </Flex>
  )

  // 右栏导流服组：AI 开服开启时聚合所有语种区导流服；关闭则不展示
  const onboardingServers: ZoneServiceId[] = aiEnabled
    ? zones.filter(z => z.zoneId !== 'global').flatMap(z => z.ai.onboardingServers)
    : []

  // 回退选项：0 ~ 全局 curMaxServiceId
  const rollbackOptions = Array.from({ length: cardZone.curMaxServiceId + 1 }, (_, id) => ({
    value: id,
    label: id === 0 ? '回退到启用自动开服前的状态' : `回退到 ${id} 服开启状态`,
  })).reverse()

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

          {/* 导流服组（AI 开服开启时聚合所有语种区） */}
          {aiEnabled && onboardingServers.length ? (
            <Flex>
              <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>导流服组</div>
              <Flex align="center" gap={8} wrap="wrap">
                {onboardingServers.map(z => (
                  <Tag key={z.lang} style={{ borderRadius: 999, border: 0, background: 'rgba(114,46,209,0.08)', color: '#722ED1', margin: 0 }}>
                    {formatZoneLangLabel(z.lang)}·ID {z.serverId}
                  </Tag>
                ))}
              </Flex>
            </Flex>
          ) : null}
          {!aiEnabled ? (
            <Flex>
              <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>导流服组</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                AI 开服未启用，导流服不触发自动开服
              </Text>
            </Flex>
          ) : null}

          {/* 开服步骤 */}
          <Flex>
            <div style={{ width: LABEL_WIDTH, fontWeight: 700, whiteSpace: 'nowrap' }}>开服步骤</div>
            <div style={{ flex: 1 }}>
              <AutoLaunchSteps steps={cardZone.steps} onTriggerCallback={onTriggerCallback} />
            </div>
          </Flex>
        </Flex>
      </div>

      {/* 手动开服弹窗 */}
      <Modal
        title="手动开服 · 全局默认"
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onOk={onManualOk}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={manualForm} layout="vertical" initialValues={{ serverId: cardZone.curMaxServiceId + 1 }}>
          {cardZone.applications.length ? (
            <div style={{ marginBottom: 16 }}>
              <Text>确定后，将开启以下新的服务：</Text>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {cardZone.applications.map(app => (
                  <li key={app.appName}>
                    <Text>
                      {app.displayName} {cardZone.curMaxServiceId + 1} 服
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Form.Item label="游服 ID" name="serverId" rules={[{ required: true, message: '请输入游服 ID' }]}>
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
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

      {/* 更新开服策略：多分区统一管理弹窗 */}
      <ZoneStrategyModal
        open={strategyOpen}
        zones={zones}
        defaultZoneId="global"
        aiEnabled={aiEnabled}
        onClose={() => setStrategyOpen(false)}
        onSave={onStrategySave}
        onAiEnabledChange={setAiEnabled}
        onResetZone={onResetZone}
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
      <LaunchHistoryModal open={historyOpen} zones={zones} onClose={() => setHistoryOpen(false)} />
    </Card>
  )
}
