'use client'

import React from 'react'
import { Card, DatePicker, Table, Tag, Space, Button, Drawer, Typography, Row, Col, message, Select } from 'antd'
import type { TableColumnsType } from 'antd'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

// 这段代码实现了日志列表与详情抽屉页面，使用了 Ant Design 的 Table、Drawer、RangePicker

interface LogRow {
  id: string
  api: string
  apiDesc: string
  status: number
  requestTime: string
  operator: string
  requestParams: Record<string, unknown>
  responseBody: Record<string, unknown>
  clientIp: string
  clientDevice: string
}

const mockData: LogRow[] = Array.from({ length: 12 }).map((_, idx) => ({
  id: `2025-09-12T07:39:${String(28 + idx).padStart(2, '0')}Z`,
  api: 'internal/zipExtractLog',
  apiDesc: '内部同步zip解压日志',
  status: 404,
  requestTime: `2025-09-12 15:39:${String(28 + idx).padStart(2, '0')}`,
  operator: 'system@ctw.inc',
  clientIp: `203.0.113.${(idx % 50) + 10}`,
  clientDevice: 'Chrome 120 / macOS',
  requestParams: {
    appId: 'gamedemo',
    fileName: 'zh_to_jaanden2',
    state: 'failure',
    log: "FETAL: Zip file zh_to_jaanden2.zip doesn't match version for gamedemo"
  },
  responseBody: {
    type: 'RESOURCE_NOT_FOUND',
    message: 'ent: client_resource_refer not found'
  }
}))

export default function LogPage(): React.ReactElement {
  const [data, setData] = React.useState<LogRow[]>(mockData)
  const [open, setOpen] = React.useState<boolean>(false)
  const [current, setCurrent] = React.useState<LogRow | null>(null)
  const [searchDesc, setSearchDesc] = React.useState<string | undefined>(undefined)

  // 交互：筛选日期（仅示例提示，不做真实过滤）
  const onRangeChange = (): void => {
    message.info('已按日期范围筛选（示例）')
    setData(mockData)
  }

  // 下拉搜索的选项：来自所有日志的 API 描述去重
  const apiDescOptions = React.useMemo(() => {
    const set = new Set<string>()
    mockData.forEach(r => set.add(r.apiDesc))
    return Array.from(set).map(v => ({ label: v, value: v }))
  }, [])

  // 交互：根据 API 描述筛选
  const onSearchDescChange = (value: string | undefined): void => {
    setSearchDesc(value)
    if (!value) {
      setData(mockData)
      return
    }
    const filtered = mockData.filter(r => r.apiDesc.includes(value))
    setData(filtered)
  }

  const columns: TableColumnsType<LogRow> = [
    {
      title: '操作行为',
      key: 'actionDesc',
      width: 360,
      render: (_: unknown, record: LogRow) => (
        <span>{`${record.operator} 在 ${record.requestTime} 操作了 ${record.apiDesc}`}</span>
      )
    },
    { title: 'API描述', dataIndex: 'apiDesc', key: 'apiDesc', width: 200 },
    { title: '响应状态', dataIndex: 'status', key: 'status', width: 120, align: 'center', render: (v: number) => <Tag color={v >= 400 ? 'error' : 'success'}>{v}</Tag> },
    { title: '请求时间', dataIndex: 'requestTime', key: 'requestTime', width: 200 },
    { title: '操作人', dataIndex: 'operator', key: 'operator', width: 200 },
    { title: '操作', key: 'actions', fixed: 'right', width: 100, render: (_: unknown, record: LogRow) => (
      <Space>
        <Button type="link" onClick={() => { setCurrent(record); setOpen(true) }}>查看</Button>
      </Space>
    ) }
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Title level={4} style={{ margin: 0 }}>操作日志</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <RangePicker style={{ width: 320 }} onChange={onRangeChange} />
            <Select
              allowClear
              showSearch
              placeholder="请选择API描述"
              optionFilterProp="label"
              style={{ width: 260 }}
              options={apiDescOptions}
              value={searchDesc}
              onChange={(v) => onSearchDescChange(v)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table<LogRow>
          columns={columns}
          dataSource={data}
          rowKey={(r) => r.id}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title="操作日志详情"
        open={open}
        onClose={() => setOpen(false)}
        width={720}
      >
        {current && (
          <div>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">操作行为</Text></Col>
              <Col span={18}><Text>{`${current.operator} 在 ${current.requestTime} 操作了 ${current.apiDesc}`}</Text></Col>
            </Row>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">API</Text></Col>
              <Col span={18}><Text code>{current.api}</Text></Col>
            </Row>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">API描述</Text></Col>
              <Col span={18}><Text>{current.apiDesc}</Text></Col>
            </Row>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">响应状态</Text></Col>
              <Col span={18}><Tag color={current.status >= 400 ? 'error' : 'success'}>{current.status}</Tag></Col>
            </Row>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">请求时间</Text></Col>
              <Col span={18}><Text>{current.requestTime}</Text></Col>
            </Row>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">操作人</Text></Col>
              <Col span={18}><Text>{current.operator}</Text></Col>
            </Row>
            <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">访问IP</Text></Col>
              <Col span={18}><Text>{current.clientIp}</Text></Col>
            </Row>
            <Row style={{ marginBottom: 16 }} gutter={[8, 8]}>
              <Col span={6}><Text type="secondary">访问设备</Text></Col>
              <Col span={18}><Text>{current.clientDevice}</Text></Col>
            </Row>

            <div style={{ marginBottom: 12 }}>
              <Title level={5} style={{ marginTop: 0 }}>接口请求参数</Title>
              <pre style={{ background: '#1c2023', color: '#f3f4f5', padding: 12, borderRadius: 6, overflow: 'auto' }}>{JSON.stringify(current.requestParams, null, 2)}</pre>
            </div>
            <div>
              <Title level={5} style={{ marginTop: 0 }}>接口响应Body</Title>
              <pre style={{ background: '#1c2023', color: '#f3f4f5', padding: 12, borderRadius: 6, overflow: 'auto' }}>{JSON.stringify(current.responseBody, null, 2)}</pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

