// 消息配置页面 — 平铺表格，按"告警/通知"分类
'use client'

import React, { useMemo, useState } from 'react'
import {
  Card, Space, Button, Typography, Table, Checkbox, Tag, Input,
  Modal, message, Tabs, Drawer
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'
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

/** 性质：告警 或 通知 */
type MessageNature = '告警' | '通知'

/** 平铺后的每一行 */
interface MessageRow {
  key: string
  /** MessageType 标识 */
  messageType: string
  /** 中文含义 */
  name: string
  /** 性质 */
  nature: MessageNature
  /** 各接收渠道开关 */
  channels: Record<string, boolean>
  /** 各联系人开关 */
  contacts: Record<string, boolean>
}

/* 完整消息类型列表，按性质分为"告警"和"通知" */
const allMessageTypes: { key: string; messageType: string; name: string; nature: MessageNature }[] = [
  { key: 'CheckStatusFailed', messageType: 'CheckStatusFailed', name: 'pod健康检查失败', nature: '告警' },
  { key: 'AutoLaunchSuccess', messageType: 'AutoLaunchSuccess', name: '自动开服成功', nature: '通知' },
  { key: 'AutoLaunchFailed', messageType: 'AutoLaunchFailed', name: '自动开服失败', nature: '告警' },
  { key: 'NewServerFailed', messageType: 'NewServerFailed', name: '通知CP新预备服失败', nature: '告警' },
  { key: 'NewServerDeployFailed', messageType: 'NewServerDeployFailed', name: '预备服部署失败', nature: '告警' },
  { key: 'GetExecutionPlanFailed', messageType: 'GetExecutionPlanFailed', name: '自动开服执行计划获取失败', nature: '告警' },
  { key: 'DeploySubmit', messageType: 'DeploySubmit', name: '服务端部署', nature: '通知' },
  { key: 'DeployFinish', messageType: 'DeployFinish', name: '服务端部署完成', nature: '通知' },
  { key: 'CanaryDeployRollback', messageType: 'CanaryDeployRollback', name: '灰度回滚', nature: '通知' },
  { key: 'CanaryDeployRollbackFinish', messageType: 'CanaryDeployRollbackFinish', name: '灰度回滚完成', nature: '通知' },
  { key: 'CanaryDeployMore', messageType: 'CanaryDeployMore', name: '追加灰度', nature: '通知' },
  { key: 'CanaryContinuousDeploy', messageType: 'CanaryContinuousDeploy', name: '灰度追加完成', nature: '通知' },
  { key: 'CanaryDeployAll', messageType: 'CanaryDeployAll', name: '灰度全量部署', nature: '通知' },
  { key: 'ClientRelease', messageType: 'ClientRelease', name: '客户端创建新版本', nature: '通知' },
  { key: 'CalculateFailedMsg', messageType: 'CalculateFailedMsg', name: 'flashlaunch静态资源计算阻塞', nature: '告警' },
  { key: 'LimitUserChange', messageType: 'LimitUserChange', name: '自动开服策略变更', nature: '通知' },
  { key: 'PodFailed', messageType: 'PodFailed', name: 'Pod故障', nature: '告警' },
  { key: 'PodUpdatingAlert', messageType: 'PodUpdatingAlert', name: 'Pod更新异常', nature: '告警' },
  { key: 'TranslateSyncCDNFailed', messageType: 'TranslateSyncCDNFailed', name: '翻译文本同步CDN失败', nature: '告警' },
  { key: 'S3ZIPExtractFailure', messageType: 'S3ZIPExtractFailure', name: 'S3 zip解压失败', nature: '告警' },
  { key: 'S3ZIPExtractSuccess', messageType: 'S3ZIPExtractSuccess', name: 'S3 zip解压成功', nature: '通知' },
  { key: 'ReleasedVersionUpdated', messageType: 'ReleasedVersionUpdated', name: '客户端版本切换', nature: '通知' },
  { key: 'OssResourceChange', messageType: 'OssResourceChange', name: 'oss配置文件变更', nature: '通知' },
  { key: 'CDNDeployMsg', messageType: 'CDNDeployMsg', name: 'CDN 部署', nature: '通知' },
  { key: 'HPAOpen', messageType: 'HPAOpen', name: '开启HPA', nature: '通知' },
  { key: 'HPAClose', messageType: 'HPAClose', name: '关闭HPA', nature: '通知' },
  { key: 'HPAUpdate', messageType: 'HPAUpdate', name: '更新HPA', nature: '通知' }
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

  const [rows, setRows] = useState<MessageRow[]>(() =>
    allMessageTypes.map(t => ({
      key: t.key,
      messageType: t.messageType,
      name: t.name,
      nature: t.nature,
      channels: Object.fromEntries(webhooks.map(w => [w.id, false])),
      contacts: Object.fromEntries(people.map(p => [p.id, false]))
    }))
  )

  const [activeTab, setActiveTab] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const filteredRows = useMemo(() => {
    let result = rows
    if (activeTab === '告警') result = result.filter(r => r.nature === '告警')
    else if (activeTab === '通知') result = result.filter(r => r.nature === '通知')
    if (searchText) {
      const s = searchText.toLowerCase()
      result = result.filter(r =>
        r.name.toLowerCase().includes(s) ||
        r.messageType.toLowerCase().includes(s)
      )
    }
    return result
  }, [rows, activeTab, searchText])

  const toggleChannel = (rowKey: string, channelId: string) => {
    setRows(prev => prev.map(r =>
      r.key === rowKey
        ? { ...r, channels: { ...r.channels, [channelId]: !r.channels[channelId] } }
        : r
    ))
  }

  const batchModify = () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择需要修改的消息类型'); return }
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

  // 联系人开关切换（与接收渠道一样，直接 checkbox 操作）
  const toggleContact = (rowKey: string, personId: string) => {
    setRows(prev => prev.map(r =>
      r.key === rowKey
        ? { ...r, contacts: { ...r.contacts, [personId]: !r.contacts[personId] } }
        : r
    ))
  }

  const columns: ColumnsType<MessageRow> = useMemo(() => [
    {
      title: 'MessageType消息类型',
      key: 'messageType',
      width: 240,
      fixed: 'left',
      render: (_: unknown, row: MessageRow) => (
        <Text style={{ fontSize: 13 }}>{row.messageType}</Text>
      )
    },
    {
      title: '含义',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string) => <Text style={{ fontSize: 13 }}>{text}</Text>
    },
    {
      title: '性质',
      dataIndex: 'nature',
      key: 'nature',
      width: 80,
      render: (nature: MessageNature) => (
        <Tag
          style={{
            borderRadius: 999,
            border: 0,
            fontSize: 12,
            lineHeight: '22px',
            padding: '0 10px',
            background: nature === '告警' ? 'rgba(255,77,79,0.08)' : 'rgba(22,119,255,0.08)',
            color: nature === '告警' ? '#ff4d4f' : '#1677ff'
          }}
        >
          {nature}
        </Tag>
      )
    },
    {
      title: '接收渠道',
      key: 'channels',
      width: 160,
      render: (_: unknown, row: MessageRow) => (
        <Space direction="vertical" size={2}>
          {webhooks.map(w => (
            <Checkbox
              key={w.id}
              checked={row.channels[w.id] || false}
              onChange={() => toggleChannel(row.key, w.id)}
            >
              <Text style={{ fontSize: 13 }}>{w.name}</Text>
            </Checkbox>
          ))}
        </Space>
      )
    },
    {
      title: '联系人',
      key: 'contacts',
      width: 200,
      render: (_: unknown, row: MessageRow) => (
        <Space direction="vertical" size={2}>
          {people.map(p => (
            <Checkbox
              key={p.id}
              checked={row.contacts[p.id] || false}
              onChange={() => toggleContact(row.key, p.id)}
            >
              <Text style={{ fontSize: 13 }}>{p.name}</Text>
            </Checkbox>
          ))}
        </Space>
      )
    }
  ], [webhooks, people, rows])

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card>
        {/* Tab：全部 / 告警 / 通知 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: '告警', label: '告警' },
            { key: '通知', label: '通知' }
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* 工具栏 */}
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

        {/* 表格 */}
        <Table<MessageRow>
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          pagination={false}
          scroll={{ x: 1050 }}
          rowSelection={{ selectedRowKeys, onChange: keys => setSelectedRowKeys(keys) }}
          size="middle"
        />
      </Card>

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
