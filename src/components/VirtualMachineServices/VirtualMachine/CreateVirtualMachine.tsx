'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Typography,
  Row,
  Col,
  InputNumber,
  Switch,
  message
} from 'antd'
import { 
  ArrowLeftOutlined
} from '@ant-design/icons'
import type { VirtualMachine } from './VirtualMachineList'

const { Title } = Typography
// v5 推荐使用 options 写法

interface CreateVirtualMachineProps {
  onBack: () => void
  onCreate: (vmData: VirtualMachine) => void
}

export default function CreateVirtualMachine({ onBack, onCreate }: CreateVirtualMachineProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const instanceTypes = [
    { value: '4c.16G.10Mbps', label: 'ecs.g6.xlarge' },
    { value: '8c.16G.200Mbps', label: 'ecs.c6.2xlarge' },
    { value: '2c.8G.5Mbps', label: 'ecs.g7.large' },
    { value: '2c.4G.200Mbps', label: 'ecs.c6.large' },
    { value: '2c.4G.10Mbp', label: 'ecs.c7.large' }
  ]

  const systemImages = [
    { value: 'centos7.9', label: 'CentOS 7.9 64位' },
    { value: 'ubuntu18.04', label: 'Ubuntu 18.04 64位' },
    { value: 'ubuntu20.04', label: 'Ubuntu 20.04 64位' },
    { value: 'Linux', label: 'Linux SP5 64位' },
    { value: 'windows2019', label: 'Windows Server 2019' }
  ]

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      // 模拟创建过程
      setTimeout(() => {
        const newVM = {
          id: `i-bp${Date.now()}`,
          name: `vm-${Date.now()}`,
          alias: values.alias,
          status: 'starting' as const,
          spec: values.instanceType,
          systemImage: systemImages.find(img => img.value === values.systemImage)?.label || '',
          privateIp: `172.16.0.${Math.floor(Math.random() * 200) + 10}`,
          publicIp: `47.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          createTime: new Date().toLocaleString('zh-CN'),
          domain: `${values.alias.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}.com`
        }
        
        onCreate(newVM)
        setLoading(false)
        message.success('虚拟机创建成功！')
      }, 2000)
      
    } catch (error: unknown) {
      // 表单校验失败：重置加载、滚动到第一个错误项并提示
      setLoading(false)
      const err = error as { errorFields?: Array<{ name: (string | number)[] }> }
      if (err && Array.isArray(err.errorFields) && err.errorFields.length > 0) {
        try {
          form.scrollToField(err.errorFields[0].name)
        } catch {}
      }
      message.error('表单校验未通过，请完善必填项')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
        >
          返回
        </Button>
        <Title level={2} style={{ margin: 0 }}>创建虚拟机</Title>
      </Space>

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            storage: 50,
            needDataDisk: 'no',
            loginMethod: 'password',
            username: 'appid'
          }}
        >
          <Row gutter={24}>
            {/* 基础配置 */}
            <Col span={24}>
              <Title level={4}>基础配置</Title>
            </Col>
            
            <Col span={24}>
              <Form.Item
                name="alias"
                label="虚拟机名称"
                rules={[{ required: true, message: '请输入虚拟机名称' }]}
              >
                <Input placeholder="请输入虚拟机名称" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="instanceType"
                label="实例规格"
                rules={[{ required: true, message: '请选择实例规格' }]}
              >
                <Select placeholder="请选择实例规格" options={instanceTypes} />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="systemImage"
                label="系统镜像"
                rules={[{ required: true, message: '请选择系统镜像' }]}
              >
                <Select placeholder="请选择系统镜像" options={systemImages} />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="storage"
                label="系统盘大小(GB)"
              >
                <InputNumber 
                  disabled
                  style={{ width: '100%' }}
                  addonAfter="GB"
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="needDataDisk"
                label="是否需要数据盘"
                rules={[{ required: true, message: '请选择是否需要数据盘' }]}
              >
                <Select options={[{ value: 'yes', label: '是' }, { value: 'no', label: '否' }]} />
              </Form.Item>
            </Col>
            
            <Form.Item noStyle dependencies={['needDataDisk']}>
              {({ getFieldValue }) => {
                const needDataDisk = getFieldValue('needDataDisk')
                
                if (needDataDisk === 'yes') {
                  return (
                    <Col span={12}>
                      <Form.Item
                        name="dataDiskSize"
                        label="数据盘大小(GB)"
                        rules={[{ required: true, message: '请设置数据盘大小' }]}
                      >
                        <InputNumber 
                          min={20} 
                          max={500} 
                          style={{ width: '100%' }}
                          placeholder="数据盘大小 (20-500GB)"
                        />
                      </Form.Item>
                    </Col>
                  )
                }
                return null
              }}
            </Form.Item>

            {/* 登录配置 */}
            <Col span={24}>
              <Title level={4} style={{ marginTop: 24 }}>登录配置</Title>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="loginMethod"
                label="登录方式"
              >
                <Select disabled options={[{ value: 'password', label: '账号密码' }]} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
              >
                <Input disabled />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '8-30个字符,支持英文大小写字母、数字、特殊字符()`~!@#$%^&*-_+=|{}[]:;<>,.?/' }
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入密码" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Title level={4} style={{ marginTop: 24 }}>网络配置</Title>
            </Col>

            <Col span={12}>
              <Form.Item
                name="securityGroup"
                label="安全组"
                rules={[{ required: true, message: '请选择安全组' }]}
                extra="选择安全组控制虚拟机的网络访问规则"
              >
                <Select placeholder="请选择安全组" options={[
                  { value: 'sg-001', label: 'default-web (默认Web服务器安全组)' },
                  { value: 'sg-002', label: 'database-group (数据库服务器安全组)' }
                ]} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="enablePublicNetwork"
                label="开启公网连接"
                valuePropName="checked"
                initialValue={false}
                extra="开启后虚拟机将分配公网IP地址"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          
          {/* 操作按钮 */}
          <div style={{ marginTop: 32, textAlign: 'right' }}>
            <Space>
              <Button onClick={onBack}>
                取消
              </Button>
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
              >
                {loading ? '创建中...' : '立即创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  )
}