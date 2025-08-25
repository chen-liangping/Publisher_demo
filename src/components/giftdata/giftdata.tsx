'use client'

import React, { useMemo, useState } from 'react'
import { Tabs, Card, Typography, Space, Button, Input, Table, Alert, Image } from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text, Link } = Typography

interface ItemRow {
  key: string
  itemId: string
  name: string
  i18nKey: string
  detailI18nKey: string
  iconUrl?: string
  value: string
  typeId: string
  typeName: string
  isStoreSupported: boolean
  isAiSupported: boolean
  attributes: string
}

interface GiftRow {
  key: string
  display_id: string
  gift_name: string
  ai_supported: boolean
  description: string
  items: string
  price_jpy: number
  price_value_ratio: number
  purchase_limit_type: string
  purchase_limit_amount: number
  amount_to_diamond: number
  vip_points: number
  payload: string
}

// 这段代码实现了“礼包道具/道具数据”页面，使用了 Ant Design 的 Tabs/Card/Table/Alert
// - 两个 Tab：道具资源、礼包道具
// - 顶部说明与礼管页面风格一致
export default function GiftDataPage(): React.ReactElement {
  const [search, setSearch] = useState('')
  const [giftSearch, setGiftSearch] = useState('')
  const [items] = useState<ItemRow[]>([
    {
      key: 'I06000043超级氮气1', itemId: 'I06000043', name: '超级氮气1', i18nKey: 'L_I06000010', detailI18nKey: 'L_I06000010',
      iconUrl: 'https://ctwbox.g123.jp/?link_id=d90eb97e96084c668b02e00e37d69261', value: '500', typeId: '004', typeName: '消耗道具',
      isStoreSupported: false, isAiSupported: false, attributes: 'storeDisplayPrice:300,...'
    },
    {
      key: 'I06000041喵喵测试数据99', itemId: 'I06000041', name: '喵喵测试数据99', i18nKey: 'I06000040', detailI18nKey: 'I06000040',
      iconUrl: 'https://ik.imagekit.io/g123/production-ctw-box/game-box/preview/c78f83d6c465d79bb8d13c62da6743cafe620fd44b222b5dfcad7e02.png', value: '600', typeId: '003', typeName: '外观道具',
      isStoreSupported: false, isAiSupported: false, attributes: 'storeDisplayPrice:44,...'
    }
  ])

  const filteredItems = items.filter(i => `${i.itemId}${i.name}${i.i18nKey}`.includes(search))

  const itemColumns: ColumnsType<ItemRow> = useMemo(() => ([
    { title: 'item ID', dataIndex: 'itemId', key: 'itemId', width: 120, fixed: 'left' },
    { title: 'name', dataIndex: 'name', key: 'name', width: 160 },
    { title: 'i18n_Key', dataIndex: 'i18nKey', key: 'i18nKey', width: 180 },
    { title: 'detail_i18n_Key', dataIndex: 'detailI18nKey', key: 'detailI18nKey', width: 180 },
    { title: 'iconUrl', dataIndex: 'iconUrl', key: 'iconUrl', width: 160, render: (url?: string) => url ? <Image src={url} width={48} height={48} alt="icon" /> : '-' },
    { title: 'value', dataIndex: 'value', key: 'value', width: 120 },
    { title: 'type_Id', dataIndex: 'typeId', key: 'typeId', width: 120 },
    { title: 'type_Name', dataIndex: 'typeName', key: 'typeName', width: 160 },
    { title: 'isStoreSupported', dataIndex: 'isStoreSupported', key: 'isStoreSupported', width: 140, render: (v: boolean) => String(v) },
    { title: 'isAiSupported', dataIndex: 'isAiSupported', key: 'isAiSupported', width: 120, render: (v: boolean) => String(v) },
    { title: 'attributes', dataIndex: 'attributes', key: 'attributes', width: 260 },
    { title: '操作', key: 'actions', width: 100, fixed: 'right', render: () => <Button type="link" onClick={() => window.alert('原型：删除')}>删除</Button> }
  ]), [])

  const [gifts] = useState<GiftRow[]>([
    {
      key: '100006喵喵礼包测试',
      display_id: '100006',
      gift_name: '喵喵礼包测试',
      ai_supported: true,
      description: '周末限时特惠',
      items: '高级引擎: 1\nLOCK碎片: 100',
      price_jpy: 890,
      price_value_ratio: 500,
      purchase_limit_type: '每周限购',
      purchase_limit_amount: 1,
      amount_to_diamond: 15000,
      vip_points: 15000,
      payload: '12'
    },
    {
      key: '1000051234',
      display_id: '100005',
      gift_name: '1234',
      ai_supported: true,
      description: '周末限时特惠',
      items: 'LOCK碎片: 100\n高级引擎: 1',
      price_jpy: 500,
      price_value_ratio: 500,
      purchase_limit_type: '每月限购',
      purchase_limit_amount: 2,
      amount_to_diamond: 15000,
      vip_points: 15000,
      payload: '21'
    }
  ])

  const filteredGifts = gifts.filter(g => `${g.display_id}${g.gift_name}`.includes(giftSearch))

  const giftColumns: ColumnsType<GiftRow> = [
    { title: 'display_id', dataIndex: 'display_id', key: 'display_id', width: 160, fixed: 'left' },
    { title: 'gift_name', dataIndex: 'gift_name', key: 'gift_name', width: 160 },
    { title: 'ai_supported', dataIndex: 'ai_supported', key: 'ai_supported', width: 160, render: (v: boolean) => String(v) },
    { title: 'description', dataIndex: 'description', key: 'description', width: 150 },
    { title: 'items', dataIndex: 'items', key: 'items', width: 290, render: (v: string) => <span style={{ whiteSpace: 'pre-wrap' }}>{v}</span> },
    { title: 'price_jpy', dataIndex: 'price_jpy', key: 'price_jpy', width: 150 },
    { title: 'price_value_ratio', dataIndex: 'price_value_ratio', key: 'price_value_ratio', width: 190 },
    { title: 'purchase_limit_type', dataIndex: 'purchase_limit_type', key: 'purchase_limit_type', width: 180 },
    { title: 'purchase_limit_amount', dataIndex: 'purchase_limit_amount', key: 'purchase_limit_amount', width: 200 },
    { title: 'amount_to_diamond', dataIndex: 'amount_to_diamond', key: 'amount_to_diamond', width: 180 },
    { title: 'vip_points', dataIndex: 'vip_points', key: 'vip_points', width: 140 },
    { title: 'payload', dataIndex: 'payload', key: 'payload', width: 140 },
    { title: '操作', key: 'actions', width: 100, fixed: 'right', render: () => <Space><Button type="link" onClick={() => window.alert('原型：加入event')}>加入event</Button></Space> }
  ]

  const ItemTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Alert type="success" showIcon message={<span><Text>2025-07-14 09:58:27</Text> 已发布</span>} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Input.Search allowClear placeholder="搜索itemID、name、i18nkey" style={{ width: 260 }} onSearch={setSearch} />
        <Space size={12}>
          <Text style={{ fontSize: 12 }}>上次拉取时间 <Text style={{ fontSize: 12 }}>2025-06-24 08:00:14</Text></Text>
          <Button type="link" onClick={() => window.alert('原型：重新拉取')}>重新拉取</Button>
          <Button>回 退</Button>
          <Button type="primary" disabled>发 布</Button>
        </Space>
      </div>
      <Table rowKey="key" columns={itemColumns} dataSource={filteredItems} scroll={{ x: 1910 }} pagination={{ pageSize: 5 }} />
    </Space>
  )

  const GiftTab = ( 
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card >
        <Alert type="success" showIcon message={<span><Text>2025-06-30 10:26:49</Text> 已发布</span>} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Input.Search
            allowClear
            placeholder="搜索display_id、gift_name"
            style={{ width: 260 }}
            onSearch={setGiftSearch}
          />
          <Space size={12}>
            <Text style={{ fontSize: 12 }}>上次拉取时间 <Text style={{ fontSize: 12 }}>2025-08-25 08:00:03</Text></Text>
            <Button type="link" onClick={() => window.alert('原型：重新拉取')}>重新拉取</Button>
            <Button>回 退</Button>
            <Button type="primary">发 布</Button>
          </Space>
        </div>
        <Table rowKey="key" columns={giftColumns} dataSource={filteredGifts} scroll={{ x: 2200 }} pagination={{ pageSize: 5 }} />
      </Card>
    </Space>
  )
  const itemsTabs: TabsProps['items'] = [
    { key: 'item', label: '道具资源', children: ItemTab },
    { key: 'gift', label: '礼包资源', children: GiftTab }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>礼包道具</Title>
          <Space size={8} wrap>
            <Text type="secondary">礼包道具用于展示和管理CP上传的礼包、道具资源，每天会定时更新，拉取最新列表数据同步至游戏。</Text>
            <Link href="https://w.g123.jp/doc/56s85yyf5pww5o2u5pon5l2c566a5lul-bEVHpHXGZL" target="_blank" rel="noopener noreferrer"><u>查看操作文档</u></Link>
          </Space>
        </div>
      </div>
      <Tabs
        items={itemsTabs}
        tabBarExtraContent={{
          right: (
            <Button onClick={() => window.alert('原型：API 配置')}>自动化配置</Button>
          )
        }}
      />
    </div>
  )
}

