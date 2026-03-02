'use client'

import React, { useState } from 'react'
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Card,
  Modal,
  message,
  Select,
  Alert
} from 'antd'
import { 
  PlusOutlined, 
  PoweroffOutlined, 
  ReloadOutlined, 
  DeleteOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  DesktopOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import CreateVirtualMachine from './CreateVirtualMachine'
import VirtualMachineDetails from './VirtualMachineDetails'
import AutoServerModule from '../../Common/AutoServerModule'

const { Title, Link } = Typography

// 开启公网时创建的系统托管虚拟机组结构（会同步到负载均衡的虚拟机组列表）
export interface SystemServerGroup {
  id: string
  name: string
  serverCount: number
  healthCheck: 'enabled' | 'disabled'
  servers: Array<{
    vmId: string
    vmName: string
    privateIp: string
    ports: Array<{ id: string; port: number; weight: number }>
  }>
  isSystemManaged: true
}

// 开启公网时生成的系统托管转发策略（域名固定，URI 为虚机名称）
export interface SystemForwardingPolicy {
  id: string
  listenerId: string
  domain: string
  path: string
  serverGroup: string
  remark: string
  isSystemManaged: true
}

// 组件接口定义
interface VirtualMachineListProps {
  onViewDetails?: (vm: VirtualMachine) => void
  vmList?: VirtualMachine[]
  setVmList?: (list: VirtualMachine[]) => void
  onNavigateToLoadBalancer?: () => void
  /** 开启公网时创建虚机组后的回调，用于将虚机组同步到负载均衡列表 */
  onServerGroupCreatedFromPublic?: (group: SystemServerGroup) => void
  /** 开启公网时生成转发策略后的回调，用于同步到监听规则的转发策略 */
  onForwardingPolicyCreatedFromPublic?: (policy: SystemForwardingPolicy) => void
}

// 公网域名默认前缀（负载均衡域名）
const LB_DOMAIN = 'g123-jp-testapp-slb.stg.g123-cpp.com'

// 虚拟机数据类型定义
export interface VirtualMachine {
  id: string
  name: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  spec: string
  systemImage: string
  privateIp: string
  publicIp?: string
  createTime: string
  domain: string
  systemDiskSize?: number
  dataDiskSize?: number
  loginUser?: string
  securityGroups?: string[]
  securityGroupNames?: string[]
  /** 是否已开启公网 */
  publicDomainEnabled?: boolean
  /** 公网访问 URL，开启后格式为 {LB_DOMAIN}/test1 */
  publicDomainUrl?: string
}

// 模拟虚拟机数据
const mockVMData: VirtualMachine[] = [
  {
    id: 'i-bp1234567890abcdef',
    name: 'web-server-01',
    status: 'running',
    spec: '4c.8G',
    systemImage: 'CentOS 7.9 64位',
    privateIp: '172.16.0.10',
    publicIp: '47.96.123.45',
    createTime: '2024-01-15 10:30:00',
    domain: 'g123-web01',
    systemDiskSize: 40,
    dataDiskSize: 100,
    loginUser: 'appid',
    securityGroups: ['sg-001'],
    securityGroupNames: ['default-web']
  },
  {
    id: 'i-bp0987654321fedcba',
    name: 'db-server-01',
    status: 'stopped',
    spec: '8c.16G',
    systemImage: 'Ubuntu 18.04 64位',
    privateIp: '172.16.0.11',
    createTime: '2024-01-14 15:20:00',
    domain: 'g123-db01',
    systemDiskSize: 60,
    loginUser: 'appid',
    securityGroups: ['sg-002'],
    securityGroupNames: ['database-group']
  }
]

// 可绑定的安全组（用于示例绑定操作）
const mockSecurityGroups = [
  { id: 'sg-001', name: 'default-web' },
  { id: 'sg-002', name: 'database-group' }
]

export default function VirtualMachineList({ onViewDetails, vmList: propVmList, setVmList: propSetVmList, onNavigateToLoadBalancer, onServerGroupCreatedFromPublic, onForwardingPolicyCreatedFromPublic }: VirtualMachineListProps = {}) {
  const [internalVmList, internalSetVmList] = useState<VirtualMachine[]>(mockVMData)
  const vmList = propVmList ?? internalVmList
  const setVmList = propSetVmList ?? internalSetVmList
  const [loading, setLoading] = useState<boolean>(false)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false)
  const [showBindModal, setShowBindModal] = useState<boolean>(false)
  const [bindTargetVm, setBindTargetVm] = useState<VirtualMachine | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [selectedVm, setSelectedVm] = useState<VirtualMachine | null>(null)
  // 开启公网弹窗
  const [showEnablePublicModal, setShowEnablePublicModal] = useState<boolean>(false)
  const [enablePublicTargetVm, setEnablePublicTargetVm] = useState<VirtualMachine | null>(null)

  // 虚拟机状态标签渲染
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

  // 虚拟机操作处理
  const handleVMOperation = (vmId: string, operation: string): void => {
    setLoading(true)
    
    // 模拟API调用
    setTimeout(() => {
      const updatedVMList = vmList.map(vm => {
        if (vm.id === vmId) {
          switch (operation) {
            case 'start':
              return { ...vm, status: 'starting' as const }
            case 'stop':
              return { ...vm, status: 'stopping' as const }
            case 'restart':
              return { ...vm, status: 'starting' as const }
            case 'delete':
              return null // 将在过滤时移除
            default:
              return vm
          }
        }
        return vm
      }).filter(Boolean) as VirtualMachine[]
      
      setVmList(updatedVMList)
      setLoading(false)
      message.success(`虚拟机操作 "${operation}" 执行成功`)
    }, 1000)
  }

  // 删除确认
  const handleDelete = (vm: VirtualMachine): void => {
    Modal.confirm({
      title: '确认删除虚拟机',
      content: `确定要删除虚拟机 "${vm.name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => handleVMOperation(vm.id, 'delete')
    })
  }

  // 打开开启公网弹窗：为该虚机创建新虚机组，LB 端口 443，后端 8080，路径 /test1
  const handleOpenEnablePublic = (vm: VirtualMachine): void => {
    setEnablePublicTargetVm(vm)
    setShowEnablePublicModal(true)
  }

  // 确认开启公网：创建虚机组并更新 VM 公网状态，虚机组同步到负载均衡列表并标记为系统托管
  const handleConfirmEnablePublic = (): void => {
    if (!enablePublicTargetVm) return
    const vm = enablePublicTargetVm
    const groupName = `${vm.name}-公网` // 系统生成的虚机组名称，不可更改
    const publicUrl = `${LB_DOMAIN}/test1`
    const updated = vmList.map(v =>
      v.id === vm.id
        ? {
            ...v,
            publicDomainEnabled: true,
            publicDomainUrl: publicUrl
          }
        : v
    )
    setVmList(updated)
    setShowEnablePublicModal(false)
    setEnablePublicTargetVm(null)
    message.success('已开启公网，公网访问地址：' + publicUrl)

    // 创建系统托管虚机组并同步到负载均衡的虚拟机组列表
    const systemGroup: SystemServerGroup = {
      id: `system-${vm.id}-${Date.now()}`,
      name: groupName,
      serverCount: 1,
      healthCheck: 'enabled',
      servers: [
        {
          vmId: vm.id,
          vmName: vm.name,
          privateIp: vm.privateIp,
          ports: [{ id: `port-${Date.now()}`, port: 8080, weight: 100 }]
        }
      ],
      isSystemManaged: true
    }
    onServerGroupCreatedFromPublic?.(systemGroup)

    // 生成系统托管转发策略：域名固定 www.appid-clb.pro.g123-cpp.com，URI 为虚机名称
    const systemPolicy: SystemForwardingPolicy = {
      id: `system-policy-${vm.id}-${Date.now()}`,
      listenerId: 'listener-2', // HTTPS_Listener_443
      domain: 'www.appid-clb.pro.g123-cpp.com',
      path: `/${vm.name}`,
      serverGroup: groupName,
      remark: '系统托管',
      isSystemManaged: true
    }
    onForwardingPolicyCreatedFromPublic?.(systemPolicy)
  }

  const openDetails = (vm: VirtualMachine) => {
    // 如果父组件提供 onViewDetails，则保持兼容；否则在内部切换到详情
    if (onViewDetails) {
      onViewDetails(vm)
    } else {
      setSelectedVm(vm)
    }
  }

  // 从详情页接收操作回调，在组件内部更新列表/详情
  const handleOperationFromDetails = (vmId: string, operation: string, payload?: string) => {
    if (operation === 'updatePublicIp') {
      const updated = vmList.map(v => v.id === vmId ? { ...v, publicIp: payload } : v)
      setVmList(updated)
      if (selectedVm && selectedVm.id === vmId) {
        setSelectedVm({ ...selectedVm, publicIp: payload })
      }
      return
    }
    if (operation === 'delete') {
      const updated = vmList.filter(v => v.id !== vmId)
      setVmList(updated)
      if (selectedVm && selectedVm.id === vmId) setSelectedVm(null)
      message.success('实例已删除')
      return
    }
    // 其它操作：启动/停止/重启
    const updated = vmList.map(v => {
      if (v.id !== vmId) return v
      if (operation === 'start') return { ...v, status: 'starting' as const }
      if (operation === 'stop') return { ...v, status: 'stopping' as const }
      if (operation === 'restart') return { ...v, status: 'starting' as const }
      return v
    })
    setVmList(updated)
  }

  // 表格列配置
  const columns: TableColumnsType<VirtualMachine> = [
    {
      title: '虚拟机名称',
      key: 'info',
      render: (_: unknown, vm: VirtualMachine) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            <Link 
              onClick={() => openDetails(vm)}
              style={{ color: '#1677ff' }}
            >
              {vm.name}
            </Link>
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatus
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec'
    },
    {
      title: '系统镜像',
      dataIndex: 'systemImage',
      key: 'systemImage'
    },
    {
      title: '公网域名',
      key: 'publicDomain',
      render: (_: unknown, vm: VirtualMachine) =>
        vm.publicDomainEnabled && vm.publicDomainUrl ? (
          <Typography.Link copyable href={`https://${vm.publicDomainUrl}`} target="_blank">
            {vm.publicDomainUrl}
          </Typography.Link>
        ) : (
          <Typography.Text type="secondary">未开启</Typography.Text>
        )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, vm: VirtualMachine) => (
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          {vm.status === 'stopped' ? (
            <Link
              onClick={() => handleVMOperation(vm.id, 'start')}
              style={{ color: '#1677ff' }}
            >
              启动
            </Link>
          ) : (
            <Link
              onClick={() => handleVMOperation(vm.id, 'stop')}
              style={{ color: '#1677ff' }}
            >
              关机
            </Link>
          )}
          
          {/* 连接操作：仅运行中状态可用 */}
          <Link
            onClick={() => {
              if (vm.status === 'running') {
                handleConnect(vm)
              }
            }}
            style={{ 
              color: vm.status === 'running' ? '#1677ff' : '#d9d9d9', 
              cursor: vm.status === 'running' ? 'pointer' : 'not-allowed' 
            }}
          >
            连接
          </Link>
          
          <Link
            onClick={() => handleVMOperation(vm.id, 'restart')}
            style={{ color: vm.status === 'stopped' ? '#d9d9d9' : '#1677ff', cursor: vm.status === 'stopped' ? 'not-allowed' : 'pointer' }}
          >
            重启
          </Link>

          {/* 开启公网：未开启时展示，点击后为该虚机创建虚机组并开启公网 */}
          {!vm.publicDomainEnabled && (
            <Link
              onClick={() => handleOpenEnablePublic(vm)}
              style={{ color: '#1677ff' }}
            >
              开启公网
            </Link>
          )}
          
          <Link
            onClick={() => handleDelete(vm)}
            style={{ color: '#ff4d4f' }}
          >
            删除
          </Link>
        </Space>
      )
    }
  ]

  // 处理创建虚拟机
  const handleCreateVM = (newVM: VirtualMachine) => {
    setVmList([...vmList, newVM])
    setShowCreateForm(false)
  }

  // 返回列表
  const handleBackToList = () => {
    setShowCreateForm(false)
  }

  // 处理连接操作
  const handleConnect = (vm: VirtualMachine) => {
    if (vm.status !== 'running') {
      message.warning('虚机需要处于运行状态才能连接')
      return
    }
    
    // 模拟远程连接逻辑
    Modal.info({
      title: '远程连接',
      content: (
        <div>
          <p><strong>虚机名称：</strong>{vm.name}</p>
          <p><strong>IP地址：</strong>{vm.publicIp}</p>
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

  if (showCreateForm) {
    return (
      <CreateVirtualMachine 
        onBack={handleBackToList}
        onCreate={handleCreateVM}
      />
    )
  }

  // 在组件内部渲染详情页
  if (selectedVm) {
    return (
      <VirtualMachineDetails
        vm={selectedVm}
        onBack={() => setSelectedVm(null)}
        onOperation={handleOperationFromDetails}
        onNavigateToLoadBalancer={onNavigateToLoadBalancer}
      />
    )
  }

  // 绑定安全组确认弹窗（支持多选绑定）
  const handleConfirmBind = () => {
    if (!bindTargetVm) return
    // 模拟绑定：更新 vmList 中对应 vm 的 securityGroups 字段
    const updated = vmList.map(vm =>
      vm.id === bindTargetVm.id
        ? {
            ...vm,
            securityGroups: selectedGroupIds,
            securityGroupNames: selectedGroupIds.map(id => mockSecurityGroups.find(g => g.id === id)?.name || id)
          }
        : vm
    )
    setVmList(updated)
    setShowBindModal(false)
    setBindTargetVm(null)
    setSelectedGroupIds([])
    message.success('绑定安全组成功')
  }


  return (
    <div style={{ padding: '24px' }}>
      {/* 虚拟机介绍卡片 */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 }}}>
        <Title level={4} style={{ margin: 0 }}>虚拟机</Title>
        <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
          <strong>描述：</strong> 提供可弹性伸缩的计算服务，支持多种规格配置，满足不同业务场景需求。通过虚拟机可以快速部署应用、搭建开发环境，实现业务的灵活扩展。
        </div>
      </Card>

      {/* 自动开服模块 */}
      <AutoServerModule />

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            虚拟机列表
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateForm(true)}
          >
            创建虚拟机
          </Button>
        </div>
      
      <Table
        columns={columns}
        dataSource={vmList}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 台虚拟机`
        }}
      />

      <Modal
        title="绑定安全组"
        open={showBindModal}
        onCancel={() => { setShowBindModal(false); setBindTargetVm(null); setSelectedGroupIds([]) }}
        onOk={handleConfirmBind}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>目标虚机：{bindTargetVm?.name}</div>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            value={selectedGroupIds}
            onChange={(v) => setSelectedGroupIds(v as string[])}
            options={mockSecurityGroups.map(g => ({ value: g.id, label: `${g.name} (${g.id})` }))}
          />
        </div>
      </Modal>

      {/* 开启公网弹窗：为该虚机创建虚机组，LB 443，后端 8080，路径 /test1 */}
      <Modal
        title="开启公网"
        open={showEnablePublicModal}
        onCancel={() => { setShowEnablePublicModal(false); setEnablePublicTargetVm(null); }}
        onOk={handleConfirmEnablePublic}
        okText="确定开启"
        cancelText="关闭"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={
              <span>
                开启公网能力后，系统将自动生成公网域名，若需实现负载均衡能力，可前往{' '}
                <Link
                  onClick={() => {
                    setShowEnablePublicModal(false)
                    setEnablePublicTargetVm(null)
                    onNavigateToLoadBalancer?.()
                  }}
                  style={{ color: '#1677ff' }}
                >
                  负载均衡管理
                </Link>
                {' '}进行调整
              </span>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>负载均衡监听端口</div>
              <div style={{ fontSize: 14 }}>443 (HTTPS)</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>后端虚拟机组监听端口</div>
              <div style={{ fontSize: 14 }}>8080</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>访问路径</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace' }}>
                {enablePublicTargetVm ? `${LB_DOMAIN}/test1` : '-'}
              </div>
            </div>
          </div>
        </Space>
      </Modal>
    </Card>
    </div>
  )
}