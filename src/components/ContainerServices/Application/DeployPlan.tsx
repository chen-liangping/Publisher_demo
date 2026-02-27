'use client'

import React, { useState, useCallback, useRef } from 'react'
import {
  Button, Typography, Drawer, Form, Select, Radio, Input,
  InputNumber, Tooltip, Alert, Collapse, Space, Tag, Modal,
  message, Row, Col, Dropdown
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  CaretUpOutlined,
  EditOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { apps, AppItem } from './apps'
import type { DeployPlanRecord } from './DeployPlanList'

const { Title, Text } = Typography

/* ==============================
   类型定义
   ============================== */

/** 流水线中的单个应用节点：每张卡片 = 一个待部署的应用 */
interface PipelineApp {
  id: string
  /** 关联的应用 ID（apps.ts 中的 id） */
  appId: string
  /** 运行状态 */
  status: 'pending' | 'running' | 'success' | 'failed'
  /** 部署配置是否已填写完成 */
  configured: boolean
  /** 部署配置表单数据 */
  config?: DeployConfig
}

/** 阶段：同阶段内的应用并行部署，阶段间串行 */
interface PipelineStage {
  id: string
  name: string
  items: PipelineApp[]
}

/** 部署配置表单数据（即点击"更新部署"后需要填写的内容） */
interface DeployConfig {
  operation?: string
  groupId?: string
  deployScope?: string
  detail?: string
  isRollbackable?: string
  gracePeriodSeconds?: number
  publicPort?: string
  containers?: { name: string; imageRepo: string; imageTag: string; imageSize: number }[]
}

/* ==============================
   工具：通过 appId 获取应用信息
   ============================== */
const getApp = (appId: string): AppItem | undefined => apps.find(a => a.id === appId)

const statusColor = (s: AppItem['status']) => {
  if (s === 'running') return '#52c41a'
  if (s === 'failed') return '#ff4d4f'
  return '#9CA3AF'
}

const tagColor = (t: string) => (t === '游服' ? '#fa8c16' : '#1677ff')

/* ==============================
   初始 mock：用真实应用填充两个阶段
   ============================== */
const createInitialStages = (): PipelineStage[] => [
  {
    id: 'stage-1',
    name: '阶段一',
    items: [
      { id: 'pa-1', appId: '1', status: 'pending', configured: false },
      { id: 'pa-2', appId: '2', status: 'pending', configured: false }
    ]
  },
  {
    id: 'stage-2',
    name: '阶段二',
    items: [
      { id: 'pa-3', appId: '3', status: 'pending', configured: false }
    ]
  }
]

/* ==============================
   主组件
   ============================== */
interface DeployPlanProps {
  onBack: () => void
  /** 传入已有计划数据时进入编辑模式，undefined 为新建 */
  editingPlan?: DeployPlanRecord
}

export default function DeployPlan({ onBack, editingPlan }: DeployPlanProps) {
  const [stages, setStages] = useState<PipelineStage[]>(() => {
    if (!editingPlan) return createInitialStages()
    // 将 DeployPlanRecord 的 stages 转换为编辑器的 PipelineStage
    return editingPlan.stages.map((s, idx) => ({
      id: s.id,
      name: `阶段${idx + 1}`,
      items: s.apps.map(a => ({
        id: a.id,
        appId: apps.find(app => app.name.includes(a.name))?.id || '1',
        status: 'pending' as const,
        configured: true
      }))
    }))
  })
  const [selectedItem, setSelectedItem] = useState<PipelineApp | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deployForm] = Form.useForm()
  const [planName, setPlanName] = useState(editingPlan?.name || '新建部署计划')
  const [editingName, setEditingName] = useState(false)
  // 添加应用弹窗
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addStageId, setAddStageId] = useState('')

  /* 拖拽 */
  const dragFrom = useRef<{ stageId: string; itemId: string } | null>(null)
  const dragTo = useRef<{ stageId: string; itemId: string } | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const isDragging = useRef(false)

  const nextId = useRef(100)
  const genId = (prefix: string) => `${prefix}-${++nextId.current}`

  /* ========== 阶段操作 ========== */

  const addStage = useCallback(() => {
    setStages(prev => [...prev, { id: genId('stage'), name: `阶段${prev.length + 1}`, items: [] }])
  }, [])

  const removeStage = useCallback((stageId: string) => {
    Modal.confirm({
      title: '确认删除阶段',
      icon: <ExclamationCircleOutlined />,
      content: '删除阶段将同时移除其中所有应用，是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setStages(prev => prev.filter(s => s.id !== stageId))
        if (selectedItem && stages.find(s => s.id === stageId)?.items.find(i => i.id === selectedItem.id)) {
          setDrawerOpen(false)
          setSelectedItem(null)
        }
      }
    })
  }, [selectedItem, stages])

  const renameStage = useCallback((stageId: string, name: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, name } : s))
  }, [])

  /* ========== 应用操作 ========== */

  /** 打开"选择应用"弹窗 */
  const openAddModal = useCallback((stageId: string) => {
    setAddStageId(stageId)
    setAddModalOpen(true)
  }, [])

  /** 选择一个应用添加到阶段 */
  const addAppToStage = useCallback((appId: string) => {
    const item: PipelineApp = {
      id: genId('pa'),
      appId,
      status: 'pending',
      configured: false
    }
    setStages(prev => prev.map(s => s.id === addStageId ? { ...s, items: [...s.items, item] } : s))
    setAddModalOpen(false)
    // 自动打开配置抽屉
    setSelectedItem(item)
    setDrawerOpen(true)
    initForm(item)
  }, [addStageId])

  /** 删除应用 */
  const removeItem = useCallback((stageId: string, itemId: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s))
    if (selectedItem?.id === itemId) { setDrawerOpen(false); setSelectedItem(null) }
  }, [selectedItem])

  /** 点击卡片 → 打开抽屉 */
  const openConfig = useCallback((item: PipelineApp) => {
    setSelectedItem(item)
    setDrawerOpen(true)
    initForm(item)
  }, [])

  /** 初始化表单 */
  const initForm = (item: PipelineApp) => {
    const defaults: DeployConfig = {
      operation: '更新',
      deployScope: 'all',
      isRollbackable: 'true',
      gracePeriodSeconds: 5,
      publicPort: '8080',
      containers: [{ name: 'aaa', imageRepo: 'game-server', imageTag: '4.0.0-amd64', imageSize: 0 }]
    }
    deployForm.resetFields()
    deployForm.setFieldsValue(item.config || defaults)
  }

  /** 保存配置 */
  const saveConfig = useCallback(() => {
    deployForm.validateFields().then(values => {
      if (!selectedItem) return
      const updated: PipelineApp = { ...selectedItem, configured: true, config: values as DeployConfig }
      setStages(prev => prev.map(s => ({ ...s, items: s.items.map(i => i.id === updated.id ? updated : i) })))
      setSelectedItem(updated)
      message.success('配置已保存')
    }).catch(() => message.warning('请完善必填项'))
  }, [selectedItem, deployForm])

  /* ========== 拖拽 ========== */

  const onDragStart = (e: React.DragEvent, stageId: string, itemId: string) => {
    isDragging.current = true
    dragFrom.current = { stageId, itemId }
    setDraggingId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const onDragEnter = (e: React.DragEvent, stageId: string, itemId: string) => {
    e.preventDefault()
    dragTo.current = { stageId, itemId }
    setDragOverStageId(stageId)
  }

  const onDragEnd = () => {
    if (!dragFrom.current || !dragTo.current) {
      setDraggingId(null); setDragOverStageId(null); isDragging.current = false; return
    }
    const from = dragFrom.current
    const to = dragTo.current
    if (from.stageId === to.stageId && from.itemId === to.itemId) {
      dragFrom.current = null; dragTo.current = null; setDraggingId(null); setDragOverStageId(null); isDragging.current = false; return
    }
    setStages(prev => {
      const ns = prev.map(s => ({ ...s, items: [...s.items] }))
      const fs = ns.find(s => s.id === from.stageId)
      const ts = ns.find(s => s.id === to.stageId)
      if (!fs || !ts) return prev
      const fi = fs.items.findIndex(i => i.id === from.itemId)
      if (fi === -1) return prev
      const [moved] = fs.items.splice(fi, 1)
      if (to.itemId === '') { ts.items.push(moved) }
      else {
        const ti = ts.items.findIndex(i => i.id === to.itemId)
        ti === -1 ? ts.items.push(moved) : ts.items.splice(ti, 0, moved)
      }
      return ns
    })
    dragFrom.current = null; dragTo.current = null; setDraggingId(null); setDragOverStageId(null)
    setTimeout(() => { isDragging.current = false }, 100)
  }

  const onStageDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStageId(stageId)
    const stage = stages.find(s => s.id === stageId)
    if (stage && stage.items.length === 0) dragTo.current = { stageId, itemId: '' }
  }

  const onStageDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (!dragFrom.current) return
    const stage = stages.find(s => s.id === stageId)
    if (stage && stage.items.length === 0) dragTo.current = { stageId, itemId: '' }
    onDragEnd()
  }

  /* ========== 统计 & 执行 ========== */

  const unconfiguredCount = stages.reduce((n, s) => n + s.items.filter(i => !i.configured).length, 0)
  const totalApps = stages.reduce((n, s) => n + s.items.length, 0)

  const handleRun = () => {
    if (totalApps === 0) { message.warning('请先添加需要部署的应用'); return }
    if (unconfiguredCount > 0) { message.warning(`还有 ${unconfiguredCount} 个应用未配置部署信息`); return }
    message.success('部署计划已开始执行')
    setStages(prev => prev.map(s => ({ ...s, items: s.items.map(i => ({ ...i, status: 'running' as const })) })))
    setTimeout(() => {
      setStages(prev => prev.map(s => ({ ...s, items: s.items.map(i => ({ ...i, status: 'success' as const })) })))
      message.success('所有应用部署完成！')
    }, 3000)
  }

  /* ============================== 
     渲染：状态图标
     ============================== */
  const StatusIcon = ({ status }: { status: PipelineApp['status'] }) => {
    const m: Record<string, React.ReactNode> = {
      pending: <ClockCircleOutlined style={{ fontSize: 14, color: '#d9d9d9' }} />,
      running: <PlayCircleOutlined style={{ fontSize: 14, color: '#1677ff' }} spin />,
      success: <CheckCircleOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
      failed: <ExclamationCircleOutlined style={{ fontSize: 14, color: '#ff4d4f' }} />
    }
    return <>{m[status]}</>
  }

  /* ============================== 
     渲染：应用卡片
     ============================== */
  const renderAppCard = (item: PipelineApp, stageId: string) => {
    const app = getApp(item.appId)
    if (!app) return null
    const isActive = selectedItem?.id === item.id
    const isBeingDragged = draggingId === item.id

    return (
      <div
        key={item.id}
        draggable
        onDragStart={e => onDragStart(e, stageId, item.id)}
        onDragEnter={e => onDragEnter(e, stageId, item.id)}
        onDragEnd={onDragEnd}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onClick={() => { if (!isDragging.current) openConfig(item) }}
        style={{
          padding: '12px 14px',
          borderRadius: 8,
          border: isActive ? '2px solid #1677ff' : '1px solid #e8e8e8',
          backgroundColor: isActive ? '#f0f5ff' : '#fff',
          cursor: 'grab',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: isActive ? '0 2px 8px rgba(22,119,255,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          minWidth: 200,
          opacity: isBeingDragged ? 0.4 : 1,
          transform: isBeingDragged ? 'scale(0.95)' : 'scale(1)'
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = '#91caff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' } }}
      >
        {/* 拖拽手柄 */}
        <HolderOutlined style={{ position: 'absolute', top: 6, left: 6, color: '#bfbfbf', fontSize: 12 }} />

        {/* 应用名 + 标签 + 状态 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <StatusIcon status={item.status} />
            <Text style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {app.name}
            </Text>
            {app.tags.map(t => (
              <Tag key={t} color={tagColor(t)} style={{ borderRadius: 999, border: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px', marginLeft: 0 }}>
                {t}
              </Tag>
            ))}
          </div>
          {!item.configured && (
            <Tag color="red" style={{ borderRadius: 999, border: 0, fontSize: 11, lineHeight: '18px', padding: '0 8px', flexShrink: 0 }}>
              未配置
            </Tag>
          )}
        </div>

        {/* 应用状态 + 容器 */}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(app.status), display: 'inline-block', marginRight: 4 }} />
            {app.status === 'running' ? '运行中' : app.status === 'failed' ? '故障中' : '未启动'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Pod: {app.pods}</Text>
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            容器：{app.containers.join(' | ')}
          </Text>
        </div>

        {/* hover 操作按钮 */}
        <div
          style={{ position: 'absolute', top: 6, right: 6, opacity: 0, transition: 'opacity 0.2s' }}
          className="task-card-actions"
          onClick={e => e.stopPropagation()}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy', label: '复制', icon: <CopyOutlined />,
                  onClick: () => {
                    const copied: PipelineApp = { ...item, id: genId('pa'), status: 'pending', configured: false, config: undefined }
                    setStages(prev => prev.map(s => s.id === stageId ? { ...s, items: [...s.items, copied] } : s))
                    message.success('已复制')
                  }
                },
                { type: 'divider' },
                { key: 'del', label: '移除', icon: <DeleteOutlined />, danger: true, onClick: () => removeItem(stageId, item.id) }
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} style={{ width: 24, height: 24 }} />
          </Dropdown>
        </div>
      </div>
    )
  }

  /** 阶段间连线 */
  const Connector = () => (
    <div style={{ display: 'flex', alignItems: 'center', width: 40, flexShrink: 0, justifyContent: 'center' }}>
      <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg,#d9d9d9,#91caff)', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -4, top: -4, width: 0, height: 0, borderLeft: '6px solid #91caff', borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }} />
      </div>
    </div>
  )

  /* ============================== 
     渲染：主布局
     ============================== */
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      {/* 顶栏 */}
      <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ padding: '4px 8px' }} />
          {editingName ? (
            <Input autoFocus defaultValue={planName} onBlur={e => { setPlanName(e.target.value || planName); setEditingName(false) }} onPressEnter={e => { setPlanName((e.target as HTMLInputElement).value || planName); setEditingName(false) }} style={{ width: 300, fontWeight: 600, fontSize: 16 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setEditingName(true)}>
              <Title level={4} style={{ margin: 0 }}>{planName}</Title>
              <EditOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unconfiguredCount > 0 && (
            <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ borderRadius: 999, border: 0 }}>{unconfiguredCount} 个应用未配置</Tag>
          )}
          <Text type="secondary">共 {totalApps} 个应用，{stages.length} 个阶段</Text>
          <Button onClick={onBack}>仅保存</Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun}>保存并运行</Button>
        </div>
      </div>

      {/* 说明栏 */}
      <div style={{ padding: '10px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          同一阶段内的应用<Text strong style={{ color: '#1677ff', fontSize: 13 }}>并行</Text>部署，不同阶段<Text strong style={{ color: '#1677ff', fontSize: 13 }}>串行</Text>执行。拖拽应用卡片可调整执行顺序，同一应用可在不同阶段重复添加。
        </Text>
      </div>

      {/* 画布 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px', display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
          {stages.map((stage, idx) => (
            <React.Fragment key={stage.id}>
              <div
                style={{ minWidth: 240, maxWidth: 280, transition: 'all 0.2s' }}
                onDragOver={e => onStageDragOver(e, stage.id)}
                onDrop={e => onStageDrop(e, stage.id)}
              >
                {/* 阶段头 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text editable={{ onChange: v => renameStage(stage.id, v), triggerType: ['text'] }} style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>
                      {stage.name}
                    </Text>
                    <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(0,0,0,0.04)', color: '#8c8c8c', fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
                      {stage.items.length}
                    </Tag>
                  </div>
                  {stages.length > 1 && (
                    <Tooltip title="删除阶段">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeStage(stage.id)} style={{ width: 28, height: 28 }} />
                    </Tooltip>
                  )}
                </div>

                {/* 应用列表 */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 10, minHeight: 60, padding: 8, borderRadius: 10,
                  background: dragOverStageId === stage.id ? 'rgba(22,119,255,0.04)' : 'transparent',
                  border: dragOverStageId === stage.id ? '2px dashed #91caff' : '2px dashed transparent',
                  transition: 'all 0.2s'
                }}>
                  {stage.items.map(item => renderAppCard(item, stage.id))}
                  {stage.items.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#bfbfbf', fontSize: 13 }}>拖拽应用到此处</div>
                  )}
                </div>

                {/* 添加应用按钮 */}
                <div style={{ padding: '8px 8px 0' }}>
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => openAddModal(stage.id)} style={{ borderRadius: 8, height: 36, color: '#8c8c8c' }}>
                    添加应用
                  </Button>
                </div>

                {stage.items.length > 1 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(22,119,255,0.08)', color: '#1677ff', fontSize: 11 }}>↕ 并行部署</Tag>
                  </div>
                )}
              </div>
              {idx < stages.length - 1 && <Connector />}
            </React.Fragment>
          ))}

          <Connector />
          <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addStage} style={{ width: 180, height: 60, borderRadius: 10, color: '#8c8c8c', fontSize: 14 }}>
              新阶段
            </Button>
          </div>
        </div>
      </div>

      {/* ---- 选择应用弹窗 ---- */}
      <Modal title="选择要部署的应用" open={addModalOpen} onCancel={() => setAddModalOpen(false)} footer={null} width={480}>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>选择一个应用添加到当前阶段，同一应用可多次添加。</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apps.map(app => (
            <div
              key={app.id}
              onClick={() => addAppToStage(app.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 8, border: '1px solid #f0f0f0', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#91caff'; e.currentTarget.style.backgroundColor = '#f0f5ff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <AppstoreOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontWeight: 600 }}>{app.name}</Text>
                  {app.tags.map(t => (
                    <Tag key={t} color={tagColor(t)} style={{ borderRadius: 999, border: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{t}</Tag>
                  ))}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(app.status), display: 'inline-block', marginRight: 4 }} />
                  {app.status === 'running' ? '运行中' : app.status === 'failed' ? '故障中' : '未启动'}
                  <span style={{ margin: '0 8px' }}>·</span>
                  Pod: {app.pods}
                  <span style={{ margin: '0 8px' }}>·</span>
                  {app.containers.join(' | ')}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ---- 部署配置抽屉（点击卡片后展开，即"更新部署"需要填写的内容） ---- */}
      <Drawer
        title={
          selectedItem ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AppstoreOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 16 }}>{getApp(selectedItem.appId)?.name}</Text>
              {getApp(selectedItem.appId)?.tags.map(t => (
                <Tag key={t} color={tagColor(t)} style={{ borderRadius: 999, border: 0, fontSize: 11 }}>{t}</Tag>
              ))}
              <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>部署配置</Text>
            </div>
          ) : '部署配置'
        }
        width={560}
        placement="right"
        onClose={() => { setDrawerOpen(false); setSelectedItem(null) }}
        open={drawerOpen}
        destroyOnClose={false}
        mask={false}
        styles={{ body: { paddingBottom: 80 }, header: { borderBottom: '1px solid #f0f0f0' } }}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <Button type="primary" onClick={saveConfig}>保存配置</Button>
            <Button onClick={() => { setDrawerOpen(false); setSelectedItem(null) }}>取消</Button>
          </div>
        }
      >
        {selectedItem && (
          <>
            <Alert type="warning" showIcon closable message="部分配置修改不会立即生效，请重新部署以应用最新设置" style={{ marginBottom: 16 }} />

            <Form form={deployForm} layout="vertical" initialValues={{ operation: '更新', deployScope: 'all', isRollbackable: 'true', gracePeriodSeconds: 5, publicPort: '8080' }}>
              {/* 操作类型 */}
              <Form.Item name="operation" label="操作类型" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="更新">更新</Select.Option>
                  <Select.Option value="创建">创建</Select.Option>
                </Select>
              </Form.Item>

              {/* 分组 */}
              <Form.Item name="groupId" label="分组" rules={[{ required: true, message: '请选择分组' }]}>
                <Select placeholder="请选择分组">
                  <Select.Option value="group1">分组1</Select.Option>
                  <Select.Option value="group2">分组2</Select.Option>
                </Select>
              </Form.Item>

              {/* 游服ID */}
              <Form.Item label="游服ID" required>
                <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                  <Form.Item name="deployScope" noStyle>
                    <Radio.Group>
                      <Radio value="all">自动开服的游服</Radio>
                      <Radio value="range">特定游服（灰度发布）</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Space>
              </Form.Item>

              {/* 部署详情 */}
              <Form.Item name="detail" label="部署详情">
                <Input.TextArea placeholder="请填写此次部署主要范围和内容" rows={3} />
              </Form.Item>

              {/* 此版本是否能回滚 */}
              <Form.Item name="isRollbackable" label="此版本是否能回滚" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="true">是</Radio>
                  <Radio value="false">
                    <span>否 <Tooltip title='选择"否"后，此版本将无法回滚，请谨慎操作'><QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)', marginLeft: 4 }} /></Tooltip></span>
                  </Radio>
                </Radio.Group>
              </Form.Item>

              {/* 镜像版本 */}
              <Form.Item label="镜像版本" required>
                <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                  <Input.Group compact>
                    <Form.Item name={['containers', 0, 'name']} noStyle><Input disabled style={{ width: '25%' }} /></Form.Item>
                    <Form.Item name={['containers', 0, 'imageRepo']} noStyle><Input disabled style={{ width: '40%' }} /></Form.Item>
                    <Form.Item name={['containers', 0, 'imageTag']} noStyle rules={[{ required: true }]}>
                      <Select style={{ width: '35%' }} showSearch>
                        <Select.Option value="4.0.0-amd64">4.0.0-amd64</Select.Option>
                        <Select.Option value="3.9.0-amd64">3.9.0-amd64</Select.Option>
                        <Select.Option value="3.8.0-amd64">3.8.0-amd64</Select.Option>
                      </Select>
                    </Form.Item>
                  </Input.Group>

                  <Collapse
                    items={[{
                      key: '1',
                      label: 'server',
                      extra: <Button type="link" size="small" icon={<CaretUpOutlined />} style={{ fontSize: 14, padding: 0, color: 'rgba(0,0,0,0.65)' }}>展开</Button>,
                      children: (
                        <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                          <Form.Item label="环境变量">
                            <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                              <Space style={{ width: '100%', gap: 8 }}>
                                <Input.Group compact style={{ flex: 1 }}>
                                  <Input disabled value="SPRING_PROFILES_ACTIVE" style={{ width: '40%' }} />
                                  <Button disabled style={{ paddingLeft: 8, paddingRight: 8 }}>=</Button>
                                  <Input disabled value="test" style={{ width: 'calc(60% - 32px)' }} />
                                </Input.Group>
                                <Button icon={<DeleteOutlined />} disabled style={{ visibility: 'hidden' }} />
                              </Space>
                              <Button icon={<PlusOutlined />}>环境变量</Button>
                            </Space>
                          </Form.Item>
                          <Form.Item name={['containers', 0, 'command']} label={<span>启动命令ENTRYPOINT <Tooltip title="容器启动时执行的命令"><QuestionCircleOutlined /></Tooltip></span>} extra='使用","分隔，例：executable,param1,param2'>
                            <Input placeholder='使用","分隔' />
                          </Form.Item>
                          <Row gutter={8}>
                            <Col span={12}>
                              <Form.Item name={['containers', 0, 'healthCheck', 'type']} label={<span>健康检查类型 <Tooltip title="选择健康检查方式"><QuestionCircleOutlined /></Tooltip></span>} initialValue="httpGet">
                                <Select><Select.Option value="httpGet">httpGet</Select.Option><Select.Option value="tcpSocket">tcpSocket</Select.Option><Select.Option value="exec">exec</Select.Option></Select>
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name={['containers', 0, 'healthCheck', 'initializeDelaySeconds']} label={<span>启动等待时间 <Tooltip title="容器启动后等待多久开始健康检查"><QuestionCircleOutlined /></Tooltip></span>} initialValue={300}>
                                <InputNumber min={0} max={3600} addonAfter="秒" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item label="健康检查路径" required>
                            <Space.Compact style={{ width: '100%' }}>
                              <Form.Item name={['containers', 0, 'healthCheck', 'httpGet', 'path']} noStyle initialValue="/test"><Input placeholder="例：/ping" style={{ flex: 1 }} /></Form.Item>
                              <Button disabled style={{ paddingLeft: 8, paddingRight: 8 }}>:</Button>
                              <Form.Item name={['containers', 0, 'healthCheck', 'httpGet', 'port']} noStyle initialValue={8080}><InputNumber min={1} max={65535} placeholder="端口" style={{ width: 120 }} /></Form.Item>
                            </Space.Compact>
                          </Form.Item>
                          <Form.Item label="文件挂载"><Button icon={<PlusOutlined />}>挂载文件</Button></Form.Item>
                          <Form.Item name={['containers', 0, 'preStop', 'type']} label={<span>preStop类型 <Tooltip title="容器停止前执行的钩子"><QuestionCircleOutlined /></Tooltip></span>} extra="在该容器停止前调用">
                            <Select placeholder="请选择" allowClear><Select.Option value="exec">exec</Select.Option><Select.Option value="httpGet">httpGet</Select.Option></Select>
                          </Form.Item>
                        </Space>
                      )
                    }]}
                    expandIcon={() => null}
                    style={{ backgroundColor: 'transparent', border: 'none' }}
                  />
                </Space>
              </Form.Item>

              {/* 优雅中止等待时间 */}
              <Form.Item name="gracePeriodSeconds" label="优雅中止等待时间" rules={[{ required: true }]}>
                <InputNumber min={0} max={300} addonAfter="秒" style={{ width: 160 }} />
              </Form.Item>

              {/* 对外端口 */}
              <Form.Item name="publicPort" label="对外端口" rules={[{ required: true }]}>
                <Select><Select.Option value="8080">8080</Select.Option><Select.Option value="8081">8081</Select.Option><Select.Option value="9090">9090</Select.Option></Select>
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>

      <style>{`div:hover > .task-card-actions { opacity: 1 !important; }`}</style>
    </div>
  )
}
