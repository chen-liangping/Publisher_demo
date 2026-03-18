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
  Empty,
  Select,
  Switch,
  Space
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

const { Title } = Typography
const { Search } = Input

const INSTANCE_SPEC_OPTIONS = ['2核4G', '2核8G', '4核8G', '4核16G', '8核16G', '8核32G', '12核48G']
const MYSQL_VERSION_OPTIONS = ['5.7', '8.0']
const REDIS_VERSION_OPTIONS = ['5.0', '6.0', '7.0']
const MONGO_VERSION_OPTIONS = ['5.0', '6.0']
const ZK_VERSION_OPTIONS = ['3.8', '3.9']
const REDIS_SPEC_OPTIONS = ['1GB', '2GB', '4GB']

export interface StorageQuota {
  id: string
  appId: string
  storageInstancesLimit: number
  storageBackupEnabled: boolean
  vmAllowedSpecs: string[]
  mysqlVersions: string[]
  mysqlSpecs: string[]
  redisMasterSlaveVersions: string[]
  redisMasterSlaveSpecs: string[]
  redisShardVersions: string[]
  redisShardSpecs: string[]
  redisShardCountMin: number
  redisShardCountMax: number
  mongoReplicaVersions: string[]
  mongoReplicaSpecs: string[]
  mongoShardedVersions: string[]
  mongoShardMongosCountMin: number
  mongoShardMongosCountMax: number
  mongoShardMongosSpecs: string[]
  mongoShardMongodCountMin: number
  mongoShardMongodCountMax: number
  mongoShardMongodSpecs: string[]
  mongoShardConfigCountMin: number
  mongoShardConfigCountMax: number
  mongoShardConfigSpecs: string[]
  zookeeperVersions: string[]
  zookeeperSpecs: string[]
  zookeeperNodeCount: number
}

const mockStorageData: StorageQuota[] = [
  {
    id: 'storage-001',
    appId: 'gamedemo',
    storageInstancesLimit: 5,
    storageBackupEnabled: true,
    vmAllowedSpecs: ['2核4G', '2核8G', '4核8G', '4核16G', '8核16G', '8核32G', '12核48G'],
    mysqlVersions: ['5.7', '8.0'],
    mysqlSpecs: ['2核8G', '4核16G'],
    redisMasterSlaveVersions: ['5.0', '6.0', '7.0'],
    redisMasterSlaveSpecs: ['1GB', '2GB'],
    redisShardVersions: ['5.0', '6.0', '7.0'],
    redisShardSpecs: ['1GB', '2GB', '4GB'],
    redisShardCountMin: 2,
    redisShardCountMax: 3,
    mongoReplicaVersions: ['5.0'],
    mongoReplicaSpecs: ['2核8G'],
    mongoShardedVersions: ['5.0'],
    mongoShardMongosCountMin: 2,
    mongoShardMongosCountMax: 6,
    mongoShardMongosSpecs: ['2核8G'],
    mongoShardMongodCountMin: 2,
    mongoShardMongodCountMax: 6,
    mongoShardMongodSpecs: ['2核8G'],
    mongoShardConfigCountMin: 1,
    mongoShardConfigCountMax: 1,
    mongoShardConfigSpecs: ['4核8G'],
    zookeeperVersions: ['3.8'],
    zookeeperSpecs: ['1核2G', '2核4G'],
    zookeeperNodeCount: 3
  },
  {
    id: 'storage-002',
    appId: 'testgame',
    storageInstancesLimit: 5,
    storageBackupEnabled: false,
    vmAllowedSpecs: ['2核4G', '2核8G', '4核8G'],
    mysqlVersions: ['5.7', '8.0'],
    mysqlSpecs: ['2核8G'],
    redisMasterSlaveVersions: ['5.0', '6.0', '7.0'],
    redisMasterSlaveSpecs: ['1GB'],
    redisShardVersions: ['5.0', '6.0', '7.0'],
    redisShardSpecs: ['1GB'],
    redisShardCountMin: 2,
    redisShardCountMax: 3,
    mongoReplicaVersions: ['5.0'],
    mongoReplicaSpecs: ['2核8G'],
    mongoShardedVersions: ['5.0'],
    mongoShardMongosCountMin: 2,
    mongoShardMongosCountMax: 2,
    mongoShardMongosSpecs: ['2核8G'],
    mongoShardMongodCountMin: 2,
    mongoShardMongodCountMax: 2,
    mongoShardMongodSpecs: ['2核8G'],
    mongoShardConfigCountMin: 1,
    mongoShardConfigCountMax: 1,
    mongoShardConfigSpecs: ['4核8G'],
    zookeeperVersions: ['3.8'],
    zookeeperSpecs: ['1核2G'],
    zookeeperNodeCount: 1
  }
]

