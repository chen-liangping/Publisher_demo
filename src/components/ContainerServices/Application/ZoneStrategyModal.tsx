'use client'

import React, { useEffect, useState } from 'react'
import { Modal, Form, Flex, Typography, Tag, Switch, Alert, Popconfirm, Button } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { AutoLaunchStrategyForm, type StrategyFormValues } from './AutoLaunchStrategyForm'
import { type ZoneLaunch, type ZoneId } from './autoLaunchMock'

const { Text } = Typography

// 由分区当前状态构建表单初始值（非覆盖分区回退到 global 策略字段）
const buildFormValues = (zone: ZoneLaunch, globalZone: ZoneLaunch): StrategyFormValues => {
  const eff = zone.override || zone.zoneId === 'global' ? zone : globalZone
  const isCron = eff.strategyType === 'cron'
  const progress = eff.progressList ?? []
  return {
    strategyType: isCron ? 'cron' : 'strategy',
    autoLaunchCron: { mode: 'daily', hour: 20, minute: 0, intervalUnit: 'hour' },
    strategies: [
      {
        createRole: progress[0]?.target,
        paidUsers: progress[1]?.target,
        afterValue: progress[2]?.target,
        afterUnit: 'hour',
      },
    ],
    effectPeriodType: 'all',
    effectPeriod: { effectStartTime: { hour: 0, minute: 0 }, effectEndTime: { hour: 24, minute: 0 } },
  }
}

// 分区策略摘要文案
const strategySummary = (zone: ZoneLaunch, globalZone: ZoneLaunch): string => {
  if (!zone.override && zone.zoneId !== 'global') return '继承全局默认策略'
  const eff = zone.override || zone.zoneId === 'global' ? zone : globalZone
  if (eff.strategyType === 'cron') return eff.effectPeriodText ?? '定时开服'
  const parts: string[] = []
  eff.progressList?.forEach(p => parts.push(`${p.label.replace(/\s+/g, '')}`))
  return parts.length ? `${parts.join('，')} 任一` : '条件开服'
}

// 多分区策略弹窗：顶部全局 AI 开服开关 + 左侧分区列表 + 右侧该分区策略表单
export default function ZoneStrategyModal({
  open,
  zones,
  defaultZoneId,
  aiEnabled,
  onClose,
  onSave,
  onAiEnabledChange,
  onResetZone,
}: {
  open: boolean
  zones: ZoneLaunch[]
  defaultZoneId: ZoneId
  // AI 开服全局开关（单一按钮，对所有区域生效）
  aiEnabled: boolean
  onClose: () => void
  onSave: (zoneId: ZoneId, values: StrategyFormValues) => void
  onAiEnabledChange: (enabled: boolean) => void
  // 独立分区恢复继承全局默认策略
  onResetZone: (zoneId: ZoneId) => void
}) {
  const [selected, setSelected] = useState<ZoneId>(defaultZoneId)
  const [form] = Form.useForm<StrategyFormValues>()
  const globalZone = zones.find(z => z.zoneId === 'global')!
  const selectedZone = zones.find(z => z.zoneId === selected)

  // 打开时重置到默认分区
  useEffect(() => {
    if (open) setSelected(defaultZoneId)
  }, [open, defaultZoneId])

  // 切换分区时用该分区策略初始化表单
  useEffect(() => {
    if (!open) return
    const zone = zones.find(z => z.zoneId === selected)
    if (zone) form.setFieldsValue(buildFormValues(zone, globalZone))
  }, [selected, zones, open, form, globalZone])

  const onSaveClick = async () => {
    const values = await form.validateFields()
    onSave(selected, values)
  }

  return (
    <Modal
      title="更新开服策略"
      open={open}
      onCancel={onClose}
      onOk={onSaveClick}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      width={980}
      styles={{ body: { maxHeight: '72vh', overflow: 'auto' } }}
    >
      <Flex vertical gap={16}>
        {/* AI 开服全局开关：单一按钮，开启后 AI 可基于导流服自行判定触发各区域开服 */}
        <Alert
          type="info"
          showIcon
          icon={null}
          message={
            <Flex align="center" gap={12}>
              <Text strong>AI 开服</Text>
              <Switch checked={aiEnabled} onChange={onAiEnabledChange} checkedChildren="开启" unCheckedChildren="关闭" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                开启后，AI 可基于各区域导流服数据自行判定并触发开服；关闭则仅按下方策略触发
              </Text>
            </Flex>
          }
          style={{ padding: '10px 16px' }}
        />

        <Flex gap={16}>
        {/* 左：分区列表，展示所有区域策略摘要 */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            分区
          </Text>
          <div style={{ marginTop: 8 }}>
            {zones.map(z => {
              const active = z.zoneId === selected
              const inherit = !z.override && z.zoneId !== 'global'
              return (
                <div
                  key={z.zoneId}
                  onClick={() => setSelected(z.zoneId)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 4,
                    background: active ? 'rgba(22,119,255,0.08)' : 'transparent',
                    border: active ? '1px solid rgba(22,119,255,0.3)' : '1px solid transparent',
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Text strong={active}>{z.zoneId === 'global' ? '全局默认' : z.zoneName}</Text>
                    {z.zoneId === 'global' ? (
                      <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', margin: 0 }}>默认</Tag>
                    ) : inherit ? (
                      <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)', margin: 0 }}>继承</Tag>
                    ) : (
                      <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(82,196,26,0.12)', color: '#52c41a', margin: 0 }}>独立</Tag>
                    )}
                  </Flex>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>
                    {strategySummary(z, globalZone)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右：选中分区的策略表单 */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 16, borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
          {/* 右栏顶栏：分区标题 + 独立态可恢复继承 */}
          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Text strong>
              {selected === 'global' ? '全局默认策略' : `${selectedZone?.zoneName ?? selected}策略`}
            </Text>
            {selected !== 'global' && selectedZone?.override ? (
              <Popconfirm
                title="恢复继承全局默认策略？"
                description="该区域当前的独立策略将被清除，回退为跟随全局默认策略。"
                onConfirm={() => onResetZone(selected)}
                okText="恢复继承"
                cancelText="取消"
              >
                <Button size="small" icon={<ArrowRightOutlined />}>
                  恢复继承
                </Button>
              </Popconfirm>
            ) : null}
          </Flex>
          {selected !== 'global' && selectedZone && !selectedZone.override ? (
            <Alert
              type="info"
              showIcon
              message="该区域当前继承全局默认策略"
              description="修改并保存后将为其创建独立策略覆盖全局默认。"
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Form form={form} layout="vertical">
            <AutoLaunchStrategyForm />
          </Form>
        </div>
        </Flex>
      </Flex>
    </Modal>
  )
}
