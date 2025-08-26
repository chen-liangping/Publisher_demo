'use client'

import React, { useMemo, useState } from 'react'
import { Card, Typography, Space, Button, Input, Select, Table, Form } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SettingOutlined, DeleteOutlined } from '@ant-design/icons'

const { Title, Text, Link } = Typography

interface HeaderRow {
  key: string
  headerKey: string
  headerValue: string
}

export default function MessagePush(): React.ReactElement {
  const [requestMethod, setRequestMethod] = useState<'POST' | 'GET' | 'PUT' | 'DELETE'>('POST')
  const [requestUrl, setRequestUrl] = useState<string>('https://broadcast-api.stg.g123.jp/external/api/v1/cp/messages/push')

  const [headers, setHeaders] = useState<HeaderRow[]>([
    { key: 'Content-Type', headerKey: 'Content-Type', headerValue: 'application/json' },
    { key: 'x-idempotency-key', headerKey: 'x-idempotency-key', headerValue: '{uuid}' },
    { key: 'Authorization', headerKey: 'Authorization', headerValue: 'Basic Z2FtZWRlbW86SGVMUW1vaUo4Y2RMalJKZ0xZMTVaMVJka2NkRnBPcDQ=' },
    { key: 'auto-new-row', headerKey: '', headerValue: '' }
  ])

  const handleActionInfo = (label: string) => {
    window.alert(label)
  }

  const handleDeleteHeader = (rowKey: string) => setHeaders(prev => prev.filter(h => h.key !== rowKey))
  const updateHeaderCell = (rowKey: string, field: 'headerKey' | 'headerValue', value: string) => {
    setHeaders(prev => prev.map(h => h.key === rowKey ? { ...h, [field]: value } : h))
  }

  const headerColumns: ColumnsType<HeaderRow> = useMemo(() => ([
    {
      title: 'Key', dataIndex: 'headerKey', key: 'headerKey',
      render: (_: string, record: HeaderRow) => (
        <Input placeholder="请输入key" value={record.headerKey} onChange={(e) => updateHeaderCell(record.key, 'headerKey', e.target.value)} />
      )
    },
    {
      title: 'Value', dataIndex: 'headerValue', key: 'headerValue',
      render: (_: string, record: HeaderRow) => (
        <Input placeholder="请输入value" value={record.headerValue} onChange={(e) => updateHeaderCell(record.key, 'headerValue', e.target.value)} />
      )
    },
    {
      title: '操作', key: 'actions', width: 150,
      render: (_: unknown, record: HeaderRow) => (
        <Space>
          <Button type="link" icon={<DeleteOutlined />} onClick={() => handleDeleteHeader(record.key)}>删除</Button>
        </Space>
      )
    }
  ]), [])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>消息推送</Title>
          <Space size={8} wrap>
            <Text type="secondary">用于模拟与联调消息推送 API，快速验证请求方法、Headers/Body 与白名单。</Text>
            <Link href="https://developers.g123.jp/docs/push-message" target="_blank" rel="noopener noreferrer"><u>查看文档</u></Link>
          </Space>
        </div>
      </div>

      <Space direction="vertical" size={16} style={{ display: 'flex' }}>
        <Card title={<span style={{ fontSize: 18 }}>消息推送Token</span>} styles={{ body: { paddingTop: 4 } }}>
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
                <Select
                  value={requestMethod}
                  onChange={(v) => setRequestMethod(v)}
                  options={['GET','POST','PUT','DELETE'].map(m => ({ value: m, label: (
                    <div style={{ color: m === 'POST' ? 'rgb(212, 177, 6)' : undefined, fontWeight: 700, width: 48, textAlign: 'left' }}>{m}</div>
                  ) }))}
                  style={{ width: 96 }}
                />
                <Input.TextArea placeholder="请输入调用URL" value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} style={{ height: 30, maxHeight: 30 }} />
              </Space.Compact>
              <Button type="primary" onClick={() => handleActionInfo('原型：发起调用')}>发起调用</Button>
            </div>

            <Table className="table-without-footer" size="middle" rowKey="key" columns={headerColumns} dataSource={headers} pagination={false} scroll={{ x: true }} />

            <Form layout="vertical" style={{ maxWidth: 720 }}>
              <Form.Item label="JSON Body">
                <Input.TextArea placeholder="请输入请求体 JSON" rows={6} />
              </Form.Item>
            </Form>
          </Space>
        </Card>

        <Card title={<span style={{ fontSize: 18 }}>IP白名单</span>} styles={{ body: { paddingTop: 4 } }}>
          <Form layout="vertical" style={{ width: 320 }}>
            <Space direction="vertical" size={8} style={{ display: 'flex' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item style={{ flex: 1, marginBottom: 8 }}>
                  <Text id="allowIps_0">47.91.30.64/32</Text>
                </Form.Item>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item style={{ flex: 1, marginBottom: 8 }}>
                  <Text id="allowIps_1">47.74.7.56</Text>
                </Form.Item>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item style={{ flex: 1, marginBottom: 8 }}>
                  <Text id="allowIps_2">1.1.1.1/32</Text>
                </Form.Item>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button type="primary" icon={<SettingOutlined />} onClick={() => handleActionInfo('原型：编辑白名单')}>编辑</Button>
              </div>
            </Space>
          </Form>
        </Card>
      </Space>
    </div>
  )
}

