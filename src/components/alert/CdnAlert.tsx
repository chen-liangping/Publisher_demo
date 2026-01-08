'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, Space, Table, Tag, Typography, message, Tooltip, Button, Tabs, Drawer, Empty, Descriptions, Switch, Steps, Alert } from 'antd'
import { CopyOutlined, UnorderedListOutlined, DeleteOutlined, CloseCircleOutlined, CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, ExportOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TabsProps } from 'antd'
import { CDN_DEFAULT_PAGINATION } from '../Common/GlobalPagination'

const { Title, Text } = Typography

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
    uri: '/2.1.0/assets/game-v1.2.3.json',
    status: '403',
    count: 1121213
  },
  {
    id: '2',
    uri: '/2.1.0/configs/server-config.json',
    status: '403',
    count: 221212
  },
  {
    id: '3',
    uri: '/2.1.0/images/ui-sprites.png',
    status: '403',
    count: 321
  },
  {
    id: '4',
    uri: '/2.2.0/audio/background-music.json',
    status: '403',
    count: 4231
  },
  {
    id: '5',
    uri: '/2.2.0/scripts/game-logic.js',
    status: '403',
    count: 546
  },
  {
    id: '6',
    uri: '/2.2.0/api/health-check.json',
    status: '403',
    count: 6434
  },
  {
    id: '7',
    uri: '/2.2.0/fonts/game-font.json',
    status: '403',
    count: 123
  },
  {
    id: '8',
    uri: '/configs/user-profiles.json',
    status: '403',
    count: 50
  }
]

