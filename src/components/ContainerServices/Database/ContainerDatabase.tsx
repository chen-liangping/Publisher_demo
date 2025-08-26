'use client'

import React, { useState, useEffect } from 'react'
import type { ColumnsType } from 'antd/es/table'
import {
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  message,
} from 'antd'
import { PlusOutlined, SearchOutlined, UserAddOutlined, RollbackOutlined, CloudUploadOutlined, CopyOutlined } from '@ant-design/icons'
import DatabaseDetails from './DatabaseDetails'

const { Title } = Typography
// v5 推荐使用 options 写法

interface DBInstance {
  id: string
  type: string
  alias: string
  spec: string
  arch?: string
  username?: string
  status?: string
  password?: string
  gameId?: string
  // 创建进度相关（原型模拟）
  creatingProgress?: number
  creatingStep?: string
  // 详情页扩展字段（不在列表中展示）
  version?: string
  connectionCount?: number
  defaultPort?: number
  capacity?: string
  qos?: string
  bandwidth?: string
  evictionPolicy?: string
  mangoSpec?: string
  shardSpec?: string
  mangoCount?: number
  shardCount?: number
}

// 模拟自动注入的 gameId（原型）
const AUTO_GAME_ID = 'gamedemo'

const mockData: DBInstance[] = [
  { id: '1', type: 'MySQL', alias: 'mysql-test', spec: '2核8GB', arch: '集群版', username: 'gamedemo_test', status: 'running', password: 'admin123', gameId: AUTO_GAME_ID, version: 'MySQL 5.7', connectionCount: 10000, defaultPort: 3306, capacity: '100GB' },
  { id: '2', type: 'Redis', alias: 'redis-test', spec: '4核16GB', arch: '双机主备架构', username: 'gamedemo_test', status: 'running', password: 'password', gameId: AUTO_GAME_ID, version: 'Redis 6.0', connectionCount: 20000, defaultPort: 6379, capacity: '50GB', qos: '3000000', bandwidth: '96MB/s', evictionPolicy: 'volatile-lru'},
  { id: '3', type: 'Mango', alias: 'mongo-test', spec: '2核4GB', arch: '副本集实例', username: 'gamedemo_test', status: 'running', password: 'mongopass', gameId: AUTO_GAME_ID, version: 'Mango 4.4', connectionCount: 15000, defaultPort: 27017, capacity: '50GB', mangoSpec: '2核4GB', mangoCount: 2, shardSpec: '4核8G', shardCount: 2},
  { id: '4', type: 'Zookeeper', alias: 'zookeeper-test', spec: '2核2GB', arch: '标准版', username: 'gamedemo_test', status: 'running', password: 'zkpass', gameId: AUTO_GAME_ID, version: 'Zookeeper 3.6', defaultPort: 2181 }
]

