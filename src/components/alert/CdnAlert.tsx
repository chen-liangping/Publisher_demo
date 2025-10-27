'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, Space, Table, Tag, Typography, message, Tooltip, Button } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { CDN_DEFAULT_PAGINATION } from '../Common/GlobalPagination'

const { Title } = Typography

interface CdnRow {
  id: string
  uri: string
  status: string  // HTTP状态码：403、404、200等
  count: number
}

// HTTP状态码错误映射
const ERROR_CODE_MAPPING: Record<string, string> = {
  '400': '请求无效，请检查参数或路径格式。',
  '401': '未授权访问，请确认访问凭证是否有效。',
  '403': '检测到请求的文件不存在或路径错误，请确认文件是否已上传。',
  '404': '请求的资源未找到，请检查URL路径是否正确。',
  '500': '服务器内部错误，请稍后重试或联系技术支持。',
  '502': '网关错误，上游服务器响应无效。',
  '503': '服务暂时不可用，请稍后重试。'
}

// 模拟CDN告警数据
const mockCdnData: CdnRow[] = [
  {
    id: '1',
    uri: 'https://cdn.example.com/assets/game-v1.2.3.zip',
    status: '403',
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
    status: '403',
    count: 6434
  },
  {
    id: '7',
    uri: 'https://cdn.example.com/fonts/game-font.woff2',
    status: '403',
    count: 123
  },
  {
    id: '8',
    uri: 'https://cdn.example.com/data/user-profiles.json',
    status: '403',
    count: 50
  }
]

export default function CdnAlert(): React.ReactElement {
  const [messageApi, contextHolder] = message.useMessage()
  const [scanTime, setScanTime] = useState<string>('')

  // 复制URI到剪贴板
  const handleCopyUri = (uri: string): void => {
    navigator.clipboard.writeText(uri).then(() => {
      messageApi.success('URI已复制到剪贴板')
    }).catch(() => {
      messageApi.error('复制失败，请手动复制')
    })
  }

  // 在客户端设置扫描时间，避免SSR水合错误
  useEffect(() => {
    setScanTime(new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }))
  }, [])

  const cdnColumns: ColumnsType<CdnRow> = useMemo(() => [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
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
        
        // 获取错误提示信息
        const errorMessage = ERROR_CODE_MAPPING[status]
        
        return errorMessage ? (
          <Tooltip title={errorMessage} placement="topLeft">
            <Tag bordered={false} color={getStatusColor(status)} style={{ cursor: 'help' }}>
              {status}
            </Tag>
          </Tooltip>
        ) : (
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
      width: 350,
      ellipsis: true,
      render: (uri: string) => (
        <Space>
          <Typography.Link href={uri} target="_blank" rel="noopener noreferrer" style={{ maxWidth: 280, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uri}
          </Typography.Link>
          {/* 复制URI图标 */}
          <Tooltip title="复制URI">
            <Button 
              type="text" 
              size="small" 
              icon={<CopyOutlined />} 
              onClick={() => handleCopyUri(uri)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'count',
      dataIndex: 'count',
      key: 'count',
      width: 80,
    },
    {
      title: '告警分析',
      key: 'alertAnalysis',
      width: 300,
      ellipsis: true,
      render: (_, record: CdnRow) => {
        const errorMessage = ERROR_CODE_MAPPING[record.status]
        return errorMessage ? (
          <Typography.Text style={{ color: '#ff4d4f' }}>
            {errorMessage}
          </Typography.Text>
        ) : (
          <Typography.Text style={{ color: '#999' }}>
            -
          </Typography.Text>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record: CdnRow) => (
        <Space>
          <Typography.Link onClick={() => {
            messageApi.success(`已发起重新扫描：${record.uri}`)
          }}>
            重新扫描
          </Typography.Link>
          <Typography.Link onClick={() => {
            messageApi.success(`已忽略告警：${record.uri}`)
          }}>
            忽略
          </Typography.Link>
        </Space>
      )
    }
  ], [messageApi, handleCopyUri])

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
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
            {scanTime || '--'}
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
