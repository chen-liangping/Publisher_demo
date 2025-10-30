'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Typography,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag
} from 'antd'
import { 
  PlusOutlined,
  ApiOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import LoadBalancerDetails from './LoadBalancerDetails'
import CertificateManagement from './CertificateManagement'

const { Title, Text } = Typography

// 虚拟机端口配置
interface VMPort {
  vmName: string
  privateIp: string
  ports: number[]
}

// 转发策略配置
interface ForwardingRule {
  domain: string
  path: string
  serverGroup: string
  vms: VMPort[]
}

// 监听配置
interface ListenerConfig {
  protocol: string
  port: number
  serverGroup: string
  vms: VMPort[]
  forwardingRules?: ForwardingRule[] // 转发策略（可选）
}

// 负载均衡实例数据类型定义
interface LoadBalancer {
  id: string
  name: string
  serviceAddress: string
  listenerCount: number
  serverGroupName: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  listeners: ListenerConfig[]
}

// 模拟负载均衡数据
const mockLoadBalancerData: LoadBalancer[] = [
  {
    id: 'lb-bp1234567890',
    name: 'web-lb-prod',
    serviceAddress: '47.96.123.45',
    listenerCount: 2,
    serverGroupName: 'web-server-group',
    status: 'running',
    listeners: [
      {
        protocol: 'HTTP',
        port: 80,
        serverGroup: 'web-server-group',
        vms: [
          { vmName: 'web-server-01', privateIp: '172.16.0.10', ports: [8080, 8081] },
          { vmName: 'web-server-02', privateIp: '172.16.0.11', ports: [8080, 8081] }
        ],
        forwardingRules: [
          {
            domain: 'www.example.com',
            path: '/api/*',
            serverGroup: 'api-server-group',
            vms: [
              { vmName: 'api-server-01', privateIp: '172.16.0.20', ports: [3000] },
              { vmName: 'api-server-02', privateIp: '172.16.0.21', ports: [3000] }
            ]
          },
          {
            domain: 'www.example.com',
            path: '/admin/*',
            serverGroup: 'admin-server-group',
            vms: [
              { vmName: 'admin-server-01', privateIp: '172.16.0.30', ports: [8888] }
            ]
          }
        ]
      },
      {
        protocol: 'TCP',
        port: 3306,
        serverGroup: 'mysql-server-group',
        vms: [
          { vmName: 'mysql-master', privateIp: '172.16.1.10', ports: [3306] },
          { vmName: 'mysql-slave-01', privateIp: '172.16.1.11', ports: [3306] }
        ]
        // 注意：TCP监听没有转发策略，所有流量直接转发到默认服务器组
      }
    ]
  }
]

export default function LoadBalancerManagement(): React.ReactElement {
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>(mockLoadBalancerData)
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false)
  const [selectedLB, setSelectedLB] = useState<LoadBalancer | null>(null)
  const [showCertificateManagement, setShowCertificateManagement] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [createForm] = Form.useForm<{ name: string }>()
  
  // 控制每个负载均衡的每个监听规则的展开/收起状态
  // key: `${lbId}-${listenerIndex}`
  const [expandedListeners, setExpandedListeners] = useState<Record<string, boolean>>({})

  // 切换监听规则的展开/收起状态
  const toggleListenerExpand = (lbId: string, listenerIndex: number) => {
    const key = `${lbId}-${listenerIndex}`
    setExpandedListeners(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // 创建负载均衡
  const handleCreate = async (): Promise<void> => {
    try {
      // 检查是否已存在负载均衡实例
      if (loadBalancers.length > 0) {
        message.warning('已存在负载均衡实例，无法创建新的实例')
        return
      }

      const values = await createForm.validateFields()
      setLoading(true)
      
      // 模拟创建过程
      setTimeout(() => {
        const newLB: LoadBalancer = {
          id: `lb-bp${Date.now()}`,
          name: values.name,
          serviceAddress: `http://47.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          listenerCount: 0,
          serverGroupName: '未配置',
          status: 'running',
          listeners: []
        }
        
        setLoadBalancers(prev => [...prev, newLB])
        setCreateModalOpen(false)
        createForm.resetFields()
        setLoading(false)
        message.success('负载均衡创建成功！')
      }, 1500)
      
    } catch (error) {
      setLoading(false)
      console.error('创建失败:', error)
    }
  }

  // 停止负载均衡
  const handleStop = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    
    // 更新状态为 stopping
    setLoadBalancers(prev => prev.map(lb => 
      lb.id === id ? { ...lb, status: 'stopping' as const } : lb
    ))
    
    // 模拟停止过程
    setTimeout(() => {
      setLoadBalancers(prev => prev.map(lb => 
        lb.id === id ? { ...lb, status: 'stopped' as const } : lb
      ))
      message.success('负载均衡已停止')
    }, 2000)
  }

  // 启动负载均衡
  const handleStart = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    
    // 更新状态为 starting
    setLoadBalancers(prev => prev.map(lb => 
      lb.id === id ? { ...lb, status: 'starting' as const } : lb
    ))
    
    // 模拟启动过程
    setTimeout(() => {
      setLoadBalancers(prev => prev.map(lb => 
        lb.id === id ? { ...lb, status: 'running' as const } : lb
      ))
      message.success('负载均衡已启动')
    }, 2000)
  }

  // 删除负载均衡
  const handleDelete = (id: string): void => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个负载均衡吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setLoadBalancers(prev => prev.filter(lb => lb.id !== id))
        message.success('删除成功')
      }
    })
  }

  // 如果显示证书管理页面
  if (showCertificateManagement) {
    return (
      <CertificateManagement
        onBack={() => setShowCertificateManagement(false)}
      />
    )
  }

  // 如果选中了负载均衡，显示详情页
  if (selectedLB) {
    return (
      <LoadBalancerDetails
        loadBalancer={selectedLB}
        onBack={() => setSelectedLB(null)}
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>负载均衡</Title>
          <Text type="secondary">管理负载均衡实例，配置监听规则和后端服务器</Text>
        </div>
        <Space>
          <Button
            onClick={() => setShowCertificateManagement(true)}
          >
            证书管理
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            disabled={loadBalancers.length > 0}
          >
            创建负载均衡
          </Button>
        </Space>
      </div>

      {/* 负载均衡卡片列表 */}
      {loadBalancers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <ApiOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无负载均衡实例</div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              style={{ marginTop: 16 }}
              onClick={() => setCreateModalOpen(true)}
            >
              创建第一个负载均衡
            </Button>
          </div>
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {loadBalancers.map(lb => (
            <Card
              key={lb.id}
              hoverable
              style={{ 
                borderRadius: '8px',
                transition: 'all 0.3s',
                minHeight: '120px',
                position: 'relative'
              }}
              styles={{ body: { padding: '28px 24px' } }}
              onClick={() => setSelectedLB(lb)}
            >
              {/* 右上角操作按钮区域 */}
              <div style={{ 
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                gap: 8
              }}>
                {/* 停止/启动按钮 */}
                {lb.status === 'running' && (
                  <Button
                    size="small"
                    onClick={(e) => handleStop(lb.id, e)}
                  >
                    停止
                  </Button>
                )}
                {lb.status === 'stopped' && (
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => handleStart(lb.id, e)}
                  >
                    启动
                  </Button>
                )}
                {lb.status === 'starting' && (
                  <Button
                    size="small"
                    loading
                  >
                    启动中
                  </Button>
                )}
                {lb.status === 'stopping' && (
                  <Button
                    size="small"
                    loading
                  >
                    停止中
                  </Button>
                )}

                {/* 删除按钮 */}
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{ fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(lb.id)
                  }}
                />
              </div>

              {/* 内容区域 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 负载均衡名称 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ApiOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                  <Text strong style={{ fontSize: 16 }}>{lb.name}</Text>
                  <Tag 
                    bordered={false}
                    color={
                      lb.status === 'running' ? 'success' :
                      lb.status === 'stopped' ? 'default' :
                      'processing'
                    }
                  >
                    {lb.status === 'running' ? '运行中' :
                     lb.status === 'stopped' ? '已停止' :
                     lb.status === 'starting' ? '启动中' : '停止中'}
                  </Tag>
                </div>

                {/* 服务地址 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <Text strong style={{ color: '#1890ff' }}>{lb.serviceAddress}</Text>
                </div>

                {/* 监听配置 */}
                {lb.listeners.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {lb.listeners.map((listener, index) => {
                      const listenerKey = `${lb.id}-${index}`
                      const isExpanded = expandedListeners[listenerKey]
                      
                      return (
                        <div key={index}>
                          {/* 监听规则标签行 - 可点击展开/收起 */}
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8,
                              cursor: 'pointer',
                              padding: '4px 0'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleListenerExpand(lb.id, index)
                            }}
                          >
                            <Tag 
                              bordered={false}
                              color="blue" 
                              style={{ 
                                fontSize: 13, 
                                padding: '4px 12px',
                                margin: 0,
                                cursor: 'pointer'
                              }}
                            >
                              {listener.protocol}:{listener.port}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {isExpanded ? '▼' : '▶'} 点击查看流量转发
                            </Text>
                          </div>
                          
                          {/* 展开内容：流量转发树形结构 */}
                          {isExpanded && (
                            <div style={{ marginLeft: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* 转发策略列表 */}
                              {listener.forwardingRules && listener.forwardingRules.length > 0 && (
                                <>
                                  {listener.forwardingRules.map((rule, ruleIndex) => (
                                    <div key={ruleIndex} style={{ fontSize: 13 }}>
                                      {/* 转发策略行 */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
                                        <Text type="secondary">├─</Text>
                                        <Text type="secondary">转发策略{ruleIndex + 1}:</Text>
                                        <Tag bordered={false} color="blue" style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                                          {rule.domain}
                                        </Tag>
                                        <Tag bordered={false} color="blue" style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                                          {rule.path}
                                        </Tag>
                                        <Text type="secondary">→</Text>
                                        <Tag 
                                          bordered={false}
                                          color="#636e72" 
                                          style={{ 
                                            fontSize: 12, 
                                            margin: 0
                                          }}
                                        >
                                          {rule.serverGroup}
                                        </Tag>
                                      </div>
                                      
                                      {/* 服务器组虚机详情 - 直接显示 */}
                                      <div style={{ marginLeft: 32, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {rule.vms.map((vm, vmIndex) => (
                                          <div 
                                            key={vmIndex}
                                            style={{ 
                                              fontSize: 12, 
                                              color: '#999',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 6
                                            }}
                                          >
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                              {vmIndex === rule.vms.length - 1 ? '└─' : '├─'}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{vm.vmName}</Text>
                                            <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                              ({vm.privateIp})
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
                                            <Text style={{ color: '#999', fontSize: 12, fontWeight: 500 }}>
                                              {vm.ports.join(', ')}
                                            </Text>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                              
                              {/* 默认服务器组（其他请求） */}
                              <div style={{ fontSize: 13 }}>
                                {/* 默认后端行 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
                                  <Text type="secondary">└─</Text>
                                  <Text type="secondary">其他请求</Text>
                                  <Text type="secondary">→</Text>
                                  <Tag 
                                    bordered={false}
                                    color="#636e72" 
                                    style={{ 
                                      fontSize: 12, 
                                      margin: 0
                                    }}
                                  >
                                    {listener.serverGroup}
                                  </Tag>
                                </div>
                                
                                {/* 默认服务器组虚机详情 - 直接显示 */}
                                <div style={{ marginLeft: 32, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {listener.vms.map((vm, vmIndex) => (
                                    <div 
                                      key={vmIndex}
                                      style={{ 
                                        fontSize: 12, 
                                        color: '#999',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                      }}
                                    >
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {vmIndex === listener.vms.length - 1 ? '└─' : '├─'}
                                      </Text>
                                      <Text type="secondary" style={{ fontSize: 12 }}>{vm.vmName}</Text>
                                      <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                        ({vm.privateIp})
                                      </Text>
                                      <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
                                      <Text style={{ color: '#999', fontSize: 12, fontWeight: 500 }}>
                                        {vm.ports.join(', ')}
                                      </Text>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div>
                    <Text type="secondary">暂无监听配置</Text>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </Space>
      )}

      {/* 创建负载均衡Modal */}
      <Modal
        title="创建负载均衡"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        onOk={handleCreate}
        confirmLoading={loading}
        width={500}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="负载均衡名称"
            rules={[{ required: true, message: '请输入负载均衡名称' }]}
          >
            <Input placeholder="请输入负载均衡名称，例如：web-lb-01" />
          </Form.Item>
 
        </Form>
      </Modal>
    </div>
  )
}
