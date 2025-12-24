'use client'

import React, { useState, useRef } from 'react'
import { Typography, Card, Tabs, Button, Table, Tag, Row, Col, Space, message, Modal, Form, Input, Tooltip, Alert, Switch, Drawer, Progress, Upload, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, UploadOutlined, InboxOutlined, FolderAddOutlined, CheckCircleFilled, CloseOutlined, CopyOutlined } from '@ant-design/icons'
import ClientPage from './ClientPage'

const { Title, Paragraph, Text } = Typography

interface VersionRow {
  version: string
  details: string
  createdAt: string
  isCurrent?: boolean
  // 新增：版本状态（用于渲染状态 Tag）
  status?: 'current' | 'offline' | 'notOnline'
  translationStatus?: 'syncing' | 'done'
  // 新增：表示是否开启自动同步翻译（用于控制按钮可用性）
  autoSync?: boolean
  // 新增：最近一次翻译同步时间（用于展示）
  lastSyncAt?: string
}

// 文件/文件夹数据类型
interface FileEntry {
  name: string
  path: string // 形如 "/"、"/assets"、"/assets/images"
  type: 'folder' | 'file'
  sizeKB?: number
  updatedAt: string
}

// 上传文件信息
interface UploadFileInfo {
  name: string
  size: number
  progress: number
  speed: string
  status: 'uploading' | 'success' | 'error'
  uploadedSize: number
}

// 监配置入口：固定前缀
const MONITOR_ENTRY_PREFIX = 'https://h5.stg.g123.jp/game/gamedemo?gameEntry='

const versionData: VersionRow[] = [
  {
    version: 'v1.0.1',
    details: '初始化部署；1.先切换版本然后再进行这个配置以及那个配置反正字数上限大概就是这样了我觉得...',
    createdAt: '2024/07/22  23:56:08',
    isCurrent: true,
    status: 'current',
    translationStatus: 'done',
    autoSync: true,
    lastSyncAt: '2024/09/01 12:30:00'
  },
  { version: 'v1.0.2', details: '8/28上线版本', createdAt: '2024/07/22  23:56:08', translationStatus: 'syncing', status: 'offline' },
  { version: 'v1.0.3', details: '9/02上线版本', createdAt: '2024/07/22  23:56:08', translationStatus: 'done', status: 'offline' },
  { version: 'v1.0.2_test', details: 'test', createdAt: '2024/07/22  23:56:08', translationStatus: 'done', status: 'notOnline' },
  { version: 'v1.0.3_test', details: '测试用，请勿删除该版本', createdAt: '2024/07/22  23:56:08', translationStatus: 'syncing', status: 'notOnline' }
]

