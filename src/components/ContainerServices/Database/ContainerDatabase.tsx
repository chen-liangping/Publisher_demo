'use client'

import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
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
  Drawer,
  Tabs,
  Alert,
  Avatar,
  Descriptions,
  Card,
  Progress,
  DatePicker
} from 'antd'
import { PlusOutlined, SearchOutlined, UserAddOutlined, RollbackOutlined, CloudUploadOutlined, CopyOutlined, ClockCircleOutlined, FieldTimeOutlined } from '@ant-design/icons'
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
  // 最近一次备份时间（用于"复制生产数据"）
  backupTime?: string
  // 是否为备份实例
  isBackup?: boolean
  // 创建时间
  createdAt?: string
  // 删除时间（备份实例自动销毁时间）
  deleteAt?: string
  // 累积延长时间（小时）
  totalExtendedHours?: number
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
  MongoSpec?: string
  shardSpec?: string
  MongoCount?: number
  shardCount?: number
  // Mock相关字段
  domainUsed?: boolean // 公网域名是否已被使用
}

// 白名单条目类型
interface WhitelistItem {
  ip: string
  user: string
  timeISO: string
  remark?: string
}

// 审计条目类型（简化）
interface AuditItem {
  action: 'add' | 'delete'
  ip: string
  timeISO: string
  user: string
  remark?: string
  status?: '成功' | '失败'
}

// 模拟自动注入的 gameId（原型）
const AUTO_GAME_ID = 'gamedemo'

const mockData: DBInstance[] = [
  { id: '1', type: 'MySQL', alias: 'mysql-test', spec: '2核8GB', arch: '集群版', username: 'gamedemo_test', status: 'running', password: 'admin123', gameId: AUTO_GAME_ID, version: 'MySQL 5.7', connectionCount: 10000, defaultPort: 3306, capacity: '100GB', backupTime: '2024/09/01 12:30:00' },
  { id: '2', type: 'Redis', alias: 'redis-test', spec: '4核16GB', arch: '双机主备架构', username: 'gamedemo_test', status: 'running', password: 'password', gameId: AUTO_GAME_ID, version: 'Redis 6.0', connectionCount: 20000, defaultPort: 6379, capacity: '50GB', qos: '3000000', bandwidth: '96MB/s', evictionPolicy: 'volatile-lru', backupTime: '2024/09/02 08:10:00'},
  { id: '3', type: 'Mongo', alias: 'mongo-test', spec: '2核4GB', arch: '副本集实例', username: 'gamedemo_test', status: 'running', password: 'mongopass', gameId: AUTO_GAME_ID, version: 'Mongo 4.4', connectionCount: 15000, defaultPort: 27017, capacity: '50GB', MongoSpec: '2核4GB', MongoCount: 2, shardSpec: '4核8G', shardCount: 2, backupTime: '2024/09/03 21:05:00'},
  { id: '4', type: 'Zookeeper', alias: 'zookeeper-test', spec: '2核2GB', arch: '标准版', username: 'gamedemo_test', status: 'running', password: 'zkpass', gameId: AUTO_GAME_ID, version: 'Zookeeper 3.6', defaultPort: 2181, backupTime: '2024/09/01 09:00:00' }
]

// 模拟生产环境数据
const mockProductionData: DBInstance[] = [
  { id: 'prod-1', type: 'MySQL', alias: 'mysql-prod-main', spec: '8核32GB', arch: '集群版', username: 'prod_user', status: 'running', password: 'prod123', gameId: 'production', version: 'MySQL 8.0', connectionCount: 50000, defaultPort: 3306, capacity: '1TB' },
  { id: 'prod-2', type: 'MySQL', alias: 'mysql-prod-backup', spec: '4核16GB', arch: '集群版', username: 'prod_user', status: 'running', password: 'prod123', gameId: 'production', version: 'MySQL 8.0', connectionCount: 30000, defaultPort: 3306, capacity: '500GB' },
  { id: 'prod-3', type: 'Redis', alias: 'redis-prod-cache', spec: '16核64GB', arch: '双机主备架构', username: 'prod_user', status: 'running', password: 'prodpass', gameId: 'production', version: 'Redis 7.0', connectionCount: 100000, defaultPort: 6379, capacity: '200GB' },
  { id: 'prod-4', type: 'Redis', alias: 'redis-prod-session', spec: '8核32GB', arch: '双机主备架构', username: 'prod_user', status: 'running', password: 'prodpass', gameId: 'production', version: 'Redis 7.0', connectionCount: 80000, defaultPort: 6379, capacity: '100GB' },
  { id: 'prod-5', type: 'Mongo', alias: 'mongo-prod-user', spec: '8核16GB', arch: '副本集实例', username: 'prod_user', status: 'running', password: 'mongoprod', gameId: 'production', version: 'Mongo 5.0', connectionCount: 60000, defaultPort: 27017, capacity: '300GB' },
  { id: 'prod-6', type: 'Mongo', alias: 'mongo-prod-logs', spec: '4核8GB', arch: '副本集实例', username: 'prod_user', status: 'running', password: 'mongoprod', gameId: 'production', version: 'Mongo 5.0', connectionCount: 40000, defaultPort: 27017, capacity: '500GB' },
  { id: 'prod-7', type: 'Zookeeper', alias: 'zk-prod-cluster', spec: '4核8GB', arch: '标准版', username: 'prod_user', status: 'running', password: 'zkprod', gameId: 'production', version: 'Zookeeper 3.8', defaultPort: 2181 }
]

