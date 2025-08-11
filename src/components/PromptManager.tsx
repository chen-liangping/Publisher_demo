'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  Typography,
  Descriptions,
  Tag,
  Table,
  Divider,
  Row,
  Col,
  Tabs
} from 'antd'
import { 
  ArrowLeftOutlined,
  PlayCircleOutlined,
  EditOutlined,
  CodeOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

const { Title, Paragraph } = Typography

// 命令数据类型定义
interface Command {
  id: string
  name: string
  template: string
  tags: string[]
  description?: string
  createTime: string
  hasFileParam: boolean
}

// 执行历史数据类型
interface ExecutionHistory {
  id: string
  commandName: string
  targetVM: string
  fileName?: string
  status: 'success' | 'failed' | 'running'
  result: string
  executeTime: string
  duration: string
}

// 模拟执行历史数据
const mockExecutionHistory: ExecutionHistory[] = [
  {
    id: '1',
    commandName: '部署应用',
    targetVM: 'Web服务器1',
    fileName: 'deploy-script.sh',
    status: 'success',
    result: '部署成功，应用已启动',
    executeTime: '2024-01-15 14:30:00',
    duration: '2.3s'
  },
  {
    id: '2',
    commandName: '部署应用',
    targetVM: '数据库服务器',
    fileName: 'deploy-script.sh',
    status: 'failed',
    result: '连接超时，部署失败',
    executeTime: '2024-01-15 14:25:00',
    duration: '30s'
  },
  {
    id: '3',
    commandName: '部署应用',
    targetVM: 'Web服务器1',
    fileName: 'config.json',
    status: 'success',
    result: '配置更新成功',
    executeTime: '2024-01-14 16:20:00',
    duration: '1.2s'
  }
]

interface PromptManagerProps {
  command: Command
  onBack: () => void
  onEdit: (command: Command) => void
  onExecute: (command: Command) => void
}

export default function PromptManager({ command, onBack, onEdit, onExecute }: PromptManagerProps) {
  const [executionHistory] = useState<ExecutionHistory[]>(
    mockExecutionHistory.filter(history => history.commandName === command.name)
  )

  // 渲染状态标签
  const renderStatus = (status: ExecutionHistory['status']): React.ReactElement => {
    const statusConfig = {
      success: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
      running: { color: 'processing', text: '执行中' }
    }
    
    const config = statusConfig[status]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 执行历史表格列配置
  const historyColumns: TableColumnsType<ExecutionHistory> = [
    {
      title: '执行时间',
      dataIndex: 'executeTime',
      key: 'executeTime',
      width: 180
    },
    {
      title: '目标虚拟机',
      dataIndex: 'targetVM',
      key: 'targetVM'
    },
    {
      title: '关联文件',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (fileName: string) => fileName || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatus
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration'
    },
    {
      title: '执行结果',
      dataIndex: 'result',
      key: 'result',
      ellipsis: true
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部区域 */}
      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            style={{ marginRight: 16 }}
          >
            返回列表
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Prompt Manager - {command.name}
          </Title>
        </div>
        
        {/* 操作按钮组 */}
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => onExecute(command)}
          >
            执行命令
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(command)}
          >
            编辑命令
          </Button>
        </Space>
      </div>

      {/* Tab 分页展示内容 */}
      <Tabs
        defaultActiveKey="basic"
        size="large"
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <div style={{ 
                background: '#fafafa', 
                padding: '24px', 
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}>
                <Row gutter={[48, 24]}>
                  <Col xs={24} sm={12} lg={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>命令名称</div>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>{command.name}</div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12} lg={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>创建时间</div>
                      <div style={{ fontSize: '14px' }}>{command.createTime}</div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12} lg={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>文件参数</div>
                      <div>
                        {command.hasFileParam ? (
                          <Tag color="green">支持文件参数 {'{file}'}</Tag>
                        ) : (
                          <Tag color="default">无文件参数</Tag>
                        )}
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>标签</div>
                      <div>
                        {command.tags.map(tag => (
                          <Tag key={tag} color="blue" style={{ margin: '2px 4px 2px 0' }}>
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </Col>
                  
                  {command.description && (
                    <Col xs={24}>
                      <div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>描述</div>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{command.description}</div>
                      </div>
                    </Col>
                  )}
                </Row>
              </div>
            )
          },
          {
            key: 'template',
            label: '命令模板',
            children: (
              <div style={{ 
                background: '#f5f5f5', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                overflow: 'auto',
                position: 'relative'
              }}>
                <Paragraph copyable={{ text: command.template }} style={{ margin: 0 }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#333' }}>{command.template}</pre>
                </Paragraph>
              </div>
            )
          },
          {
            key: 'history',
            label: '执行记录',
            children: (
              <div>
                {executionHistory.length > 0 ? (
                  <div style={{ 
                    background: '#fafafa', 
                    padding: '16px', 
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0'
                  }}>
                    {executionHistory.map((history, index) => (
                      <div 
                        key={history.id}
                        style={{ 
                          padding: '16px 0',
                          borderBottom: index < executionHistory.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '14px', color: '#333' }}>{history.executeTime}</span>
                            {renderStatus(history.status)}
                            <span style={{ fontSize: '14px', color: '#666' }}>{history.duration}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            {history.targetVM}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                          {history.fileName && `文件: ${history.fileName}`}
                        </div>
                        
                        <div style={{ fontSize: '14px', color: '#333' }}>
                          {history.result}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#999',
                    background: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0'
                  }}>
                    暂无执行记录
                  </div>
                )}
              </div>
            )
          }
        ]}
      />
    </div>
  )
}