export default function ClientVersionPage() {
  const [versions, setVersions] = useState<VersionRow[]>(versionData)
  const [browsingVersion, setBrowsingVersion] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [switchModalVisible, setSwitchModalVisible] = useState<boolean>(false)
  const [selectedVersion, setSelectedVersion] = useState<VersionRow | null>(null)
  const [form] = Form.useForm()
  // 本页内 Tab 切换（不跳路由）
  const [activeTab, setActiveTab] = useState<'version' | 'cdn'>('version')
  // 本地控制：记录每个版本的自动同步状态和最近同步时间
  const [localVersions, setLocalVersions] = useState<Record<string, { autoSync: boolean; lastSyncAt?: string }>>(() => {
    const map: Record<string, { autoSync: boolean; lastSyncAt?: string }> = {}
    versionData.forEach(v => {
      map[v.version] = { autoSync: v.autoSync ?? false, lastSyncAt: v.lastSyncAt }
    })
    return map
  })
  
  // 上传相关状态
  const [uploadDrawerVisible, setUploadDrawerVisible] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadFileInfo[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

// “监配置更多入口”相关状态：用于配置多个 H5 外部入口（按版本自动生成 URL）
  interface ExtraEntryConfig {
    id: string
    version: string
    finalUrl: string
    remark?: string
    editing?: boolean
  }
  const [entryDrawerVisible, setEntryDrawerVisible] = useState<boolean>(false)
  const [extraEntries, setExtraEntries] = useState<ExtraEntryConfig[]>([])

  // 构建“监配置更多入口”的最终跳转地址：仅按版本自动生成入口路径
  const buildMonitorEntryUrl = (version: string): string => {
    if (!version) return ''
    const localEntry = `/${version}/index.html`
    return `${MONITOR_ENTRY_PREFIX}${encodeURIComponent(localEntry)}`
  }

  // 新增一个入口（进入编辑态）
  const handleAddMonitorEntry = (defaultVersion?: string): void => {
    const version = defaultVersion ?? versions[0]?.version ?? ''
    if (!version) {
      message.warning('暂无可用版本，无法新增入口')
      return
    }
    const id = `${version}-${Date.now()}`
    setExtraEntries(prev => [
      ...prev,
      {
        id,
        version,
        finalUrl: '',
        remark: '',
        editing: true
      }
    ])
  }

  const handleChangeEntryField = (id: string, field: 'version' | 'remark', value: string): void => {
    setExtraEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    )
  }

  const handleSaveMonitorEntry = (id: string): void => {
    setExtraEntries(prev => {
      return prev.map(entry =>
        entry.id === id
          ? {
              ...entry,
              finalUrl: buildMonitorEntryUrl(entry.version),
              editing: false
            }
          : entry
      )
    })
  }

  const handleEditMonitorEntry = (id: string): void => {
    setExtraEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, editing: true } : entry
      )
    )
  }

  const handleDeleteMonitorEntry = (id: string): void => {
    setExtraEntries(prev => prev.filter(entry => entry.id !== id))
  }

  const openSwitchModal = (record: VersionRow): void => {
    setSelectedVersion(record)
    setSwitchModalVisible(true)
    form.setFieldsValue({ version: record.version, details: record.details })
  }

  const handleConfirmSwitch = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      if (!selectedVersion) return
      const updated: VersionRow[] = versions.map(v => ({
        ...v,
        isCurrent: v.version === selectedVersion.version,
        status: v.version === selectedVersion.version ? 'current' : (v.status === 'current' ? 'offline' : v.status)
      }))
      setVersions(updated)
      setSwitchModalVisible(false)
      message.success(`已切换到版本：${values.version}`)
    } catch {
      // 校验失败时不处理
    }
  }

  const handleDeleteVersion = (version: string): void => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除版本 ${version} 吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const updated = versions.filter(v => v.version !== version)
        setVersions(updated)
        message.success('已删除')
      }
    })
  }

  // 切换自动同步开关
  const handleToggleAutoSync = (version: string, checked: boolean): void => {
    setLocalVersions(prev => ({ ...prev, [version]: { ...prev[version], autoSync: checked } }))
    message.success(`${version} 自动同步已${checked ? '开启' : '关闭'}`)
  }

  // 同步翻译（示例行为：模拟异步操作并设置最后同步时间与状态）
  const handleSyncTranslation = async (version: string): Promise<void> => {
    const v = versions.find(x => x.version === version)
    if (!v) return
    // 如果自动同步未开启，则阻止操作（额外保险）
    if (!localVersions[version]?.autoSync) {
      message.warning('请先开启自动同步')
      return
    }
    // 模拟开始同步
    setVersions(prev => prev.map(item => item.version === version ? { ...item, translationStatus: 'syncing' } : item))
    // 模拟异步请求
    setTimeout(() => {
      const now = new Date()
      const formatted = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
      setVersions(prev => prev.map(item => item.version === version ? { ...item, translationStatus: 'done' } : item))
      setLocalVersions(prev => ({ ...prev, [version]: { ...prev[version], lastSyncAt: formatted } }))
      message.success(`${version} 翻译同步完成`)
    }, 1200)
  }

  const handleEnterVersion = (version: string): void => {
    // 进入某个版本的“根目录”
    setBrowsingVersion(version)
    setCurrentPath('/')
    message.info(`进入版本 ${version}（示例）`)
  }

  const handleBackToParent = (): void => {
    // 返回上级目录或返回到版本列表
    if (!browsingVersion) return
    if (currentPath === '/') {
      // 已经在根目录，再返回版本列表
      setBrowsingVersion(null)
      return
    }
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    setCurrentPath(parentPath)
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isZip: boolean): void => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    // 转换文件列表为上传信息
    const newFiles: UploadFileInfo[] = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      progress: 0,
      speed: '0 KB/s',
      status: 'uploading' as const,
      uploadedSize: 0
    }))
    
    setUploadingFiles(newFiles)
    setUploadDrawerVisible(true)
    
    // 模拟上传过程
    simulateUpload(newFiles)
    
    // 重置 input
    e.target.value = ''
  }

  // 模拟上传进度
  const simulateUpload = (files: UploadFileInfo[]): void => {
    files.forEach((file, index) => {
      let progress = 0
      const totalSize = file.size
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5 // 每次增加 5-20%
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          // 上传完成
          setUploadingFiles(prev => 
            prev.map((f, i) => 
              i === index 
                ? { ...f, progress: 100, status: 'success', uploadedSize: totalSize, speed: '0 KB/s' }
                : f
            )
          )
        } else {
          // 计算上传速度
          const uploadedSize = (totalSize * progress) / 100
          const speed = ((Math.random() * 500 + 200) * 1024).toFixed(0) // 200-700 KB/s
          const speedText = Number(speed) > 1024 * 1024 
            ? `${(Number(speed) / (1024 * 1024)).toFixed(2)} MB/s`
            : `${(Number(speed) / 1024).toFixed(2)} KB/s`
          
          setUploadingFiles(prev => 
            prev.map((f, i) => 
              i === index 
                ? { ...f, progress: Math.floor(progress), uploadedSize, speed: speedText }
                : f
            )
          )
        }
      }, 300)
    })
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // 模拟：每个版本的文件树
  const mockFilesByVersion: Record<string, FileEntry[]> = {
    'v1.0.1': [
      { name: 'assets', path: '/assets', type: 'folder', updatedAt: '2024/07/22 23:56:08' },
      { name: 'config', path: '/config', type: 'folder', updatedAt: '2024/07/22 23:56:08' },
      { name: 'index.html', path: '/index.html', type: 'file', sizeKB: 12, updatedAt: '2024/07/22 23:56:08' },
      { name: 'README.md', path: '/README.md', type: 'file', sizeKB: 3, updatedAt: '2024/07/22 23:56:08' },
      { name: 'images', path: '/assets/images', type: 'folder', updatedAt: '2024/07/22 23:56:08' },
      { name: 'logo.png', path: '/assets/images/logo.png', type: 'file', sizeKB: 45, updatedAt: '2024/07/22 23:56:08' }
    ],
    'v1.0.2': [
      { name: 'assets', path: '/assets', type: 'folder', updatedAt: '2024/08/28 09:00:00' },
      { name: 'index.html', path: '/index.html', type: 'file', sizeKB: 14, updatedAt: '2024/08/28 09:00:00' }
    ],
    'v1.0.3': [
      { name: 'assets', path: '/assets', type: 'folder', updatedAt: '2024/09/02 09:00:00' }
    ],
    'v1.0.2_test': [
      { name: 'test.txt', path: '/test.txt', type: 'file', sizeKB: 1, updatedAt: '2024/07/22 23:56:08' }
    ],
    'v1.0.3_test': [
      { name: 'assets', path: '/assets', type: 'folder', updatedAt: '2024/07/22 23:56:08' }
    ]
  }

  // 计算父目录是否匹配当前目录
  const getParentDir = (fullPath: string): string => {
    const idx = fullPath.lastIndexOf('/')
    if (idx <= 0) return '/'
    return fullPath.substring(0, idx)
  }

  const getCurrentEntries = (): FileEntry[] => {
    if (!browsingVersion) return []
    const all = mockFilesByVersion[browsingVersion] || []
    return all.filter(entry => getParentDir(entry.path) === currentPath)
  }

  // 进入文件夹
  const handleEnterFolder = (folderPath: string): void => {
    setCurrentPath(folderPath)
  }

  // 点击文件
  const handleOpenFile = (file: FileEntry): void => {
    message.info(`预览文件：${file.name}（示例）`)
  }

  // 文件/文件夹视图列定义
  const fileColumns: TableColumnsType<FileEntry> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: FileEntry) => (
        record.type === 'folder' ? (
          <Button type="link" onClick={() => handleEnterFolder(record.path)}>{record.name}</Button>
        ) : (
          <Button type="link" onClick={() => handleOpenFile(record)}>{record.name}</Button>
        )
      )
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 120, render: (t: string) => (t === 'folder' ? <Tag>文件夹</Tag> : <Tag color="processing">文件</Tag>) },
    { title: '大小(KB)', dataIndex: 'sizeKB', key: 'sizeKB', width: 120, render: (v?: number) => (v ? v : '-') },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 200 }
  ]


  const columns: TableColumnsType<VersionRow> = [
    {
      title: '游戏版本',
      dataIndex: 'version',
      key: 'version',
      width: 200,
      render: (v: string, record) => (
        <Space size={8}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}> {/* 游戏版本 */}
            <Button type="link" onClick={() => handleEnterVersion(record.version)}>
              <Text strong>{v}</Text>
            </Button>
          {/* 状态标签：只有当前版本显示 Tag */}
          {record.status === 'current' && <Tag color="green">当前版本</Tag>}
          </span>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: 'current' | 'offline' | 'notOnline' | undefined) => {
        // 状态文字展示：当前版本、已下线、未上线，前置小圆点增加视觉层次
        if (status === 'current') {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: '#1890ff',
                display: 'inline-block'
              }} />
              已上线
            </span>
          )
        }
        if (status === 'offline') {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: '#ff4d4f',
                display: 'inline-block'
              }} />
              已下线
            </span>
          )
        }
        if (status === 'notOnline') {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: '#d9d9d9',
                display: 'inline-block'
              }} />
              未上线
            </span>
          )
        }
        return '-'
      }
    },
    { 
      title: '发版详情',
      dataIndex: 'details',
      key: 'details',
      width: 320,
      // 通过 Tooltip 展示全文，表格内限制为两行并省略，减小行高让行内文本更紧凑
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {text}
          </div>
        </Tooltip>
      )
    },
    // 新增列：自动同步开关
    {
      title: '自动同步翻译',
      key: 'autoSync',
      width: 160,
      // 使用 Ant Design 的 Switch 组件作为开关控件，外层用 Tooltip 提示
      render: (_: unknown, record: VersionRow) => (
        <Tooltip title="切换自动同步翻译（仅示例，本地状态）">
          <Switch
            checked={!!localVersions[record.version]?.autoSync}
            onChange={(checked) => handleToggleAutoSync(record.version, checked)}
            size="small"
          />
        </Tooltip>
      )
    },
    // 新增列：最近翻译同步时间
    { title: '翻译同步时间', dataIndex: 'lastSyncAt', key: 'lastSyncAt', width: 200, render: (_: unknown, record: VersionRow) => (localVersions[record.version]?.lastSyncAt ?? '-') },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 200 },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: VersionRow) => (
        <Space size={8}>
          <Button type="link" onClick={() => openSwitchModal(record)}>切换版本</Button>
          <Button type="link" danger onClick={() => handleDeleteVersion(record.version)}>删除</Button>
          {/* 同步翻译操作；只有在自动同步开启时可点击，否则置灰 */}
          <Button
            type="link"
            onClick={() => handleSyncTranslation(record.version)}
            // 只有在自动同步关闭时才允许手动触发同步，因此 disabled 逻辑取反
            disabled={!!localVersions[record.version]?.autoSync}
          >
            同步翻译
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      {/* 顶部说明 */}
      <Card styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>客户端</Title>
        <Paragraph style={{ color: '#666', marginTop: 8, marginBottom: 0 }}>
          客户端用于存储不同游戏版本的图片以及文本等静态资源进行配置信息，您可以在此页面进行版本管理。
          <Button type="link" style={{ paddingLeft: 4 }} onClick={() => message.info('打开帮助（示例）')}>了解更多</Button>
        </Paragraph>
      </Card>

      {/* Tabs 本地切换（不跳路由） */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            if (key === 'version' || key === 'cdn') {
              setActiveTab(key as 'version' | 'cdn')
            } else {
              message.info('该 Tab 暂未实现，仍停留在当前页')
            }
          }}
          items={[
            { key: 'version', label: '版本' },
            { key: 'config', label: '配置文件' },
            { key: 'cdn', label: 'CDN' },
            { key: 'cors', label: '跨域配置' }
          ]}
        />
      </Card>

      {/* 游戏入口 URL Card */}
      {activeTab === 'version' && (() => {
        // 获取当前版本
        const currentVersion = versions.find(v => v.status === 'current')
        if (currentVersion) {
          const gameUrl = `https://gamedemo.stg.g123-cpp.com/${currentVersion.version}/index.html`
          return (
            <Card 
              style={{ marginBottom: 16 }}
              styles={{ body: { padding: '16px 24px' } }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
                    游戏入口 URL
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text 
                      strong 
                      style={{ 
                        fontSize: 14,
                        color: '#1890ff',
                        fontFamily: 'monospace'
                      }}
                    >
                      {gameUrl}
                    </Text>
                    <Tooltip title="复制链接">
                      <Button 
                        type="text" 
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          // 复制链接到剪贴板
                          navigator.clipboard.writeText(gameUrl).then(() => {
                            message.success('链接已复制到剪贴板')
                          }).catch(() => {
                            message.error('复制失败，请手动复制')
                          })
                        }}
                      />
                    </Tooltip>
                    </div>
                  </div>
                </div>
                
                {/* 监配置更多入口：为运营同学提供额外的 H5 跳转入口配置 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      // 打开入口管理抽屉，默认使用当前版本；若无入口则先创建一条
                      if (extraEntries.length === 0) {
                        handleAddMonitorEntry(currentVersion.version)
                      }
                      setEntryDrawerVisible(true)
                    }}
                  >
                    配置更多入口
                  </Button>
                </div>

                {extraEntries.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      已配置入口（示例）：
                    </Text>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {extraEntries.map(entry => {
                        const fullUrl = entry.finalUrl || buildMonitorEntryUrl(entry.version)
                        return (
                          <Space key={entry.id} size={8} style={{ fontSize: 12 }}>
                            <Tag bordered={false} color="blue">{entry.version}</Tag>
                            <Text code>{fullUrl}</Text>
                            <Button
                              type="link"
                              size="small"
                              onClick={async () => {
                                try {
                                  if (navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(fullUrl)
                                  }
                                  message.success('入口链接已复制')
                                } catch {
                                  message.error('复制失败，请手动复制')
                                }
                              }}
                            >
                              复制入口链接
                            </Button>
                          </Space>
                        )
                      })}
                    </Space>
              </div>
                )}
              </Space>
            </Card>
          )
        }
        return null
      })()}

      {/* 版本区块 / CDN 页面（同页切换） */}
      <Card
        title={
          <Row align="middle" justify="space-between" style={{ width: '100%' }}>
            <Col>{activeTab === 'cdn' ? 'CDN' : (browsingVersion ? `版本 ${browsingVersion} / 文件` : '版本')}</Col>
            <Col>
              {activeTab === 'version' && !browsingVersion && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('创建版本（示例）')}>
                  创建版本
                </Button>
              )}
            </Col>
          </Row>
        }
      >
        {activeTab === 'cdn' ? (
          <ClientPage embedded />
        ) : browsingVersion ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <Text type="secondary">当前位置：/{browsingVersion}{currentPath}</Text>
                <Button onClick={handleBackToParent}>返回上级</Button>
              </Space>
              <Space>
                {/* 使用带文字的 Button 形式展示操作 */}
                {/* 隐藏的文件输入框 */}
                <input 
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e, false)}
                />
                <input 
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,.tar,.tar.gz,.rar,.7z"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e, true)}
                />
                <Tooltip title="可拖拽文件进行上传。单个文件大小不得超过 10MB，超出可能导致加载缓慢或触发游戏频繁重启">
                  <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                    上传文件
                  </Button>
                </Tooltip>
                <Tooltip title="支持 zip、tar.gz 等压缩格式">
                  <Button icon={<InboxOutlined />} onClick={() => zipInputRef.current?.click()}>
                    上传压缩包
                  </Button>
                </Tooltip>
                <Button icon={<FolderAddOutlined />} onClick={() => message.info('创建文件夹（示例）')}>
                  创建文件夹
                </Button>
              </Space>
            </div>
            <Table<FileEntry>
              columns={fileColumns}
              dataSource={getCurrentEntries()}
              rowKey={(r) => `${r.path}/${r.name}`}
              pagination={false}
            />
          </>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* 为了支持左右滑动，外层加 overflow-x: auto；并给 Table 设置较大的 minWidth 以触发横向滚动 */}
            <Table<VersionRow>
              columns={columns}
              dataSource={versions}
              rowKey={(r) => r.version}
              pagination={false}
              // Ant Design 的 scroll 可保证表头与内容横向对齐
              scroll={{ x: 1100 }}
              style={{ minWidth: 1100 }}
            />
          </div>
        )}
      </Card>

      {/* 切换版本确认弹窗 */}
      <Modal
        title="切换版本确认"
        open={switchModalVisible}
        onCancel={() => setSwitchModalVisible(false)}
        onOk={handleConfirmSwitch}
        okText="确认切换"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="版本名" name="version">
            <Input disabled />
          </Form.Item>
          <Form.Item label="发版详情" name="details" rules={[{ required: true, message: '请输入发版详情' }]}>
            <Input.TextArea rows={4} placeholder="切换版本了" />
          </Form.Item>
        </Form>
        <Alert
          type="info"
          showIcon
          message="请确保单个文件大小不超过 10MB，超出可能导致加载缓慢或触发游戏频繁重启"
        />
      </Modal>

      {/* 监配置更多入口 - 管理抽屉：多入口编辑 / 复制 */}
      <Drawer
        title="监配置入口管理"
        placement="right"
        width={1020}
        open={entryDrawerVisible}
        onClose={() => setEntryDrawerVisible(false)}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={(
              <span>
                前缀 <Text code>{MONITOR_ENTRY_PREFIX}</Text> 固定不变，只需选择版本，系统会自动生成
                <Text strong> 完整入口 URL</Text>，用于监配置跳转。
              </span>
            )}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>入口列表</Text>
            <Button type="primary" size="small" onClick={() => handleAddMonitorEntry()}>
              新增入口
            </Button>
          </div>

          {extraEntries.length === 0 && (
            <Text type="secondary">暂无入口配置，点击右上角「新增入口」开始配置。</Text>
          )}

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {extraEntries.map(entry => {
              const previewUrl = buildMonitorEntryUrl(entry.version)
              return (
                <Card key={entry.id} size="small" bordered style={{ borderRadius: 8 }}>
                  {entry.editing ? (
                    // 编辑态：选择版本 + 填写备注，自动生成入口 URL
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 200px 40px minmax(260px, 1fr) 140px',
                          alignItems: 'center',
                          columnGap: 12,
                          marginBottom: 8
                        }}
                      >
                        <Text type="secondary" style={{ textAlign: 'left' }}>
                          版本
                        </Text>
                        <Select
                          style={{ width: 200 }}
                          value={entry.version}
                          onChange={v => handleChangeEntryField(entry.id, 'version', v)}
                          options={versions.map(v => ({ label: v.version, value: v.version }))}
                        />
                        <Text type="secondary" style={{ textAlign: 'left' }}>
                          备注
                        </Text>
                        <Input
                          placeholder="例如：7月FB广告、官网首页投放"
                          value={entry.remark}
                          onChange={e => handleChangeEntryField(entry.id, 'remark', e.target.value)}
                        />
                        <Space size={8} style={{ justifyContent: 'flex-end' }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleSaveMonitorEntry(entry.id)}
                          >
                            确定
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteMonitorEntry(entry.id)}
                          >
                            删除
                          </Button>
                        </Space>
                      </div>
                    </div>
                  ) : (
                  // 展示态：完整 URL + 复制 / 编辑 / 删除
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text type="secondary" style={{ marginRight: 8 }}>
                        入口：
                      </Text>
                      <Tooltip title={entry.finalUrl}>
                        <Text code ellipsis style={{ maxWidth: 520, display: 'inline-block' }}>
                          {entry.finalUrl}
                        </Text>
                      </Tooltip>
                      {entry.remark && (
                        <Text type="secondary" style={{ marginLeft: 12 }}>
                          备注：{entry.remark}
                        </Text>
                      )}
                    </div>
                    <Space size={8}>
                      <Button
                        type="link"
                        size="small"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(entry.finalUrl)
                            message.success('入口链接已复制')
                          } catch {
                            message.error('复制失败，请手动复制')
                          }
                        }}
                      >
                        复制
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleEditMonitorEntry(entry.id)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => handleDeleteMonitorEntry(entry.id)}
                      >
                        删除
                      </Button>
                    </Space>
                  </div>
                )}
                </Card>
              )
            })}
          </Space>
        </Space>
      </Drawer>

      {/* 文件上传 Drawer */}
      <Drawer
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>上传文件预览</div>
            {uploadingFiles.some(f => f.status === 'success') && (
              <div style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 4,
                fontSize: 14
              }}>
                <CheckCircleFilled style={{ color: '#52c41a' }} />
                <span style={{ color: '#52c41a' }}>文件已上传完成</span>
              </div>
            )}
          </div>
        }
        placement="right"
        open={uploadDrawerVisible}
        onClose={() => setUploadDrawerVisible(false)}
        width={900}
        footer={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-start',
            padding: '10px 0'
          }}>
            <Button onClick={() => setUploadDrawerVisible(false)}>
              关闭
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">可上传文件总数：{uploadingFiles.length}/1</Text>
        </div>

        {/* 文件列表表格 */}
        <Table<UploadFileInfo>
          columns={[
            {
              title: '文件名',
              dataIndex: 'name',
              key: 'name',
              width: 250,
              render: (name: string) => (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ marginTop: 2 }}>📄</span>
                  <div style={{ 
                    wordBreak: 'break-all', 
                    whiteSpace: 'normal',
                    lineHeight: '1.5'
                  }}>
                    {name}
                  </div>
                </div>
              )
            },
            {
              title: '文件目录',
              key: 'path',
              width: 350,
              render: (_: unknown, record: UploadFileInfo) => (
                <div 
                  style={{ 
                    wordBreak: 'break-all',
                    whiteSpace: 'normal',
                    fontSize: 13,
                    color: '#666',
                    lineHeight: '1.5'
                  }}
                >
                  S3://testapp.stg.g123-cpp.com/v1.0/{browsingVersion}{currentPath}/{record.name}
                </div>
              )
            },
            {
              title: '文件大小',
              dataIndex: 'size',
              key: 'size',
              width: 120,
              render: (size: number) => (
                <Text>{formatFileSize(size)}</Text>
              )
            },
            {
              title: '操作',
              key: 'actions',
              width: 180,
              render: (_: unknown, record: UploadFileInfo, index: number) => (
                <Space>
                  {/* 已上传状态显示 */}
                  {record.status === 'success' ? (
                    <Button type="text" size="small" style={{ color: '#52c41a' }}>
                      已上传
                    </Button>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      上传中...
                    </Text>
                  )}
                </Space>
              )
            }
          ]}
          dataSource={uploadingFiles}
          rowKey={(record, index) => `${record.name}-${index}`}
          pagination={false}
          size="small"
        />

        {uploadingFiles.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无上传文件
          </div>
        )}
      </Drawer>
    </div>
  )
}

