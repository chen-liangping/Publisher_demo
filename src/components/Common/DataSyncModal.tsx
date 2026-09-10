'use client'

import React, { useState } from 'react'
import { 
  Modal, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Steps, 
  Progress,
  Tag,
  Checkbox,
  Table,
  Empty,
  message,
  Tooltip
} from 'antd'
import { 
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  LockOutlined,
  CloseOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Step } = Steps

interface DataSyncModalProps {
  open: boolean
  onCancel: () => void
}

// 模拟数据
const mockData = {
  testEnv: {
    initialized: true,
    applications: [
      { id: 'app1', name: 'Web应用', alias: 'web-app', label: '游服', mountedImages: ['nginx-web-repo'], mountedFiles: ['uploads/', 'config/'] },
      { id: 'app2', name: 'API服务', alias: 'api-service', label: '游服', mountedImages: ['node-api-repo'], mountedFiles: ['logs/'] },
      { id: 'app3', name: 'Dashboard', alias: 'dashboard', label: '测试', mountedImages: ['nginx-web-repo'] },
      { id: 'app4', name: 'Vue应用', alias: 'vue-app', label: '平台', mountedImages: ['nginx-web-repo'] },
      { id: 'app5', name: 'PHP应用', alias: 'php-app', label: '平台', mountedImages: ['nginx-web-repo'] }
    ],
    // 镜像仓库：迁移粒度为仓库本身，不下沉到具体镜像版本
    images: [
      { id: 'img1', name: 'nginx-web-repo', mountedByApps: ['app1'], canUnselect: false },
      { id: 'img2', name: 'node-api-repo', mountedByApps: ['app2'], canUnselect: false },
      { id: 'img3', name: 'redis-repo', mountedByApps: [], canUnselect: true },
      { id: 'img4', name: 'mysql-repo', mountedByApps: [], canUnselect: true }
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
  const [syncing, setSyncing] = useState<boolean>(false)
  const [syncProgress, setSyncProgress] = useState<{ [key: string]: 'pending' | 'running' | 'success' | 'failed' }>({})
  const [syncLogs, setSyncLogs] = useState<{ [key: string]: string[] }>({})
  
  // 迁移数据勾选状态
  const [cdnSourceConfig, setCdnSourceConfig] = useState<boolean>(false)
  const [cdnCacheConfig, setCdnCacheConfig] = useState<boolean>(false)
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedStorages, setSelectedStorages] = useState<string[]>([])
  const [alertContacts, setAlertContacts] = useState<boolean>(false)
  const [openApps, setOpenApps] = useState<boolean>(true)
  const [openImages, setOpenImages] = useState<boolean>(true)
  const [openFiles, setOpenFiles] = useState<boolean>(true)
  const [openStorages, setOpenStorages] = useState<boolean>(true)

  // 一键全选 - 服务端数据
  const selectAllServer = (): void => {
    // 应用
    const allAppIds = mockData.testEnv.applications.map(a => a.id)
    setSelectedApps(allAppIds)

    // 镜像（遵循挂载不可取消：全选时也默认全部选中，但在UI层仍保持禁用态 isDisabled）
    const allImageIds = mockData.testEnv.images.map(img => img.id)
    setSelectedImages(allImageIds)

    // 共享文件（同上）
    const allFileIds = mockData.testEnv.sharedFiles.map(f => f.id)
    setSelectedFiles(allFileIds)

    // 存储
    const allStorageIds = mockData.testEnv.storages.map(s => s.id)
    setSelectedStorages(allStorageIds)
  }

  // 全不选 - 服务端数据
  const deselectAllServer = (): void => {
    setSelectedApps([])
    setSelectedImages([])
    setSelectedFiles([])
    setSelectedStorages([])
  }

  // 分段全选/全不选（服务端-应用）
  const selectAllApps = (): void => {
    const allIds = mockData.testEnv.applications.map(a => a.id)
    setSelectedApps(allIds)
  }
  const deselectAllApps = (): void => {
    setSelectedApps([])
  }

  // 分段全选/全不选（服务端-镜像）
  const selectAllImages = (): void => {
    const allIds = mockData.testEnv.images.map(i => i.id)
    setSelectedImages(allIds)
  }
  const deselectAllImages = (): void => {
    // 保留“已挂载且不可取消”的镜像仓库
    const disabledIds = mockData.testEnv.images
      .filter(img => (!img.canUnselect && img.mountedByApps.some(appId => selectedApps.includes(appId))))
      .map(img => img.id)
    setSelectedImages(disabledIds)
  }

  // 分段全选/全不选（服务端-共享文件）
  const selectAllFiles = (): void => {
    const allIds = mockData.testEnv.sharedFiles.map(f => f.id)
    setSelectedFiles(allIds)
  }
  const deselectAllFiles = (): void => {
    const disabledIds = mockData.testEnv.sharedFiles
      .filter(file => (!file.canUnselect && file.mountedByApps.some(appId => selectedApps.includes(appId))))
      .map(file => file.id)
    setSelectedFiles(disabledIds)
  }

  // 分段全选/全不选（服务端-存储）
  const selectAllStorages = (): void => {
    const allIds = mockData.testEnv.storages.map(s => s.id)
    setSelectedStorages(allIds)
  }
  const deselectAllStorages = (): void => {
    setSelectedStorages([])
  }

  // 客户端分段全选/全不选（CDN 配置）
  const selectAllCDN = (): void => {
    setCdnSourceConfig(true)
    setCdnCacheConfig(true)
  }
  const deselectAllCDN = (): void => {
    setCdnSourceConfig(false)
    setCdnCacheConfig(false)
  }

  // 全选所有可迁移数据（等同原「全量同步」）
  const selectAllData = (): void => {
    selectAllCDN()
    selectAllServer()
    setAlertContacts(true)
  }

  // 清空所有勾选
  const deselectAllData = (): void => {
    deselectAllCDN()
    deselectAllServer()
    setAlertContacts(false)
  }

  // 重置状态
  const resetState = () => {
    setCurrentStep(0)
    setSyncing(false)
    setSyncProgress({})
    setSyncLogs({})
    setCdnSourceConfig(false)
    setCdnCacheConfig(false)
    setSelectedApps([])
    setSelectedImages([])
    setSelectedFiles([])
    setSelectedStorages([])
    setAlertContacts(false)
  }

  // 处理应用选择变化，自动关联镜像和共享文件
  const handleAppSelection = (appId: string, checked: boolean) => {
    if (checked) {
      // 选择应用
      setSelectedApps([...selectedApps, appId])

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

  // 生成详细的同步日志（包含每个具体项目的状态）
  const generateDetailedSyncLogs = (component: string): { logs: string[], hasFailures: boolean } => {
    const logs: string[] = []
    const timestamp = new Date().toLocaleTimeString()
    let hasFailures = false
    
    switch (component) {
      case '镜像仓库':
        selectedImages.forEach(imageId => {
          const image = mockData.testEnv.images.find(img => img.id === imageId)
          if (image) {
            const isSuccess = Math.random() > 0.3 // 70% 成功率
            if (isSuccess) {
              logs.push(`[${timestamp}] ✓ 镜像仓库 ${image.name} 同步成功`)
            } else {
              hasFailures = true
              logs.push(`[${timestamp}] ✗ 镜像仓库 ${image.name} 同步失败 - 网络连接超时`)
              logs.push(`[${timestamp}]   └─ 无法从测试环境拉取镜像仓库 ${image.name}`)
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
        break
    }
    
    return { logs, hasFailures }
  }

  // 开始同步
  const startSync = () => {
    setSyncing(true)
    setCurrentStep(1)

    // 执行顺序遵循 PRD：镜像仓库 → 共享文件 → 存储 → 应用 → 告警联系人，最后客户端 CDN 配置；
    // 只为本次真正勾选到内容的组件建进度条
    const progressOrder = [
      selectedImages.length > 0 ? '镜像仓库' : null,
      selectedFiles.length > 0 ? '共享文件' : null,
      selectedStorages.length > 0 ? '存储' : null,
      selectedApps.length > 0 ? '应用' : null,
      alertContacts ? '告警联系人' : null,
      (cdnSourceConfig || cdnCacheConfig) ? 'CDN配置' : null
    ].filter((c): c is string => c !== null)
    const components = progressOrder
    
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
        return renderPartialSyncSelection()
      case 1:
        return renderSyncProgress()
      default:
        return null
    }
  }

  // 右侧「迁移预览」的数据源：把各类已勾选项汇总成一张清单
  type PreviewItem = {
    key: string
    type: string
    name: string
    locked: boolean
    onRemove?: () => void
  }

  const getPreviewItems = (): PreviewItem[] => {
    const items: PreviewItem[] = []

    if (cdnSourceConfig) {
      items.push({ key: 'cdn-source', type: 'CDN', name: 'CDN源站配置', locked: false, onRemove: () => setCdnSourceConfig(false) })
    }
    if (cdnCacheConfig) {
      items.push({ key: 'cdn-cache', type: 'CDN', name: 'CDN缓存配置', locked: false, onRemove: () => setCdnCacheConfig(false) })
    }

    selectedApps.forEach(appId => {
      const app = mockData.testEnv.applications.find(a => a.id === appId)
      if (!app) return
      items.push({
        key: `app-${appId}`,
        type: '应用',
        name: app.name,
        locked: false,
        onRemove: () => handleAppSelection(appId, false)
      })
    })

    selectedImages.forEach(imageId => {
      const image = mockData.testEnv.images.find(img => img.id === imageId)
      if (!image) return
      // 被已选应用挂载的镜像仓库不可取消，预览里只展示锁标记
      const locked = !image.canUnselect && image.mountedByApps.some(id => selectedApps.includes(id))
      items.push({
        key: `image-${imageId}`,
        type: '镜像仓库',
        name: image.name,
        locked,
        onRemove: locked ? undefined : () => setSelectedImages(selectedImages.filter(id => id !== imageId))
      })
    })

    selectedFiles.forEach(fileId => {
      const file = mockData.testEnv.sharedFiles.find(f => f.id === fileId)
      if (!file) return
      const locked = !file.canUnselect && file.mountedByApps.some(id => selectedApps.includes(id))
      items.push({
        key: `file-${fileId}`,
        type: '共享文件',
        name: file.name,
        locked,
        onRemove: locked ? undefined : () => setSelectedFiles(selectedFiles.filter(id => id !== fileId))
      })
    })

    selectedStorages.forEach(storageId => {
      const storage = mockData.testEnv.storages.find(s => s.id === storageId)
      if (!storage) return
      items.push({
        key: `storage-${storageId}`,
        type: '存储',
        name: storage.name,
        locked: false,
        onRemove: () => setSelectedStorages(selectedStorages.filter(id => id !== storageId))
      })
    })

    if (alertContacts) {
      items.push({
        key: 'alert-contacts',
        type: '告警联系人',
        name: `全部联系人（${mockData.testEnv.alertContacts.length} 人）`,
        locked: false,
        onRemove: () => setAlertContacts(false)
      })
    }

    return items
  }

  // 渲染右侧迁移预览区
  const renderMigrationPreview = () => {
    const items = getPreviewItems()

    const columns = [
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 92,
        render: (text: string) => <Tag color="blue">{text}</Tag>
      },
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <Text style={{ fontSize: 12 }}>{text}</Text>
      },
      {
        title: '操作',
        key: 'action',
        width: 56,
        align: 'center' as const,
        render: (_: unknown, record: PreviewItem) =>
          record.locked ? (
            <Tooltip title="被已选应用依赖，不可移除">
              <LockOutlined style={{ color: '#bfbfbf' }} />
            </Tooltip>
          ) : (
            <Tooltip title="移除">
              <Button type="text" size="small" icon={<CloseOutlined />} onClick={record.onRemove} />
            </Tooltip>
          )
      }
    ]

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong>迁移预览</Text>
          <Tag color="blue">已选 {items.length} 项</Tag>
        </div>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={false}
          scroll={{ y: 300 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" /> }}
        />
        <div style={{ marginTop: 12, fontSize: 12, color: '#8c8c8c' }}>
          迁移后名称均与测试环境保持一致，不支持修改
        </div>
      </div>
    )
  }

  // 左侧选择区的分组标题：标题 + 已选/总数 + 折叠 + 全选/全不选
  const renderGroupHeader = (
    title: string,
    selectedCount: number,
    total: number,
    open: boolean,
    onToggleOpen: () => void,
    onToggleAll: () => void,
    allSelected: boolean
  ) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <Text strong style={{ fontSize: 13 }}>{title}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>{selectedCount}/{total}</Text>
      <Button type="link" size="small" style={{ padding: 0 }} onClick={onToggleOpen}>
        {open ? <CaretDownOutlined /> : <CaretRightOutlined />}
      </Button>
      <Tooltip title={`全选/全不选 ${title}`}>
        <Button
          type="text"
          size="small"
          style={{ padding: 0, marginLeft: 'auto' }}
          icon={allSelected ? <CheckSquareOutlined /> : <BorderOutlined />}
          onClick={onToggleAll}
        />
      </Tooltip>
    </div>
  )

  // 渲染部分同步选择：左侧迁移选择区 + 右侧迁移预览区（单卡片两栏，中间竖分割线）
  const renderPartialSyncSelection = () => {
    const cdnSelectedCount = (cdnSourceConfig ? 1 : 0) + (cdnCacheConfig ? 1 : 0)
    const allCdnSelected = cdnSourceConfig && cdnCacheConfig
    const allAppsSelected = selectedApps.length === mockData.testEnv.applications.length
    const allImagesSelected = selectedImages.length === mockData.testEnv.images.length
    const allFilesSelected = selectedFiles.length === mockData.testEnv.sharedFiles.length
    const allStoragesSelected = selectedStorages.length === mockData.testEnv.storages.length
    const allServerSelected = allAppsSelected && allImagesSelected && allFilesSelected && allStoragesSelected

    const sectionLabelStyle: React.CSSProperties = { fontSize: 12, color: '#8c8c8c' }
    const hintStyle: React.CSSProperties = { fontSize: 12, color: '#8c8c8c', marginBottom: 6 }

    return (
      <Row style={{ minHeight: 380 }}>
        {/* 左：迁移选择区 */}
        <Col span={14} style={{ paddingRight: 20, maxHeight: 460, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <Text strong>选择需要同步的数据</Text>
            <Button type="link" size="small" style={{ marginLeft: 'auto' }} onClick={selectAllData}>
              全选（等同全量同步）
            </Button>
            <Button type="link" size="small" onClick={deselectAllData}>
              清空
            </Button>
          </div>

          {/* 客户端：目前仅 CDN 配置，收成一个轻量区块 */}
          <div style={{ ...sectionLabelStyle, marginBottom: 8 }}>客户端</div>
          <div
            style={{
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13 }}>CDN 配置</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{cdnSelectedCount}/2</Text>
              <Tooltip title="全选/全不选 CDN配置">
                <Button
                  type="text"
                  size="small"
                  style={{ padding: 0, marginLeft: 'auto' }}
                  icon={allCdnSelected ? <CheckSquareOutlined /> : <BorderOutlined />}
                  onClick={() => {
                    if (allCdnSelected) deselectAllCDN()
                    else selectAllCDN()
                  }}
                />
              </Tooltip>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Checkbox checked={cdnSourceConfig} onChange={(e) => setCdnSourceConfig(e.target.checked)}>
                CDN源站配置
              </Checkbox>
              <Checkbox checked={cdnCacheConfig} onChange={(e) => setCdnCacheConfig(e.target.checked)}>
                CDN缓存配置
              </Checkbox>
            </div>
          </div>

          {/* 服务端 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={sectionLabelStyle}>服务端</span>
            <Tooltip title="全选/全不选 服务端">
              <Button
                type="text"
                size="small"
                style={{ padding: 0, marginLeft: 'auto' }}
                icon={allServerSelected ? <CheckSquareOutlined /> : <BorderOutlined />}
                onClick={() => {
                  if (allServerSelected) deselectAllServer()
                  else selectAllServer()
                }}
              />
            </Tooltip>
          </div>

          {/* 应用 */}
          <div style={{ marginBottom: 16 }}>
            {renderGroupHeader(
              '应用',
              selectedApps.length,
              mockData.testEnv.applications.length,
              openApps,
              () => setOpenApps(!openApps),
              () => {
                if (allAppsSelected) deselectAllApps()
                else selectAllApps()
              },
              allAppsSelected
            )}
            <div style={hintStyle}>
              同步应用类型、部署方式、容器配置、镜像仓库、标签、挂载的文件等应用配置；应用名称不可修改
            </div>
            {openApps && mockData.testEnv.applications.map(app => (
              <div key={app.id} style={{ marginBottom: 4 }}>
                <Checkbox
                  checked={selectedApps.includes(app.id)}
                  onChange={(e) => handleAppSelection(app.id, e.target.checked)}
                >
                  <span style={{ marginRight: 8 }}>{app.name}</span>
                  {app.label && (
                    <Tag color={app.label === '游服' ? 'orange' : app.label === '平台' ? 'blue' : 'green'}>
                      {app.label}
                    </Tag>
                  )}
                </Checkbox>
              </div>
            ))}
          </div>

          {/* 镜像仓库 */}
          <div style={{ marginBottom: 16 }}>
            {renderGroupHeader(
              '镜像仓库',
              selectedImages.length,
              mockData.testEnv.images.length,
              openImages,
              () => setOpenImages(!openImages),
              () => {
                if (allImagesSelected) deselectAllImages()
                else selectAllImages()
              },
              allImagesSelected
            )}
            <div style={hintStyle}>
              已挂载应用的镜像仓库默认选中、不可取消；仅同步仓库本身，不迁移仓库内具体镜像版本
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
                      } else {
                        setSelectedImages(selectedImages.filter(id => id !== image.id))
                      }
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{image.name}</span>
                    {isMountedBySelectedApp && <Tag color="blue">应用已关联</Tag>}
                  </Checkbox>
                </div>
              )
            })}
          </div>

          {/* 共享文件 */}
          <div style={{ marginBottom: 16 }}>
            {renderGroupHeader(
              '共享文件',
              selectedFiles.length,
              mockData.testEnv.sharedFiles.length,
              openFiles,
              () => setOpenFiles(!openFiles),
              () => {
                if (allFilesSelected) deselectAllFiles()
                else selectAllFiles()
              },
              allFilesSelected
            )}
            <div style={hintStyle}>已挂载应用的文件默认选中、不可取消；文件名称不可修改</div>
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
                      } else {
                        setSelectedFiles(selectedFiles.filter(id => id !== file.id))
                      }
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{file.name}</span>
                    {isMountedBySelectedApp && <Tag color="green">应用已关联</Tag>}
                  </Checkbox>
                </div>
              )
            })}
          </div>

          {/* 存储 */}
          <div style={{ marginBottom: 16 }}>
            {renderGroupHeader(
              '存储',
              selectedStorages.length,
              mockData.testEnv.storages.length,
              openStorages,
              () => setOpenStorages(!openStorages),
              () => {
                if (allStoragesSelected) deselectAllStorages()
                else selectAllStorages()
              },
              allStoragesSelected
            )}
            <div style={{ fontSize: 12, color: '#d46b08', marginBottom: 6 }}>
              仅同步存储类型、引擎版本、实例类型，不同步账号密码；生产环境创建空实例，不迁移存储内数据，同步后不可回退
            </div>
            {openStorages && mockData.testEnv.storages.map(storage => (
              <div key={storage.id} style={{ marginBottom: 4 }}>
                <Checkbox
                  checked={selectedStorages.includes(storage.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStorages([...selectedStorages, storage.id])
                    } else {
                      setSelectedStorages(selectedStorages.filter(id => id !== storage.id))
                    }
                  }}
                >
                  {storage.name}
                </Checkbox>
              </div>
            ))}
          </div>

          {/* 告警联系人 */}
          <div>
            <Text strong style={{ fontSize: 13 }}>告警联系人（值班用户）</Text>
            <div style={{ ...hintStyle, marginTop: 4 }}>全量迁移值班用户配置，直接创建，不做重复校验</div>
            <Checkbox checked={alertContacts} onChange={(e) => setAlertContacts(e.target.checked)}>
              同步所有告警联系人（{mockData.testEnv.alertContacts.length} 人）
            </Checkbox>
          </div>
        </Col>

        {/* 右：迁移预览区 */}
        <Col span={10} style={{ paddingLeft: 20, borderLeft: '1px solid #f0f0f0' }}>
          {renderMigrationPreview()}
        </Col>
      </Row>
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
      title: '选择数据',
      description: '选择需要同步的数据'
    },
    {
      title: '同步进度',
      description: '数据同步中'
    }
  ]

  return (
    <Modal
      title="同步测试环境到生产"
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {currentStep === 0 && (
            <Tooltip title={getPreviewItems().length === 0 ? '请至少选择一项需要迁移的内容' : ''}>
              <Button
                type="primary"
                danger
                icon={<SyncOutlined />}
                disabled={getPreviewItems().length === 0}
                onClick={startSync}
              >
                确认并开始同步
              </Button>
            </Tooltip>
          )}
          {currentStep === 1 && (
            <Button onClick={onCancel} disabled={syncing}>
              关闭
            </Button>
          )}
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