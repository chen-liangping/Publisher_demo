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


  Select,
  Tag
} from 'antd'
import { 
 
  DeleteOutlined, 
  CopyOutlined,
  UploadOutlined,

  EyeInvisibleOutlined,
  LinkOutlined,
  DisconnectOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

const { Title } = Typography


// 虚拟机数据类型定义（用于下拉选择）
interface VirtualMachine {
  id: string
  name: string
  alias: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
}

// SSH秘钥数据类型定义
interface SSHKey {
  id: string
  name: string
  fingerprint: string
  createTime: string
  publicKey: string
  isImported: boolean
  boundVMs?: VirtualMachine[] // 绑定的虚拟机列表
}

// 模拟虚拟机数据（用于下拉选择）
const mockVMData: VirtualMachine[] = [
  {
    id: 'i-bp1234567890abcdef',
    name: 'web-server-01',
    alias: 'Web服务器1',
    status: 'running'
  },
  {
    id: 'i-bp0987654321fedcba',
    name: 'db-server-01',
    alias: '数据库服务器',
    status: 'stopped'
  },
  {
    id: 'i-bp1111222233334444',
    name: 'app-server-01',
    alias: '应用服务器',
    status: 'running'
  }
]

// 模拟秘钥数据
const mockKeyData: SSHKey[] = [
  {
    id: 'key-001',
    name: 'my-web-server-key',
    fingerprint: 'SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8',
    createTime: '2024-01-15 10:30:00',
    publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbqajDw...',
    isImported: false,
    boundVMs: [mockVMData[0]] // 预绑定第一台虚机
  },
  {
    id: 'key-002', 
    name: 'imported-key',
    fingerprint: 'SHA256:bXhbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY9',
    createTime: '2024-01-14 15:20:00',
    publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD8vbqajDw...',
    isImported: true,
    boundVMs: [] // 无绑定虚机
  }
]

export default function KeyManagement() {
  const [keyList, setKeyList] = useState<SSHKey[]>(mockKeyData)
  const [loading, setLoading] = useState<boolean>(false)
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false)

  const [bindModalVisible, setBindModalVisible] = useState<boolean>(false)
  const [unbindModalVisible, setUnbindModalVisible] = useState<boolean>(false)
  const [currentKey, setCurrentKey] = useState<SSHKey | null>(null)
  const [form] = Form.useForm()
  const [bindForm] = Form.useForm()
  const [unbindForm] = Form.useForm()

  // 复制公钥到剪贴板
  const handleCopyPublicKey = async (publicKey: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(publicKey)
      message.success('公钥已复制到剪贴板')
    } catch {
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
        isImported: false,
        boundVMs: []
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



  // 绑定虚机
  const handleBindVM = async (values: { vmIds: string[] }): Promise<void> => {
    if (!currentKey) return
    
    setLoading(true)
    
    // 模拟API调用
    setTimeout(() => {
      const selectedVMs = mockVMData.filter(vm => values.vmIds.includes(vm.id))
      const updatedKeyList = keyList.map(key => {
        if (key.id === currentKey.id) {
          // 合并已绑定的虚机和新选择的虚机，去重
          const existingVMIds = (key.boundVMs || []).map(vm => vm.id)
          const newVMs = selectedVMs.filter(vm => !existingVMIds.includes(vm.id))
          return {
            ...key,
            boundVMs: [...(key.boundVMs || []), ...newVMs]
          }
        }
        return key
      })
      
      setKeyList(updatedKeyList)
      setBindModalVisible(false)
      setCurrentKey(null)
      setLoading(false)
      bindForm.resetFields()
      message.success(`成功绑定 ${selectedVMs.length} 台虚拟机`)
    }, 1000)
  }

  // 解绑虚机
  const handleUnbindVM = async (values: { vmIds: string[] }): Promise<void> => {
    if (!currentKey) return
    
    setLoading(true)
    
    // 模拟API调用
    setTimeout(() => {
      const updatedKeyList = keyList.map(key => {
        if (key.id === currentKey.id) {
          return {
            ...key,
            boundVMs: (key.boundVMs || []).filter(vm => !values.vmIds.includes(vm.id))
          }
        }
        return key
      })
      
      setKeyList(updatedKeyList)
      setUnbindModalVisible(false)
      setCurrentKey(null)
      setLoading(false)
      unbindForm.resetFields()
      message.success(`成功解绑 ${values.vmIds.length} 台虚拟机`)
    }, 1000)
  }

  // 打开绑定虚机弹窗
  const openBindModal = (key: SSHKey): void => {
    setCurrentKey(key)
    setBindModalVisible(true)
  }

  // 打开解绑虚机弹窗
  const openUnbindModal = (key: SSHKey): void => {
    setCurrentKey(key)
    setUnbindModalVisible(true)
  }

  // 表格列配置
  const columns: TableColumnsType<SSHKey> = [
    {
      title: '秘钥名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.isImported && <div style={{ color: '#1890ff', fontSize: '12px' }}>已导入</div>}
          {/* 显示绑定的虚机信息 */}
          {record.boundVMs && record.boundVMs.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {record.boundVMs.map(vm => (
                <Tag key={vm.id} color="blue" style={{ marginBottom: 2 }}>
                  {vm.alias}
                </Tag>
              ))}
            </div>
          )}
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
            icon={<LinkOutlined />}
            onClick={() => openBindModal(record)}
          >
            绑定虚机
          </Button>
          {record.boundVMs && record.boundVMs.length > 0 && (
            <Button
              size="small"
              icon={<DisconnectOutlined />}
              onClick={() => openUnbindModal(record)}
            >
              解绑虚机
            </Button>
          )}
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
      {/* 绑定虚机弹窗 */}
      <Modal
        title="绑定虚拟机"
        open={bindModalVisible}
        onCancel={() => {
          setBindModalVisible(false)
          setCurrentKey(null)
          bindForm.resetFields()
        }}
        footer={null}
        width={500}
      >
        <Form
          form={bindForm}
          layout="vertical"
          onFinish={handleBindVM}
        >
          <Form.Item
            label="选择虚拟机"
            name="vmIds"
            rules={[
              { required: true, message: '请选择要绑定的虚拟机' }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择虚拟机"
              style={{ width: '100%' }}
              options={mockVMData
                .filter(vm => {
                  // 过滤掉已经绑定的虚机
                  const boundVMIds = currentKey?.boundVMs?.map(boundVM => boundVM.id) || []
                  return !boundVMIds.includes(vm.id)
                })
                .map(vm => ({
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{vm.alias}</span>
                      <Tag color={vm.status === 'running' ? 'green' : 'default'}>
                        {vm.status === 'running' ? '运行中' : '已停止'}
                      </Tag>
                    </div>
                  ),
                  value: vm.id
                }))
              }
              filterOption={(input, option) => {
                const vm = mockVMData.find(v => v.id === option?.value)
                return vm ? vm.alias.toLowerCase().includes(input.toLowerCase()) : false
              }}
            />
          </Form.Item>
          
          <div style={{ color: '#666', fontSize: '14px', marginBottom: 16 }}>
            <p>绑定说明：</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>绑定后，该秘钥可用于SSH连接对应的虚拟机</li>
              <li>一个秘钥可以绑定多台虚拟机</li>
              <li>一台虚拟机也可以绑定多个秘钥</li>
            </ul>
          </div>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                确认绑定
              </Button>
              <Button onClick={() => {
                setBindModalVisible(false)
                setCurrentKey(null)
                bindForm.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      {/* 解绑虚机弹窗 */}
      <Modal
        title="解绑虚拟机"
        open={unbindModalVisible}
        onCancel={() => {
          setUnbindModalVisible(false)
          setCurrentKey(null)
          unbindForm.resetFields()
        }}
        footer={null}
        width={500}
      >
        <Form
          form={unbindForm}
          layout="vertical"
          onFinish={handleUnbindVM}
        >
          <Form.Item
            label="选择要解绑的虚拟机"
            name="vmIds"
            rules={[
              { required: true, message: '请选择要解绑的虚拟机' }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择要解绑的虚拟机"
              style={{ width: '100%' }}
              options={(currentKey?.boundVMs || []).map(vm => ({
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{vm.alias}</span>
                    <Tag color={vm.status === 'running' ? 'green' : 'default'}>
                      {vm.status === 'running' ? '运行中' : '已停止'}
                    </Tag>
                  </div>
                ),
                value: vm.id
              }))}
              filterOption={(input, option) => {
                const vm = currentKey?.boundVMs?.find(v => v.id === option?.value)
                return vm ? vm.alias.toLowerCase().includes(input.toLowerCase()) : false
              }}
            />
          </Form.Item>
          
          <div style={{ color: '#666', fontSize: '14px', marginBottom: 16 }}>
            <p>解绑说明：</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>解绑后，该秘钥将无法用于SSH连接对应的虚拟机</li>
              <li>解绑操作不会影响虚拟机的运行状态</li>
              <li>如需重新绑定，可通过&ldquo;绑定虚机&rdquo;功能重新关联</li>
            </ul>
          </div>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} danger>
                确认解绑
              </Button>
              <Button onClick={() => {
                setUnbindModalVisible(false)
                setCurrentKey(null)
                unbindForm.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}