type StorageFormValues = Omit<StorageQuota, 'id' | 'appId'>

export default function ResourceConfiguration() {
  const [storageList, setStorageList] = useState<StorageQuota[]>(mockStorageData)
  const [filteredList, setFilteredList] = useState<StorageQuota[]>(mockStorageData)
  const [loading, setLoading] = useState<boolean>(false)
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
  const [currentStorage, setCurrentStorage] = useState<StorageQuota | null>(null)
  const [form] = Form.useForm<StorageFormValues>()

  const handleSearch = (value: string): void => {
    if (!value.trim()) {
      setFilteredList(storageList)
      return
    }
    setFilteredList(storageList.filter(item => item.appId.toLowerCase().includes(value.toLowerCase())))
  }

  const handleEditQuota = (record: StorageQuota): void => {
    setCurrentStorage(record)
    form.setFieldsValue(record)
    setEditModalVisible(true)
  }

  const submitUpdate = (values: StorageFormValues): void => {
    if (!currentStorage) return
    setLoading(true)
    setTimeout(() => {
      const updated = storageList.map(item =>
        item.id === currentStorage.id ? { ...item, ...values } : item
      )
      setStorageList(updated)
      setFilteredList(updated)
      setEditModalVisible(false)
      setCurrentStorage(null)
      setLoading(false)
      form.resetFields()
      message.success('存储配额修改成功')
    }, 600)
  }

  const handleSubmit = async (values: StorageFormValues): Promise<void> => {
    if (values.redisShardCountMax < values.redisShardCountMin) {
      message.error('Redis 分片数量：结束值需大于等于起始值')
      return
    }
    if (values.mongoShardMongosCountMax < values.mongoShardMongosCountMin) {
      message.error('Mongo Mongos 数量：结束值需大于等于起始值')
      return
    }
    if (values.mongoShardMongodCountMax < values.mongoShardMongodCountMin) {
      message.error('Mongo Mongod 数量：结束值需大于等于起始值')
      return
    }
    if (values.mongoShardConfigCountMax < values.mongoShardConfigCountMin) {
      message.error('Mongo Config 数量：结束值需大于等于起始值')
      return
    }
    submitUpdate(values)
  }

  const columns: TableColumnsType<StorageQuota> = [
    { title: 'appid', dataIndex: 'appId', key: 'appId', render: (appId: string) => <span style={{ fontWeight: 500 }}>{appId}</span> },
    { title: '存储实例上限', dataIndex: 'storageInstancesLimit', key: 'storageInstancesLimit' },
    { title: '生产备份', dataIndex: 'storageBackupEnabled', key: 'storageBackupEnabled', render: (v: boolean) => (v ? '开启' : '关闭') },
    { title: '允许的虚机规格', key: 'vmAllowedSpecs', render: (_: unknown, r) => r.vmAllowedSpecs.join('/') },
    { title: 'MySQL', key: 'mysql', render: (_: unknown, r) => `${r.mysqlVersions.join('/')} | ${r.mysqlSpecs.join('/')}` },
    { title: 'Redis', key: 'redis', render: (_: unknown, r) => `主从:${r.redisMasterSlaveSpecs.join('/')} 分片:${r.redisShardCountMin}~${r.redisShardCountMax}` },
    { title: 'Mongo', key: 'mongo', render: (_: unknown, r) => `副本:${r.mongoReplicaSpecs.join('/')} 分片Mongos:${r.mongoShardMongosCountMin}~${r.mongoShardMongosCountMax}` },
    { title: '操作', key: 'action', render: (_: unknown, r) => <Button size="small" icon={<EditOutlined />} onClick={() => handleEditQuota(r)}>修改配额</Button> }
  ]

  const rangeRow = (minName: keyof StorageFormValues, maxName: keyof StorageFormValues, min = 0, max = 128) => (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Form.Item name={minName} noStyle rules={[{ required: true }, { type: 'number', min, max }]}>
        <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={min} max={max} placeholder="起始值" />
      </Form.Item>
      <div style={{ width: 48, height: 32, lineHeight: '30px', textAlign: 'center', borderTop: '1px solid #d9d9d9', borderBottom: '1px solid #d9d9d9', background: '#fafafa' }}>~</div>
      <Form.Item name={maxName} noStyle rules={[{ required: true }, { type: 'number', min, max }]}>
        <InputNumber style={{ width: 'calc((100% - 48px) / 2)' }} min={min} max={max} placeholder="结束值" />
      </Form.Item>
    </div>
  )

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>全局存储配置</Title>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="请输入 appid"
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          onChange={e => !e.target.value && handleSearch('')}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredList}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: <Empty description="暂无数据" /> }}
        pagination={{ showSizeChanger: true, showQuickJumper: true, showTotal: total => `共 ${total} 个应用` }}
      />

      <Modal
        title={`存储配额 - ${currentStorage?.appId ?? ''}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setCurrentStorage(null)
          form.resetFields()
        }}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="每游戏存储实例上限" name="storageInstancesLimit" rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
          <Form.Item label="生产存储实例备份功能开关" name="storageBackupEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="允许的虚机规格" name="vmAllowedSpecs" rules={[{ required: true, message: '请选择允许的虚机规格' }]}>
            <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
          </Form.Item>

          <Card size="small" title="MySQL" style={{ marginBottom: 12 }}>
            <Form.Item label="版本" name="mysqlVersions" rules={[{ required: true }]}>
              <Select mode="multiple" options={MYSQL_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="规格" name="mysqlSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Card>

          <Card size="small" title="Redis" style={{ marginBottom: 12 }}>
            <Form.Item label="主从版本" name="redisMasterSlaveVersions" rules={[{ required: true }]}>
              <Select mode="multiple" options={REDIS_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="主从规格" name="redisMasterSlaveSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={REDIS_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="分片版本" name="redisShardVersions" rules={[{ required: true }]}>
              <Select mode="multiple" options={REDIS_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="分片规格" name="redisShardSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={REDIS_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="分片数量范围">{rangeRow('redisShardCountMin', 'redisShardCountMax', 1, 128)}</Form.Item>
          </Card>

          <Card size="small" title="MongoDB" style={{ marginBottom: 12 }}>
            <Form.Item label="副本集版本" name="mongoReplicaVersions" rules={[{ required: true }]}>
              <Select mode="multiple" options={MONGO_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="副本集规格" name="mongoReplicaSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="分片版本" name="mongoShardedVersions" rules={[{ required: true }]}>
              <Select mode="multiple" options={MONGO_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="Mongos 数量范围">{rangeRow('mongoShardMongosCountMin', 'mongoShardMongosCountMax', 0, 20)}</Form.Item>
            <Form.Item label="Mongos 规格" name="mongoShardMongosSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="Mongod 数量范围">{rangeRow('mongoShardMongodCountMin', 'mongoShardMongodCountMax', 0, 20)}</Form.Item>
            <Form.Item label="Mongod 规格" name="mongoShardMongodSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="Config 数量范围">{rangeRow('mongoShardConfigCountMin', 'mongoShardConfigCountMax', 0, 20)}</Form.Item>
            <Form.Item label="Config 规格" name="mongoShardConfigSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Card>

          <Card size="small" title="Zookeeper" style={{ marginBottom: 12 }}>
            <Form.Item label="版本" name="zookeeperVersions" rules={[{ required: true }]}>
              <Select mode="multiple" options={ZK_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="规格" name="zookeeperSpecs" rules={[{ required: true }]}>
              <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="节点数" name="zookeeperNodeCount" rules={[{ required: true }, { type: 'number', min: 1, max: 9 }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={9} />
            </Form.Item>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => { setEditModalVisible(false); setCurrentStorage(null); form.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>确认</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}