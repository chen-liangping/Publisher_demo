'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, Space, Table, Tag, Typography, message, Tooltip, Button, Tabs, Drawer, Empty, Descriptions, Switch, Steps, Alert } from 'antd'
import { CopyOutlined, UnorderedListOutlined, DeleteOutlined, CloseCircleOutlined, CheckCircleOutlined, SyncOutlined, ClockCircleOutlined } from '@ant-design/icons'
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

// Faro配置信息接口
interface FaroConfig {
  appName: string
  environment: string
  endpoint: string
  apiKey: string
  grafanaDashboardUrl: string
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

// 模拟Faro配置 - null表示未配置，有值表示已配置
const mockFaroConfig: FaroConfig | null = {
  appName: 'publisher-frontend',
  environment: 'production',
  endpoint: 'https://faro-collector.grafana.net/collect',
  apiKey: 'faro_****************************',
  grafanaDashboardUrl: 'https://publisher.grafana.net/d/f82bc22f-1c8e-4775-8258-kumo/kumo-resource?orgId=1&from=now-6h&to=now&timezone=browser&var-datasource=d3ebb5b5-d547-4b94-8504-87fcc7384610&var-cluster=cpp-pro-k8s&var-Metrics=edqlmrqwim41sc&var-Logs=cdqli0zszvxtsb&var-workload=adminserver'
}

export default function CdnAlert(): React.ReactElement {
  const [messageApi, contextHolder] = message.useMessage()
  const [scanTime, setScanTime] = useState<string>('')
  
  // 忽略列表抽屉状态
  const [ignoreDrawerOpen, setIgnoreDrawerOpen] = useState<boolean>(false)
  
  // 忽略的URI列表
  const [ignoredUris, setIgnoredUris] = useState<CdnRow[]>([])
  
  // 配置指导展开状态
  const [showGuideDetail, setShowGuideDetail] = useState<boolean>(false)
  
  // 监控面板显示状态（点击联系小包后显示）
  const [showMonitoringPanel, setShowMonitoringPanel] = useState<boolean>(false)
  
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
  const CdnAlertContent = (
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

  // 前端监控内容
  const FaroAlertContent = (
    <Card 
      title={<span style={{ fontSize: 16 }}>集成 Grafana Faro SDK</span>} 
      styles={{ body: { paddingTop: 8 } }}
    >
      <div style={{ marginBottom: 20 }}>
        <Text type="secondary">
          Faro 是 Grafana 的前端应用可观测性工具，可以实时监控前端性能、错误和用户行为。
        </Text>
      </div>

      {/* 监控面板链接或联系提示 */}
      {showMonitoringPanel ? (
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 15 }}>监控面板地址：</Text>
          </div>
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#f0f5ff',
            border: '2px solid #91caff',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography.Link 
              href={mockFaroConfig?.grafanaDashboardUrl}
              target="_blank"
              style={{ 
                fontSize: 14,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginRight: 12
              }}
            >
              {mockFaroConfig?.grafanaDashboardUrl}
            </Typography.Link>
            <Button 
              type="primary"
              onClick={() => window.open(mockFaroConfig?.grafanaDashboardUrl, '_blank')}
            >
              打开面板
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <Text>
            暂未开启监控服务，请
            <Typography.Link 
              onClick={() => {
                // 点击后显示监控面板
                setShowMonitoringPanel(true)
                messageApi.success('配置请求已发送，监控面板已就绪')
              }}
              style={{ margin: '0 4px' }}
            >
              联系小包
            </Typography.Link>
          </Text>
        </div>
      )}

      {/* 配置指导（可展开） */}
      <div style={{ 
        marginTop: 24,
        padding: '16px 20px',
        backgroundColor: '#fafafa',
        border: '1px solid #d9d9d9',
        borderRadius: 8
      }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setShowGuideDetail(!showGuideDetail)}
        >
          <Text strong style={{ fontSize: 15 }}>
            📖 配置指导
          </Text>
          <Button type="link" size="small">
            {showGuideDetail ? '收起' : '点击展示'}
          </Button>
        </div>

        {showGuideDetail && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e8e8e8' }}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              {/* 安装依赖 */}
              <div>
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 600, 
                  marginBottom: 12,
                  color: '#1890ff'
                }}>
                  步骤 1: 安装依赖包
                </div>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                      安装 Faro Web SDK 核心包
                    </Text>
                    <div style={{ 
                      backgroundColor: '#fff', 
                      padding: '12px 16px', 
                      borderRadius: 6,
                      border: '1px solid #e8e8e8',
                      fontFamily: 'Monaco, Consolas, monospace',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <code>npm install @grafana/faro-web-sdk</code>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText('npm install @grafana/faro-web-sdk')
                          messageApi.success('命令已复制')
                        }}
                      >
                        复制
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                      安装 Faro 链路追踪包
                    </Text>
                    <div style={{ 
                      backgroundColor: '#fff', 
                      padding: '12px 16px', 
                      borderRadius: 6,
                      border: '1px solid #e8e8e8',
                      fontFamily: 'Monaco, Consolas, monospace',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <code>npm install @grafana/faro-web-tracing</code>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText('npm install @grafana/faro-web-tracing')
                          messageApi.success('命令已复制')
                        }}
                      >
                        复制
                      </Button>
                    </div>
                  </div>
                </Space>
              </div>

