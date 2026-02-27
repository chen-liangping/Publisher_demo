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
  RocketOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { apps, AppItem } from './apps'

const { Title, Text } = Typography

/* ==============================
   类型定义
   ============================== */

/** 流水线中的单个任务 */
interface PipelineTask {
  id: string
  name: string
  type: 'deploy' | 'build' | 'source' | 'custom'
  /** 关联的应用 ID（部署任务才有） */
  appId?: string
  /** 任务状态 */
  status: 'pending' | 'running' | 'success' | 'failed'
  /** 是否已配置完成 */
  configured: boolean
  /** 任务配置详情 */
  config?: TaskConfig
}

/** 流水线中的阶段，同阶段内的任务并行执行 */
interface PipelineStage {
  id: string
  name: string
  tasks: PipelineTask[]
}

/** 部署任务的配置数据 */
interface TaskConfig {
  appId?: string
  operation?: string
  groupId?: string
  deployScope?: string
  detail?: string
  isRollbackable?: string
  gracePeriodSeconds?: number
  publicPort?: string
  containers?: ContainerConfig[]
}

interface ContainerConfig {
  name: string
  imageRepo: string
  imageTag: string
  imageSize: number
}

/* ==============================
   初始 mock 流水线数据
   ============================== */

const createInitialStages = (): PipelineStage[] => [
  {
    id: 'stage-1',
    name: '流水线源',
    tasks: [
      {
        id: 'task-1-1',
        name: '添加流水线源',
        type: 'source',
        status: 'pending',
        configured: false
      }
    ]
  },
  {
    id: 'stage-2',
    name: '构建',
    tasks: [
      {
        id: 'task-2-1',
        name: 'Java 构建上传',
        type: 'build',
        status: 'pending',
        configured: true
      }
    ]
  },
  {
    id: 'stage-3',
    name: '部署',
    tasks: [
      {
        id: 'task-3-1',
        name: '主机部署',
        type: 'deploy',
        appId: '1',
        status: 'pending',
        configured: false,
        config: {
          appId: '1',
          operation: '更新',
          deployScope: 'all',
          isRollbackable: 'true',
          gracePeriodSeconds: 5,
          publicPort: '8080'
        }
      }
    ]
  }
]

/* ==============================
   任务类型选项（新建任务时使用）
   ============================== */
const taskTypeOptions = [
  { label: '主机部署', value: 'deploy', icon: <RocketOutlined style={{ color: '#1677ff' }} /> },
  { label: '构建上传', value: 'build', icon: <ThunderboltOutlined style={{ color: '#fa8c16' }} /> },
  { label: '自定义脚本', value: 'custom', icon: <EditOutlined style={{ color: '#722ed1' }} /> }
]

/* ==============================
   主组件
   ============================== */
interface DeployPlanProps {
  onBack: () => void
}

