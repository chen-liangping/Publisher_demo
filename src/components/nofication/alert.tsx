// 消息配置页面 — 平铺表格，按"告警/通知"分类
// Pod故障 支持应用级高级告警配置（右侧抽屉）
// 联系人由人员配置的「所属渠道」决定，此处仅展示每个渠道会 @ 谁
'use client'

import React, { useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Card, Space, Button, Typography, Table, Checkbox, Tag, Input,
  Modal, message, Tabs, Drawer, Switch, Select, Tooltip
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

// 与人员配置一致：channelIds 表示该人员所属接收渠道
interface Person {
  id: string
  name: string
  channelIds: string[]
}

type MessageNature = '告警' | '通知'

interface MessageRow {
  key: string
  messageType: string
  name: string
  nature: MessageNature
  channels: Record<string, boolean>
  /** 是否支持应用级高级配置（目前只有 PodFailed） */
  hasAdvancedConfig?: boolean
}

/** 是否已开启通知：有任一看接收渠道被勾选即为开启 */
const isRowEnabled = (row: MessageRow): boolean =>
  Object.values(row.channels).some(Boolean)

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const webhooks: WebhookItem[] = props.webhooks ?? [
    { id: 'cp_group', name: 'CP群', url: 'https://oapi.dingtalk.com/robot/send?access_token=demo' },
    { id: 'xiaobao', name: '小包', url: 'https://oapi.dingtalk.com/robot/send?access_token=demo-xb' }
  ]

  // 默认选中的接收渠道：小包（若存在）
  const defaultChannelId = webhooks.find(w => w.name === '小包')?.id ?? webhooks[0]?.id

  // 模拟人员及所属渠道（与人员配置一致；实际应从同一数据源获取）
  const people: Person[] = useMemo(() => {
    const xiaobaoId = webhooks.find(w => w.name === '小包')?.id
    const cpId = webhooks.find(w => w.name === 'CP群')?.id ?? webhooks[0]?.id
    return [
      { id: 'yu.b', name: 'yu.b', channelIds: cpId && xiaobaoId ? [cpId, xiaobaoId] : webhooks.map(w => w.id) },
      { id: 'xuyin', name: '刘悦', channelIds: xiaobaoId ? [xiaobaoId] : [] }
    ]
  }, [webhooks])

  // 根据 channelId 获取该渠道下的联系人（在人员配置中属于该渠道的人员）
  const getContactsForChannel = (channelId: string): Person[] =>
    people.filter(p => p.channelIds.includes(channelId))

  const [rows, setRows] = useState<MessageRow[]>(() =>
    allMessageTypes.map(t => ({
      key: t.key,
      messageType: t.messageType,
      name: t.name,
      nature: t.nature,
      channels: Object.fromEntries(webhooks.map(w => [w.id, false])),
      hasAdvancedConfig: t.hasAdvancedConfig
    }))
  )

  const [activeTab, setActiveTab] = useState<('告警' | '通知')>('告警')
  const [searchText, setSearchText] = useState('')
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchModifyModalOpen, setBatchModifyModalOpen] = useState(false)

  /* ---- Pod故障 应用级高级配置 ---- */
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [configDrawerTitle, setConfigDrawerTitle] = useState('')
  const [appAlertConfigs, setAppAlertConfigs] = useState<AppAlertConfig[]>([
    { id: '1', appName: 'open-platform', channel: '钉钉大群消息', frequency: '1 小时', enabled: false },
    { id: '2', appName: 'health', channel: '钉钉大群消息', frequency: '5 分钟', enabled: true },
    { id: '3', appName: 'cpgame', channel: '钉钉大群消息', frequency: '5 分钟', enabled: true }
  ])

  // 切换接收渠道；首次勾选时：接收渠道默认选小包
  const toggleChannel = (rowKey: string, channelId: string) => {
    setRows(prev => {
      const row = prev.find(r => r.key === rowKey)
      if (!row) return prev
      const wasEnabled = Object.values(row.channels).some(Boolean)
      const willBeChecked = !(row.channels[channelId] || false)
      return prev.map(r => {
        if (r.key !== rowKey) return r
        const nextChannels = { ...r.channels, [channelId]: willBeChecked }
        // 首次开启（从无到有勾选）：接收渠道默认选小包
        const isFirstEnable = !wasEnabled && willBeChecked
        if (isFirstEnable) {
          if (row.hasAdvancedConfig) {
            setConfigDrawerTitle(row.name)
            setConfigDrawerOpen(true)
          }
          return {
            ...r,
            channels: Object.fromEntries(webhooks.map(w => [w.id, w.id === defaultChannelId]))
          }
        }
        return { ...r, channels: nextChannels }
      })
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
    let result = rows.filter(r => r.nature === activeTab)
    if (searchText) {
      const s = searchText.toLowerCase()
      result = result.filter(r =>
        r.name.toLowerCase().includes(s) ||
        r.messageType.toLowerCase().includes(s)
      )
    }
    return result
  }, [rows, activeTab, searchText])

  const batchModify = () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择需要修改的消息类型'); return }
    setBatchModifyModalOpen(true)
  }

  const confirmBatchModify = () => {
    const keySet = new Set(selectedRowKeys as string[])
    setRows(prev => prev.map(r =>
      keySet.has(r.key)
        ? { ...r, channels: Object.fromEntries(webhooks.map(w => [w.id, true])) }
        : r
    ))
    setSelectedRowKeys([])
    setBatchModifyModalOpen(false)
    message.success('批量修改完成')
  }

  // 前往人员配置（维护联系人与渠道的归属关系）
  const goToPeopleConfig = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('menu', 'people-config')
    params.set('tab', 'people')
    router.push(`${pathname}?${params.toString()}`)
  }

  const columns: ColumnsType<MessageRow> = useMemo(() => [
    {
      title: '含义',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string, row: MessageRow) => (
        <Space>
          <Text style={{ fontSize: 13, color: isRowEnabled(row) ? undefined : '#bfbfbf' }}>{text}</Text>
          {/* Pod故障：开启时可配置，关闭时按钮置灰 */}
          {row.hasAdvancedConfig && (
            <Tooltip title={isRowEnabled(row) ? '告警应用配置' : '请先勾选接收渠道'}>
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                disabled={!isRowEnabled(row)}
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
      title: (
        <Space>
          <span>接收渠道</span>
          <Tooltip title="联系人在人员配置中维护，发到该渠道时会 @ 所属的联系人">
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 12, height: 'auto' }}
              onClick={goToPeopleConfig}
            >
              维护联系人
            </Button>
          </Tooltip>
        </Space>
      ),
      key: 'channels',
      width: 220,
      render: (_: unknown, row: MessageRow) => (
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {webhooks.map(w => {
            const contacts = getContactsForChannel(w.id)
            return (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: row.channels[w.id] ? '#f0f7ff' : '#fafafa',
                  borderRadius: 8,
                  border: `1px solid ${row.channels[w.id] ? '#bae0ff' : '#f0f0f0'}`
                }}
              >
                <Checkbox
                  checked={row.channels[w.id] || false}
                  onChange={() => toggleChannel(row.key, w.id)}
                >
                  <Text strong style={{ fontSize: 13 }}>{w.name}</Text>
                </Checkbox>
                <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                {contacts.length > 0 ? (
                  <Space size={2} wrap style={{ flex: 1, minWidth: 0 }}>
                    {contacts.map(p => (
                      <Tag key={p.id} style={{ margin: 0, borderRadius: 999, fontSize: 12 }}>
                        @{p.name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无</Text>
                )}
              </div>
            )
          })}
        </Space>
      )
    }
  ], [webhooks, people, rows])

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as '告警' | '通知')}
          items={[
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
          scroll={{ x: 560 }}
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

      {/* 批量修改二次确认 */}
      <Modal
        title={`批量开启 ${selectedRowKeys.length} 项`}
        open={batchModifyModalOpen}
        onCancel={() => setBatchModifyModalOpen(false)}
        onOk={confirmBatchModify}
        okText="确认"
        cancelText="取消"
      >
        <p>将为选中的消息类型开启所有接收渠道</p>
      </Modal>

    </Space>
  )
}
