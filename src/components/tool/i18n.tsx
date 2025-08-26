'use client'

// 这段代码实现了“国际化（i18n）”页面，使用了 Ant Design v5 的 Tabs items、Card、Table、Descriptions 等
// - Tab1 多币种定价：价位转换表（支持导出、切换版本、新增档位）、展示当前版本与最后更新时间、汇率换算示例表
// - Tab2 多语言翻译：聊天翻译（Secret 复制）、多语言字体（搜索+下载）、API & Token 信息

import React, { useMemo, useState } from 'react'
import { Tabs, Card, Typography, Space, Button, Input, Table, Descriptions, message, Tooltip } from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SwapOutlined, DownloadOutlined, PlusOutlined, CopyOutlined, FireOutlined } from '@ant-design/icons'

const { Title, Text, Link } = Typography

interface PriceRow {
  key: string
  cnyTier: number
  jpy: number
  usd: number
  aud: number
  gbp: number
  cad: number
  twd: number
  eur: number
}

interface FontRow {
  key: string
  name: string
}

export default function I18nPage(): React.ReactElement {
  // ========== 多币种定价 ==========
  const [priceVersion] = useState<string>('V3')
  const [lastUpdated] = useState<string>('2025-02-13 17:06:46')

  const priceColumns: ColumnsType<PriceRow> = useMemo(() => ([
    { 
      title: (
        <Space size={6}>
          <span>CNY档位</span>
          <Tooltip title="游戏内已使用">
            {/* 火焰图标，表示“游戏内已使用” */}
            <FireOutlined onClick={() => message.info('游戏内已使用')} style={{ color: '#fa541c', cursor: 'pointer' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'cnyTier', key: 'cnyTier', width: 180, fixed: 'left' 
    },
    { 
      title: (
        <Space size={6}>
          <span>JPY(¥)</span>
          <Tooltip title="游戏内已使用">
            <FireOutlined onClick={() => message.info('游戏内已使用')} style={{ color: '#fa541c', cursor: 'pointer' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'jpy', key: 'jpy', width: 160 
    },
    { 
      title: (
        <Space size={8}>
          <span>USD($)</span>
          <Tooltip title="游戏内已使用">
            <FireOutlined onClick={() => message.info('游戏内已使用')} style={{ color: '#fa541c', cursor: 'pointer' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'usd', key: 'usd', width: 160 
    },
    { title: 'AUD(A$)', dataIndex: 'aud', key: 'aud', width: 120 },
    { title: 'GBP(£)', dataIndex: 'gbp', key: 'gbp', width: 120 },
    { title: 'CAD(CA$)', dataIndex: 'cad', key: 'cad', width: 120 },
    { title: 'TWD(NT$)', dataIndex: 'twd', key: 'twd', width: 120 },
    { title: 'EUR(€)', dataIndex: 'eur', key: 'eur', width: 120 }
  ]), [])

  const priceData: PriceRow[] = [
    { key: '0.5', cnyTier: 0.5, jpy: 10, usd: 0.09, aud: 0.19, gbp: 0.09, cad: 0.19, twd: 3, eur: 0.09 },
    { key: '1', cnyTier: 1, jpy: 20, usd: 0.19, aud: 0.29, gbp: 0.19, cad: 0.29, twd: 5, eur: 0.19 },
    { key: '2', cnyTier: 2, jpy: 30, usd: 0.29, aud: 0.39, gbp: 0.19, cad: 0.39, twd: 7, eur: 0.29 },
    { key: '3', cnyTier: 3, jpy: 50, usd: 0.39, aud: 0.59, gbp: 0.29, cad: 0.49, twd: 11, eur: 0.39 },
    { key: '4', cnyTier: 4, jpy: 80, usd: 0.59, aud: 0.89, gbp: 0.49, cad: 0.79, twd: 18, eur: 0.59 },
    { key: '5', cnyTier: 5, jpy: 90, usd: 0.69, aud: 0.99, gbp: 0.59, cad: 0.89, twd: 20, eur: 0.69 },
    { key: '6', cnyTier: 6, jpy: 100, usd: 0.79, aud: 1.09, gbp: 0.69, cad: 0.99, twd: 22, eur: 0.79 },
    { key: '7', cnyTier: 7, jpy: 120, usd: 0.99, aud: 1.29, gbp: 0.89, cad: 1.19, twd: 25, eur: 0.99 },
    { key: '8', cnyTier: 8, jpy: 150, usd: 1.29, aud: 1.59, gbp: 1.19, cad: 1.49, twd: 30, eur: 1.29 },
    { key: '9', cnyTier: 9, jpy: 180, usd: 1.59, aud: 1.89, gbp: 1.49, cad: 1.79, twd: 35, eur: 1.59 },
    { key: '10', cnyTier: 10, jpy: 200, usd: 1.79, aud: 2.09, gbp: 1.69, cad: 1.99, twd: 40, eur: 1.79 }
  ]

  const PriceTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title={<span style={{ fontSize: 18 }}>价位转换表</span>}
        extra={(
          <Space>
            <Button icon={<SwapOutlined />} onClick={() => message.info('原型：切换版本')}>切换版本</Button>
            <Button icon={<DownloadOutlined />} onClick={() => message.success('原型：导出档位')}>导出档位</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => message.success('原型：新增档位')}>新增档位</Button>
          </Space>
        )}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Space size={8} style={{ marginBottom: 12 }}>
          <Text>当前使用汇率表版本：</Text>
          <Button type="link" style={{ padding: 0 }} onClick={() => message.success(`原型：下载版本 ${priceVersion}`)}>{priceVersion}</Button>
          <Text>最后更新时间：{lastUpdated}</Text>
        </Space>
        <Table
          className="table-without-footer table-is-sticky"
          rowKey="key"
          columns={priceColumns}
          dataSource={priceData}
          pagination={false}
          scroll={{ x: 1120 }}
        />
      </Card>
    </Space>
  )

  // ========== 多语言翻译 ==========
  const [fontSearch, setFontSearch] = useState<string>('')
  const allFonts: FontRow[] = [
    { key: 'https://.../SourceHanSansJP-Bold.ttf', name: 'SourceHanSansJP-Bold.ttf' },
    { key: 'https://.../SourceHanSansCN-Bold.ttf', name: 'SourceHanSansCN-Bold.ttf' },
    { key: 'https://.../GenJyuuGothicL-Regular.ttf', name: 'GenJyuuGothicL-Regular.ttf' },
    { key: 'https://.../OpenSans-SemiboldItalic.ttf', name: 'OpenSans-SemiboldItalic.ttf' },
    { key: 'https://.../NotoSansJP-Bold.ttf', name: 'NotoSansJP-Bold.ttf' },
    { key: 'https://.../NotoSansKR-Bold.ttf', name: 'NotoSansKR-Bold.ttf' },
    { key: 'https://.../NotoSansTC-Bold.ttf', name: 'NotoSansTC-Bold.ttf' }
  ]
  const fontList = allFonts.filter(f => !fontSearch || f.name.toLowerCase().includes(fontSearch.toLowerCase()))

  const fontColumns: ColumnsType<FontRow> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_: unknown, r: FontRow) => (
        <Space>
          <Button type="link" onClick={() => message.success(`原型：下载 ${r.name}`)}>下载</Button>
        </Space>
      )
    }
  ]

  const secret = 'SECHbkCG5iLY*************8i4ruz73EN'
  const apiUrl = 'https://i19n-api.g123.jp/api/cp/v1/text-file/gamedemo'

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败，请手动选择文本复制')
    }
  }

  const TranslateTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>聊天翻译</span>} styles={{ body: { paddingTop: 8 } }}>
        {/* 说明文字放在标题下方一行，单独占一行 */}
        <div style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 14, color: '#999' }}>用于翻译游戏聊天窗口的内容，支持多语言。</Text>
        </div>
    
        <Descriptions style={{ marginTop: 16 }} >
          <Descriptions.Item label={<strong>OpenAI  Secret</strong>}>
            <Space>
              <Text >{secret}</Text>
              <CopyOutlined onClick={() => handleCopy(secret)} style={{ cursor: 'pointer' }} />
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={<span style={{ fontSize: 18 }}>游戏文本翻译</span>} extra={<Link href="https://i19n.stg.g123.jp" target="_blank" rel="noopener noreferrer">i19n翻译工具</Link>} styles={{ body: { paddingTop: 8 } }}>
      <div style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 14, color: '#999' }}>用于游戏里除聊天之外的所有文本内容翻译，包括任务、菜单、提示等。</Text>
        </div>
        <Descriptions style={{ marginTop: 16 }} >
          <Descriptions.Item label={<strong>API</strong>}>
            <Space>
              <Text ellipsis style={{ maxWidth: 520 }}>{apiUrl}</Text>
              <CopyOutlined onClick={() => handleCopy(apiUrl)} style={{ cursor: 'pointer' }} />
            </Space>
          </Descriptions.Item>
        </Descriptions>
        <div style={{ height: 8 }} />
        <Descriptions>
          <Descriptions.Item label={<strong>Secret</strong>}>
            <Space>
              <Text >{secret}</Text>
              <CopyOutlined onClick={() => handleCopy(secret)} style={{ cursor: 'pointer' }} />
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={<span style={{ fontSize: 18 }}>多语言字体</span>} extra={(
        <Input.Search allowClear placeholder="搜索文件名" style={{ width: 220 }} onSearch={setFontSearch} onChange={(e) => setFontSearch(e.target.value)} />
      )} styles={{ body: { paddingTop: 8 } }}>
        <Table
          className="table-without-footer"
          rowKey="key"
          columns={fontColumns}
          dataSource={fontList}
          pagination={{ pageSize: 6 }}
          scroll={{ x: 680 }}
        />
      </Card>

    </Space>
  )

  const items: TabsProps['items'] = [
    { key: 'price', label: '多币种定价', children: PriceTab },
    { key: 'translate', label: '多语言翻译', children: TranslateTab }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>国际化</Title>
          <Space size={8} wrap>
            <Text type="secondary">国际化接入用于配置游戏的多语言与多币种定价，支持接入聊天翻译、多语种资源包和区域定价策略，帮助游戏顺利出海。</Text>
            <Link href="https://developers.g123.jp/docs/globalization" target="_blank" rel="noopener noreferrer"><u>了解更多</u></Link>
          </Space>
        </div>
      </div>
      <Tabs items={items} />
    </div>
  )
}