export default function DeployPlan({ onBack }: DeployPlanProps) {
  const [stages, setStages] = useState<PipelineStage[]>(createInitialStages)
  const [activeTab, setActiveTab] = useState<string>('pipeline')
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState<boolean>(false)
  const [taskForm] = Form.useForm()
  const [planName, setPlanName] = useState<string>('流水线 2023-08-27')
  const [editingName, setEditingName] = useState<boolean>(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState<boolean>(false)
  const [addTaskStageId, setAddTaskStageId] = useState<string>('')

  /* 拖拽状态 */
  const dragItem = useRef<{ stageId: string; taskId: string } | null>(null)
  const dragOverItem = useRef<{ stageId: string; taskId: string } | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const isDragging = useRef(false)

  /* ---- ID 生成 ---- */
  const nextId = useRef(100)
  const genId = (prefix: string) => `${prefix}-${++nextId.current}`

  /* ========== 阶段操作 ========== */

  /** 在末尾新增一个空阶段 */
  const addStage = useCallback(() => {
    const id = genId('stage')
    setStages(prev => [
      ...prev,
      { id, name: '新阶段', tasks: [] }
    ])
  }, [])

  /** 删除阶段 */
  const removeStage = useCallback((stageId: string) => {
    Modal.confirm({
      title: '确认删除阶段',
      icon: <ExclamationCircleOutlined />,
      content: '删除阶段将同时删除该阶段下所有任务，是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => setStages(prev => prev.filter(s => s.id !== stageId))
    })
  }, [])

  /** 重命名阶段 */
  const renameStage = useCallback((stageId: string, newName: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, name: newName } : s))
  }, [])

  /* ========== 任务操作 ========== */

  /** 添加任务到指定阶段（打开选择弹窗） */
  const handleAddTask = useCallback((stageId: string) => {
    setAddTaskStageId(stageId)
    setAddTaskModalOpen(true)
  }, [])

  /** 确认添加指定类型的任务 */
  const confirmAddTask = useCallback((type: PipelineTask['type']) => {
    const nameMap: Record<string, string> = {
      deploy: '主机部署',
      build: '构建上传',
      custom: '自定义脚本'
    }
    const task: PipelineTask = {
      id: genId('task'),
      name: nameMap[type] || '新任务',
      type,
      status: 'pending',
      configured: false
    }
    setStages(prev =>
      prev.map(s =>
        s.id === addTaskStageId ? { ...s, tasks: [...s.tasks, task] } : s
      )
    )
    setAddTaskModalOpen(false)
    // 自动打开配置抽屉
    setSelectedTask(task)
    setTaskDrawerOpen(true)
    initFormForTask(task)
  }, [addTaskStageId])

  /** 删除任务 */
  const removeTask = useCallback((stageId: string, taskId: string) => {
    setStages(prev =>
      prev.map(s =>
        s.id === stageId ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) } : s
      )
    )
    if (selectedTask?.id === taskId) {
      setTaskDrawerOpen(false)
      setSelectedTask(null)
    }
  }, [selectedTask])

  /** 点击任务，打开配置抽屉 */
  const openTaskConfig = useCallback((task: PipelineTask) => {
    setSelectedTask(task)
    setTaskDrawerOpen(true)
    initFormForTask(task)
  }, [])

  /** 初始化表单 */
  const initFormForTask = (task: PipelineTask) => {
    if (task.config) {
      taskForm.setFieldsValue({
        ...task.config,
        containers: task.config.containers || [{
          name: 'aaa',
          imageRepo: 'game-server',
          imageTag: '4.0.0-amd64',
          imageSize: 0
        }]
      })
    } else {
      taskForm.resetFields()
      taskForm.setFieldsValue({
        operation: '更新',
        deployScope: 'all',
        isRollbackable: 'true',
        gracePeriodSeconds: 5,
        publicPort: '8080',
        containers: [{
          name: 'aaa',
          imageRepo: 'game-server',
          imageTag: '4.0.0-amd64',
          imageSize: 0
        }]
      })
    }
  }

  /** 保存任务配置 */
  const saveTaskConfig = useCallback(() => {
    taskForm.validateFields().then(values => {
      if (!selectedTask) return
      const updatedTask: PipelineTask = {
        ...selectedTask,
        configured: true,
        config: values as TaskConfig,
        appId: values.appId,
        name: selectedTask.name
      }
      setStages(prev =>
        prev.map(s => ({
          ...s,
          tasks: s.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
        }))
      )
      setSelectedTask(updatedTask)
      message.success('任务配置已保存')
    }).catch(() => {
      message.warning('请完善必填项')
    })
  }, [selectedTask, taskForm])

  /* ========== 拖拽处理（阶段间 & 阶段内任务排序） ========== */

  const handleDragStart = (e: React.DragEvent, stageId: string, taskId: string) => {
    isDragging.current = true
    dragItem.current = { stageId, taskId }
    setDraggingTaskId(taskId)
    // 设置拖拽时的半透明效果
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
    // 让拖拽图像稍有偏移，视觉上更自然
    if (e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect()
      e.dataTransfer.setDragImage(e.currentTarget, e.clientX - rect.left, e.clientY - rect.top)
    }
  }

  const handleDragEnter = (e: React.DragEvent, stageId: string, taskId: string) => {
    e.preventDefault()
    dragOverItem.current = { stageId, taskId }
    setDragOverStageId(stageId)
  }

  const handleDragEnd = () => {
    if (!dragItem.current || !dragOverItem.current) {
      setDraggingTaskId(null)
      setDragOverStageId(null)
      isDragging.current = false
      return
    }

    const from = dragItem.current
    const to = dragOverItem.current

    // 如果放回原位则跳过
    if (from.stageId === to.stageId && from.taskId === to.taskId) {
      dragItem.current = null
      dragOverItem.current = null
      setDraggingTaskId(null)
      setDragOverStageId(null)
      isDragging.current = false
      return
    }

    setStages(prev => {
      const newStages = prev.map(s => ({ ...s, tasks: [...s.tasks] }))
      const fromStage = newStages.find(s => s.id === from.stageId)
      const toStage = newStages.find(s => s.id === to.stageId)
      if (!fromStage || !toStage) return prev

      const fromIdx = fromStage.tasks.findIndex(t => t.id === from.taskId)
      if (fromIdx === -1) return prev

      const [movedTask] = fromStage.tasks.splice(fromIdx, 1)

      if (to.taskId === '') {
        // 拖到空阶段
        toStage.tasks.push(movedTask)
      } else {
        const toIdx = toStage.tasks.findIndex(t => t.id === to.taskId)
        if (toIdx === -1) {
          toStage.tasks.push(movedTask)
        } else {
          toStage.tasks.splice(toIdx, 0, movedTask)
        }
      }

      return newStages
    })

    message.info('任务已移动')
    dragItem.current = null
    dragOverItem.current = null
    setDraggingTaskId(null)
    setDragOverStageId(null)
    // 延迟重置 isDragging，防止 dragEnd 触发 onClick
    setTimeout(() => { isDragging.current = false }, 100)
  }

  /** 阶段级拖拽：允许拖入 */
  const handleStageDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStageId(stageId)
    const stage = stages.find(s => s.id === stageId)
    if (stage && stage.tasks.length === 0) {
      dragOverItem.current = { stageId, taskId: '' }
    }
  }

  const handleStageDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    // 如果目标阶段没有任务，且 dragOverItem 已指向此阶段，handleDragEnd 会处理
    if (!dragItem.current) return
    const stage = stages.find(s => s.id === stageId)
    if (stage && stage.tasks.length === 0) {
      dragOverItem.current = { stageId, taskId: '' }
    }
    handleDragEnd()
  }

  /* ========== 未配置任务数 ========== */
  const unconfiguredCount = stages.reduce(
    (sum, s) => sum + s.tasks.filter(t => !t.configured).length,
    0
  )

  /* ========== 执行流水线 ========== */
  const handleRun = () => {
    if (unconfiguredCount > 0) {
      message.warning(`还有 ${unconfiguredCount} 项任务未配置完成`)
      return
    }
    message.success('流水线已开始执行')
    // 模拟状态更新
    setStages(prev =>
      prev.map(s => ({
        ...s,
        tasks: s.tasks.map(t => ({ ...t, status: 'running' as const }))
      }))
    )
    // 模拟 3 秒后全部成功
    setTimeout(() => {
      setStages(prev =>
        prev.map(s => ({
          ...s,
          tasks: s.tasks.map(t => ({ ...t, status: 'success' as const }))
        }))
      )
      message.success('流水线执行完成！')
    }, 3000)
  }

  /* ============================== 
     渲染
     ============================== */

  /** 任务状态指示器 */
  const StatusDot = ({ status }: { status: PipelineTask['status'] }) => {
    const map: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: '#d9d9d9', icon: <ClockCircleOutlined style={{ fontSize: 14, color: '#d9d9d9' }} /> },
      running: { color: '#1677ff', icon: <PlayCircleOutlined style={{ fontSize: 14, color: '#1677ff' }} spin /> },
      success: { color: '#52c41a', icon: <CheckCircleOutlined style={{ fontSize: 14, color: '#52c41a' }} /> },
      failed: { color: '#ff4d4f', icon: <ExclamationCircleOutlined style={{ fontSize: 14, color: '#ff4d4f' }} /> }
    }
    return <>{map[status]?.icon}</>
  }

  /** 渲染单个任务卡片 */
  const renderTaskCard = (task: PipelineTask, stageId: string) => {
    const isActive = selectedTask?.id === task.id
    const isBeingDragged = draggingTaskId === task.id
    const appInfo = task.appId ? apps.find(a => a.id === task.appId) : null

    return (
      <div
        key={task.id}
        draggable
        onDragStart={e => handleDragStart(e, stageId, task.id)}
        onDragEnter={e => handleDragEnter(e, stageId, task.id)}
        onDragEnd={handleDragEnd}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onClick={() => {
          // 拖拽结束后短暂期间内忽略 click，防止误触
          if (isDragging.current) return
          openTaskConfig(task)
        }}
        style={{
          padding: '12px 14px',
          borderRadius: 8,
          border: isActive ? '2px solid #1677ff' : '1px solid #e8e8e8',
          backgroundColor: isActive ? '#f0f5ff' : '#fff',
          cursor: 'grab',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isActive
            ? '0 2px 8px rgba(22,119,255,0.15)'
            : '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          minWidth: 180,
          opacity: isBeingDragged ? 0.4 : 1,
          transform: isBeingDragged ? 'scale(0.95)' : 'scale(1)'
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.borderColor = '#91caff'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.borderColor = '#e8e8e8'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
          }
        }}
      >
        {/* 拖拽手柄 */}
        <HolderOutlined style={{
          position: 'absolute',
          top: 6,
          left: 6,
          color: '#bfbfbf',
          fontSize: 12,
          cursor: 'grab'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <StatusDot status={task.status} />
            <Text style={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {task.name}
            </Text>
          </div>
          {!task.configured && (
            <Tag
              color="red"
              style={{
                borderRadius: 999,
                border: 0,
                fontSize: 11,
                lineHeight: '18px',
                padding: '0 8px',
                flexShrink: 0
              }}
            >
              未配置
            </Tag>
          )}
        </div>

        {/* 关联应用信息 */}
        {appInfo && (
          <div style={{ marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              应用：{appInfo.name}
            </Text>
          </div>
        )}

        {/* 操作按钮 */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          className="task-card-actions"
          onClick={e => e.stopPropagation()}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy',
                  label: '复制任务',
                  icon: <CopyOutlined />,
                  onClick: () => {
                    const copied: PipelineTask = {
                      ...task,
                      id: genId('task'),
                      name: task.name + ' (副本)',
                      status: 'pending'
                    }
                    setStages(prev =>
                      prev.map(s =>
                        s.id === stageId ? { ...s, tasks: [...s.tasks, copied] } : s
                      )
                    )
                    message.success('任务已复制')
                  }
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  label: '删除任务',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => removeTask(stageId, task.id)
                }
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
  const StageConnector = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      width: 40,
      flexShrink: 0,
      justifyContent: 'center'
    }}>
      <div style={{
        width: 40,
        height: 2,
        background: 'linear-gradient(90deg, #d9d9d9, #91caff)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          right: -4,
          top: -4,
          width: 0,
          height: 0,
          borderLeft: '6px solid #91caff',
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent'
        }} />
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      {/* ---- 顶部标题栏 ---- */}
      <div style={{
        padding: '12px 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ padding: '4px 8px' }}
          />
          {editingName ? (
            <Input
              autoFocus
              defaultValue={planName}
              onBlur={e => { setPlanName(e.target.value || planName); setEditingName(false) }}
              onPressEnter={e => { setPlanName((e.target as HTMLInputElement).value || planName); setEditingName(false) }}
              style={{ width: 260, fontWeight: 600, fontSize: 16 }}
            />
          ) : (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => setEditingName(true)}
            >
              <Title level={4} style={{ margin: 0 }}>{planName}</Title>
              <EditOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unconfiguredCount > 0 && (
            <Tag
              color="red"
              icon={<ExclamationCircleOutlined />}
              style={{ borderRadius: 999, border: 0 }}
            >
              {unconfiguredCount} 项任务未配置完
            </Tag>
          )}
          <Button onClick={onBack}>仅保存</Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
          >
            保存并运行
          </Button>
        </div>
      </div>

      {/* ---- 导航 Tab ---- */}
      <div style={{
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        gap: 0,
        flexShrink: 0
      }}>
        {[
          { key: 'info', label: '基本信息' },
          { key: 'pipeline', label: '流程配置' },
          { key: 'trigger', label: '触发设置' },
          { key: 'vars', label: '变量和缓存' }
        ].map(tab => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#1677ff' : '#595959',
              borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* ---- 流水线画布区 ---- */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 24px',
        display: 'flex',
        alignItems: 'flex-start'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
          {stages.map((stage, stageIdx) => (
            <React.Fragment key={stage.id}>
              {/* 阶段列 */}
              <div
                style={{
                  minWidth: 220,
                  maxWidth: 260,
                  transition: 'all 0.2s'
                }}
                onDragOver={e => handleStageDragOver(e, stage.id)}
                onDrop={e => handleStageDrop(e, stage.id)}
              >
                {/* 阶段头 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                  marginBottom: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text
                      editable={{
                        onChange: val => renameStage(stage.id, val),
                        triggerType: ['text']
                      }}
                      style={{ fontWeight: 600, fontSize: 15, margin: 0 }}
                    >
                      {stage.name}
                    </Text>
                    <Tag
                      style={{
                        borderRadius: 999,
                        border: 0,
                        background: 'rgba(0,0,0,0.04)',
                        color: '#8c8c8c',
                        fontSize: 11,
                        lineHeight: '18px',
                        padding: '0 6px'
                      }}
                    >
                      {stage.tasks.length}
                    </Tag>
                  </div>
                  {stages.length > 1 && (
                    <Tooltip title="删除阶段">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeStage(stage.id)}
                        style={{ width: 28, height: 28 }}
                      />
                    </Tooltip>
                  )}
                </div>

                {/* 任务列表 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 60,
                  padding: 8,
                  borderRadius: 10,
                  background: dragOverStageId === stage.id
                    ? 'rgba(22,119,255,0.04)'
                    : 'transparent',
                  border: dragOverStageId === stage.id
                    ? '2px dashed #91caff'
                    : '2px dashed transparent',
                  transition: 'all 0.2s'
                }}>
                  {stage.tasks.map(task => renderTaskCard(task, stage.id))}

                  {stage.tasks.length === 0 && (
                    <div style={{
                      padding: 20,
                      textAlign: 'center',
                      color: '#bfbfbf',
                      fontSize: 13
                    }}>
                      拖拽任务到此处
                    </div>
                  )}
                </div>

                {/* 添加任务按钮 */}
                <div style={{ padding: '8px 8px 0' }}>
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => handleAddTask(stage.id)}
                    style={{
                      borderRadius: 8,
                      height: 36,
                      color: '#8c8c8c'
                    }}
                  >
                    新的任务
                  </Button>
                </div>

                {/* 并行任务提示 */}
                {stage.tasks.length > 1 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ↕ 并行任务
                    </Text>
                  </div>
                )}
              </div>

              {/* 连线 */}
              {stageIdx < stages.length - 1 && <StageConnector />}
            </React.Fragment>
          ))}

          {/* 新增阶段按钮 */}
          <StageConnector />
          <div style={{
            minWidth: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 40
          }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addStage}
              style={{
                width: 180,
                height: 60,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: '#8c8c8c',
                fontSize: 14
              }}
            >
              新阶段
            </Button>
          </div>
        </div>
      </div>

      {/* ---- 添加任务弹窗 ---- */}
      <Modal
        title="选择任务类型"
        open={addTaskModalOpen}
        onCancel={() => setAddTaskModalOpen(false)}
        footer={null}
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
          {taskTypeOptions.map(opt => (
            <div
              key={opt.value}
              onClick={() => confirmAddTask(opt.value as PipelineTask['type'])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#91caff'
                e.currentTarget.style.backgroundColor = '#f0f5ff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#f0f0f0'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div style={{ fontSize: 20 }}>{opt.icon}</div>
              <div>
                <Text style={{ fontWeight: 500 }}>{opt.label}</Text>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ---- 任务配置抽屉（右侧，"更新部署"表单内容） ---- */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong>任务名称</Text>
            <Input
              value={selectedTask?.name || ''}
              onChange={e => {
                if (!selectedTask) return
                const updated = { ...selectedTask, name: e.target.value }
                setSelectedTask(updated)
                setStages(prev =>
                  prev.map(s => ({
                    ...s,
                    tasks: s.tasks.map(t => t.id === updated.id ? updated : t)
                  }))
                )
              }}
              style={{ width: 200 }}
            />
          </div>
        }
        width={520}
        placement="right"
        onClose={() => {
          setTaskDrawerOpen(false)
          setSelectedTask(null)
        }}
        open={taskDrawerOpen}
        destroyOnClose={false}
        mask={false}
        styles={{
          body: { paddingBottom: 80, background: '#fafafa' },
          header: { borderBottom: '1px solid #f0f0f0' }
        }}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <Button type="primary" onClick={saveTaskConfig}>
              保存配置
            </Button>
            <Button onClick={() => { setTaskDrawerOpen(false); setSelectedTask(null) }}>
              取消
            </Button>
          </div>
        }
      >
        {selectedTask && selectedTask.type === 'deploy' && (
          <>
            {/* 关联应用选择 */}
            <div style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <Form.Item label="关联制品" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="请选择输出参数"
                  style={{ width: '100%' }}
                  value={selectedTask.appId}
                  onChange={val => {
                    const updated = { ...selectedTask, appId: val }
                    setSelectedTask(updated)
                    setStages(prev =>
                      prev.map(s => ({
                        ...s,
                        tasks: s.tasks.map(t => t.id === updated.id ? updated : t)
                      }))
                    )
                  }}
                >
                  {apps.map(app => (
                    <Select.Option key={app.id} value={app.id}>
                      {app.name}
                    </Select.Option>
                  ))}
                </Select>
                <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  制品不能为空
                </Text>
              </Form.Item>
            </div>

            {/* 主机组 */}
            <div style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>主机组</Text>
                <Button type="link" size="small" icon={<PlusOutlined />}>新建主机组</Button>
              </div>
              <Select
                placeholder="请选择主机组/更多主机组请按名称搜索"
                showSearch
                style={{ width: '100%' }}
              >
                <Select.Option value="group-1">生产环境-主机组A</Select.Option>
                <Select.Option value="group-2">测试环境-主机组B</Select.Option>
              </Select>
            </div>

            {/* 部署配置（即"更新部署"的表单内容） */}
            <div style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <Text strong style={{ fontSize: 15, marginBottom: 16, display: 'block' }}>部署配置</Text>

              <Alert
                type="warning"
                showIcon
                closable
                message="部分配置修改不会立即生效，请重新部署以应用最新设置"
                style={{ marginBottom: 16 }}
              />

              <Form
                form={taskForm}
                layout="vertical"
                initialValues={{
                  operation: '更新',
                  deployScope: 'all',
                  isRollbackable: 'true',
                  gracePeriodSeconds: 5,
                  publicPort: '8080'
                }}
              >
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

                {/* 此版本是否能回滚 */}
                <Form.Item name="isRollbackable" label="此版本是否能回滚" rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio value="true">是</Radio>
                    <Radio value="false">
                      <span>
                        否
                        <Tooltip title='选择"否"后，此版本将无法回滚，请谨慎操作'>
                          <QuestionCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)', marginLeft: 4 }} />
                        </Tooltip>
                      </span>
                    </Radio>
                  </Radio.Group>
                </Form.Item>

                {/* 镜像版本 */}
                <Form.Item label="镜像版本" required>
                  <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                    <Input.Group compact>
                      <Form.Item name={['containers', 0, 'name']} noStyle>
                        <Input disabled style={{ width: '25%' }} />
                      </Form.Item>
                      <Form.Item name={['containers', 0, 'imageRepo']} noStyle>
                        <Input disabled style={{ width: '40%' }} />
                      </Form.Item>
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
                        extra: (
                          <Button type="link" size="small" icon={<CaretUpOutlined />} style={{ fontSize: 14, padding: 0, color: 'rgba(0,0,0,0.65)' }}>
                            展开
                          </Button>
                        ),
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

                            <Form.Item
                              name={['containers', 0, 'command']}
                              label={<span>启动命令ENTRYPOINT <Tooltip title="容器启动时执行的命令"><QuestionCircleOutlined /></Tooltip></span>}
                              extra='使用","分隔，例：executable,param1,param2'
                            >
                              <Input placeholder='使用","分隔' />
                            </Form.Item>

                            <Row gutter={8}>
                              <Col span={12}>
                                <Form.Item
                                  name={['containers', 0, 'healthCheck', 'type']}
                                  label={<span>健康检查类型 <Tooltip title="选择健康检查方式"><QuestionCircleOutlined /></Tooltip></span>}
                                  initialValue="httpGet"
                                >
                                  <Select>
                                    <Select.Option value="httpGet">httpGet</Select.Option>
                                    <Select.Option value="tcpSocket">tcpSocket</Select.Option>
                                    <Select.Option value="exec">exec</Select.Option>
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  name={['containers', 0, 'healthCheck', 'initializeDelaySeconds']}
                                  label={<span>启动等待时间 <Tooltip title="容器启动后等待多久开始健康检查"><QuestionCircleOutlined /></Tooltip></span>}
                                  initialValue={300}
                                >
                                  <InputNumber min={0} max={3600} addonAfter="秒" style={{ width: '100%' }} />
                                </Form.Item>
                              </Col>
                            </Row>

                            <Form.Item label="健康检查路径" required>
                              <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name={['containers', 0, 'healthCheck', 'httpGet', 'path']} noStyle initialValue="/test">
                                  <Input placeholder="例：/ping" style={{ flex: 1 }} />
                                </Form.Item>
                                <Button disabled style={{ paddingLeft: 8, paddingRight: 8 }}>:</Button>
                                <Form.Item name={['containers', 0, 'healthCheck', 'httpGet', 'port']} noStyle initialValue={8080}>
                                  <InputNumber min={1} max={65535} placeholder="端口" style={{ width: 120 }} />
                                </Form.Item>
                              </Space.Compact>
                            </Form.Item>

                            <Form.Item label="文件挂载">
                              <Button icon={<PlusOutlined />}>挂载文件</Button>
                            </Form.Item>

                            <Form.Item
                              name={['containers', 0, 'preStop', 'type']}
                              label={<span>preStop类型 <Tooltip title="容器停止前执行的钩子"><QuestionCircleOutlined /></Tooltip></span>}
                              extra="在该容器停止前调用"
                            >
                              <Select placeholder="请选择" allowClear>
                                <Select.Option value="exec">exec</Select.Option>
                                <Select.Option value="httpGet">httpGet</Select.Option>
                              </Select>
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
                  <Select>
                    <Select.Option value="8080">8080</Select.Option>
                    <Select.Option value="8081">8081</Select.Option>
                    <Select.Option value="9090">9090</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </div>
          </>
        )}

        {/* 非部署任务的简单配置面板 */}
        {selectedTask && selectedTask.type !== 'deploy' && (
          <div style={{
            background: '#fff',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <Text strong style={{ fontSize: 15, marginBottom: 16, display: 'block' }}>
              {selectedTask.type === 'build' ? '构建配置' : '自定义脚本'}
            </Text>
            <Form layout="vertical">
              <Form.Item label="任务描述">
                <Input.TextArea
                  rows={3}
                  placeholder="请描述此任务的用途"
                  defaultValue={selectedTask.type === 'build' ? 'Java 构建上传至镜像仓库' : ''}
                />
              </Form.Item>
              {selectedTask.type === 'build' && (
                <>
                  <Form.Item label="构建命令">
                    <div style={{
                      background: '#1e1e1e',
                      borderRadius: 6,
                      padding: '12px 16px',
                      fontFamily: 'Menlo, Consolas, monospace',
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: '#d4d4d4',
                      minHeight: 80
                    }}>
                      <div>mvn clean package -DskipTests</div>
                      <div>docker build -t game-server:latest .</div>
                      <div>docker push registry/game-server:latest</div>
                    </div>
                  </Form.Item>
                </>
              )}
              {selectedTask.type === 'custom' && (
                <Form.Item label="执行脚本">
                  <Input.TextArea
                    rows={6}
                    placeholder="请输入脚本内容"
                    style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 12 }}
                  />
                </Form.Item>
              )}
            </Form>
          </div>
        )}
      </Drawer>

      {/* 全局样式：hover 时显示任务卡片操作按钮 */}
      <style>{`
        div:hover > .task-card-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
