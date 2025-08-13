'use client'

import React, { useState } from 'react'
import { 
  Table, 
  Button, 
  Typography, 
  Card,
  Modal,
  Form,
  InputNumber,
  message,
  Input,
  Empty
} from 'antd'
import { 
  EditOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

const { Title } = Typography
const { Search } = Input

// 资源配额数据类型定义
interface ResourceQuota {
  id: string
  appId: string
  cpuCores: number
  mysqlInstances: number
  mongoInstances: number
  redisInstances: number
  zookeeperInstances: number
}

// 模拟资源配额数据
const mockResourceData: ResourceQuota[] = [
  {
    id: 'resource-001',
    appId: 'gamedemo',
    cpuCores: 2,
    mysqlInstances: 1,
    mongoInstances: 1,
    redisInstances: 1,
    zookeeperInstances: 1
  },
  {
    id: 'resource-002',
    appId: 'testgame',
    cpuCores: 4,
    mysqlInstances: 2,
    mongoInstances: 0,
    redisInstances: 2,
    zookeeperInstances: 1
  },
  {
    id: 'resource-003',
    appId: 'demogame',
    cpuCores: 1,
    mysqlInstances: 1,
    mongoInstances: 1,
    redisInstances: 0,
    zookeeperInstances: 0
  }
]

// 表单提交的值类型（仅包含可编辑字段）
type ResourceFormValues = Pick<ResourceQuota, 'cpuCores' | 'mysqlInstances' | 'mongoInstances' | 'redisInstances' | 'zookeeperInstances'>

export default function ResourceConfiguration() {
  const [resourceList, setResourceList] = useState<ResourceQuota[]>(mockResourceData)
  const [filteredList, setFilteredList] = useState<ResourceQuota[]>(mockResourceData)
  const [loading, setLoading] = useState<boolean>(false)
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
  const [currentResource, setCurrentResource] = useState<ResourceQuota | null>(null)
  const [form] = Form.useForm()

  // 搜索过滤
  const handleSearch = (value: string): void => {
    if (!value.trim()) {
      setFilteredList(resourceList)
    } else {
      const filtered = resourceList.filter(item => 
        item.appId.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredList(filtered)
    }
  }

  // 打开编辑弹窗
  const handleEditQuota = (resource: ResourceQuota): void => {
    setCurrentResource(resource)
    form.setFieldsValue(resource)
    setEditModalVisible(true)
  }

  // 表单提交处理
  const handleUpdateQuota = async (values: ResourceFormValues): Promise<void> => {
    if (!currentResource) return

    // 前端校验
    const errors: string[] = []
    
    if (
      values.cpuCores === undefined ||
      values.mysqlInstances === undefined ||
      values.mongoInstances === undefined ||
      values.redisInstances === undefined ||
      values.zookeeperInstances === undefined
    ) {
      errors.push('请完整填写所有配额')
    }

    if (values.cpuCores < 1 || values.cpuCores > 64) {
      errors.push('CPU核数需在 1–64 之间')
    }

    if (values.mysqlInstances < 0 || values.mongoInstances < 0 || 
        values.redisInstances < 0 || values.zookeeperInstances < 0) {
      errors.push('实例数量不能为负数')
    }

    if (values.mysqlInstances > 10 || values.mongoInstances > 10 || 
        values.redisInstances > 10 || values.zookeeperInstances > 10) {
      errors.push('实例数量不能超过10')
    }

    if (errors.length > 0) {
      message.error(errors[0])
      return
    }

    // 检查关键实例数量是否设为0
    const needsConfirmation = (
      (currentResource.mysqlInstances >= 1 && values.mysqlInstances === 0) ||
      (currentResource.redisInstances >= 1 && values.redisInstances === 0)
    )

    if (needsConfirmation) {
      Modal.confirm({
        title: '重要提示',
        content: '将 MySQL/Redis 实例数设为 0 可能影响线上功能，是否继续？',
        okText: '继续',
        cancelText: '取消',
        onOk: () => submitUpdate(values)
      })
    } else {
      submitUpdate(values)
    }
  }

  // 提交更新
  const submitUpdate = async (values: ResourceFormValues): Promise<void> => {
    setLoading(true)

    // 模拟API调用
    setTimeout(() => {
      // 模拟成功/失败（90%概率成功）
      const isSuccess = Math.random() > 0.1

      if (isSuccess) {
        // 更新资源列表
        const updatedList = resourceList.map(item => {
          if (item.id === currentResource?.id) {
            return { ...item, ...values }
          }
          return item
        })

        setResourceList(updatedList)
        setFilteredList(updatedList)
        setEditModalVisible(false)
        setCurrentResource(null)
        setLoading(false)
        form.resetFields()
        message.success('配额修改成功')
      } else {
        // 修改失败
        setLoading(false)
        Modal.error({
          title: '配额修改失败',
          content: '原因：当前租户剩余 CPU 额度不足，请联系管理员提升额度',
          onOk: () => {
            // 保留弹窗内已填数据，可再次提交
          }
        })
      }
    }, 2000)
  }

  // 表格列配置
  const columns: TableColumnsType<ResourceQuota> = [
    {
      title: 'appid',
      dataIndex: 'appId',
      key: 'appId',
      render: (appId: string) => (
        <span style={{ fontWeight: 500 }}>{appId}</span>
      )
    },
    {
      title: '应用资源CPU核数',
      dataIndex: 'cpuCores',
      key: 'cpuCores',
      render: (cores: number) => `${cores} C`
    },
    {
      title: 'MySQL实例数量',
      dataIndex: 'mysqlInstances',
      key: 'mysqlInstances'
    },
    {
      title: 'Mongo实例数量',
      dataIndex: 'mongoInstances',
      key: 'mongoInstances'
    },
    {
      title: 'Redis实例数量',
      dataIndex: 'redisInstances',
      key: 'redisInstances'
    },
    {
      title: 'Zookeeper实例数量',
      dataIndex: 'zookeeperInstances',
      key: 'zookeeperInstances'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: ResourceQuota) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEditQuota(record)}
        >
          修改配额
        </Button>
      )
    }
  ]

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          游戏管理 / 初始化配置
        </Title>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="请输入 appid"
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          onChange={(e) => {
            if (!e.target.value) {
              handleSearch('')
            }
          }}
        />
      </div>
      
      <Table
        columns={columns}
        dataSource={filteredList}
        rowKey="id"
        loading={loading}
        locale={{
          emptyText: <Empty description="暂无数据" />
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个应用`
        }}
      />

      {/* 修改配额弹窗 */}
      <Modal
        title="应用资源配额"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setCurrentResource(null)
          form.resetFields()
        }}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateQuota}
        >
          <Form.Item
            label="CPU最大核数"
            name="cpuCores"
            rules={[
              { required: true, message: '请输入CPU核数' },
              { type: 'number', min: 1, max: 64, message: 'CPU核数需在 1–64 之间' }
            ]}
          >
            <InputNumber 
              min={1} 
              max={64} 
              style={{ width: '100%' }}
              placeholder="请输入CPU核数"
            />
          </Form.Item>

          <Form.Item
            label="Mongo实例数量"
            name="mongoInstances"
            rules={[
              { required: true, message: '请输入Mongo实例数量' },
              { type: 'number', min: 0, max: 10, message: '实例数量需在 0–10 之间' }
            ]}
          >
            <InputNumber 
              min={0} 
              max={10} 
              style={{ width: '100%' }}
              placeholder="请输入Mongo实例数量"
            />
          </Form.Item>

          <Form.Item
            label="MySQL实例数量"
            name="mysqlInstances"
            rules={[
              { required: true, message: '请输入MySQL实例数量' },
              { type: 'number', min: 0, max: 10, message: '实例数量需在 0–10 之间' }
            ]}
          >
            <InputNumber 
              min={0} 
              max={10} 
              style={{ width: '100%' }}
              placeholder="请输入MySQL实例数量"
            />
          </Form.Item>

          <Form.Item
            label="Redis实例数量"
            name="redisInstances"
            rules={[
              { required: true, message: '请输入Redis实例数量' },
              { type: 'number', min: 0, max: 10, message: '实例数量需在 0–10 之间' }
            ]}
          >
            <InputNumber 
              min={0} 
              max={10} 
              style={{ width: '100%' }}
              placeholder="请输入Redis实例数量"
            />
          </Form.Item>

          <Form.Item
            label="Zookeeper实例数量"
            name="zookeeperInstances"
            rules={[
              { required: true, message: '请输入Zookeeper实例数量' },
              { type: 'number', min: 0, max: 10, message: '实例数量需在 0–10 之间' }
            ]}
          >
            <InputNumber 
              min={0} 
              max={10} 
              style={{ width: '100%' }}
              placeholder="请输入Zookeeper实例数量"
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => {
                setEditModalVisible(false)
                setCurrentResource(null)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                确认
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}