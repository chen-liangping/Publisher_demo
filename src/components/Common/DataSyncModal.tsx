'use client'

import React, { useState } from 'react'
import { 
  Modal, 
  Button, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Steps, 
  Alert,
  Divider,

  Progress,
  Tag,
  Checkbox,
  Input,
  Table,
  message,
  Tooltip
} from 'antd'
import { 
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  LoadingOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CheckSquareOutlined,
  BorderOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { Step } = Steps

interface DataSyncModalProps {
  open: boolean
  onCancel: () => void
}

// 模拟数据
const mockData = {
  testEnv: {
    initialized: true,
    versionFiles: ['v1.0.1', 'v1.0.2', 'v1.1.0'],
    configFiles: ['config.json', 'env.json', 'database.json'],
    applications: [
      { id: 'app1', name: 'Web应用', alias: 'web-app', label: '游服', mountedImages: ['nginx:1.20'], mountedFiles: ['uploads/', 'config/'] },
      { id: 'app2', name: 'API服务', alias: 'api-service', label: '游服', mountedImages: ['node:16-alpine'], mountedFiles: ['logs/'] },
      { id: 'app3', name: 'Dashboard', alias: 'dashboard', label: '测试', mountedImages: ['nginx:1.20'] },
      { id: 'app4', name: 'Vue应用', alias: 'vue-app', label: '平台', mountedImages: ['nginx:1.20'] },
      { id: 'app5', name: 'PHP应用', alias: 'php-app', label: '平台', mountedImages: ['nginx:1.20'] } 
    ],
    images: [
      { id: 'img1', name: 'nginx:1.20', mountedByApps: ['app1'], canUnselect: false },
      { id: 'img2', name: 'node:16-alpine', mountedByApps: ['app2'], canUnselect: false },
      { id: 'img3', name: 'redis:6.2', mountedByApps: [], canUnselect: true },
      { id: 'img4', name: 'mysql:8.0', mountedByApps: [], canUnselect: true }
    ],
    storages: [
      { id: 'storage1', name: 'MySQL(main)', alias: 'main' },
      { id: 'storage2', name: 'Redis(demo)', alias: 'demo' }
    ],
    sharedFiles: [
      { id: 'file1', name: 'uploads/', mountedByApps: ['app1'], canUnselect: false },
      { id: 'file2', name: 'logs/', mountedByApps: ['app2'], canUnselect: false },
      { id: 'file3', name: 'config/', mountedByApps: ['app1'], canUnselect: false },
      { id: 'file4', name: 'backups/', mountedByApps: [], canUnselect: true },
      { id: 'file5', name: 'temp/', mountedByApps: [], canUnselect: true }
    ],
    alertContacts: [
      { id: 'contact1', name: '张三', appId: 'user001', dingTalkId: 'ding001' },
      { id: 'contact2', name: '李四', appId: 'user002', dingTalkId: 'ding002' },
      { id: 'contact3', name: '王五', appId: 'user003', dingTalkId: 'ding003' }
    ]
  },
  prodEnv: {
    initialized: true
  }
}

export default function DataSyncModal({ open, onCancel }: DataSyncModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [syncType, setSyncType] = useState<'full' | 'partial' | null>(null)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [syncProgress, setSyncProgress] = useState<{ [key: string]: 'pending' | 'running' | 'success' | 'failed' }>({})
  const [syncLogs, setSyncLogs] = useState<{ [key: string]: string[] }>({})
  
  // 部分同步选择状态
  const [selectedVersionFiles, setSelectedVersionFiles] = useState<string[]>([])
  const [selectedConfigFiles, setSelectedConfigFiles] = useState<string[]>([])
  const [cdnSourceConfig, setCdnSourceConfig] = useState<boolean>(false)
  const [cdnCacheConfig, setCdnCacheConfig] = useState<boolean>(false)
  const [corsConfig, setCorsConfig] = useState<boolean>(false)
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [appAliases, setAppAliases] = useState<{ [key: string]: string }>({})
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [imageAliases, setImageAliases] = useState<{ [key: string]: string }>({})
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [fileAliases, setFileAliases] = useState<{ [key: string]: string }>({})
  const [selectedStorages, setSelectedStorages] = useState<string[]>([])
  const [storageAliases, setStorageAliases] = useState<{ [key: string]: string }>({})
  const [alertContacts, setAlertContacts] = useState<boolean>(false)
  const [openApps, setOpenApps] = useState<boolean>(true)
  const [openImages, setOpenImages] = useState<boolean>(true)
  const [openFiles, setOpenFiles] = useState<boolean>(true)
  const [openStorages, setOpenStorages] = useState<boolean>(true)

  // 一键全选 - 客户端数据
  const selectAllClient = (): void => {
    setSelectedVersionFiles([...mockData.testEnv.versionFiles])
    setSelectedConfigFiles([...mockData.testEnv.configFiles])
    setCdnSourceConfig(true)
    setCdnCacheConfig(true)
    setCorsConfig(true)
  }

  // 一键全选 - 服务端数据
  const selectAllServer = (): void => {
    // 应用
    const allAppIds = mockData.testEnv.applications.map(a => a.id)
    setSelectedApps(allAppIds)
    const nextAppAliases: { [key: string]: string } = {}
    mockData.testEnv.applications.forEach(a => { nextAppAliases[a.id] = a.name })
    setAppAliases(nextAppAliases)

    // 镜像（遵循挂载不可取消：全选时也默认全部选中，但在UI层仍保持禁用态 isDisabled）
    const allImageIds = mockData.testEnv.images.map(img => img.id)
    setSelectedImages(allImageIds)
    const nextImageAliases: { [key: string]: string } = {}
    mockData.testEnv.images.forEach(img => { nextImageAliases[img.id] = img.name })
    setImageAliases(nextImageAliases)

    // 共享文件（同上）
    const allFileIds = mockData.testEnv.sharedFiles.map(f => f.id)
    setSelectedFiles(allFileIds)
    const nextFileAliases: { [key: string]: string } = {}
    mockData.testEnv.sharedFiles.forEach(f => { nextFileAliases[f.id] = f.name })
    setFileAliases(nextFileAliases)

    // 存储
    const allStorageIds = mockData.testEnv.storages.map(s => s.id)
    setSelectedStorages(allStorageIds)
    const nextStorageAliases: { [key: string]: string } = {}
    mockData.testEnv.storages.forEach(s => { nextStorageAliases[s.id] = s.alias })
    setStorageAliases(nextStorageAliases)
  }

  // 全不选 - 客户端数据
  const deselectAllClient = (): void => {
    setSelectedVersionFiles([])
    setSelectedConfigFiles([])
    setCdnSourceConfig(false)
    setCdnCacheConfig(false)
    setCorsConfig(false)
  }

  // 全不选 - 服务端数据
  const deselectAllServer = (): void => {
    setSelectedApps([])
    setAppAliases({})
    setSelectedImages([])
    setImageAliases({})
    setSelectedFiles([])
    setFileAliases({})
    setSelectedStorages([])
    setStorageAliases({})
  }

  // 分段全选/全不选（服务端-应用）
  const selectAllApps = (): void => {
    const allIds = mockData.testEnv.applications.map(a => a.id)
    setSelectedApps(allIds)
    const nextAliases: { [key: string]: string } = {}
    mockData.testEnv.applications.forEach(a => { nextAliases[a.id] = a.name })
    setAppAliases(nextAliases)
  }
  const deselectAllApps = (): void => {
    setSelectedApps([])
    setAppAliases({})
  }

  // 分段全选/全不选（服务端-镜像）
  const selectAllImages = (): void => {
    const allIds = mockData.testEnv.images.map(i => i.id)
    setSelectedImages(allIds)
    const nextAliases: { [key: string]: string } = {}
    mockData.testEnv.images.forEach(i => { nextAliases[i.id] = i.name })
    setImageAliases(nextAliases)
  }
  const deselectAllImages = (): void => {
    // 保留“已挂载且不可取消”的镜像
    const disabledIds = mockData.testEnv.images
      .filter(img => (!img.canUnselect && img.mountedByApps.some(appId => selectedApps.includes(appId))))
      .map(img => img.id)
    setSelectedImages(disabledIds)
    const next: { [key: string]: string } = {}
    disabledIds.forEach(id => {
      const img = mockData.testEnv.images.find(i => i.id === id)
      if (img) next[id] = img.name
    })
    setImageAliases(next)
  }

  // 分段全选/全不选（服务端-共享文件）
  const selectAllFiles = (): void => {
    const allIds = mockData.testEnv.sharedFiles.map(f => f.id)
    setSelectedFiles(allIds)
    const next: { [key: string]: string } = {}
    mockData.testEnv.sharedFiles.forEach(f => { next[f.id] = f.name })
    setFileAliases(next)
  }
  const deselectAllFiles = (): void => {
    const disabledIds = mockData.testEnv.sharedFiles
      .filter(file => (!file.canUnselect && file.mountedByApps.some(appId => selectedApps.includes(appId))))
      .map(file => file.id)
    setSelectedFiles(disabledIds)
    const next: { [key: string]: string } = {}
    disabledIds.forEach(id => {
      const f = mockData.testEnv.sharedFiles.find(x => x.id === id)
      if (f) next[id] = f.name
    })
    setFileAliases(next)
  }

  // 分段全选/全不选（服务端-存储）
  const selectAllStorages = (): void => {
    const allIds = mockData.testEnv.storages.map(s => s.id)
    setSelectedStorages(allIds)
    const next: { [key: string]: string } = {}
    mockData.testEnv.storages.forEach(s => { next[s.id] = s.alias })
    setStorageAliases(next)
  }
  const deselectAllStorages = (): void => {
    setSelectedStorages([])
    setStorageAliases({})
  }

  // 客户端分段全选/全不选
  const selectAllVersionFiles = (): void => {
    setSelectedVersionFiles([...mockData.testEnv.versionFiles])
  }
  const deselectAllVersionFiles = (): void => {
    setSelectedVersionFiles([])
  }
  const selectAllConfigFiles = (): void => {
    setSelectedConfigFiles([...mockData.testEnv.configFiles])
  }
  const deselectAllConfigFiles = (): void => {
    setSelectedConfigFiles([])
  }
  const selectAllCDN = (): void => {
    setCdnSourceConfig(true)
    setCdnCacheConfig(true)
  }
  const deselectAllCDN = (): void => {
    setCdnSourceConfig(false)
    setCdnCacheConfig(false)
  }
  // CORS 统一由单一图标控制，无需分开的全选/全不选函数

  // 重置状态
  const resetState = () => {
    setCurrentStep(0)
    setSyncType(null)
    setSyncing(false)
    setSyncProgress({})
    setSyncLogs({})
    setSelectedVersionFiles([])
    setSelectedConfigFiles([])
    setCdnSourceConfig(false)
    setCdnCacheConfig(false)
    setCorsConfig(false)
    setSelectedApps([])
    setAppAliases({})
    setSelectedImages([])
    setSelectedFiles([])
    setSelectedStorages([])
    setStorageAliases({})
    setAlertContacts(false)
  }

  // 处理应用选择变化，自动关联镜像和共享文件
  const handleAppSelection = (appId: string, checked: boolean, app: { alias: string; name?: string }) => {
    if (checked) {
      // 选择应用
      setSelectedApps([...selectedApps, appId])
      setAppAliases({ ...appAliases, [appId]: app.name ?? app.alias })
      
      // 自动选择该应用挂载的镜像（不可取消）
      const relatedImages = mockData.testEnv.images
        .filter(img => img.mountedByApps.includes(appId))
        .map(img => img.id)
      setSelectedImages([...new Set([...selectedImages, ...relatedImages])])
      
      // 自动选择该应用挂载的共享文件（不可取消）
      const relatedFiles = mockData.testEnv.sharedFiles
        .filter(file => file.mountedByApps.includes(appId))
        .map(file => file.id)
      setSelectedFiles([...new Set([...selectedFiles, ...relatedFiles])])
    } else {
      // 取消选择应用
      setSelectedApps(selectedApps.filter(id => id !== appId))
      const newAliases = { ...appAliases }
      delete newAliases[appId]
      setAppAliases(newAliases)
      
      // 检查镜像是否还被其他选中的应用使用
      const remainingApps = selectedApps.filter(id => id !== appId)
      const stillNeededImages = mockData.testEnv.images
        .filter(img => img.mountedByApps.some(mountedAppId => remainingApps.includes(mountedAppId)))
        .map(img => img.id)
      
      // 移除不再需要的镜像
      setSelectedImages(selectedImages.filter(imgId => {
        const img = mockData.testEnv.images.find(i => i.id === imgId)
        return img && (stillNeededImages.includes(imgId) || img.canUnselect)
      }))
      
      // 检查共享文件是否还被其他选中的应用使用
      const stillNeededFiles = mockData.testEnv.sharedFiles
        .filter(file => file.mountedByApps.some(mountedAppId => remainingApps.includes(mountedAppId)))
        .map(file => file.id)
      
      // 移除不再需要的共享文件
      setSelectedFiles(selectedFiles.filter(fileId => {
        const file = mockData.testEnv.sharedFiles.find(f => f.id === fileId)
        return file && (stillNeededFiles.includes(fileId) || file.canUnselect)
      }))
    }
  }

  // 处理取消
  const handleCancel = () => {
    if (syncing) {
      Modal.confirm({
        title: '确认取消',
        content: '同步正在进行中，取消将中断同步过程，确认取消吗？',
        okText: '确认取消',
        cancelText: '继续同步',
        onOk: () => {
          resetState()
          onCancel()
        }
      })
    } else {
      resetState()
      onCancel()
    }
  }

  // 选择同步类型
  const handleSyncTypeSelect = (type: 'full' | 'partial') => {
    setSyncType(type)
    if (type === 'full') {
      // 全量同步直接跳到确认步骤
      setCurrentStep(2)
    } else {
      // 部分同步进入选择步骤
      setCurrentStep(1)
    }
  }

  // 生成详细的同步日志（包含每个具体项目的状态）
  const generateDetailedSyncLogs = (component: string): { logs: string[], hasFailures: boolean } => {
    const logs: string[] = []
    const timestamp = new Date().toLocaleTimeString()
    let hasFailures = false
    
    switch (component) {
      case '镜像':
        selectedImages.forEach(imageId => {
          const image = mockData.testEnv.images.find(img => img.id === imageId)
          if (image) {
            const isSuccess = Math.random() > 0.3 // 70% 成功率
            if (isSuccess) {
              logs.push(`[${timestamp}] ✓ 镜像 ${image.name} 同步成功`)
            } else {
              hasFailures = true
              logs.push(`[${timestamp}] ✗ 镜像 ${image.name} 同步失败 - 网络连接超时`)
              logs.push(`[${timestamp}]   └─ 无法从测试环境拉取镜像 ${image.name}`)
            }
          }
        })
        break
        
      case '共享文件':
        selectedFiles.forEach(fileId => {
          const file = mockData.testEnv.sharedFiles.find(f => f.id === fileId)
          if (file) {
            const isSuccess = Math.random() > 0.2 // 80% 成功率
            if (isSuccess) {
              logs.push(`[${timestamp}] ✓ 共享文件 ${file.name} 同步成功`)
            } else {
              hasFailures = true
              logs.push(`[${timestamp}] ✗ 共享文件 ${file.name} 同步失败 - 权限不足`)
              logs.push(`[${timestamp}]   └─ 文件 ${file.name} 大小超过限制 (>2GB)`)
            }
          }
        })
        break
        
      case '应用':
        selectedApps.forEach(appId => {
          const app = mockData.testEnv.applications.find(a => a.id === appId)
          if (app) {
            const isSuccess = Math.random() > 0.3 // 70% 成功率
            if (isSuccess) {
              logs.push(`[${timestamp}] ✓ 应用 ${app.name} 同步成功`)
              logs.push(`[${timestamp}]   └─ 别名: ${appAliases[appId] || app.alias}`)
            } else {
              hasFailures = true
              logs.push(`[${timestamp}] ✗ 应用 ${app.name} 同步失败 - 环境变量冲突`)
              logs.push(`[${timestamp}]   └─ 应用 ${app.name} 依赖镜像不存在于生产环境`)
            }
          }
        })
        break
        
      case '存储':
        selectedStorages.forEach(storageId => {
          const storage = mockData.testEnv.storages.find(s => s.id === storageId)
          if (storage) {
            const isSuccess = Math.random() > 0.2 // 80% 成功率
            if (isSuccess) {
              logs.push(`[${timestamp}] ✓ 存储实例 ${storage.name} 创建成功`)
              logs.push(`[${timestamp}]   └─ 别名: ${storageAliases[storageId] || storage.alias}`)
            } else {
              hasFailures = true
              logs.push(`[${timestamp}] ✗ 存储实例 ${storage.name} 创建失败 - 资源配额不足`)
              logs.push(`[${timestamp}]   └─ 存储 ${storage.name} 网络配置错误`)
            }
          }
        })
        break
        
      case '告警联系人':
        if (alertContacts) {
          mockData.testEnv.alertContacts.forEach(contact => {
            const isSuccess = Math.random() > 0.1 // 90% 成功率
            if (isSuccess) {
              logs.push(`[${timestamp}] ✓ 联系人 ${contact.name} 同步成功`)
              logs.push(`[${timestamp}]   └─ AppId: ${contact.appId}, DingTalk: ${contact.dingTalkId}`)
            } else {
              hasFailures = true
              logs.push(`[${timestamp}] ✗ 联系人 ${contact.name} 同步失败 - DingTalk ID ${contact.dingTalkId} 无效`)
              logs.push(`[${timestamp}]   └─ 请检查联系人信息是否正确`)
            }
          })
        }
        break
        
      case '版本文件':
        selectedVersionFiles.forEach(version => {
          const isSuccess = Math.random() > 0.2 // 80% 成功率
          if (isSuccess) {
            logs.push(`[${timestamp}] ✓ 版本文件 ${version} 上传成功`)
          } else {
            hasFailures = true
            logs.push(`[${timestamp}] ✗ 版本文件 ${version} 上传失败 - 文件损坏`)
            logs.push(`[${timestamp}]   └─ 版本 ${version} 校验和不匹配`)
          }
        })
        break
        
      case '配置文件':
        selectedConfigFiles.forEach(config => {
          const isSuccess = Math.random() > 0.2 // 80% 成功率
          if (isSuccess) {
            logs.push(`[${timestamp}] ✓ 配置文件 ${config} 同步成功`)
          } else {
            hasFailures = true
            logs.push(`[${timestamp}] ✗ 配置文件 ${config} 格式验证失败`)
            logs.push(`[${timestamp}]   └─ 配置 ${config} 包含敏感信息，需要手动处理`)
          }
        })
        break
        
      case 'CDN配置':
        if (cdnSourceConfig) {
          const isSuccess = Math.random() > 0.1 // 90% 成功率
          if (isSuccess) {
            logs.push(`[${timestamp}] ✓ CDN源站配置 同步成功`)
          } else {
            hasFailures = true
            logs.push(`[${timestamp}] ✗ CDN源站配置 同步失败 - 域名解析错误`)
          }
        }
        if (cdnCacheConfig) {
          const isSuccess = Math.random() > 0.1 // 90% 成功率
          if (isSuccess) {
            logs.push(`[${timestamp}] ✓ CDN缓存配置 同步成功`)
          } else {
            hasFailures = true
            logs.push(`[${timestamp}] ✗ CDN缓存配置 同步失败 - 缓存清理失败`)
          }
        }
        if (corsConfig) {
          const isSuccess = Math.random() > 0.1 // 90% 成功率
          if (isSuccess) {
            logs.push(`[${timestamp}] ✓ 跨域配置 同步成功`)
          } else {
            hasFailures = true
            logs.push(`[${timestamp}] ✗ 跨域配置 同步失败 - 配置格式错误`)
          }
        }
        break
    }
    
    return { logs, hasFailures }
  }

  // 开始同步
  const startSync = () => {
    setSyncing(true)
    setCurrentStep(3)
    
    const components = ['镜像', '共享文件', '应用', '存储', '告警联系人', '版本文件', '配置文件', 'CDN配置']
    const progressOrder = ['镜像', '共享文件', '应用', '存储', '告警联系人', '版本文件', '配置文件', 'CDN配置']
    
    // 初始化进度和日志
    const initialProgress: { [key: string]: 'pending' | 'running' | 'success' | 'failed' } = {}
    const initialLogs: { [key: string]: string[] } = {}
    components.forEach(comp => {
      initialProgress[comp] = 'pending'
      initialLogs[comp] = []
    })
    setSyncProgress(initialProgress)
    setSyncLogs(initialLogs)

    // 模拟同步过程
    let currentIndex = 0
    const syncNext = () => {
      if (currentIndex >= progressOrder.length) {
        const hasFailures = Object.values(syncProgress).some(status => status === 'failed')
        if (hasFailures) {
          message.error('数据同步完成，但部分项目失败，请查看详细日志')
        } else {
          message.success('数据同步完成！')
        }
        return
      }

      const currentComponent = progressOrder[currentIndex]
      setSyncProgress(prev => ({ ...prev, [currentComponent]: 'running' }))

      // 添加开始日志
      const startTime = new Date().toLocaleTimeString()
      setSyncLogs(prev => ({ 
        ...prev, 
        [currentComponent]: [`[${startTime}] 开始同步 ${currentComponent}...`] 
      }))

      setTimeout(() => {
        // 生成详细的同步日志
        const { logs, hasFailures } = generateDetailedSyncLogs(currentComponent)
        
        // 更新日志
        setSyncLogs(prev => ({ 
          ...prev, 
          [currentComponent]: [
            ...prev[currentComponent],
            ...logs,
            `[${new Date().toLocaleTimeString()}] ${currentComponent} 同步${hasFailures ? '失败' : '完成'} ${hasFailures ? '✗' : '✓'}`
          ]
        }))
        
        // 更新进度状态
        setSyncProgress(prev => ({ 
          ...prev, 
          [currentComponent]: hasFailures ? 'failed' : 'success'
        }))
        
        currentIndex++
        if (currentIndex < progressOrder.length) {
          setTimeout(syncNext, 500)
        } else {
          // 检查整体是否有失败
          const overallHasFailures = Object.values(syncProgress).some(status => status === 'failed') || hasFailures
          
          if (overallHasFailures) {
            message.error('数据同步完成，但部分项目失败，请查看详细日志')
          } else {
            message.success('数据同步完成！')
          }
        }
      }, 2000 + Math.random() * 2000)
    }

    syncNext()
  }

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderSyncTypeSelection()
      case 1:
        return renderPartialSyncSelection()
      case 2:
        return renderConfirmation()
      case 3:
        return renderSyncProgress()
      default:
        return null
    }
  }

  // 渲染同步类型选择
  const renderSyncTypeSelection = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        同步测试环境到生产
      </Title>
      <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: 40 }}>
        选择您想要同步的数据类型，确保所有信息准确无误。
      </Paragraph>

      <Row gutter={24} justify="center">
        <Col span={10}>
          <Card
            hoverable
            style={{ height: 200 }}
            styles={{ body: { padding: '30px 20px', textAlign: 'center' } }}
            onClick={() => handleSyncTypeSelect('full')}
          >
            <SyncOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }} />
            <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
              全量同步
            </Title>
            <Text style={{ color: '#666' }}>
              同步所有测试环境数据到生产环境
            </Text>
          </Card>
        </Col>
        <Col span={10}>
          <Card
            hoverable
            style={{ height: 200 }}
            styles={{ body: { padding: '30px 20px', textAlign: 'center' } }}
            onClick={() => handleSyncTypeSelect('partial')}
          >
            <AppstoreOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: 16 }} />
            <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
              部分迁移
            </Title>
            <Text style={{ color: '#666' }}>
              选择需要同步的具体数据项
            </Text>
          </Card>
        </Col>
      </Row>

      <Alert
        message="重要提示"
        description="同步操作不可回退，请谨慎选择。确保生产环境已完成初始化。"
        type="warning"
        showIcon
        style={{ marginTop: 32 }}
      />
    </div>
  )

  // 渲染迁移对比表格
  const renderMigrationComparisonTable = () => {
    const comparisonData: Array<{
      key: string;
      type: string;
      name: string;
      testEnv: string;
      prodEnv: string;
      description: string;
    }> = []

    // 应用对比数据
    selectedApps.forEach(appId => {
      const app = mockData.testEnv.applications.find(a => a.id === appId)
      if (app) {
        comparisonData.push({
          key: `app-${appId}`,
          type: '应用',
          name: app.name,
          testEnv: app.name,
          prodEnv: appAliases[appId] || app.alias,
          description: `应用名称: ${app.name} → ${appAliases[appId] || app.alias}`
        })
      }
    })

    // 镜像对比数据
    selectedImages.forEach(imageId => {
      const image = mockData.testEnv.images.find(img => img.id === imageId)
      if (image) {
        comparisonData.push({
          key: `image-${imageId}`,
          type: '镜像',
          name: image.name,
          testEnv: image.name,
          prodEnv: image.name,
          description: `镜像: ${image.name}`
        })
      }
    })

    // 共享文件对比数据
    selectedFiles.forEach(fileId => {
      const file = mockData.testEnv.sharedFiles.find(f => f.id === fileId)
      if (file) {
        comparisonData.push({
          key: `file-${fileId}`,
          type: '共享文件',
          name: file.name,
          testEnv: file.name,
          prodEnv: file.name,
          description: `共享文件: ${file.name}`
        })
      }
    })

    // 存储对比数据
    selectedStorages.forEach(storageId => {
      const storage = mockData.testEnv.storages.find(s => s.id === storageId)
      if (storage) {
        comparisonData.push({
          key: `storage-${storageId}`,
          type: '存储',
          name: storage.name,
          testEnv: storage.name,
          prodEnv: storageAliases[storageId] || storage.alias,
          description: `存储实例: ${storage.name} → ${storageAliases[storageId] || storage.alias}`
        })
      }
    })

    // 告警联系人对比数据
    if (alertContacts) {
      mockData.testEnv.alertContacts.forEach(contact => {
        comparisonData.push({
          key: `contact-${contact.id}`,
          type: '告警联系人',
          name: contact.name,
          testEnv: `${contact.name} (${contact.appId})`,
          prodEnv: `${contact.name} (${contact.appId})`,
          description: `联系人: ${contact.name}`
        })
      })
    }

    const columns = [
      {
        title: '数据类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (text: string) => <Tag color="blue">{text}</Tag>
      },
      {
        title: '测试环境（迁移前）',
        dataIndex: 'testEnv',
        key: 'testEnv',
        render: (text: string) => <Text code>{text}</Text>
      },
      {
        title: '生产环境（迁移后）',
        dataIndex: 'prodEnv',
        key: 'prodEnv',
        render: (text: string, record: { key: string; type: string; name: string; testEnv: string; prodEnv: string; description: string }) => {
          const isChanged = text !== record.testEnv
          return (
            <Text code style={{ color: isChanged ? '#52c41a' : 'inherit' }}>
              {text}
              {isChanged && <Tag color="green" style={{ marginLeft: 8 }}>已修改</Tag>}
            </Text>
          )
        }
      }
    ]

    return (
      <Table
        dataSource={comparisonData}
        columns={columns}
        size="small"
        pagination={false}
        style={{ marginTop: 12 }}
      />
    )
  }

  // 渲染部分同步选择
  const renderPartialSyncSelection = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        选择需要同步的数据
      </Title>
      
      <Row gutter={24}>
        {/* 客户端数据 */}
        <Col span={12}>
          <Card title="客户端数据" extra={<>
            <Tooltip title="全选/全不选 客户端">
              <Button size="small" type="text"
                icon={selectedVersionFiles.length === mockData.testEnv.versionFiles.length
                  && selectedConfigFiles.length === mockData.testEnv.configFiles.length
                  && cdnSourceConfig && cdnCacheConfig && corsConfig ? <CheckSquareOutlined /> : <BorderOutlined />}
                onClick={() => {
                  const isAllSelected = selectedVersionFiles.length === mockData.testEnv.versionFiles.length
                    && selectedConfigFiles.length === mockData.testEnv.configFiles.length
                    && cdnSourceConfig && cdnCacheConfig && corsConfig
                  if (isAllSelected) deselectAllClient()
                  else selectAllClient()
                }}
              />
            </Tooltip>
          </>} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>版本文件</Text>
              <Button type="link" size="small" onClick={() => setOpenFiles(!openFiles)} style={{ padding: 0, marginLeft: 8 }}>
                {openFiles ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 版本文件">
                <Button
                  type="text"
                  size="small"
                  icon={selectedVersionFiles.length === mockData.testEnv.versionFiles.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = selectedVersionFiles.length === mockData.testEnv.versionFiles.length
                    if (all) deselectAllVersionFiles(); else selectAllVersionFiles()
                  }}
                />
              </Tooltip>
              {openFiles && (
              <Checkbox.Group
                style={{ display: 'block', marginTop: 8 }}
                value={selectedVersionFiles}
                onChange={setSelectedVersionFiles}
              >
                {mockData.testEnv.versionFiles.map(file => (
                  <div key={file} style={{ marginBottom: 4 }}>
                    <Checkbox value={file}>{file}</Checkbox>
                  </div>
                ))}
              </Checkbox.Group>
              )}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>配置文件</Text>
              <Button type="link" size="small" onClick={() => setOpenStorages(!openStorages)} style={{ padding: 0, marginLeft: 8 }}>
                {openStorages ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 配置文件">
                <Button
                  type="text"
                  size="small"
                  icon={selectedConfigFiles.length === mockData.testEnv.configFiles.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = selectedConfigFiles.length === mockData.testEnv.configFiles.length
                    if (all) deselectAllConfigFiles(); else selectAllConfigFiles()
                  }}
                />
              </Tooltip>
              {openStorages && (
              <Checkbox.Group
                style={{ display: 'block', marginTop: 8 }}
                value={selectedConfigFiles}
                onChange={setSelectedConfigFiles}
              >
                {mockData.testEnv.configFiles.map(file => (
                  <div key={file} style={{ marginBottom: 4 }}>
                    <Checkbox value={file}>{file}</Checkbox>
                  </div>
                ))}
              </Checkbox.Group>
              )}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>CDN配置</Text>
              <Button type="link" size="small" onClick={() => setOpenImages(!openImages)} style={{ padding: 0, marginLeft: 8 }}>
                {openImages ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 CDN配置">
                <Button
                  type="text"
                  size="small"
                  icon={cdnSourceConfig && cdnCacheConfig ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = cdnSourceConfig && cdnCacheConfig
                    if (all) deselectAllCDN(); else selectAllCDN()
                  }}
                />
              </Tooltip>
              {openImages && (
              <div style={{ marginTop: 8 }}>
                <Checkbox checked={cdnSourceConfig} onChange={(e) => setCdnSourceConfig(e.target.checked)}>
                  CDN源站配置
                </Checkbox>
                <br />
                <Checkbox checked={cdnCacheConfig} onChange={(e) => setCdnCacheConfig(e.target.checked)}>
                  CDN缓存配置
                </Checkbox>
              </div>
              )}
            </div>
            
            <div>
              <Text strong>跨域配置</Text>
              <Button type="link" size="small" onClick={() => setOpenApps(!openApps)} style={{ padding: 0, marginLeft: 8 }}>
                {openApps ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              {openApps && (
              <div style={{ marginTop: 8 }}>
                <Checkbox checked={corsConfig} onChange={(e) => setCorsConfig(e.target.checked)}>
                  跨域配置
                </Checkbox>
              </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 服务端数据 */}
        <Col span={12}>
          <Card title="服务端数据" extra={<>
            <Tooltip title="全选/全不选 服务端">
              <Button size="small" type="text"
                icon={selectedApps.length === mockData.testEnv.applications.length
                  && selectedImages.length === mockData.testEnv.images.length
                  && selectedFiles.length === mockData.testEnv.sharedFiles.length
                  && selectedStorages.length === mockData.testEnv.storages.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                onClick={() => {
                  const isAllSelected = selectedApps.length === mockData.testEnv.applications.length
                    && selectedImages.length === mockData.testEnv.images.length
                    && selectedFiles.length === mockData.testEnv.sharedFiles.length
                    && selectedStorages.length === mockData.testEnv.storages.length
                  if (isAllSelected) deselectAllServer()
                  else selectAllServer()
                }}
              />
            </Tooltip>
          </>} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>应用</Text>
              <Button type="link" size="small" onClick={() => setOpenApps(!openApps)} style={{ padding: 0, marginLeft: 8 }}>
                {openApps ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 应用">
                <Button type="text" size="small" style={{ padding: 0, marginLeft: 8 }}
                  icon={selectedApps.length === mockData.testEnv.applications.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = selectedApps.length === mockData.testEnv.applications.length
                    if (all) deselectAllApps(); else selectAllApps()
                  }}
                />
              </Tooltip>
              <Alert
                message="应用同步将同步应用所有数据，包含应用类型、部署方式、容器配置、镜像、标签、插件、挂载的文件等应用配置"
                type="info"
                style={{ margin: '8px 0', fontSize: '12px' }}
              />
              {openApps && mockData.testEnv.applications.map(app => (
                <div key={app.id} style={{ marginBottom: 8 }}>
                  <Checkbox
                    checked={selectedApps.includes(app.id)}
                    onChange={(e) => handleAppSelection(app.id, e.target.checked, app)}
                  >
                    <span style={{ marginRight: 8 }}>{app.name}</span>
                    {app.label && (
                      <Tag color={app.label === '游服' ? 'orange' : app.label === '平台' ? 'blue' : 'green'} style={{ marginLeft: 4 }}>
                        {app.label}
                      </Tag>
                    )}
                  </Checkbox>
                  {selectedApps.includes(app.id) && (
                    <Input
                      size="small"
                      placeholder="迁移后名称"
                      value={appAliases[app.id] || app.name || app.alias}
                      onChange={(e) => setAppAliases({ ...appAliases, [app.id]: e.target.value })}
                      style={{ marginLeft: 8, width: 180 }}
                    />
                  )}
                  {selectedApps.includes(app.id) && appAliases[app.id] && appAliases[app.id] !== (app.name || app.alias) && (
                    <div style={{ marginLeft: 24, marginTop: 4, fontSize: 12, color: '#666' }}>
                      <span>迁移前：</span>
                      <span style={{ marginRight: 16 }}>{app.name}</span>
                      <span>迁移后：</span>
                      <span>{appAliases[app.id]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>镜像</Text>
              <Button type="link" size="small" onClick={() => setOpenImages(!openImages)} style={{ padding: 0, marginLeft: 8 }}>
                {openImages ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 镜像">
                <Button type="text" size="small" style={{ padding: 0, marginLeft: 8 }}
                  icon={selectedImages.length === mockData.testEnv.images.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = selectedImages.length === mockData.testEnv.images.length
                    if (all) deselectAllImages(); else selectAllImages()
                  }}
                />
              </Tooltip>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                已挂载应用的镜像默认选中，不可取消
              </div>
              {openImages && mockData.testEnv.images.map(image => {
                const isMountedBySelectedApp = image.mountedByApps.some(appId => selectedApps.includes(appId))
                const isDisabled = !image.canUnselect && isMountedBySelectedApp
                
                return (
                  <div key={image.id} style={{ marginBottom: 4 }}>
                    <Checkbox
                      checked={selectedImages.includes(image.id)}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedImages([...selectedImages, image.id])
                          setImageAliases({ ...imageAliases, [image.id]: image.name })
                        } else {
                          setSelectedImages(selectedImages.filter(id => id !== image.id))
                          const next = { ...imageAliases }
                          delete next[image.id]
                          setImageAliases(next)
                        }
                      }}
                    >
                      <span style={{ marginRight: 8 }}>{image.name}</span>
                     
                      {isMountedBySelectedApp && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          已挂载
                        </Tag>
                      )}
                    </Checkbox>
                    {/* 镜像：选择时不再展示迁移前/后行内信息，改为在迁移表格体现 */}
                  </div>
                )
              })}
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>共享文件</Text>
              <Button type="link" size="small" onClick={() => setOpenFiles(!openFiles)} style={{ padding: 0, marginLeft: 8 }}>
                {openFiles ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 共享文件">
                <Button type="text" size="small" style={{ padding: 0, marginLeft: 8 }}
                  icon={selectedFiles.length === mockData.testEnv.sharedFiles.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = selectedFiles.length === mockData.testEnv.sharedFiles.length
                    if (all) deselectAllFiles(); else selectAllFiles()
                  }}
                />
              </Tooltip>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                已挂载应用的文件默认选中，不可取消
              </div>
              {openFiles && mockData.testEnv.sharedFiles.map(file => {
                const isMountedBySelectedApp = file.mountedByApps.some(appId => selectedApps.includes(appId))
                const isDisabled = !file.canUnselect && isMountedBySelectedApp
                
                return (
                  <div key={file.id} style={{ marginBottom: 4 }}>
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles([...selectedFiles, file.id])
                          setFileAliases({ ...fileAliases, [file.id]: file.name })
                        } else {
                          setSelectedFiles(selectedFiles.filter(id => id !== file.id))
                          const next = { ...fileAliases }
                          delete next[file.id]
                          setFileAliases(next)
                        }
                      }}
                    >
                      <span style={{ marginRight: 8 }}>{file.name}</span>
                 
                      {isMountedBySelectedApp && (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                          已挂载
                        </Tag>
                      )}
                    </Checkbox>
                    {/* 共享文件：选择时不再展示迁移前/后行内信息，改为在迁移表格体现 */}
                  </div>
                )
              })}
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>存储</Text>
              <Button type="link" size="small" onClick={() => setOpenStorages(!openStorages)} style={{ padding: 0, marginLeft: 8 }}>
                {openStorages ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </Button>
              <Tooltip title="全选/全不选 存储">
                <Button type="text" size="small" style={{ padding: 0, marginLeft: 8 }}
                  icon={selectedStorages.length === mockData.testEnv.storages.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    const all = selectedStorages.length === mockData.testEnv.storages.length
                    if (all) deselectAllStorages(); else selectAllStorages()
                  }}
                />
              </Tooltip>
              <Alert
                message="存储同步将同步存储类型、引擎版本、实例类型、账号密码等信息，同步后不可回退，请谨慎操作"
                type="warning"
                style={{ margin: '8px 0', fontSize: '12px' }}
              />
              {openStorages && mockData.testEnv.storages.map(storage => (
                <div key={storage.id} style={{ marginBottom: 8 }}>
                  <Checkbox
                    checked={selectedStorages.includes(storage.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStorages([...selectedStorages, storage.id])
                        setStorageAliases({ ...storageAliases, [storage.id]: storage.alias })
                      } else {
                        setSelectedStorages(selectedStorages.filter(id => id !== storage.id))
                        const newAliases = { ...storageAliases }
                        delete newAliases[storage.id]
                        setStorageAliases(newAliases)
                      }
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{storage.name}</span>
                  </Checkbox>
                  {selectedStorages.includes(storage.id) && (
                    <Input
                      size="small"
                      placeholder="迁移后名称"
                      value={storageAliases[storage.id] || storage.alias}
                      onChange={(e) => setStorageAliases({ ...storageAliases, [storage.id]: e.target.value })}
                      style={{ marginLeft: 8, width: 180 }}
                    />
                  )}
                  {selectedStorages.includes(storage.id) && storageAliases[storage.id] && storageAliases[storage.id] !== storage.alias && (
                    <div style={{ marginLeft: 24, marginTop: 4, fontSize: 12, color: '#666' }}>
                      <span>迁移前：</span>
                      <span style={{ marginRight: 16 }}>{storage.name}</span>
                      <span>迁移后：</span>
                      <span>{storageAliases[storage.id]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <Text strong>告警联系人（值班用户）</Text>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                同步值班用户配置，检查用户是否已存在（按AppId、Name、DingTalkId）
              </div>
              <Checkbox
                checked={alertContacts}
                onChange={(e) => setAlertContacts(e.target.checked)}
                style={{ marginBottom: 8 }}
              >
                同步所有告警联系人
              </Checkbox>
              {alertContacts && (
                <div style={{ marginLeft: 24, padding: '8px 12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                  <Text strong style={{ fontSize: '12px', color: '#52c41a' }}>
                    将同步以下联系人：
                  </Text>
                  {mockData.testEnv.alertContacts.map(contact => (
                    <div key={contact.id} style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      • {contact.name} (AppId: {contact.appId}, DingTalk: {contact.dingTalkId})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 迁移对比表格 */}
            {(selectedApps.length > 0 || selectedImages.length > 0 || selectedFiles.length > 0 || selectedStorages.length > 0 || alertContacts) && (
              <div style={{ marginTop: 24 }}>
                <Divider orientation="left">
                  <Text strong>迁移对比预览</Text>
                </Divider>
                {renderMigrationComparisonTable()}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )

  // 渲染确认页面
  const renderConfirmation = () => {
    return (
      <div style={{ padding: '20px 0' }}>
        <Title level={4} style={{ marginBottom: 20 }}>
          确认同步配置
        </Title>

        {syncType === 'full' ? (
          <Alert
            message="全量同步确认"
            description="测试环境的所有数据均同步至生产，包含版本文件、配置文件、CDN配置、源站配置、镜像文件、应用、存储实例、共享文件、告警联系人，同步后不可回退，请谨慎操作"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        ) : (
          <div>
            <Alert
              message="部分迁移确认"
              description="您已选择需要同步的数据，同步后不可回退，请谨慎操作"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <Card title="同步内容概览" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>客户端数据：</Text>
                  <div style={{ marginLeft: 16, marginTop: 8 }}>
                    {selectedVersionFiles.length > 0 && <div>版本文件：{selectedVersionFiles.join(', ')}</div>}
                    {selectedConfigFiles.length > 0 && <div>配置文件：{selectedConfigFiles.join(', ')}</div>}
                    {cdnSourceConfig && <div>CDN源站配置</div>}
                    {cdnCacheConfig && <div>CDN缓存配置</div>}
                    {corsConfig && <div>跨域配置</div>}
                  </div>
                </Col>
                <Col span={12}>
                  <Text strong>服务端数据：</Text>
                  <div style={{ marginLeft: 16, marginTop: 8 }}>
                    {selectedApps.length > 0 && <div>应用：{selectedApps.length} 个</div>}
                    {selectedImages.length > 0 && <div>镜像：{selectedImages.length} 个</div>}
                    {selectedFiles.length > 0 && <div>共享文件：{selectedFiles.length} 个</div>}
                    {selectedStorages.length > 0 && <div>存储：{selectedStorages.length} 个</div>}
                    {alertContacts && <div>告警联系人：{mockData.testEnv.alertContacts.length} 个</div>}
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Text type="danger" strong>
            ⚠️ 同步一旦开始不可中止，请确认所有选择无误
          </Text>
        </div>
      </div>
    )
  }

  // 渲染同步进度
  const renderSyncProgress = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={4} style={{ marginBottom: 20, textAlign: 'center' }}>
        数据同步进行中
      </Title>

      <div style={{ marginBottom: 32 }}>
        <Progress
          percent={Math.round((Object.values(syncProgress).filter(status => status === 'success' || status === 'failed').length / Object.keys(syncProgress).length) * 100)}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </div>

      <div>
        {Object.entries(syncProgress).map(([component, status]) => (
          <div
            key={component}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              marginBottom: 8,
              backgroundColor: status === 'running' ? '#f6ffed' : '#fafafa',
              border: `1px solid ${
                status === 'success' ? '#b7eb8f' :
                status === 'running' ? '#52c41a' :
                status === 'failed' ? '#ff7875' : '#d9d9d9'
              }`,
              borderRadius: 6
            }}
          >
            <div style={{ marginRight: 12 }}>
              {status === 'success' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />}
              {status === 'running' && <LoadingOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
              {status === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
              {status === 'pending' && <div style={{ width: 16, height: 16, border: '2px solid #d9d9d9', borderRadius: '50%' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{component}</div>
              {/* 显示详细日志 */}
              {syncLogs[component] && syncLogs[component].length > 0 && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  backgroundColor: '#f5f5f5', 
                  padding: '4px 8px', 
                  borderRadius: 3,
                  maxHeight: status === 'failed' ? '120px' : '60px',
                  overflowY: 'auto',
                  fontFamily: 'Monaco, Consolas, monospace'
                }}>
                  {syncLogs[component].map((log, index) => (
                    <div key={index} style={{ 
                      marginBottom: 2,
                      color: log.includes('✗') || log.includes('错误:') || log.includes('失败') ? '#ff4d4f' : 
                             log.includes('✓') || log.includes('成功') || log.includes('完成') ? '#52c41a' : 
                             log.includes('└─') ? '#1890ff' : '#666',
                      paddingLeft: log.includes('└─') ? '12px' : '0px'
                    }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginLeft: 8 }}>
              {status === 'success' && <Tag color="success">已完成</Tag>}
              {status === 'running' && <Tag color="processing">进行中</Tag>}
              {status === 'failed' && <Tag color="error">失败</Tag>}
              {status === 'pending' && <Tag>等待中</Tag>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // 获取步骤
  const getSteps = () => [
    {
      title: '选择同步类型',
      description: '全量同步或部分迁移'
    },
    {
      title: '选择数据',
      description: '选择需要同步的具体数据'
    },
    {
      title: '确认配置',
      description: '确认同步内容'
    },
    {
      title: '同步进度',
      description: '数据同步中'
    }
  ]

  return (
    <Modal
      title="数据同步"
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {currentStep > 0 && currentStep < 3 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                上一步
              </Button>
            )}
          </div>
          <div>
            {currentStep === 1 && (
              <Button type="primary" onClick={() => setCurrentStep(2)}>
                下一步
              </Button>
            )}
            {currentStep === 2 && (
              <Button 
                type="primary" 
                danger 
                icon={<SyncOutlined />}
                onClick={startSync}
              >
                确认并开始同步
              </Button>
            )}
            {currentStep === 3 && (
              <Button onClick={onCancel} disabled={syncing}>
                关闭
              </Button>
            )}
          </div>
        </div>
      }
      maskClosable={false}
      destroyOnHidden
    >
      <Steps current={currentStep} style={{ marginBottom: 32 }}>
        {getSteps().map((step, index) => (
          <Step key={index} title={step.title} description={step.description} />
        ))}
      </Steps>

      {renderStepContent()}
    </Modal>
  )
}