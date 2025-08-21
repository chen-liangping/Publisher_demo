'use client'

import React from 'react'
import {
  Typography,
  Card,
  Tabs,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  message,
  Tooltip
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useRouter } from 'next/navigation'

const { Title, Paragraph, Text } = Typography

// 基础信息类型
interface BaseInfo {
  id: string
  domain: string
  httpVersions: string
  accessKeyId: string
  accessKeySecretMasked: string
}

// 源站配置类型
interface OriginRow {
  id: string
  domain: string
  path: string
  httpPort: number
  httpsPort: number
  backProto: string
  backSSL: string
}

// 缓存规则类型
interface CacheRule {
  pattern: string
  sourceId: string
  accessProto: string
  httpMethods: string
  smartCompress: 'ON' | 'OFF'
  ttlSeconds: number
}

// 模拟数据
const baseInfo: BaseInfo = {
  id: 'E1K5ZDxxxxY4JX8',
  domain: '{appid}-cft.stg.g123-cpp.com',
  httpVersions: 'HTTP2 / HTTP3',
  accessKeyId: 'AKIA5SV6RVTG7IIZNSN4',
  accessKeySecretMasked: 'SeDHtYHp9x2oiGF5zxa4m8bPMegcp8qnaY9g...'
}

const originData: OriginRow[] = [
  {
    id: 'Default',
    domain: 'S3',
    path: '//{staging/production}-legolas-{appid}-statics',
    httpPort: 80,
    httpsPort: 443,
    backProto: '仅限HTTPS',
    backSSL: 'SSLv3'
  }
]

const cacheData: CacheRule[] = [
  { pattern: '/errors/*', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 600 },
  { pattern: '*.html', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 600 },
  { pattern: '/*/g123/i18n/*', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 2592000 },
  { pattern: '*', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 600 }
]

export default function ClientPage() {
  const router = useRouter()
  // 交互：添加源站
  const handleAddOrigin = (): void => {
    message.info('点击了添加源站（示例）')
  }

  // 交互：缓存检测
  const handleDetectCache = (): void => {
    message.info('正在执行缓存检测（示例）')
  }

  // 交互：添加缓存配置
  const handleAddCache = (): void => {
    message.info('点击了添加缓存配置（示例）')
  }

  // 源站表头
  const originColumns: TableColumnsType<OriginRow> = [
    { title: '源站ID', dataIndex: 'id', key: 'id' },
    { title: '域名', dataIndex: 'domain', key: 'domain' },
    { title: '访问路径', dataIndex: 'path', key: 'path' },
    { title: 'HTTP端口', dataIndex: 'httpPort', key: 'httpPort', width: 100 },
    { title: 'HTTPS端口', dataIndex: 'httpsPort', key: 'httpsPort', width: 100 },
    { title: '回源协议', dataIndex: 'backProto', key: 'backProto', width: 140 },
    { title: '回源SSL协议', dataIndex: 'backSSL', key: 'backSSL', width: 140 },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space size={8}>
          <Button type="link" onClick={() => message.info('编辑（示例）')}>编辑</Button>
          <Button type="link" danger onClick={() => message.warning('删除（示例）')}>删除</Button>
        </Space>
      ),
      width: 180
    }
  ]

  // 缓存表头
  const cacheColumns: TableColumnsType<CacheRule> = [
    { title: '访问路径', dataIndex: 'pattern', key: 'pattern' },
    { title: '源站ID', dataIndex: 'sourceId', key: 'sourceId', width: 120 },
    { title: '访问协议', dataIndex: 'accessProto', key: 'accessProto', width: 140 },
    { title: 'HTTP方法', dataIndex: 'httpMethods', key: 'httpMethods', width: 180 },
    {
      title: '智能压缩',
      dataIndex: 'smartCompress',
      key: 'smartCompress',
      width: 120,
      render: (v: 'ON' | 'OFF') => (
        <Tag color={v === 'ON' ? 'green' : 'default'}>{v}</Tag>
      )
    },
    { title: '缓存时间（秒）', dataIndex: 'ttlSeconds', key: 'ttlSeconds', width: 160 },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: CacheRule) => {
        const isI18n = record.pattern === '/*/g123/i18n/*'
        const editBtn = (
          <Button type="link" onClick={() => message.info('编辑（示例）')}>编辑</Button>
        )
        return (
          <Space size={8}>
            {isI18n ? (
              <Tooltip title="此处修改的 CDN 缓存配置不会影响游戏内翻译文本的实时更新。在执行“翻译同步”时，系统已自动清理并刷新相关缓存，无需额外手动处理">
                {editBtn}
              </Tooltip>
            ) : editBtn}
            <Button type="link" onClick={() => message.info('排序（示例）')}>排序</Button>
            <Button type="link" danger onClick={() => message.warning('删除（示例）')}>删除</Button>
          </Space>
        )
      },
      width: 220
    }
  ]

  return (
    <div>
      {/* 顶部信息与导航 */}
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 16 } }}
      >
        <Title level={3} style={{ margin: 0 }}>客户端</Title>
        <Paragraph style={{ color: '#666', marginTop: 8, marginBottom: 0 }}>
          客户端用于存储不同游戏版本的图片以及文本等静态资源进行配置信息，您可以在此页面进行版本管理。
          <Button type="link" style={{ paddingLeft: 4 }} onClick={() => message.info('打开帮助（示例）')}>了解更多</Button>
        </Paragraph>
      </Card>

      {/* 顶部 Tabs */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey="cdn"
          onChange={(key) => {
            if (key === 'version') router.push('/client/version')
            if (key === 'cdn') router.push('/client/cdn')
          }}
          items={[
            { key: 'version', label: '版本' },
            { key: 'config', label: '配置文件' },
            { key: 'cdn', label: 'CDN' },
            { key: 'cors', label: '跨域配置' }
          ]}
        />
      </Card>

      {/* 基础信息 */}
      <Card title="基础信息" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>ID</div>
            <Text code>{baseInfo.id}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>域名</div>
            <Text code>{baseInfo.domain}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>HTTP版本</div>
            <Text>{baseInfo.httpVersions}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>凭证ID</div>
            <Text copyable>{baseInfo.accessKeyId}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>凭证Secret</div>
            <Text copyable>{baseInfo.accessKeySecretMasked}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>CLI</div>
            <Button type="link" onClick={() => message.info('查看 CLI（示例）')}>查看</Button>
          </Col>
        </Row>
      </Card>

      {/* 源站配置 */}
      <Card
        title="源站配置"
        extra={
          <Button type="primary" onClick={handleAddOrigin}>添加源站</Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table<OriginRow>
          columns={originColumns}
          dataSource={originData}
          rowKey={(r) => r.id}
          pagination={false}
        />
      </Card>

      {/* 缓存配置 */}
      <Card
        title="缓存配置"
        extra={
          <Space>
            <Button onClick={handleDetectCache}>缓存检测</Button>
            <Button type="primary" onClick={handleAddCache}>添加缓存配置</Button>
          </Space>
        }
      >
        <Table<CacheRule>
          columns={cacheColumns}
          dataSource={cacheData}
          rowKey={(r) => r.pattern}
          pagination={false}
        />
      </Card>
    </div>
  )
}

