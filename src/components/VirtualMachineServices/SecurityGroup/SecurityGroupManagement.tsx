'use client'

import React, { useState } from 'react'
import { 
  Table, 
  Button, 
  Space, 
  Typography, 
  Card,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Tag,
  Popconfirm,

  InputNumber
} from 'antd'
import { 
  PlusOutlined, 
  DeleteOutlined,
  SettingOutlined,

} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import SecurityGroupDetails from './SecurityGroupDetails'

const { Title, Text } = Typography
const { Search } = Input
// v5 推荐使用 options 写法

// 安全组数据类型定义
interface SecurityGroup {
  id: string
  name: string
  description: string
  inboundRules: number
  outboundRules: number
  createTime: string
  rules: SecurityRule[]
  boundInstances?: string[] // 绑定的实例ID
}

// 安全规则数据类型定义
interface SecurityRule {
  id: string
  direction: 'inbound' | 'outbound'
  protocol: 'TCP' | 'UDP' | 'ICMPv4' | 'ICMPv6' | 'ALL'
  portRange: string | string[] // 支持单个端口或多个端口
  action: 'allow' | 'deny'
  source: string
  priority: number
  description?: string
}

interface SecurityGroupManagementProps {
  onViewDetails?: (group: SecurityGroup) => void
}

