'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Alert, Select, InputNumber, Radio, Typography, Divider, Space, Table, Button } from 'antd'
import { ArrowRightOutlined, LockOutlined } from '@ant-design/icons'
import {
  type InstanceSpecConfig,
  type ResizeDirection,
  type ResizeEffectiveTime,
  type NumberField,
  type NumberFieldKey,
  STORAGE_STEP_GB,
  type SpecCompareRow,
  cloneSpecConfig,
  compareSpecConfig,
  checkDowngradeUsage,
  formatNodesPerShard,
  diffSpecConfig,
  filterSpecOptions,
  hasDowngradeRoom
} from './storageResizeMeta'

const { Text } = Typography

export interface StorageResizeSubmit {
  target: InstanceSpecConfig
  /** 仅内部账号直接变配时有值 */
  effectiveTime?: ResizeEffectiveTime
}

interface StorageResizeModalProps {
  open: boolean
  direction: ResizeDirection
  instanceTitle: string
  current: InstanceSpecConfig | null
  /** 内部账号：无需申请，表单内直接选生效时间并执行 */
  direct?: boolean
  onCancel: () => void
  onSubmit: (payload: StorageResizeSubmit) => void
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }
const labelStyle: React.CSSProperties = { width: 88, color: 'rgba(0,0,0,0.65)', flexShrink: 0 }

/**
 * 升配 / 降配弹窗（两个入口共用，direction 决定可调范围）
 * - 升配：规格只能选 ≥ 当前；存储可加大（最小值=当前值）
 * - 降配：规格只能选 ≤ 当前；存储只读展示当前值；提交前按当前内存 / 磁盘用量校验并拦截
 * - 此处只「提交申请」，不选生效时间：审批通过后由用户在页面确认生效时间（见 ResizeConfirmModal）
 */
