// 消息配置页面 — 平铺表格，按"告警/通知"分类
// Pod故障 支持应用级高级告警配置（右侧抽屉）
'use client'

import React, { useMemo, useState } from 'react'
import {
  Card, Space, Button, Typography, Table, Checkbox, Tag, Input,
  Modal, message, Tabs, Drawer, Switch, Select, InputNumber, Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined, SettingOutlined, PlusOutlined,
  DeleteOutlined, AppstoreOutlined
} from '@ant-design/icons'
import PlausibleLikeDashboard from '../Analytics/PlausibleLikeDashboard'

const { Text, Title } = Typography

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

type MessageNature = '告警' | '通知'

interface MessageRow {
  key: string
  messageType: string
  name: string
  nature: MessageNature
  /** 该消息类型的通知总开关 */
  enabled: boolean
  channels: Record<string, boolean>
  contacts: Record<string, boolean>
  /** 是否支持应用级高级配置（目前只有 PodFailed） */
  hasAdvancedConfig?: boolean
}

/** 应用级告警配置项 */
interface AppAlertConfig {
  id: string
  appName: string
  channel: string
  frequency: string
  enabled: boolean
}

const allMessageTypes: { key: string; messageType: string; name: string; nature: MessageNature; hasAdvancedConfig?: boolean }[] = [
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
  // Pod故障：支持应用级高级配置
  { key: 'PodFailed', messageType: 'PodFailed', name: 'Pod故障', nature: '告警', hasAdvancedConfig: true },
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

/* 可选应用列表（告警配置抽屉中使用） */
const availableApps = [
  'open-platform', 'game-server', 'health', 'cpgame',
  'xcron-cloud', 'kumo游服', 'center-server', 'flashlaunch'
]

const frequencyOptions = [
  { label: '1 分钟', value: '1 分钟' },
  { label: '5 分钟', value: '5 分钟' },
  { label: '15 分钟', value: '15 分钟' },
  { label: '30 分钟', value: '30 分钟' },
  { label: '1 小时', value: '1 小时' },
  { label: '6 小时', value: '6 小时' },
  { label: '12 小时', value: '12 小时' },
  { label: '24 小时', value: '24 小时' }
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
      enabled: false,
      channels: Object.fromEntries(webhooks.map(w => [w.id, false])),
      contacts: Object.fromEntries(people.map(p => [p.id, false])),
      hasAdvancedConfig: t.hasAdvancedConfig
    }))
  )

  const [activeTab, setActiveTab] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  /* ---- Pod故障 应用级高级配置 ---- */
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [configDrawerTitle, setConfigDrawerTitle] = useState('')
  const [appAlertConfigs, setAppAlertConfigs] = useState<AppAlertConfig[]>([
    { id: '1', appName: 'open-platform', channel: '钉钉大群消息', frequency: '1 小时', enabled: false },
    { id: '2', appName: 'health', channel: '钉钉大群消息', frequency: '5 分钟', enabled: true },
    { id: '3', appName: 'cpgame', channel: '钉钉大群消息', frequency: '5 分钟', enabled: true }
  ])

  // 切换某行通知总开关；Pod故障开启时自动打开配置抽屉
  const toggleRowEnabled = (rowKey: string) => {
    setRows(prev => {
      const row = prev.find(r => r.key === rowKey)
      if (!row) return prev
      const nextEnabled = !row.enabled
      // Pod故障：开启时自动打开抽屉
      if (nextEnabled && row.hasAdvancedConfig) {
        setConfigDrawerTitle(row.name)
        setConfigDrawerOpen(true)
      }
      return prev.map(r => r.key === rowKey ? { ...r, enabled: nextEnabled } : r)
    })
  }

  // 手动打开高级配置抽屉
  const openAdvancedConfig = (row: MessageRow) => {
    setConfigDrawerTitle(row.name)
    setConfigDrawerOpen(true)
  }

  // 添加告警应用
  const addAppConfig = () => {
    const usedApps = new Set(appAlertConfigs.map(c => c.appName))
    const available = availableApps.filter(a => !usedApps.has(a))
    if (available.length === 0) {
      message.warning('所有应用已添加')
      return
    }
    setAppAlertConfigs(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        appName: available[0],
        channel: '钉钉大群消息',
        frequency: '5 分钟',
        enabled: true
      }
    ])
  }

  // 删除告警应用
  const removeAppConfig = (id: string) => {
    setAppAlertConfigs(prev => prev.filter(c => c.id !== id))
    message.success('已删除')
  }

  // 切换告警应用开关
  const toggleAppEnabled = (id: string) => {
    setAppAlertConfigs(prev => prev.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ))
  }

  // 更新告警应用字段
  const updateAppConfig = (id: string, field: keyof AppAlertConfig, value: string) => {
    setAppAlertConfigs(prev => prev.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  // 应用级配置表格列
  const appConfigColumns: ColumnsType<AppAlertConfig> = [
    {
      title: '应用名称',
      dataIndex: 'appName',
      key: 'appName',
      width: 200,
      render: (val: string, record: AppAlertConfig) => {
        const usedApps = new Set(appAlertConfigs.filter(c => c.id !== record.id).map(c => c.appName))
        return (
          <Select
            value={val}
            onChange={v => updateAppConfig(record.id, 'appName', v)}
            style={{ width: '100%' }}
          >
            {availableApps.map(app => (
              <Select.Option key={app} value={app} disabled={usedApps.has(app)}>
                <Space>
                  <AppstoreOutlined style={{ color: '#8c8c8c' }} />
                  {app}
                </Space>
              </Select.Option>
            ))}
          </Select>
        )
      }
    },
    {
      title: '通知渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 160,
      render: () => <Text>钉钉大群消息</Text>
    },
    {
      title: '报警频率',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 140,
      render: (val: string, record: AppAlertConfig) => (
        <Select
          value={val}
          onChange={v => updateAppConfig(record.id, 'frequency', v)}
          style={{ width: 120 }}
          options={frequencyOptions}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: AppAlertConfig) => (
        <Space size={12}>
          <Switch
            checked={record.enabled}
            onChange={() => toggleAppEnabled(record.id)}
            checkedChildren="ON"
            unCheckedChildren="OFF"
            style={{ minWidth: 50 }}
          />
          <Button
            type="link"
            danger
            style={{ padding: 0 }}
            onClick={() => removeAppConfig(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  /* ---- 主表格逻辑 ---- */

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

  const toggleContact = (rowKey: string, personId: string) => {
    setRows(prev => prev.map(r =>
      r.key === rowKey
        ? { ...r, contacts: { ...r.contacts, [personId]: !r.contacts[personId] } }
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

  const columns: ColumnsType<MessageRow> = useMemo(() => [
    {
      title: '通知',
      key: 'enabled',
      width: 70,
      fixed: 'left',
      render: (_: unknown, row: MessageRow) => (
        <Switch
          checked={row.enabled}
          onChange={() => toggleRowEnabled(row.key)}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          style={{ minWidth: 50 }}
        />
      )
    },
    {
      title: 'MessageType消息类型',
      key: 'messageType',
      width: 240,
      render: (_: unknown, row: MessageRow) => (
        <Text style={{ fontSize: 13, color: row.enabled ? undefined : '#bfbfbf' }}>{row.messageType}</Text>
      )
    },
    {
      title: '含义',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string, row: MessageRow) => (
        <Space>
          <Text style={{ fontSize: 13, color: row.enabled ? undefined : '#bfbfbf' }}>{text}</Text>
          {/* Pod故障：开启时可配置，关闭时按钮置灰 */}
          {row.hasAdvancedConfig && (
            <Tooltip title={row.enabled ? '告警应用配置' : '请先开启通知'}>
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                disabled={!row.enabled}
                onClick={() => openAdvancedConfig(row)}
                style={{ padding: 0, fontSize: 13 }}
              >
                配置
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '性质',
      dataIndex: 'nature',
      key: 'nature',
      width: 80,
      render: (nature: MessageNature, row: MessageRow) => (
        <Tag
          style={{
            borderRadius: 999, border: 0, fontSize: 12,
            lineHeight: '22px', padding: '0 10px',
            background: nature === '告警'
              ? (row.enabled ? 'rgba(255,77,79,0.08)' : 'rgba(0,0,0,0.02)')
              : (row.enabled ? 'rgba(22,119,255,0.08)' : 'rgba(0,0,0,0.02)'),
            color: row.enabled
              ? (nature === '告警' ? '#ff4d4f' : '#1677ff')
              : '#bfbfbf'
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
        <Space direction="vertical" size={2} style={{ opacity: row.enabled ? 1 : 0.35 }}>
          {webhooks.map(w => (
            <Checkbox
              key={w.id}
              checked={row.channels[w.id] || false}
              disabled={!row.enabled}
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
        <Space direction="vertical" size={2} style={{ opacity: row.enabled ? 1 : 0.35 }}>
          {people.map(p => (
            <Checkbox
              key={p.id}
              checked={row.contacts[p.id] || false}
              disabled={!row.enabled}
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

        <Table<MessageRow>
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          pagination={false}
          scroll={{ x: 1120 }}
          rowSelection={{ selectedRowKeys, onChange: keys => setSelectedRowKeys(keys) }}
          size="middle"
        />
      </Card>

      {/* Pod故障 — 应用级高级告警配置抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <Text strong style={{ fontSize: 16 }}>{configDrawerTitle}</Text>
            </Space>
            <Button icon={<SettingOutlined />} onClick={() => message.info('全局设置')}>设置</Button>
          </div>
        }
        width={720}
        placement="right"
        onClose={() => setConfigDrawerOpen(false)}
        open={configDrawerOpen}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Table<AppAlertConfig>
          rowKey="id"
          columns={appConfigColumns}
          dataSource={appAlertConfigs}
          pagination={false}
          size="middle"
          style={{ marginBottom: 16 }}
        />
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={addAppConfig}
          style={{ borderRadius: 8, height: 40 }}
        >
          添加应用
        </Button>
      </Drawer>

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