export default function ContainerDatabase() {
  const [selectedInstance, setSelectedInstance] = useState<DBInstance | null>(null)
  const [data, setData] = useState<DBInstance[]>(mockData)
  const [showCreate, setShowCreate] = useState(false)
  const [form] = Form.useForm()
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined)
  const [searchAlias, setSearchAlias] = useState<string>('')
  const [modal, modalContextHolder] = Modal.useModal()
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

  // Mongo 特殊：当架构为分片集群实例时，注入默认规格与数量（不可编辑的数量）
  useEffect(() => {
    if (selectedType === 'Mongo') {
      if (archValue === '分片集群实例') {
        form.setFieldsValue({ MongoSpec: '4核*8G', MongoCount: 2, shardSpec: '4核*8G', shardCount: 2 })
      } else if (archValue === '副本集实例') {
        // 副本集实例默认规格为 4核*16G，数量不展示
        form.setFieldsValue({ MongoSpec: '4核*16G', MongoCount: undefined, shardSpec: undefined, shardCount: undefined })
      }
    }
  }, [selectedType, archValue, form])
  // message hook to avoid global message.destroy compatibility issues
  const [messageApi, contextHolder] = message.useMessage()

  // 白名单 Drawer 相关状态
  const [whitelistOpen, setWhitelistOpen] = useState<boolean>(false)
  const [whitelistInstance, setWhitelistInstance] = useState<DBInstance | null>(null)
  const [whitelistMap, setWhitelistMap] = useState<Record<string, WhitelistItem[]>>({})
  const [auditMap, setAuditMap] = useState<Record<string, AuditItem[]>>({})
  const [wlActiveTab, setWlActiveTab] = useState<'whiteList' | 'audit'>('whiteList')
  const [showAddWL, setShowAddWL] = useState<boolean>(false)
  const [wlForm] = Form.useForm()
  // 复制生产数据 Modal
  const [mockOpen, setMockOpen] = useState<boolean>(false)
  const [mockForm] = Form.useForm()
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]) // 选中的测试实例ID
  const [mockPairings, setMockPairings] = useState<Record<string, string>>({}) // testId -> prodId
  const [mockProgress, setMockProgress] = useState<{
    visible: boolean
    progress: number
    status: 'running' | 'completed'
    mockTime?: string
    destroyTime?: string
    totalExtendedHours?: number // 累积延长时间
  }>({ visible: false, progress: 0, status: 'running', totalExtendedHours: 0 })
  // 批量创建进度状态
  const [batchCreating, setBatchCreating] = useState<boolean>(false)
  const [creationProgress, setCreationProgress] = useState<{
    total: number
    current: number
    currentStep: string
    currentInstance: string
    details: Array<{
      instanceName: string
      status: 'pending' | 'creating' | 'backup' | 'restoring' | 'completed' | 'failed'
      progress: number
    }>
  } | null>(null)

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


  // 复制生产数据相关函数
  const handleTestSelectionChange = (selectedIds: string[]) => {
    setSelectedTestIds(selectedIds)
    // 清理不再选中的实例的映射关系
    setMockPairings(prev => {
      const newPairings = { ...prev }
      Object.keys(newPairings).forEach(testId => {
        if (!selectedIds.includes(testId)) {
          delete newPairings[testId]
        }
      })
      return newPairings
    })
  }

  const handlePairingChange = (testId: string, prodId: string) => {
    setMockPairings(prev => ({
      ...prev,
      [testId]: prodId
    }))
  }

  const handleRemovePairing = (testId: string) => {
    setMockPairings(prev => {
      const newPairings = { ...prev }
      delete newPairings[testId]
      return newPairings
    })
  }

  const getTestInstances = () => {
    return data
  }

  const getProductionInstancesByType = (type: string) => {
    return mockProductionData.filter(item => item.type === type)
  }

  const handleConfirmMapping = () => {
    if (selectedTestIds.length === 0) {
      messageApi.warning('请选择至少一个测试环境存储')
      return
    }

    const unpairedInstances = selectedTestIds.filter(id => !mockPairings[id])
    if (unpairedInstances.length > 0) {
      messageApi.warning(`请为所有选中的存储配置映射关系，还有 ${unpairedInstances.length} 个未配置`)
      return
    }

    // 直接开始Mock，不需要二次确认
    handleStartMock()
  }

  const handleStartMock = async () => {
    setMockOpen(false)
    
    // 重置状态
    const currentSelectedIds = [...selectedTestIds]
    const currentPairings = { ...mockPairings }
    setSelectedTestIds([])
    setMockPairings({})
    
    const mockTime = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')
    
    const destroyTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit', 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')

    console.log('开始设置Mock进度条...')
    setMockProgress({
      visible: true,
      progress: 0,
      status: 'running',
      mockTime,
      destroyTime,
      totalExtendedHours: 0
    })
    console.log('Mock进度条已设置为visible')

    // 模拟进度更新
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300))
      setMockProgress(prev => ({ ...prev, progress: i }))
    }

    setMockProgress(prev => ({ ...prev, status: 'completed' }))
    
    // 为配对的测试实例添加"公网域名已被使用"标签
    setData(prev => prev.map(item => ({
      ...item,
      domainUsed: currentPairings[item.id] ? true : item.domainUsed
    })))

    messageApi.success('复制生产数据完成')
  }

  // 批量从备份创建实例
  const handleBatchCreateFromBackup = async (): Promise<void> => {
    try {
      const sids = mockForm.getFieldValue('sourceIds') as string[] | undefined
      if (!sids || sids.length === 0) { 
        message.warning('请选择至少一个备份实例')
        return 
      }
      
      const sourceInstances = sids.map(sid => data.find(d => d.id === sid)).filter(Boolean) as DBInstance[]
      if (sourceInstances.length === 0) {
        message.warning('选择的备份实例不存在')
        return
      }

      // 显示二次确认弹窗
      modal.confirm({
        title: '确认创建备份实例',
        width: 500,
        content: (
          <div>
            <p style={{ marginBottom: 16 }}>确认为以下存储创建备份实例：</p>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              padding: '12px',
              backgroundColor: '#fafafa'
            }}>
              {sourceInstances.map((src, index) => (
                <div key={src.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '8px 0',
                  borderBottom: index < sourceInstances.length - 1 ? '1px solid #f0f0f0' : 'none'
                }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    backgroundColor: '#1890ff', 
                    borderRadius: '50%', 
                    marginRight: '12px' 
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#262626' }}>
                      {src.type} / {src.alias}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                      规格：{src.spec} | 架构：{src.arch}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#1890ff',
                    backgroundColor: '#e6f7ff',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    → {src.type}-backup
                  </div>
                </div>
              ))}
            </div>
            <div style={{ 
              marginTop: 16, 
              padding: '12px', 
              backgroundColor: '#fff7e6', 
              border: '1px solid #ffd591',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#d46b08'
            }}>
              <div>备份实例将在创建后 12 小时自动销毁，销毁后数据不可恢复，请及时完成相关操作</div>
            </div>
          </div>
        ),
        okText: '确认创建',
        cancelText: '取消',
        onOk: () => {
          // 确认后立即关闭弹窗，然后执行创建逻辑
          executeBatchCreation(sourceInstances)
        }
      })
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 执行批量创建的具体逻辑
  const executeBatchCreation = async (sourceInstances: DBInstance[]): Promise<void> => {
    try {
      // 关闭抽屉
      setMockOpen(false)
      mockForm.resetFields()

      // 立即显示进度条
      setBatchCreating(true)
      setCreationProgress({
        total: sourceInstances.length,
        current: 0,
        currentStep: '准备创建...',
        currentInstance: `批量创建 ${sourceInstances.length} 个备份实例`,
        details: []
      })

      // 关闭对话框但保持进度显示
      setMockOpen(false)
      mockForm.resetFields()

      // 模拟并行创建过程
      const steps = [
        { step: '创建新实例...', progress: 25, duration: 2000 },
        { step: '创建备份...', progress: 50, duration: 3000 },
        { step: '恢复备份数据到新实例...', progress: 75, duration: 4000 },
        { step: '完成创建...', progress: 100, duration: 1000 }
      ]

      for (const { step, progress, duration } of steps) {
        setCreationProgress(prev => prev ? {
          ...prev,
          currentStep: step,
          current: Math.round((progress / 100) * sourceInstances.length)
        } : null)
        
        await new Promise(resolve => setTimeout(resolve, duration))
      }

      // 批量创建所有实例数据
      const newInstances: DBInstance[] = []
      for (let i = 0; i < sourceInstances.length; i++) {
        const src = sourceInstances[i]
        const instanceName = `${src.type}-backup`
        const now = new Date()
        const deleteTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24小时后
        
        const newItem: DBInstance = {
          id: `${Date.now()}-${i}`,
          type: src.type,
          alias: instanceName,
          spec: src.spec,
          arch: src.arch,
          username: src.username,
          password: src.password,
          status: 'running',
          isBackup: true,
          createdAt: now.toISOString(),
          deleteAt: deleteTime.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
          }).replace(/\//g, '-'),
          totalExtendedHours: 0,
          gameId: src.gameId,
          version: src.version,
          connectionCount: src.connectionCount,
          defaultPort: src.defaultPort,
          capacity: src.capacity,
          qos: src.qos,
          bandwidth: src.bandwidth,
          evictionPolicy: src.evictionPolicy,
          MongoSpec: src.MongoSpec,
          shardSpec: src.shardSpec,
          MongoCount: src.MongoCount,
          shardCount: src.shardCount,
          backupTime: src.backupTime
        }
        
        newInstances.push(newItem)
      }

      // 一次性添加所有新实例到数据列表
      setData(prev => [...newInstances, ...prev])

      // 全部完成
      setCreationProgress(prev => prev ? {
        ...prev,
        currentStep: '全部完成',
        currentInstance: ''
      } : null)

      message.success(`成功创建 ${sourceInstances.length} 个备份实例`)
      
      // 3秒后隐藏进度条
      setTimeout(() => {
        setBatchCreating(false)
        setCreationProgress(null)
      }, 3000)
    } catch (error) {
      message.error('创建备份实例失败')
      setBatchCreating(false)
      setCreationProgress(null)
    }
  }

  // 通用复制文本（与密码复制逻辑一致）
  const copyText = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        try { messageApi.success('已复制') } catch { alert('已复制') }
      }).catch(() => {
        try { messageApi.error('复制失败') } catch { alert('复制失败') }
      })
    } else {
      try {
        const textarea = document.createElement('textarea') as HTMLTextAreaElement
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        try { messageApi.success('已复制') } catch { alert('已复制') }
      } catch {
        try { messageApi.warning('当前环境不支持复制') } catch { alert('当前环境不支持复制') }
      }
    }
  }

  // 掩码密码展示
  const maskPassword = (pwd?: string): string => {
    if (!pwd) return '****'
    if (pwd.length <= 4) return '*'.repeat(pwd.length)
    return `${'*'.repeat(Math.max(4, Math.min(12, pwd.length - 4)))}${pwd.slice(-2)}`
  }

  // 基于实例构造（示例）公网/内网连接串（按类型区分四种）
  const buildConn = (inst: DBInstance): { pub: string, pri: string } => {
    const user = inst.username || `${AUTO_GAME_ID}_user`
    const masked = '****************'
    const type = (inst.type || 'db').toLowerCase()
    const hostBase = `${inst.alias}.${type}.stg.g123-cpp.com`
    const port = String(inst.defaultPort || 3306)

    switch (type) {
      case 'mysql':
        return {
          pub: `legolas-public-mysql.rwlb.japan.rds.aliyuncs.com`,
          pri: `gamedemo-test-mysql.stg.g123-cpp.com`
        }
      case 'redis':
        return {
          pub: `gamedemo-test-stg-redis-public.redis.japan.rds.aliyuncs.com:6379`,
          pri: `gamedemo-test-redis.stg.g123-cpp.com:6379`
        }
      case 'Mongo':
      case 'mongo':
      case 'MongoDB':
        return {
          pub: `mongodb://${user}:${masked}@pub1.${hostBase}:${port},pub2.${hostBase}:${port}?replicaSet=mgset-demo`,
          pri: `mongodb://${user}:${masked}@sec.${hostBase}:${port},pri.${hostBase}:${port}?replicaSet=mgset-demo`
        }
      case 'zookeeper':
        return {
          pub: `gamedemo-test-zookeeper-public.stg.g123-cpp.com:2181`,
          pri: `gamedemo-test-zookeeper.stg.g123-cpp.com:2181`
        }
      default:
        return {
          pub: `mysql://${user}:${masked}@pub.${hostBase}:${port}`,
          pri: `mysql://${user}:${masked}@pri.${hostBase}:${port}`
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
    Mongo: 'gold',
    Zookeeper: 'blue'
  }

  // 排序权重：mongo/mongodb/Mongo > mysql > redis > zookeeper
  const getTypeWeight = (t?: string): number => {
    const k = (t || '').toLowerCase()
    if (k === 'mongo' || k === 'MongoDB' || k === 'Mongo') return 0
    if (k === 'mysql') return 1
    if (k === 'redis') return 2
    if (k === 'zookeeper') return 3
    return 99
  }

  const columns: ColumnsType<DBInstance> = [
    { title: '类型', dataIndex: 'type', key: 'type', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? <Dots /> : (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button 
          type="link" 
          onClick={() => setSelectedInstance(record)}
        >
          <Tag color={typeColorMap[record.type] || 'blue'}>{record.type}</Tag>
        </Button>
      </div>
    )},
    { title: '别名', dataIndex: 'alias', key: 'alias', render: (_value: string, record: DBInstance) => (
      record.creatingProgress != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dots />
          <span style={{ fontSize: 12, color: '#666' }}>{record.creatingStep} {record.creatingProgress ? `(${record.creatingProgress}%)` : ''}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{record.alias}</span>
          {record.domainUsed && (
            <Tag color="orange" style={{ fontSize: '10px' }}>公网域名已被使用</Tag>
          )}
        </div>
      )
    )},
    { title: '实例规格', dataIndex: 'spec', key: 'spec', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : <div style={{color: '#74b9ff'}}>{record.spec}</div> },
    { title: '架构类型', dataIndex: 'arch', key: 'arch', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : record.arch},
    { title: '用户名', dataIndex: 'username', key: 'username', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : record.username },
    { title: '密码', dataIndex: 'password', key: 'password', render: (_value: string, record: DBInstance) => record.creatingProgress != null ? null : (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>****</span>
        <Tooltip title="复制密码">
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            onClick={() => copyPassword(record.password)} 
          />
        </Tooltip>
      </div>
    )},
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: DBInstance) => {
        const t = (record.type || '').toLowerCase()
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <Space>
              {/* 数据库查询 - 所有类型都有 */}
          <Tooltip title="数据库查询">
            <Button 
              type="text" 
              icon={<SearchOutlined />} 
              onClick={() => message.info(`查询 ${record.alias}（模拟）`)} 
            />
          </Tooltip>
              
              {/* IP白名单 - 所有类型都有 */}
              <Tooltip title="IP白名单">
            <Button
              type="text"
              icon={<UserAddOutlined />}
              onClick={() => {
                setWhitelistInstance(record)
                setWhitelistOpen(true)
                setWlActiveTab('whiteList')
              }}
            />
          </Tooltip>
              
              {/* Mongo 特有操作 */}
              {(t === 'mongo' || t === 'mongodb' || t === 'Mongo') && (
                <Tooltip title="慢日志">
                  <Button 
                    type="text" 
                    icon={<ClockCircleOutlined />} 
                    onClick={() => message.info(`慢日志 ${record.alias}（模拟）`)} 
                  />
                </Tooltip>
              )}
              
              {/* MySQL 特有操作 */}
              {t === 'mysql' && (
                <>
          <Tooltip title="数据库恢复">
            <Button 
              type="text" 
              icon={<RollbackOutlined />} 
              onClick={() => message.info(`恢复 ${record.alias}（模拟）`)} 
            />
          </Tooltip>
                  <Tooltip title="慢SQL">
                    <Button 
                      type="text" 
                      icon={<ClockCircleOutlined />} 
                      onClick={() => message.info(`慢SQL ${record.alias}（模拟）`)} 
                    />
                  </Tooltip>
                </>
              )}
              
              {/* Redis 特有操作 */}
              {t === 'redis' && (
          <Tooltip title="备份">
            <Button 
              type="text" 
              icon={<CloudUploadOutlined />} 
              onClick={() => message.info(`备份 ${record.alias}（模拟）`)} 
            />
          </Tooltip>
              )}
              
              {/* Zookeeper 只有 IP白名单和数据库查询，已在上面处理 */}
        </Space>
            
          </div>
        )
      }
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
      {modalContextHolder}
      {contextHolder}
      {(() => {
        const filtered = data.filter(d => !searchAlias || d.alias.toLowerCase().includes(searchAlias.toLowerCase()))
        const sorted = [...filtered].sort((a, b) => {
          const wt = getTypeWeight(a.type) - getTypeWeight(b.type)
          if (wt !== 0) return wt
          const aa = (a.alias || '').toLowerCase()
          const bb = (b.alias || '').toLowerCase()
          return aa.localeCompare(bb)
        })
        const showCards = sorted.length <= 5
        if (showCards) {
          return (
            <>
              <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
            <Title level={4} style={{ margin: 0 }}>存储</Title>
                <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
                  <strong>描述：</strong> 提供从缓存到数据库的全栈中间件存储解决方案，支持存储玩家业务数据与日志数据，并助力应用实现无状态化部署。
                </div>
              </Card>

              <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 12 }}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Input.Search
                    placeholder="按别名搜索"
                    allowClear
                    onSearch={(val) => setSearchAlias(val.trim())}
                    onChange={(e) => setSearchAlias(e.target.value.trim())}
                    style={{ width: 320 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setShowCreate(true)
                setSelectedType('MySQL')
                form.setFieldsValue({ type: 'MySQL' })
              }}
            >
              添加数据库实例
            </Button>
            <Button 
              onClick={() => setMockOpen(true)}
            >
              复制生产数据
            </Button>
      </div>
      </div>
              </Card>

              {/* 批量创建进度条 */}
              {creationProgress && (
                <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>备份进度</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {creationProgress.currentInstance}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '14px', color: '#1890ff' }}>
                      {creationProgress.currentStep}
                    </span>
                  </div>
                  <Progress 
                    percent={Math.round((creationProgress.current / creationProgress.total) * 100)} 
                    status={creationProgress.current === creationProgress.total ? 'success' : 'active'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    format={(percent) => `${percent}%`}
                  />
                </Card>
              )}

              {/* 复制生产数据进度卡片 */}
              {mockProgress.visible && (
                <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>
                      {mockProgress.status === 'running' ? '复制生产数据进度' : '已切换至生产数据'}
                    </span>
                    {mockProgress.status === 'completed' && (
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => {
                          modal.confirm({
                            title: '确认结束生产数据切换吗',
                            content: '结束切换后，测试环境将不再指向生产数据备份，并恢复为原来的测试数据',
                            onOk: () => {
                              // 关闭进度卡片
                              setMockProgress(prev => ({ ...prev, visible: false }))
                              // 清除所有测试存储的"公网域名已被使用"标签
                              setData(prevData => 
                                prevData.map(instance => ({
                                  ...instance,
                                  domainUsed: false
                                }))
                              )
                            }
                          })
                        }}
                      >
                        结束切换
                      </Button>
                    )}
                  </div>
                  
                  {mockProgress.status === 'running' ? (
                    <Progress 
                      percent={mockProgress.progress} 
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                      format={(percent) => `${percent}%`}
                    />
                  ) : (
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: '#666', marginRight: 8 }}>备份时间点:</span>
                        <span>{mockProgress.mockTime}</span>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: '#666', marginRight: 8 }}>销毁时间点:</span>
                        <span style={{ color: '#ff4d4f' }}>{mockProgress.destroyTime}</span>
                      </div>
                      <div>
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => {
                            // 使用现有的延长时间逻辑，但需要特殊处理Mock实例
                            const currentExtendedHours = mockProgress.totalExtendedHours || 0
                            const maxExtendHours = 60
                            const remainingHours = maxExtendHours - currentExtendedHours
                            
                            if (remainingHours <= 0) {
                              messageApi.warning('该实例已达到最大存活时间限制（72小时）')
                              return
                            }
                            
                            let extendHours = Math.min(1, remainingHours)
                            
                            modal.confirm({
                               title: '延长销毁时间',
                              content: (
                                <div>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={remainingHours}
                                    defaultValue={extendHours}
                                    suffix="小时"
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value)
                                      if (value >= 1 && value <= remainingHours) {
                                        extendHours = value
                                      }
                                    }}
                                    style={{ width: '120px' }}
                                  />
                                  <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
                                    <p>当前销毁时间：{mockProgress.destroyTime}</p>
                                    <span style={{ color: '#ff4d4f' }}>最大存活时间限制：72 小时</span> ,剩余可延长：{remainingHours} 小时
                                  </div>
                                </div>
                              ),
                              okText: '确认延长',
                              cancelText: '取消',
                              onOk() {
                                // 计算新的销毁时间
                                const currentDestroyTime = new Date(mockProgress.destroyTime?.replace(/-/g, '/') || new Date())
                                const newDestroyTime = new Date(currentDestroyTime.getTime() + extendHours * 60 * 60 * 1000)
                                const newDestroyTimeStr = newDestroyTime.toLocaleString('zh-CN', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                  second: '2-digit',
                                  hour12: false 
                                }).replace(/\//g, '-')

                                // 更新累积延长时间
                                const newTotalExtendedHours = currentExtendedHours + extendHours
                                
                                // 更新Mock进度状态
                                setMockProgress(prev => ({
                                  ...prev,
                                  destroyTime: newDestroyTimeStr,
                                  totalExtendedHours: newTotalExtendedHours
                                }))
                                
                                messageApi.success(`已延长销毁时间 ${extendHours} 小时，累积延长 ${newTotalExtendedHours} 小时，新的销毁时间：${newDestroyTimeStr}`)
                              }
                            })
                          }}
                        >
                          延长时间
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* 卡片模式（≤4 条）- 每卡一行 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sorted.map((inst) => {
                  const conn = buildConn(inst)
                  return (
                    <Card key={inst.id} className="g123-card g123-card-bordered page-storage-card" style={{ border: '1px solid rgb(240, 242, 246)' }} styles={{ body: { padding: 0 }}}>
                      <div className="g123-card-head" style={{ borderBottom: 'none', padding: '24px 24px 0 24px' }}>
                        <div className="g123-card-head-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div className="g123-card-head-title" style={{ fontSize: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <Avatar shape="square" style={{ width: 64, height: 64, fontSize: 32, background: 'rgba(0,0,0,0.04)' }}>{(inst.type || 'DB')[0]}</Avatar>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 20, color: 'rgb(17,25,40)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <strong>{inst.type}<span style={{fontSize: 18, color: 'rgba(0,0,0,0.45)', marginLeft: 4 }}>{inst.alias}</span></strong>
                                  {inst.domainUsed && (
                                    <Tag color="orange" style={{ fontSize: '10px' }}>域名已指向生产数据备份</Tag>
                                  )}
                                </span>
                                {(['mysql','Mongo','mongo','mongodb'].includes((inst.type || '').toLowerCase())) && (
                                  <span style={{ fontWeight: 400, fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>创建数据库时，名称需以 <span style={{ fontWeight: 700, color: 'rgba(0,0,0,0.65)' }}>{AUTO_GAME_ID}_</span> 开头</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="g123-card-extra">
                            <Space>
                              {(() => {
                                const t = (inst.type || '').toLowerCase()
                                if (t === 'mongo' || t === 'mongodb' || t === 'Mongo') {
                                  return (
                                    <>
                                      <Button 
                                        icon={<ClockCircleOutlined />} 
                                        onClick={() => message.info(`慢日志 ${inst.alias}（模拟）`)}
                                      >
                                        慢日志
                                      </Button>
                                      <Button 
                                        icon={<UserAddOutlined />} 
                                        onClick={() => { 
                                          setWhitelistInstance(inst); 
                                          setWhitelistOpen(true); 
                                          setWlActiveTab('whiteList') 
                                        }}
                                      >
                                        IP白名单
                                      </Button>
                                      <Button 
                                        type="primary" 
                                        icon={<SearchOutlined />} 
                                        onClick={() => message.info(`查询 ${inst.alias}（模拟）`)}
                                      >
                                        数据库查询
                                      </Button>
                                    </>
                                  )
                                }
                                if (t === 'mysql') {
                                  return (
                                    <>
                                      <Button 
                                        icon={<RollbackOutlined />} 
                                        onClick={() => message.info(`恢复 ${inst.alias}（模拟）`)}
                                      >
                                        数据库恢复
                                      </Button>
                                      <Button 
                                        icon={<ClockCircleOutlined />} 
                                        onClick={() => message.info(`慢SQL ${inst.alias}（模拟）`)}
                                      >
                                        慢SQL
                                      </Button>
                                      <Button 
                                        icon={<UserAddOutlined />} 
                                        onClick={() => { 
                                          setWhitelistInstance(inst); 
                                          setWhitelistOpen(true); 
                                          setWlActiveTab('whiteList') 
                                        }}
                                      >
                                        IP白名单
                                      </Button>
                                      <Button 
                                        type="primary" 
                                        icon={<SearchOutlined />} 
                                        onClick={() => message.info(`查询 ${inst.alias}（模拟）`)}
                                      >
                                        数据库查询
                                      </Button>
                                    </>
                                  )
                                }
                                if (t === 'redis') {
                                  return (
                                    <>
                                      <Button 
                                        icon={<CloudUploadOutlined />} 
                                        onClick={() => message.info(`备份 ${inst.alias}（模拟）`)}
                                      >
                                        备份
                                      </Button>
                                      <Button 
                                        icon={<UserAddOutlined />} 
                                        onClick={() => { 
                                          setWhitelistInstance(inst); 
                                          setWhitelistOpen(true); 
                                          setWlActiveTab('whiteList') 
                                        }}
                                      >
                                        IP白名单
                                      </Button>
                                      <Button 
                                        type="primary" 
                                        icon={<SearchOutlined />} 
                                        onClick={() => message.info(`查询 ${inst.alias}（模拟）`)}
                                      >
                                        数据库查询
                                      </Button>
                                    </>
                                  )
                                }
                                if (t === 'zookeeper') {
                                  return (
                                    <>
                                      <Button 
                                        icon={<UserAddOutlined />} 
                                        onClick={() => { 
                                          setWhitelistInstance(inst); 
                                          setWhitelistOpen(true); 
                                          setWlActiveTab('whiteList') 
                                        }}
                                      >
                                        IP白名单
                                      </Button>
                                    </>
                                  )
                                }
                                return (
                                  <>
                                    <Button 
                                      icon={<UserAddOutlined />} 
                                      onClick={() => { 
                                        setWhitelistInstance(inst); 
                                        setWhitelistOpen(true); 
                                        setWlActiveTab('whiteList') 
                                      }}
                                    >
                                      IP白名单
                                    </Button>
                                    <Button 
                                      type="primary" 
                                      icon={<SearchOutlined />} 
                                      onClick={() => message.info(`查询 ${inst.alias}（模拟）`)}
                                    >
                                      数据库查询
                                    </Button>
                                  </>
                                )
                              })()}
                            </Space>
                          </div>
                        </div>
                      </div>
                      <div className="g123-card-body" style={{ padding: '16px 24px 24px 24px' }}>
                        {/* 公网 */}
                        <div style={{ fontWeight: 700, color: 'rgba(0,0,0,0.88)' }}>公网</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{ color: 'rgba(0,0,0,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.pub}</span>
                          <Button 
                            type="text" 
                            icon={<CopyOutlined />} 
                            onClick={() => copyText(conn.pub)} 
                          />
                        </div>
                        {/* 内网 */}
                        <div style={{ fontWeight: 700, color: 'rgba(0,0,0,0.88)' }}>内网</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{ color: 'rgba(0,0,0,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.pri}</span>
                          <Button 
                            type="text" 
                            icon={<CopyOutlined />} 
                            onClick={() => copyText(conn.pri)} 
                          />
                        </div>
                        {/* 配置 */}
                        <div style={{ fontWeight: 700, color: 'rgba(0,0,0,0.88)', marginBottom: 8 }}>配置</div>
                        <Descriptions size="small" column={2} bordered={false} styles={{ label: { color: 'rgba(0,0,0,0.88)', width: 112 } }}>
                          <Descriptions.Item label="用户名">{inst.username || '-'}</Descriptions.Item>
                          <Descriptions.Item label="密码">
                            <span>{maskPassword(inst.password)}</span>
                            <Button 
                              type="text" 
                              size="small" 
                              icon={<CopyOutlined />} 
                              onClick={() => copyPassword(inst.password)} 
                              style={{ paddingLeft: 8 }} 
                            />
                          </Descriptions.Item>
                          <Descriptions.Item label="版本">{inst.version || '-'}</Descriptions.Item>
                          <Descriptions.Item label="实例规格">{inst.spec}</Descriptions.Item>
                          <Descriptions.Item label="架构类型">{inst.arch || '-'}</Descriptions.Item>
                          <Descriptions.Item label="最大连接数">{inst.connectionCount ?? '-'}</Descriptions.Item>
                          <Descriptions.Item label="默认端口" span={2}>{inst.defaultPort ?? '-'}</Descriptions.Item>
                        </Descriptions>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )
        }
        // 表格模式（>4 条）
        return (
          selectedInstance ? (
            <DatabaseDetails instance={selectedInstance} onBack={() => setSelectedInstance(null)} />
          ) : (
            <>
              <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
                <Title level={4} style={{ margin: 0 }}>存储</Title>
                <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
            <strong>描述：</strong> 提供从缓存到数据库的全栈中间件存储解决方案，支持存储玩家业务数据与日志数据，并助力应用实现无状态化部署。
              </div>
              </Card>

              <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 12 }}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Input.Search
              placeholder="按别名搜索"
              allowClear
              onSearch={(val) => setSearchAlias(val.trim())}
              onChange={(e) => setSearchAlias(e.target.value.trim())}
              style={{ width: 320 }}
            />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setShowCreate(true)
                        setSelectedType('MySQL')
                        form.setFieldsValue({ type: 'MySQL' })
                      }}
                    >
                      添加数据库实例
                    </Button>
                    <Button 
                      onClick={() => setMockOpen(true)}
                    >
                      复制生产数据
                    </Button>
              </div>
              </div>
              </Card>

              {/* 批量创建进度条 */}
              {creationProgress && (
                <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>批量创建备份实例进度</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {creationProgress.currentInstance}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '14px', color: '#1890ff' }}>
                      {creationProgress.currentStep}
                    </span>
                  </div>
                  <Progress 
                    percent={Math.round((creationProgress.current / creationProgress.total) * 100)} 
                    status={creationProgress.current === creationProgress.total ? 'success' : 'active'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    format={(percent) => `${percent}%`}
                  />
                </Card>
              )}

              {/* 复制生产数据进度卡片 */}
              {mockProgress.visible && (
                <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 16 }}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>
                      {mockProgress.status === 'running' ? '复制生产数据进度' : 'Mock生产中'}
                    </span>
                    {mockProgress.status === 'completed' && (
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => {
                          modal.confirm({
                            title: '确认结束生产mock吗',
                            content: '结束后将无法继续查看Mock进度信息',
                            onOk: () => {
                              // 关闭进度卡片
                              setMockProgress(prev => ({ ...prev, visible: false }))
                              // 清除所有测试存储的"公网域名已被使用"标签
                              setData(prevData => 
                                prevData.map(instance => ({
                                  ...instance,
                                  domainUsed: false
                                }))
                              )
                            }
                          })
                        }}
                      >
                        关闭
                      </Button>
                    )}
                  </div>
                  
                  {mockProgress.status === 'running' ? (
                    <Progress 
                      percent={mockProgress.progress} 
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                      format={(percent) => `${percent}%`}
                    />
                  ) : (
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: '#666', marginRight: 8 }}>备份时间点:</span>
                        <span>{mockProgress.mockTime}</span>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: '#666', marginRight: 8 }}>销毁时间点:</span>
                        <span style={{ color: '#ff4d4f' }}>{mockProgress.destroyTime}</span>
                      </div>
                      <div>
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => {
                            // 使用现有的延长时间逻辑，但需要特殊处理Mock实例
                            const currentExtendedHours = mockProgress.totalExtendedHours || 0
                            const maxExtendHours = 60
                            const remainingHours = maxExtendHours - currentExtendedHours
                            
                            if (remainingHours <= 0) {
                              messageApi.warning('该实例已达到最大存活时间限制（72小时）')
                              return
                            }
                            
                            let extendHours = Math.min(1, remainingHours)
                            
                            modal.confirm({
                              title: '延长Mock存活时间',
                              content: (
                                <div>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={remainingHours}
                                    defaultValue={extendHours}
                                    suffix="小时"
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value)
                                      if (value >= 1 && value <= remainingHours) {
                                        extendHours = value
                                      }
                                    }}
                                    style={{ width: '120px' }}
                                  />
                                  <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
                                    <p>当前销毁时间：{mockProgress.destroyTime}</p>
                                    <span style={{ color: '#ff4d4f' }}>最大存活时间限制：72 小时</span> ,剩余可延长：{remainingHours} 小时
                                  </div>
                                </div>
                              ),
                              okText: '确认延长',
                              cancelText: '取消',
                              onOk() {
                                // 计算新的销毁时间
                                const currentDestroyTime = new Date(mockProgress.destroyTime?.replace(/-/g, '/') || new Date())
                                const newDestroyTime = new Date(currentDestroyTime.getTime() + extendHours * 60 * 60 * 1000)
                                const newDestroyTimeStr = newDestroyTime.toLocaleString('zh-CN', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                  second: '2-digit',
                                  hour12: false 
                                }).replace(/\//g, '-')

                                // 更新累积延长时间
                                const newTotalExtendedHours = currentExtendedHours + extendHours
                                
                                // 更新Mock进度状态
                                setMockProgress(prev => ({
                                  ...prev,
                                  destroyTime: newDestroyTimeStr,
                                  totalExtendedHours: newTotalExtendedHours
                                }))
                                
                                 messageApi.success(`已延长销毁时间 ${extendHours} 小时，累积延长 ${newTotalExtendedHours} 小时，新的销毁时间：${newDestroyTimeStr}`)
                              }
                            })
                          }}
                        >
                          延长时间
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <Table columns={columns} dataSource={sorted} rowKey="id" pagination={{ pageSize: 10 }} />

        </>
          )
        )
      })()}
      
      {/* 调试信息 */}
      {(() => {
        console.log('当前Mock进度状态:', mockProgress)
        return null
      })()}

      {/* 白名单 Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar shape="square" style={{ background: 'rgba(0,0,0,0.04)' }}>
              {whitelistInstance?.type?.[0] || 'DB'}
            </Avatar>
            <div>
              <span style={{ fontSize: 16, color: '#111928', fontWeight: 600 }}>
                {whitelistInstance?.type}
                <span style={{ color: 'rgba(0,0,0,0.45)', marginLeft: 4 }}>{whitelistInstance?.alias}</span>
              </span>
            </div>
          </div>
        }
        open={whitelistOpen}
        onClose={() => setWhitelistOpen(false)}
        width={720}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="最多支持添加10条白名单IP地址"
          style={{ marginBottom: 12 }}
        />
        <Tabs
          activeKey={wlActiveTab}
          onChange={(key) => setWlActiveTab(key as 'whiteList' | 'audit')}
          tabBarExtraContent={{
            right: (
              <Space>
                <Button
                  type="primary"
                  onClick={() => setShowAddWL(true)}
                  disabled={!!whitelistInstance && ( (whitelistMap[whitelistInstance.id]?.length || 0) >= 10 )}
                >
                  添加白名单
                </Button>
              </Space>
            )
          }}
          items={[
            {
              key: 'whiteList',
              label: 'IP白名单',
              children: (
                <Table<WhitelistItem>
                  columns={[
                    { title: 'IP地址', dataIndex: 'ip', key: 'ip' },
                    { title: '添加人', dataIndex: 'user', key: 'user', width: 160 },
                    { title: '添加时间', dataIndex: 'timeISO', key: 'timeISO', width: 200, render: (t: string) => new Date(t).toLocaleString() },
                    { title: '备注', dataIndex: 'remark', key: 'remark' },
                    {
                      title: '操作', key: 'actions', width: 100,
                      render: (_: unknown, recordRow: WhitelistItem) => (
                        <Space size={8}>
                          <Button type="link" danger onClick={() => {
                            const inst = whitelistInstance
                            if (!inst) return
                            setWhitelistMap((prev) => {
                              const list = (prev[inst.id] || []).filter(it => it.ip !== recordRow.ip)
                              return { ...prev, [inst.id]: list }
                            })
                            setAuditMap((prev) => {
                              const list = prev[inst.id] || []
                              const next: AuditItem = { action: 'delete', ip: recordRow.ip, timeISO: new Date().toISOString(), user: recordRow.user, remark: recordRow.remark }
                              return { ...prev, [inst.id]: [next, ...list] }
                            })
                          }}>删除</Button>
                        </Space>
                      )
                    }
                  ]}
                  dataSource={whitelistInstance ? (whitelistMap[whitelistInstance.id] || []) : []}
                  rowKey={(r) => r.ip}
                  locale={{ emptyText: '暂无内容' }}
                  pagination={false}
                />
              )
            },
            {
              key: 'audit',
              label: '操作日志',
              children: (
                <Table<AuditItem>
                  columns={[
                    { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 180 },
                    { title: '操作人', dataIndex: 'user', key: 'user', width: 120 },
                    { title: '状态', dataIndex: 'status', key: 'status', width: 120, render: (s?: '成功'|'失败') => s ? <Tag color={s === '成功' ? 'green' : 'red'}>{s}</Tag> : '-' },
                    { title: '操作', dataIndex: 'action', key: 'action', width: 100, render: (a: 'add'|'delete') => a === 'add' ? <Tag color="green">添加</Tag> : <Tag color="red">删除</Tag> },
                    { title: '操作时间', dataIndex: 'timeISO', key: 'timeISO', width: 200, render: (t: string) => new Date(t).toLocaleString() },
                  ]}
                  dataSource={whitelistInstance ? (auditMap[whitelistInstance.id] || []) : []}
                  rowKey={(_r, idx) => String(idx)}
                  locale={{ emptyText: '暂无内容' }}
                  pagination={false}
                />
              )
            }
          ]}
        />
      </Drawer>

      {/* 添加白名单弹窗 */}
      <Modal
        title="添加白名单"
        open={showAddWL}
        onCancel={() => setShowAddWL(false)}
        onOk={async () => {
          try {
            const vals = await wlForm.validateFields()
            const inst = whitelistInstance
            if (!inst) return
            const entry: WhitelistItem = {
              ip: vals.ip.trim(),
              user: 'admin',
              timeISO: new Date().toISOString(),
              remark: vals.remark?.trim()
            }
            setWhitelistMap((prev) => {
              const list = prev[inst.id] || []
              // 去重
              if (list.some(it => it.ip === entry.ip)) {
                messageApi.warning('该 IP 已存在')
                return prev
              }
              const next = [entry, ...list].slice(0, 10)
              return { ...prev, [inst.id]: next }
            })
            setAuditMap((prev) => {
              const list = prev[inst.id] || []
              const next: AuditItem = { action: 'add', ip: entry.ip, timeISO: entry.timeISO, user: entry.user, remark: entry.remark }
              return { ...prev, [inst.id]: [next, ...list] }
            })
            setShowAddWL(false)
            wlForm.resetFields()
            messageApi.success('添加成功')
          } catch {
            // ignore
          }
        }}
      >
        <Form form={wlForm} layout="vertical">
          <Form.Item name="ip" label="IP地址" rules={[{ required: true, message: '请输入 IP 地址' }, { pattern: /^(?:\d{1,3}\.){3}\d{1,3}$/, message: 'IP 地址格式不正确' }]}>
            <Input placeholder="例如：192.168.1.10" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

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
                { value: 'Mongo', label: (<Tooltip title={(typeCounts['Mongo'] || 0) >= 2 ? '实例数量已超出最大限制' : ''}><span>Mongo</span></Tooltip>), disabled: (typeCounts['Mongo'] || 0) >= 2 },
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

          {/* Mongo 共用字段 */}
          {selectedType === 'Mongo' && (
            <>
              <Form.Item name="version" label="版本" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'Mongo5.0', label: 'Mongo5.0' },
                  { value: 'Mongo6.0', label: 'Mongo6.0' },
                  { value: 'Mongo7.0', label: 'Mongo7.0' },
                  { value: 'Mongo8.0', label: 'Mongo8.0' },
                ]} />
              </Form.Item>
              <Form.Item name="arch" label="架构类型" rules={[{ required: true }]}>
                <Select options={[{ value: '副本集实例', label: '副本集实例' }, { value: '分片集群实例', label: '分片集群实例' }]} />
              </Form.Item>
              {/* Mongo 架构细节：副本集实例只展示规格；分片集群实例展示规格与数量（数量不可编辑） */}
              {archValue === '副本集实例' && (
                <Form.Item name="MongoSpec" label="Mongo 规格" initialValue="4核*16G" rules={[{ required: true }]}>
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
                  <Form.Item name="MongoSpec" label="Mongo 规格" initialValue="4核*8G" rules={[{ required: true }]}>
                    <Select options={[
                      { value: '2核*16G', label: '2核*16G' },
                      { value: '4核*8G', label: '4核*8G' },
                      { value: '4核*16G', label: '4核*16G' },
                      { value: '8核*16G', label: '8核*16G' },
                      { value: '16核*16G', label: '16核*16G' },
                    ]} />
                  </Form.Item>
                  <Form.Item name="MongoCount" label="Mongo数量" initialValue={2} rules={[{ required: true }]}>
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

      {/* 复制生产数据 Modal */}
      <Modal
        title="复制生产数据"
        width={900}
        open={mockOpen}
        onCancel={() => {
          setMockOpen(false)
          setSelectedTestIds([])
          setMockPairings({})
        }}
        
        footer={[
          <Button key="cancel" onClick={() => {
            setMockOpen(false)
            setSelectedTestIds([])
            setMockPairings({})
          }}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmMapping}>
            确认
          </Button>
        ]}
        destroyOnHidden
      >
         <Alert
           type="info"
           showIcon
           message={
             <div>
               1. 系统将基于生产环境创建指定时间点的备份，并将测试环境存储挂载到备份数据，实现生产环境数据的临时使用。
               <br />
               2. 测试存储将挂载生产备份数据，原测试数据暂时不可用。
               <br />
               <strong>3. 挂载数据为临时资源，12 小时后自动清理，请及时测试。</strong>
               <br />
               4. 挂载/解除挂载过程中可能出现短暂数据切换，结束后恢复原测试数据。
               <br />
               5. 域名需使用 CPP 域名，不支持阿里域名。
               <br />
             </div>
           }
           style={{ marginBottom: 12 }}
         />
        <Form form={mockForm} layout="vertical" initialValues={{ mockTime: dayjs() }}>
          <Form.Item label="备份时间点" name="mockTime" rules={[{ required: true, message: '请选择备份时间点' }]}>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择备份时间点"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          {/* 操作区 */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fafafa', 
            borderRadius: '8px', 
            marginBottom: 16,
            border: '1px solid #f0f0f0'
          }}>
            
            {/* 多选测试环境存储 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 14 }}>选择测试环境存储：</div>
              <Select
                mode="multiple"
                placeholder="请选择需要替换的存储"
                style={{ width: '100%' }}
                value={selectedTestIds}
                onChange={handleTestSelectionChange}
                options={getTestInstances().map(inst => ({
                  value: inst.id,
                  label: `${inst.type}-${inst.alias}`
                }))}
                maxTagCount="responsive"
              />
              <div style={{ 
                marginTop: 8, 
                fontSize: 12, 
                color: '#666', 
                lineHeight: '16px' 
              }}>
                选择测试环境存储后，系统将更新该域名的指向，使其使用生产环境的备份数据。
              </div>
            </div>
            
            {/* 动态映射关系操作栏 */}
            {selectedTestIds.length > 0 && (
              <div>
                <div style={{ marginBottom: 12, fontSize: 14 }}>配置指向关系：</div>
                {selectedTestIds.map(testId => {
                  const testInstance = getTestInstances().find(inst => inst.id === testId)
                  const prodOptions = getProductionInstancesByType(testInstance?.type || '')
                  const selectedProdId = mockPairings[testId]
                  
                  return (
                    <div key={testId} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      marginBottom: 8,
                      padding: '8px 12px',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #e8e8e8'
                    }}>
                      <div style={{ minWidth: 200 }}>
                        <span style={{ fontWeight: 500 }}>
                          {testInstance?.type}-{testInstance?.alias}
                        </span>
                      </div>
                      <div style={{ color: '#666' }}>→</div>
                      <Select
                        placeholder="选择生产环境存储"
                        style={{ flex: 1, minWidth: 200 }}
                        value={selectedProdId}
                        onChange={(value) => handlePairingChange(testId, value)}
                        options={prodOptions.map(prod => ({
                          value: prod.id,
                          label: `${prod.type}-${prod.alias}`
                        }))}
                        allowClear
                        onClear={() => handleRemovePairing(testId)}
                      />
                      <div style={{ minWidth: 60, textAlign: 'center' }}>
                        {selectedProdId ? (
                          <span style={{ color: '#52c41a', fontSize: 16 }}>✓</span>
                        ) : (
                          <span style={{ color: '#ff4d4f', fontSize: 16 }}>○</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* 结果栏 */}
          {Object.keys(mockPairings).length > 0 && (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#ecf0f1', 
              borderRadius: '8px',
              border: '1px solid #dfe6e9'
            }}>
              <div style={{ fontWeight: 500, marginBottom: 12 }}>指向关系预览</div>
              {Object.entries(mockPairings).map(([testId, prodId]) => {
                const testInstance = data.find(d => d.id === testId)
                const prodInstance = mockProductionData.find(p => p.id === prodId)
                
                return (
                  <div key={testId} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    marginBottom: '8px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    border: '1px solid #dfe6e9'
                  }}>
                    <div style={{ flex: 1, fontWeight: 500 }}>
                      {testInstance?.type}-{testInstance?.alias}
                    </div>
                    <div style={{ margin: '0 12px', color: '#52c41a' }}>→</div>
                    <div style={{ flex: 1, fontWeight: 500 }}>
                      {prodInstance?.type}-{prodInstance?.alias}
                    </div>
                    <div style={{ color: '#52c41a', fontSize: 16 }}>✓</div>
                  </div>
                )
              })}
              <div style={{ 
                textAlign: 'center', 
                marginTop: 12, 
                padding: '8px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                fontSize: 14,
                color: '#636e72'
              }}>
                已配置 {Object.keys(mockPairings).length} 个存储实例
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}




