'use client'

import React, { useMemo, useState } from 'react'
import { Tabs, Card, Typography, Space, Button, Input, Table, Alert, Upload } from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons'

const { Title, Text, Link } = Typography

interface EventRow {
  key: string
  category: string
  event_type: string
  event_id: number
  notes: string
}

interface CsvRow {
  key: string
  name: string
  time: string
  size: string
}

// 这段代码实现了“活动数据”页面，使用了 Ant Design 的 Tabs/Card/Table/Alert/Upload
// - 两个 Tab：活动数据总表、CSV 上传记录
// - 顶部说明与操作按钮保持与礼管页面一致风格
export default function PlayPage(): React.ReactElement {
  const [search, setSearch] = useState('')
  const [events, setEvents] = useState<EventRow[]>([
    { key: '131', category: '喵喵测试活动', event_type: '偶像主题2', event_id: 131, notes: '暂无数据' },
    { key: '249', category: '喵喵测试活动', event_type: '<img src=x onerror=alert(2)>', event_id: 249, notes: '无' },
    { key: '190', category: '喵喵测试活动', event_type: '新英雄-白龙皇', event_id: 190, notes: '暂无数据' },
  ])
  const filtered = events.filter(e => `${e.category}${e.event_id}`.includes(search))

  const eventColumns: ColumnsType<EventRow> = useMemo(() => ([
    { title: 'category', dataIndex: 'category', key: 'category', width: 180 },
    { title: 'event_type', dataIndex: 'event_type', key: 'event_type', width: 180 },
    { title: 'event_id', dataIndex: 'event_id', key: 'event_id', width: 120, sorter: (a, b) => a.event_id - b.event_id },
    { title: 'notes', dataIndex: 'notes', key: 'notes', width: 240 }
  ]), [])

  const [csvList, setCsvList] = useState<CsvRow[]>([
    { key: 'event_20250612.csv', name: 'event_20250612.csv', time: '2025-06-23 16:27:24', size: '180.0B' },
    { key: 'event_gift_20250306.csv', name: 'event_gift_20250306.csv', time: '2025-06-23 15:56:54', size: '90.0B' }
  ])

  const CsvActions = (row: CsvRow) => (
    <Space>
      {/* 下载按钮，图标含义：下载文件 */}
      <Button type="link" onClick={() => window.alert(`原型：下载 ${row.name}`)}>下载</Button>
      {/* 删除按钮，图标含义：删除记录 */}
      <Button type="link" onClick={() => setCsvList(prev => prev.filter(i => i.key !== row.key))}>删除</Button>
    </Space>
  )

  const csvColumns: ColumnsType<CsvRow> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '添加时间', dataIndex: 'time', key: 'time', width: 200 },
    { title: '大小', dataIndex: 'size', key: 'size', width: 120 },
    { title: '操作', key: 'actions', width: 160 }
  ]

  const AllTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>活动数据总表</span>} extra={
        <Space>
          <Button onClick={() => window.alert('原型：更新至Tableau')}>更新至Tableau</Button>
          <Button onClick={() => window.alert('原型：自动化配置')}>自动化配置</Button>
          <Input.Search allowClear placeholder="搜索名称和event_id" style={{ width: 220 }} onSearch={setSearch} />
        </Space>
      }>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Alert type="warning" showIcon message="列表检测到新增数据" />
          <Table rowKey="key" columns={eventColumns} dataSource={filtered} pagination={{ pageSize: 5 }} scroll={{ x: 940 }} />
        </Space>
      </Card>
    </Space>
  )

  // 平台提供的示例礼包数据（用于普通列表展示）
  interface UploadGiftRow { key: string; gift_id: string; gift_name: string }
  const [uploadGiftList] = useState<UploadGiftRow[]>([
    { key: '100006', gift_id: '100006', gift_name: '喵喵礼包测试' },
    { key: '100005', gift_id: '100005', gift_name: '1234' }
  ])

  const uploadGiftColumns: ColumnsType<UploadGiftRow> = [
    { title: 'gift_id', dataIndex: 'gift_id', key: 'gift_id', width: 180 },
    { title: 'gift_name', dataIndex: 'gift_name', key: 'gift_name' },
    {
      title: '操作', key: 'actions', width: 160,
      render: (_, r) => (
        <Button type="link" onClick={() => window.alert(`原型：加入event -> ${r.gift_id} / ${r.gift_name}`)}>加入event</Button>
      )
    }
  ]

  const LogsTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>待上传礼包ID</span>}>
        <Alert type="info" showIcon message="如果礼包已上传，数据同步可能有短暂延迟，请耐心等待" action={<Link href="https://prod-apnortheast-a.online.tableau.com/#/site/g123tableaucloud/views/EventPerformance/EventPerformance?:iid=1" target="_blank">查看Tableau</Link>} />

        <div style={{ marginTop: 16 }}>
          <Table
            rowKey="key"
            columns={uploadGiftColumns}
            dataSource={uploadGiftList}
            pagination={false}
          />
        </div>

      </Card>

      <Card title={<span style={{ fontSize: 18 }}>CSV上传记录</span>} extra={
        <Space>
          {/* CSV 模板下载图标按钮 */}
          <Button icon={<DownloadOutlined />} onClick={() => window.alert('原型：下载CSV模板')}>CSV模板</Button>
          {/* 上传按钮仅做原型提示 */}
          <Upload beforeUpload={() => { window.alert('原型：上传CSV文件'); return false }} multiple>
            <Button icon={<UploadOutlined />}>上传CSV文件</Button>
          </Upload>
          <Input.Search allowClear placeholder="搜索文件名" style={{ width: 200 }} />
        </Space>
      }>
        <Table rowKey="key" columns={csvColumns} dataSource={csvList} pagination={false} scroll={{ x: 900 }} />
      </Card>
    </Space>
  )

  const items: TabsProps['items'] = [
    { key: 'all', label: '活动数据总表', children: AllTab },
    { key: 'logs', label: 'CSV上传记录', children: LogsTab }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>活动数据</Title>
          <Space size={8} wrap>
            <Text type="secondary">活动数据用于展示和管理CP上传的活动相关数据，支持实时编辑和保存，无需重复下载和上传。运营人员可以实时查看、修改活动数据，优化活动管理流程，提高效率。</Text>
            <Link href="https://developers.g123.jp/docs/data-analysis" target="_blank" rel="noopener noreferrer"><u>查看技术文档</u></Link>
          </Space>
        </div>
      </div>
      <Tabs
        items={items}
      />
    </div>
  )
}

