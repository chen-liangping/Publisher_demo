"use client"

import React, { useState } from 'react'
import { Card, Table, Typography, Alert, Descriptions, Button, Space } from 'antd'
import { CopyOutlined, FolderOpenOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CloseOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

// 服务器数据类型
export interface ServerItem {
  key: string;
  name: string;
  cliCommand: string;
}

// 基本信息数据类型
export interface DownloadInfo {
  accessKeyId: string;
  secret: string;
  cliReference?: string;
}

interface FileDownloadProps {
  downloadInfo?: DownloadInfo;
  servers?: ServerItem[];
  onViewCLI?: () => void;
  onCopyText?: (text: string) => void;
}

export default function FileDownload({
  downloadInfo = {
    accessKeyId: 'LTAI5tEL*********U7dKm9R',
    secret: '6pwC81vC0F***********LV78KG2d0'
  },
  servers = [],
  onViewCLI,
  onCopyText
}: FileDownloadProps) {

  const [showInfoAlert, setShowInfoAlert] = useState(true)
  const [showWarningAlert, setShowWarningAlert] = useState(true)

  const handleCopyText = (text: string) => {
    if (onCopyText) {
      onCopyText(text)
    } else {
      // 默认复制到剪贴板
      navigator.clipboard.writeText(text).then(() => {
        console.log('文本已复制到剪贴板')
      }).catch(err => {
        console.error('复制失败:', err)
      })
    }
  }

  // 服务器表格列配置
  const serverColumns: ColumnsType<ServerItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FolderOpenOutlined style={{ fontSize: 20, color: 'rgba(0, 0, 0, 0.65)' }} />
          <Text>{name}</Text>
        </div>
      )
    },
    {
      title: 'CLI',
      dataIndex: 'cliCommand',
      key: 'cliCommand',
      width: 600,
      render: (command: string) => (
        <Text
          copyable={{
            text: command,
            onCopy: () => handleCopyText(command),
            icon: <CopyOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
          }}
          ellipsis
          style={{ width: '100%' }}
        >
          {command}
        </Text>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 基本信息 Card */}
      <Card 
        title={<span style={{ fontSize: 18 }}>基本信息</span>}
        bordered
        style={{ paddingTop: 8 }}
        styles={{ 
          header: { borderBottom: 'none', height: 56 },
          body: { paddingTop: 1 }
        }}
      >
        <Descriptions column={3}>
          <Descriptions.Item 
            label={<span style={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.88)' }}>Access Key ID</span>}
          >
            <Text
              copyable={{
                text: downloadInfo.accessKeyId,
                onCopy: () => handleCopyText(downloadInfo.accessKeyId),
                icon: <CopyOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
              }}
              ellipsis
            >
              {downloadInfo.accessKeyId}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item 
            label={<span style={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.88)' }}>Secret</span>}
          >
            <Text
              copyable={{
                text: downloadInfo.secret,
                onCopy: () => handleCopyText(downloadInfo.secret),
                icon: <CopyOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
              }}
              ellipsis
            >
              {downloadInfo.secret}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item 
            label={<span style={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.88)' }}>CLI 参考</span>}
          >
            <Button 
              type="link" 
              size="small" 
              style={{ padding: 0 }}
              onClick={onViewCLI}
            >
              查看
            </Button>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 服务器 Card */}
      <Card 
        title={<span style={{ fontSize: 18 }}>服务器</span>}
        bordered
        style={{ paddingTop: 8 }}
        styles={{ 
          header: { borderBottom: 'none', height: 56 },
          body: { paddingTop: 1 }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 提示信息 */}
          {showInfoAlert && (
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="将文件复制到容器内 /g123 路径下就会出现在下载列表，不适用对实时性与一致性高的场景。"
              closable
              onClose={() => setShowInfoAlert(false)}
              closeIcon={<CloseOutlined />}
            />
          )}
          
          {showWarningAlert && (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="/g123 路径下修改时间超过30天的文件，将被删除。"
              closable
              onClose={() => setShowWarningAlert(false)}
              closeIcon={<CloseOutlined />}
            />
          )}

          {/* 服务器列表表格 */}
          <div className="table-without-footer">
            <Table
              columns={serverColumns}
              dataSource={servers}
              pagination={false}
              size="small"
              scroll={{ x: 760 }}
              style={{ minWidth: '100%' }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
