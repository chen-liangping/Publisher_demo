// 消息配置页面 — 平铺表格样式，参考阿里云"基本接收管理"
'use client'

import React, { useMemo, useState } from 'react'
import {
  Card, Space, Button, Typography, Table, Checkbox, Tag, Input,
  Modal, message, Tabs, Drawer, Form, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, EditOutlined } from '@ant-design/icons'
import PlausibleLikeDashboard from '../Analytics/PlausibleLikeDashboard'

const { Text } = Typography

/* ==============================
   数据定义
   ============================== */

interface WebhookItem {
  id: string
  name: string
  url: string
  secret?: string
}

interface Person {
  id: string
  name: string
}

/** 消息类型分组 */
type MessageCategory = '告警' | '自动开服' | '静态资源与CDN' | '运行时健康' | '客户端版本' | '配置变更' | '发布过程'

/** 平铺后的每一行 */
interface MessageRow {
  key: string
  name: string
  category: MessageCategory
  /** 各接收渠道的开关状态，key = 渠道 id */
  channels: Record<string, boolean>
  /** 各联系人的开关状态，key = 人员 id */
  contacts: Record<string, boolean>
}

/* 所有消息类型（平铺，同级） */
const allMessageTypes: { key: string; name: string; category: MessageCategory }[] = [
  // 告警 - 自动开服
  { key: 'autoOpenServerSuccess', name: '自动开服成功', category: '自动开服' },
  { key: 'autoOpenServerFail', name: '自动开服失败', category: '自动开服' },
  { key: 'notifyCPFail', name: '通知CP新预备服失败', category: '自动开服' },
  { key: 'prepareDeployFail', name: '预备服部署失败', category: '自动开服' },
  { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败', category: '自动开服' },
  // 告警 - 静态资源与CDN
  { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败', category: '静态资源与CDN' },
  { key: 's3UnzipFail', name: 'S3 zip解压失败', category: '静态资源与CDN' },
  { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞', category: '静态资源与CDN' },
  { key: 'CDNDeployFail', name: 'CDN部署失败', category: '静态资源与CDN' },
  { key: 'CDNDeploySuccess', name: 'CDN部署成功', category: '静态资源与CDN' },
  // 告警 - 运行时健康
  { key: 'podHealthCheckFail', name: 'pod健康检查失败', category: '运行时健康' },
  { key: 'podFailure', name: 'Pod故障', category: '运行时健康' },
  { key: 'podUpdateAbnormal', name: 'Pod更新异常', category: '运行时健康' },
  // 通知 - 客户端版本
  { key: 'clientNewVersion', name: '客户端创建新版本', category: '客户端版本' },
  { key: 'clientVersionSwitch', name: '客户端版本切换', category: '客户端版本' },
  { key: 's3UnzipSuccess', name: 'S3 zip解压成功', category: '客户端版本' },
  // 通知 - 配置变更
  { key: 'ossConfigChange', name: 'oss配置文件变更', category: '配置变更' },
  { key: 'autoOpenPolicyChange', name: '自动开服策略变更', category: '配置变更' },
  // 通知 - 发布过程
  { key: 'serverDeployFail', name: '服务端部署失败', category: '发布过程' },
  { key: 'serverDeploySuccess', name: '服务端部署成功', category: '发布过程' },
  { key: 'grayRollback', name: '灰度回滚', category: '发布过程' },
  { key: 'grayRollbackDone', name: '灰度回滚完成', category: '发布过程' },
  { key: 'grayAppend', name: '追加灰度', category: '发布过程' },
  { key: 'grayAppendDone', name: '灰度追加完成', category: '发布过程' },
  { key: 'grayFullDeploy', name: '灰度全量部署', category: '发布过程' }
]

/* 分组对应的颜色 */
const categoryColor: Record<string, string> = {
  '自动开服': '#fa8c16',
  '静态资源与CDN': '#1677ff',
  '运行时健康': '#ff4d4f',
  '客户端版本': '#52c41a',
  '配置变更': '#722ed1',
  '发布过程': '#13c2c2'
}

/* Tab 分类 */
const categoryTabs = [
  { key: 'all', label: '全部' },
  { key: '自动开服', label: '自动开服' },
  { key: '静态资源与CDN', label: '静态资源与CDN' },
  { key: '运行时健康', label: '运行时健康' },
  { key: '客户端版本', label: '客户端版本' },
  { key: '配置变更', label: '配置变更' },
  { key: '发布过程', label: '发布过程' }
]

/* ==============================
   主组件
   ============================== */

interface AlertPageProps {
  webhooks?: WebhookItem[]
}

export default function AlertPage(props: AlertPageProps): React.ReactElement {
  const webhooks: WebhookItem[] = props.webhooks ?? [
    { id: 'cp_group', name: 'CP群', url: 'https://oapi.dingtalk.com/robot/send?access_token=demo' }
  ]

  const people: Person[] = [
    { id: 'yu.b', name: 'yu.b' },
    { id: 'xuyin', name: '刘悦' }
  ]

  // 初始化行数据：所有渠道和联系人默认关闭
  const [rows, setRows] = useState<MessageRow[]>(() =>
    allMessageTypes.map(t => ({
      key: t.key,
      name: t.name,
      category: t.category,
      channels: Object.fromEntries(webhooks.map(w => [w.id, false])),
      contacts: Object.fromEntries(people.map(p => [p.id, false]))
    }))
  )

  const [activeTab, setActiveTab] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<MessageRow | null>(null)
  const [editForm] = Form.useForm()
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  /* 过滤 */
  const filteredRows = useMemo(() => {
    let result = rows
    if (activeTab !== 'all') {
      result = result.filter(r => r.category === activeTab)
    }
    if (searchText) {
      const s = searchText.toLowerCase()
      result = result.filter(r => r.name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s))
    }
    return result
  }, [rows, activeTab, searchText])

  /* 渠道开关切换 */
  const toggleChannel = (rowKey: string, channelId: string) => {
    setRows(prev => prev.map(r =>
      r.key === rowKey
        ? { ...r, channels: { ...r.channels, [channelId]: !r.channels[channelId] } }
        : r
    ))
  }

  /* 打开编辑弹窗 */
  const openEdit = (row: MessageRow) => {
    setEditingRow(row)
    editForm.setFieldsValue({
      channels: Object.entries(row.channels).filter(([, v]) => v).map(([k]) => k),
      contacts: Object.entries(row.contacts).filter(([, v]) => v).map(([k]) => k)
    })
    setEditModalOpen(true)
  }

  /* 保存编辑 */
  const saveEdit = () => {
    if (!editingRow) return
    const values = editForm.getFieldsValue()
    const channelSet = new Set(values.channels || [])
    const contactSet = new Set(values.contacts || [])
    setRows(prev => prev.map(r =>
      r.key === editingRow.key
        ? {
            ...r,
            channels: Object.fromEntries(webhooks.map(w => [w.id, channelSet.has(w.id)])),
            contacts: Object.fromEntries(people.map(p => [p.id, contactSet.has(p.id)]))
          }
        : r
    ))
    setEditModalOpen(false)
    message.success('配置已更新')
  }

  /* 批量修改 */
  const batchModify = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择需要修改的消息类型')
      return
    }
    Modal.confirm({
      title: `批量开启 ${selectedRowKeys.length} 项`,
      content: '将为选中的消息类型开启所有接收渠道',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        const keySet = new Set(selectedRowKeys as string[])
        setRows(prev => prev.map(r =>
          keySet.has(r.key)
            ? { ...r, channels: Object.fromEntries(webhooks.map(w => [w.id, true])) }
            : r
        ))
        setSelectedRowKeys([])
        message.success('批量修改完成')
      }
    })
  }

  /* 恢复默认 */
  const resetDefaults = () => {
    Modal.confirm({
      title: '恢复默认设置',
      content: '将清空所有接收渠道和联系人配置，是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setRows(prev => prev.map(r => ({
          ...r,
          channels: Object.fromEntries(webhooks.map(w => [w.id, false])),
          contacts: Object.fromEntries(people.map(p => [p.id, false]))
        })))
        message.success('已恢复默认')
      }
    })
  }

  /* 联系人状态渲染 */
  const renderContactStatus = (row: MessageRow, person: Person) => {
    const channelOn = Object.values(row.channels).some(v => v)
    const contactOn = row.contacts[person.id]
    if (!channelOn) {
      return <Text type="secondary" style={{ fontSize: 12 }}>未开启</Text>
    }
    if (contactOn) {
      return <Tag color="blue" style={{ borderRadius: 999, border: 0, fontSize: 12 }}>{person.name}</Tag>
    }
    return <Text type="secondary" style={{ fontSize: 12 }}>未开启</Text>
  }

  /* 表格列 */
  const columns: ColumnsType<MessageRow> = useMemo(() => {
    const cols: ColumnsType<MessageRow> = [
      {
        title: '消息类型',
        key: 'name',
        width: 280,
        fixed: 'left',
        render: (_: unknown, row: MessageRow) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: 500 }}>{row.name}</Text>
            <Tag
              color={categoryColor[row.category] || '#8c8c8c'}
              style={{ borderRadius: 999, border: 0, fontSize: 11, lineHeight: '18px', padding: '0 8px' }}
            >
              {row.category}
            </Tag>
          </div>
        )
      },
      {
        title: '接收渠道',
        key: 'channels',
        width: 200,
        render: (_: unknown, row: MessageRow) => (
          <Space direction="vertical" size={4}>
            {webhooks.map(w => (
              <Checkbox
                key={w.id}
                checked={row.channels[w.id] || false}
                onChange={() => toggleChannel(row.key, w.id)}
              >
                {w.name}
              </Checkbox>
            ))}
          </Space>
        )
      },
      {
        title: '联系人',
        key: 'contacts',
        width: 260,
        render: (_: unknown, row: MessageRow) => (
          <Space direction="vertical" size={4}>
            {people.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, minWidth: 50 }}>{p.name}：</Text>
                {renderContactStatus(row, p)}
              </div>
            ))}
          </Space>
        )
      },
      {
        title: '操作',
        key: 'action',
        width: 140,
        fixed: 'right',
        render: (_: unknown, row: MessageRow) => (
          <Space>
            <Button type="link" style={{ padding: 0 }} onClick={() => openEdit(row)}>修改</Button>
            <Button type="link" style={{ padding: 0, color: '#8c8c8c' }}>修订记录</Button>
          </Space>
        )
      }
    ]
    return cols
  }, [webhooks, people, rows])

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card>
        {/* Tab 分类过滤 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={categoryTabs}
          style={{ marginBottom: 16 }}
        />

        {/* 工具栏：批量操作 + 搜索 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Checkbox
              indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredRows.length}
              checked={selectedRowKeys.length === filteredRows.length && filteredRows.length > 0}
              onChange={e => setSelectedRowKeys(e.target.checked ? filteredRows.map(r => r.key) : [])}
            />
            <Button size="small" disabled={selectedRowKeys.length === 0} onClick={batchModify}>批量修改</Button>
            <Button size="small" onClick={resetDefaults}>恢复默认设置</Button>
          </Space>
          <Input
            placeholder="请输入消息类型"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
        </div>

        {/* 平铺表格 */}
        <Table<MessageRow>
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          pagination={false}
          scroll={{ x: 900 }}
          rowSelection={{
            selectedRowKeys,
            onChange: keys => setSelectedRowKeys(keys)
          }}
          size="middle"
        />
      </Card>

      {/* 修改弹窗 */}
      <Modal
        title={editingRow ? `修改 — ${editingRow.name}` : '修改'}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={saveEdit}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={480}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="channels" label="接收渠道">
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size={8}>
                {webhooks.map(w => (
                  <Checkbox key={w.id} value={w.id}>{w.name}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="contacts" label="联系人">
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size={8}>
                {people.map(p => (
                  <Checkbox key={p.id} value={p.id}>{p.name}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据看板 */}
      <Drawer
        title="埋点数据仪表盘"
        placement="left"
        width="100%"
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        destroyOnClose
      >
        <PlausibleLikeDashboard />
      </Drawer>
    </Space>
  )
}
