'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Typography,
  Upload,
  message,
  Input,
  Progress,
  Tooltip,
  Popconfirm
} from 'antd'
import { 
  UploadOutlined, 
  DeleteOutlined,

  FolderOutlined,
  FileOutlined,
  HomeOutlined,
  RightOutlined
} from '@ant-design/icons'
import type { TableColumnsType, UploadProps } from 'antd'

const { Title } = Typography
const { Search } = Input

// 文件数据类型定义
interface OSSFile {
  id: string
  name: string
  size: number
  type: 'file' | 'folder'
  updateTime: string
  path: string
}

// 模拟OSS文件数据
const mockFileData: OSSFile[] = [
  // 根目录文件
  {
    id: '1',
    name: 'scripts',
    size: 0,
    type: 'folder',
    updateTime: '2024-01-15 10:30:00',
    path: '/scripts'
  },
  {
    id: '2',
    name: 'config',
    size: 0,
    type: 'folder',
    updateTime: '2024-01-14 15:20:00',
    path: '/config'
  },
  {
    id: '3',
    name: 'logs',
    size: 0,
    type: 'folder',
    updateTime: '2024-01-13 09:15:00',
    path: '/logs'
  },
  {
    id: '4',
    name: 'backup',
    size: 0,
    type: 'folder',
    updateTime: '2024-01-12 14:30:00',
    path: '/backup'
  },
  {
    id: '5',
    name: 'readme.txt',
    size: 512,
    type: 'file',
    updateTime: '2024-01-11 10:00:00',
    path: '/readme.txt'
  },
  // /scripts 目录下的文件
  {
    id: '11',
    name: 'deploy-script.sh',
    size: 2048,
    type: 'file',
    updateTime: '2024-01-15 10:30:00',
    path: '/scripts/deploy-script.sh'
  },
  {
    id: '12',
    name: 'start.sh',
    size: 1024,
    type: 'file',
    updateTime: '2024-01-15 09:20:00',
    path: '/scripts/start.sh'
  },
  {
    id: '13',
    name: 'utils',
    size: 0,
    type: 'folder',
    updateTime: '2024-01-15 08:00:00',
    path: '/scripts/utils'
  },
  // /config 目录下的文件
  {
    id: '21',
    name: 'app.json',
    size: 1024,
    type: 'file',
    updateTime: '2024-01-14 15:20:00',
    path: '/config/app.json'
  },
  {
    id: '22',
    name: 'database.json',
    size: 512,
    type: 'file',
    updateTime: '2024-01-14 14:10:00',
    path: '/config/database.json'
  },
  // /logs 目录下的文件
  {
    id: '31',
    name: 'app.log',
    size: 10240,
    type: 'file',
    updateTime: '2024-01-13 09:15:00',
    path: '/logs/app.log'
  },
  {
    id: '32',
    name: 'error.log',
    size: 2048,
    type: 'file',
    updateTime: '2024-01-13 08:30:00',
    path: '/logs/error.log'
  },
  // /backup 目录下的文件
  {
    id: '41',
    name: 'backup-2024-01-12.tar.gz',
    size: 1048576,
    type: 'file',
    updateTime: '2024-01-12 14:30:00',
    path: '/backup/backup-2024-01-12.tar.gz'
  },
  {
    id: '42',
    name: 'backup-2024-01-11.tar.gz',
    size: 1024000,
    type: 'file',
    updateTime: '2024-01-11 14:30:00',
    path: '/backup/backup-2024-01-11.tar.gz'
  },
  // /scripts/utils 目录下的文件
  {
    id: '131',
    name: 'helper.sh',
    size: 512,
    type: 'file',
    updateTime: '2024-01-15 08:00:00',
    path: '/scripts/utils/helper.sh'
  },
  {
    id: '132',
    name: 'common.sh',
    size: 768,
    type: 'file',
    updateTime: '2024-01-15 07:45:00',
    path: '/scripts/utils/common.sh'
  }
]