              {/* 初始化代码 */}
              <div>
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 600, 
                  marginBottom: 12,
                  color: '#1890ff'
                }}>
                  步骤 2: 在项目中初始化 Faro
                </div>
                <Text type="secondary" style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
                  在你的应用入口文件（如 app.tsx 或 main.tsx）中添加以下代码
                </Text>
                <div style={{ 
                  backgroundColor: '#fff', 
                  padding: '16px', 
                  borderRadius: 6,
                  border: '1px solid #e8e8e8',
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: 13,
                  position: 'relative',
                  overflow: 'auto'
                }}>
                  <Button 
                    size="small" 
                    icon={<CopyOutlined />}
                    style={{ position: 'absolute', top: 12, right: 12 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const code = `import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: 'https://faro-collector-prod-ap-southeast-0.grafana.net/collect/1547743be98abaec9cc8a3bb074ae188',
  app: {
    name: 'tenken',
    version: '1.0.0',
    environment: 'staging'
  },
  instrumentations: [
    // Mandatory, omits default instrumentations otherwise.
    ...getWebInstrumentations(),
    // Tracing package to get end-to-end visibility for HTTP requests.
    new TracingInstrumentation(),
  ],
});`
                      navigator.clipboard.writeText(code)
                      messageApi.success('代码已复制')
                    }}
                  >
                    复制
                  </Button>
                  <pre style={{ margin: 0, paddingRight: 80 }}>
{`import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: 'https://faro-collector-prod-ap-southeast-0.grafana.net/collect/1547743be98abaec9cc8a3bb074ae188',
  app: {
    name: 'tenken',
    version: '1.0.0',
    environment: 'staging'
  },
  instrumentations: [
    // Mandatory, omits default instrumentations otherwise.
    ...getWebInstrumentations(),
    // Tracing package to get end-to-end visibility for HTTP requests.
    new TracingInstrumentation(),
  ],
});`}
                  </pre>
                </div>
              </div>

              <div style={{ 
                padding: '12px 16px',
                backgroundColor: '#e6f4ff',
                border: '1px solid #91caff',
                borderRadius: 6
              }}>
                <Text style={{ color: '#0958d9' }}>
                  💡 提示：完成配置后，请发布新版本，Faro 将自动开始收集监控数据
                </Text>
              </div>
            </Space>
          </div>
        )}
      </div>
    </Card>
  )


  // Tab配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'cdn',
      label: 'CDN 告警',
      children: CdnAlertContent
    },
    {
      key: 'faro',
      label: '前端监控',
      children: FaroAlertContent
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>客户端告警</Title>
        <div style={{ 
          fontSize: '14px', 
          color: '#666', 
          lineHeight: '1.5'
        }}>
          客户端告警用于实时监控CDN异常及前端应用性能，支持快速定位问题，提升响应与修复效率。
        </div>
      </div>
      
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
    </div>
  )
}
