'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  message,
  Modal,
  Tabs,
  Table,
  InputNumber,
  Form,
  Input,
  Select,
  Card,
} from 'antd'
import { 
  ArrowLeftOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  
  DesktopOutlined,
  MinusCircleTwoTone,
  ArrowRightOutlined
} from '@ant-design/icons'
import type { FormInstance } from 'antd/es/form'

const { Title } = Typography

interface VirtualMachine {
  id: string
  name: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  spec: string
  systemImage: string
  privateIp: string
  publicIp?: string
  createTime: string
  domain: string
  sslCertName?: string
  systemDiskSize?: number
  dataDiskSize?: number
  loginUser?: string
  securityGroups?: string[]
  securityGroupNames?: string[]
}

interface VirtualMachineDetailsProps {
  vm: VirtualMachine
  onBack: () => void
  onOperation: (vmId: string, operation: string, payload?: string | undefined) => void
  onNavigateToLoadBalancer?: () => void
}

// 块存储数据结构
interface BlockStorage {
  id: string
  name: string
  status: 'In_use' | 'Available' | 'Attaching' | 'Detaching'
  diskType: 'system' | 'data' | 'cloud_essd'
  size: number
  createTime: string
}

// 安全组数据结构
interface SecurityGroup {
  id: string
  name: string
  description: string
  vpcId?: string
  createTime: string
}

// 安全组规则数据结构
interface SecurityGroupRule {
  id: string
  direction: 'inbound' | 'outbound'
  protocol: string
  portRange: string
  source: string
  policy: 'allow' | 'deny'
  priority: number
  securityGroupId: string
  securityGroupName: string
  description: string
}

