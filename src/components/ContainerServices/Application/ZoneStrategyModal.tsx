'use client'

import React, { useEffect, useState } from 'react'
import { Modal, Form, Flex, Typography, Tag, Alert, Popconfirm, Button } from 'antd'
import { ArrowRightOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { AutoLaunchStrategyForm, type StrategyFormValues } from './AutoLaunchStrategyForm'
import { type ZoneLaunch, type ZoneId, type PartitionDimension, formatDimensionLabel } from './autoLaunchMock'

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

// 多分区策略弹窗：顶部 AI 开服（纯提示）/ 分区维度（锁定） + 左侧分区列表 + 右侧该分区策略表单
export default function ZoneStrategyModal({
  open,
  zones,
  defaultZoneId,
  onClose,
  onSave,
  partitionDimension,
  onResetZone,
  onDeleteZone,
}: {
  open: boolean
  zones: ZoneLaunch[]
  defaultZoneId: ZoneId
  onClose: () => void
  onSave: (zoneId: ZoneId, values: StrategyFormValues) => void
  // 分区维度：启用后锁定，运行态不可改，仅展示
  partitionDimension: PartitionDimension
  // 独立分区恢复继承全局默认策略
  onResetZone: (zoneId: ZoneId) => void
  // 删除某个分区（global 不可删除）
  onDeleteZone: (zoneId: ZoneId) => void
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
        {/* AI 开服：纯提示，策略由运营人员配置脚本维护；实际启停由运营脚本，不影响导流服触发，本页不提供开关 */}
        <Alert
          type="info"
          showIcon
          message={<Text strong>AI 开服</Text>}
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              AI 开服策略由运营人员配置脚本维护；实际启停由运营脚本控制，本页不提供开关。导流服始终按下方策略触发自动开服。
            </Text>
          }
          style={{ padding: '10px 16px' }}
        />

        {/* 分区维度：启用后锁定，运行态不可改，仅展示；如需更换维度须关闭自动开服重新配置 */}
        <Flex align="center" gap={8} style={{ paddingInline: 4 }}>
          <Text strong>分区维度</Text>
          <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.65)', margin: 0 }}>
            {formatDimensionLabel(partitionDimension)}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已锁定（启用自动开服时确定）；如需更换维度，请关闭自动开服后重新配置
          </Text>
        </Flex>

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
                    <Flex align="center" gap={6}>
                      {z.zoneId === 'global' ? (
                        <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', margin: 0 }}>默认</Tag>
                      ) : inherit ? (
                        <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)', margin: 0 }}>继承</Tag>
                      ) : (
                        <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(82,196,26,0.12)', color: '#52c41a', margin: 0 }}>独立</Tag>
                      )}
                      {z.zoneId !== 'global' ? (
                        <Popconfirm
                          title="删除该分区？"
                          description="删除后该分区导流服将不再触发自动开服。"
                          onConfirm={(e) => { e?.stopPropagation(); onDeleteZone(z.zoneId) }}
                          onCancel={(e) => e?.stopPropagation()}
                          okText="删除"
                          cancelText="取消"
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={e => e.stopPropagation()}
                          />
                        </Popconfirm>
                      ) : null}
                    </Flex>
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
                okText="继承默认服策略"
                cancelText="取消"
              >
                <Button size="small" icon={<ArrowRightOutlined />}>
                  继承默认服策略
                </Button>
              </Popconfirm>
            ) : null}
          </Flex>
          {selected !== 'global' && selectedZone && !selectedZone.override ? (
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
              <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                该区域当前继承全局默认策略，修改并保存后将为其创建独立策略覆盖全局默认。
              </Text>
            </Flex>
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