export default function ContainerDatabase() {
  const [selectedInstance, setSelectedInstance] = useState<DBInstance | null>(null)
  const [data, setData] = useState<DBInstance[]>(mockData)
  const [showCreate, setShowCreate] = useState(false)
  const [form] = Form.useForm()
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined)
  const [searchAlias, setSearchAlias] = useState<string>('')
  // 每种类型当前实例数统计
  const typeCounts: Record<string, number> = data.reduce((acc: Record<string, number>, it) => {
    acc[it.type] = (acc[it.type] || 0) + 1
    return acc
  }, {})
  // 监听表单中 arch 字段的值，以触发组件重渲染（用于显示分片数量等条件字段）
  const archValue = Form.useWatch('arch', form)

  // 当架构选择为分片集群时，自动注入不可编辑的分片数量默认值 3
  useEffect(() => {
    if (archValue === '分片集群') {
      form.setFieldsValue({ shardCount: 3 })
    }
  }, [archValue, form])

  // Mango 特殊：当架构为分片集群实例时，注入默认规格与数量（不可编辑的数量）
  useEffect(() => {
    if (selectedType === 'Mango') {
      if (archValue === '分片集群实例') {
        form.setFieldsValue({ mangoSpec: '4核*8G', mangoCount: 2, shardSpec: '4核*8G', shardCount: 2 })
      } else if (archValue === '副本集实例') {
        // 副本集实例默认规格为 4核*16G，数量不展示
        form.setFieldsValue({ mangoSpec: '4核*16G', mangoCount: undefined, shardSpec: undefined, shardCount: undefined })
      }
    }
  }, [selectedType, archValue, form])
  // message hook to avoid global message.destroy compatibility issues
  const [messageApi, contextHolder] = message.useMessage()

  // 复制密码的安全封装函数（兼容无 clipboard 的环境）
  const copyPassword = (pwd?: string) => {
    const text = pwd || ''
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        try {
          messageApi.success('密码已复制')
        } catch {
          // fallback
          alert('密码已复制')
        }
      }).catch(() => {
        try {
          messageApi.error('复制失败')
        } catch {
          alert('复制失败')
        }
      })
    } else {
      // 备用：使用老式兼容方式或提示
      try {
        const textarea = document.createElement('textarea') as HTMLTextAreaElement
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        try {
          messageApi.success('密码已复制')
        } catch {
          alert('密码已复制')
        }
      } catch {
        try {
          messageApi.warning('当前环境不支持复制')
        } catch {
          alert('当前环境不支持复制')
        }
      }
    }
  }

  // 简易密码生成器（原型用）
  const generatePassword = (len = 12) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-='
    let out = ''
    for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
    return out
  }

  // 小圆点进度指示器（用于创建中占位）
  const Dots = () => {
    const dotStyle: React.CSSProperties = {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#1890ff',
      display: 'inline-block',
      marginRight: 6,
      animation: 'dotPulse 1s infinite linear'
    }
    const containerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center' }
    return (
      <div style={containerStyle}>
        <span style={{ ...dotStyle, animationDelay: '0s' }} />
        <span style={{ ...dotStyle, animationDelay: '0.12s' }} />
        <span style={{ ...dotStyle, animationDelay: '0.24s' }} />
        <style>{`@keyframes dotPulse {0% {opacity: 0.2; transform: translateY(0);}50%{opacity:1; transform: translateY(-4px);}100%{opacity:0.2; transform: translateY(0);}}`}</style>
      </div>
    )
  }

  const typeColorMap: Record<string, string> = {
    MySQL: 'magenta',
    Redis: 'red',
    Mango: 'gold',
    Zookeeper: 'blue'
  }

  const columns: ColumnsType<DBInstance> = [
    { title: '类型', dataIndex: 'type', key: 'type', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? <Dots /> : <Button type="link" onClick={() => setSelectedInstance(record)}><Tag color={typeColorMap[record.type] || 'blue'}>{record.type}</Tag></Button> },
    { title: '别名', dataIndex: 'alias', key: 'alias', render: (_value: string, record: DBInstance) => (
      record.creatingProgress != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dots />
          <span style={{ fontSize: 12, color: '#666' }}>{record.creatingStep} {record.creatingProgress ? `(${record.creatingProgress}%)` : ''}</span>
        </div>
      ) : record.alias
    )},
    { title: '实例规格', dataIndex: 'spec', key: 'spec', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : <div style={{color: '#74b9ff'}}>{record.spec}</div> },
    { title: '架构类型', dataIndex: 'arch', key: 'arch', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : record.arch},
    { title: '用户名', dataIndex: 'username', key: 'username', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : record.username },
    { title: '密码', dataIndex: 'password', key: 'password', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>****</span>
        <Tooltip title="复制密码">
          <Button type="text" icon={<CopyOutlined />} onClick={() => copyPassword(record.password)} />
        </Tooltip>
      </div>
    )},
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: DBInstance) => (
        <Space>
          <Tooltip title="数据库查询">
            <Button type="text" icon={<SearchOutlined />} onClick={() => message.info(`查询 ${record.alias}（模拟）`)} />
          </Tooltip>
          <Tooltip title="加白名单">
            <Button type="text" icon={<UserAddOutlined />} onClick={() => message.info(`为 ${record.alias} 加白名单（模拟）`)} />
          </Tooltip>
          <Tooltip title="数据库恢复">
            <Button type="text" icon={<RollbackOutlined />} onClick={() => message.info(`恢复 ${record.alias}（模拟）`)} />
          </Tooltip>
          <Tooltip title="备份">
            <Button type="text" icon={<CloudUploadOutlined />} onClick={() => message.info(`备份 ${record.alias}（模拟）`)} />
          </Tooltip>
        </Space>
      )
    }
  ]

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      // 自动生成用户名与密码（前端原型模拟）
      const genPassword = generatePassword(12)
      const genUsername = `${AUTO_GAME_ID}_${values.alias}`

      // 若用户未选择 arch，且类型为 MySQL或Zookeeper，则默认注入 '标准'
      const archValue = values.arch || (values.type === 'MySQL' || values.type === 'Zookeeper' ? '标准' : undefined)

      const newItem: DBInstance = {
        id: Date.now().toString(),
        type: values.type,
        alias: values.alias,
        spec: values.spec,
        arch: archValue,
        username: genUsername,
        password: genPassword,
        status: 'running',
        // 自动注入 gameId（原型模拟，生产应由后端提供）
        gameId: AUTO_GAME_ID,
      }
      // 模拟异步创建流程：先把实例插入为 creating 状态并展示进度
      const creatingItem = { ...newItem, status: 'creating', creatingProgress: 5, creatingStep: '初始化' }
      setData([creatingItem, ...data])
      setShowCreate(false)
      form.resetFields()
      setSelectedType(undefined)

      // 模拟异步步骤进度（6 步）
      const steps = [
        { step: '初始化', percent: 10 },
        { step: '配置实例', percent: 30 },
        { step: '配置 endpoint', percent: 50 },
        { step: '配置账户', percent: 70 },
        { step: '配置公网 endpoint', percent: 90 },
        { step: '完成', percent: 100 }
      ]

      let idx = 0
      const interval = setInterval(() => {
        idx += 1
        const current = steps[Math.min(idx - 1, steps.length - 1)]
        setData((prev) => prev.map(d => d.id === creatingItem.id ? { ...d, creatingProgress: current.percent, creatingStep: current.step } : d))
        if (idx >= steps.length) {
          clearInterval(interval)
          // 最终把状态改为 running
          setData((prev) => prev.map(d => d.id === creatingItem.id ? { ...d, creatingProgress: undefined, creatingStep: undefined, status: 'running' } : d))
          message.success('数据库实例创建完成（模拟）')
        }
      }, 1200)
    } catch (e) {
      // ignore
    }
  }

  return (
    <div>
      {contextHolder}
      {selectedInstance ? (
        <DatabaseDetails instance={selectedInstance} onBack={() => setSelectedInstance(null)} />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>存储</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                // 始终允许打开创建弹窗，类型超限在下拉中禁用
                setShowCreate(true)
                setSelectedType('MySQL')
                form.setFieldsValue({ type: 'MySQL' })
              }}
            >
              添加数据库
        </Button>
      </div>

          <div style={{ color: '#666', fontSize: 14, marginTop: 8, marginBottom: 16,display: 'block' }}> 
            <strong>描述：</strong> 提供从缓存到数据库的全栈中间件存储解决方案，支持存储玩家业务数据与日志数据，并助力应用实现无状态化部署。
              </div>

          {/* 别名搜索框 */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
            <Input.Search
              placeholder="按别名搜索"
              allowClear
              onSearch={(val) => setSearchAlias(val.trim())}
              onChange={(e) => setSearchAlias(e.target.value.trim())}
              style={{ width: 320 }}
            />
              </div>

          <Table columns={columns} dataSource={data.filter(d => !searchAlias || d.alias.toLowerCase().includes(searchAlias.toLowerCase()))} rowKey="id" pagination={{ pageSize: 10 }} />

        </>
      )}

      <Modal title="添加数据库实例" open={showCreate} onOk={handleCreate} onCancel={() => setShowCreate(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select placeholder="选择类型" onChange={(val) => { 
              setSelectedType(val); 
              form.setFieldsValue({ arch: undefined })
              // MySQL 使用预填默认值
              if (val === 'MySQL') {
                form.setFieldsValue({ version: 'MySQL 8.0.1',  arch: '标准' })
              }
            }}
              options={[
                { value: 'MySQL', label: (<Tooltip title={(typeCounts['MySQL'] || 0) >= 2 ? '实例数量已超出最大限制' : ''}><span>MySQL</span></Tooltip>), disabled: (typeCounts['MySQL'] || 0) >= 2 },
                { value: 'Redis', label: (<Tooltip title={(typeCounts['Redis'] || 0) >= 2 ? '实例数量已超出最大限制' : ''}><span>Redis</span></Tooltip>), disabled: (typeCounts['Redis'] || 0) >= 2 },
                { value: 'Mango', label: (<Tooltip title={(typeCounts['Mango'] || 0) >= 2 ? '实例数量已超出最大限制' : ''}><span>Mango</span></Tooltip>), disabled: (typeCounts['Mango'] || 0) >= 2 },
                { value: 'Zookeeper', label: (<Tooltip title={(typeCounts['Zookeeper'] || 0) >= 2 ? '实例数量已超出最大限制' : ''}><span>Zookeeper</span></Tooltip>), disabled: (typeCounts['Zookeeper'] || 0) >= 2 },
              ]}
            />
          </Form.Item>

          <Form.Item name="alias" label="别名" rules={[{ required: true }]}>
            <Input placeholder="支持6个小写英文字母；根据用途命名，例如merge" />
          </Form.Item>
          <div style={{ color: '#999', marginBottom: 12 }}>别名将用于生成连接地址、账号等信息，并同步至正式环境，便于识别实例和业务场景</div>

          {/* MySQL 共用字段（gameId 不展示，使用后端或默认值） */}
          {selectedType === 'MySQL' && (
            <>
              <Form.Item name="version" label="版本" rules={[{ required: true }]}>
                <Select options={[{ value: 'MySQL 5.7', label: 'MySQL 5.7' }, { value: 'MySQL 8.0.1', label: 'MySQL 8.0.1' }]} />
              </Form.Item>
              <Form.Item name="spec" label="实例规格" initialValue="2核8G" rules={[{ required: true }]}>
              <Select options={[
                { value: '2核8G', label: '2核8G' },
                { value: '4核16G', label: '4核16G' },
                { value: '8核64G', label: '8核64G' },
                { value: '16核64G', label: '16核64G' },
              ]} />
              </Form.Item>
            </>
          )}

          {/* Redis 共用字段 */}
          {selectedType === 'Redis' && (
            <>
              <Form.Item name="arch" label="架构类型" rules={[{ required: true }]}>
                <Select placeholder="选择架构类型" options={[{ value: '标准架构', label: '标准架构' }, { value: '分片集群', label: '分片集群' }]} />
              </Form.Item>
              <Form.Item name="spec" label="实例规格" initialValue="1G" rules={[{ required: true }]}>
              <Select options={[
                { value: '1G', label: '1G' },
                { value: '2G', label: '2G' },
                { value: '4G', label: '4G' },
                { value: '8G', label: '8G' },
                { value: '16G', label: '16G' },
              ]} />
              </Form.Item>
              {/* 如果选择了分片集群，显示分片数量 */}
              {archValue === '分片集群' && (
                <Form.Item name="shardCount" label="分片数量" initialValue={3} rules={[{ required: true }]}>
                  <Input placeholder="3" disabled />
                </Form.Item>
              )}
            </>
          )}

          {/* Mango 共用字段 */}
          {selectedType === 'Mango' && (
            <>
              <Form.Item name="version" label="版本" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'Mango5.0', label: 'Mango5.0' },
                  { value: 'Mango6.0', label: 'Mango6.0' },
                  { value: 'Mango7.0', label: 'Mango7.0' },
                  { value: 'Mango8.0', label: 'Mango8.0' },
                ]} />
              </Form.Item>
              <Form.Item name="arch" label="架构类型" rules={[{ required: true }]}>
                <Select options={[{ value: '副本集实例', label: '副本集实例' }, { value: '分片集群实例', label: '分片集群实例' }]} />
              </Form.Item>
              {/* Mango 架构细节：副本集实例只展示规格；分片集群实例展示规格与数量（数量不可编辑） */}
              {archValue === '副本集实例' && (
                <Form.Item name="mangoSpec" label="Mango 规格" initialValue="4核*16G" rules={[{ required: true }]}>
                  <Select options={[
                    { value: '2核*16G', label: '2核*16G' },
                    { value: '4核*8G', label: '4核*8G' },
                    { value: '8核*16G', label: '8核*16G' },
                    { value: '16核*16G', label: '16核*16G' },
                  ]} />
                </Form.Item>
              )}

              {archValue === '分片集群实例' && (
                <>
                  <Form.Item name="mangoSpec" label="Mango 规格" initialValue="4核*8G" rules={[{ required: true }]}>
                    <Select options={[
                      { value: '2核*16G', label: '2核*16G' },
                      { value: '4核*8G', label: '4核*8G' },
                      { value: '4核*16G', label: '4核*16G' },
                      { value: '8核*16G', label: '8核*16G' },
                      { value: '16核*16G', label: '16核*16G' },
                    ]} />
                  </Form.Item>
                  <Form.Item name="mangoCount" label="Mango数量" initialValue={2} rules={[{ required: true }]}>
                    <Input placeholder="2" disabled />
                  </Form.Item>
                  <Form.Item name="shardSpec" label="shard 规格" initialValue="4核*8G" rules={[{ required: true }]}>
                    <Select options={[
                      { value: '2核*16G', label: '2核*16G' },
                      { value: '4核*8G', label: '4核*8G' },
                      { value: '4核*16G', label: '4核*16G' },
                      { value: '8核*16G', label: '8核*16G' },
                      { value: '16核*16G', label: '16核*16G' },
                    ]} />
                  </Form.Item>
                  <Form.Item name="shardCount" label="shard 数量" initialValue={2} rules={[{ required: true }]}>
                    <Input placeholder="2" disabled />
                  </Form.Item>
                </>
              )}
            </>
          )}

          {/* Zookeeper 共用字段 */}
          {selectedType === 'Zookeeper' && (
            <>
              <Form.Item name="version" label="版本" initialValue="Zookeeper 3.8.0">
                <Select options={[{ value: 'Zookeeper 3.8.0', label: 'Zookeeper 3.8.0' }]} />
              </Form.Item>
              <Form.Item name="spec" label="实例规格" initialValue="2核4G" rules={[{ required: true }]}>
              <Select options={[{ value: '1核2G', label: '1核2G' }, { value: '2核4G', label: '2核4G' }]} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}