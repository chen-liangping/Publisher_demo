'use client'

import React, { useState } from 'react'
import { Table, Button, Input, Typography, Tag, Space, Modal, message } from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  SearchOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

/* ==============================
   类型定义
   ============================== */

/** 部署计划中的一个应用节点 */
interface PlanApp {
  id: string
  name: string
  tag: string
  group?: string
  status: 'pending' | 'running' | 'success' | 'cancelled' | 'failed'
}

/** 部署计划中的一个阶段，组内并行 */
interface PlanStage {
  id: string
  apps: PlanApp[]
}

/** 部署计划 */
export interface DeployPlanRecord {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'cancelled' | 'failed'
  deployType: string
  currentNode: string
  startTime: string
  endTime: string
  /** 部署详情描述 */
  detail: string
  /** 部署模式 */
  mode: string
  /** 阶段列表 */
  stages: PlanStage[]
}

/* ==============================
   Mock 数据
   ============================== */

const tagColor = (t: string) => {
  if (t === '游服') return '#fa8c16'
  if (t === '平台') return '#1677ff'
  if (t === '测试') return '#722ed1'
  return '#8c8c8c'
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待执行', color: '#8c8c8c' },
  running: { text: '执行中', color: '#1677ff' },
  success: { text: '执行完成', color: '#52c41a' },
  cancelled: { text: '已取消', color: '#8c8c8c' },
  failed: { text: '执行失败', color: '#ff4d4f' }
}

const initialPlans: DeployPlanRecord[] = [
  {
    id: 'plan-1',
    name: '游服测试1',
    status: 'pending',
    deployType: '更新',
    currentNode: '-',
    startTime: '2025-07-17 10:45:53',
    endTime: '2025-07-17 10:45:53',
    detail: '统一更新镜像版本',
    mode: '混合模式',
    stages: [
      {
        id: 's1',
        apps: [
          { id: 'a1', name: 'gamedemo', tag: '游服', group: '2-3', status: 'pending' },
          { id: 'a2', name: 'gamedemo', tag: '游服', group: '默认', status: 'pending' },
          { id: 'a3', name: 'xcroncloud', tag: '平台', status: 'pending' },
          { id: 'a4', name: 'xcron1', tag: '平台', status: 'pending' },
          { id: 'a5', name: 'xcron-test', tag: '测试', status: 'pending' },
          { id: 'a6', name: 'testapp', tag: '测试', status: 'pending' }
        ]
      },
      {
        id: 's2',
        apps: [
          { id: 'a7', name: 'open-platform', tag: '平台', status: 'pending' },
          { id: 'a8', name: 'java-platform', tag: '平台', status: 'pending' }
        ]
      }
    ]
  },
  {
    id: 'plan-2',
    name: '游服测试2',
    status: 'cancelled',
    deployType: '更新',
    currentNode: 'open-platform',
    startTime: '2025-07-17 10:45:53',
    endTime: '2025-07-17 10:45:53',
    detail: '灰度更新',
    mode: '串行模式',
    stages: [
      {
        id: 's1',
        apps: [
          { id: 'a1', name: 'open-platform', tag: '平台', status: 'cancelled' }
        ]
      }
    ]
  },
  {
    id: 'plan-3',
    name: '游服测试3',
    status: 'success',
    deployType: '更新',
    currentNode: 'gameserver',
    startTime: '2025-07-17 10:45:53',
    endTime: '2025-07-17 10:45:53',
    detail: '全量更新',
    mode: '并行模式',
    stages: [
      {
        id: 's1',
        apps: [
          { id: 'a1', name: 'gameserver', tag: '游服', status: 'success' },
          { id: 'a2', name: 'xcron-cloud', tag: '平台', status: 'success' }
        ]
      }
    ]
  },
  {
    id: 'plan-4',
    name: '游服测试4',
    status: 'failed',
    deployType: '更新',
    currentNode: 'gameserver',
    startTime: '2025-07-17 10:45:53',
    endTime: '2025-07-17 10:45:53',
    detail: '紧急修复',
    mode: '混合模式',
    stages: [
      {
        id: 's1',
        apps: [
          { id: 'a1', name: 'gameserver', tag: '游服', status: 'failed' }
        ]
      }
    ]
  }
]

/* ==============================
   主组件
   ============================== */

interface DeployPlanListProps {
  /** 返回应用列表 */
  onBack: () => void
  /** 进入编辑器（新建 or 编辑已有计划） */
  onEdit: (plan?: DeployPlanRecord) => void
}

