'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Typography,
  Tabs,
  Table,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Tag
} from 'antd'
import { 
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import CreateServerGroup from './CreateServerGroup'

const { Title, Text } = Typography

// 负载均衡数据类型
interface LoadBalancer {
  id: string
  name: string
  listenerCount: number
  serverGroupName: string
}

// 监听规则类型
interface ListenerRule {
  id: string
  name: string
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'UDP'
  port: number
  certificate?: string // HTTPS证书
  serverGroup: string // 服务器组
  healthCheck: 'enabled' | 'disabled' // 健康检查
  status: 'running' | 'stopped' | 'starting' | 'stopping'
}

// 转发策略类型
interface ForwardingPolicy {
  id: string
  listenerId: string // 关联的监听规则ID
  domain: string
  path: string
  serverGroup: string // 虚拟服务器组
  remark?: string // 备注
}

// 虚拟服务器组类型
interface ServerGroup {
  id: string
  name: string
  serverCount: number
  healthCheck: 'enabled' | 'disabled'
  servers: ServerConfig[] // 服务器配置列表
}

// 服务器配置类型
interface ServerConfig {
  vmId: string
  vmName: string
  privateIp: string
  ports: PortConfig[] // 端口配置列表
}

// 端口配置类型
interface PortConfig {
  id: string
  port: number
  weight: number
}

interface LoadBalancerDetailsProps {
  loadBalancer: LoadBalancer
  onBack: () => void
}

export default function LoadBalancerDetails({ loadBalancer, onBack }: LoadBalancerDetailsProps) {
  // 监听规则数据
  const [listeners, setListeners] = useState<ListenerRule[]>([
    {
      id: 'listener-1',
      name: 'HTTP_Listener_80',
      protocol: 'HTTP',
      port: 80,
      serverGroup: 'web-server-group',
      healthCheck: 'enabled',
      status: 'running'
    },
    {
      id: 'listener-2',
      name: 'HTTPS_Listener_443',
      protocol: 'HTTPS',
      port: 443,
      certificate: 'cert-example-com',
      serverGroup: 'web-server-group',
      healthCheck: 'enabled',
      status: 'running'
    }
  ])

  // 可用的证书列表
  const [certificates] = useState([
    { value: 'cert-example-com', label: 'example.com 证书' },
    { value: 'cert-api-com', label: 'api.example.com 证书' },
    { value: 'cert-wildcard', label: '*.example.com 通配符证书' }
  ])

  // 可用的服务器组（包含虚拟机信息）
  const [availableServerGroups] = useState([
    { 
      value: 'web-server-group', 
      label: 'web-server-group',
      vms: ['web-server-01', 'web-server-02', 'web-server-03']
    },
    { 
      value: 'api-server-group', 
      label: 'api-server-group',
      vms: ['api-server-01', 'api-server-02']
    },
    { 
      value: 'backend-server-group', 
      label: 'backend-server-group',
      vms: ['backend-01', 'backend-02', 'backend-03', 'backend-04']
    }
  ])

  // 选中的服务器组
  const [selectedServerGroup, setSelectedServerGroup] = useState<string | undefined>(undefined)

  // 转发策略数据（关联到监听规则）
  const [policies, setPolicies] = useState<ForwardingPolicy[]>([
    {
      id: 'policy-1',
      listenerId: 'listener-1',
      domain: 'www.example.com',
      path: '/api/*',
      serverGroup: 'web-server-group',
      remark: '示例转发策略'
    }
  ])

  // 虚拟服务器组数据
  const [serverGroups, setServerGroups] = useState<ServerGroup[]>([
    {
      id: 'group-1',
      name: 'web-server-group',
      serverCount: 3,
      healthCheck: 'enabled',
      servers: [
        {
          vmId: 'vm-001',
          vmName: 'web-server-01',
          privateIp: '172.16.0.10',
          ports: [{ id: 'port-1', port: 8080, weight: 100 }]
        },
        {
          vmId: 'vm-002',
          vmName: 'web-server-02',
          privateIp: '172.16.0.11',
          ports: [{ id: 'port-2', port: 8080, weight: 100 }]
        }
      ]
    }
  ])

  // 可用的虚拟机列表
  const [availableVMs] = useState([
    { id: 'vm-001', name: 'web-server-01', privateIp: '172.16.0.10' },
    { id: 'vm-002', name: 'web-server-02', privateIp: '172.16.0.11' },
    { id: 'vm-003', name: 'web-server-03', privateIp: '172.16.0.12' },
    { id: 'vm-004', name: 'api-server-01', privateIp: '172.16.0.20' },
    { id: 'vm-005', name: 'api-server-02', privateIp: '172.16.0.21' },
    { id: 'vm-006', name: 'backend-server-01', privateIp: '172.16.0.30' }
  ])

  const [listenerModalOpen, setListenerModalOpen] = useState(false)
  const [selectedProtocol, setSelectedProtocol] = useState<string | undefined>(undefined)
  
  // 编辑状态
  const [editingListener, setEditingListener] = useState<ListenerRule | null>(null)
  const [editingServerGroup, setEditingServerGroup] = useState<ServerGroup | null>(null)
  
  // 控制是否显示创建服务器组页面
  const [showCreateServerGroup, setShowCreateServerGroup] = useState(false)
  
  // 转发策略配置相关状态
  const [forwardingPolicyModalOpen, setForwardingPolicyModalOpen] = useState(false)
  const [currentListenerRule, setCurrentListenerRule] = useState<ListenerRule | null>(null)
  
  // 监听规则详情相关状态
  const [listenerDetailModalOpen, setListenerDetailModalOpen] = useState(false)
  const [selectedListenerDetail, setSelectedListenerDetail] = useState<ListenerRule | null>(null)
  
  // 转发规则列表（临时存储，用于批量添加）
  interface ForwardingRule {
    id: string
    domain: string
    path: string
    serverGroup: string
    remark?: string
  }
  const [forwardingRules, setForwardingRules] = useState<ForwardingRule[]>([])
  
  // 域名组列表（每个域名组包含多个路径规则）
  interface DomainGroup {
    id: string
    domain: string
    pathRules: PathRule[]
  }
  
  interface PathRule {
    id: string
    path: string
    serverGroup: string
    remark?: string
  }
  
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>([
    {
      id: `domain-${Date.now()}`,
      domain: '',
      pathRules: [
        { id: `path-${Date.now()}`, path: '', serverGroup: '', remark: '' }
      ]
    }
  ])
  
  const [listenerForm] = Form.useForm<{ name: string; protocol: string; port: number; certificate?: string; serverGroup: string; healthCheck: string }>()
  const [forwardingPolicyForm] = Form.useForm<{ domain: string; path: string; serverGroup: string; remark?: string }>()
  const [groupForm] = Form.useForm<{ name: string; serverCount: number }>()

  // 监听规则列定义
  const listenerColumns: ColumnsType<ListenerRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ListenerRule) => (
        <Typography.Link 
          onClick={() => {
            setSelectedListenerDetail(record)
            setListenerDetailModalOpen(true)
          }}
        >
          {name}
        </Typography.Link>
      )
    },
    {
      title: '前端协议/端口',
      key: 'protocolPort',
      render: (_: unknown, record: ListenerRule) => (
        <span>
          <Tag color="blue" bordered={false}>{record.protocol}</Tag>
          <span style={{ margin: '0 4px' }}>:</span>
          <span>{record.port}</span>
        </span>
      )
    },
    {
      title: '后端协议',
      dataIndex: 'protocol',
      key: 'backendProtocol',
      render: (protocol: string) => {
        // HTTP 和 HTTPS 的后端协议都是 HTTP，其他协议保持不变
        const backendProtocol = (protocol === 'HTTP' || protocol === 'HTTPS') ? 'HTTP' : protocol
        return <Tag color="green" bordered={false}>{backendProtocol}</Tag>
      }
    },
    {
      title: '证书',
      dataIndex: 'certificate',
      key: 'certificate',
      render: (cert: string | undefined) => cert || '-'
    },
    {
      title: '服务器组',
      dataIndex: 'serverGroup',
      key: 'serverGroup'
    },
    {
      title: '健康检查',
      dataIndex: 'healthCheck',
      key: 'healthCheck',
      render: (healthCheck: string) => (
        <Tag color={healthCheck === 'enabled' ? 'success' : 'default'} bordered={false}>
          {healthCheck === 'enabled' ? '已启用' : '未启用'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag 
          color={
            status === 'running' ? 'success' :
            status === 'stopped' ? 'default' :
            'processing'
          } 
          bordered={false}
        >
          {status === 'running' ? '运行中' :
           status === 'stopped' ? '已停止' :
           status === 'starting' ? '启动中' : '停止中'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ListenerRule) => (
        <Space size="small">
          {/* 启动/停止按钮 */}
          {record.status === 'running' && (
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleStopListener(record.id)}
            >
              停止
            </Button>
          )}
          {record.status === 'stopped' && (
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleStartListener(record.id)}
            >
              启动
            </Button>
          )}
          {(record.status === 'starting' || record.status === 'stopping') && (
            <Button 
              type="link" 
              size="small" 
              loading
              disabled
            >
              {record.status === 'starting' ? '启动中' : '停止中'}
            </Button>
          )}
          
          <Button 
            type="link" 
            size="small" 
            onClick={() => {
              setCurrentListenerRule(record)
              setForwardingPolicyModalOpen(true)
            }}
          >
            配置转发策略
          </Button>
          <Button 
            type="link" 
            size="small" 
            onClick={() => handleEditListener(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条监听规则吗？"
            onConfirm={() => handleDeleteListener(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // 获取关联的转发策略（基于监听规则ID）
  const getRelatedPolicies = (groupName: string): string[] => {
    return policies
      .filter(p => p.serverGroup === groupName)
      .map(p => `${p.domain}${p.path}`)
  }

  // 获取关联的监听规则
  const getRelatedListeners = (groupName: string): string[] => {
    return listeners
      .filter(l => l.serverGroup === groupName)
      .map(l => l.name)
  }

  // 虚拟服务器组列定义
  const groupColumns: ColumnsType<ServerGroup> = [
    {
      title: '服务组名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
    {
      title: '关联转发策略',
      key: 'relatedPolicies',
      width: 200,
      render: (_: unknown, record: ServerGroup) => {
        const relatedPolicies = getRelatedPolicies(record.name)
        return relatedPolicies.length > 0 ? (
          <Space size={[0, 4]} wrap>
            {relatedPolicies.map(policy => (
              <Tag key={policy} color="blue">{policy}</Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      }
    },
    {
      title: '关联监听',
      key: 'relatedListeners',
      width: 200,
      render: (_: unknown, record: ServerGroup) => {
        const relatedListeners = getRelatedListeners(record.name)
        return relatedListeners.length > 0 ? (
          <Space size={[0, 4]} wrap>
            {relatedListeners.map(listener => (
              <Tag key={listener} color="green">{listener}</Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      }
    },
    {
      title: '服务器数量',
      dataIndex: 'serverCount',
      key: 'serverCount',
      width: 120,
      render: (count: number) => `${count} 台`
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: ServerGroup) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            onClick={() => handleEditServerGroup(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个服务器组吗？"
            onConfirm={() => handleDeleteGroup(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // 服务器详情列定义（用于展开行）
  const serverDetailColumns: ColumnsType<ServerConfig> = [
    {
      title: '服务器名称',
      dataIndex: 'vmName',
      key: 'vmName',
      width: 200
    },
    {
      title: '内网IP',
      dataIndex: 'privateIp',
      key: 'privateIp',
      width: 150,
      render: (ip: string) => (
        <span style={{ fontFamily: 'monospace' }}>{ip}</span>
      )
    },
    {
      title: '端口',
      key: 'ports',
      width: 150,
      render: (_: unknown, record: ServerConfig) => (
        <Space size={[0, 4]} wrap>
          {record.ports.map(port => (
            <Tag key={port.id}>{port.port}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '权重',
      key: 'weights',
      width: 150,
      render: (_: unknown, record: ServerConfig) => (
        <Space size={[0, 4]} wrap>
          {record.ports.map(port => (
            <Tag key={port.id} color="blue">{port.weight}</Tag>
          ))}
        </Space>
      )
    }
  ]

  // 添加监听规则
  const handleAddListener = async (): Promise<void> => {
    try {
      const values = await listenerForm.validateFields()
      
      if (editingListener) {
        // 编辑模式：更新现有监听规则
        const updatedListeners = listeners.map(listener =>
          listener.id === editingListener.id
            ? {
                ...listener,
                name: values.name,
                protocol: values.protocol as 'HTTP' | 'HTTPS' | 'TCP' | 'UDP',
                port: values.port,
                certificate: values.certificate,
                serverGroup: values.serverGroup,
                healthCheck: values.healthCheck as 'enabled' | 'disabled'
              }
            : listener
        )
        setListeners(updatedListeners)
        message.success('监听规则更新成功')
      } else {
        // 新增模式：添加新监听规则
        const newListener: ListenerRule = {
          id: `listener-${Date.now()}`,
          name: values.name,
          protocol: values.protocol as 'HTTP' | 'HTTPS' | 'TCP' | 'UDP',
          port: values.port,
          certificate: values.certificate,
          serverGroup: values.serverGroup,
          healthCheck: values.healthCheck as 'enabled' | 'disabled',
          status: 'running'
        }
        setListeners([...listeners, newListener])
        message.success('监听规则添加成功')
      }
      
      setListenerModalOpen(false)
      listenerForm.resetFields()
      setSelectedProtocol(undefined)
      setSelectedServerGroup(undefined)
      setEditingListener(null)
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  // 打开编辑监听规则Modal
  const handleEditListener = (listener: ListenerRule): void => {
    setEditingListener(listener)
    listenerForm.setFieldsValue({
      name: listener.name,
      protocol: listener.protocol,
      port: listener.port,
      certificate: listener.certificate,
      serverGroup: listener.serverGroup,
      healthCheck: listener.healthCheck
    })
    setSelectedProtocol(listener.protocol)
    setSelectedServerGroup(listener.serverGroup)
    setListenerModalOpen(true)
  }

  // 启动监听规则
  const handleStartListener = (id: string): void => {
    // 更新状态为 starting
    setListeners(prev => prev.map(l => 
      l.id === id ? { ...l, status: 'starting' as const } : l
    ))
    
    // 模拟启动过程
    setTimeout(() => {
      setListeners(prev => prev.map(l => 
        l.id === id ? { ...l, status: 'running' as const } : l
      ))
      message.success('监听规则已启动')
    }, 1500)
  }

  // 停止监听规则
  const handleStopListener = (id: string): void => {
    // 更新状态为 stopping
    setListeners(prev => prev.map(l => 
      l.id === id ? { ...l, status: 'stopping' as const } : l
    ))
    
    // 模拟停止过程
    setTimeout(() => {
      setListeners(prev => prev.map(l => 
        l.id === id ? { ...l, status: 'stopped' as const } : l
      ))
      message.success('监听规则已停止')
    }, 1500)
  }

  // 删除监听规则
  const handleDeleteListener = (id: string): void => {
    setListeners(listeners.filter(l => l.id !== id))
    message.success('删除成功')
  }

  // 添加新的域名组
  const handleAddDomainGroup = (): void => {
    setDomainGroups([...domainGroups, {
      id: `domain-${Date.now()}`,
      domain: '',
      pathRules: [
        { id: `path-${Date.now()}`, path: '', serverGroup: '', remark: '' }
      ]
    }])
  }

  // 删除域名组
  const handleRemoveDomainGroup = (domainId: string): void => {
    if (domainGroups.length === 1) {
      message.warning('至少保留一个域名')
      return
    }
    setDomainGroups(domainGroups.filter(d => d.id !== domainId))
  }

  // 更新域名
  const handleUpdateDomain = (domainId: string, value: string): void => {
    setDomainGroups(domainGroups.map(group =>
      group.id === domainId ? { ...group, domain: value } : group
    ))
  }

  // 添加新的路径规则到指定域名组
  const handleAddPathRule = (domainId: string): void => {
    setDomainGroups(domainGroups.map(group =>
      group.id === domainId ? {
        ...group,
        pathRules: [...group.pathRules, {
          id: `path-${Date.now()}`,
          path: '',
          serverGroup: '',
          remark: ''
        }]
      } : group
    ))
  }

  // 删除路径规则
  const handleRemovePathRule = (domainId: string, pathId: string): void => {
    setDomainGroups(domainGroups.map(group => {
      if (group.id === domainId) {
        if (group.pathRules.length === 1) {
          message.warning('至少保留一条路径规则')
          return group
        }
        return {
          ...group,
          pathRules: group.pathRules.filter(p => p.id !== pathId)
        }
      }
      return group
    }))
  }

  // 更新路径规则
  const handleUpdatePathRule = (domainId: string, pathId: string, field: keyof PathRule, value: string): void => {
    setDomainGroups(domainGroups.map(group =>
      group.id === domainId ? {
        ...group,
        pathRules: group.pathRules.map(rule =>
          rule.id === pathId ? { ...rule, [field]: value } : rule
        )
      } : group
    ))
  }

  // 检查是否有验证错误
  const hasValidationErrors = (): boolean => {
    // 检查是否有域名为空
    const hasEmptyDomain = domainGroups.some(group => !group.domain.trim())
    if (hasEmptyDomain) return true

    // 检查域名格式
    const hasDomainError = domainGroups.some(group => 
      group.domain && !/^(\*\.[\w-]+\.[\w-]+|[\w-]+\.[\w-]+(\.[a-z]+)*)$/.test(group.domain)
    )
    if (hasDomainError) return true

    // 检查是否至少有一个服务器组
    const hasNoServerGroup = domainGroups.every(group =>
      group.pathRules.every(rule => !rule.serverGroup.trim())
    )
    if (hasNoServerGroup) return true

    // 检查URL格式（如果填写了）
    const hasPathError = domainGroups.some(group =>
      group.pathRules.some(rule =>
        rule.path && rule.path.trim() && 
        (!/^\/[a-zA-Z0-9\-\/.%?#&]{1,79}$/.test(rule.path) || rule.path === '/')
      )
    )
    if (hasPathError) return true

    return false
  }

  // 添加转发规则到列表
  const handleAddForwardingRule = (): void => {
    const allRules: ForwardingRule[] = []

    // 验证并收集所有有效的规则
    for (const group of domainGroups) {
      if (!group.domain.trim()) {
        message.error('请填写所有域名')
        return
      }

      const validPathRules = group.pathRules.filter(rule =>
        rule.serverGroup.trim()  // URL可以为空，只需服务器组必填
      )

      if (validPathRules.length === 0) {
        message.error(`域名 ${group.domain} 至少需要选择一个服务器组`)
        return
      }

      validPathRules.forEach(pathRule => {
        allRules.push({
          id: `rule-${Date.now()}-${Math.random()}`,
          domain: group.domain,
          path: pathRule.path,
          serverGroup: pathRule.serverGroup,
          remark: pathRule.remark
        })
      })
    }

    if (allRules.length === 0) {
      message.error('请至少完成一条转发规则')
      return
    }

    setForwardingRules([...forwardingRules, ...allRules])
    
    // 重置表单
    setDomainGroups([{
      id: `domain-${Date.now()}`,
      domain: '',
      pathRules: [
        { id: `path-${Date.now()}`, path: '', serverGroup: '', remark: '' }
      ]
    }])
    
    message.success(`已添加 ${allRules.length} 条转发规则`)
  }

  // 删除转发规则
  const handleRemoveForwardingRule = (id: string): void => {
    setForwardingRules(forwardingRules.filter(r => r.id !== id))
  }

  // 保存所有转发规则
  const handleSaveForwardingPolicies = (): void => {
    if (!currentListenerRule) {
      message.error('未选择监听规则')
      return
    }

    if (forwardingRules.length === 0) {
      message.error('请至少添加一条转发规则')
      return
    }

    // 将所有规则保存为策略
    const newPolicies = forwardingRules.map(rule => ({
      id: `policy-${Date.now()}-${rule.id}`,
      listenerId: currentListenerRule.id,
      domain: rule.domain,
      path: rule.path,
      serverGroup: rule.serverGroup,
      remark: rule.remark
    }))
    
    setPolicies([...policies, ...newPolicies])
    setForwardingPolicyModalOpen(false)
    setForwardingRules([])
    forwardingPolicyForm.resetFields()
    setCurrentListenerRule(null)
    message.success(`已成功配置 ${newPolicies.length} 条转发策略`)
  }

  // 关闭转发策略配置弹窗
  const handleCloseForwardingPolicyModal = (): void => {
    setForwardingPolicyModalOpen(false)
    setForwardingRules([])
    setDomainGroups([{
      id: `domain-${Date.now()}`,
      domain: '',
      pathRules: [
        { id: `path-${Date.now()}`, path: '', serverGroup: '', remark: '' }
      ]
    }])
    forwardingPolicyForm.resetFields()
    setCurrentListenerRule(null)
  }

  // 删除转发策略
  const handleDeletePolicy = (id: string): void => {
    setPolicies(policies.filter(p => p.id !== id))
    message.success('删除成功')
  }


  // 添加服务器组 - 提交处理
  const handleCreateServerGroup = (data: { name: string; servers: ServerConfig[] }): void => {
    if (editingServerGroup) {
      // 编辑模式：更新现有服务器组
      const updatedGroups = serverGroups.map(group =>
        group.id === editingServerGroup.id
          ? {
              ...group,
              name: data.name,
              serverCount: data.servers.length,
              servers: data.servers
            }
          : group
      )
      setServerGroups(updatedGroups)
      message.success('虚拟服务器组更新成功')
    } else {
      // 新增模式：创建新服务器组
      const newGroup: ServerGroup = {
        id: `sg-${Date.now()}`,
        name: data.name,
        serverCount: data.servers.length,
        healthCheck: 'enabled',
        servers: data.servers
      }
      setServerGroups([...serverGroups, newGroup])
      message.success('服务器组添加成功')
    }
    
    setShowCreateServerGroup(false)
    setEditingServerGroup(null)
  }

  // 打开编辑服务器组页面
  const handleEditServerGroup = (group: ServerGroup): void => {
    setEditingServerGroup(group)
    setShowCreateServerGroup(true)
  }

  // 删除服务器组
  const handleDeleteGroup = (id: string): void => {
    setServerGroups(serverGroups.filter(g => g.id !== id))
    message.success('删除成功')
  }

  // 如果显示创建服务器组页面，则渲染创建页面
  if (showCreateServerGroup) {
    return (
      <CreateServerGroup
        onBack={() => {
          setShowCreateServerGroup(false)
          setEditingServerGroup(null)
        }}
        onSubmit={handleCreateServerGroup}
        editingGroup={editingServerGroup ? {
          name: editingServerGroup.name,
          servers: editingServerGroup.servers
        } : null}
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>
        <Title level={3} style={{ margin: 0 }}>{loadBalancer.name}</Title>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs
          items={[
            {
              key: 'listeners',
              label: '监听规则',
              children: (
                <div>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setListenerModalOpen(true)}
                    >
                      新增监听规则
                    </Button>
                  </div>
                  <Table
                    columns={listenerColumns}
                    dataSource={listeners}
                    rowKey="id"
                    pagination={false}
                  />
                </div>
              )
            },
            {
              key: 'groups',
              label: '虚拟服务器组',
              children: (
                <div>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateServerGroup(true)}
                    >
                      新增服务器组
                    </Button>
                  </div>
                  <Table
                    columns={groupColumns}
                    dataSource={serverGroups}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1000 }}
                    expandable={{
                      expandedRowRender: (record: ServerGroup) => (
                        <div style={{ padding: '0 48px' }}>
                          <Table
                            columns={serverDetailColumns}
                            dataSource={record.servers}
                            rowKey="vmId"
                            pagination={false}
                            size="small"
                            bordered
                          />
                        </div>
                      ),
                      rowExpandable: (record: ServerGroup) => record.servers && record.servers.length > 0
                    }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 添加监听规则Modal */}
      <Modal
        title={editingListener ? "编辑监听规则" : "新增监听规则"}
        open={listenerModalOpen}
        onCancel={() => {
          setListenerModalOpen(false)
          listenerForm.resetFields()
          setSelectedProtocol(undefined)
          setSelectedServerGroup(undefined)
          setEditingListener(null)
        }}
        onOk={handleAddListener}
        okText="确认配置并确定"
        cancelText="取消"
        width={600}
      >
        <Form 
          form={listenerForm} 
          layout="vertical"
          initialValues={{
            healthCheck: 'enabled'
          }}
        >
          <Form.Item
            name="protocol"
            label="监听协议"
            rules={[{ required: true, message: '请选择监听协议' }]}
          >
            <Select 
              placeholder="请选择监听协议"
              onChange={(value: string) => setSelectedProtocol(value)}
            >
              <Select.Option value="HTTP">HTTP</Select.Option>
              <Select.Option value="HTTPS">HTTPS</Select.Option>
              <Select.Option value="TCP">TCP</Select.Option>
              <Select.Option value="UDP">UDP</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="port"
            label="监听端口"
            rules={[
              { required: true, message: '请输入监听端口' },
              { type: 'number', min: 1, max: 65535, message: '端口范围必须在 1-65535 之间' }
            ]}
            extra="端口范围：1-65535"
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="例如：80" />
          </Form.Item>

          <Form.Item
            name="name"
            label="监听名称"
            rules={[
              { required: true, message: '请输入监听名称' },
              { 
                pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, 
                message: '仅支持英文大小写、下划线，且必须以字母或下划线开头' 
              }
            ]}
            extra="支持英文大小写、下划线（_）"
          >
            <Input placeholder="例如：HTTP_Listener_80" />
          </Form.Item>

          {/* HTTPS时显示证书选择 */}
          {selectedProtocol === 'HTTPS' && (
            <Form.Item
              name="certificate"
              label="SSL证书"
              rules={[{ required: true, message: '请选择SSL证书' }]}
            >
              <Select placeholder="请选择SSL证书">
                {certificates.map(cert => (
                  <Select.Option key={cert.value} value={cert.value}>
                    {cert.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            label="后端服务器类型"
            extra="默认为虚拟服务器组，不可修改"
          >
            <Input disabled value="虚拟服务器组" />
          </Form.Item>

          <Form.Item
            name="serverGroup"
            label="选择服务器组"
            rules={[{ required: true, message: '请选择服务器组' }]}
          >
            <Select 
              placeholder="请选择服务器组"
              onChange={(value: string) => setSelectedServerGroup(value)}
            >
              {availableServerGroups.map(group => (
                <Select.Option key={group.value} value={group.value}>
                  {group.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 显示选中服务器组的虚拟机 */}
          {selectedServerGroup && (
            <div style={{ 
              marginBottom: 16, 
              padding: '12px', 
              background: '#f5f5f5', 
              borderRadius: '6px' 
            }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: 8 }}>
                服务器组内的虚拟机：
              </div>
              <Space wrap>
                {availableServerGroups
                  .find(g => g.value === selectedServerGroup)
                  ?.vms.map(vm => (
                    <Tag key={vm} bordered={false} color="blue">{vm}</Tag>
                  ))}
              </Space>
            </div>
          )}

          <Form.Item
            name="healthCheck"
            label="健康检查"
            rules={[{ required: true, message: '请选择是否开启健康检查' }]}
          >
            <Select placeholder="请选择是否开启健康检查">
              <Select.Option value="enabled">开启</Select.Option>
              <Select.Option value="disabled">关闭</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 配置转发策略Modal */}
      <Modal
        title={`配置转发策略 - ${currentListenerRule?.name || ''}`}
        open={forwardingPolicyModalOpen}
        onCancel={handleCloseForwardingPolicyModal}
        footer={[
          <Button key="cancel" onClick={handleCloseForwardingPolicyModal}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveForwardingPolicies}>
            保存全部
          </Button>
        ]}
        width={900}
      >
        <div style={{ 
          background: '#f0f5ff', 
          border: '1px solid #adc6ff', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: 16,
          fontSize: '13px',
          lineHeight: '1.8'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1890ff' }}>转发规则说明：</div>
          <div><strong>* 域名规范：</strong></div>
          <div style={{ marginLeft: 16 }}>
            - 泛解析域名：<code>*.test.com</code>，*一定在第一个字符，并且是*.或者*aaa.的格式，*不能在最后。<br />
            - 标准域名：<code>www.test.com</code>。
          </div>
          <div style={{ marginTop: 8 }}><strong>* URL规范（可选）：</strong></div>
          <div style={{ marginLeft: 16 }}>
            - 长度限制为2-80个字符<br />
            - 只能使用字母、数字和 <code>-/.%?#&</code> 这些字符<br />
            - URL不能只为 <code>/</code>，但必须以 <code>/</code> 开头<br />
            - URL可以为空，表示转发所有路径
          </div>
          <div style={{ color: '#ff4d4f', marginTop: 8, fontWeight: 600 }}>
            * 域名必填，每个域名至少需要选择一个虚拟服务器组
          </div>
        </div>

        {/* 添加规则表单 - 表格形式 */}
        <Card 
          title="添加转发规则" 
          size="small" 
          style={{ marginBottom: 16 }}
          extra={
            <Space>
              <Button type="link" icon={<PlusOutlined />} onClick={handleAddDomainGroup}>
                添加域名
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddForwardingRule}
                danger={hasValidationErrors()}
                disabled={hasValidationErrors()}
              >
                添加到列表
              </Button>
            </Space>
          }
        >
          {/* 表头 */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            padding: '12px', 
            background: '#fafafa',
            borderRadius: '4px 4px 0 0',
            borderBottom: '1px solid #e8e8e8',
            fontWeight: 500
          }}>
            <div style={{ flex: 1 }}>域名</div>
            <div style={{ flex: 1 }}>URL</div>
            <div style={{ flex: 1.2 }}>虚拟服务器组</div>
            <div style={{ flex: 1.5 }}>备注</div>
            <div style={{ width: 80 }}>操作</div>
          </div>

          {/* 表格内容 */}
          <div style={{ border: '1px solid #e8e8e8', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            {domainGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {group.pathRules.map((pathRule, pathIndex) => (
                  <div key={pathRule.id}>
                    {/* 数据行 */}
                    <div 
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        borderBottom: '1px solid #f0f0f0',
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* 域名列 - 只在第一行显示 */}
                      <div style={{ flex: 1 }}>
                        {pathIndex === 0 && (
                          <div>
                            <Input
                              value={group.domain}
                              onChange={(e) => handleUpdateDomain(group.id, e.target.value)}
                              placeholder="例如：www.test.com"
                              status={group.domain && !/^(\*\.[\w-]+\.[\w-]+|[\w-]+\.[\w-]+(\.[a-z]+)*)$/.test(group.domain) ? 'error' : ''}
                            />
                            {group.domain && !/^(\*\.[\w-]+\.[\w-]+|[\w-]+\.[\w-]+(\.[a-z]+)*)$/.test(group.domain) && (
                              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                                域名格式不正确
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* URL列 */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#999', fontWeight: 'bold' }}>/</span>
                          <Input
                            value={pathRule.path}
                            onChange={(e) => handleUpdatePathRule(group.id, pathRule.id, 'path', e.target.value)}
                            placeholder="例如：/api/*（可选）"
                            style={{ flex: 1 }}
                            status={pathRule.path && pathRule.path.trim() && (!/^\/[a-zA-Z0-9\-\/.%?#&]{1,79}$/.test(pathRule.path) || pathRule.path === '/') ? 'error' : ''}
                          />
                        </div>
                        {pathRule.path && pathRule.path.trim() && (!/^\/[a-zA-Z0-9\-\/.%?#&]{1,79}$/.test(pathRule.path) || pathRule.path === '/') && (
                          <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                            {pathRule.path === '/' ? 'URL不能只为/' : 'URL格式不正确（2-80字符，必须以/开头）'}
                          </div>
                        )}
                      </div>

                      {/* 虚拟服务器组列 */}
                      <div style={{ flex: 1.2 }}>
                        <Select
                          value={pathRule.serverGroup || undefined}
                          onChange={(value) => handleUpdatePathRule(group.id, pathRule.id, 'serverGroup', value)}
                          placeholder=""
                          style={{ width: '100%' }}
                        >
                          {serverGroups.map(serverGroup => (
                            <Select.Option key={serverGroup.id} value={serverGroup.name}>
                              {serverGroup.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>

                      {/* 备注列 */}
                      <div style={{ flex: 1.5 }}>
                        <Input
                          value={pathRule.remark}
                          onChange={(e) => handleUpdatePathRule(group.id, pathRule.id, 'remark', e.target.value)}
                          placeholder="请输入备注"
                          maxLength={200}
                        />
                      </div>

                      {/* 操作列 */}
                      <div style={{ width: 80 }}>
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => handleRemovePathRule(group.id, pathRule.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>

                    {/* 在最后一行下方显示"添加规则"按钮 */}
                    {pathIndex === group.pathRules.length - 1 && (
                      <div style={{ 
                        display: 'flex',
                        gap: '12px',
                        padding: '0 12px 12px 12px',
                        borderBottom: groupIndex === domainGroups.length - 1 ? 'none' : '1px solid #f0f0f0'
                      }}>
                        <div style={{ flex: 1 }}></div>
                        <div style={{ flex: 1 }}>
                          <Button
                            type="link"
                            icon={<PlusOutlined />}
                            onClick={() => handleAddPathRule(group.id)}
                            style={{ padding: 0 }}
                          >
                            添加规则
                          </Button>
                        </div>
                        <div style={{ flex: 1.2 }}></div>
                        <div style={{ flex: 1.5 }}></div>
                        <div style={{ width: 80 }}></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* 已添加的规则列表 */}
        {forwardingRules.length > 0 && (
          <Card title={`已添加的规则 (${forwardingRules.length})`} size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                // 按域名分组
                const groupedRules: { [domain: string]: ForwardingRule[] } = {}
                forwardingRules.forEach(rule => {
                  const domain = rule.domain || '-'
                  if (!groupedRules[domain]) {
                    groupedRules[domain] = []
                  }
                  groupedRules[domain].push(rule)
                })

                return Object.entries(groupedRules).map(([domain, rules]) => (
                  <div key={domain} style={{ marginBottom: 8 }}>
                    {rules.map((rule, ruleIndex) => (
                      <div 
                        key={rule.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: '#fafafa',
                          borderRadius: '4px',
                          border: '1px solid #e8e8e8',
                          marginBottom: ruleIndex < rules.length - 1 ? '4px' : '0'
                        }}
                      >
                        <Text type="secondary" strong style={{ minWidth: 60 }}>
                          {ruleIndex === 0 ? `域名 ${Object.keys(groupedRules).indexOf(domain) + 1}` : ''}
                        </Text>
                        <div style={{ flex: 1 }}>
                          {ruleIndex === 0 && (
                            <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                              {rule.domain || '-'}
                            </Tag>
                          )}
                        </div>
                        <div style={{ color: '#999', fontSize: 16, fontWeight: 'bold' }}>/</div>
                        <div style={{ flex: 1 }}>
                          <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                            {rule.path || '-'}
                          </Tag>
                        </div>
                        <div style={{ flex: 1.2 }}>
                          <Tag color="green">{rule.serverGroup}</Tag>
                        </div>
                        <div style={{ flex: 1.5 }}>
                          <Text type="secondary">{rule.remark || '-'}</Text>
                        </div>
                        <Button 
                          type="text" 
                          danger 
                          size="small" 
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveForwardingRule(rule.id)}
                        >
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                ))
              })()}
            </div>
          </Card>
        )}
      </Modal>

      {/* 监听规则详情Modal */}
      <Modal
        title="监听规则详情"
        open={listenerDetailModalOpen}
        onCancel={() => {
          setListenerDetailModalOpen(false)
          setSelectedListenerDetail(null)
        }}
        footer={[
          <Button key="close" onClick={() => setListenerDetailModalOpen(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedListenerDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 基本信息 */}
            <Card title="基本信息" size="small">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>规则名称：</Text>
                  <Text>{selectedListenerDetail.name}</Text>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>前端协议：</Text>
                  <Tag color="blue" bordered={false}>{selectedListenerDetail.protocol}</Tag>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>后端协议：</Text>
                  <Tag color="green" bordered={false}>
                    {(selectedListenerDetail.protocol === 'HTTP' || selectedListenerDetail.protocol === 'HTTPS') ? 'HTTP' : selectedListenerDetail.protocol}
                  </Tag>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>监听端口：</Text>
                  <Text>{selectedListenerDetail.port}</Text>
                </div>
                {selectedListenerDetail.certificate && (
                  <div style={{ display: 'flex' }}>
                    <Text strong style={{ width: 120 }}>证书：</Text>
                    <Text>{selectedListenerDetail.certificate}</Text>
                  </div>
                )}
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>服务器组：</Text>
                  <Text>{selectedListenerDetail.serverGroup}</Text>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>健康检查：</Text>
                  <Tag color={selectedListenerDetail.healthCheck === 'enabled' ? 'success' : 'default'} bordered={false}>
                    {selectedListenerDetail.healthCheck === 'enabled' ? '已启用' : '未启用'}
                  </Tag>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>状态：</Text>
                  <Tag 
                    color={
                      selectedListenerDetail.status === 'running' ? 'success' :
                      selectedListenerDetail.status === 'stopped' ? 'default' :
                      'processing'
                    } 
                    bordered={false}
                  >
                    {selectedListenerDetail.status === 'running' ? '运行中' :
                     selectedListenerDetail.status === 'stopped' ? '已停止' :
                     selectedListenerDetail.status === 'starting' ? '启动中' : '停止中'}
                  </Tag>
                </div>
              </div>
            </Card>

            {/* 关联的转发策略 */}
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>关联的转发策略</span>
                  <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                    共 {policies.filter((p: ForwardingPolicy) => p.listenerId === selectedListenerDetail.id).length} 条
                  </Text>
                </div>
              } 
              size="small"
            >
              {(() => {
                const relatedPolicies = policies.filter((p: ForwardingPolicy) => p.listenerId === selectedListenerDetail.id)
                
                if (relatedPolicies.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                      暂无关联的转发策略
                    </div>
                  )
                }
                
                return (
                  <Table
                    dataSource={relatedPolicies}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '域名',
                        dataIndex: 'domain',
                        key: 'domain',
                        render: (domain: string) => (
                          <Tag color="blue" style={{ fontFamily: 'monospace' }}>{domain}</Tag>
                        )
                      },
                      {
                        title: 'URL',
                        dataIndex: 'path',
                        key: 'path',
                        render: (path: string) => (
                          <Tag color="blue" style={{ fontFamily: 'monospace' }}>{path}</Tag>
                        )
                      },
                      {
                        title: '服务器组',
                        dataIndex: 'serverGroup',
                        key: 'serverGroup',
                        render: (group: string) => (
                          <Tag color="green">{group}</Tag>
                        )
                      },
                      {
                        title: '备注',
                        dataIndex: 'remark',
                        key: 'remark',
                        render: (remark: string) => remark || '-'
                      }
                    ]}
                  />
                )
              })()}
            </Card>
          </div>
        )}
      </Modal>

    </div>
  )
}


