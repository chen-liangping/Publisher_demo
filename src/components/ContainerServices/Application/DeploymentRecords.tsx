"use client"
//公共组件，变更记录
import React, { useMemo, useState, useCallback, useRef } from 'react'
import { Card, Table, Typography, Space, Button, Tag, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

/** 部署任务状态（成功 / 失败 / 取消含子原因 / 进行中） */
export type DeployRecordStatus = 'running' | 'success' | 'failed' | 'cancelled'

// 部署分组数据类型
export interface DeployGroup {
  key: string
  groupName: string
  note: string
  services: string[] | string
  imageVersion: string
  graceful?: string
  exposePort?: number | string
}

/** 变更类型：普通部署 | 取消触发的回滚记录（方案一：单独一行） */
export type DeployTaskKind = 'deploy' | 'rollback'

// 变更记录数据类型
export interface DeployConfig {
  key: string
  image: string
  envCount: number
  cmd: string
  ports: string
  health: {
    type: string
    path: string
    port: number
    initialDelay: number
  }
  protocol: string
  mounts: number
  preStop: string
  graceful: string
  externalPort: number
  /** 部署开始时间，展示用 YYYY-MM-DD HH:mm:ss */
  deployStartedAt?: string
  /** 部署结束时间；进行中可为空 */
  deployFinishedAt?: string | null
  deployStatus?: DeployRecordStatus
  /** 取消原因：仅 deployStatus=cancelled */
  cancelReason?: 'manual' | 'timeout'
  /** 任务类型；缺省视为 deploy */
  taskKind?: DeployTaskKind
  /** 回滚记录对应的被取消部署记录 key */
  sourceDeployKey?: string
}

/** 根据探针/启动等待 initialDelay（毫秒）推算默认部署超时（秒），原型公式，服务端可替换 */
export function computeDefaultDeployTimeoutSec(health: { initialDelay: number }): number {
  const startupSec = Math.ceil(health.initialDelay / 1000)
  return Math.min(3600, Math.max(180, Math.ceil(startupSec * 1.5) + 120))
}

/** 取消部署后新增的回滚事件行（原型：立即成功；真实实现由异步任务回填） */
function createRollbackRecord(source: DeployConfig, sourceDeployKey: string, now: string): DeployConfig {
  return {
    key: `rollback-${sourceDeployKey}-${Date.now()}`,
    image: `[回滚] 恢复至部署前版本（原：${source.image}）`,
    envCount: source.envCount,
    cmd: '—',
    ports: source.ports,
    health: { ...source.health },
    protocol: source.protocol,
    mounts: source.mounts,
    preStop: source.preStop,
    graceful: source.graceful,
    externalPort: source.externalPort,
    deployStartedAt: now,
    deployFinishedAt: now,
    deployStatus: 'success',
    taskKind: 'rollback',
    sourceDeployKey
  }
}

function formatNowCn(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function renderDeployStatusTag(status?: DeployRecordStatus, cancelReason?: 'manual' | 'timeout') {
  if (!status) return <Text type="secondary">—</Text>
  if (status === 'success') {
    return (
      <Tag color="green" bordered={false} style={{ borderRadius: 9999 }}>
        成功
      </Tag>
    )
  }
  if (status === 'failed') {
    return (
      <Tag color="red" bordered={false} style={{ borderRadius: 9999 }}>
        失败
      </Tag>
    )
  }
  if (status === 'cancelled') {
    const sub = cancelReason === 'timeout' ? '超时' : cancelReason === 'manual' ? '手动' : ''
    return (
      <Tag color="default" bordered={false} style={{ borderRadius: 9999 }}>
        已取消{sub ? `（${sub}）` : ''}
      </Tag>
    )
  }
  return (
    <Tag color="blue" bordered={false} style={{ borderRadius: 9999 }}>
      部署中
    </Tag>
  )
}

interface DeploymentRecordsProps {
  deployGroups?: DeployGroup[]
  deployConfigs?: DeployConfig[]
  onCreateGroup?: () => void
  showGroupSection?: boolean
}

export default function DeploymentRecords({
  deployGroups = [],
  deployConfigs = [],
  onCreateGroup,
  showGroupSection = true
}: DeploymentRecordsProps) {
  /** 本地覆盖：部署中取消等产生真实 state 更新（原型） */
  const [rowOverrides, setRowOverrides] = useState<Record<string, Partial<DeployConfig>>>({})
  /** Ant Design 5：Modal 确认框需 hook 上下文 */
  const [modal, modalContextHolder] = Modal.useModal()
  /** 取消并回滚后追加的记录（方案一：置顶展示） */
  const [rollbackAppendRows, setRollbackAppendRows] = useState<DeployConfig[]>([])
  const rowOverridesRef = useRef(rowOverrides)
  rowOverridesRef.current = rowOverrides

  const mergedDeployConfigs = useMemo(() => {
    const mergedBase = deployConfigs.map(row => {
      const ov = rowOverrides[row.key]
      if (!ov) return row
      return { ...row, ...ov }
    })
    return [...rollbackAppendRows, ...mergedBase]
  }, [deployConfigs, rowOverrides, rollbackAppendRows])

  const handleCancelDeploy = useCallback((key: string) => {
    const now = formatNowCn()
    const base = deployConfigs.find(r => r.key === key)
    if (base) {
      const merged = { ...base, ...rowOverridesRef.current[key] } as DeployConfig
      setRollbackAppendRows(rows => [createRollbackRecord(merged, key, now), ...rows])
    }
    setRowOverrides(prev => ({
      ...prev,
      [key]: {
        deployStatus: 'cancelled',
        cancelReason: 'manual',
        deployFinishedAt: now
      }
    }))
  }, [deployConfigs])

  /** 取消前确认：回滚提示（使用 modal.confirm + contextHolder，避免静态 API 不弹层） */
  const requestCancelDeploy = useCallback(
    (key: string) => {
      modal.confirm({
        title: '确认取消',
        content: '取消将回滚至部署前状态，确认取消吗？',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          handleCancelDeploy(key)
        }
      })
    },
    [modal, handleCancelDeploy]
  )

  // 部署分组表格列配置
  const groupColumns: ColumnsType<DeployGroup> = [
    { title: '分组名称', dataIndex: 'groupName', key: 'groupName' },
    { title: '备注', dataIndex: 'note', key: 'note' },
    {
      title: '服务',
      dataIndex: 'services',
      key: 'services',
      render: (services: string[] | string) => (Array.isArray(services) ? services.join(', ') : services)
    },
    { title: '镜像版本', dataIndex: 'imageVersion', key: 'imageVersion' },
    { title: '优雅关闭', dataIndex: 'graceful', key: 'graceful' },
    { title: '暴露端口', dataIndex: 'exposePort', key: 'exposePort' },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" size="small">
            编辑
          </Button>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Space>
      )
    }
  ]

  // 变更记录表格列配置
  const deployColumns: ColumnsType<DeployConfig> = [
    { title: '镜像', dataIndex: 'image', key: 'image', width: 220, ellipsis: true },
    {
      title: '类型',
      key: 'taskKind',
      width: 90,
      render: (_: unknown, r: DeployConfig) =>
        r.taskKind === 'rollback' ? (
          <Tag color="purple" bordered={false} style={{ borderRadius: 9999 }}>
            回滚
          </Tag>
        ) : (
          <Tag color="default" bordered={false} style={{ borderRadius: 9999 }}>
            部署
          </Tag>
        )
    },
    {
      title: '部署开始时间',
      dataIndex: 'deployStartedAt',
      key: 'deployStartedAt',
      width: 168,
      render: (t: string | undefined) => t ?? '—'
    },
    {
      title: '部署结束时间',
      dataIndex: 'deployFinishedAt',
      key: 'deployFinishedAt',
      width: 168,
      render: (t: string | null | undefined, record: DeployConfig) => {
        if (record.deployStatus === 'running') return <Text type="secondary">—</Text>
        return t ?? '—'
      }
    },
    {
      title: '部署状态',
      key: 'deployStatus',
      width: 120,
      render: (_: unknown, record: DeployConfig) => renderDeployStatusTag(record.deployStatus, record.cancelReason)
    },
    { title: '环境变量', dataIndex: 'envCount', key: 'envCount', width: 88 },
    { title: '启动命令', dataIndex: 'cmd', key: 'cmd', ellipsis: true },
    { title: '端口', dataIndex: 'ports', key: 'ports', width: 72 },
    { title: '协议', dataIndex: 'protocol', key: 'protocol', width: 72 },
    { title: '挂载数', dataIndex: 'mounts', key: 'mounts', width: 72 },
    { title: '优雅关闭', dataIndex: 'graceful', key: 'graceful', width: 88 },
    { title: '外部端口', dataIndex: 'externalPort', key: 'externalPort', width: 88 },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_: unknown, record: DeployConfig) => {
        const st = record.deployStatus
        const showCancel = st === 'running' || st === 'failed'
        return (
          <Space wrap>
            {showCancel && (
              <Button type="link" size="small" danger onClick={() => requestCancelDeploy(record.key)}>
                取消
              </Button>
            )}
            <Button type="link" size="small">
              查看详情
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <>
      {modalContextHolder}
      <div>
      {showGroupSection && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              配置
            </Title>
            <Space>
              <Button type="primary" onClick={onCreateGroup}>
                新建分组
              </Button>
            </Space>
          </div>
          <div style={{ marginTop: 8 }}>
            <Card>
              <Table columns={groupColumns} dataSource={deployGroups} pagination={false} size="small" />
            </Card>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <Title level={4}>变更记录</Title>
        <Card>
          <Table
            columns={deployColumns}
            dataSource={mergedDeployConfigs}
            pagination={false}
            size="small"
            scroll={{ x: 1720 }}
            rowKey="key"
          />
        </Card>
      </div>
    </div>
    </>
  )
}
