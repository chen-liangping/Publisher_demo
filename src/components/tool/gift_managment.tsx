'use client'

import React, { useMemo, useState } from 'react'
import {
  Tabs,
  Card,
  Typography,
  Space,
  Button,
  Input,
  Select,
  Table,
  Tag,
  Form
} from 'antd'
import type { TabsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SettingOutlined, DeleteOutlined } from '@ant-design/icons'

const { Title, Text, Link } = Typography

interface HeaderRow {
  key: string
  headerKey: string
  headerValue: string
}

export default function GiftManagment(): React.ReactElement {
  const [requestMethod, setRequestMethod] = useState<'POST' | 'GET' | 'PUT' | 'DELETE'>('POST')
  const [requestUrl, setRequestUrl] = useState<string>('https://broadcast-api.stg.g123.jp/external/api/v1/cp/messages/push')

  const [headers, setHeaders] = useState<HeaderRow[]>([
    { key: 'Content-Type', headerKey: 'Content-Type', headerValue: 'application/json' },
    { key: 'x-idempotency-key', headerKey: 'x-idempotency-key', headerValue: '{uuid}' },
    { key: 'Authorization', headerKey: 'Authorization', headerValue: 'Basic Z2FtZWRlbW86SGVMUW1vaUo4Y2RMalJKZ0xZMTVaMVJka2NkRnBPcDQ=' },
    { key: 'auto-new-row', headerKey: '', headerValue: '' }
  ])

  const handleDeleteHeader = (rowKey: string) => setHeaders(prev => prev.filter(h => h.key !== rowKey))
  const updateHeaderCell = (rowKey: string, field: 'headerKey' | 'headerValue', value: string) => {
    setHeaders(prev => prev.map(h => h.key === rowKey ? { ...h, [field]: value } : h))
  }
  const handleActionInfo = (label: string) => window.alert(label)

  const headerColumns: ColumnsType<HeaderRow> = useMemo(() => ([
    { title: 'Key', dataIndex: 'headerKey', key: 'headerKey', render: (_: string, r: HeaderRow) => <Input placeholder="请输入key" value={r.headerKey} onChange={(e) => updateHeaderCell(r.key, 'headerKey', e.target.value)} /> },
    { title: 'Value', dataIndex: 'headerValue', key: 'headerValue', render: (_: string, r: HeaderRow) => <Input placeholder="请输入value" value={r.headerValue} onChange={(e) => updateHeaderCell(r.key, 'headerValue', e.target.value)} /> },
    { title: '操作', key: 'actions', width: 150, render: (_: unknown, r: HeaderRow) => <Space><Button type="link" icon={<DeleteOutlined />} onClick={() => handleDeleteHeader(r.key)}>删除</Button></Space> }
  ]), [])

  const GiftTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>礼包Token</span>} extra={<Link href="https://developers.g123.jp/docs/gift" target="_blank">礼包接口文档</Link>} styles={{ body: { paddingTop: 4 } }}>
        <Space direction="vertical" size={8} style={{ display: 'flex' }}>
          <div style={{ position: 'relative' }}>
            <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
Z2FtZWRlbW86dkJnN3d********************IZkRxa2VyMFZPc2g=
            </pre>
          </div>
          <Text>提示：平台调用下方「礼包 API」地址时将携带此 Token，请在您的服务端进行鉴权处理</Text>
        </Space>
      </Card>

      <Card title={<span style={{ fontSize: 18 }}>礼包接入API</span>} extra={<Button type="primary" icon={<SettingOutlined />} onClick={() => handleActionInfo('原型：点击了编辑')}>编辑</Button>} styles={{ body: { paddingTop: 4 } }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Space direction="vertical" size={8}>
            <Text strong style={{ fontSize: 16 }}>拉取道具资源列表</Text>
            <div style={{ position: 'relative' }}>
              <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.02)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
https://gamedemo-slb.stg.g123-cpp.com/open-platform/api/v1/webhook/item
              </pre>
            </div>
            <div>
              <Text>最近更新时间&nbsp;</Text>
              <Text>2025-06-24 08:00:14</Text>
              <Text type="danger">&nbsp;更新失败&nbsp;2025-08-25 08:00:07</Text>
            </div>
            <Space size={16}>
              <Button type="link" onClick={() => handleActionInfo('原型：立即同步 道具资源列表')} style={{ marginTop: -10, marginBottom: -20 }}>立即同步</Button>
              <Button type="link" onClick={() => handleActionInfo('原型：查看道具列表')} style={{ marginTop: -10, marginBottom: -20 }}>查看道具列表</Button>
            </Space>
          </Space>

          <Space direction="vertical" size={8}>
            <Text strong style={{ fontSize: 16 }}>拉取礼包资源列表</Text>
            <div style={{ position: 'relative' }}>
              <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
https://gamedemo-slb.stg.g123-cpp.com/open-platform/api/v1/webhook/gifts
              </pre>
            </div>
            <div>
              <Text>最近更新时间&nbsp;</Text>
              <Text>2025-08-24 08:00:03</Text>
              <Text type="success">&nbsp;更新成功</Text>
            </div>
            <Space size={16}>
              <Button type="link" onClick={() => handleActionInfo('原型：立即同步 礼包资源列表')} style={{ marginTop: -10, marginBottom: -20 }}>立即同步</Button>
              <Button type="link" onClick={() => handleActionInfo('原型：查看礼包列表')} style={{ marginTop: -10, marginBottom: -20 }}>查看礼包列表</Button>
            </Space>
          </Space>

          <Space direction="vertical" size={8}>
            <Text strong style={{ fontSize: 16 }}>Popup API</Text>
            <Text>可自行配置并完成 WAF 白名单的访问控制</Text>
            <div style={{ position: 'relative' }}>
              <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
