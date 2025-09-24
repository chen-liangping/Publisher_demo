import React, { useMemo, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Typography, Space, Button, Tag, Progress, DatePicker, Segmented, Select, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { Line } from '@ant-design/plots'
import { DownloadOutlined } from '@ant-design/icons'

// 这段代码实现了：基于 Ant Design 完整复刻 Plausible 风格的统计页（顶部统计、趋势图、四象限卡片、转化表、底部 CTA），并新增：站点切换、时间段筛选、自定义导出（CSV）。趋势图改为更还原的线条+网格样式，表格采用紧凑字号与行距。

const { Title, Text } = Typography

interface SourceRow { source: string; visitors: number; percent: number }
interface PageRow { page: string; visitors: number }
interface RegionRow { region: string; visitors: number }
interface DeviceRow { name: string; visitors: number; percent: number }
interface ConversionRow { goal: string; unique: number; total: number | null; cr: number }
interface Point { t: string; v: number }

export default function PlausibleLikeDashboard(): React.ReactElement {
  const [site, setSite] = useState<string>('plausible.io')
  const [period, setPeriod] = useState<string>('realtime')
  const [range, setRange] = useState<[string | null, string | null]>([null, null])

  // 顶部统计（示例数据）
  const topStats = {
    currentVisitors: 136,
    uniqueVisitors30m: 672,
    pageviews30m: 2000
  }

  // 趋势图数据（示例）
  const lineData: Point[] = useMemo(() => {
    const points: Point[] = []
    let base = 140
    for (let i = 30; i >= 0; i--) {
      base = Math.max(40, base + Math.round((Math.random() - 0.6) * 10))
      points.push({ t: `-${i}m`, v: base })
    }
    return points
  }, [site, period, range])

  const lineConfig = {
    data: lineData,
    xField: 't',
    yField: 'v',
    smooth: true,
    legend: false,
    padding: [8, 8, 8, 8] as any,
    xAxis: {
      tickCount: 8,
      nice: true,
      grid: { line: { style: { stroke: '#eef2f7' } } },
      label: null
    },
    yAxis: {
      nice: true,
      grid: { line: { style: { stroke: '#eef2f7' } } },
      label: null
    },
    lineStyle: { stroke: '#94a3b8', lineWidth: 2 },
    area: { style: { fill: 'l(270) 0:#f8fafc 1:#ffffff' } },
    tooltip: { showMarkers: true }
  }

  // 表格数据（示例，与截图接近）
  const sources: SourceRow[] = [
    { source: '直接/无', visitors: 117, percent: 100 },
    { source: '谷歌', visitors: 4, percent: 12 },
    { source: '必应', visitors: 2, percent: 8 },
    { source: 'DuckDuckGo', visitors: 1, percent: 6 },
    { source: 'app.asana.com', visitors: 1, percent: 6 },
    { source: 'chat.mistral.ai', visitors: 1, percent: 6 }
  ]

  const pages: PageRow[] = [
    { page: '/：仪表板', visitors: 128 },
    { page: '/站点', visitors: 38 },
    { page: '/', visitors: 12 },
    { page: '/分享/：仪表板', visitors: 11 },
    { page: '/登录', visitors: 7 },
    { page: '/:仪表板/页面', visitors: 7 }
  ]

  const regions: RegionRow[] = [
    { region: '英格兰', visitors: 15 },
    { region: '首都地区', visitors: 5 },
    { region: '北莱茵-威斯特法伦州', visitors: 5 },
    { region: '丹麦中部', visitors: 3 },
    { region: '维也纳', visitors: 3 },
    { region: '加泰罗尼亚', visitors: 3 }
  ]

  const devices: DeviceRow[] = [
    { name: '铬合金', visitors: 87, percent: 54 },
    { name: 'Safari', visitors: 21, percent: 13 },
    { name: '火狐', visitors: 9, percent: 5.6 },
    { name: '微软 Edge', visitors: 8, percent: 5 },
    { name: '勇敢的', visitors: 1, percent: 0.6 },
    { name: 'Yandex 浏览器', visitors: 1, percent: 0.6 }
  ]

  const conversions: ConversionRow[] = [
    { goal: '滚动到目标', unique: 227, total: null, cr: 33.43 },
    { goal: '深度滚动 - 主页', unique: 31, total: null, cr: 4.57 },
    { goal: '访问/注册', unique: 7, total: 7, cr: 1.03 },
    { goal: '添加站点', unique: 6, total: 6, cr: 0.88 },
    { goal: '滚动/博客* 50%', unique: 2, total: null, cr: 0.29 },
    { goal: '通过邀请注册', unique: 2, total: 2, cr: 0.29 },
    { goal: '访问/博客*', unique: 3, total: 3, cr: 0.44 },
    { goal: '访问/激活', unique: 2, total: 2, cr: 0.29 },
    { goal: '升级到订阅', unique: 1, total: 1, cr: 0.15 }
  ]

  // 导出 CSV（示例：导出热门来源与热门页面）
  const exportCsv = (): void => {
    const header = 'type,name,value\n'
    const src = sources.map(s => `source,${s.source},${s.visitors}`).join('\n')
    const pg = pages.map(p => `page,${p.page},${p.visitors}`).join('\n')
    const csv = header + src + '\n' + pg
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success('已导出 CSV（示例）')
  }

  const compactRow = { height: 36 }
  const tableStyle = { fontSize: 12 }

  const sourceCols: TableColumnsType<SourceRow> = [
    { title: '来源', dataIndex: 'source', key: 'source' },
    {
      title: '当前访客', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 160,
      render: (v: number, r: SourceRow) => (
        <Space size={8} style={{ justifyContent: 'flex-end', width: '100%' }}>
          <div style={{ width: 120 }}>
            <Progress percent={Math.min(100, r.percent)} showInfo={false} size={[120, 8]} />
          </div>
          <Text>{v}</Text>
        </Space>
      )
    }
  ]

  const pageCols: TableColumnsType<PageRow> = [
    { title: '页', dataIndex: 'page', key: 'page' },
    { title: '当前访客', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 160 }
  ]

  const regionCols: TableColumnsType<RegionRow> = [
    { title: '地区', dataIndex: 'region', key: 'region' },
    { title: '当前访客', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 160 }
  ]

  const deviceCols: TableColumnsType<DeviceRow> = [
    { title: '设备', dataIndex: 'name', key: 'name' },
    { title: '当前访客', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 120 },
    { title: '%', dataIndex: 'percent', key: 'percent', align: 'right', width: 100, render: (p: number) => `${p}%` }
  ]

  const conversionCols: TableColumnsType<ConversionRow> = [
    { title: '目标', dataIndex: 'goal', key: 'goal' },
    { title: '独特', dataIndex: 'unique', key: 'unique', align: 'right', width: 120 },
    { title: '全部的', dataIndex: 'total', key: 'total', align: 'right', width: 120, render: (v: number | null) => v ?? '-' },
    { title: 'CR', dataIndex: 'cr', key: 'cr', align: 'right', width: 120, render: (v: number) => `${v}%` }
  ]

  return (
    <div style={{ width: '100%' }}>
      {/* 顶部标题与筛选 */}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space align="center">
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#6366f1', display: 'inline-block' }} />
            <Title level={5} style={{ margin: 0 }}>{site}</Title>
            <Tag color="default">{period === 'realtime' ? '即时的' : '时间段'}</Tag>
          </Space>
          <Space>
            <Select
              size="small"
              value={site}
              options={[{ value: 'plausible.io', label: 'plausible.io' }, { value: 'example.com', label: 'example.com' }]}
              onChange={(v) => setSite(v)}
              style={{ width: 160 }}
            />
            <Segmented
              size="small"
              value={period}
              onChange={(v) => setPeriod(v as string)}
              options={[
                { label: '实时', value: 'realtime' },
                { label: '30分钟', value: '30m' },
                { label: '今日', value: 'today' },
                { label: '7天', value: '7d' },
                { label: '30天', value: '30d' }
              ]}
            />
            <DatePicker.RangePicker
              size="small"
              onChange={(vals) => {
                setRange([vals?.[0]?.toISOString() ?? null, vals?.[1]?.toISOString() ?? null])
                message.info('已应用自定义时间段（示例）')
              }}
            />
            <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>导出</Button>
          </Space>
        </Space>

        {/* 顶部统计 */}
        <Row gutter={16}>
          <Col xs={24} md={8}><Card><Statistic title="当前访客" value={topStats.currentVisitors} /></Card></Col>
          <Col xs={24} md={8}><Card><Statistic title="独立访客（最近30分钟）" value={topStats.uniqueVisitors30m} /></Card></Col>
          <Col xs={24} md={8}><Card><Statistic title="页面浏览量（最近30分钟）" value={topStats.pageviews30m} /></Card></Col>
        </Row>

        {/* 趋势图：线条 + 网格，更贴近原样式 */}
        <Card bodyStyle={{ padding: 12 }}>
          <div style={{ height: 260 }}>
            <Line {...(lineConfig as any)} />
          </div>
        </Card>

        {/* 热门来源 / 热门页面 */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card title={<Space>热门来源 <Tag>来源</Tag></Space>}>
              <Table<SourceRow>
                size="small"
                style={tableStyle}
                columns={sourceCols}
                dataSource={sources}
                pagination={false}
                rowKey={r => `${r.source}-${r.visitors}`}
                onRow={() => ({ style: compactRow })}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<Space>热门页面 <Tag>热门页面</Tag></Space>}>
              <Table<PageRow>
                size="small"
                style={tableStyle}
                columns={pageCols}
                dataSource={pages}
                pagination={false}
                rowKey={r => `${r.page}-${r.visitors}`}
                onRow={() => ({ style: compactRow })}
              />
            </Card>
          </Col>
        </Row>

        {/* 区域 / 设备 */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card title={<Space>区域 <Tag>地区</Tag></Space>}>
              <Table<RegionRow>
                size="small"
                style={tableStyle}
                columns={regionCols}
                dataSource={regions}
                pagination={false}
                rowKey={r => `${r.region}-${r.visitors}`}
                onRow={() => ({ style: compactRow })}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<Space>设备 <Tag>浏览器</Tag></Space>}>
              <Table<DeviceRow>
                size="small"
                style={tableStyle}
                columns={deviceCols}
                dataSource={devices}
                pagination={false}
                rowKey={r => `${r.name}-${r.visitors}`}
                onRow={() => ({ style: compactRow })}
              />
            </Card>
          </Col>
        </Row>

        {/* 转化 */}
        <Card title={<Space>进球转化率（过去 30 分钟） <Tag>目标</Tag></Space>}>
          <Table<ConversionRow>
            size="small"
            style={tableStyle}
            columns={conversionCols}
            dataSource={conversions}
            pagination={false}
            rowKey={r => `${r.goal}-${r.unique}`}
            onRow={() => ({ style: compactRow })}
          />
        </Card>
</Space>
    </div>
  )
}