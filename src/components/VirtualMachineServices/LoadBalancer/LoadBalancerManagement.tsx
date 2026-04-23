'use client'

import React, { useState } from 'react'
import type { SystemServerGroup, SystemForwardingPolicy } from '../VirtualMachine/VirtualMachineList'
import { 
  Card, 
  Button, 
  Typography, 
  message,
  Space,
  Tag
} from 'antd'
import { 
  PlusOutlined, 
  ApiOutlined
} from '@ant-design/icons'
import LoadBalancerDetails from './LoadBalancerDetails'

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
  expiryDate: string // 证书到期时间
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
    expiryDate: '2026年9月16日',
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

interface LoadBalancerManagementProps {
  systemManagedServerGroups?: SystemServerGroup[]
  systemManagedPolicies?: SystemForwardingPolicy[]
  onReleaseSystemManaged?: (group: SystemServerGroup) => void
}

export default function LoadBalancerManagement({ systemManagedServerGroups = [], systemManagedPolicies = [], onReleaseSystemManaged }: LoadBalancerManagementProps): React.ReactElement {
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>(mockLoadBalancerData)
  const [selectedLB, setSelectedLB] = useState<LoadBalancer | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  
  // 控制每个负载均衡的流量转发展开/收起状态
  // key: lbId
  const [expandedLoadBalancers, setExpandedLoadBalancers] = useState<Record<string, boolean>>({})
  
  // 切换负载均衡的流量转发展开/收起
  const toggleLoadBalancerExpand = (lbId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedLoadBalancers(prev => ({
      ...prev,
      [lbId]: !prev[lbId]
    }))
  }

  // 启用负载均衡
  const handleEnable = (): void => {
    // 检查是否已启用负载均衡实例
    if (loadBalancers.length > 0) {
      message.warning('负载均衡已启用')
      return
    }

    setLoading(true)
    
    // 模拟启用过程
    setTimeout(() => {
      // 自动生成负载均衡名称
      const lbName = `appid-load-balancer`
      
      const newLB: LoadBalancer = {
        id: `lb-bp${Date.now()}`,
        name: lbName,
        serviceAddress: `http://47.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        listenerCount: 0,
        serverGroupName: '未配置',
        status: 'running',
        listeners: [],
        expiryDate: '2026年9月16日' // 固定到期时间
      }
      
      setLoadBalancers(prev => [...prev, newLB])
      setLoading(false)
      message.success('负载均衡已启用！')
    }, 1500)
  }

  // 如果选中了负载均衡，显示详情页
  if (selectedLB) {
    return (
      <LoadBalancerDetails
        loadBalancer={selectedLB}
        onBack={() => setSelectedLB(null)}
        systemManagedServerGroups={systemManagedServerGroups}
        systemManagedPolicies={systemManagedPolicies}
        onReleaseSystemManaged={onReleaseSystemManaged}
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部说明卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 2,
            paddingBottom: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <Title level={1} style={{ marginBottom: 4, fontSize: 22 }}>
              负载均衡
            </Title>
            <Text type="secondary">
              管理负载均衡实例，配置监听规则和后端服务器
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleEnable}
            disabled={loadBalancers.length > 0}
            loading={loading}
          >
            启用负载均衡
          </Button>
        </div>
      </Card>

      {/* 负载均衡卡片列表 */}
      {loadBalancers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <ApiOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>负载均衡未启用</div>
            <div style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
              启用后将自动创建负载均衡实例：<span style={{ fontFamily: 'monospace', color: '#1890ff' }}>appid-load-balancer</span>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              style={{ marginTop: 16 }}
              onClick={handleEnable}
              loading={loading}
            >
              启用负载均衡
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
              {/* 内容区域 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 第一行：名称、服务地址、监听端口、证书到期时间 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 160 }}>
                  {/* 左侧：状态圆圈 + 名称 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
                    <div 
                      style={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%',
                        backgroundColor: 
                          lb.status === 'running' ? '#52c41a' :
                          lb.status === 'stopped' ? '#d9d9d9' :
                          '#1890ff'
                      }}
                      title={
                        lb.status === 'running' ? '运行中' :
                        lb.status === 'stopped' ? '已停止' :
                        lb.status === 'starting' ? '启动中' : '停止中'
                      }
                    />
                    <Text strong style={{ fontSize: 16 }}>{lb.name}</Text>
                  </div>
                  
                  {/* 中间：服务地址 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                    <span style={{ fontSize: 14 }}>公网地址：</span>
                    <Tag  color="blue" style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                      {lb.serviceAddress}
                    </Tag>
                  </div>
                  
                  {/* 监听端口 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14 }}>监听端口：</span>
                    {lb.listeners.map((listener, index) => (
                      <Tag 
                        key={index}
                        
                        color="blue" 
                        style={{ 
                          fontSize: 13, 
                          padding: '4px 12px',
                          margin: 0
                        }}
                      >
                        {listener.protocol}:{listener.port}
                      </Tag>
                    ))}
                  </div>

                  {/* 证书到期时间 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', marginLeft: 'auto' }}>
                    <span style={{ fontSize: 14, color: '#666' }}>证书到期时间：{lb.expiryDate}</span>
                  </div>
                </div>

                {/* 展开/收起流量转发 */}
                {lb.listeners.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* 展开/收起按钮 */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8,
                        cursor: 'pointer',
                        color: '#666'
                      }}
                      onClick={(e) => toggleLoadBalancerExpand(lb.id, e)}
                    >
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {expandedLoadBalancers[lb.id] ? '▼' : '▶'} 点击{expandedLoadBalancers[lb.id] ? '收起' : '展开'}流量转发
                      </Text>
                    </div>
                    
                    {/* 流量转发详情 */}
                    {expandedLoadBalancers[lb.id] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {lb.listeners.map((listener, index) => (
                          <div key={index} style={{ fontSize: 13 }}>
                            {/* 监听规则标题 */}
                            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
                              {listener.protocol}:{listener.port}
                            </div>
                            
                            {/* 流量转发树形结构 */}
                            <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* 转发策略 */}
                              {listener.forwardingRules && listener.forwardingRules.length > 0 && (
                                <>
                                  {listener.forwardingRules.map((rule, ruleIndex) => (
                                    <div key={ruleIndex} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {/* 策略行 */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>├─</Text>
                                        <Tag  style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                                          {rule.domain}
                                        </Tag>
                                        <Tag  style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                                          {rule.path}
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
                                        <Tag  style={{ fontSize: 12, margin: 0 }}>
                                          {rule.serverGroup}
                                        </Tag>
                                      </div>
                                      {/* 虚拟机和端口 */}
                                      {rule.vms && rule.vms.map((vm, vmIndex) => (
                                        <div key={vmIndex} style={{ marginLeft: 32, display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 11 }}>
                                          <Text type="secondary" style={{ fontSize: 11 }}>└─</Text>
                                          <Text type="secondary" style={{ fontSize: 11 }}>{vm.vmName}</Text>
                                          <Text type="secondary" style={{ fontSize: 11 }}>({vm.privateIp})</Text>
                                          <Text type="secondary" style={{ fontSize: 11 }}>端口:</Text>
                                          {vm.ports.map((port, portIndex) => (
                                            <Tag key={portIndex}  style={{ fontSize: 11, margin: 0 }}>
                                              {port}
                                            </Tag>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </>
                              )}
                              
                              {/* 默认后端 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* 服务器组 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>└─</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>其他请求</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
                                  <Tag  style={{ fontSize: 12, margin: 0 }}>
                                    {listener.serverGroup}
                                  </Tag>
                                </div>
                                {/* 虚拟机和端口 */}
                                {listener.vms && listener.vms.map((vm, vmIndex) => (
                                  <div key={vmIndex} style={{ marginLeft: 32, display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 11 }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>└─</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{vm.vmName}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>({vm.privateIp})</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>端口:</Text>
                                    {vm.ports.map((port, portIndex) => (
                                      <Tag key={portIndex}  style={{ fontSize: 11, margin: 0 }}>
                                        {port}
                                      </Tag>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
      </Card>
          ))}
        </Space>
      )}
    </div>
  )
}
