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
  Input,
  Form,
  Radio,
  Switch,
  Divider,
  Tooltip,
  Dropdown
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  CopyOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'

const { Title, Text } = Typography
const { Option } = Select

// 负载均衡实例数据类型定义
interface LoadBalancer {
  id: string
  name: string
  status: 'running' | 'stopped' | 'configuring' | 'deleting'
  type: 'internet' | 'intranet'
  spec: string
  vpcId: string
  vpcName: string
  createTime: string
  ipAddress: string
  bandwidth: number
  listenerCount: number
  backendServerCount: number
  region: string
  chargeType: 'PayByBandwidth' | 'PayByTraffic'
}

// 模拟负载均衡数据
const mockLoadBalancerData: LoadBalancer[] = [
  {
    id: 'lb-bp1234567890abcdef',
    name: 'web-lb-prod',
    status: 'running',
    type: 'internet',
    spec: 'slb.s1.small',
    vpcId: 'vpc-bp1234567890',
    vpcName: 'vpc-production',
    createTime: '2024-01-15 10:30:00',
    ipAddress: '47.96.123.45',
    bandwidth: 100,
    listenerCount: 3,
    backendServerCount: 5,
    region: 'cn-hangzhou',
    chargeType: 'PayByBandwidth'
  },
  {
    id: 'lb-bp0987654321fedcba',
    name: 'api-lb-test',
    status: 'running',
    type: 'intranet',
    spec: 'slb.s2.medium',
    vpcId: 'vpc-bp0987654321',
    vpcName: 'vpc-testing',
    createTime: '2024-01-14 15:20:00',
    ipAddress: '172.16.0.100',
    bandwidth: 50,
    listenerCount: 2,
    backendServerCount: 3,
    region: 'cn-hangzhou',
    chargeType: 'PayByTraffic'
  },
  {
    id: 'lb-bp1122334455667788',
    name: 'db-lb-backup',
    status: 'stopped',
    type: 'intranet',
    spec: 'slb.s1.small',
    vpcId: 'vpc-bp1122334455',
    vpcName: 'vpc-backup',
    createTime: '2024-01-10 09:15:00',
    ipAddress: '172.16.1.200',
    bandwidth: 20,
    listenerCount: 1,
    backendServerCount: 2,
    region: 'cn-shanghai',
    chargeType: 'PayByBandwidth'
  }
]

