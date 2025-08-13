'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Tabs,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Row,
  Col,
  Divider,
  Popconfirm
} from 'antd'
import { 
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,

} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { Option } = Select

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

// 虚拟机实例类型
interface VMInstance {
  id: string
  name: string
  alias: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
}

interface SecurityGroupDetailsProps {
  group: SecurityGroup
  onBack: () => void
}

export default function SecurityGroupDetails({ group, onBack }: SecurityGroupDetailsProps) {
  const [currentGroup, setCurrentGroup] = useState<SecurityGroup>(group)
  const [showAddRuleModal, setShowAddRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<SecurityRule | null>(null)
  const [form] = Form.useForm()

  // 模拟绑定的虚拟机实例数据
  const mockVMInstances: VMInstance[] = [
    { id: 'i-bp1234567890abcdef', name: 'web-server-01', alias: 'Web服务器1', status: 'running' },
    { id: 'i-bp0987654321fedcba', name: 'db-server-01', alias: '数据库服务器', status: 'stopped' },
    { id: 'i-bp1111222233334444', name: 'api-server-01', alias: 'API服务器', status: 'running' }
  ]

  // 获取绑定的实例信息
  const getBoundInstances = () => {
    if (!currentGroup.boundInstances) return []
    return mockVMInstances.filter(vm => currentGroup.boundInstances?.includes(vm.id))
  }

  // 添加规则
  const handleAddRule = async (values: { direction: string; protocol: string; portRange: string[]; sourceType: string; source: string; description: string; action: string; priority: number }) => {
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

    setCurrentGroup(updatedGroup)
    setShowAddRuleModal(false)
    form.resetFields()
    message.success('规则添加成功！')
  }

  // 删除规则
  const handleDeleteRule = (ruleId: string) => {
    const ruleToDelete = currentGroup.rules.find(r => r.id === ruleId)
    if (!ruleToDelete) return

    const updatedGroup = {
      ...currentGroup,
      rules: currentGroup.rules.filter(r => r.id !== ruleId),
      inboundRules: currentGroup.inboundRules - (ruleToDelete.direction === 'inbound' ? 1 : 0),
      outboundRules: currentGroup.outboundRules - (ruleToDelete.direction === 'outbound' ? 1 : 0)
    }

    setCurrentGroup(updatedGroup)
    message.success('规则删除成功！')
  }

  // 编辑规则
  const handleEditRule = (rule: SecurityRule) => {
    setEditingRule(rule)
    form.setFieldsValue(rule)
    setShowAddRuleModal(true)
  }

  // 更新规则
  const handleUpdateRule = async (values: { direction: string; protocol: string; portRange: string[]; sourceType: string; source: string; description: string; action: string; priority: number }) => {
    if (!editingRule) return

    const updatedRules: SecurityRule[] = currentGroup.rules.map(rule => 
      rule.id === editingRule.id 
        ? {
            ...rule,
            direction: (values.direction as 'inbound' | 'outbound'),
            protocol: (values.protocol as 'TCP' | 'UDP' | 'ICMPv4' | 'ICMPv6' | 'ALL'),
            portRange: values.portRange,
            action: (values.action as 'allow' | 'deny'),
            source: values.source,
            priority: values.priority,
            description: values.description
          }
        : rule
    )

    const updatedGroup: SecurityGroup = {
      ...currentGroup,
      rules: updatedRules
    }

    setCurrentGroup(updatedGroup)
    setShowAddRuleModal(false)
    setEditingRule(null)
    form.resetFields()
    message.success('规则更新成功！')
  }




  // 规则表格列配置
  const getRuleColumns = (direction: 'inbound' | 'outbound'): TableColumnsType<SecurityRule> => [
    {
      title: '协议类型',
      dataIndex: 'protocol',
      key: 'protocol',
      width: 100
    },
    {
      title: '端口范围',
      dataIndex: 'portRange',
      key: 'portRange',
      width: 150,
      render: (portRange: string | string[]) => {
        if (Array.isArray(portRange)) {
          return (
            <Space size="small" wrap>
              {portRange.map((port, index) => (
                <Tag key={index} color="blue">{port}</Tag>
              ))}
            </Space>
          )
        }
        return <Tag color="blue">{portRange}</Tag>
      }
    },
    {
      title: '授权策略',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={action === 'allow' ? 'green' : 'red'}>
          {action === 'allow' ? '允许' : '拒绝'}
        </Tag>
      )
    },
    {
      title: direction === 'inbound' ? '来源' : '目标',
      dataIndex: 'source',
      key: 'source',
      width: 150
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
              render: (_: unknown, record: SecurityRule) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          >
            编辑
          </Button>
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
        </Space>
      )
    }
  ]

  // 获取入方向规则
  const getInboundRules = () => currentGroup.rules.filter(rule => rule.direction === 'inbound')
  
  // 获取出方向规则  
  const getOutboundRules = () => currentGroup.rules.filter(rule => rule.direction === 'outbound')

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
          style={{ marginBottom: 16 }}
        >
          返回安全组列表
        </Button>
        
        <Title level={3}>{currentGroup.name}</Title>
        <Text type="secondary">{currentGroup.description}</Text>
      </div>

      {/* 基本信息卡片 */}
      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong>安全组ID：</Text>
              <div style={{ fontSize: '14px', fontFamily: 'Monaco, monospace', marginTop: 4 }}>
                {currentGroup.id}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong>入方向规则：</Text>
              <div style={{ fontSize: '14px', marginTop: 4 }}>
                <Tag color="green">{currentGroup.inboundRules} 条</Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong>出方向规则：</Text>
              <div style={{ fontSize: '14px', marginTop: 4 }}>
                <Tag color="blue">{currentGroup.outboundRules} 条</Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong>创建时间：</Text>
              <div style={{ fontSize: '14px', marginTop: 4 }}>
                {currentGroup.createTime}
              </div>
            </div>
            </Col>
        </Row>                                      

        <Divider />

        {/* 绑定的实例 */}
        <div>
          <Text strong>绑定的实例：</Text>
          <div style={{ marginTop: 8 }}>
            {getBoundInstances().length > 0 ? (
              <Space wrap>
                {getBoundInstances().map(instance => (
                  <Tag 
                    key={instance.id} 
                    color="default" 
                    style={{ marginBottom: 8 }}
                  >
                    {instance.alias}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">暂无绑定实例</Text>
            )}
          </div>
        </div>
      </Card>

      {/* 安全规则卡片 */}
      <Card 
        title="安全规则" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowAddRuleModal(true)}
          >
            添加规则
          </Button>
        }
      >
        <Tabs defaultActiveKey="inbound">
          <TabPane tab={`入方向规则 (${getInboundRules().length})`} key="inbound">
            <Table
              columns={getRuleColumns('inbound')}
              dataSource={getInboundRules()}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
              }}
            />
          </TabPane>
          <TabPane tab={`出方向规则 (${getOutboundRules().length})`} key="outbound">
            <Table
              columns={getRuleColumns('outbound')}
              dataSource={getOutboundRules()}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 添加/编辑规则弹窗 */}
      <Modal
        title={editingRule ? '编辑规则' : '添加规则'}
        open={showAddRuleModal}
        onCancel={() => {
          setShowAddRuleModal(false)
          setEditingRule(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingRule ? handleUpdateRule : handleAddRule}
          style={{ marginTop: 20 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="direction"
                label="方向"
                rules={[{ required: true, message: '请选择方向' }]}
              >
                <Select placeholder="请选择方向">
                  <Option value="inbound">入方向</Option>
                  <Option value="outbound">出方向</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="protocol"
                label="协议类型"
                rules={[{ required: true, message: '请选择协议类型' }]}
              >
                <Select placeholder="请选择协议类型">
                  <Option value="TCP">TCP</Option>
                  <Option value="UDP">UDP</Option>
                  <Option value="ICMPv4">ICMP(ipv4)</Option>
                  <Option value="ICMPv6">ICMP(ipv6)</Option>
                  <Option value="ALL">ALL</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="portRange"
                label="端口范围"
                rules={[{ required: true, message: '请选择或输入端口范围' }]}
              >
                <Select
                  mode="tags"
                  placeholder="选择预设端口或输入自定义端口"
                  style={{ width: '100%' }}
                  tokenSeparators={[',']}
                  options={[
                    { label: 'SSH (22)', value: '22' },
                    { label: 'HTTP (80)', value: '80' },
                    { label: 'HTTPS (443)', value: '443' },
                    { label: 'MySQL (3306)', value: '3306' },
                    { label: 'Redis (6379)', value: '6379' },
                    { label: 'ALL', value: 'ALL' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="action"
                label="授权策略"
                rules={[{ required: true, message: '请选择授权策略' }]}
              >
                <Select placeholder="请选择授权策略">
                  <Option value="allow">允许</Option>
                  <Option value="deny">拒绝</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="source"
                label="授权范围"
                rules={[{ required: true, message: '请输入授权范围' }]}
              >
                <Input placeholder="例如：0.0.0.0/0 或 192.168.1.0/24" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <InputNumber 
                  placeholder="1-100" 
                  min={1} 
                  max={100} 
                  style={{ width: '100%' }} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              placeholder="请输入规则描述（可选）" 
              rows={3}
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setShowAddRuleModal(false)
                setEditingRule(null)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRule ? '更新' : '添加'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  )
}