'use client'

import React, { useState, useEffect } from 'react'
import type { SystemServerGroup, SystemForwardingPolicy } from '../VirtualMachine/VirtualMachineList'
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
  Tag,
  Steps,
  Radio,
  Divider,
  Tooltip
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
  serverGroup: string // 虚拟机组
  healthCheck: 'enabled' | 'disabled' // 健康检查
  status: 'running' | 'stopped' | 'starting' | 'stopping'
}

// 转发策略类型
interface ForwardingPolicy {
  id: string
  listenerId: string // 关联的监听规则ID
  domain: string
  path: string
  serverGroup: string // 虚拟机组
  remark?: string // 备注
}

// 虚拟机组类型
interface ServerGroup {
  id: string
  name: string
  serverCount: number
  healthCheck: 'enabled' | 'disabled'
  servers: ServerConfig[] // 虚拟机配置列表
  /** 系统托管（由开启公网等操作自动创建） */
  isSystemManaged?: boolean
}

// 虚拟机配置类型
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
  /** 开启公网时创建的系统托管虚拟机组，合并显示在虚拟机组列表中 */
  systemManagedServerGroups?: SystemServerGroup[]
  /** 开启公网时生成的系统托管转发策略 */
  systemManagedPolicies?: SystemForwardingPolicy[]
  /** 解除系统托管后的回调，从父级移除该虚机组 */
  onReleaseSystemManaged?: (group: SystemServerGroup) => void
}

