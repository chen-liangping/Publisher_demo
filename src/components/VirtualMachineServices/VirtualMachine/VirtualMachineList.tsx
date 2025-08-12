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
  message
} from 'antd'
import { 
  PlusOutlined, 
  PoweroffOutlined, 
  ReloadOutlined, 
  DeleteOutlined,
  PlayCircleOutlined,
  GlobalOutlined,
  DesktopOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import CreateVirtualMachine from './CreateVirtualMachine'

const { Title, Link } = Typography

// 组件接口定义
interface VirtualMachineListProps {
  onViewDetails?: (vm: VirtualMachine) => void
}

// 虚拟机数据类型定义
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
  systemDiskSize?: number
  dataDiskSize?: number
  loginUser?: string
  securityGroup?: string
  securityGroupName?: string
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
    securityGroup: 'sg-001',
    securityGroupName: 'default-web'
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
    securityGroup: 'sg-002',
    securityGroupName: 'database-group'
  }
]

export default function VirtualMachineList({ onViewDetails }: VirtualMachineListProps = {}) {
  const [vmList, setVmList] = useState<VirtualMachine[]>(mockVMData)
  const [loading, setLoading] = useState<boolean>(false)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false)

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



  // 表格列配置
  const columns: TableColumnsType<VirtualMachine> = [
    {
      title: '虚拟机名称',
      key: 'info',
      render: (_: any, vm: VirtualMachine) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {onViewDetails ? (
              <Link 
                onClick={() => onViewDetails(vm)}
                style={{ color: '#1677ff' }}
              >
                {vm.alias}
              </Link>
            ) : (
              vm.alias
            )}
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
      render: (_: any, vm: VirtualMachine) => (
        <Space>
          {vm.status === 'stopped' ? (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleVMOperation(vm.id, 'start')}
            >
              启动
            </Button>
          ) : (
            <Button
              size="small"
              icon={<PoweroffOutlined />}
              onClick={() => handleVMOperation(vm.id, 'stop')}
            >
              关机
            </Button>
          )}
          
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleVMOperation(vm.id, 'restart')}
            disabled={vm.status === 'stopped'}
          >
            重启
          </Button>
          
          <Button
            size="small"
            icon={<DesktopOutlined />}
            onClick={() => handleRemoteConnect(vm)}
            disabled={vm.status !== 'running'}
            title={vm.status !== 'running' ? '虚机需要处于运行状态才能远程连接' : ''}
          >
            远程连接
          </Button>
          
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(vm)}
          >
            删除
          </Button>
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
    </Card>
  )
}