export default function DeployPlanList({ onBack, onEdit }: DeployPlanListProps) {
  const [plans, setPlans] = useState<DeployPlanRecord[]>(initialPlans)
  const [searchText, setSearchText] = useState('')

  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  )

  /* ---- 操作 ---- */

  // 执行部署计划：将状态改为 running，3 秒后改为 success
  const handleRun = (planId: string) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'running' as const, currentNode: p.stages[0]?.apps[0]?.name || '-' } : p))
    message.success('部署计划已开始执行')
    setTimeout(() => {
      setPlans(prev => prev.map(p => p.id === planId ? {
        ...p,
        status: 'success' as const,
        stages: p.stages.map(s => ({ ...s, apps: s.apps.map(a => ({ ...a, status: 'success' as const })) }))
      } : p))
      message.success('部署计划执行完成')
    }, 3000)
  }

  // 重启失败的计划
  const handleRestart = (planId: string) => {
    setPlans(prev => prev.map(p => p.id === planId ? {
      ...p,
      status: 'running' as const,
      stages: p.stages.map(s => ({ ...s, apps: s.apps.map(a => ({ ...a, status: 'pending' as const })) }))
    } : p))
    message.success('正在重新执行部署计划')
    setTimeout(() => {
      setPlans(prev => prev.map(p => p.id === planId ? {
        ...p,
        status: 'success' as const,
        stages: p.stages.map(s => ({ ...s, apps: s.apps.map(a => ({ ...a, status: 'success' as const })) }))
      } : p))
      message.success('部署计划执行完成')
    }, 3000)
  }

  // 删除部署计划
  const handleDelete = (planId: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '删除后无法恢复，是否继续？',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setPlans(prev => prev.filter(p => p.id !== planId))
        message.success('已删除')
      }
    })
  }

  /* ---- 展开行：阶段可视化 ---- */

  const renderExpandedRow = (record: DeployPlanRecord) => (
    <div style={{ padding: '8px 0 8px 48px' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 32 }}>
        <div><Text type="secondary">部署详情</Text>&nbsp;&nbsp;<Text>{record.detail}</Text></div>
        <div><Text type="secondary">部署模式</Text>&nbsp;&nbsp;<Text>{record.mode}</Text></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {record.stages.map((stage, idx) => (
          <div key={stage.id}>
            {/* 阶段标题 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#f0f0f0', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: '#595959'
              }}>
                {idx + 1}
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>组内并行</Text>
            </div>

            {/* 应用卡片网格 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingLeft: 32 }}>
              {stage.apps.map(app => {
                const st = statusMap[app.status] || statusMap.pending
                return (
                  <div
                    key={app.id}
                    style={{
                      width: 200,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      background: '#fff',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontWeight: 600, fontSize: 13 }}>
                        {app.name}
                        {app.group && <Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>（分组: {app.group}）</Text>}
                      </Text>
                      <Tag
                        color={tagColor(app.tag)}
                        style={{ borderRadius: 999, border: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
                      >
                        {app.tag}
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: st.color, display: 'inline-block'
                      }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{st.text}</Text>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  /* ---- 表格列 ---- */

  const columns: ColumnsType<DeployPlanRecord> = [
    {
      title: '部署计划名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (text: string, record: DeployPlanRecord) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={() => onEdit(record)}
        >
          {text}
        </Button>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const st = statusMap[status] || statusMap.pending
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
            <Text style={{ color: st.color }}>{st.text}</Text>
          </div>
        )
      }
    },
    {
      title: '部署类型',
      dataIndex: 'deployType',
      key: 'deployType',
      width: 100
    },
    {
      title: '当前执行节点',
      dataIndex: 'currentNode',
      key: 'currentNode',
      width: 140
    },
    {
      title: '开始时间（BJT）',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160
    },
    {
      title: '结束时间（BJT）',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: DeployPlanRecord) => (
        <Space>
          {/* 待执行/已取消 → 执行；执行失败 → 重启；执行完成/执行中 → 无执行按钮 */}
          {(record.status === 'pending' || record.status === 'cancelled') && (
            <Button type="link" style={{ padding: 0 }} onClick={() => handleRun(record.id)}>执行</Button>
          )}
          {record.status === 'failed' && (
            <Button type="link" style={{ padding: 0 }} onClick={() => handleRestart(record.id)}>重启</Button>
          )}
          <Button type="link" style={{ padding: 0 }} onClick={() => onEdit(record)}>编辑</Button>
          <Button type="link" danger style={{ padding: 0 }} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  /* ============================== */

  return (
    <div style={{ padding: '24px' }}>
      {/* 返回应用 */}
      <div style={{ marginBottom: 16 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ padding: 0, color: '#595959', fontSize: 14 }}>
          返回应用
        </Button>
      </div>

      {/* 标题 + 搜索 + 新建 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>部署计划</Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input
            placeholder="请输入部署计划名称"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onEdit()}>
            添加部署计划
          </Button>
        </div>
      </div>

      {/* 列表 */}
      <Table
        columns={columns}
        dataSource={filteredPlans}
        rowKey="id"
        expandable={{
          expandedRowRender: renderExpandedRow,
          rowExpandable: () => true
        }}
        pagination={false}
        scroll={{ x: 1000 }}
        style={{ background: '#fff', borderRadius: 8 }}
      />
    </div>
  )
}
