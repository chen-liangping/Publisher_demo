'use client'

import React, { useState } from 'react'
import { Table, Button, Input, Typography, Space, Tooltip, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

// 同步状态类型：synced 已同步 / syncing 同步中 / failed 同步失败 / unsynced 未配置 / orphan 错误资源
type SyncStatus = 'synced' | 'syncing' | 'failed' | 'unsynced' | 'orphan'

// 模拟数据
const mockData = [
  {
    key: 'dragon',
    appId: 'dragon',
    hasPermission: true,
    updatedAt: '2026-06-03 14:20:00',
    updatedBy: 'chen.lp@ctw.inc',
    stgSyncStatus: 'synced' as SyncStatus,
    prodSyncStatus: 'unsynced' as SyncStatus
  },
  {
    key: 'hotd',
    appId: 'hotd',
    hasPermission: true,
    updatedAt: '2026-06-02 10:15:00',
    updatedBy: 'lin.y@ctw.inc',
    stgSyncStatus: 'synced' as SyncStatus,
    prodSyncStatus: 'synced' as SyncStatus
  },
  {
    key: 'doraemon',
    appId: 'doraemon',
    hasPermission: false,
    updatedAt: '2026-06-01 09:30:00',
    updatedBy: 'yu.t@ctw.inc',
    stgSyncStatus: 'syncing' as SyncStatus,
    prodSyncStatus: 'unsynced' as SyncStatus
  },
  {
    key: 'kakegurui',
    appId: 'kakegurui',
    hasPermission: false,
    updatedAt: '2026-05-28 16:45:00',
    updatedBy: 'wu.yuni@ctw.inc',
    stgSyncStatus: 'failed' as SyncStatus,
    prodSyncStatus: 'unsynced' as SyncStatus
  },
  {
    key: 'shinchan',
    appId: 'shinchan',
    hasPermission: true,
    updatedAt: '2026-05-20 11:30:00',
    updatedBy: 'chen.lp@ctw.inc',
    stgSyncStatus: 'synced' as SyncStatus,
    prodSyncStatus: 'syncing' as SyncStatus
  },
  {
    key: 'kabaneri',
    appId: 'kabaneri',
    hasPermission: false,
    updatedAt: '-',
    updatedBy: '-',
    stgSyncStatus: 'orphan' as SyncStatus,
    prodSyncStatus: 'unsynced' as SyncStatus
  }
]

type SARecord = {
  key: string
  appId: string
  hasPermission: boolean
  updatedAt: string
  updatedBy: string
  stgSyncStatus: SyncStatus
  prodSyncStatus: SyncStatus
}

// 同步状态渲染：重试按钮在状态旁边，不单独放操作列
const renderSyncStatus = (status: SyncStatus, appId: string, onRetry: (appId: string) => void) => {
  if (status === 'synced') {
    return (
      <Tooltip title="已同步">
        <Space size={4}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#52c41a' }} />
          <Text style={{ color: '#52c41a', fontSize: 12 }}>已同步</Text>
        </Space>
      </Tooltip>
    )
  }

  if (status === 'syncing') {
    return (
      <Tooltip title="同步中">
        <Space size={4}>
          <SyncOutlined spin style={{ color: '#1677ff', fontSize: 14 }} />
          <Text style={{ color: '#1677ff', fontSize: 12 }}>同步中</Text>
        </Space>
      </Tooltip>
    )
  }

  if (status === 'failed') {
    return (
      <Space size={4} align="center">
        <Tooltip title="同步失败，点击重试">
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
        </Tooltip>
        <Text style={{ color: '#ff4d4f', fontSize: 12 }}>同步失败</Text>
        {/* 重试按钮紧跟在状态旁边 */}
        <Tooltip title="重试同步">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            style={{ padding: '0 2px', color: '#ff4d4f', fontSize: 12 }}
            onClick={() => onRetry(appId)}
          />
        </Tooltip>
      </Space>
    )
  }

  if (status === 'orphan') {
    return (
      <Tooltip title="DB 无配置 + K8s 有遗留 Role/RoleBinding">
        <Space size={4}>
          <WarningOutlined style={{ color: '#faad14', fontSize: 14 }} />
          <Text style={{ color: '#faad14', fontSize: 12 }}>错误资源</Text>
        </Space>
      </Tooltip>
    )
  }

  // unsynced
  return (
    <Tooltip title="无配置">
      <Space size={4}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#d9d9d9' }} />
        <Text style={{ color: '#d9d9d9', fontSize: 12 }}>无配置</Text>
      </Space>
    </Tooltip>
  )
}

interface SAListPageProps {
  onViewDetail: (appId: string) => void
}

export default function SAListPage({ onViewDetail }: SAListPageProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [dataSource] = useState<SARecord[]>(mockData)

  const filteredData = dataSource.filter(
    (item) => item.appId.toLowerCase().includes(searchText.toLowerCase())
  )

  // 重试同步操作：模拟调用后端重试 API
  const handleRetry = (appId: string) => {
    message.loading({ content: `${appId} 正在重试同步...`, key: appId })
    setTimeout(() => {
      message.success({ content: `${appId} 同步重试成功`, key: appId })
    }, 2000)
  }

  const columns: ColumnsType<SARecord> = [
    {
      title: 'App ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 180,
      render: (appId: string) => (
        // 点击 App ID 进入详情页
        <Button type="link" style={{ padding: 0 }} onClick={() => onViewDetail(appId)}>
          {appId}
        </Button>
      )
    },
    {
      title: 'STG 同步状态',
      dataIndex: 'stgSyncStatus',
      key: 'stgSyncStatus',
      width: 180,
      render: (status: SyncStatus, record) => renderSyncStatus(status, record.appId, handleRetry)
    },
    {
      title: 'PROD 同步状态',
      dataIndex: 'prodSyncStatus',
      key: 'prodSyncStatus',
      width: 180,
      render: (status: SyncStatus, record) => renderSyncStatus(status, record.appId, handleRetry)
    },
    {
      title: '最后修改时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170
    },
    {
      title: '修改人',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      width: 170
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          K8s 权限管理
        </Title>
        <Text type="secondary">统一管理应用访问 Kubernetes API 的 RBAC 权限</Text>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索 App ID"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400 }}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        bordered={false}
        size="small"
        scroll={{ x: 900 }}
      />
    </div>
  )
}
