'use client'

import React, { useState } from 'react'
import { 
  Button, 
  Table, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message,
  Popconfirm,
  Tag
} from 'antd'
import { PlusOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography
const { TextArea } = Input

// 证书接口定义
interface Certificate {
  id: string
  name: string
  createTime: string
  relatedListeners: string[]
  type: 'server' | 'ca'
  publicKey?: string
  privateKey?: string
  caPublicKey?: string
}

interface CertificateManagementProps {
  onBack: () => void
}

const CertificateManagement: React.FC<CertificateManagementProps> = ({ onBack }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([
    {
      id: 'cert-1',
      name: 'www.test.com',
      createTime: '2024-01-15 10:30:00',
      relatedListeners: ['HTTPS-443', 'HTTPS-8443'],
      type: 'server',
      publicKey: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkW...',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN...'
    },
    {
      id: 'cert-2',
      name: 'api.test.com',
      createTime: '2024-02-20 14:20:00',
      relatedListeners: ['HTTPS-443'],
      type: 'server',
      publicKey: '-----BEGIN CERTIFICATE-----\nMIIDYTCCAkmg...',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADAN...'
    },
    {
      id: 'cert-3',
      name: 'CA-Root-Certificate',
      createTime: '2024-03-10 09:15:00',
      relatedListeners: [],
      type: 'ca',
      caPublicKey: '-----BEGIN CERTIFICATE-----\nMIIDZTCCAk2g...'
    }
  ])

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadForm] = Form.useForm<{
    name: string
    type: 'server' | 'ca'
    publicKey?: string
    privateKey?: string
    caPublicKey?: string
  }>()

  // 证书类型改变时重置相关字段
  const handleTypeChange = (value: 'server' | 'ca'): void => {
    if (value === 'server') {
      uploadForm.setFieldsValue({ caPublicKey: undefined })
    } else {
      uploadForm.setFieldsValue({ publicKey: undefined, privateKey: undefined })
    }
  }

  // 上传证书
  const handleUploadCertificate = (): void => {
    uploadForm.validateFields().then(values => {
      const newCertificate: Certificate = {
        id: `cert-${Date.now()}`,
        name: values.name,
        createTime: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\//g, '-'),
        relatedListeners: [],
        type: values.type,
        ...(values.type === 'server' 
          ? { publicKey: values.publicKey, privateKey: values.privateKey }
          : { caPublicKey: values.caPublicKey }
        )
      }

      setCertificates([...certificates, newCertificate])
      message.success('证书上传成功')
      setUploadModalOpen(false)
      uploadForm.resetFields()
    }).catch(() => {
      message.error('请完整填写证书信息')
    })
  }

  // 删除证书
  const handleDeleteCertificate = (id: string): void => {
    const cert = certificates.find(c => c.id === id)
    if (cert && cert.relatedListeners.length > 0) {
      message.error('该证书已关联监听规则，无法删除')
      return
    }
    setCertificates(certificates.filter(c => c.id !== id))
    message.success('证书删除成功')
  }

  // 表格列定义
  const columns: ColumnsType<Certificate> = [
    {
      title: '证书名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180
    },
    {
      title: '关联监听',
      dataIndex: 'relatedListeners',
      key: 'relatedListeners',
      render: (listeners: string[]) => (
        <Space wrap>
          {listeners.length > 0 ? (
            listeners.map(listener => (
              <Tag key={listener} color="green">{listener}</Tag>
            ))
          ) : (
            <Text type="secondary">未关联</Text>
          )}
        </Space>
      )
    },
    {
      title: '证书类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: 'server' | 'ca') => (
        <Tag color={type === 'server' ? 'blue' : 'orange'}>
          {type === 'server' ? '服务器证书' : 'CA证书'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: unknown, record: Certificate) => (
        <Space size="small">
          <Popconfirm
            title="删除证书"
            description={
              record.relatedListeners.length > 0 
                ? "该证书已关联监听规则，无法删除" 
                : "确定要删除该证书吗？"
            }
            onConfirm={() => handleDeleteCertificate(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.relatedListeners.length > 0}
          >
            <Button 
              type="link" 
              danger 
              size="small"
              icon={<DeleteOutlined />}
              disabled={record.relatedListeners.length > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
          >
            返回
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>证书管理</Title>
            <Text type="secondary">管理SSL/TLS证书，用于HTTPS监听</Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setUploadModalOpen(true)}
        >
          上传证书
        </Button>
      </div>

      {/* 证书列表 */}
      <Table
        columns={columns}
        dataSource={certificates}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个证书`
        }}
      />

      {/* 上传证书弹窗 */}
      <Modal
        title="上传证书"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false)
          uploadForm.resetFields()
        }}
        onOk={handleUploadCertificate}
        okText="上传"
        cancelText="取消"
        width={700}
      >
        <Form
          form={uploadForm}
          layout="vertical"
          initialValues={{ type: 'server' }}
        >
          <Form.Item
            label="证书名称"
            name="name"
            rules={[
              { required: true, message: '请输入证书名称' },
              { min: 2, max: 128, message: '长度为2-128个字符' }
            ]}
          >
            <Input placeholder="例如：www.test.com" showCount maxLength={128} />
          </Form.Item>

          <Form.Item
            label="证书类型"
            name="type"
            rules={[{ required: true, message: '请选择证书类型' }]}
          >
            <Select onChange={handleTypeChange}>
              <Select.Option value="server">服务器证书</Select.Option>
              <Select.Option value="ca">CA证书</Select.Option>
            </Select>
          </Form.Item>

          {/* 服务器证书字段 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'server' ? (
                <>
                  <Form.Item
                    label="公钥证书"
                    name="publicKey"
                    rules={[
                      { required: true, message: '请输入公钥证书' },
                      { 
                        pattern: /^-----BEGIN CERTIFICATE-----/, 
                        message: '公钥证书格式不正确，应以"-----BEGIN CERTIFICATE-----"开头' 
                      }
                    ]}
                  >
                    <TextArea
                      rows={8}
                      placeholder="请粘贴公钥证书内容，以 -----BEGIN CERTIFICATE----- 开头"
                      style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="私钥"
                    name="privateKey"
                    rules={[
                      { required: true, message: '请输入私钥' },
                      { 
                        pattern: /^-----BEGIN (RSA )?PRIVATE KEY-----/, 
                        message: '私钥格式不正确，应以"-----BEGIN PRIVATE KEY-----"或"-----BEGIN RSA PRIVATE KEY-----"开头' 
                      }
                    ]}
                  >
                    <TextArea
                      rows={8}
                      placeholder="请粘贴私钥内容，以 -----BEGIN PRIVATE KEY----- 或 -----BEGIN RSA PRIVATE KEY----- 开头"
                      style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          {/* CA证书字段 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'ca' ? (
                <Form.Item
                  label="客户端CA公钥证书"
                  name="caPublicKey"
                  rules={[
                    { required: true, message: '请输入客户端CA公钥证书' },
                    { 
                      pattern: /^-----BEGIN CERTIFICATE-----/, 
                      message: 'CA证书格式不正确，应以"-----BEGIN CERTIFICATE-----"开头' 
                    }
                  ]}
                >
                  <TextArea
                    rows={8}
                    placeholder="请粘贴客户端CA公钥证书内容，以 -----BEGIN CERTIFICATE----- 开头"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CertificateManagement

