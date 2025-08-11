'use client'

import React from 'react'
import { 
  Card, 
  Descriptions, 
  Tag, 
  Button, 
  Space, 
  Typography,
  Row,
  Col,
  Divider,
  message
} from 'antd'
import { 
  ArrowLeftOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  GlobalOutlined,
  LinkOutlined
} from '@ant-design/icons'

const { Title } = Typography

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
  keyPair?: string
  loginUser?: string
}

interface VirtualMachineDetailsProps {
  vm: VirtualMachine
  onBack: () => void
  onOperation: (vmId: string, operation: string) => void
}

export default function VirtualMachineDetails({ vm, onBack, onOperation }: VirtualMachineDetailsProps) {
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
    onOperation(vm.id, operation)
  }

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
          
          <Button
            icon={<LinkOutlined />}
            onClick={() => message.info('SSH连接功能开发中')}
          >
            SSH连接
          </Button>
          
          <Button
            icon={<GlobalOutlined />}
            onClick={() => message.info(vm.publicIp ? '关闭公网IP' : '分配公网IP')}
          >
            {vm.publicIp ? '释放公网IP' : '分配公网IP'}
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

      {/* 内容区域 - 简洁信息展示 */}
      <div style={{ 
        background: '#fafafa', 
        padding: '24px', 
        borderRadius: '8px',
        border: '1px solid #f0f0f0'
      }}>
        <Row gutter={[48, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>实例ID</div>
              <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.id}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>状态</div>
              <div>{renderStatus(vm.status)}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>规格</div>
              <div style={{ fontSize: '14px' }}>{vm.spec}</div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>系统镜像</div>
              <div style={{ fontSize: '14px' }}>{vm.systemImage}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>创建时间</div>
              <div style={{ fontSize: '14px' }}>{vm.createTime}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>域名</div>
              <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.domain}</div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>私网IP</div>
              <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.privateIp}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>公网IP</div>
              <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.publicIp || '未分配'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>系统盘</div>
              <div style={{ fontSize: '14px' }}>{vm.systemDiskSize ? `${vm.systemDiskSize}GB` : '40GB'}</div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>数据盘</div>
              <div style={{ fontSize: '14px' }}>{vm.dataDiskSize ? `${vm.dataDiskSize}GB` : '未配置'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>密钥名称</div>
              <div style={{ fontSize: '14px' }}>{vm.keyPair || '未配置'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>登录用户</div>
              <div style={{ fontSize: '14px' }}>{vm.loginUser || 'root'}</div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}