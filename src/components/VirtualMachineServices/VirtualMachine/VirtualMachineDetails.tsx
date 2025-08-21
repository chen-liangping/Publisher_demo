'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  message,
  Modal,
  Tabs,
  Table,
} from 'antd'
import { 
  ArrowLeftOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  GlobalOutlined,
  DesktopOutlined,
  MinusCircleTwoTone
} from '@ant-design/icons'

const { Title } = Typography
const { TabPane } = Tabs

interface VirtualMachine {
  id: string
  name: string
  alias: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  spec: string
  systemImage: string
  privateIp: string
  publicIp?: string
  createTime: string
  domain: string
  sslCertName?: string
  systemDiskSize?: number
  dataDiskSize?: number
  loginUser?: string
  securityGroups?: string[]
  securityGroupNames?: string[]
}

interface VirtualMachineDetailsProps {
  vm: VirtualMachine
  onBack: () => void
  onOperation: (vmId: string, operation: string, payload?: string | undefined) => void
}

export default function VirtualMachineDetails({ vm, onBack, onOperation }: VirtualMachineDetailsProps) {
  const [publicIp, setPublicIp] = useState<string | undefined>(vm.publicIp)
  // 操作日志项类型定义
  interface LogEntry {
    key: string
    vmName: string
    operation: string
    time: string
  }

  // 本地维护操作日志（原型用途），实际可由后端拉取
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // 初始示例日志：包含创建时的记录
    return [
      {
        key: `${vm.id}-created`,
        vmName: vm.alias,
        operation: '创建实例',
        time: vm.createTime,
      },
    ]
  })

  const prevSecurityGroupsRef = useRef<string | undefined>(vm.securityGroupNames?.join(','))

  // 添加一条日志的简易函数
  const addLog = (operation: string) => {
    const entry: LogEntry = {
      key: `${vm.id}-${Date.now()}`,
      vmName: vm.alias,
      operation,
      time: new Date().toLocaleString(),
    }
    setLogs((s) => [entry, ...s])
  }
  const renderStatus = (status: VirtualMachine['status']): React.ReactElement => {
    const statusConfig = {
      running: { color: 'success', text: '运行中' },
      stopped: { color: 'default', text: '已停止' },
      starting: { color: 'processing', text: '启动中' },
      stopping: { color: 'warning', text: '停止中' }
    }
    
    const config = statusConfig[status]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const handleOperation = (operation: string) => {
    // 记录开/关机操作日志（原型前端记录）
    if (operation === 'start') addLog('启动实例')
    if (operation === 'stop') addLog('停止实例')
    onOperation(vm.id, operation)
  }

  // 处理远程连接
  const handleRemoteConnect = () => {
    if (vm.status !== 'running') {
      message.warning('虚机需要处于运行状态才能远程连接')
      return
    }
    
    // 模拟远程连接逻辑
    Modal.info({
      title: '远程连接',
      content: (
        <div>
          <p><strong>虚机名称：</strong>{vm.alias}</p>
          <p><strong>IP地址：</strong>{publicIp}</p>
          <p><strong>连接方式：</strong>RDP (Windows) / SSH (Linux)</p>
          <p><strong>用户名：</strong>{vm.loginUser}</p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            正在启动远程连接客户端...
          </p>
        </div>
      ),
      onOk() {
        message.success('远程连接已启动')
      },
    })
  }

  // 监听安全组变更，若发生变更则写入“绑定安全组”日志（适配父组件更新 vm.securityGroupNames 的场景）
  useEffect(() => {
    const prev = prevSecurityGroupsRef.current
    const curr = vm.securityGroupNames?.join(',')
    if (prev !== curr) {
      // 若之前为空且现在有新配置，视为绑定；若变更也写一条记录
      addLog('绑定/更新安全组')
      prevSecurityGroupsRef.current = curr
    }
  }, [vm.securityGroupNames])

  // Table 列定义，用于操作日志展示
  const columns = [
    {
      title: '虚机名称',
      dataIndex: 'vmName',
      key: 'vmName',
    },
    {
      title: '操作类型',
      dataIndex: 'operation',
      key: 'operation',
    },
    {
      title: '操作时间',
      dataIndex: 'time',
      key: 'time',
    },
  ]

  return (
    <div>
      {/* 头部区域 - 包含返回按钮、标题和操作按钮 */}
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
            {vm.alias}
          </Title>
        </div>
        
        {/* 操作按钮组 - 放在右上角 */}
        <Space wrap>
          {vm.status === 'stopped' ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleOperation('start')}
            >
              启动实例
            </Button>
          ) : (
            <Button
              icon={<PoweroffOutlined />}
              onClick={() => handleOperation('stop')}
            >
              停止实例
            </Button>
          )}
          
          <Button
            icon={<ReloadOutlined />}
            onClick={() => handleOperation('restart')}
            disabled={vm.status === 'stopped'}
          >
            重启实例
          </Button> 
          
          {/* global IP 操作已移至公网IP字段旁的图标按钮 */}
          
          <Button
            icon={<DesktopOutlined />}
            onClick={() => handleRemoteConnect()}
            disabled={vm.status !== 'running'}
            title={vm.status !== 'running' ? '虚机需要处于运行状态才能远程连接' : ''}
          >
            远程连接
          </Button>
          
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleOperation('delete')}
          >
            删除实例
          </Button>
        </Space>
      </div>

      {/* 内容区域 - 现在由 Tabs 的 '基本信息' 子项显示 */}

      {/* Tabs：基本信息 + 操作日志 */}
      <div style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="details"
          items={[
            {
              key: 'details',
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
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>实例ID</div>
                        <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.id}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>系统盘</div>
                        <div style={{ fontSize: '14px' }}>{vm.systemDiskSize ? `${vm.systemDiskSize}GB` : '40GB'}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>数据盘</div>
                        <div style={{ fontSize: '14px' }}>{vm.dataDiskSize ? `${vm.dataDiskSize}GB` : '未配置'}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>登录用户</div>
                        <div style={{ fontSize: '14px' }}>{vm.loginUser || 'root'}</div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={8}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>状态</div>
                        <div>{renderStatus(vm.status)}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>规格</div>
                        <div style={{ fontSize: '14px' }}>{vm.spec}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>私网IP</div>
                        <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.privateIp}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>公网IP</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{publicIp || '未分配'}</div>
                          <Button
                            size="small"
                            icon={<MinusCircleTwoTone/>}
                            onClick={() => {
                              // 直接切换公网IP状态并同步到父组件（无确认弹窗）
                              if (publicIp) {
                                setPublicIp(undefined)
                                message.success('公网IP 已关闭')
                                onOperation(vm.id, 'updatePublicIp', undefined)
                                // 记录日志：关闭公网IP
                                addLog('关闭公网IP')
                              } else {
                                const newIp = '47.96.123.100'
                                setPublicIp(newIp)
                                message.success('已分配公网IP')
                                onOperation(vm.id, 'updatePublicIp', newIp)
                                // 记录日志：分配公网IP
                                addLog('分配公网IP')
                              }
                            }}
                            title={publicIp ? '关闭公网IP' : '分配公网IP'}
                          />
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={8}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>创建时间</div>
                        <div style={{ fontSize: '14px' }}>{vm.createTime}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>系统镜像</div>
                        <div style={{ fontSize: '14px' }}>{vm.systemImage}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>安全组</div>
                        <div style={{ fontSize: '14px' }}>
                          {vm.securityGroupNames && vm.securityGroupNames.length > 0 ? (
                            <Space wrap>
                              {vm.securityGroupNames.map((name, idx) => (
                                <Tag color="blue" key={idx}>
                                  {name}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            '未配置'
                          )}
                        </div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>域名</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.domain}</div>
                          {vm.sslCertName ? (
                            <div style={{ color: '#00a8ff', fontSize: 13 }}>
                              {`ssl 证书：${vm.sslCertName}`}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: 'logs',
              label: '操作日志',
              children: (
                <Table
                  columns={columns}
                  dataSource={logs}
                  pagination={{ pageSize: 6 }}
                  rowKey="key"
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}