export default function SecurityGroupManagement({ onViewDetails }: SecurityGroupManagementProps) {
  const [groupList, setGroupList] = useState<SecurityGroup[]>([
    {
      id: 'sg-001',
      name: 'default-web',
      description: '默认Web服务器安全组',
      inboundRules: 3,
      outboundRules: 1,
      createTime: '2024-01-15 10:30:00',
      rules: [
        {
          id: 'rule-001',
          direction: 'inbound',
          protocol: 'TCP',
          portRange: '80',
          action: 'allow',
          source: '0.0.0.0/0',
          priority: 1,
          description: 'HTTP访问'
        },
        {
          id: 'rule-002',
          direction: 'inbound',
          protocol: 'TCP',
          portRange: '443',
          action: 'allow',
          source: '0.0.0.0/0',
          priority: 2,
          description: 'HTTPS访问'
        },
        {
          id: 'rule-003',
          direction: 'inbound',
          protocol: 'TCP',
          portRange: '22',
          action: 'allow',
          source: '192.168.1.0/24',
          priority: 3,
          description: 'SSH访问'
        },
        {
          id: 'rule-004',
          direction: 'outbound',
          protocol: 'ALL',
          portRange: 'ALL',
          action: 'allow',
          source: '0.0.0.0/0',
          priority: 1,
          description: '允许所有出站流量'
        }
      ],
      boundInstances: ['i-bp1234567890abcdef']
    },
    {
      id: 'sg-002',
      name: 'database-group',
      description: '数据库服务器安全组',
      inboundRules: 2,
      outboundRules: 1,
      createTime: '2024-01-20 14:20:00',
      rules: [
        {
          id: 'rule-005',
          direction: 'inbound',
          protocol: 'TCP',
          portRange: '3306',
          action: 'allow',
          source: '192.168.1.0/24',
          priority: 1,
          description: 'MySQL访问'
        },
        {
          id: 'rule-006',
          direction: 'inbound',
          protocol: 'TCP',
          portRange: '22',
          action: 'allow',
          source: '192.168.1.100/32',
          priority: 2,
          description: 'SSH管理访问'
        },
        {
          id: 'rule-007',
          direction: 'outbound',
          protocol: 'ALL',
          portRange: 'ALL',
          action: 'allow',
          source: '0.0.0.0/0',
          priority: 1,
          description: '允许所有出站流量'
        }
      ],
      boundInstances: ['i-bp0987654321fedcba']
    }
  ])

  const [filteredGroupList, setFilteredGroupList] = useState<SecurityGroup[]>(groupList)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<SecurityGroup | null>(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [ruleForm] = Form.useForm()
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroup | null>(null)

  // 搜索功能
  const handleSearch = (value: string) => {
    if (!value) {
      setFilteredGroupList(groupList)
    } else {
      const filtered = groupList.filter(group => 
        group.name.toLowerCase().includes(value.toLowerCase()) ||
        group.description.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredGroupList(filtered)
    }
  }

  // 创建安全组
  const handleCreateGroup = async (values: { name: string; description: string }) => {
    setLoading(true)
    
    // 模拟API调用
    setTimeout(() => {
      const newGroup: SecurityGroup = {
        id: `sg-${Date.now()}`,
        name: values.name,
        description: values.description,
        inboundRules: 0,
        outboundRules: 1,
        createTime: new Date().toLocaleString(),
        rules: [
          {
            id: `rule-${Date.now()}`,
            direction: 'outbound',
            protocol: 'ALL',
            portRange: 'ALL',
            action: 'allow',
            source: '0.0.0.0/0',
            priority: 1,
            description: '默认允许所有出站流量'
          }
        ]
      }
      
      const updatedList = [...groupList, newGroup]
      setGroupList(updatedList)
      setFilteredGroupList(updatedList)
      setShowCreateForm(false)
      setLoading(false)
      form.resetFields()
      message.success('安全组创建成功！')
    }, 2000)
  }

  // 删除安全组
  const handleDeleteGroup = (groupId: string) => {
    const updatedList = groupList.filter(group => group.id !== groupId)
    setGroupList(updatedList)
    setFilteredGroupList(updatedList)
    message.success('安全组删除成功！')
  }

  // 配置规则
  const handleConfigureRules = (group: SecurityGroup) => {
    setCurrentGroup(group)
    setShowRuleModal(true)
  }

  // 添加规则
  const handleAddRule = async (values: { direction: string; protocol: string; portRange: string[]; sourceType: string; source: string; description: string; action: string; priority: number }) => {
    if (!currentGroup) return
    
    const newRule: SecurityRule = {
      id: `rule-${Date.now()}`,
      direction: (values.direction as 'inbound' | 'outbound'),
      protocol: (values.protocol as 'TCP' | 'UDP' | 'ICMPv4' | 'ICMPv6' | 'ALL'),
      portRange: values.portRange,
      action: (values.action as 'allow' | 'deny'),
      source: values.source,
      priority: values.priority,
      description: values.description
    }

    const updatedGroup: SecurityGroup = {
      ...currentGroup,
      rules: [...currentGroup.rules, newRule],
      inboundRules: currentGroup.rules.filter(r => r.direction === 'inbound').length + ((values.direction as 'inbound' | 'outbound') === 'inbound' ? 1 : 0),
      outboundRules: currentGroup.rules.filter(r => r.direction === 'outbound').length + ((values.direction as 'inbound' | 'outbound') === 'outbound' ? 1 : 0)
    }

    const updatedList = groupList.map(group => 
      group.id === currentGroup.id ? updatedGroup : group
    )
    
    setGroupList(updatedList)
    setFilteredGroupList(updatedList)
    setCurrentGroup(updatedGroup)
    ruleForm.resetFields()
    message.success('规则添加成功！')
  }

  // 删除规则
  const handleDeleteRule = (ruleId: string) => {
    if (!currentGroup) return

    const ruleToDelete = currentGroup.rules.find(r => r.id === ruleId)
    if (!ruleToDelete) return

    const updatedGroup = {
      ...currentGroup,
      rules: currentGroup.rules.filter(r => r.id !== ruleId),
      inboundRules: currentGroup.inboundRules - (ruleToDelete.direction === 'inbound' ? 1 : 0),
      outboundRules: currentGroup.outboundRules - (ruleToDelete.direction === 'outbound' ? 1 : 0)
    }

    const updatedList = groupList.map(group => 
      group.id === currentGroup.id ? updatedGroup : group
    )
    
    setGroupList(updatedList)
    setFilteredGroupList(updatedList)
    setCurrentGroup(updatedGroup)
    message.success('规则删除成功！')
  }

  const openDetails = (group: SecurityGroup) => {
    if (onViewDetails) {
      onViewDetails(group)
    } else {
      setSelectedGroup(group)
    }
  }

  // 安全组列表表格列配置
  const columns: TableColumnsType<SecurityGroup> = [
    {
      title: '安全组名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: SecurityGroup) => (
        <div>
          <div style={{ fontWeight: 500, cursor: 'pointer', color: '#1677ff' }}
               onClick={() => openDetails(record)}>
            {name}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>ID: {record.id}</div>
        </div>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '入方向规则数',
      dataIndex: 'inboundRules',
      key: 'inboundRules',
      align: 'center'
    },
    {
      title: '出方向规则数',
      dataIndex: 'outboundRules',
      key: 'outboundRules',
      align: 'center'
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: SecurityGroup) => (
        <Space>
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleConfigureRules(record)}
          >
            配置规则
          </Button>
          <Popconfirm
            title="确定要删除这个安全组吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteGroup(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // 规则表格列配置
  const ruleColumns: TableColumnsType<SecurityRule> = [
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      render: (direction: string) => (
        <Tag color={direction === 'inbound' ? 'green' : 'blue'}>
          {direction === 'inbound' ? '入方向' : '出方向'}
        </Tag>
      )
    },
    {
      title: '协议类型',
      dataIndex: 'protocol',
      key: 'protocol'
    },
    {
      title: '端口范围',
      dataIndex: 'portRange',
      key: 'portRange'
    },
    {
      title: '授权策略',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag color={action === 'allow' ? 'green' : 'red'}>
          {action === 'allow' ? '允许' : '拒绝'}
        </Tag>
      )
    },
    {
      title: '授权范围',
      dataIndex: 'source',
      key: 'source'
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: SecurityRule) => (
        <Popconfirm
          title="确定要删除这条规则吗？"
          onConfirm={() => handleDeleteRule(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>
      )
    }
  ]

  if (selectedGroup) {
    return (
      <SecurityGroupDetails
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>安全组管理</Title>
          <Text type="secondary">
            管理虚拟机的网络安全规则，控制入站和出站流量
          </Text>
        </div>

        {/* 操作栏 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowCreateForm(true)}
            >
              创建安全组
            </Button>

          </Space>
          
          <Search
            placeholder="搜索安全组名称"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                setFilteredGroupList(groupList)
              }
            }}
          />
        </div>

        {/* 安全组列表 */}
        <Table
          columns={columns}
          dataSource={filteredGroupList}
          rowKey="id"
          pagination={{
            total: filteredGroupList.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
          }}
        />

        {/* 创建安全组弹窗 */}
        <Modal
          title="创建安全组"
          open={showCreateForm}
          onCancel={() => {
            setShowCreateForm(false)
            form.resetFields()
          }}
          footer={null}
          width={600}
          destroyOnHidden
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateGroup}
            style={{ marginTop: 20 }}
          >
            <Form.Item
              name="name"
              label="安全组名称"
              rules={[
                { required: true, message: '请输入安全组名称' },
                { min: 2, max: 30, message: '名称长度为2-30个字符' }
              ]}
            >
              <Input placeholder="请输入安全组名称" />
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
              rules={[
                { required: true, message: '请输入描述' },
                { max: 100, message: '描述不能超过100个字符' }
              ]}
            >
              <Input.TextArea 
                placeholder="请输入安全组描述" 
                rows={3}
              />
            </Form.Item>

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setShowCreateForm(false)
                  form.resetFields()
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {loading ? '创建中...' : '创建'}
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>

        {/* 规则配置弹窗 */}
        <Modal
          title={`配置规则 - ${currentGroup?.name}`}
          open={showRuleModal}
          onCancel={() => {
            setShowRuleModal(false)
            setCurrentGroup(null)
            ruleForm.resetFields()
          }}
          footer={null}
          width={1200}
          destroyOnHidden
        >
          {currentGroup && (
            <div>
              <Tabs
                defaultActiveKey="rules"
                items={[
                  {
                    key: 'rules',
                    label: '安全规则',
                    children: (
                      <div style={{ marginBottom: 16 }}>
                        <Form
                          form={ruleForm}
                          layout="inline"
                          onFinish={handleAddRule}
                          style={{ marginBottom: 16 }}
                        >
                      <Form.Item name="direction" rules={[{ required: true }]}>
                        <Select placeholder="方向" style={{ width: 100 }}
                          options={[{ value: 'inbound', label: '入方向' }, { value: 'outbound', label: '出方向' }]} />
                      </Form.Item>
                      <Form.Item name="protocol" rules={[{ required: true }]}>
                        <Select placeholder="协议" style={{ width: 100 }}
                          options={[
                            { value: 'TCP', label: 'TCP' },
                            { value: 'UDP', label: 'UDP' },
                            { value: 'ICMPv4', label: 'ICMP(ipv4)' },
                            // 注释 IPV6：{ value: 'ICMPv6', label: 'ICMP(ipv6)' }
                            { value: 'ALL', label: 'ALL' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="portRange" rules={[{ required: true }]}>
                        <Select
                          mode="tags"
                          placeholder="选择端口"
                          style={{ width: 160 }}
                          tokenSeparators={[',']}
                          options={[
                            { label: 'SSH (22)', value: '22' },
                            { label: 'HTTP (80)', value: '80' },
                            { label: 'HTTPS (443)', value: '443' },
                            { label: 'MySQL (3306)', value: '3306' },
                            { label: 'Redis (6379)', value: '6379' },
                            { label: 'PostgreSQL(5432)', value: '5432' },
                            { label: 'ALL', value: 'ALL' }
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="action" rules={[{ required: true }]}>
                        <Select placeholder="策略" style={{ width: 80 }}
                          options={[{ value: 'allow', label: '允许' }, { value: 'deny', label: '拒绝' }]} />
                      </Form.Item>
                      <Form.Item name="source" rules={[{ required: true }]}>
                        <Select
                          mode="tags"
                          placeholder="选择或输入授权范围，例如：0.0.0.0/0"
                          style={{ width: 220 }}
                          tokenSeparators={[',']}
                          options={[
                            { label: '(所有IPV4)0.0.0.0/0', value: '0.0.0.0/0' },
                            { label: '192.168.0.0/16', value: '192.168.0.0/16' },
                            { label: '172.16.0.0/12', value: '172.16.0.0/12' },
                            { label: '10.0.0.0/8', value: '10.0.0.0/8' }
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="priority" rules={[{ required: true }]}>
                        <InputNumber placeholder="优先级" min={1} max={100} style={{ width: 80 }} />
                      </Form.Item>
                      <Form.Item name="description">
                        <Input placeholder="描述" style={{ width: 150 }} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                          添加规则
                        </Button>
                      </Form.Item>
                        </Form>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          )}
        </Modal>
      </Card>
    </div>
  )
}