export default function StorageResizeModal({ open, direction, instanceTitle, current, direct = false, onCancel, onSubmit }: StorageResizeModalProps) {
  const [target, setTarget] = useState<InstanceSpecConfig | null>(null)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [effectiveTime, setEffectiveTime] = useState<ResizeEffectiveTime>('Immediately')
  const isUp = direction === 'upgrade'

  useEffect(() => {
    if (open && current) {
      setTarget(cloneSpecConfig(current))
      setUsageError(null)
      setEffectiveTime('Immediately')
    }
  }, [open, current])

  // 修改配置后清除上一次的拦截提示
  useEffect(() => {
    setUsageError(null)
  }, [target])

  const handleSubmit = (): void => {
    if (!target) return
    // 降配：提交前按当前内存 / 磁盘用量校验，超出目标规格则拦截，不发起审批
    if (!isUp) {
      const err = checkDowngradeUsage(target)
      if (err) {
        setUsageError(err)
        return
      }
    }
    onSubmit(direct ? { target, effectiveTime } : { target })
  }

  const changes = useMemo(() => (current && target ? diffSpecConfig(current, target) : []), [current, target])
  const noDowngradeRoom = !isUp && !!current && !hasDowngradeRoom(current)

  const updateComponent = (idx: number, patch: { spec?: string; storageGB?: number }) => {
    setTarget((prev) => {
      if (!prev) return prev
      const next = cloneSpecConfig(prev)
      next.components[idx] = { ...next.components[idx], ...patch }
      return next
    })
  }

  const updateNumber = (field: NumberFieldKey, value: number) => {
    setTarget((prev) => {
      if (!prev || !prev[field]) return prev
      const next = cloneSpecConfig(prev)
      const f = next[field] as NumberField
      next[field] = { ...f, value }
      return next
    })
  }

  // 数值项的可调范围：升配 [当前, 上限]，降配 [下限, 当前]
  const rangeOf = (cur: NumberField): { min: number; max: number } =>
    isUp ? { min: cur.value, max: cur.max } : { min: cur.min, max: cur.value }

  const renderNumberRow = (field: NumberFieldKey, label: string, hint?: string) => {
    const cur = current?.[field]
    const val = target?.[field]
    if (!cur || !val) return null
    const { min, max } = rangeOf(cur)
    return (
      <div style={rowStyle}>
        <span style={labelStyle}>{label}</span>
        <InputNumber
          min={min}
          max={max}
          step={cur.step}
          value={val.value}
          disabled={min === max}
          onChange={(v) => updateNumber(field, typeof v === 'number' ? v : cur.value)}
          addonAfter={cur.unit}
          style={{ width: 200 }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          可调范围 {min}–{max}{cur.unit}{hint ? `；${hint}` : ''}
        </Text>
      </div>
    )
  }

  return (
    <Modal
      title={`${isUp ? '升配' : '降配'} · ${instanceTitle}`}
      open={open}
      onCancel={onCancel}
      okText={direct ? `确认${isUp ? '升配' : '降配'}` : '提交申请'}
      cancelText="取消"
      okButtonProps={{ disabled: changes.length === 0 }}
      onOk={handleSubmit}
      width={640}
      destroyOnHidden
    >
      {noDowngradeRoom && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message="当前已是最低配置，没有可以降低的项。" />
      )}

      {current && target && target.components.map((comp, idx) => {
        const cur = current.components[idx]
        const options = filterSpecOptions(cur.specOptions, cur.spec, direction).map((o) => ({
          value: o,
          label: o === cur.spec ? `${o}（当前）` : o
        }))
        return (
          <div key={comp.key} style={{ marginBottom: 8 }}>
            {target.components.length > 1 && (
              <div style={{ fontWeight: 600, margin: '4px 0 10px' }}>
                {comp.label} <Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>节点数 {comp.nodesText}</Text>
              </div>
            )}
            <div style={rowStyle}>
              <span style={labelStyle}>规格</span>
              <Select
                value={comp.spec}
                options={options}
                onChange={(v: string) => updateComponent(idx, { spec: v })}
                style={{ width: 200 }}
              />
              {target.components.length === 1 && <Text type="secondary" style={{ fontSize: 12 }}>{comp.label} · 节点数 {current.nodesPerShard ? formatNodesPerShard(current.nodesPerShard.value) : comp.nodesText}</Text>}
            </div>

            {cur.storageGB != null && (
              <div style={rowStyle}>
                <span style={labelStyle}>存储</span>
                {isUp ? (
                  <>
                    <InputNumber
                      min={cur.storageGB}
                      max={cur.storageMaxGB}
                      step={STORAGE_STEP_GB}
                      value={comp.storageGB}
                      onChange={(v) => updateComponent(idx, { storageGB: typeof v === 'number' ? v : cur.storageGB })}
                      addonAfter="GB"
                      style={{ width: 200 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      可调范围 {cur.storageGB}–{cur.storageMaxGB}GB，步长 {STORAGE_STEP_GB}GB
                    </Text>
                  </>
                ) : (
                  // 降配：存储只读展示当前值
                  <>
                    <Space size={6} style={{ width: 200, padding: '4px 11px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, color: 'rgba(0,0,0,0.65)' }}>
                      <LockOutlined />
                      <span>{cur.storageGB}GB</span>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>当前值，不支持缩减</Text>
                  </>
                )}
              </div>
            )}

            {cur.storageNote && (
              <div style={rowStyle}>
                <span style={labelStyle}>存储</span>
                <Text type="secondary">{cur.storageNote}</Text>
              </div>
            )}
            {idx < target.components.length - 1 && <Divider style={{ margin: '12px 0' }} />}
          </div>
        )
      })}

      {renderNumberRow('shardCount', '分片数量', '加分片：总容量变大，需搬迁数据')}
      {renderNumberRow('nodesPerShard', '每分片节点数', '加节点：读能力与可用性提升，容量不变')}
      {renderNumberRow('bandwidth', current?.kind === 'zookeeper' ? '公网带宽' : '带宽')}

      <Divider style={{ margin: '12px 0' }} />
      <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 6, padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>变更内容</div>
        {changes.length === 0 ? (
          <Text type="secondary">尚未调整任何配置</Text>
        ) : (
          changes.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: '24px' }}>
              <span style={{ width: 140, color: 'rgba(0,0,0,0.65)' }}>{c.label}</span>
              <span>{c.from}</span>
              <ArrowRightOutlined style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }} />
              <span style={{ fontWeight: 600 }}>{c.to}</span>
            </div>
          ))
        )}
      </div>
      {usageError && <Alert type="error" showIcon style={{ marginTop: 12 }} message={usageError} />}
      {direct ? (
        <>
          <div style={{ ...rowStyle, marginTop: 16 }}>
            <span style={labelStyle}>生效时间</span>
            <Radio.Group value={effectiveTime} onChange={(e) => setEffectiveTime(e.target.value as ResizeEffectiveTime)}>
              <Radio value="Immediately">立即生效</Radio>
              <Radio value="MaintainTime">可运维时间段（{current?.maintainWindow}）</Radio>
            </Radio.Group>
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            内部账号无需审批，确认后直接执行。变配过程中可能出现秒级连接闪断，线上实例建议选择可运维时间段。
          </Text>
        </>
      ) : (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
          提交后发起审批；管理员审批通过后，需回到此页面确认生效时间，变配才会执行。
        </Text>
      )}
    </Modal>
  )
}

interface ResizeConfirmModalProps {
  open: boolean
  direction: ResizeDirection
  instanceTitle: string
  current: InstanceSpecConfig | null
  target: InstanceSpecConfig | null
  /** 实例在云厂商设置的可运维时间段 */
  maintainWindow: string
  /** 冲突：申请时快照与云厂商当前配置的比对；为 null 表示无冲突 */
  conflictRows?: SpecCompareRow[] | null
  onCancel: () => void
  onAbandon: () => void
  onReapply: () => void
  onConfirm: (effectiveTime: ResizeEffectiveTime) => void
}