export default function LoadBalancerManagement(): React.ReactElement {
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>(mockLoadBalancerData)
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [createForm] = Form.useForm()

  // 状态渲染
  const renderStatus = (status: LoadBalancer['status']): React.ReactElement => {
    const statusConfig = {
      running: { color: 'success', text: '运行中' },
      stopped: { color: 'default', text: '已停止' },
      configuring: { color: 'processing', text: '配置中' },
      deleting: { color: 'error', text: '删除中' }
    }[status]
    
    return <Tag bordered={false} color={statusConfig.color}>{statusConfig.text}</Tag>
  }

  // 类型渲染
  const renderType = (type: LoadBalancer['type']): React.ReactElement => {
    const typeConfig = {
      internet: { color: 'blue', text: '公网' },
      intranet: { color: 'green', text: '内网' }
    }[type]
    
    return <Tag bordered={false} color={typeConfig.color}>{typeConfig.text}</Tag>
  }

  // 计费类型渲染
  const renderChargeType = (chargeType: LoadBalancer['chargeType']): React.ReactElement => {
    const chargeConfig = {
      PayByBandwidth: { text: '按带宽计费' },
      PayByTraffic: { text: '按流量计费' }
    }[chargeType]
    
    return <Text>{chargeConfig.text}</Text>
  }

  // 操作菜单
  const getActionMenu = (record: LoadBalancer): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => message.info(`查看负载均衡详情：${record.name}`)
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => message.info(`编辑负载均衡：${record.name}`)
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制配置',
      onClick: () => message.success(`已复制配置：${record.name}`)
    },
    {
      type: 'divider'
    },
    {
      key: 'start',
      label: '启动',
      disabled: record.status === 'running',
      onClick: () => {
        message.success(`正在启动负载均衡：${record.name}`)
        // 模拟状态更新
        setLoadBalancers(prev => 
          prev.map(lb => 
            lb.id === record.id ? { ...lb, status: 'running' as const } : lb
          )
        )
      }
    },
    {
      key: 'stop',
      label: '停止',
      disabled: record.status === 'stopped',
      onClick: () => {
        message.success(`正在停止负载均衡：${record.name}`)
        setLoadBalancers(prev => 
          prev.map(lb => 
            lb.id === record.id ? { ...lb, status: 'stopped' as const } : lb
          )
        )
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除负载均衡',
          content: `确定要删除负载均衡 "${record.name}" 吗？此操作不可恢复。`,
          okText: '确认删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => {
            setLoadBalancers(prev => prev.filter(lb => lb.id !== record.id))
            message.success('负载均衡已删除')
          }
        })
      }
    }
  ]

  // 表格列定义
  const columns: ColumnsType<LoadBalancer> = [
    {
      title: '负载均衡名称/ID',
      key: 'info',
      width: 200,
      render: (_, record: LoadBalancer) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            <Typography.Link onClick={() => message.info(`查看详情：${record.name}`)}>
              {record.name}
            </Typography.Link>
          </div>
          <div style={{ color: '#666', fontSize: '12px', fontFamily: 'Monaco, monospace' }}>
            {record.id}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatus
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: renderType
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip: string) => (
        <Text copyable style={{ fontFamily: 'Monaco, monospace' }}>{ip}</Text>
      )
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec',
      width: 120
    },
    {
      title: 'VPC',
      key: 'vpc',
      width: 150,
      render: (_, record: LoadBalancer) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.vpcName}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>{record.vpcId}</div>
        </div>
      )
    },
    {
      title: '带宽',
      dataIndex: 'bandwidth',
      key: 'bandwidth',
      width: 80,
      render: (bandwidth: number) => `${bandwidth}Mbps`
    },
    {
      title: '监听器/后端服务器',
      key: 'counts',
      width: 130,
      render: (_, record: LoadBalancer) => (
        <div>
          <div>监听器：{record.listenerCount}</div>
          <div>后端服务器：{record.backendServerCount}</div>
        </div>
      )
    },
    {
      title: '计费方式',
      dataIndex: 'chargeType',
      key: 'chargeType',
      width: 120,
      render: renderChargeType
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 150,
      sorter: (a: LoadBalancer, b: LoadBalancer) => 
        new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record: LoadBalancer) => (
        <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ]

  // 创建负载均衡
  const handleCreate = async (): Promise<void> => {
    try {
      const values = await createForm.validateFields()
      setLoading(true)
      
      // 模拟创建过程
      setTimeout(() => {
        const newLB: LoadBalancer = {
          id: `lb-bp${Date.now()}`,
          name: values.name,
          status: 'configuring',
          type: values.type,
          spec: values.spec,
          vpcId: values.vpcId,
          vpcName: values.vpcId === 'vpc-bp1234567890' ? 'vpc-production' : 'vpc-testing',
          createTime: new Date().toLocaleString('zh-CN'),
          ipAddress: values.type === 'internet' ? `47.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : `172.16.0.${Math.floor(Math.random() * 255)}`,
          bandwidth: values.bandwidth,
          listenerCount: 0,
          backendServerCount: 0,
          region: 'cn-hangzhou',
          chargeType: values.chargeType
        }
        
        setLoadBalancers(prev => [newLB, ...prev])
        setCreateModalOpen(false)
        createForm.resetFields()
        setLoading(false)
        message.success('负载均衡创建成功！')
      }, 2000)
      
    } catch (error) {
      setLoading(false)
      console.error('创建失败:', error)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>负载均衡</Title>
        <div style={{ 
          fontSize: '14px', 
          color: '#666', 
          lineHeight: '1.5'
        }}>
          负载均衡（Server Load Balancer）是将访问流量根据转发策略分发到后端多台云服务器的流量分发控制服务。
        </div>
      </div>

      <Card styles={{ body: { paddingTop: 8 } }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Input.Search
              placeholder="搜索负载均衡名称或ID"
              style={{ width: 280 }}
              onSearch={(value) => message.info(`搜索：${value}`)}
            />
            <Select defaultValue="all" style={{ width: 120 }}>
              <Option value="all">全部状态</Option>
              <Option value="running">运行中</Option>
              <Option value="stopped">已停止</Option>
            </Select>
            <Select defaultValue="all" style={{ width: 120 }}>
              <Option value="all">全部类型</Option>
              <Option value="internet">公网</Option>
              <Option value="intranet">内网</Option>
            </Select>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => message.success('刷新成功')}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              创建负载均衡
            </Button>
          </Space>
        </div>

        <Table<LoadBalancer>
          rowKey="id"
          columns={columns}
          dataSource={loadBalancers}
          pagination={{
            total: loadBalancers.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 创建负载均衡Modal */}
      <Modal
        title="创建负载均衡"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        onOk={handleCreate}
        confirmLoading={loading}
        width={600}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            type: 'internet',
            spec: 'slb.s1.small',
            chargeType: 'PayByBandwidth',
            bandwidth: 100,
            vpcId: 'vpc-bp1234567890'
          }}
        >
          <Form.Item
            name="name"
            label="负载均衡名称"
            rules={[{ required: true, message: '请输入负载均衡名称' }]}
          >
            <Input placeholder="请输入负载均衡名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="网络类型"
            rules={[{ required: true, message: '请选择网络类型' }]}
          >
            <Radio.Group>
              <Radio value="internet">公网</Radio>
              <Radio value="intranet">内网</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="spec"
            label="规格"
            rules={[{ required: true, message: '请选择规格' }]}
          >
            <Select>
              <Option value="slb.s1.small">slb.s1.small（性能共享型）</Option>
              <Option value="slb.s2.small">slb.s2.small（性能保障型）</Option>
              <Option value="slb.s2.medium">slb.s2.medium（性能保障型）</Option>
              <Option value="slb.s3.medium">slb.s3.medium（性能保障型）</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="vpcId"
            label="专有网络VPC"
            rules={[{ required: true, message: '请选择VPC' }]}
          >
            <Select>
              <Option value="vpc-bp1234567890">vpc-production (vpc-bp1234567890)</Option>
              <Option value="vpc-bp0987654321">vpc-testing (vpc-bp0987654321)</Option>
              <Option value="vpc-bp1122334455">vpc-backup (vpc-bp1122334455)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="chargeType"
            label="计费方式"
            rules={[{ required: true, message: '请选择计费方式' }]}
          >
            <Radio.Group>
              <Radio value="PayByBandwidth">按带宽计费</Radio>
              <Radio value="PayByTraffic">按流量计费</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="bandwidth"
            label="带宽峰值"
            rules={[{ required: true, message: '请输入带宽峰值' }]}
          >
            <Input addonAfter="Mbps" type="number" min={1} max={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
