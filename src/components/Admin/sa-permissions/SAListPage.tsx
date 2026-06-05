'use client'

import React, { useState } from 'react'
import { Table, Button, Input, Typography, Space, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, EyeOutlined, CheckOutlined, MinusOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

// 模拟数据
const mockData = [
  {
    key: 'dragon',
    appId: 'dragon',
    serviceAccount: 'publisher-dragon-sa',
    hasPermission: true,
    updatedAt: '2026-06-03 14:20:00',
    updatedBy: 'a@example.com'
  },
  {
    key: 'hotd',
    appId: 'hotd',
    serviceAccount: 'publisher-hotd-sa',
    hasPermission: true,
    updatedAt: '2026-06-02 10:15:00',
    updatedBy: 'b@example.com'
  },
  {
    key: 'doraemon',
    appId: 'doraemon',
    serviceAccount: 'publisher-doraemon-sa',
    hasPermission: false,
    updatedAt: '2026-06-01 09:30:00',
    updatedBy: 'c@example.com'
  },
  {
    key: 'kakegurui',
    appId: 'kakegurui',
    serviceAccount: 'publisher-kakegurui-sa',
    hasPermission: false,
    updatedAt: '2026-05-28 16:45:00',
    updatedBy: 'a@example.com'
  }
]

type SARecord = {
  key: string
  appId: string
  serviceAccount: string
  hasPermission: boolean
  updatedAt: string
  updatedBy: string
}

interface SAListPageProps {
  onViewDetail: (appId: string) => void
}

export default function SAListPage({ onViewDetail }: SAListPageProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [dataSource] = useState<SARecord[]>(mockData)

  const filteredData = dataSource.filter(
    (item) =>
      item.appId.toLowerCase().includes(searchText.toLowerCase()) ||
      item.serviceAccount.toLowerCase().includes(searchText.toLowerCase())
  )

  const columns: ColumnsType<SARecord> = [
    {
      title: 'App ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 200,
      render: (appId: string) => (
        <Space>
          <Text strong>{appId}</Text>
        </Space>
      )
    },
    {
      title: 'ServiceAccount',
      dataIndex: 'serviceAccount',
      key: 'serviceAccount',
      render: (sa: string) => <Text code>{sa}</Text>
    },
    {
      title: '权限状态',
      dataIndex: 'hasPermission',
      key: 'hasPermission',
      width: 100,
      render: (hasPermission: boolean) => (
        <Tooltip title={hasPermission ? '已配置权限' : '无权限（默认）'}>
          {hasPermission ? (
            <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          ) : (
            <MinusOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
          )}
        </Tooltip>
      )
    },
    {
      title: '最后修改时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180
    },
    {
      title: '修改人',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      width: 180
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(record.appId)}
        >
          查看
        </Button>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Kubernetes ServiceAccount 权限管理
        </Title>
        <Text type="secondary">统一管理应用访问 Kubernetes API 的权限</Text>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索 App ID 或 ServiceAccount"
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
      />
    </div>
  )
}