export default function CdnAlert(): React.ReactElement {
  const [messageApi, contextHolder] = message.useMessage()
  const [scanTime, setScanTime] = useState<string>('')
  const [faroConfigOpen, setFaroConfigOpen] = useState<boolean>(false)
  
  // 忽略列表抽屉状态
  const [ignoreDrawerOpen, setIgnoreDrawerOpen] = useState<boolean>(false)
  
  // 忽略的URI列表
  const [ignoredUris, setIgnoredUris] = useState<CdnRow[]>([])
  
  // 当前活跃的CDN数据（排除已忽略的）
  const activeCdnData = useMemo(() => {
    const ignoredUriSet = new Set(ignoredUris.map(item => item.uri))
    return mockCdnData.filter(item => !ignoredUriSet.has(item.uri))
  }, [ignoredUris])

  // 复制URI到剪贴板
  const handleCopyUri = (uri: string): void => {
    navigator.clipboard.writeText(uri).then(() => {
      messageApi.success('URI已复制到剪贴板')
    }).catch(() => {
      messageApi.error('复制失败，请手动复制')
    })
  }

  // 忽略告警 - 将URI添加到忽略列表
  const handleIgnoreAlert = (record: CdnRow): void => {
    setIgnoredUris(prev => [...prev, record])
    messageApi.success(`已忽略告警：${record.uri}`)
  }

  // 从忽略列表移除
  const handleRemoveFromIgnoreList = (record: CdnRow): void => {
    setIgnoredUris(prev => prev.filter(item => item.id !== record.id))
    messageApi.success(`已从忽略列表移除：${record.uri}`)
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

  // Faro 初始化代码示例字符串（仅用于展示与复制）
  const faroInitCode = `import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: 'https://faro-collector-prod-ap-southeast-0.grafana.net/collect/g123743be98abaec9cc8a3bb074ae188',
  app: {
    name: 'gametest',
    version: '1.0.0',
    environment: 'staging', // 可手动更改至正式或测试环境
  },
  instrumentations: [
    // Mandatory, omits default instrumentations otherwise.
    ...getWebInstrumentations(),
    // Tracing package to get end-to-end visibility for HTTP requests.
    new TracingInstrumentation(),
  ],
});`

  // CDN告警表格列定义
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
          <Typography.Link onClick={() => handleIgnoreAlert(record)}>
            忽略
          </Typography.Link>
        </Space>
      )
    }
  ], [messageApi])

  // 忽略列表表格列定义
  const ignoreListColumns: ColumnsType<CdnRow> = useMemo(() => [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const getStatusColor = (code: string): string => {
          const statusCode = parseInt(code)
          if (statusCode >= 200 && statusCode < 300) return 'green'
          if (statusCode >= 300 && statusCode < 400) return 'blue'
          if (statusCode >= 400 && statusCode < 500) return 'orange'
          if (statusCode >= 500) return 'red'
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
        <Tooltip title={uri}>
          <Text ellipsis>{uri}</Text>
        </Tooltip>
      )
    },
    {
      title: 'count',
      dataIndex: 'count',
      key: 'count',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record: CdnRow) => (
        <Tooltip title="从忽略列表移除">
          <Button 
            type="text" 
            danger
            icon={<DeleteOutlined />} 
            onClick={() => handleRemoveFromIgnoreList(record)}
          />
        </Tooltip>
      )
    }
  ], [])

  // CDN告警Tab内容
  const tabItems: TabsProps['items'] = [
    {
      key: 'cdn',
      label: 'CDN 告警',
      children: (
        <Card 
          title={<span style={{ fontSize: 16 }}>告警资源列表</span>} 
          styles={{ body: { paddingTop: 8 } }}
          extra={
            <Space>
              <Button 
                icon={<UnorderedListOutlined />}
                onClick={() => setIgnoreDrawerOpen(true)}
              >
                忽略列表 ({ignoredUris.length})
              </Button>
            </Space>
          }
        >
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
            dataSource={activeCdnData}
            pagination={CDN_DEFAULT_PAGINATION}
          />
        </Card>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      {/* 顶部说明卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 2, paddingBottom: 2 }}>
        <Title level={1} style={{ marginBottom: 4, fontSize: 22 }}>
        客户端告警
          </Title>
          <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
            客户端告警用于实时监控CDN异常，支持快速定位问题，提升响应与修复效率。
          </Text>
        </div>
      </Card>

      {/* Faro Dashboard 前端可观测卡片 */}
      <Card
        style={{ marginBottom: 24, borderRadius: 12, padding: 0, overflow: 'hidden' }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            backgroundImage: 'url(/assets/faro-dashboard.png)',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            position: 'relative'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(0deg, white 35%, rgba(255, 255, 255, 0.3) 100%)',
              padding: '200px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <Text strong style={{ fontSize: 16 }}>
              Faro Dashboard 前端可观测
            </Text>
            <Text type="secondary" style={{ maxWidth: 520 }}>
              Faro 是 Grafana 的前端可观测性工具，配置完成后可在 Grafana Dashboard 查看并实时监控游戏内的前端性能、错误及用户行为。
            </Text>
            <Space size={16} style={{ marginTop: 8 }}>
              <Button
                icon={<ExportOutlined />}
                type="default"
                onClick={() => window.open('https://publisher.grafana.net/', '_blank')}
              >
                前往面板
              </Button>
              <Button type="text" onClick={() => setFaroConfigOpen(true)}>
                查看配置
              </Button>
            </Space>
          </div>
        </div>
      </Card>
      
      {/* Tabs展示CDN告警和前端监控 */}
      <Tabs 
        defaultActiveKey="cdn" 
        items={tabItems}
        size="large"
      />

      {/* 忽略列表抽屉 */}
      <Drawer
        title="忽略列表"
        placement="right"
        width={720}
        open={ignoreDrawerOpen}
        onClose={() => setIgnoreDrawerOpen(false)}
        footer={
          <div style={{ textAlign: 'left' }}>
            <Button onClick={() => setIgnoreDrawerOpen(false)}>
              关闭
            </Button>
          </div>
        }
      >
        {ignoredUris.length === 0 ? (
          <Empty description="暂无忽略的告警" />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                已忽略 {ignoredUris.length} 个告警，这些告警不会在主列表中显示
              </Text>
            </div>
            <Table<CdnRow>
              rowKey="id"
              columns={ignoreListColumns}
              dataSource={ignoredUris}
              pagination={{ pageSize: 10 }}
            />
          </>
        )}
      </Drawer>

      {/* Faro 配置说明 Drawer */}
      <Drawer
        title="配置Faro Dashboard"
        width={720}
        open={faroConfigOpen}
        onClose={() => setFaroConfigOpen(false)}
        footer={
          <div style={{ textAlign: 'left' }}>
            <Button onClick={() => setFaroConfigOpen(false)}>
              关闭
            </Button>
          </div>
        }
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* 打开监控面板 */}
          <div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>打开监控面板</Text>
              <Text type="secondary">
                确认 Grafana 监控面板可以正常访问后，再进行后续步骤
              </Text>
              <Space style={{ marginTop: 4 }} size={16}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 13,
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    https://publisher.grafana.net/
                  </div>
                </div>
                <Button
                  type="primary"
                  onClick={() => window.open('https://publisher.grafana.net/', '_blank')}
                  style={{ height: 38 }}
                >
                  打开面板
                </Button>
              </Space>
            </Space>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.06)',
              marginTop: 4,
              paddingTop: 4
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              请参考以下步骤进行配置
            </Text>
          </div>

          {/* 第一步：安装依赖包 */}
          <div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>第1步：安装步骤包</Text>
              <Text type="secondary">安装 Faro Web SDK 核心包</Text>
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                  position: 'relative',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>npm install @grafana/faro-web-sdk</span>
                <Button
                  size="small"
                  type="default"
                  icon={<CopyOutlined />}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    backgroundColor: '#fff'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText('npm install @grafana/faro-web-sdk')
                    messageApi.success('命令已复制')
                  }}
                >
                  copy
                </Button>
              </div>

              <Text type="secondary">安装 Faro 链路追踪包</Text>
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                  position: 'relative',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>npm install @grafana/faro-web-tracing</span>
                <Button
                  size="small"
                  type="default"
                  icon={<CopyOutlined />}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    backgroundColor: '#fff'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText('npm install @grafana/faro-web-tracing')
                    messageApi.success('命令已复制')
                  }}
                >
                  copy
                </Button>
              </div>
            </Space>
          </div>

          {/* 第二步：初始化 Faro */}
          <div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>第2步：在项目中初始化 Faro</Text>
              <Text type="secondary">
                在你的应用入口文件（如 app.tsx 或 main.tsx）中添加以下代码
              </Text>
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 13,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                  position: 'relative',
                  overflowX: 'auto'
                }}
              >
                <Button
                  size="small"
                  type="default"
                  icon={<CopyOutlined />}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    backgroundColor: '#fff'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(faroInitCode)
                    messageApi.success('代码已复制')
                  }}
                >
                  copy
                </Button>
                <pre style={{ margin: 0, whiteSpace: 'pre' }}>
                  {faroInitCode}
                </pre>
              </div>
            </Space>
          </div>
        </Space>
      </Drawer>
    </div>
  )
}
