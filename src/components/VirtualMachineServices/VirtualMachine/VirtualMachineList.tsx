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
  Select
} from 'antd'
import { 
  PlusOutlined, 
  PoweroffOutlined, 
  ReloadOutlined, 
  DeleteOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  DesktopOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import CreateVirtualMachine from './CreateVirtualMachine'
import VirtualMachineDetails from './VirtualMachineDetails'
import AutoServerModule from '../../Common/AutoServerModule'

const { Title, Link } = Typography

// 组件接口定义
interface VirtualMachineListProps {
  onViewDetails?: (vm: VirtualMachine) => void
  vmList?: VirtualMachine[]
  setVmList?: (list: VirtualMachine[]) => void
  onNavigateToLoadBalancer?: () => void
}

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

export default function VirtualMachineList({ onViewDetails, vmList: propVmList, setVmList: propSetVmList, onNavigateToLoadBalancer }: VirtualMachineListProps = {}) {
  const [internalVmList, internalSetVmList] = useState<VirtualMachine[]>(mockVMData)
  const vmList = propVmList ?? internalVmList
  const setVmList = propSetVmList ?? internalSetVmList
  const [loading, setLoading] = useState<boolean>(false)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false)
  const [showBindModal, setShowBindModal] = useState<boolean>(false)
  const [bindTargetVm, setBindTargetVm] = useState<VirtualMachine | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [selectedVm, setSelectedVm] = useState<VirtualMachine | null>(null)

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
    <>
      {/* 虚拟机介绍卡片 */}
      <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
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
    </Card>
    </>
  )
}