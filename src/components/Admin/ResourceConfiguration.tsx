'use client'

import React, { useState } from 'react'
import {
  Card,
  Button,
  Collapse,
  Descriptions,
  Form,
  InputNumber,
  message,
  Select,
  Space,
  Typography
} from 'antd'
import { EditOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

const INSTANCE_SPEC_OPTIONS = ['2核4G', '2核8G', '4核8G', '4核16G', '8核16G', '8核32G', '12核48G']
const MYSQL_VERSION_OPTIONS = ['5.7', '8.0']
const REDIS_VERSION_OPTIONS = ['5.0', '6.0', '7.0']
const MONGO_VERSION_OPTIONS = ['5.0', '6.0']
const ZK_VERSION_OPTIONS = ['3.8', '3.9']
const REDIS_SPEC_OPTIONS = ['1GB', '2GB', '4GB']
const BACKUP_GAME_OPTIONS = ['shinchan', 'kakegurui', 'gamedemo', 'testgame', 'demogame']
type EnvKey = 'test' | 'prod'

export interface StorageQuota {
  storageInstancesLimit: number
  storageBackupGames: string[]
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

const DEFAULT_STORAGE_QUOTA: StorageQuota = {
  storageInstancesLimit: 5,
  storageBackupGames: ['shinchan'],
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

const mockStorageConfigByEnv: Record<EnvKey, StorageQuota> = {
  test: {
    ...DEFAULT_STORAGE_QUOTA,
    storageBackupGames: [],
    vmAllowedSpecs: ['2核4G', '2核8G', '4核8G'],
    redisMasterSlaveSpecs: ['1GB'],
    redisShardSpecs: ['1GB'],
    mongoShardMongosCountMax: 2,
    mongoShardMongodCountMax: 2,
    zookeeperNodeCount: 1
  },
  prod: {
    ...DEFAULT_STORAGE_QUOTA,
    storageInstancesLimit: 5,
    storageBackupGames: ['shinchan', 'kakegurui'],
    vmAllowedSpecs: ['2核4G', '2核8G', '4核8G', '4核16G', '8核16G', '8核32G', '12核48G'],
    redisShardSpecs: ['1GB', '2GB', '4GB'],
    mongoShardMongosCountMax: 6,
    mongoShardMongodCountMax: 6,
    zookeeperSpecs: ['1核2G', '2核4G'],
    zookeeperNodeCount: 3
  }
}

type StorageFormValues = StorageQuota

export default function ResourceConfiguration() {
  const [storageConfigByEnv, setStorageConfigByEnv] = useState<Record<EnvKey, StorageQuota>>(mockStorageConfigByEnv)
  const [editingEnv, setEditingEnv] = useState<EnvKey | null>(null)
  const [form] = Form.useForm<StorageFormValues>()

  const handleSubmit = async (envKey: EnvKey): Promise<void> => {
    const values = await form.validateFields()
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
    setStorageConfigByEnv(prev => ({ ...prev, [envKey]: values }))
    setEditingEnv(null)
    message.success(`${envKey === 'test' ? '测试环境' : '正式环境'}存储配额修改成功`)
  }

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
        <Title level={4} style={{ margin: 0 }}>资源全局配置</Title>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {(['test', 'prod'] as const).map(envKey => {
          const envQuota = storageConfigByEnv[envKey]
          const isEditing = editingEnv === envKey
          return (
            <div key={envKey}>
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong>{envKey === 'test' ? '测试环境' : '正式环境'}</Text>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (isEditing) {
                      form.setFieldsValue(envQuota)
                      setEditingEnv(null)
                    } else {
                      form.setFieldsValue(envQuota)
                      setEditingEnv(envKey)
                    }
                  }}
                >
                  {isEditing ? '取消' : '编辑'}
                </Button>
              </Space>

              {!isEditing ? (
                <Card size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="每游戏存储实例上限">{envQuota.storageInstancesLimit}</Descriptions.Item>
                    {envKey === 'prod' && (
                      <Descriptions.Item label="生产备份游戏">
                        {envQuota.storageBackupGames.length ? envQuota.storageBackupGames.join('、') : '-'}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="允许的虚机规格">{envQuota.vmAllowedSpecs.join('、')}</Descriptions.Item>
                  </Descriptions>
                  <Collapse
                    ghost
                    defaultActiveKey={['spec']}
                    items={[
                      {
                        key: 'spec',
                        label: '存储规格配额详情',
                        children: (
                          <Collapse
                            defaultActiveKey={['mysql', 'mongo', 'redis', 'zk']}
                            items={[
                              {
                                key: 'mysql',
                                label: 'MySQL',
                                children: <Descriptions column={1} size="small"><Descriptions.Item label="版本">{envQuota.mysqlVersions.join('、')}</Descriptions.Item><Descriptions.Item label="规格">{envQuota.mysqlSpecs.join('、')}</Descriptions.Item></Descriptions>
                              },
                              {
                                key: 'mongo',
                                label: 'MongoDB',
                                children: <Descriptions column={1} size="small"><Descriptions.Item label="副本集版本">{envQuota.mongoReplicaVersions.join('、')}</Descriptions.Item><Descriptions.Item label="副本集规格">{envQuota.mongoReplicaSpecs.join('、')}</Descriptions.Item><Descriptions.Item label="分片版本">{envQuota.mongoShardedVersions.join('、')}</Descriptions.Item><Descriptions.Item label="Mongos 数量范围">{envQuota.mongoShardMongosCountMin}~{envQuota.mongoShardMongosCountMax}</Descriptions.Item><Descriptions.Item label="Mongod 数量范围">{envQuota.mongoShardMongodCountMin}~{envQuota.mongoShardMongodCountMax}</Descriptions.Item><Descriptions.Item label="Config 数量范围">{envQuota.mongoShardConfigCountMin}~{envQuota.mongoShardConfigCountMax}</Descriptions.Item></Descriptions>
                              },
                              {
                                key: 'redis',
                                label: 'Redis',
                                children: <Descriptions column={1} size="small"><Descriptions.Item label="主从版本">{envQuota.redisMasterSlaveVersions.join('、')}</Descriptions.Item><Descriptions.Item label="主从规格">{envQuota.redisMasterSlaveSpecs.join('、')}</Descriptions.Item><Descriptions.Item label="分片版本">{envQuota.redisShardVersions.join('、')}</Descriptions.Item><Descriptions.Item label="分片规格">{envQuota.redisShardSpecs.join('、')}</Descriptions.Item><Descriptions.Item label="分片数量范围">{envQuota.redisShardCountMin}~{envQuota.redisShardCountMax}</Descriptions.Item></Descriptions>
                              },
                              {
                                key: 'zk',
                                label: 'Zookeeper',
                                children: <Descriptions column={1} size="small"><Descriptions.Item label="版本">{envQuota.zookeeperVersions.join('、')}</Descriptions.Item><Descriptions.Item label="规格">{envQuota.zookeeperSpecs.join('、')}</Descriptions.Item><Descriptions.Item label="节点数">{envQuota.zookeeperNodeCount}</Descriptions.Item></Descriptions>
                              }
                            ]}
                          />
                        )
                      }
                    ]}
                  />
                </Card>
              ) : (
                <Card size="small">
                  <Form form={form} layout="vertical">
                    <Form.Item label="每游戏存储实例上限" name="storageInstancesLimit" rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}>
                      <InputNumber style={{ width: '100%' }} min={0} max={100} />
                    </Form.Item>
                    {envKey === 'prod' && (
                      <Form.Item label="生产存储实例备份游戏（多选）" name="storageBackupGames" rules={[{ required: true, message: '请选择备份游戏' }]}>
                        <Select mode="multiple" options={BACKUP_GAME_OPTIONS.map(v => ({ value: v, label: v }))} />
                      </Form.Item>
                    )}
                    <Form.Item label="允许的虚机规格" name="vmAllowedSpecs" rules={[{ required: true, message: '请选择允许的虚机规格' }]}>
                      <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
                    </Form.Item>

                    <Collapse defaultActiveKey={['mysql-edit', 'mongo-edit', 'redis-edit', 'zk-edit']}>
                      <Collapse.Panel header="MySQL" key="mysql-edit">
                        <Form.Item label="版本" name="mysqlVersions" rules={[{ required: true }]}>
                          <Select mode="multiple" options={MYSQL_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
                        </Form.Item>
                        <Form.Item label="规格" name="mysqlSpecs" rules={[{ required: true }]}>
                          <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
                        </Form.Item>
                      </Collapse.Panel>
                      <Collapse.Panel header="Redis" key="redis-edit">
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
                      </Collapse.Panel>
                      <Collapse.Panel header="MongoDB" key="mongo-edit">
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
                      </Collapse.Panel>
                      <Collapse.Panel header="Zookeeper" key="zk-edit">
                        <Form.Item label="版本" name="zookeeperVersions" rules={[{ required: true }]}>
                          <Select mode="multiple" options={ZK_VERSION_OPTIONS.map(v => ({ value: v, label: v }))} />
                        </Form.Item>
                        <Form.Item label="规格" name="zookeeperSpecs" rules={[{ required: true }]}>
                          <Select mode="multiple" options={INSTANCE_SPEC_OPTIONS.map(v => ({ value: v, label: v }))} />
                        </Form.Item>
                        <Form.Item label="节点数" name="zookeeperNodeCount" rules={[{ required: true }, { type: 'number', min: 1, max: 9 }]}>
                          <InputNumber style={{ width: '100%' }} min={1} max={9} />
                        </Form.Item>
                      </Collapse.Panel>
                    </Collapse>

                    <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={() => { form.setFieldsValue(envQuota); setEditingEnv(null) }}>取消</Button>
                        <Button type="primary" onClick={() => handleSubmit(envKey)}>确认</Button>
                      </div>
                    </Form.Item>
                  </Form>
                </Card>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}