/** 审批通过后：展示变配前后规格比对，用户确认生效时间后执行（变配真正下发的入口） */
export function ResizeConfirmModal({ open, direction, instanceTitle, current, target, maintainWindow, conflictRows, onCancel, onAbandon, onReapply, onConfirm }: ResizeConfirmModalProps) {
  const [effectiveTime, setEffectiveTime] = useState<ResizeEffectiveTime>('Immediately')
  const rows = useMemo(() => (current && target ? compareSpecConfig(current, target) : []), [current, target])
  const actionText = direction === 'upgrade' ? '升配' : '降配'

  useEffect(() => {
    if (open) setEffectiveTime('Immediately')
  }, [open])

  // 冲突：审批期间该组件在云厂商侧已被变配，申请基于的配置已失效，只能重新申请或取消变配
  if (conflictRows) {
    const targetByKey = new Map(target ? compareSpecConfig(target, target).map((r) => [r.key, r.from]) : [])
    return (
      <Modal
        title={`确认${actionText} · ${instanceTitle}`}
        open={open}
        onCancel={onCancel}
        width={640}
        destroyOnHidden
        footer={[
          <Button key="abandon" danger onClick={onAbandon}>取消变配</Button>,
          <Button key="reapply" type="primary" onClick={onReapply}>重新申请</Button>
        ]}
      >
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="配置冲突"
          description={`申请提交后，该组件已在云厂商侧被变配，当前配置与申请时不一致，本次${actionText}无法执行。请重新申请或取消变配。`}
        />
        <Table<SpecCompareRow>
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={conflictRows}
          columns={[
            { title: '配置项', dataIndex: 'item', key: 'item', render: (v: string) => <span style={{ color: 'rgba(0,0,0,0.65)' }}>{v}</span> },
            { title: '申请时', dataIndex: 'from', key: 'from' },
            {
              title: '云厂商当前',
              dataIndex: 'to',
              key: 'to',
              render: (v: string, r: SpecCompareRow) =>
                r.changed ? <span style={{ fontWeight: 600, color: '#ff4d4f' }}>{v}</span> : <span>{v}</span>
            },
            { title: `申请${actionText}后`, key: 'target', render: (_: unknown, r: SpecCompareRow) => <span style={{ color: 'rgba(0,0,0,0.45)' }}>{targetByKey.get(r.key) ?? '-'}</span> }
          ]}
        />
      </Modal>
    )
  }

  return (
    <Modal
      title={`确认${actionText} · ${instanceTitle}`}
      open={open}
      onCancel={onCancel}
      width={600}
      destroyOnHidden
      footer={[
        <Button key="abandon" danger onClick={onAbandon}>放弃申请</Button>,
        <Button key="cancel" onClick={onCancel}>稍后确认</Button>,
        <Button key="ok" type="primary" onClick={() => onConfirm(effectiveTime)}>确认{actionText}</Button>
      ]}
    >
      <Alert type="success" showIcon style={{ marginBottom: 16 }} message={`${actionText}申请已通过，请核对规格后确认。`} />
      <Table<SpecCompareRow>
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={rows}
        style={{ marginBottom: 16 }}
        columns={[
          { title: '配置项', dataIndex: 'item', key: 'item', render: (v: string) => <span style={{ color: 'rgba(0,0,0,0.65)' }}>{v}</span> },
          { title: '当前', dataIndex: 'from', key: 'from' },
          {
            title: `${actionText}后`,
            dataIndex: 'to',
            key: 'to',
            render: (v: string, r: SpecCompareRow) =>
              r.changed ? (
                <Space size={6}>
                  <ArrowRightOutlined style={{ color: direction === 'upgrade' ? '#1677ff' : '#fa8c16', fontSize: 12 }} />
                  <span style={{ fontWeight: 600, color: direction === 'upgrade' ? '#1677ff' : '#fa8c16' }}>{v}</span>
                </Space>
              ) : (
                <span style={{ color: 'rgba(0,0,0,0.45)' }}>{v}（不变）</span>
              )
          }
        ]}
      />
      <div style={rowStyle}>
        <span style={labelStyle}>生效时间</span>
        <Radio.Group value={effectiveTime} onChange={(e) => setEffectiveTime(e.target.value as ResizeEffectiveTime)}>
          <Radio value="Immediately">立即生效</Radio>
          <Radio value="MaintainTime">可运维时间段（{maintainWindow}）</Radio>
        </Radio.Group>
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        变配过程中可能出现秒级连接闪断，线上实例建议选择可运维时间段。
      </Text>
    </Modal>
  )
}
