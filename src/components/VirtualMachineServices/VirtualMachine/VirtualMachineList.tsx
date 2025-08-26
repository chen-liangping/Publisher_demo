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

const { Title, Link } = Typography

// 组件接口定义
interface VirtualMachineListProps {
  onViewDetails?: (vm: VirtualMachine) => void
  vmList?: VirtualMachine[]
  setVmList?: (list: VirtualMachine[]) => void
}

// 虚拟机数据类型定义
export interface VirtualMachine {
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
    alias: 'Web服务器1',
    status: 'running',
    spec: '4c.8G',
    systemImage: 'CentOS 7.9 64位',
    privateIp: '172.16.0.10',
    publicIp: '47.96.123.45',
    createTime: '2024-01-15 10:30:00',
    domain: 'g123-web01.com',
    systemDiskSize: 40,
    dataDiskSize: 100,
    loginUser: 'appid',
    securityGroups: ['sg-001'],
    securityGroupNames: ['default-web']
  },
  {
    id: 'i-bp0987654321fedcba',
    name: 'db-server-01',
    alias: '数据库服务器',
    status: 'stopped',
    spec: '8c.16G',
    systemImage: 'Ubuntu 18.04 64位',
    privateIp: '172.16.0.11',
    createTime: '2024-01-14 15:20:00',
    domain: 'g123-db01.com',
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

export default function VirtualMachineList({ onViewDetails, vmList: propVmList, setVmList: propSetVmList }: VirtualMachineListProps = {}) {
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
      content: `确定要删除虚拟机 "${vm.alias}" 吗？此操作不可恢复。`,
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
              {vm.alias}
            </Link>
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>{vm.name}</div>
          <div style={{ color: '#999', fontSize: '11px' }}>ID: {vm.id}</div>
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
        <Space>
          {vm.status === 'stopped' ? (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleVMOperation(vm.id, 'start')}
              title="启动"
            />
          ) : (
            <Button
              size="small"
              icon={<PoweroffOutlined />}
              onClick={() => handleVMOperation(vm.id, 'stop')}
              title="关机"
            />
          )}
          
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleVMOperation(vm.id, 'restart')}
            disabled={vm.status === 'stopped'}
            title="重启"
          />
          
          <Button
            size="small"
            icon={<DesktopOutlined />}
            onClick={() => handleRemoteConnect(vm)}
            disabled={vm.status !== 'running'}
            title={vm.status !== 'running' ? '虚机需要处于运行状态才能远程连接' : '远程连接'}
          />
            
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(vm)}
            title="删除"
          />
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => {
              setBindTargetVm(vm)
              setSelectedGroupIds(vm.securityGroups || [])
              setShowBindModal(true)
            }}
            title="绑定安全组"
          />
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

  // 处理远程连接
  const handleRemoteConnect = (vm: VirtualMachine) => {
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
          <div style={{ marginBottom: 8 }}>目标虚机：{bindTargetVm?.alias}</div>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            value={selectedGroupIds}
            onChange={(v) => setSelectedGroupIds(v as string[])}
          >
            {mockSecurityGroups.map(g => (
              <Select.Option key={g.id} value={g.id}>{g.name} ({g.id})</Select.Option>
            ))}
          </Select>
        </div>
      </Modal>
    </Card>
  )
}