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
  Popconfirm,
  Modal,
  Drawer
} from 'antd'
import { 
  UploadOutlined, 
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
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
  // 在线编辑器相关状态
  const [editorVisible, setEditorVisible] = useState<boolean>(false)
  const [currentFile, setCurrentFile] = useState<OSSFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isEditorLoading, setIsEditorLoading] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)

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

  // 查看文件 - 打开在线编辑器
  const handleViewFile = (file: OSSFile): void => {
    if (file.type === 'folder') {
      message.warning('无法查看文件夹内容')
      return
    }
    
    setCurrentFile(file)
    setEditorVisible(true)
    setIsEditorLoading(true)
    setHasUnsavedChanges(false)
    
    // 模拟加载文件内容
    setTimeout(() => {
      // 根据文件类型生成模拟内容
      let content = ''
      const fileName = file.name.toLowerCase()
      
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        content = `// ${file.name}
// 文件路径: ${file.path}
// 最后更新: ${file.updateTime}

function main() {
  console.log('Hello World from ${file.name}')
  
  // TODO: 在这里添加你的代码
  const data = {
    message: 'This is a sample file',
    timestamp: new Date().toISOString()
  }
  
  return data
}

export default main`
      } else if (fileName.endsWith('.json')) {
        content = `{
  "name": "${file.name}",
  "path": "${file.path}",
  "lastModified": "${file.updateTime}",
  "type": "configuration",
  "settings": {
    "enabled": true,
    "debug": false,
    "maxRetries": 3
  },
  "metadata": {
    "version": "1.0.0",
    "author": "system",
    "description": "Sample configuration file"
  }
}`
      } else if (fileName.endsWith('.md')) {
        content = `# ${file.name}

## 概述
这是一个示例 Markdown 文件。

## 详细信息
- **文件路径**: ${file.path}
- **最后更新**: ${file.updateTime}
- **文件大小**: ${formatFileSize(file.size)}

## 内容
这里是文件的主要内容。你可以在这里编写文档、说明或其他文本内容。

### 代码示例
\`\`\`javascript
console.log('Hello from ${file.name}')
\`\`\`

### 注意事项
- 请谨慎编辑此文件
- 保存前请检查语法
- 建议备份重要文件`
      } else if (fileName.endsWith('.sh')) {
        content = `#!/bin/bash
# ${file.name}
# 文件路径: ${file.path}
# 最后更新: ${file.updateTime}

set -e

echo "执行脚本: ${file.name}"
echo "当前时间: $(date)"

# 主要逻辑
main() {
    echo "开始执行主要任务..."
    
    # TODO: 在这里添加你的脚本逻辑
    
    echo "任务执行完成"
}

# 执行主函数
main "$@"`
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.log')) {
        content = `${file.name} - 文本文件内容

文件信息:
- 路径: ${file.path}
- 大小: ${formatFileSize(file.size)}
- 更新时间: ${file.updateTime}

这是一个示例文本文件的内容。
你可以在这里编辑任何文本内容。

日志示例:
[2024-01-15 10:30:00] INFO: 系统启动
[2024-01-15 10:30:01] INFO: 加载配置文件
[2024-01-15 10:30:02] INFO: 连接数据库成功
[2024-01-15 10:30:03] INFO: 服务就绪`
      } else {
        content = `文件名: ${file.name}
路径: ${file.path}
大小: ${formatFileSize(file.size)}
更新时间: ${file.updateTime}

这是一个示例文件的内容。
你可以在这里编辑文件内容。

注意: 这是一个模拟的在线编辑器，实际使用时会加载真实的文件内容。`
      }
      
      setFileContent(content)
      setIsEditorLoading(false)
    }, 800)
  }

  // 下载文件
  const handleDownloadFile = (file: OSSFile): void => {
    if (file.type === 'folder') {
      message.warning('无法下载文件夹')
      return
    }
    
    // 模拟下载过程
    message.loading('正在准备下载...', 1)
    setTimeout(() => {
      // 创建模拟下载
      const content = `这是文件 ${file.name} 的内容\n文件路径: ${file.path}\n更新时间: ${file.updateTime}`
      const blob = new Blob([content], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('文件下载成功')
    }, 1000)
  }

  // 保存文件内容
  const handleSaveFile = (): void => {
    if (!currentFile) return
    
    setIsEditorLoading(true)
    // 模拟保存操作
    setTimeout(() => {
      setIsEditorLoading(false)
      setHasUnsavedChanges(false)
      message.success('文件保存成功')
    }, 500)
  }

  // 关闭编辑器
  const handleCloseEditor = (): void => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '未保存的更改',
        content: '您有未保存的更改，确定要关闭编辑器吗？',
        okText: '确定关闭',
        cancelText: '取消',
        onOk: () => {
          setEditorVisible(false)
          setCurrentFile(null)
          setFileContent('')
          setHasUnsavedChanges(false)
        }
      })
    } else {
      setEditorVisible(false)
      setCurrentFile(null)
      setFileContent('')
      setHasUnsavedChanges(false)
    }
  }

  // 文件内容变化处理
  const handleContentChange = (value: string): void => {
    setFileContent(value)
    setHasUnsavedChanges(true)
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
      width: 150,
      render: (_, file) => (
        <Space>
          {file.type === 'file' && (
            <>
              <Tooltip title="查看">
                <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewFile(file)} />
              </Tooltip>
              <Tooltip title="下载">
                <Button type="text" icon={<DownloadOutlined />} onClick={() => handleDownloadFile(file)} />
              </Tooltip>
            </>
          )}
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

      {/* 在线编辑器 Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ marginRight: 8 }}>📝</span>
              {currentFile?.name || '文件编辑器'}
              {hasUnsavedChanges && <span style={{ color: '#ff4d4f', marginLeft: 8 }}>*</span>}
            </div>
            <Space>
              <Button 
                type="primary" 
                size="small"
                loading={isEditorLoading}
                disabled={!hasUnsavedChanges}
                onClick={handleSaveFile}
              >
                保存 {hasUnsavedChanges && '(Ctrl+S)'}
              </Button>
              <Button size="small" onClick={handleCloseEditor}>
                关闭
              </Button>
            </Space>
          </div>
        }
        width="80%"
        open={editorVisible}
        onClose={handleCloseEditor}
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        {currentFile && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 文件信息栏 */}
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid #f0f0f0', 
              backgroundColor: '#fafafa',
              fontSize: '12px',
              color: '#666'
            }}>
              <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                <span>📁 {currentFile.path}</span>
                <span>📊 {formatFileSize(currentFile.size)}</span>
                <span>🕒 {currentFile.updateTime}</span>
                <span>💾 {hasUnsavedChanges ? '未保存' : '已保存'}</span>
              </Space>
            </div>
            
            {/* 编辑器区域 */}
            <div style={{ flex: 1, position: 'relative' }}>
              {isEditorLoading ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '200px',
                  flexDirection: 'column',
                  gap: 16
                }}>
                  <div className="loading-spinner" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #1890ff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: '#666' }}>正在加载文件内容...</span>
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    padding: '16px',
                    fontFamily: '"Fira Code", "JetBrains Mono", "Monaco", "Consolas", monospace',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    resize: 'none',
                    tabSize: 2
                  }}
                  placeholder="开始编辑文件内容..."
                  onKeyDown={(e) => {
                    // Ctrl+S 保存快捷键
                    if (e.ctrlKey && e.key === 's') {
                      e.preventDefault()
                      handleSaveFile()
                    }
                    // Tab 键插入空格
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const start = e.currentTarget.selectionStart
                      const end = e.currentTarget.selectionEnd
                      const value = e.currentTarget.value
                      const newValue = value.substring(0, start) + '  ' + value.substring(end)
                      e.currentTarget.value = newValue
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2
                      handleContentChange(newValue)
                    }
                  }}
                />
              )}
            </div>
            
            {/* 状态栏 */}
            <div style={{ 
              padding: '8px 16px', 
              borderTop: '1px solid #f0f0f0', 
              backgroundColor: '#fafafa',
              fontSize: '12px',
              color: '#666',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Space>
                <span>行: {fileContent.split('\n').length}</span>
                <span>字符: {fileContent.length}</span>
                <span>编码: UTF-8</span>
              </Space>
              <Space>
                <span>💡 Ctrl+S 保存</span>
                <span>💡 Tab 缩进</span>
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* 添加旋转动画的 CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
