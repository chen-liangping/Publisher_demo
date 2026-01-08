'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Typography,
  Space,
  Form,
  Input,
  InputNumber,
  message,
  Table
} from 'antd'
import { 
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

// 端口配置接口
interface PortConfig {
  id: string
  port: number
  weight: number
}

// 服务器配置接口
interface ServerConfig {
  vmId: string
  vmName: string
  privateIp: string
  ports: PortConfig[]
}

// 虚拟机实例接口
interface VMInstance {
  id: string
  name: string
  privateIp: string
}

interface CreateServerGroupProps {
  onBack: () => void
  onSubmit: (data: { name: string; servers: ServerConfig[] }) => void
  editingGroup?: { name: string; servers: ServerConfig[] } | null
}

const CreateServerGroup: React.FC<CreateServerGroupProps> = ({ onBack, onSubmit, editingGroup }) => {
  const [groupName, setGroupName] = useState(editingGroup?.name || '')
  const [selectedVMs, setSelectedVMs] = useState<string[]>(editingGroup?.servers.map(s => s.vmId) || [])
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>(editingGroup?.servers || [])

  // 可用虚拟机列表
  const availableVMs: VMInstance[] = [
    { id: 'vm-1', name: 'web-server-01', privateIp: '172.16.0.10' },
    { id: 'vm-2', name: 'web-server-02', privateIp: '172.16.0.11' },
    { id: 'vm-3', name: 'api-server-01', privateIp: '172.16.0.20' },
    { id: 'vm-4', name: 'api-server-02', privateIp: '172.16.0.21' },
    { id: 'vm-5', name: 'db-server-01', privateIp: '172.16.0.30' }
  ]

  // 虚拟机表格列定义
  const vmColumns: ColumnsType<VMInstance> = [
    {
      title: '虚拟机名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '内网IP',
      dataIndex: 'privateIp',
      key: 'privateIp',
      render: (ip: string) => (
        <span style={{ fontFamily: 'monospace' }}>{ip}</span>
      )
    }
  ]

  // 选择虚拟机后自动更新配置
  const handleVMSelectionChange = (selectedRowKeys: React.Key[]): void => {
    const checkedValues = selectedRowKeys as string[]
    setSelectedVMs(checkedValues)
    
    if (checkedValues.length === 0) {
      setServerConfigs([])
      return
    }

    // 为每个选中的虚拟机创建配置，保留已有配置
    const newConfigs = checkedValues.map(vmId => {
      const existingConfig = serverConfigs.find(c => c.vmId === vmId)
      if (existingConfig) {
        return existingConfig
      }
      
      // 为新选中的虚拟机创建默认配置
      const vm = availableVMs.find(v => v.id === vmId)
      return {
        vmId,
        vmName: vm?.name || '',
        privateIp: vm?.privateIp || '',
        ports: [{
          id: `port-${Date.now()}`,
          port: 8080,
          weight: 100
        }]
      }
    })

    setServerConfigs(newConfigs)
  }

  // 添加端口
  const handleAddPort = (vmId: string): void => {
    setServerConfigs(configs => 
      configs.map(config => 
        config.vmId === vmId
          ? {
              ...config,
              ports: [...config.ports, {
                id: `port-${Date.now()}`,
                port: 8080,
                weight: 100
              }]
            }
          : config
      )
    )
  }

  // 删除端口
  const handleRemovePort = (vmId: string, portId: string): void => {
    setServerConfigs(configs => 
      configs.map(config => 
        config.vmId === vmId
          ? { ...config, ports: config.ports.filter(p => p.id !== portId) }
          : config
      )
    )
  }

  // 更新端口配置
  const handleUpdatePort = (vmId: string, portId: string, field: 'port' | 'weight', value: number): void => {
    setServerConfigs(configs => 
      configs.map(config => 
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

  // 移除虚拟机
  const handleRemoveVM = (vmId: string): void => {
    setSelectedVMs(prev => prev.filter(id => id !== vmId))
    setServerConfigs(prev => prev.filter(c => c.vmId !== vmId))
  }

  // 提交表单
  const handleSubmit = (): void => {
    // 验证虚拟机组名称
    if (!groupName.trim()) {
      message.error('请填写虚拟机组名称')
      return
    }
    if (groupName.length < 1 || groupName.length > 80) {
      message.error('名称长度必须在1-80个字符之间')
      return
    }
    const namePattern = /^[\u4e00-\u9fa5a-zA-Z0-9\-\/.\_]+$/
    if (!namePattern.test(groupName)) {
      message.error('名称仅支持中文、字母、数字、短划线（-）、正斜线（/）、半角句号（.）和下划线（_）')
      return
    }

    // 验证虚拟机选择
    if (selectedVMs.length === 0) {
      message.error('请至少选择一台虚拟机')
      return
    }

    // 验证每台虚拟机至少有一个端口配置
    for (const config of serverConfigs) {
      if (config.ports.length === 0) {
        message.error(`虚拟机 ${config.vmName} 至少需要配置一个端口`)
        return
      }
    }

    // 提交数据
    onSubmit({
      name: groupName,
      servers: serverConfigs
    })
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>{editingGroup ? '编辑虚拟机组' : '新增虚拟机组'}</Title>
          </Space>
          <Space>
            <Button onClick={onBack}>取消</Button>
            <Button 
              type="primary" 
              onClick={handleSubmit}
              disabled={!groupName.trim() || selectedVMs.length === 0}
            >
              确定创建
            </Button>
          </Space>
        </div>
      </Card>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 1. 虚拟机组名称 */}
        <Card title="1. 虚拟机组名称" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item
              label="名称"
              required
              extra="长度限制为1~80个字符，支持中文、字母、数字、短划线（-）、正斜线（/）、半角句号（.）和下划线（_）"
            >
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="例如：web-server-group"
                maxLength={80}
                showCount
                size="large"
              />
            </Form.Item>
          </Form>
        </Card>

        {/* 2. 选择虚拟机 */}
        <Card 
          title={
            <div>
              2. 选择虚拟机 <span style={{ color: '#ff4d4f' }}>*</span>
              {selectedVMs.length > 0 && (
                <Text type="secondary" style={{ marginLeft: 16, fontSize: 14 }}>
                  已选择 {selectedVMs.length} 台虚拟机
                </Text>
              )}
            </div>
          } 
          style={{ marginBottom: 16 }}
        >
          <Table
            columns={vmColumns}
            dataSource={availableVMs}
            rowKey="id"
            pagination={false}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: selectedVMs,
              onChange: handleVMSelectionChange
            }}
          />
        </Card>

        {/* 3. 配置端口和权重（选择虚拟机后显示）*/}
        {selectedVMs.length > 0 && (
          <Card title="3. 配置端口和权重" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {serverConfigs.map((config, index) => (
                <Card
                  key={config.vmId}
                  type="inner"
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#1890ff',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{config.vmName}</div>
                        <div style={{ color: '#666', fontSize: 13, fontFamily: 'monospace' }}>
                          {config.privateIp}
                        </div>
                      </div>
                    </div>
                  }
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveVM(config.vmId)}
                    >
                      移除虚拟机
                    </Button>
                  }
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {config.ports.map((port, portIndex) => (
                      <div 
                        key={port.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 16,
                          padding: '12px',
                          background: '#fafafa',
                          borderRadius: '6px'
                        }}
                      >
                        <Text strong style={{ minWidth: 80 }}>
                          端口 {portIndex + 1}
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                          <div>
                            <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>端口号:</Text>
                            <InputNumber
                              min={1}
                              max={65535}
                              value={port.port}
                              onChange={(value) => handleUpdatePort(config.vmId, port.id, 'port', value || 8080)}
                              placeholder="端口"
                              style={{ width: 140 }}
                            />
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>权重:</Text>
                            <InputNumber
                              min={0}
                              max={100}
                              value={port.weight}
                              onChange={(value) => handleUpdatePort(config.vmId, port.id, 'weight', value || 100)}
                              placeholder="权重"
                              style={{ width: 100 }}
                            />
                          </div>
                          {config.ports.length > 1 && (
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemovePort(config.vmId, port.id)}
                            >
                              删除端口
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddPort(config.vmId)}
                      style={{ width: '100%' }}
                    >
                      添加端口
                    </Button>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        )}
      </div>
    </div>
  )
}

export default CreateServerGroup