export default function LoadBalancerDetails({ loadBalancer, onBack, systemManagedServerGroups = [], systemManagedPolicies = [], onReleaseSystemManaged }: LoadBalancerDetailsProps) {
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
      serverGroup: 'web-server-group',
      healthCheck: 'enabled',
      status: 'running'
    }
  ])

  // 可用的虚拟机组（包含虚拟机信息）
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

  // 选中的虚拟机组
  const [selectedServerGroup, setSelectedServerGroup] = useState<string | undefined>(undefined)

  // 转发策略数据（关联到监听规则）
  const [policies, setPolicies] = useState<ForwardingPolicy[]>([
    {
      id: 'policy-1',
      listenerId: 'listener-1',
      domain: 'www.example.com',
      path: '/api',
      serverGroup: 'web-server-group'
    }
  ])

  // 虚拟机组数据
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
  
  // 控制是否显示创建虚拟机组页面
  const [showCreateServerGroup, setShowCreateServerGroup] = useState(false)
  
  // 转发策略配置相关状态
  const [forwardingPolicyModalOpen, setForwardingPolicyModalOpen] = useState(false)
  const [currentListenerRule, setCurrentListenerRule] = useState<ListenerRule | null>(null)
  
  // 监听规则详情相关状态
  const [listenerDetailModalOpen, setListenerDetailModalOpen] = useState(false)
  const [selectedListenerDetail, setSelectedListenerDetail] = useState<ListenerRule | null>(null)
  // 解除系统托管二次确认弹窗
  const [releaseConfirmTarget, setReleaseConfirmTarget] = useState<ServerGroup | null>(null)
  
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
    isSystemManaged?: boolean
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
  
  // 监听配置转发策略Modal打开，初始化已有策略（含系统托管策略）
  useEffect(() => {
    if (forwardingPolicyModalOpen && currentListenerRule) {
      // 获取当前监听规则的所有转发策略（含开启公网生成的系统托管策略）
      const listenerPolicies = [
        ...policies.filter(p => p.listenerId === currentListenerRule.id),
        ...systemManagedPolicies.filter(p => p.listenerId === currentListenerRule.id)
      ]
      
      if (listenerPolicies.length > 0) {
        // 按域名分组
        const domainMap = new Map<string, typeof listenerPolicies>()
        listenerPolicies.forEach(policy => {
          const existing = domainMap.get(policy.domain) || []
          domainMap.set(policy.domain, [...existing, policy])
        })
        
        // 转换为 domainGroups 格式，标记系统托管策略
        const initialDomainGroups: DomainGroup[] = Array.from(domainMap.entries()).map(([domain, domainPolicies]) => ({
          id: `domain-${Date.now()}-${Math.random()}`,
          domain,
          pathRules: domainPolicies.map(p => ({
            id: p.id,
            path: p.path || '',
            serverGroup: p.serverGroup,
            remark: p.remark || '',
            isSystemManaged: !!(p as { isSystemManaged?: boolean }).isSystemManaged
          }))
        }))
        
        setDomainGroups(initialDomainGroups)
      } else {
        // 如果没有转发策略，初始化为默认域名和当前监听规则的虚拟机组
        setDomainGroups([
          {
            id: `domain-${Date.now()}`,
            domain: 'appid-clb.pro.g123-cpp.com',
            pathRules: [
              { id: `path-${Date.now()}`, path: '', serverGroup: currentListenerRule.serverGroup, remark: '' }
            ]
          }
        ])
      }
    }
  }, [forwardingPolicyModalOpen, currentListenerRule, policies, systemManagedPolicies])
  const [forwardingPolicyForm] = Form.useForm<{ domain: string; path: string; serverGroup: string; remark?: string }>()
  const [groupForm] = Form.useForm<{ name: string; serverCount: number }>()
  
  // 新建监听规则 - 分步表单状态
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [serverGroupMode, setServerGroupMode] = useState<'existing' | 'new'>('existing') // 选择已有 or 新建
  const [tempListenerData, setTempListenerData] = useState<{
    name: string
    protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'UDP'
    port: number
    healthCheck: 'enabled' | 'disabled'
  } | null>(null)
  const [tempServerGroupData, setTempServerGroupData] = useState<{
    mode: 'existing' | 'new'
    existingGroupId?: string
    newGroup?: {
      name: string
      selectedVMs: string[]
      serverConfigs: ServerConfig[]
    }
  } | null>(null)
  const [tempForwardingPolicies, setTempForwardingPolicies] = useState<ForwardingPolicy[]>([]) // 包含默认策略
  
  // 新建虚拟机组的状态（在步骤2中使用）
  const [newGroupName, setNewGroupName] = useState<string>('')
  const [selectedVMsForNewGroup, setSelectedVMsForNewGroup] = useState<string[]>([])
  const [serverConfigsForNewGroup, setServerConfigsForNewGroup] = useState<ServerConfig[]>([])
  
  // 步骤3 - 域名组状态（用于表格形式的转发策略配置）
  interface TempDomainGroup {
    id: string
    domain: string
    pathRules: TempPathRule[]
  }
  
  interface TempPathRule {
    id: string
    path: string
    serverGroup: string
    remark?: string
  }
  
  const [tempDomainGroups, setTempDomainGroups] = useState<TempDomainGroup[]>([
    {
      id: `domain-${Date.now()}`,
      domain: '',
      pathRules: [
        { id: `path-${Date.now()}`, path: '', serverGroup: '' }
      ]
    }
  ])
  
  // 步骤2 - 验证错误状态
  const [serverGroupError, setServerGroupError] = useState<string>('') // 虚拟机组选择错误
  
  // 步骤3 - 验证错误状态
  const [domainErrors, setDomainErrors] = useState<Record<string, string>>({}) // domainId -> error message
  const [pathRuleErrors, setPathRuleErrors] = useState<Record<string, string>>({}) // pathRuleId -> error message

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
          <Tag >{record.protocol}</Tag>
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
        return <Tag >{backendProtocol}</Tag>
      }
    },
    {
      title: '虚拟机组',
      dataIndex: 'serverGroup',
      key: 'serverGroup'
    },
    {
      title: '健康检查',
      dataIndex: 'healthCheck',
      key: 'healthCheck',
      render: (healthCheck: string) => (
        <Tag color={healthCheck === 'enabled' ? 'success' : 'default'} >
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

  // 合并普通转发策略与系统托管转发策略（开启公网时生成）
  const allPolicies: (ForwardingPolicy & { isSystemManaged?: boolean })[] = [
    ...policies,
    ...systemManagedPolicies.map(p => ({
      id: p.id,
      listenerId: p.listenerId,
      domain: p.domain,
      path: p.path,
      serverGroup: p.serverGroup,
      remark: p.remark,
      isSystemManaged: true as const
    }))
  ]

  // 获取关联的转发策略（基于监听规则ID）
  const getRelatedPolicies = (groupName: string): string[] => {
    return allPolicies
      .filter(p => p.serverGroup === groupName)
      .map(p => `${p.domain}${p.path}`)
  }

  // 获取关联的监听规则
  const getRelatedListeners = (groupName: string): string[] => {
    return listeners
      .filter(l => l.serverGroup === groupName)
      .map(l => l.name)
  }

  // 合并普通虚拟机组与系统托管虚拟机组（开启公网时创建）
  const allServerGroups: ServerGroup[] = [
    ...serverGroups,
    ...systemManagedServerGroups.map(
      (g): ServerGroup => ({
        ...g,
        isSystemManaged: true
      })
    )
  ]

  // 虚拟机组列定义
  const groupColumns: ColumnsType<ServerGroup> = [
    {
      title: '虚拟机组名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, record: ServerGroup) => (
        <Space>
          <span>{name}</span>
          {record.isSystemManaged && (
            <Tag color="blue" style={{ borderRadius: '999px' }}>
              系统托管
            </Tag>
          )}
        </Space>
      )
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
              <Tag key={policy} >{policy}</Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      }
    },
    {
      title: '关联监听规则',
      key: 'relatedListeners',
      width: 200,
      render: (_: unknown, record: ServerGroup) => {
        const relatedListeners = getRelatedListeners(record.name)
        return relatedListeners.length > 0 ? (
          <Space size={[0, 4]} wrap>
            {relatedListeners.map(listener => (
              <Tag key={listener} >{listener}</Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      }
    },
    {
      title: '虚拟机数量',
      dataIndex: 'serverCount',
      key: 'serverCount',
      width: 120,
      render: (count: number) => `${count} 台`
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: ServerGroup) => {
        const inUse = isServerGroupInUse(record.name) // 检查是否被使用
        
        return (
          <Space size="small">
            {record.isSystemManaged ? (
              <Tooltip title="系统托管虚拟机组，由开启公网自动创建，不可编辑">
                <Button type="link" size="small" disabled>
                  编辑
                </Button>
              </Tooltip>
            ) : (
              <Button
                type="link"
                size="small"
                onClick={() => handleEditServerGroup(record)}
              >
                编辑
              </Button>
            )}
            {record.isSystemManaged ? (
              <>
                <Tooltip title="系统托管虚拟机组，由开启公网自动创建，不可删除">
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} disabled>
                    删除
                  </Button>
                </Tooltip>
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleOpenReleaseConfirm(record)}
                >
                  解除系统托管
                </Button>
              </>
            ) : inUse ? (
              // 如果被使用，显示禁用的删除按钮带 Tooltip
              <Tooltip title="该虚拟机组已被监听规则或转发策略关联，无法删除">
                <Button 
                  type="link" 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                  disabled
                >
                  删除
                </Button>
              </Tooltip>
            ) : (
              // 如果未被使用，正常显示删除确认框
              <Popconfirm
                title="确定要删除这个虚拟机组吗？"
                onConfirm={() => handleDeleteGroup(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      }
    }
  ]

  // 虚拟机详情列定义（用于展开行）
  const serverDetailColumns: ColumnsType<ServerConfig> = [
    {
      title: '虚拟机名称',
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
            <Tag key={port.id} >{port.weight}</Tag>
          ))}
        </Space>
      )
    }
  ]

  // 步骤1：保存基本信息并进入下一步
  const handleStep1Next = async (): Promise<void> => {
    try {
      const values = await listenerForm.validateFields(['name', 'protocol', 'port', 'healthCheck'])
      setTempListenerData({
        name: values.name,
        protocol: values.protocol as 'HTTP' | 'HTTPS' | 'TCP' | 'UDP',
        port: values.port,
        healthCheck: values.healthCheck as 'enabled' | 'disabled'
      })
      setCurrentStep(1)
    } catch (error) {
      console.error('验证失败:', error)
    }
  }
  
  // 步骤2：保存虚拟机组信息并进入下一步（或直接创建）
  const handleStep2Next = async (): Promise<void> => {
    try {
      if (serverGroupMode === 'existing') {
        // 选择已有虚拟机组
        if (!selectedServerGroup) {
          setServerGroupError('请选择虚拟机组')
          message.error('请选择虚拟机组')
          return
        }
        setServerGroupError('')
        setTempServerGroupData({
          mode: 'existing',
          existingGroupId: selectedServerGroup
        })
      } else {
        // 新建虚拟机组
        if (!newGroupName.trim()) {
          message.error('请输入虚拟机组名称')
          return
        }
        // 验证虚拟机组名称格式
        if (!/^[\u4e00-\u9fa5a-zA-Z0-9\-\/._]{1,80}$/.test(newGroupName)) {
          message.error('名称格式不正确：1-80个字符，支持中文、字母、数字、短划线(-)、正斜线(/)、半角句号(.)、下划线(_)')
          return
        }
        if (selectedVMsForNewGroup.length === 0) {
          message.error('请至少选择一台虚拟机')
          return
        }
        setServerGroupError('')
        setTempServerGroupData({
          mode: 'new',
          newGroup: {
            name: newGroupName,
            selectedVMs: selectedVMsForNewGroup,
            serverConfigs: serverConfigsForNewGroup
          }
        })
      }
      
      // 判断是否需要进入步骤3（转发策略）
      if (tempListenerData && (tempListenerData.protocol === 'HTTP' || tempListenerData.protocol === 'HTTPS')) {
        // HTTP/HTTPS 需要配置转发策略
        // 初始化域名组（包含默认策略）
        const defaultServerGroup = serverGroupMode === 'existing' ? selectedServerGroup! : newGroupName
        setTempDomainGroups([
          {
            id: `domain-${Date.now()}`,
            domain: 'appid-clb.pro.g123-cpp.com',
            pathRules: [
              { id: `path-${Date.now()}`, path: '', serverGroup: defaultServerGroup }
            ]
          }
        ])
        setCurrentStep(2)
      } else {
        // TCP/UDP 直接创建
        await handleFinalCreate()
      }
    } catch (error) {
      console.error('操作失败:', error)
    }
  }
  
  // 步骤3：最终创建监听规则
  const handleFinalCreate = async (): Promise<void> => {
    try {
      if (!tempListenerData || !tempServerGroupData) {
        message.error('数据不完整，请重新填写')
        return
      }
      
      // 验证转发策略（如果是HTTP/HTTPS）
      if (tempListenerData.protocol === 'HTTP' || tempListenerData.protocol === 'HTTPS') {
        // 验证所有域名和虚拟机组，收集所有错误
        const newDomainErrors: Record<string, string> = {}
        const newPathRuleErrors: Record<string, string> = {}
        let hasError = false
        
        for (const domainGroup of tempDomainGroups) {
          // 域名必填
          if (!domainGroup.domain.trim()) {
            newDomainErrors[domainGroup.id] = '域名不能为空'
            hasError = true
          }
          
          // 每个路径规则的虚拟机组必填
          for (const pathRule of domainGroup.pathRules) {
            if (!pathRule.serverGroup) {
              newPathRuleErrors[pathRule.id] = '虚拟机组不能为空'
              hasError = true
            }
          }
        }
        
        if (hasError) {
          setDomainErrors(newDomainErrors)
          setPathRuleErrors(newPathRuleErrors)
          message.error('请填写所有必填项')
          return
        }
      }
      
      // 1. 如果是新建虚拟机组，先创建虚拟机组
      let finalServerGroupName = ''
      if (tempServerGroupData.mode === 'new' && tempServerGroupData.newGroup) {
        const newGroup: ServerGroup = {
          id: `group-${Date.now()}`,
          name: tempServerGroupData.newGroup.name,
          serverCount: tempServerGroupData.newGroup.selectedVMs.length,
          healthCheck: 'enabled',
          servers: tempServerGroupData.newGroup.serverConfigs
        }
        setServerGroups([...serverGroups, newGroup])
        finalServerGroupName = newGroup.name
      } else if (tempServerGroupData.existingGroupId) {
        finalServerGroupName = tempServerGroupData.existingGroupId
      }
      
      // 2. 创建或更新监听规则
      if (editingListener) {
        // 编辑模式：更新现有监听规则（name、protocol、port 保持不变）
        const updatedListener: ListenerRule = {
          ...editingListener,
          // name、protocol、port 在编辑模式下不可修改，保持原值
          serverGroup: finalServerGroupName,
          healthCheck: tempListenerData.healthCheck
        }
        setListeners(prev => prev.map(l => l.id === editingListener.id ? updatedListener : l))
        
        // 3. 更新转发策略
        if (tempListenerData.protocol === 'HTTP' || tempListenerData.protocol === 'HTTPS') {
          // 删除旧的转发策略
          setPolicies(prev => prev.filter(p => p.listenerId !== editingListener.id))
          
          // 添加新的转发策略
          const newPolicies: ForwardingPolicy[] = []
          tempDomainGroups.forEach(domainGroup => {
            domainGroup.pathRules.forEach(pathRule => {
              newPolicies.push({
                id: `policy-${Date.now()}-${Math.random()}`,
                listenerId: editingListener.id,
                domain: domainGroup.domain,
                path: pathRule.path,
                serverGroup: pathRule.serverGroup,
                remark: pathRule.remark
              })
            })
          })
          setPolicies(prev => [...prev, ...newPolicies])
        }
        
        message.success('监听规则更新成功')
      } else {
        // 新建模式：创建新监听规则
        const newListener: ListenerRule = {
          id: `listener-${Date.now()}`,
          name: tempListenerData.name,
          protocol: tempListenerData.protocol,
          port: tempListenerData.port,
          serverGroup: finalServerGroupName,
          healthCheck: tempListenerData.healthCheck,
          status: 'running'
        }
        setListeners([...listeners, newListener])
        
        // 3. 如果有转发策略，保存转发策略（从域名组转换）
        if (tempListenerData.protocol === 'HTTP' || tempListenerData.protocol === 'HTTPS') {
          const newPolicies: ForwardingPolicy[] = []
          tempDomainGroups.forEach(domainGroup => {
            domainGroup.pathRules.forEach(pathRule => {
              newPolicies.push({
                id: `policy-${Date.now()}-${Math.random()}`,
                listenerId: newListener.id,
                domain: domainGroup.domain,
                path: pathRule.path,
                serverGroup: pathRule.serverGroup,
                remark: pathRule.remark
              })
            })
          })
          setPolicies([...policies, ...newPolicies])
        }
        
        message.success('监听规则创建成功')
      }
      
      handleCloseListenerModal()
    } catch (error) {
      console.error('创建失败:', error)
      message.error('创建失败，请重试')
    }
  }
  
  // 关闭Modal并重置所有状态
  const handleCloseListenerModal = (): void => {
    setListenerModalOpen(false)
    setCurrentStep(0)
    setServerGroupMode('existing')
    setTempListenerData(null)
    setTempServerGroupData(null)
    setTempForwardingPolicies([])
    setTempDomainGroups([
      {
        id: `domain-${Date.now()}`,
        domain: '',
        pathRules: [
          { id: `path-${Date.now()}`, path: '', serverGroup: '' }
        ]
      }
    ])
    setServerGroupError('')
    setDomainErrors({})
    setPathRuleErrors({})
    setNewGroupName('')
    setSelectedVMsForNewGroup([])
    setServerConfigsForNewGroup([])
    setSelectedServerGroup(undefined)
    setSelectedProtocol(undefined)
    listenerForm.resetFields()
    setEditingListener(null)
  }
  
  // 新建虚拟机组 - 选择虚拟机变化时更新配置
  const handleVMSelectionChangeForNewGroup = (vmIds: string[]): void => {
    setSelectedVMsForNewGroup(vmIds)
    
    // 实时更新配置列表
    const newConfigs = vmIds.map(vmId => {
      // 保留已有配置，为新虚拟机初始化默认配置
      const existingConfig = serverConfigsForNewGroup.find(c => c.vmId === vmId)
      if (existingConfig) {
        return existingConfig
      }
      
      // 新虚拟机：端口8080，权重100
      const vm = availableVMs.find(v => v.id === vmId)
      return {
        vmId: vmId,
        vmName: vm?.name || '',
        privateIp: vm?.privateIp || '',
        ports: [{ id: `port-${Date.now()}-${Math.random()}`, port: 8080, weight: 100 }]
      }
    })
    
    setServerConfigsForNewGroup(newConfigs)
  }
  
  // 新建虚拟机组 - 添加端口
  const handleAddPortForNewGroup = (vmId: string): void => {
    setServerConfigsForNewGroup(prevConfigs =>
      prevConfigs.map(config =>
        config.vmId === vmId
          ? {
              ...config,
              ports: [
                ...config.ports,
                { id: `port-${Date.now()}-${Math.random()}`, port: 8080, weight: 100 }
              ]
            }
          : config
      )
    )
  }
  
  // 新建虚拟机组 - 删除端口
  const handleRemovePortForNewGroup = (vmId: string, portId: string): void => {
    setServerConfigsForNewGroup(prevConfigs =>
      prevConfigs.map(config =>
        config.vmId === vmId
          ? {
              ...config,
              ports: config.ports.filter(p => p.id !== portId)
            }
          : config
      )
    )
  }
  
  // 新建虚拟机组 - 更新端口
  const handleUpdatePortForNewGroup = (vmId: string, portId: string, field: 'port' | 'weight', value: number): void => {
    setServerConfigsForNewGroup(prevConfigs =>
      prevConfigs.map(config =>
        config.vmId === vmId
          ? {
              ...config,
              ports: config.ports.map(p =>
                p.id === portId ? { ...p, [field]: value } : p
              )
            }
          : config
      )
    )
  }
  
  // 新建虚拟机组 - 移除虚拟机
  const handleRemoveVMForNewGroup = (vmId: string): void => {
    setSelectedVMsForNewGroup(prev => prev.filter(id => id !== vmId))
    setServerConfigsForNewGroup(prev => prev.filter(config => config.vmId !== vmId))
  }
  
  // 步骤3 - 添加转发策略（除默认策略外）
  const handleAddForwardingPolicy = (): void => {
    const newPolicy: ForwardingPolicy = {
      id: `policy-${Date.now()}`,
      listenerId: '', // 临时为空
      domain: '',
      path: '',
      serverGroup: tempServerGroupData?.mode === 'existing' 
        ? (tempServerGroupData.existingGroupId || '') 
        : (tempServerGroupData?.newGroup?.name || '')
    }
    setTempForwardingPolicies([...tempForwardingPolicies, newPolicy])
  }
  
  // 步骤3 - 删除转发策略（不能删除第一个默认策略）
  const handleRemoveForwardingPolicy = (policyId: string): void => {
    setTempForwardingPolicies(prev => prev.filter(p => p.id !== policyId))
  }
  
  // 步骤3 - 更新转发策略字段
  const handleUpdateForwardingPolicy = (policyId: string, field: 'domain' | 'path' | 'serverGroup', value: string): void => {
    setTempForwardingPolicies(prev =>
      prev.map(p => (p.id === policyId ? { ...p, [field]: value } : p))
    )
  }
  
  // 步骤3 - 域名组操作函数
  const handleAddTempDomainGroup = (): void => {
    setTempDomainGroups([
      ...tempDomainGroups,
      {
        id: `domain-${Date.now()}`,
        domain: '',
        pathRules: [
          { id: `path-${Date.now()}`, path: '', serverGroup: '' }
        ]
      }
    ])
  }
  
  const handleUpdateTempDomain = (domainId: string, value: string): void => {
    setTempDomainGroups(prev =>
      prev.map(group => (group.id === domainId ? { ...group, domain: value } : group))
    )
    
    // 清除该域名的错误
    if (value.trim()) {
      setDomainErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[domainId]
        return newErrors
      })
    }
  }
  
  // 验证域名（失去焦点时）
  const handleDomainBlur = (domainId: string, value: string): void => {
    if (!value.trim()) {
      setDomainErrors(prev => ({ ...prev, [domainId]: '域名不能为空' }))
    } else {
      setDomainErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[domainId]
        return newErrors
      })
    }
  }
  
  const handleAddTempPathRule = (domainId: string): void => {
    setTempDomainGroups(prev =>
      prev.map(group =>
        group.id === domainId
          ? {
              ...group,
              pathRules: [
                ...group.pathRules,
                { id: `path-${Date.now()}`, path: '', serverGroup: '' }
              ]
            }
          : group
      )
    )
  }
  
  const handleUpdateTempPathRule = (domainId: string, pathId: string, field: 'path' | 'serverGroup' | 'remark', value: string): void => {
    setTempDomainGroups(prev =>
      prev.map(group =>
        group.id === domainId
          ? {
              ...group,
              pathRules: group.pathRules.map(rule =>
                rule.id === pathId ? { ...rule, [field]: value } : rule
              )
            }
          : group
      )
    )
    
    // 如果更新的是虚拟机组，清除错误
    if (field === 'serverGroup' && value) {
      setPathRuleErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[pathId]
        return newErrors
      })
    }
  }
  
  // 验证虚拟机组（失去焦点或选择时）
  const handleServerGroupBlur = (pathId: string, value: string): void => {
    if (!value) {
      setPathRuleErrors(prev => ({ ...prev, [pathId]: '虚拟机组不能为空' }))
    } else {
      setPathRuleErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[pathId]
        return newErrors
      })
    }
  }
  
  const handleRemoveTempPathRule = (domainId: string, pathId: string): void => {
    setTempDomainGroups(prev =>
      prev.map(group =>
        group.id === domainId
          ? {
              ...group,
              pathRules: group.pathRules.filter(rule => rule.id !== pathId)
            }
          : group
      )
    )
  }
  
  const handleRemoveTempDomainGroup = (domainId: string): void => {
    if (tempDomainGroups.length > 1) {
      setTempDomainGroups(prev => prev.filter(group => group.id !== domainId))
    } else {
      message.warning('至少保留一个域名组')
    }
  }
  
  // 打开编辑监听规则Modal
  const handleEditListener = (listener: ListenerRule): void => {
    setEditingListener(listener)
    
    // 初始化步骤1的数据
    listenerForm.setFieldsValue({
      name: listener.name,
      protocol: listener.protocol,
      port: listener.port,
      healthCheck: listener.healthCheck
    })
    setSelectedProtocol(listener.protocol)
    setTempListenerData({
      name: listener.name,
      protocol: listener.protocol,
      port: listener.port,
      healthCheck: listener.healthCheck
    })
    
    // 初始化步骤2的数据
    setSelectedServerGroup(listener.serverGroup)
    setServerGroupMode('existing')
    setTempServerGroupData({
      mode: 'existing',
      existingGroupId: listener.serverGroup
    })
    
    // 初始化步骤3的数据（如果有转发策略）
    if (listener.protocol === 'HTTP' || listener.protocol === 'HTTPS') {
      const listenerPolicies = policies.filter(p => p.listenerId === listener.id)
      
      if (listenerPolicies.length > 0) {
        // 按域名分组
        const domainMap = new Map<string, typeof listenerPolicies>()
        listenerPolicies.forEach(policy => {
          const existing = domainMap.get(policy.domain) || []
          domainMap.set(policy.domain, [...existing, policy])
        })
        
        // 转换为 tempDomainGroups 格式
        const domainGroups: TempDomainGroup[] = Array.from(domainMap.entries()).map(([domain, domainPolicies]) => ({
          id: `domain-${Date.now()}-${Math.random()}`,
          domain,
          pathRules: domainPolicies.map(p => ({
            id: `path-${Date.now()}-${Math.random()}`,
            path: p.path || '',
            serverGroup: p.serverGroup,
            remark: p.remark
          }))
        }))
        
        setTempDomainGroups(domainGroups)
      } else {
        // 如果没有转发策略，使用默认值
        setTempDomainGroups([
          {
            id: `domain-${Date.now()}`,
            domain: 'appid-clb.pro.g123-cpp.com',
            pathRules: [
              { id: `path-${Date.now()}`, path: '', serverGroup: listener.serverGroup }
            ]
          }
        ])
      }
    }
    
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
    const pathRule = domainGroups.flatMap(g => g.pathRules).find(p => p.id === pathId)
    if (pathRule?.isSystemManaged) return // 系统托管策略不可删除
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

    // 检查域名格式（支持 www.appid-clb.pro.g123-cpp.com 等含数字、连字符的域名）
    const hasDomainError = domainGroups.some(group => 
      group.domain && !/^(\*\.[\w-]+(\.[\w-]+)*|[\w-]+(\.[\w-]+)+)$/.test(group.domain)
    )
    if (hasDomainError) return true

    // 检查是否至少有一个虚拟机组
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
        rule.serverGroup.trim()  // URL可以为空，只需虚拟机组必填
      )

      if (validPathRules.length === 0) {
        message.error(`域名 ${group.domain} 至少需要选择一个虚拟机组`)
        return
      }

      validPathRules.forEach(pathRule => {
        if (pathRule.isSystemManaged) return // 系统托管策略不加入待保存列表
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

    const systemManagedForListener = systemManagedPolicies.filter(p => p.listenerId === currentListenerRule.id)
    if (forwardingRules.length === 0 && systemManagedForListener.length === 0) {
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
    
    if (newPolicies.length > 0) {
      setPolicies([...policies, ...newPolicies])
      message.success(`已成功配置 ${newPolicies.length} 条转发策略`)
    }
    setForwardingPolicyModalOpen(false)
    setForwardingRules([])
    forwardingPolicyForm.resetFields()
    setCurrentListenerRule(null)
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


  // 添加虚拟机组 - 提交处理
  const handleCreateServerGroup = (data: { name: string; servers: ServerConfig[] }): void => {
    if (editingServerGroup) {
      // 编辑模式：更新现有虚拟机组
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
      message.success('虚拟机组更新成功')
    } else {
      // 新增模式：创建新虚拟机组
      const newGroup: ServerGroup = {
        id: `sg-${Date.now()}`,
        name: data.name,
        serverCount: data.servers.length,
        healthCheck: 'enabled',
        servers: data.servers
      }
      setServerGroups([...serverGroups, newGroup])
      message.success('虚拟机组添加成功')
    }
    
    setShowCreateServerGroup(false)
    setEditingServerGroup(null)
  }

  // 打开编辑虚拟机组页面
  const handleEditServerGroup = (group: ServerGroup): void => {
    setEditingServerGroup(group)
    setShowCreateServerGroup(true)
  }

  // 检查虚拟机组是否被使用（被监听规则或转发策略引用）
  const isServerGroupInUse = (groupName: string): boolean => {
    // 检查是否被监听规则使用
    const usedByListener = listeners.some(listener => listener.serverGroup === groupName)
    // 检查是否被转发策略使用（含系统托管）
    const usedByPolicy = allPolicies.some(policy => policy.serverGroup === groupName)
    
    return usedByListener || usedByPolicy
  }

  // 删除虚拟机组
  const handleDeleteGroup = (id: string): void => {
    setServerGroups(serverGroups.filter(g => g.id !== id))
    message.success('删除成功')
  }

  // 解除系统托管：打开二次确认弹窗
  const handleOpenReleaseConfirm = (record: ServerGroup): void => {
    setReleaseConfirmTarget(record)
  }

  // 解除系统托管：确认后转为普通虚机组
  const handleConfirmRelease = (): void => {
    if (!releaseConfirmTarget) return
    const record = releaseConfirmTarget
    const { isSystemManaged, ...rest } = record
    setServerGroups(prev => [...prev, { ...rest }])
    onReleaseSystemManaged?.(record as SystemServerGroup)
    setReleaseConfirmTarget(null)
    message.success('已解除系统托管')
  }

  // 如果显示创建虚拟机组页面，则渲染创建页面
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
                    expandable={{
                      expandedRowRender: (record: ListenerRule) => {
                        const relatedPolicies = allPolicies.filter((p) => p.listenerId === record.id)
                        
                        // 根据虚拟机组名称获取虚拟机详情的辅助函数
                        const getServerGroupDetails = (groupName: string) => {
                          const group = allServerGroups.find(g => g.name === groupName)
                          return group?.servers || []
                        }
                        
                        return (
                          <div style={{ padding: '16px 24px', background: '#fafafa' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#666' }}>流量转发</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {/* 转发策略列表 */}
                              {relatedPolicies.length > 0 && relatedPolicies.map((policy, index) => {
                                const servers = getServerGroupDetails(policy.serverGroup)
                                return (
                                  <div key={policy.id} style={{ fontSize: 13 }}>
                                    {/* 转发策略行 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', marginBottom: 8 }}>
                                      <Text type="secondary">├─</Text>
                                      <Text type="secondary">转发策略{index + 1}:</Text>
                                      <Tag  style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                                        {policy.domain}
                                      </Tag>
                                      <Tag  style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                                        {policy.path}
                                      </Tag>
                                      <Text type="secondary">→</Text>
                                      <Tag 
                                        
                                        style={{ 
                                          fontSize: 12, 
                                          margin: 0
                                        }}
                                      >
                                        {policy.serverGroup}
                                      </Tag>
                                      {policy.remark && (
                                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                          ({policy.remark})
                                        </Text>
                                      )}
                                    </div>
                                    {/* 显示该转发策略对应的虚拟机详情 */}
                                    {servers.length > 0 && (
                                      <div style={{ marginLeft: 32, paddingLeft: 16, borderLeft: '2px solid #d9d9d9' }}>
                                        {servers.map((server) => (
                                          <div key={server.vmId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Text style={{ fontSize: 12, color: '#666' }}>{server.vmName}</Text>
                                            <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                              ({server.privateIp})
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>端口:</Text>
                                            {server.ports.map((portConfig) => (
                                              <Tag 
                                                key={portConfig.id} 
                                                
                                                color="blue"
                                                style={{ fontSize: 11, margin: 0 }}
                                              >
                                                {portConfig.port} (权重:{portConfig.weight})
                                              </Tag>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              
                              {/* 默认虚拟机组（其他请求） */}
                              <div style={{ fontSize: 13 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', marginBottom: 8 }}>
                                  <Text type="secondary">└─</Text>
                                  <Text type="secondary">其他请求</Text>
                                  <Text type="secondary">→</Text>
                                  <Tag 
                                    
                                    style={{ 
                                      fontSize: 12, 
                                      margin: 0
                                    }}
                                  >
                                    {record.serverGroup}
                                  </Tag>
                                </div>
                                {/* 显示默认虚拟机组的虚拟机详情 */}
                                {(() => {
                                  const servers = getServerGroupDetails(record.serverGroup)
                                  return servers.length > 0 && (
                                    <div style={{ marginLeft: 32, paddingLeft: 16, borderLeft: '2px solid #d9d9d9' }}>
                                      {servers.map((server) => (
                                        <div key={server.vmId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                          <Text style={{ fontSize: 12, color: '#666' }}>{server.vmName}</Text>
                                          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                            ({server.privateIp})
                                          </Text>
                                          <Text type="secondary" style={{ fontSize: 12 }}>端口:</Text>
                                          {server.ports.map((portConfig) => (
                                            <Tag 
                                              key={portConfig.id} 
                                              
                                              color="blue"
                                              style={{ fontSize: 11, margin: 0 }}
                                            >
                                              {portConfig.port} (权重:{portConfig.weight})
                                            </Tag>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        )
                      },
                      rowExpandable: () => true
                    }}
                  />
                </div>
              )
            },
            {
              key: 'groups',
              label: '虚拟机组',
              children: (
                <div>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateServerGroup(true)}
                    >
                      新增虚拟机组
                    </Button>
                  </div>
                  <Table
                    columns={groupColumns}
                    dataSource={allServerGroups}
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
        onCancel={handleCloseListenerModal}
        footer={null}
        width={800}
        destroyOnHidden
      >
        {/* 多步骤表单（新建和编辑共用） */}
        <div>
            {/* 步骤指示器 */}
            <Steps 
              current={currentStep} 
              style={{ marginBottom: 32 }}
              items={
                tempListenerData && (tempListenerData.protocol === 'HTTP' || tempListenerData.protocol === 'HTTPS')
                  ? [
                      { title: '基本信息' },
                      { title: '配置虚拟机组' },
                      { title: '转发策略' }
                    ]
                  : [
                      { title: '基本信息' },
                      { title: '配置虚拟机组' }
                    ]
              }
            />

            <Form 
              form={listenerForm} 
              layout="vertical"
              initialValues={{
                healthCheck: 'enabled'
              }}
            >
              {/* 步骤1：基本信息 */}
              {currentStep === 0 && (
                <div>
                  <Form.Item
                    name="name"
                    label="规则名称"
                    rules={[
                      { required: true, message: '请输入规则名称' },
                      { 
                        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, 
                        message: '只能包含字母、数字、下划线，必须以字母或下划线开头' 
                      }
                    ]}
                    extra={editingListener ? "编辑模式下不可修改规则名称" : "只能包含字母、数字、下划线，必须以字母或下划线开头"}
                  >
                    <Input 
                      placeholder="例如：HTTP_Listener_80" 
                      disabled={!!editingListener}
                    />
                  </Form.Item>

                  <Form.Item
                    name="protocol"
                    label="协议"
                    rules={[{ required: true, message: '请选择协议' }]}
                    extra={editingListener ? "编辑模式下不可修改协议" : undefined}
                  >
                    <Radio.Group 
                      onChange={(e) => setSelectedProtocol(e.target.value)}
                      disabled={!!editingListener}
                    >
                      <Radio value="HTTP">HTTP</Radio>
                      <Radio value="HTTPS">HTTPS</Radio>
                      <Radio value="TCP">TCP</Radio>
                      <Radio value="UDP">UDP</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    name="port"
                    label="监听端口"
                    rules={[
                      { required: true, message: '请输入监听端口' },
                      { type: 'number', min: 1, max: 65535, message: '端口范围必须在 1-65535 之间' }
                    ]}
                    extra={editingListener ? "编辑模式下不可修改端口" : "端口范围：1-65535，整数"}
                  >
                    <InputNumber 
                      min={1} 
                      max={65535} 
                      style={{ width: '100%' }} 
                      placeholder="例如：80"
                      disabled={!!editingListener}
                    />
                  </Form.Item>

                  <Form.Item
                    name="healthCheck"
                    label="健康检查"
                    rules={[{ required: true, message: '请选择健康检查状态' }]}
                  >
                    <Radio.Group>
                      <Radio value="enabled">启用</Radio>
                      <Radio value="disabled">禁用</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <div style={{ textAlign: 'right', marginTop: 24 }}>
                    <Space>
                      <Button onClick={handleCloseListenerModal}>取消</Button>
                      <Button type="primary" onClick={handleStep1Next}>下一步</Button>
                    </Space>
                  </div>
                </div>
              )}

              {/* 步骤2：配置虚拟机组 */}
              {currentStep === 1 && (
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <Text strong>配置虚拟机组</Text>
                  </div>

                  <Radio.Group 
                    value={serverGroupMode} 
                    onChange={(e) => setServerGroupMode(e.target.value)}
                    style={{ marginBottom: 24 }}
                  >
                    <Space direction="vertical" size="large">
                      <Radio value="existing">选择已有虚拟机组</Radio>
                      <Radio value="new">新建虚拟机组</Radio>
                    </Space>
                  </Radio.Group>

                  {serverGroupMode === 'existing' ? (
                    // 选择已有虚拟机组
                    <div>
                      <Form.Item 
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            选择虚拟机组
                          </span>
                        }
                        validateStatus={serverGroupError ? 'error' : ''}
                        help={serverGroupError}
                      >
                        <Select 
                          value={selectedServerGroup}
                          placeholder="请选择虚拟机组"
                          onChange={(value: string) => {
                            setSelectedServerGroup(value)
                            setServerGroupError('')
                          }}
                          style={{ width: '100%' }}
                          status={serverGroupError ? 'error' : undefined}
                        >
                          {allServerGroups.map(group => (
                            <Select.Option key={group.id} value={group.name}>
                              {group.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      {/* 显示选中虚拟机组的详情 */}
                      {selectedServerGroup && (() => {
                        const group = allServerGroups.find(g => g.name === selectedServerGroup)
                        return group ? (
                          <div style={{ 
                            padding: '16px', 
                            background: '#f5f5f5', 
                            borderRadius: '6px',
                            marginTop: 16
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 12 }}>虚拟机组详情（只读）</div>
                            <Table
                              size="small"
                              pagination={false}
                              columns={[
                                { title: '虚拟机名称', dataIndex: 'vmName', key: 'vmName' },
                                { title: 'IP', dataIndex: 'privateIp', key: 'privateIp' },
                                { 
                                  title: '端口', 
                                  key: 'ports',
                                  render: (_: unknown, record: ServerConfig) => (
                                    <Space>
                                      {record.ports.map(p => (
                                        <Tag key={p.id} >{p.port}</Tag>
                                      ))}
                                    </Space>
                                  )
                                },
                                { 
                                  title: '权重', 
                                  key: 'weight',
                                  render: (_: unknown, record: ServerConfig) => (
                                    <Space>
                                      {record.ports.map(p => (
                                        <Tag key={p.id} >{p.weight}</Tag>
                                      ))}
                                    </Space>
                                  )
                                }
                              ]}
                              dataSource={group.servers}
                              rowKey="vmId"
                            />
                          </div>
                        ) : null
                      })()}
                    </div>
                  ) : (
                    // 新建虚拟机组
                    <div>
                      <Form.Item 
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            虚拟机组名称
                          </span>
                        }
                        validateStatus={
                          newGroupName && newGroupName.trim() && 
                          (!/^[\u4e00-\u9fa5a-zA-Z0-9\-\/._]{1,80}$/.test(newGroupName))
                            ? 'error' 
                            : ''
                        }
                        help={
                          newGroupName && newGroupName.trim() && 
                          (!/^[\u4e00-\u9fa5a-zA-Z0-9\-\/._]{1,80}$/.test(newGroupName))
                            ? '名称格式不正确：1-80个字符，支持中文、字母、数字、短划线(-)、正斜线(/)、半角句号(.)、下划线(_)'
                            : ''
                        }
                      >
                        <Input 
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="1-80个字符，支持中文、字母、数字、短划线(-)、正斜线(/)、半角句号(.)、下划线(_)"
                        />
                      </Form.Item>

                      <Form.Item 
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            选择虚拟机
                          </span>
                        }
                      >
                        <Select
                          mode="multiple"
                          value={selectedVMsForNewGroup}
                          onChange={handleVMSelectionChangeForNewGroup}
                          placeholder="请选择虚拟机"
                          style={{ width: '100%' }}
                        >
                          {availableVMs.map(vm => (
                            <Select.Option key={vm.id} value={vm.id}>
                              {vm.name} ({vm.privateIp})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      {/* 已选虚拟机配置 */}
                      {serverConfigsForNewGroup.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>已选虚拟机配置</div>
                          {serverConfigsForNewGroup.map(config => (
                            <Card 
                              key={config.vmId}
                              size="small" 
                              title={`${config.vmName} (${config.privateIp})`}
                              extra={
                                <Button 
                                  type="text" 
                                  danger 
                                  size="small"
                                  onClick={() => handleRemoveVMForNewGroup(config.vmId)}
                                >
                                  移除
                                </Button>
                              }
                              style={{ marginBottom: 12 }}
                            >
                              {config.ports.map((port, index) => (
                                <div key={port.id} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                                  <Text>端口 {index + 1}:</Text>
                                  <InputNumber 
                                    min={1}
                                    max={65535}
                                    value={port.port}
                                    onChange={(value) => handleUpdatePortForNewGroup(config.vmId, port.id, 'port', value || 8080)}
                                    placeholder="端口"
                                  />
                                  <Text>权重:</Text>
                                  <InputNumber 
                                    min={0}
                                    max={100}
                                    value={port.weight}
                                    onChange={(value) => handleUpdatePortForNewGroup(config.vmId, port.id, 'weight', value || 100)}
                                    placeholder="权重"
                                  />
                                  {config.ports.length > 1 && (
                                    <Button 
                                      type="text"
                                      danger
                                      size="small"
                                      onClick={() => handleRemovePortForNewGroup(config.vmId, port.id)}
                                    >
                                      删除
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button 
                                type="dashed" 
                                size="small"
                                onClick={() => handleAddPortForNewGroup(config.vmId)}
                                style={{ marginTop: 8 }}
                              >
                                + 添加端口
                              </Button>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ textAlign: 'right', marginTop: 24 }}>
                    <Space>
                      <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                      <Button onClick={handleCloseListenerModal}>取消</Button>
                      <Button type="primary" onClick={handleStep2Next}>
                        {tempListenerData && (tempListenerData.protocol === 'HTTP' || tempListenerData.protocol === 'HTTPS')
                          ? '下一步'
                          : '确定'}
                      </Button>
                    </Space>
                  </div>
                </div>
              )}

              {/* 步骤3：转发策略（仅HTTP/HTTPS） */}
              {currentStep === 2 && (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>转发策略配置</Text>
                    {/*<Button 
                      type="link" 
                      icon={<PlusOutlined />} 
                      onClick={handleAddTempDomainGroup}
                    >
                      添加域名
                    </Button>*/}
                  </div>

                  {/* 转发规则说明 */}
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
                    <div style={{ marginTop: 8 }}><strong>* URL规范（可选）：</strong></div>
                    <div style={{ marginLeft: 16 }}>
                      - 长度限制为2-80个字符<br />
                      - 只能使用字母、数字和 <code>-/.%?#&</code> 这些字符<br />
                      - URL不能只为 <code>/</code>，但必须以 <code>/</code> 开头<br />
                      - URL可以为空，表示转发所有路径
                    </div>
                  </div>

                  {/* 域名组表格形式 */}
                  <div style={{ 
                    border: '1px solid #e8e8e8', 
                    borderRadius: '6px',
                    marginBottom: 16 
                  }}>
                    {/* 表头 */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px',
                      padding: '12px',
                      background: '#fafafa',
                      borderBottom: '1px solid #e8e8e8',
                      fontWeight: 'bold'
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#ff4d4f' }}>* </span>域名
                      </div>
                      <div style={{ flex: 1 }}>URL</div>
                      <div style={{ flex: 1.2 }}>
                        <span style={{ color: '#ff4d4f' }}>* </span>虚拟机组
                      </div>
                      <div style={{ flex: 1.5 }}>备注</div>
                      <div style={{ width: 80 }}>操作</div>
                    </div>

                    {/* 域名组列表 */}
                    {tempDomainGroups.map((group, groupIndex) => (
                      <div key={group.id}>
                        {group.pathRules.map((pathRule, pathIndex) => (
                          <div key={pathRule.id}>
                            {/* 规则行 */}
                            <div style={{ 
                              display: 'flex',
                              gap: '12px',
                              padding: '12px',
                              borderBottom: pathIndex === group.pathRules.length - 1 && groupIndex === tempDomainGroups.length - 1 ? 'none' : '1px solid #f0f0f0'
                            }}>
                              {/* 域名（只在第一行显示） */}
                              <div style={{ flex: 1 }}>
                                {pathIndex === 0 ? (
                                  <div>
                                    <Input
                                      value={group.domain}
                                      onChange={(e) => handleUpdateTempDomain(group.id, e.target.value)}
                                      onBlur={(e) => handleDomainBlur(group.id, e.target.value)}
                                      placeholder="例如：*.example.com"
                                      disabled={pathIndex === 0 && groupIndex === 0}
                                      status={domainErrors[group.id] ? 'error' : undefined}
                                    />
                                    {groupIndex === 0 && (
                                      <div style={{ fontSize: 11, color: '#1890ff', marginTop: 4 }}>
                                        默认域名（不可修改）
                                      </div>
                                    )}
                                    {domainErrors[group.id] && (
                                      <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                                        {domainErrors[group.id]}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>

                              {/* URL */}
                              <div style={{ flex: 1 }}>
                                <Input
                                  value={pathRule.path}
                                  onChange={(e) => handleUpdateTempPathRule(group.id, pathRule.id, 'path', e.target.value)}
                                  placeholder="例如：/api"
                                  disabled={pathIndex === 0 && groupIndex === 0}
                                />
                              </div>

                              {/* 虚拟机组 */}
                              <div style={{ flex: 1.2 }}>
                                <Select
                                  value={pathRule.serverGroup}
                                  onChange={(value: string) => {
                                    handleUpdateTempPathRule(group.id, pathRule.id, 'serverGroup', value)
                                    handleServerGroupBlur(pathRule.id, value)
                                  }}
                                  placeholder="选择虚拟机组"
                                  style={{ width: '100%' }}
                                  status={pathRuleErrors[pathRule.id] ? 'error' : undefined}
                                >
                                  {allServerGroups.map(sg => (
                                    <Select.Option key={sg.id} value={sg.name}>
                                      {sg.name}
                                    </Select.Option>
                                  ))}
                                </Select>
                                {pathRuleErrors[pathRule.id] && (
                                  <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                                    {pathRuleErrors[pathRule.id]}
                                  </div>
                                )}
                              </div>

                              {/* 备注 */}
                              <div style={{ flex: 1.5 }}>
                                {pathIndex === 0 && groupIndex === 0 ? (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    默认策略（不可删除）
                                  </Text>
                                ) : (
                                  <Input
                                    value={pathRule.remark || ''}
                                    onChange={(e) => handleUpdateTempPathRule(group.id, pathRule.id, 'remark', e.target.value)}
                                    placeholder="备注（可选）"
                                    size="small"
                                  />
                                )}
                              </div>

                              {/* 操作 */}
                              <div style={{ width: 80 }}>
                                {!(pathIndex === 0 && groupIndex === 0) && (
                                  <Space size="small">
                                    {group.pathRules.length > 1 && (
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        onClick={() => handleRemoveTempPathRule(group.id, pathRule.id)}
                                      >
                                        删除
                                      </Button>
                                    )}
                                    {pathIndex === 0 && groupIndex > 0 && (
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        onClick={() => handleRemoveTempDomainGroup(group.id)}
                                      >
                                        删除域名
                                      </Button>
                                    )}
                                  </Space>
                                )}
                              </div>
                            </div>

                            {/* 在最后一行下方显示"添加规则"按钮 */}
                            {pathIndex === group.pathRules.length - 1 && (
                              <div style={{ 
                                display: 'flex',
                                gap: '12px',
                                padding: '0 12px 12px 12px',
                                borderBottom: groupIndex === tempDomainGroups.length - 1 ? 'none' : '1px solid #f0f0f0'
                              }}>
                                <div style={{ flex: 1 }}></div>
                                <div style={{ flex: 1 }}>
                                  <Button
                                    type="link"
                                    icon={<PlusOutlined />}
                                    onClick={() => handleAddTempPathRule(group.id)}
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

                  <div style={{ textAlign: 'right', marginTop: 24 }}>
                    <Space>
                      <Button onClick={() => setCurrentStep(1)}>上一步</Button>
                      <Button onClick={handleCloseListenerModal}>取消</Button>
                      <Button type="primary" onClick={handleFinalCreate}>确定</Button>
                    </Space>
                  </div>
                </div>
              )}
            </Form>
          </div>
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
          <div style={{ marginTop: 8 }}><strong>* URL规范（可选）：</strong></div>
          <div style={{ marginLeft: 16 }}>
            - 长度限制为2-80个字符<br />
            - 只能使用字母、数字和 <code>-/.%?#&</code> 这些字符<br />
            - URL不能只为 <code>/</code>，但必须以 <code>/</code> 开头<br />
            - URL可以为空，表示转发所有路径
          </div>
        </div>

        {/* 添加规则表单 - 表格形式 */}
        <Card 
          title="添加转发规则" 
          size="small" 
          style={{ marginBottom: 16 }}
           /* extra={
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
          }*/ 
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
            <div style={{ flex: 1.2 }}>虚拟机组</div>
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
                              status={group.domain && !/^(\*\.[\w-]+(\.[\w-]+)*|[\w-]+(\.[\w-]+)+)$/.test(group.domain) ? 'error' : ''}
                              disabled={(groupIndex === 0 && pathIndex === 0) || !!pathRule.isSystemManaged}
                            />
                            {groupIndex === 0 && pathIndex === 0 && (
                              <div style={{ fontSize: 11, color: '#1890ff', marginTop: 4 }}>
                                默认域名（不可修改）
                              </div>
                            )}
                            {group.domain && !/^(\*\.[\w-]+(\.[\w-]+)*|[\w-]+(\.[\w-]+)+)$/.test(group.domain) && (
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
                            placeholder="例如：/api（可选）"
                            style={{ flex: 1 }}
                            status={pathRule.path && pathRule.path.trim() && (!/^\/[a-zA-Z0-9\-\/.%?#&*]{1,79}$/.test(pathRule.path) || pathRule.path === '/') ? 'error' : ''}
                            disabled={(groupIndex === 0 && pathIndex === 0) || !!pathRule.isSystemManaged}
                          />
                        </div>
                        {groupIndex === 0 && pathIndex === 0 && (
                          <div style={{ fontSize: 11, color: '#1890ff', marginTop: 4 }}>
                            默认URL（不可修改）
                          </div>
                        )}
                        {pathRule.path && pathRule.path.trim() && (!/^\/[a-zA-Z0-9\-\/.%?#&*]{1,79}$/.test(pathRule.path) || pathRule.path === '/') && (
                          <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                            {pathRule.path === '/' ? 'URL不能只为/' : 'URL格式不正确（2-80字符，必须以/开头）'}
                          </div>
                        )}
                      </div>

                      {/* 虚拟机组列 */}
                      <div style={{ flex: 1.2 }}>
                        {pathRule.isSystemManaged ? (
                          <span>{pathRule.serverGroup}</span>
                        ) : (
                          <Select
                            value={pathRule.serverGroup || undefined}
                            onChange={(value) => handleUpdatePathRule(group.id, pathRule.id, 'serverGroup', value)}
                            placeholder=""
                            style={{ width: '100%' }}
                          >
                            {allServerGroups.map(serverGroup => (
                              <Select.Option key={serverGroup.id} value={serverGroup.name}>
                                {serverGroup.name}
                              </Select.Option>
                            ))}
                          </Select>
                        )}
                      </div>

                      {/* 备注列 */}
                      <div style={{ flex: 1.5 }}>
                        {pathRule.isSystemManaged ? (
                          <Space>
                            <span>{pathRule.remark || '-'}</span>
                            <Tag color="blue" style={{ borderRadius: '999px' }}>系统托管</Tag>
                          </Space>
                        ) : (
                          <Input
                            value={pathRule.remark}
                            onChange={(e) => handleUpdatePathRule(group.id, pathRule.id, 'remark', e.target.value)}
                            placeholder="请输入备注"
                            maxLength={200}
                          />
                        )}
                      </div>

                      {/* 操作列 */}
                      <div style={{ width: 80 }}>
                        {pathRule.isSystemManaged ? (
                          <Tooltip title="系统托管策略，不可删除">
                            <Button type="link" size="small" disabled>删除</Button>
                          </Tooltip>
                        ) : (
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() => handleRemovePathRule(group.id, pathRule.id)}
                          >
                            删除
                          </Button>
                        )}
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
                            <Tag  style={{ fontFamily: 'monospace' }}>
                              {rule.domain || '-'}
                            </Tag>
                          )}
                        </div>
                        <div style={{ color: '#999', fontSize: 16, fontWeight: 'bold' }}>/</div>
                        <div style={{ flex: 1 }}>
                          <Tag  style={{ fontFamily: 'monospace' }}>
                            {rule.path || '-'}
                          </Tag>
                        </div>
                        <div style={{ flex: 1.2 }}>
                          <Tag >{rule.serverGroup}</Tag>
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
                  <Tag >{selectedListenerDetail.protocol}</Tag>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>后端协议：</Text>
                  <Tag >
                    {(selectedListenerDetail.protocol === 'HTTP' || selectedListenerDetail.protocol === 'HTTPS') ? 'HTTP' : selectedListenerDetail.protocol}
                  </Tag>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>监听端口：</Text>
                  <Text>{selectedListenerDetail.port}</Text>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>虚拟机组：</Text>
                  <Text>{selectedListenerDetail.serverGroup}</Text>
                </div>
                <div style={{ display: 'flex' }}>
                  <Text strong style={{ width: 120 }}>健康检查：</Text>
                  <Tag color={selectedListenerDetail.healthCheck === 'enabled' ? 'success' : 'default'} >
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
                    
                  >
                    {selectedListenerDetail.status === 'running' ? '运行中' :
                     selectedListenerDetail.status === 'stopped' ? '已停止' :
                     selectedListenerDetail.status === 'starting' ? '启动中' : '停止中'}
                  </Tag>
                </div>
              </div>
            </Card>

            {/* 流量转发树形结构 */}
            <Card title="流量转发" size="small">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const relatedPolicies = policies.filter((p: ForwardingPolicy) => p.listenerId === selectedListenerDetail.id)
                  
                  return (
                    <>
                      {/* 转发策略列表 */}
                      {relatedPolicies.length > 0 && relatedPolicies.map((policy, index) => (
                        <div key={policy.id} style={{ fontSize: 13 }}>
                          {/* 转发策略行 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
                            <Text type="secondary">├─</Text>
                            <Text type="secondary">转发策略{index + 1}:</Text>
                            <Tag  style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                              {policy.domain}
                            </Tag>
                            <Tag  style={{ fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                              {policy.path}
                            </Tag>
                            <Text type="secondary">→</Text>
                            <Tag 
                              
                              style={{ 
                                fontSize: 12, 
                                margin: 0
                              }}
                            >
                              {policy.serverGroup}
                            </Tag>
                            {policy.remark && (
                              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                ({policy.remark})
                              </Text>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* 默认虚拟机组（其他请求） */}
                      <div style={{ fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
                          <Text type="secondary">└─</Text>
                          <Text type="secondary">其他请求</Text>
                          <Text type="secondary">→</Text>
                          <Tag 
                            
                            style={{ 
                              fontSize: 12, 
                              margin: 0
                            }}
                          >
                            {selectedListenerDetail.serverGroup}
                          </Tag>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* 解除系统托管二次确认 */}
      <Modal
        title="解除系统托管"
        open={!!releaseConfirmTarget}
        onCancel={() => setReleaseConfirmTarget(null)}
        onOk={handleConfirmRelease}
        okText="继续"
        cancelText="取消"
      >
        <p>解除系统托管，系统将停止自动维护其公网规则，往后需要用户手动维护负载均衡规则，是否继续？</p>
      </Modal>

    </div>
  )
}