https://gamedemo-slb.stg.g123-cpp.com/open-platform/gift/popup
              </pre>
            </div>
          </Space>
        </Space>
      </Card>
    </Space>
  )

  const MessageTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>消息推送Token</span>} extra={<Link href="https://developers.g123.jp/docs/push-message" target="_blank">消息推送文档</Link>} styles={{ body: { paddingTop: 4 } }}>
        <Space direction="vertical" size={8} style={{ display: 'flex' }}>
          <div style={{ position: 'relative' }}>
            <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
Z2FtZWRlbW86SGVMUW1********************aMVJka2NkRnBPcDQ=
            </pre>
          </div>
        </Space>
      </Card>

      <Card title={<span style={{ fontSize: 18 }}>消息推送模拟</span>} styles={{ body: { paddingTop: 4 } }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Space.Compact style={{ flex: 1 }}>
              <Select value={requestMethod} onChange={(v) => setRequestMethod(v)} options={['GET','POST','PUT','DELETE'].map(m => ({ value: m, label: (<div style={{ color: m === 'POST' ? 'rgb(212, 177, 6)' : undefined, fontWeight: 700, width: 48, textAlign: 'left' }}>{m}</div>) }))} style={{ width: 96 }} />
              <Input.TextArea placeholder="请输入调用URL" value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} style={{ height: 30, maxHeight: 30 }} />
            </Space.Compact>
            <Button type="primary" onClick={() => handleActionInfo('原型：发起调用')}>发起调用</Button>
          </div>

          <Tabs size="small" items={[
            { key: 'Headers', label: 'Headers', children: (
              <Table className="table-without-footer" size="middle" rowKey="key" columns={headerColumns} dataSource={headers} pagination={false} scroll={{ x: true }} />
            ) },
            { key: 'Body', label: 'Body', children: (
              <Form layout="vertical" style={{ maxWidth: 720 }}>
                <Form.Item label="JSON Body"><Input.TextArea placeholder="请输入请求体 JSON" rows={6} /></Form.Item>
              </Form>
            ) }
          ]} />
        </Space>
      </Card>

      <Card title={<span style={{ fontSize: 18 }}>IP白名单</span>} styles={{ body: { paddingTop: 4 } }}>
        <Form layout="vertical" style={{ width: 320 }}>
          <Space direction="vertical" size={8} style={{ display: 'flex' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item style={{ flex: 1, marginBottom: 8 }}><Text id="allowIps_0">47.91.30.64/32</Text></Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item style={{ flex: 1, marginBottom: 8 }}><Text id="allowIps_1">47.74.7.56</Text></Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item style={{ flex: 1, marginBottom: 8 }}><Text id="allowIps_2">1.1.1.1/32</Text></Form.Item>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button type="primary" icon={<SettingOutlined />} onClick={() => handleActionInfo('原型：编辑白名单')}>编辑</Button>
            </div>
          </Space>
        </Form>
      </Card>
    </Space>
  )

  const ActivitiesTab = (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title={<span style={{ fontSize: 18 }}>活动Token</span>} styles={{ body: { paddingTop: 4 } }}>
        <Space direction="vertical" size={8} style={{ display: 'flex' }}>
          <div style={{ position: 'relative' }}>
            <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
vBg7wF8fchH************qker0VOsh
            </pre>
          </div>
        </Space>
      </Card>

      <Card title={<span style={{ fontSize: 18 }}>自动化上传API</span>} styles={{ body: { paddingTop: 4 } }}>
        <Space direction="vertical" size={8} style={{ display: 'flex' }}>
          <Text strong>拉取活动数据</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="blue" style={{ marginRight: 8 }}>PUT</Tag>
            <div style={{ position: 'relative', flex: 1 }}>
              <pre style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, \"Courier New\", monospace, system-ui', overflowWrap: 'anywhere' }}>
https://access-tool.g123.jp/cp/api/v1/games/gamedemo/activity
              </pre>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text>活动数据自动化流程可以通过 Open API 上传实现</Text>
            <Button type="link" onClick={() => handleActionInfo('原型：查看活动数据')}>查看活动数据</Button>
          </div>
        </Space>
      </Card>
    </Space>
  )

  const items: TabsProps['items'] = [
    { key: 'gift', label: '礼包接入', children: GiftTab },
    { key: 'message', label: '消息推送', children: MessageTab },
    { key: 'activities', label: '活动接入', children: ActivitiesTab }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>礼包推送</Title>
          <Space size={8} wrap>
            <Text type="secondary">礼包推送功能用于配置游戏的礼包发放和消息通知。支持通过API接入礼包资源，多语种推送消息，帮助游戏运营团队高效触达玩家。</Text>
            <Link href="https://w.g123.jp/doc/v2-bEVHpHXGZL" target="_blank" rel="noopener noreferrer"><u>查看操作文档</u></Link>
          </Space>
        </div>
      </div>
      <Tabs items={items} defaultActiveKey="gift" tabBarExtraContent={{ right: (<Button onClick={() => window.alert('原型：API 配置')}>API</Button>) }} />
    </div>
  )
}


