'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Typography,
  Modal,
  Form,
  Input,
  message,
  Space
} from 'antd'
import { 
  PlusOutlined,
  ApiOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import LoadBalancerDetails from './LoadBalancerDetails'
import CertificateManagement from './CertificateManagement'

const { Title, Text } = Typography

// 负载均衡实例数据类型定义
interface LoadBalancer {
  id: string
  name: string
  listenerCount: number
  serverGroupName: string
}

// 模拟负载均衡数据（只保留1-2条）
const mockLoadBalancerData: LoadBalancer[] = [
  {
    id: 'lb-bp1234567890abcdef',
    name: 'web-lb-prod',
    listenerCount: 3,
    serverGroupName: 'web-server-group'
  }
]

export default function LoadBalancerManagement(): React.ReactElement {
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>(mockLoadBalancerData)
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false)
  const [selectedLB, setSelectedLB] = useState<LoadBalancer | null>(null)
  const [showCertificateManagement, setShowCertificateManagement] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [createForm] = Form.useForm<{ name: string }>()

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
          listenerCount: 0,
          serverGroupName: '未配置'
        }
        
        setLoadBalancers(prev => [...prev, newLB])
        setCreateModalOpen(false)
        createForm.resetFields()
        setLoading(false)
        message.success('负载均衡创建成功！')
      }, 1500)
      
    } catch (error) {
      setLoading(false)
      console.error('创建失败:', error)
    }
  }

  // 删除负载均衡
  const handleDelete = (id: string): void => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个负载均衡吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setLoadBalancers(prev => prev.filter(lb => lb.id !== id))
        message.success('删除成功')
      }
    })
  }

  // 如果显示证书管理页面
  if (showCertificateManagement) {
    return (
      <CertificateManagement
        onBack={() => setShowCertificateManagement(false)}
      />
    )
  }

  // 如果选中了负载均衡，显示详情页
  if (selectedLB) {
    return (
      <LoadBalancerDetails
        loadBalancer={selectedLB}
        onBack={() => setSelectedLB(null)}
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>负载均衡</Title>
          <Text type="secondary">管理负载均衡实例，配置监听规则和后端服务器</Text>
        </div>
        <Space>
          <Button
            onClick={() => setShowCertificateManagement(true)}
          >
            证书管理
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            创建负载均衡
          </Button>
        </Space>
      </div>

      {/* 负载均衡卡片列表 */}
      {loadBalancers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <ApiOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无负载均衡实例</div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              style={{ marginTop: 16 }}
              onClick={() => setCreateModalOpen(true)}
            >
              创建第一个负载均衡
            </Button>
          </div>
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {loadBalancers.map(lb => (
            <Card
              key={lb.id}
              hoverable
              style={{ 
                borderRadius: '8px',
                transition: 'all 0.3s',
                minHeight: '120px'
              }}
              styles={{ body: { padding: '28px 24px' } }}
              onClick={() => setSelectedLB(lb)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* 左侧：名称和信息 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
                    <ApiOutlined style={{ fontSize: 20, color: '#1890ff', marginRight: 12 }} />
                    <Text strong style={{ fontSize: 16 }}>{lb.name}</Text>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>监听规则：</Text>
                    <Text strong style={{ color: '#1890ff' }}>{lb.listenerCount} 个</Text>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>虚拟服务器组：</Text>
                    <Text strong>{lb.serverGroupName}</Text>
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="link"
                    icon={<ArrowRightOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedLB(lb)
                    }}
                  >
                    查看详情
                  </Button>
                  <Button
                    danger
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(lb.id)
                    }}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      )}

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
        width={500}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="负载均衡名称"
            rules={[{ required: true, message: '请输入负载均衡名称' }]}
          >
            <Input placeholder="请输入负载均衡名称，例如：web-lb-01" />
          </Form.Item>
 
        </Form>
      </Modal>
    </div>
  )
}