export default function VirtualMachineDetails({ vm, onBack, onOperation, onNavigateToLoadBalancer }: VirtualMachineDetailsProps) {
  const [publicIp, setPublicIp] = useState<string | undefined>(vm.publicIp)
  
  // 挂载存储弹窗状态
  const [mountStorageModalVisible, setMountStorageModalVisible] = useState<boolean>(false)
  const [mountStorageForm] = Form.useForm<{ size: number; mountPath: string }>()
  
  // 挂载安全组弹窗状态
  const [mountSecurityGroupModalVisible, setMountSecurityGroupModalVisible] = useState<boolean>(false)
  const [mountSecurityGroupForm] = Form.useForm<{ securityGroupIds: string[] }>()
  
  // 块存储列表数据
  const [blockStorageList, setBlockStorageList] = useState<BlockStorage[]>([
    {
      id: 'd-bp1234567890abcdef',
      name: 'system-disk-001',
      status: 'In_use',
      diskType: 'system',
      size: 40,
      createTime: '2024-01-15 10:30:00'
    },
    {
      id: 'd-bp0987654321fedcba',
      name: 'data-disk-001',
      status: 'In_use',
      diskType: 'data',
      size: 100,
      createTime: '2024-01-15 10:35:00'
    }
  ])
  
  // 已挂载的安全组列表
  const [mountedSecurityGroups, setMountedSecurityGroups] = useState<SecurityGroup[]>([
    {
      id: 'sg-bp1234567890abcdef',
      name: 'default-web',
      description: 'Web服务器默认安全组',
      vpcId: 'vpc-001',
      createTime: '2024-01-10 09:00:00'
    },
    {
      id: 'sg-bp0987654321fedcba',
      name: 'ssh-access',
      description: 'SSH远程访问安全组',
      vpcId: 'vpc-001',
      createTime: '2024-01-10 09:05:00'
    }
  ])
  
  // 可用的安全组列表（模拟数据）
  const [availableSecurityGroups] = useState<SecurityGroup[]>([
    {
      id: 'sg-bp1111111111111111',
      name: 'database-access',
      description: '数据库访问安全组',
      vpcId: 'vpc-001',
      createTime: '2024-01-10 09:10:00'
    },
    {
      id: 'sg-bp2222222222222222',
      name: 'redis-cache',
      description: 'Redis缓存访问安全组',
      vpcId: 'vpc-001',
      createTime: '2024-01-10 09:15:00'
    },
    {
      id: 'sg-bp3333333333333333',
      name: 'internal-services',
      description: '内部服务通信安全组',
      vpcId: 'vpc-001',
      createTime: '2024-01-10 09:20:00'
    }
  ])

  const prevSecurityGroupsRef = useRef<string | undefined>(vm.securityGroupNames?.join(','))
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

  // 处理挂载存储的提交
  const handleMountStorage = () => {
    mountStorageForm.validateFields().then((values) => {
      const { size, mountPath } = values
      // 自动生成存储名称
      const storageName = `appid-data-volume-${Date.now()}`
      
      // 生成新的块存储数据
      const newStorage: BlockStorage = {
        id: `d-bp${Date.now()}`,
        name: storageName,
        status: 'In_use',
        diskType: 'cloud_essd',
        size: size,
        createTime: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\//g, '-')
      }
      
      // 添加到块存储列表
      setBlockStorageList([...blockStorageList, newStorage])
      
      // 提示用户
      message.success(`成功挂载数据盘 "${storageName}" (${size}GB) 到路径 "${mountPath}"`)
      
      // 关闭弹窗并重置表单
      setMountStorageModalVisible(false)
      mountStorageForm.resetFields()
    }).catch((error: Error) => {
      console.error('表单验证失败:', error)
    })
  }

  // 处理挂载/解挂安全组的提交
  const handleMountSecurityGroup = () => {
    mountSecurityGroupForm.validateFields().then((values: { securityGroupIds: string[] }) => {
      const selectedIds = values.securityGroupIds || []
      const currentIds = mountedSecurityGroups.map(sg => sg.id)
      
      // 找出新增的安全组（需要挂载）
      const toMount = selectedIds.filter(id => !currentIds.includes(id))
      // 找出被移除的安全组（需要解挂）
      const toUnmount = currentIds.filter(id => !selectedIds.includes(id))
      
      // 获取所有可用的安全组（包括已挂载和未挂载的）
      const allSecurityGroups = [...mountedSecurityGroups, ...availableSecurityGroups]
      
      // 生成新的已挂载列表
      const newMountedGroups = selectedIds
        .map(id => allSecurityGroups.find(sg => sg.id === id))
        .filter((sg): sg is SecurityGroup => sg !== undefined)
      
      // 更新已挂载列表
      setMountedSecurityGroups(newMountedGroups)
      
      // 记录操作日志
      // 提示用户
      if (toMount.length > 0 && toUnmount.length > 0) {
        message.success(`成功挂载 ${toMount.length} 个安全组，解挂 ${toUnmount.length} 个安全组`)
      } else if (toMount.length > 0) {
        message.success(`成功挂载 ${toMount.length} 个安全组`)
      } else if (toUnmount.length > 0) {
        message.success(`成功解挂 ${toUnmount.length} 个安全组`)
      } else {
        message.info('未做任何更改')
      }
      
      // 关闭弹窗（不重置表单，保持选中状态）
      setMountSecurityGroupModalVisible(false)
    }).catch((error: Error) => {
      console.error('表单验证失败:', error)
    })
  }


  // 监听安全组变更，若发生变更则写入"绑定安全组"日志（适配父组件更新 vm.securityGroupNames 的场景）
  useEffect(() => {
    const prev = prevSecurityGroupsRef.current
    const curr = vm.securityGroupNames?.join(',')
    if (prev !== curr) {
      prevSecurityGroupsRef.current = curr
    }
  }, [vm.securityGroupNames])

  // 当打开安全组管理弹窗时，更新表单的初始值
  useEffect(() => {
    if (mountSecurityGroupModalVisible) {
      mountSecurityGroupForm.setFieldsValue({
        securityGroupIds: mountedSecurityGroups.map(sg => sg.id)
      })
    }
  }, [mountSecurityGroupModalVisible, mountedSecurityGroups, mountSecurityGroupForm])

  // 生成安全组规则数据（根据已挂载的安全组）
  const getSecurityGroupRules = (): SecurityGroupRule[] => {
    const rules: SecurityGroupRule[] = []
    
    mountedSecurityGroups.forEach((sg) => {
      // 为每个安全组生成示例规则
      if (sg.id === 'sg-bp1234567890abcdef') {
        // default-web 安全组的规则
        rules.push(
          {
            id: 'rule-1',
            direction: 'inbound',
            protocol: 'tcp',
            portRange: '80/80',
            source: '0.0.0.0/0',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: 'HTTP访问'
          },
          {
            id: 'rule-2',
            direction: 'inbound',
            protocol: 'tcp',
            portRange: '443/443',
            source: '0.0.0.0/0',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: 'HTTPS访问'
          },
          {
            id: 'rule-3',
            direction: 'inbound',
            protocol: 'tcp',
            portRange: '8080/8080',
            source: '172.16.0.0/16',
            policy: 'allow',
            priority: 2,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: '内网应用端口'
          },
          {
            id: 'rule-4',
            direction: 'outbound',
            protocol: 'tcp',
            portRange: '1/65535',
            source: '0.0.0.0/0',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: '全部出站流量'
          }
        )
      } else if (sg.id === 'sg-bp0987654321fedcba') {
        // ssh-access 安全组的规则
        rules.push({
          id: 'rule-5',
          direction: 'inbound',
          protocol: 'tcp',
          portRange: '22/22',
          source: '192.168.1.0/24',
          policy: 'allow',
          priority: 1,
          securityGroupId: sg.id,
          securityGroupName: sg.name,
          description: 'SSH远程访问'
        })
      } else if (sg.id === 'sg-bp1111111111111111') {
        // database-access 安全组的规则
        rules.push(
          {
            id: `rule-${sg.id}-1`,
            direction: 'inbound',
            protocol: 'tcp',
            portRange: '3306/3306',
            source: '172.16.0.0/16',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: 'MySQL数据库访问'
          },
          {
            id: `rule-${sg.id}-2`,
            direction: 'inbound',
            protocol: 'tcp',
            portRange: '5432/5432',
            source: '172.16.0.0/16',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: 'PostgreSQL数据库访问'
          }
        )
      } else if (sg.id === 'sg-bp2222222222222222') {
        // redis-cache 安全组的规则
        rules.push({
          id: `rule-${sg.id}-1`,
          direction: 'inbound',
          protocol: 'tcp',
          portRange: '6379/6379',
          source: '172.16.0.0/16',
          policy: 'allow',
          priority: 1,
          securityGroupId: sg.id,
          securityGroupName: sg.name,
          description: 'Redis缓存访问'
        })
      } else if (sg.id === 'sg-bp3333333333333333') {
        // internal-services 安全组的规则
        rules.push(
          {
            id: `rule-${sg.id}-1`,
            direction: 'inbound',
            protocol: 'tcp',
            portRange: '8000/9000',
            source: '172.16.0.0/16',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: '内部服务端口范围'
          },
          {
            id: `rule-${sg.id}-2`,
            direction: 'outbound',
            protocol: 'tcp',
            portRange: '1/65535',
            source: '0.0.0.0/0',
            policy: 'allow',
            priority: 1,
            securityGroupId: sg.id,
            securityGroupName: sg.name,
            description: '全部出站流量'
          }
        )
      }
    })
    
    return rules
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
            {vm.name}
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
          
          {/* 公网 IP 操作已移至公网IP字段旁的图标按钮 */}
          
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleOperation('delete')}
          >
            删除实例
          </Button>
        </Space>
      </div>

      {/* 内容区域 - 现在由 Tabs 的 '基本信息' 子项显示 */}

      {/* Tabs：基本信息 + 操作日志 */}
      <div style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="details"
          items={[
            {
              key: 'details',
              label: '基本信息',
              children: (
                <div style={{ 
                  background: '#fafafa', 
                  padding: '24px', 
                  borderRadius: '8px',
                  border: '1px solid #f0f0f0'
                }}>
                  <Row gutter={[48, 24]}>
                    <Col xs={24} sm={12} lg={8}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>实例名称</div>
                        <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.name}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>系统盘</div>
                        <div style={{ fontSize: '14px' }}>{vm.systemDiskSize ? `${vm.systemDiskSize}GB` : '40GB'}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>数据盘</div>
                        <div style={{ fontSize: '14px' }}>{vm.dataDiskSize ? `${vm.dataDiskSize}GB` : '未配置'}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>登录用户</div>
                        <div style={{ fontSize: '14px' }}>{vm.loginUser || 'root'}</div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={8}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>状态</div>
                        <div>{renderStatus(vm.status)}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>规格</div>
                        <div style={{ fontSize: '14px' }}>{vm.spec}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>私网IP</div>
                        <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.privateIp}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>公网IP</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{publicIp || '未分配'}</div>
                          {/* 公网IP开启后不可关闭，只允许未分配时开启 */}
                          {!publicIp && (
                            <Button
                              size="small"
                              icon={<MinusCircleTwoTone/>}
                              onClick={() => {
                                const newIp = '47.96.123.100'
                                setPublicIp(newIp)
                                message.success('已分配公网IP')
                                onOperation(vm.id, 'updatePublicIp', newIp)
                              }}
                              title="分配公网IP"
                            />
                          )}
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={8}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>创建时间</div>
                        <div style={{ fontSize: '14px' }}>{vm.createTime}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>系统镜像</div>
                        <div style={{ fontSize: '14px' }}>{vm.systemImage}</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>安全组</div>
                        <div style={{ fontSize: '14px' }}>
                          {vm.securityGroupNames && vm.securityGroupNames.length > 0 ? (
                            <Space wrap>
                              {vm.securityGroupNames.map((name, idx) => (
                                <Tag color="blue" key={idx}>
                                  {name}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            '未配置'
                          )}
                        </div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>负载均衡</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace' }}>{vm.domain}</div>
                          {vm.sslCertName ? (
                            <div style={{ color: '#00a8ff', fontSize: 13 }}>
                              {`ssl 证书：${vm.sslCertName}`}
                            </div>
                          ) : null}
                          {onNavigateToLoadBalancer && (
                            <ArrowRightOutlined 
                              style={{ 
                                fontSize: 14, 
                                color: '#1890ff', 
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                              }}
                              onClick={onNavigateToLoadBalancer}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(3px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)'
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: 'security-groups',
              label: '安全组',
              children: (
                <div>
                  {/* 当前挂载安全组数量卡片 */}
                  <Card 
                    style={{ 
                      marginBottom: 16,
                      background: 'transparent',
                      border: '1px solid #e8e8e8',
                      borderRadius: '8px',
                    }}
                    bodyStyle={{ padding: '12px 20px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: 4 }}>
                          当前已挂载安全组
                        </div>
                        <div style={{ color: '#1890ff', fontSize: '24px', fontWeight: 600 }}>
                          {mountedSecurityGroups.length} 个
                        </div>
                      </div>
                      <Button 
                        type="primary"
                        onClick={() => setMountSecurityGroupModalVisible(true)}
                      >
                        挂载安全组
                      </Button>
                    </div>
                  </Card>

                  <Table
                    columns={[
                      {
                        title: '方向',
                        dataIndex: 'direction',
                        key: 'direction',
                        width: 120,
                        render: (direction: string) => (
                          <Tag color={direction === 'inbound' ? 'green' : 'blue'}>
                            {direction === 'inbound' ? '入方向' : '出方向'}
                          </Tag>
                        )
                      },
                      {
                        title: '协议类型',
                        dataIndex: 'protocol',
                        key: 'protocol',
                        width: 120,
                        render: (protocol: string) => (
                          <Tag bordered={false}>{protocol.toUpperCase()}</Tag>
                        )
                      },
                      {
                        title: '端口范围',
                        dataIndex: 'portRange',
                        key: 'portRange',
                        width: 120,
                        render: (portRange: string) => (
                          <Typography.Text code>{portRange}</Typography.Text>
                        )
                      },
                      {
                        title: '授权对象',
                        dataIndex: 'source',
                        key: 'source',
                        width: 150,
                        render: (source: string) => (
                          <Typography.Text code>{source}</Typography.Text>
                        )
                      },
                      {
                        title: '策略',
                        dataIndex: 'policy',
                        key: 'policy',
                        width: 120,
                        render: (policy: string) => (
                          <Tag color={policy === 'allow' ? 'success' : 'error'}>
                            {policy === 'allow' ? '允许' : '拒绝'}
                          </Tag>
                        )
                      },
                      {
                        title: '优先级',
                        dataIndex: 'priority',
                        key: 'priority',
                        width: 120
                      },
                      {
                        title: '所属安全组',
                        key: 'securityGroup',
                        width: 240,
                        render: (_, record: SecurityGroupRule) => (
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: 2 }}>
                              <Typography.Link>{record.securityGroupName}</Typography.Link>
                            </div>
                            <div style={{ color: '#666', fontSize: '12px', fontFamily: 'Monaco, monospace' }}>
                              {record.securityGroupId}
                            </div>
                          </div>
                        )
                      },
                      {
                        title: '描述',
                        dataIndex: 'description',
                        key: 'description',
                        ellipsis: true
                      }
                    ]}
                    dataSource={getSecurityGroupRules()}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
                    }}
                    rowKey="id"
                    scroll={{ x: 1200 }}
                  />
                </div>
              )
            },
            {
              key: 'block-storage',
              label: '块存储',
              children: (
                 <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: 4 }}>云盘列表</div>
  
                    </div>
                    <Space>
                      <Button 
                        type="primary"
                        onClick={() => setMountStorageModalVisible(true)}
                      >
                        挂载存储
                      </Button>
                    </Space>
                  </div>
                  <Table
                    columns={[
                      {
                        title: '云盘名称/ID',
                        key: 'info',
                        render: (_, record: { id: string; name: string; status: string; diskType: string; size: number; createTime: string }) => (
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              <text>{record.name}</text>
                            </div>
                            <text style={{ color: '#666', fontSize: '12px', fontFamily: 'Monaco, monospace' }}>{record.id}</text>
                          </div>
                        )
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => {
                          const statusConfig = {
                            'In_use': { color: 'success', text: '使用中' },
                            'Available': { color: 'default', text: '待挂载' },
                            'Attaching': { color: 'processing', text: '挂载中' },
                            'Detaching': { color: 'warning', text: '卸载中' }
                          }[status] || { color: 'default', text: status }
                          return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                        }
                      },
                      {
                        title: '容量',
                        dataIndex: 'size',
                        key: 'size',
                        render: (size: number) => `${size}GB`
                      },
                      {
                        title: '云盘类型',
                        dataIndex: 'diskType',
                        key: 'diskType',
                        render: (diskType: string) => (
                          <Tag color={diskType === 'system' ? 'green' : 'blue'}>
                            {diskType === 'data' ? '数据盘' : '系统盘'}
                          </Tag>
                        )
                      },
                      {
                        title: '创建时间',
                        dataIndex: 'createTime',
                        key: 'createTime',
                        render: (createTime: string) => `${createTime}`
                      }
                      /*,
                        title: '操作',
                        key: 'action',
                        render: (_, record: { id: string; name: string; status: string; type: string; size: number; diskType: string; device: string; createTime: string }) => (
                          <Space>
                            {record.status === 'In_use' && (
                              <Typography.Link>卸载</Typography.Link>
                            )}
                            {record.status === 'Available' && (
                              <Typography.Link>挂载</Typography.Link>
                            )}
                            <Typography.Link>扩容</Typography.Link>
                            {record.type === 'data' && (
                              <Typography.Link style={{ color: '#ff4d4f' }}>删除</Typography.Link>
                            )}
                          </Space>
                        )
                      }*/
                    ]}
                    dataSource={blockStorageList}
                    pagination={false}
                    rowKey="id"
                  />
                </div>
              )
            }
          ]}
        />
      </div>

      {/* 挂载存储弹窗 */}
      <Modal
        title="挂载存储"
        open={mountStorageModalVisible}
        onOk={handleMountStorage}
        onCancel={() => {
          setMountStorageModalVisible(false)
          mountStorageForm.resetFields()
        }}
        okText="确定"
        cancelText="取消"
        width={560}
      >
        <Form
          form={mountStorageForm}
          layout="vertical"
          initialValues={{ 
            size: 20,
            mountPath: 'gamedemo/date01'
          }}
        >
          <div style={{ 
            marginBottom: 16, 
            padding: '12px 16px', 
            background: '#f5f5f5', 
            borderRadius: '4px',
            fontSize: '13px',
            color: '#666'
          }}>
            存储名称将自动生成为：<span style={{ fontFamily: 'monospace', color: '#1890ff' }}>appid-data-volume</span>
          </div>

          <Form.Item
            label="挂载路径"
            name="mountPath"
            rules={[
              { required: true, message: '请输入挂载路径' }
            ]}
          >
            <Input
              placeholder="请输入挂载路径"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="存储大小"
            name="size"
            rules={[
              { required: true, message: '请输入存储大小' },
              { 
                type: 'number', 
                min: 1, 
                max: 500, 
                message: '存储大小必须在 1GB 到 100GB 之间' 
              }
            ]}
            extra={
              <div style={{ marginTop: 4 }}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>
                  • 存储大小范围：1GB - 100GB
                </div>
                <div style={{ color: '#ff9800', fontSize: '12px' }}>
                  • 随实例释放：该数据卷将随虚拟机实例释放而自动删除
                </div>
              </div>
            }
          >
            <InputNumber
              min={1}
              max={100}
              precision={0}
              addonAfter="GB"
              style={{ width: '100%' }}
              placeholder="请输入存储大小"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 挂载安全组弹窗 */}
      <Modal
        title="管理安全组"
        open={mountSecurityGroupModalVisible}
        onOk={handleMountSecurityGroup}
        onCancel={() => {
          setMountSecurityGroupModalVisible(false)
        }}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form
          form={mountSecurityGroupForm}
          layout="vertical"
          initialValues={{
            securityGroupIds: mountedSecurityGroups.map(sg => sg.id)
          }}
        >
          <Form.Item
            label="选择安全组"
            name="securityGroupIds"
            extra={
              <div style={{ marginTop: 4, color: '#666', fontSize: '12px' }}>
                <div>• 支持多选，勾选的安全组将被挂载</div>
                <div>• 取消勾选已挂载的安全组将解挂该安全组</div>
                <div>• 可以使用搜索功能快速找到目标安全组</div>
              </div>
            }
          >
            <Select
              mode="multiple"
              placeholder="请选择要挂载的安全组"
              showSearch
              style={{ width: '100%' }}
              maxTagCount="responsive"
              filterOption={(input: string, option?: { label: string; value: string; description: string; mounted: boolean }) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                (option?.description ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                // 已挂载的安全组
                ...mountedSecurityGroups.map(sg => ({
                  label: sg.name,
                  value: sg.id,
                  description: sg.description,
                  mounted: true
                })),
                // 未挂载的安全组
                ...availableSecurityGroups
                  .filter(sg => !mountedSecurityGroups.some(mounted => mounted.id === sg.id))
                  .map(sg => ({
                    label: sg.name,
                    value: sg.id,
                    description: sg.description,
                    mounted: false
                  }))
              ]}
              optionRender={(option) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {option.data.label}
                      {option.data.mounted && (
                        <Tag 
                          color="success" 
                          bordered={false} 
                          style={{ marginLeft: 8, fontSize: '11px' }}
                        >
                          已挂载
                        </Tag>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {option.data.description}
                    </div>
                  </div>
                </div>
              )}
            />
          </Form.Item>

          {/* 当前操作统计 */}
          <div style={{ 
            padding: '12px', 
            background: '#f0f5ff', 
            borderRadius: '6px',
            border: '1px solid #adc6ff'
          }}>
            <div style={{ fontSize: '13px', color: '#1890ff', fontWeight: 500 }}>
              💡 提示：当前已挂载 {mountedSecurityGroups.length} 个安全组
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  )
}