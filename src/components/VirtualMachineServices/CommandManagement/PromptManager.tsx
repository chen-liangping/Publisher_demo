'use client'

import React, { useState } from 'react'
import {
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Tabs,
  Modal,
  Table,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  EditOutlined,
  EyeOutlined,
  CopyOutlined,
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

// 内置长脚本常量（用于原型模拟）
const DEFAULT_LONG_SCRIPT = `#!/bin/bash
# 通用 SVN 更新模板
# 参数: CODE_DIR CODE_FILE_NAME SVN_PATH

# 参数检查函数
checkParam() {
    if [ -z "$1" ]; then
        echo "传入参数为空！！！请重新输入"
        exit 1
    fi
}

# 文件目录检查
ensureDir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

# SVN 更新
svnUpdate() {
    local module=$1
    local targetDir="$CODE_DIR/$CODE_FILE_NAME/$module"
    if [ ! -d "$targetDir/.svn" ]; then
        svn co --username "\${SVN_USER}" --password "\${SVN_PASS}" "\${SVN_PATH}/$module" "$targetDir"
    fi
    cd "$targetDir" || exit 1
    svn revert --recursive .
    svn up --username "\${SVN_USER}" --password "\${SVN_PASS}"
}

# 设置参数
CODE_DIR=$1; checkParam $CODE_DIR
CODE_FILE_NAME=$2; checkParam $CODE_FILE_NAME
SVN_PATH=$3; checkParam $SVN_PATH
SVN_USER=\${SVN_USER:-killzone}
SVN_PASS=\${SVN_PASS:-password}

ensureDir "$CODE_DIR/$CODE_FILE_NAME"

# 更新模块
cd "$CODE_DIR/$CODE_FILE_NAME" || exit 1
echo "=== 更新模块: Gamedata ==="
svnUpdate Gamedata
echo "=== 更新模块: server ==="
svnUpdate server
`

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
  // 执行时目标虚机
  targetVM: string
  fileName?: string
  status: 'success' | 'failed' | 'running'
  result: string
  executeTime: string
  duration: string
  // 执行时的命令详情（示例：实际应由后端返回）
  commandExecuted?: string
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
    duration: '2.3s',
    commandExecuted: DEFAULT_LONG_SCRIPT
  },
  {
    id: '2',
    commandName: '部署应用',
    targetVM: '数据库服务器',
    fileName: 'deploy-script.sh',
    status: 'failed',
    result: '连接超时，部署失败',
    executeTime: '2024-01-15 14:25:00',
    duration: '30s',
    commandExecuted: 'bash deploy-script.sh --env=prod --db'
  },
  {
    id: '3',
    commandName: '部署应用',
    targetVM: 'Web服务器1',
    fileName: 'config.json',
    status: 'success',
    result: '配置更新成功',
    executeTime: '2024-01-14 16:20:00',
    duration: '1.2s',
    commandExecuted: 'cat config.json | jq .'
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

  // 为了在原型中始终展示你的长脚本，直接使用内置长脚本作为显示内容
  const templateToShow = DEFAULT_LONG_SCRIPT

  // 详情 Modal state
  const [detailVisible, setDetailVisible] = useState<boolean>(false)
  const [activeDetail, setActiveDetail] = useState<ExecutionHistory | null>(null)

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

  const showDetails = (history: ExecutionHistory) => {
    setActiveDetail(history)
    setDetailVisible(true)
  }

  const closeDetails = () => {
    setActiveDetail(null)
    setDetailVisible(false)
  }

  // 表格列定义：与虚机操作日志风格类似的列表展示
  const historyColumns = [
    {
      title: '执行时间',
      dataIndex: 'executeTime',
      key: 'executeTime',
    },
    {
      title: '目标虚机',
      dataIndex: 'targetVM',
      key: 'targetVM',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: ExecutionHistory['status']) => renderStatus(s),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ExecutionHistory) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => showDetails(record)} title="查看详情" />
      ),
    },
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
              <div>
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

                <div style={{ height: 16 }} />

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>命令详情</div>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(templateToShow)
                        message.success('命令已复制到剪贴板')
                      }}
                      title="复制命令"
                    />
                  </div>
                  <Paragraph style={{ margin: 0 }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#333' }}>{templateToShow}</pre>
                  </Paragraph>
                </div>
              </div>
            )
          },
          {
            key: 'history',
            label: '执行记录',
            children: (
              <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                <Table
                  columns={historyColumns}
                  dataSource={executionHistory}
                  rowKey="id"
                  pagination={{ pageSize: 6 }}
                />
              </div>
            )
          }
        ]}
      />

      {/* 详情 Modal */}
      <Modal
        open={detailVisible}
        title={`执行详情 - ${activeDetail?.commandName || ''}`}
        onCancel={closeDetails}
        footer={null}
        width={720}
      >
        {activeDetail ? (
          <div>
            <div style={{ marginBottom: 12 }}> <strong>执行时间：</strong> {activeDetail.executeTime} </div>
            <div style={{ marginBottom: 12 }}> <strong>目标虚机：</strong> {activeDetail.targetVM} </div>
            {activeDetail.fileName && (
              <div style={{ marginBottom: 12 }}> <strong>文件：</strong> {activeDetail.fileName} </div>
            )}
            <div style={{ marginBottom: 12 }}> <strong>执行结果：</strong> {activeDetail.result} </div>
            <div style={{ marginBottom: 12 }}> <strong>耗时：</strong> {activeDetail.duration} </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}><strong>命令详情</strong></div>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflow: 'auto' }}>{activeDetail.commandExecuted || '无详情'}</pre>
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  )
}