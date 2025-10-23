'use client'

import React, { useMemo } from 'react'
import { Card, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CDN_DEFAULT_PAGINATION } from '../Common/GlobalPagination'

const { Title } = Typography

interface CdnRow {
  id: string
  uri: string
  status: string  // HTTP状态码：403、404、200等
  count: number
}

// 模拟CDN告警数据
const mockCdnData: CdnRow[] = [
  {
    id: '1',
    uri: 'https://cdn.example.com/assets/game-v1.2.3.zip',
    status: '404',
    count: 1121213
  },
  {
    id: '2',
    uri: 'https://cdn.example.com/configs/server-config.json',
    status: '403',
    count: 221212
  },
  {
    id: '3',
    uri: 'https://cdn.example.com/images/ui-sprites.png',
    status: '403',
    count: 321
  },
  {
    id: '4',
    uri: 'https://cdn.example.com/audio/background-music.mp3',
    status: '403',
    count: 4231
  },
  {
    id: '5',
    uri: 'https://cdn.example.com/scripts/game-logic.js',
    status: '403',
    count: 546
  },
  {
    id: '6',
    uri: 'https://cdn.example.com/api/health-check',
    status: '404',
    count: 6434
  }
]

export default function CdnAlert(): React.ReactElement {
  const cdnColumns: ColumnsType<CdnRow> = useMemo(() => [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        // 根据HTTP状态码返回不同颜色
        const getStatusColor = (code: string): string => {
          const statusCode = parseInt(code)
          if (statusCode >= 200 && statusCode < 300) return 'green'  // 2xx 成功
          if (statusCode >= 300 && statusCode < 400) return 'blue'   // 3xx 重定向
          if (statusCode >= 400 && statusCode < 500) return 'orange' // 4xx 客户端错误
          if (statusCode >= 500) return 'red'                        // 5xx 服务器错误
          return 'default'
        }
        
        return (
          <Tag bordered={false} color={getStatusColor(status)}>
            {status}
          </Tag>
        )
      }
    },
    {
      title: 'URI',
      dataIndex: 'uri',
      key: 'uri',
      ellipsis: true,
      render: (uri: string) => (
        <Typography.Link href={uri} target="_blank" rel="noopener noreferrer">
          {uri}
        </Typography.Link>
      )
    },
    {
      title: 'count',
      dataIndex: 'count',
      key: 'count',
    },

    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record: CdnRow) => (
        <Space>
          <Typography.Link onClick={() => message.success(`已发起重新扫描：${record.uri}`)}>
            重新扫描
          </Typography.Link>
          <Typography.Link onClick={() => message.success(`已忽略告警：${record.uri}`)}>
            忽略
          </Typography.Link>
        </Space>
      )
    }
  ], [])

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>CDN告警</Title>
        <div style={{ 
          fontSize: '14px', 
          color: '#666', 
          lineHeight: '1.5'
        }}>
          CDN告警用于实时查看CDN异常告警及错误资源，支持快速定位问题，提升响应与修复效率。
        </div>
      </div>
      
      {/* CDN告警Card */}
      <Card title={<span style={{ fontSize: 16 }}>告警资源列表</span>} styles={{ body: { paddingTop: 8 } }}>
        {/* 扫描时间显示 */}
        <div style={{ 
          marginBottom: 16,
          padding: '8px 16px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          <span>最后扫描时间：</span>
          <span style={{ fontFamily: 'Monaco, monospace', color: '#333' }}>
            {new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </span>
        </div>
        
        <Table<CdnRow>
          rowKey="id"
          columns={cdnColumns}
          dataSource={mockCdnData}
          pagination={CDN_DEFAULT_PAGINATION}
        />
      </Card>
    </div>
  )
}
