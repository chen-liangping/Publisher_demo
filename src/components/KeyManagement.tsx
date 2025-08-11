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
  message,
  Upload,
  Divider
} from 'antd'
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CopyOutlined,
  UploadOutlined,
  DownloadOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd'

const { Title } = Typography
const { TextArea } = Input

// SSH秘钥数据类型定义
interface SSHKey {
  id: string
  name: string
  fingerprint: string
  createTime: string
  publicKey: string
  isImported: boolean
}

// 模拟秘钥数据
const mockKeyData: SSHKey[] = [
  {
    id: 'key-001',
    name: 'my-web-server-key',
    fingerprint: 'SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8',
    createTime: '2024-01-15 10:30:00',
    publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbqajDw...',
    isImported: false
  },
  {
    id: 'key-002', 
    name: 'imported-key',
    fingerprint: 'SHA256:bXhbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY9',
    createTime: '2024-01-14 15:20:00',
    publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD8vbqajDw...',
    isImported: true
  }
]

export default function KeyManagement() {
  const [keyList, setKeyList] = useState<SSHKey[]>(mockKeyData)
  const [loading, setLoading] = useState<boolean>(false)
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false)
  const [importModalVisible, setImportModalVisible] = useState<boolean>(false)
  const [form] = Form.useForm()

  // 复制公钥到剪贴板
  const handleCopyPublicKey = async (publicKey: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(publicKey)
      message.success('公钥已复制到剪贴板')
    } catch (error) {
      message.error('复制失败，请手动复制')
    }
  }

  // 删除秘钥
  const handleDeleteKey = (key: SSHKey): void => {
    Modal.confirm({
      title: '确认删除秘钥',
      content: `确定要删除秘钥 "${key.name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setKeyList(keyList.filter(item => item.id !== key.id))
        message.success('秘钥删除成功')
      }
    })
  }

  // 创建新秘钥
  const handleCreateKey = async (values: { name: string }): Promise<void> => {
    setLoading(true)
    
    // 模拟API调用
    setTimeout(() => {
      const newKey: SSHKey = {
        id: `key-${Date.now()}`,
        name: values.name,
        fingerprint: `SHA256:${Math.random().toString(36).substr(2, 43)}`,
        createTime: new Date().toLocaleString('zh-CN'),
        publicKey: `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC${Math.random().toString(36)}...`,
        isImported: false
      }
      
      setKeyList([newKey, ...keyList])
      setCreateModalVisible(false)
      setLoading(false)
      form.resetFields()
      message.success('秘钥创建成功，私钥已自动下载到本地')
      
      // 模拟下载私钥文件
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA${Math.random().toString(36)}...
-----END RSA PRIVATE KEY-----`))
      element.setAttribute('download', `${values.name}.pem`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }, 1000)
  }

  // 导入秘钥
  const handleImportKey = async (values: { name: string; publicKey: string }): Promise<void> => {
    setLoading(true)
    
    // 模拟API调用
    setTimeout(() => {
      const newKey: SSHKey = {
        id: `key-${Date.now()}`,
        name: values.name,
        fingerprint: `SHA256:${Math.random().toString(36).substr(2, 43)}`,
        createTime: new Date().toLocaleString('zh-CN'),
        publicKey: values.publicKey,
        isImported: true
      }
      
      setKeyList([newKey, ...keyList])
      setImportModalVisible(false)
      setLoading(false)
      form.resetFields()
      message.success('秘钥导入成功')
    }, 1000)
  }

  // 表格列配置
  const columns: ColumnsType<SSHKey> = [
    {
      title: '秘钥名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.isImported && <div style={{ color: '#1890ff', fontSize: '12px' }}>已导入</div>}
        </div>
      )
    },
    {
      title: '指纹',
      dataIndex: 'fingerprint',
      key: 'fingerprint',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EyeInvisibleOutlined style={{ color: '#999' }} />
          <span style={{ color: '#999', fontSize: '12px' }}>WDFbg6kX****iKw6EY8</span>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyPublicKey(record.publicKey)}
          >
            复制
          </Button>
        </div>
      )
    },
    {
      title: '公钥',
      key: 'publicKey',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EyeInvisibleOutlined style={{ color: '#999' }} />
          <span style={{ color: '#999', fontSize: '12px' }}>Thbg6kX****iKw6E5SY8</span>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyPublicKey(record.publicKey)}
          >
            复制
          </Button>
        </div>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteKey(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          SSH秘钥管理
        </Title>
        <Space>
          <Button 
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入秘钥
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建秘钥
          </Button>
        </Space>
      </div>
      
      <Table
        columns={columns}
        dataSource={keyList}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个秘钥`
        }}
      />

      {/* 创建秘钥弹窗 */}
      <Modal
        title="创建SSH秘钥"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateKey}
        >
          <Form.Item
            label="秘钥名称"
            name="name"
            rules={[
              { required: true, message: '请输入秘钥名称' },
              { min: 2, max: 128, message: '秘钥名称长度为2-128字符' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9._-]*$/, message: '名称必须以字母开头，支持字母、数字、点号、下划线、短横线' }
            ]}
          >
            <Input placeholder="请输入秘钥名称，如: my-web-server-key" />
          </Form.Item>
          
          <div style={{ color: '#666', fontSize: '14px', marginBottom: 16 }}>
            <p>创建成功后：</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>公钥将保存在云端，用于虚拟机访问认证</li>
              <li>私钥将自动下载到本地，请妥善保管</li>
              <li>私钥文件格式为 .pem，可用于SSH连接</li>
            </ul>
          </div>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建秘钥
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入秘钥弹窗 */}
      <Modal
        title="导入SSH秘钥"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImportKey}
        >
          <Form.Item
            label="秘钥名称"
            name="name"
            rules={[
              { required: true, message: '请输入秘钥名称' },
              { min: 2, max: 128, message: '秘钥名称长度为2-128字符' }
            ]}
          >
            <Input placeholder="请输入秘钥名称" />
          </Form.Item>
          
          <Form.Item
            label="公钥内容"
            name="publicKey"
            rules={[
              { required: true, message: '请输入公钥内容' },
              { pattern: /^ssh-(rsa|dss|ed25519|ecdsa)/, message: '请输入有效的SSH公钥' }
            ]}
          >
            <TextArea
              rows={6}
              placeholder="请粘贴SSH公钥内容，格式如：ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC..."
            />
          </Form.Item>
          
          <div style={{ color: '#666', fontSize: '14px', marginBottom: 16 }}>
            <p>支持的公钥格式：</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>ssh-rsa (RSA keys)</li>
              <li>ssh-dss (DSA keys)</li>
              <li>ssh-ed25519 (Ed25519 keys)</li>
              <li>ssh-ecdsa (ECDSA keys)</li>
            </ul>
          </div>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                导入秘钥
              </Button>
              <Button onClick={() => {
                setImportModalVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}