export default function FileManagement() {
  const [fileList, setFileList] = useState<OSSFile[]>(mockFileData)
  const [loading, setLoading] = useState<boolean>(false)
  const [searchText, setSearchText] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [currentPath, setCurrentPath] = useState<string>('/')

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '-'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 删除文件（由 Popconfirm 二次确认触发）
  const handleDelete = (file: OSSFile): void => {
    setLoading(true)
    // 模拟删除操作
    setTimeout(() => {
      setFileList(prev => prev.filter(f => f.id !== file.id))
      setLoading(false)
      message.success('文件删除成功')
    }, 500)
  }

  // 进入文件夹
  const handleEnterFolder = (folderPath: string): void => {
    setCurrentPath(folderPath)
    setSearchText('') // 清空搜索
  }

  // 返回上级目录
  const handleBackToParent = (): void => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    setCurrentPath(parentPath)
  }

  // 跳转到指定路径
  const handleNavigateToPath = (path: string): void => {
    setCurrentPath(path)
  }

  // 搜索文件
  const handleSearch = (value: string): void => {
    setSearchText(value)
  }

  // 获取当前目录下的文件
  const getCurrentDirectoryFiles = (): OSSFile[] => {
    return fileList.filter(file => {
      const filePath = file.path
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/')) || '/'
      return fileDir === currentPath
    })
  }

  // 过滤文件列表
  const filteredFileList = searchText 
    ? fileList.filter(file => 
        file.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : getCurrentDirectoryFiles()

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [
      {
        path: '/',
        name: '根目录',
        icon: <HomeOutlined />
      }
    ]
    
    let currentBreadcrumbPath = ''
    pathParts.forEach(part => {
      currentBreadcrumbPath += `/${part}`
      breadcrumbs.push({
        path: currentBreadcrumbPath,
        name: part,
        icon: <FolderOutlined />
      })
    })
    
    return breadcrumbs
  }

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      setIsUploading(true)
      setUploadProgress(0)
      
      // 模拟上传进度
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsUploading(false)
            
            // 添加新文件到列表
            const newFile: OSSFile = {
              id: Date.now().toString(),
              name: file.name,
              size: file.size,
              type: 'file',
              updateTime: new Date().toLocaleString('zh-CN'),
              path: `/${file.name}`
            }
            setFileList(prev => [newFile, ...prev])
            message.success(`${file.name} 上传成功`)
            return 0
          }
          return prev + 10
        })
      }, 200)
      
      return false // 阻止默认上传行为
    }
  }

  // 表格列配置
  const columns: TableColumnsType<OSSFile> = [
    {
      title: '文件名',
      key: 'name',
      render: (_, file) => (
        <Space>
          {file.type === 'folder' ? <FolderOutlined /> : <FileOutlined />}
          {file.type === 'folder' ? (
            <Button
              type="link"
              style={{ padding: 0, height: 'auto' }}
              onClick={() => handleEnterFolder(file.path)}
            >
              {file.name}
            </Button>
          ) : (
            <span>{file.name}</span>
          )}
        </Space>
      )
    },
    {
      title: '文件大小',
      key: 'size',
      render: (_, file) => formatFileSize(file.size),
      width: 120
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, file) => (
        <Space>
          <Popconfirm
            title="确认删除文件"
            description={`确定要删除 "${file.name}" 吗？此操作不可恢复。`}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(file)}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>文件管理</Title>
      </div>

      <Card>
        {/* 面包屑导航 */}
        <div style={{ marginBottom: 16, padding: '8px 0' }}>
          <Space split={<RightOutlined style={{ color: '#ccc', fontSize: '12px' }} />}>
            {generateBreadcrumbs().map((breadcrumb, index) => (
              <Button
                key={breadcrumb.path}
                type="link"
                size="small"
                icon={breadcrumb.icon}
                onClick={() => handleNavigateToPath(breadcrumb.path)}
                style={{ 
                  padding: '4px 8px',
                  height: 'auto',
                  fontWeight: index === generateBreadcrumbs().length - 1 ? 'bold' : 'normal'
                }}
              >
                {breadcrumb.name}
              </Button>
            ))}
          </Space>
        </div>

        {/* 操作栏 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Upload {...uploadProps}>
              <Button 
                type="primary" 
                icon={<UploadOutlined />}
                loading={isUploading}
              >
                {isUploading ? '上传中...' : '上传文件'}
              </Button>
            </Upload>
            {currentPath !== '/' && (
              <Button onClick={handleBackToParent}>
                返回上级
              </Button>
            )}
          </Space>
          
          <Search
            placeholder="搜索文件名"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* 上传进度 */}
        {isUploading && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={uploadProgress} status="active" />
          </div>
        )}

        {/* 文件列表 */}
        <Table
          columns={columns}
          dataSource={filteredFileList}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个文件`
          }}
        />
      </Card>
    </div>
  )
}
