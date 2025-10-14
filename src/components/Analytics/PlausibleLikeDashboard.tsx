import React, { useMemo, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Typography, Space, Button, Tag, DatePicker, Segmented, Select, message, Progress } from 'antd'
import type { TableColumnsType } from 'antd'
import { Line, Column, Pie, Funnel, Heatmap } from '@ant-design/plots'

// 这段代码实现了：数据分析仪表板，包含用户行为路径漏斗图、活跃appid趋势图、页面热力图、停留时长分布图、操作成功率对比图、错误类型分布图、关键功能使用次数排名等分析图表。

const { Title, Text } = Typography

// 基础大盘数据接口
interface ActiveTrendData { date: string; dau: number; wau: number; mau: number }

// 功能模块分析数据接口
interface SuccessRateData { operation: string; success: number; failure: number; rate: number }
interface ErrorTypeData { type: string; count: number; percent: number }
interface FunctionRankData { function: string; count: number; trend: 'up' | 'down' | 'stable' }
// 分组柱状图数据类型
interface SuccessFailDatum { operation: string; amount: number; category: '成功' | '失败' }

// 保留原有接口用于兼容
interface SourceRow { source: string; visitors: number; percent: number }
interface PageRow { page: string; visitors: number }
interface DeviceRow { name: string; visitors: number; percent: number }
interface Point { t: string; v: number }
interface ActionRow { action: string; count: number }
interface AppClicksRow { appId: string; clicks: number }
interface ErrorRow { page: string; errors: number; last: string }
interface DwellRow { page: string; avg: number }

export default function PlausibleLikeDashboard(): React.ReactElement {
  const [site, setSite] = useState<string>('plausible.io')
  const [period, setPeriod] = useState<string>('realtime')
  const [range, setRange] = useState<[string | null, string | null]>([null, null])
  const [chartKey] = useState<string>(() => `sf-${Math.random().toString(36).slice(2)}`)

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

  const lineConfig: {
    data: Point[]
    xField: 't'
    yField: 'v'
    smooth: boolean
    legend: boolean
    padding: [number, number, number, number]
    xAxis: { tickCount: number; nice: boolean; grid: { line: { style: { stroke: string } } }; label: null }
    yAxis: { nice: boolean; grid: { line: { style: { stroke: string } } }; label: null }
    lineStyle: { stroke: string; lineWidth: number }
    area: { style: { fill: string } }
    tooltip: { showMarkers: boolean }
  } = {
    data: lineData,
    xField: 't',
    yField: 'v',
    smooth: true,
    legend: false,
    padding: [8, 8, 8, 8],
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


  // 根据用户提供的“子模块/页面”列表生成热门页面（去重计数）
  const submoduleNames: string[] = [
    '版本文件',
    '配置文件',
    '文件管理',
    '游戏日志',
    '数据分析',
    '存储管理',
    '数据库',
    '文件管理',
    '任务管理',
    '告警规则',
  ]

  const pages: PageRow[] = useMemo(() => {
    const map = new Map<string, number>()
    submoduleNames.forEach(n => map.set(n, (map.get(n) || 0) + 1))
    return Array.from(map.entries())
      .map(([page, visitors]) => ({ page, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 50)
  }, [])


  const devices: DeviceRow[] = [
    { name: 'Chrome', visitors: 87, percent: 54 },
    { name: 'Safari', visitors: 21, percent: 13 },
    { name: 'Firefox', visitors: 9, percent: 5.6 },
    { name: 'Edge', visitors: 8, percent: 5 },
    { name: 'Google', visitors: 1, percent: 0.6 }
  ]
  // 基于用户提供的信息生成“转化率”数据（统计关键词出现次数）
  const goalKeywords = [
    '页面停留','页面点击','下载CSV','上传CSV','页面修改','批量修改','下载CSV上传记录','添加到列表','更新到tableau',
    '同步','回退','删除','查看日志','问题输入','下载总汇率','导出档位','新增档位','切换版本','下载字体'
  ]


  // 菜单操作数据（根据你的菜单项生成的示例数据）
  const actionNames: string[] = [
    '自动同步翻译','上传压缩包','上传文件','同步翻译','页面停留','CDN部署','源站编辑','添加源站','缓存HTTP方法','智能压缩','缓存时间','透传回源参数','缓存检测','添加缓存','编辑缓存','排序缓存','删除缓存','上传文件','创建文件夹','删除文件','添加地址','添加镜像','快速发布','删除镜像','挂载文件','prestop','登入Pod','修改标签','查看日志','设置HPA','应用配置','开服策略','Webhook配置','手动开服','追加灰度','全量灰度','回滚','创建灰度','创建分组','查看配置','编辑分组','删除分组','修改开服资源','编辑服务','重启应用','停止应用','删除应用','批量操作','查看变更记录','下载文件','查看游戏日志','查看DAU','添加IP白名单','数据库查询','数据库恢复','创建备份','慢日志查询','上传文件','添加任务','设置故障报警','添加人员','页面停留','页面停留','按钮点击','页面停留','按钮点击','页面停留','按钮点击','下载总汇率','导出档位','新增档位','切换版本','下载字体','立即同步','查看列表','页面停留','页面点击','页面停留','页面点击','编辑白名单','下载CSV','上传CSV','页面修改','批量修改','下载记录','添加到列表','更新Tableau','页面修改','批量修改','同步数据','回退版本','删除礼包','页面停留','查看日志','按钮点击','按钮点击','页面停留','输入问题'
  ]
  const actions: ActionRow[] = useMemo(() => actionNames.map(a => ({ action: a, count: Math.round(Math.random()*300+10) })), [])

  // 成功/失败 分组柱状图数据（显式定义，避免运行时被覆盖）
  const successFailData: SuccessFailDatum[] = useMemo(() => (
    [
      { operation: '文件上传', amount: 85, category: '成功' },
      { operation: '文件上传', amount: 15, category: '失败' },
      { operation: '数据同步', amount: 92, category: '成功' },
      { operation: '数据同步', amount: 8, category: '失败' },
      { operation: '配置修改', amount: 78, category: '成功' },
      { operation: '配置修改', amount: 22, category: '失败' },
      { operation: '版本切换', amount: 88, category: '成功' },
      { operation: '版本切换', amount: 12, category: '失败' },
      { operation: '日志查看', amount: 95, category: '成功' },
      { operation: '日志查看', amount: 5, category: '失败' },
      { operation: '备份创建', amount: 82, category: '成功' },
      { operation: '备份创建', amount: 18, category: '失败' }
    ]
  ), [])

  // 调试：打印柱状图数据，确保运行时数据正确
  // eslint-disable-next-line no-console
  console.log('successFailData', successFailData)
  // 方便在浏览器控制台查看：输入 __successFailData 回车
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __successFailData?: SuccessFailDatum[]; successFailData?: SuccessFailDatum[] }
    w.__successFailData = successFailData
    w.successFailData = successFailData
  }

  // AppID 点击次数 TOP10（使用指定的 10 个 AppID）
  const appIds = [
    'gamedemo','kumo','hightschool','okashi','slime','guruguru','newgame','ossan','gameone','Doraemon'
  ]
  const top10Apps: AppClicksRow[] = useMemo(() => {
    const map = new Map<string, number>()
    // 先为所有 appId 初始化 0，确保每个都展示
    appIds.forEach(id => map.set(id, 0))
    actions.forEach(a => {
      const id = appIds[Math.floor(Math.random() * appIds.length)]
      map.set(id, (map.get(id) || 0) + a.count)
    })
    return Array.from(map.entries())
      .map(([appId, clicks]) => ({ appId, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
  }, [actions])


  const compactRow = { height: 36 }
  const tableStyle = { fontSize: 12 }


  // ========== 功能模块分析数据 ==========

  // 5. 操作成功率/失败率对比图数据
  const successRateData: SuccessRateData[] = useMemo(() => [
    { operation: '文件上传', success: 85, failure: 15, rate: 85 },
    { operation: '数据同步', success: 92, failure: 8, rate: 92 },
    { operation: '配置修改', success: 78, failure: 22, rate: 78 },
    { operation: '版本切换', success: 88, failure: 12, rate: 88 },
    { operation: '日志查看', success: 95, failure: 5, rate: 95 },
    { operation: '备份创建', success: 82, failure: 18, rate: 82 }
  ], [])

  // 6. 错误类型分布图数据
  const errorTypeData: ErrorTypeData[] = useMemo(() => [
    { type: '网络超时', count: 45, percent: 35 },
    { type: '权限不足', count: 28, percent: 22 },
    { type: '数据格式错误', count: 20, percent: 16 },
    { type: '服务器错误', count: 18, percent: 14 },
    { type: '文件过大', count: 12, percent: 9 },
    { type: '其他错误', count: 5, percent: 4 }
  ], [])

  // 7. 关键功能使用次数排名数据
  const functionRankData: FunctionRankData[] = useMemo(() => {
    const functions = [
      '文件管理', '数据同步', '版本切换', '日志查看', '配置修改',
      '备份创建', '任务管理', '存储管理', '数据库查询', '游戏日志'
    ]
    return functions.map((func, index) => ({
      function: func,
      count: Math.round(Math.random() * 500 + 100),
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
    })).sort((a, b) => b.count - a.count)
  }, [])

  const sourceCols: TableColumnsType<SourceRow> = [
    { title: '弹窗', dataIndex: 'source', key: 'source' },
    {
      title: '报错次数', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 160
    }
  ]

  const actionCols: TableColumnsType<ActionRow> = [
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '次数', dataIndex: 'count', key: 'count', align: 'right', width: 120 }
  ]

  // 最常报错页面 / 停留时间最长页面（示例算法：基于 pages 生成）
  const errorRows: ErrorRow[] = useMemo(() => {
    return pages.slice(0, 50).map(p => ({
      page: p.page,
      errors: Math.round(Math.random()*30),
      last: new Date(Date.now() - Math.round(Math.random()*3600*1000)).toLocaleString()
    })).sort((a,b)=> b.errors - a.errors)
  }, [pages])

  const dwellRows: DwellRow[] = useMemo(() => {
    return pages.slice(0, 50).map(p => ({
      page: p.page,
      avg: Math.round(Math.random()*300 + 20) // 平均停留秒数
    })).sort((a,b)=> b.avg - a.avg)
  }, [pages])

  const errorCols: TableColumnsType<ErrorRow> = [
    { title: '页面/子模块', dataIndex: 'page', key: 'page' },
    { title: '报错次数', dataIndex: 'errors', key: 'errors', align: 'right', width: 120 },
    { title: '最近一次报错', dataIndex: 'last', key: 'last', align: 'right', width: 200 }
  ]

  const dwellCols: TableColumnsType<DwellRow> = [
    { title: '页面/子模块', dataIndex: 'page', key: 'page' },
    { title: '平均停留(秒)', dataIndex: 'avg', key: 'avg', align: 'right', width: 150 }
  ]

  // 将“最常报错页面”映射到热门来源的表格结构（保留原图表样式，但展示报错数据）
  const sourcesFromErrors: SourceRow[] = useMemo(() => {
    const top = errorRows.slice(0, 10)
    const max = top.reduce((m, r) => Math.max(m, r.errors), 0) || 1
    return top.map(r => ({
      source: r.page,
      visitors: r.errors,
      percent: Math.round((r.errors / max) * 100)
    }))
  }, [errorRows])

  const pageCols: TableColumnsType<PageRow> = [
    { title: '页面', dataIndex: 'page', key: 'page' },
    { title: '当前访客', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 160 }
  ]


  const deviceCols: TableColumnsType<DeviceRow> = [
    { title: '设备', dataIndex: 'name', key: 'name' },
    { title: '当前访客', dataIndex: 'visitors', key: 'visitors', align: 'right', width: 120 },
    { title: '%', dataIndex: 'percent', key: 'percent', align: 'right', width: 100, render: (p: number) => `${p}%` }
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
                { label: '今日', value: 'today' },
                { label: '昨日', value: 'yesterday' },
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
          </Space>
        </Space>

        {/* 顶部统计 */}
        <Row gutter={16}>
          <Col xs={24} md={6}><Card><Statistic title="今日活跃游戏" value={156} /></Card></Col>
          <Col xs={24} md={6}><Card><Statistic title="本周活跃游戏" value={892} /></Card></Col>
          <Col xs={24} md={6}><Card><Statistic title="本月活跃游戏" value={2341} /></Card></Col>
        </Row>
        {/* 热门来源 / 热门页面 */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card title={<Space>弹窗报错 TOP10 <Tag>错误</Tag></Space>}>
              <Table<SourceRow>
                size="small"
                style={tableStyle}
                columns={sourceCols}
                dataSource={sourcesFromErrors}
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


        {/* 停留时间最长页面 */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card title={<Space>停留时间最长页面 <Tag>停留</Tag></Space>}>
                <Table<DwellRow>
                size="small"
                style={tableStyle}
                columns={dwellCols}
                dataSource={dwellRows}
                pagination={{ pageSize: 10 }}
                rowKey={r => `${r.page}-${r.avg}`}
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
        {/* 功能模块分析 */}
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title={<Space>操作成功率/失败率对比图 <Tag>性能</Tag></Space>} key={chartKey}>
              <Column
                key={`${chartKey}-col`}
                data={successFailData}
                xField="operation"
                yField="amount"
                seriesField="category"
                isGroup
                height={300}
                padding={[4, 4, 4, 4]}
                xAxis={{ label: { autoRotate: true } }}
                yAxis={{ grid: { line: { style: { stroke: '#eef2f7' } } } }}
                color={(d: SuccessFailDatum) => (d.category === '成功' ? '#10b981' : '#ef4444')}
                legend={{ position: 'top' }}
                label={{
                  position: 'top',
                  text: (d: SuccessFailDatum) => `${d.amount ?? 0}`
                }}
                meta={{
                  amount: { alias: '次数', type: 'linear', nice: true },
                  operation: { type: 'cat' },
                  category: { type: 'cat' }
                }}
                tooltip={undefined}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Space>错误类型分布图 <Tag>问题</Tag></Space>}>
              <Pie
                data={errorTypeData}
                angleField="count"
                colorField="type"
                height={300}
                padding={[4, 4, 4, 4]}
                radius={0.8}
                innerRadius={0.4}
                label={{
                  type: 'outer',
                  formatter: (datum: ErrorTypeData) => `${datum.type}: ${datum.count ?? 0} (${datum.percent ?? 0}%)`,
                  style: { fontSize: 12 }
                }}
                tooltip={{
                  formatter: (datum: ErrorTypeData) => ({
                    name: datum.type,
                    value: `${datum.count ?? 0} 次 (${datum.percent ?? 0}%)`
                  })
                }}
                color={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24}>
            <Card title={<Space>关键功能使用次数排名 <Tag>热门</Tag></Space>}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <Table<FunctionRankData>
                    size="small"
                    style={tableStyle}
                    columns={[
                      { title: '功能', dataIndex: 'function', key: 'function' },
                      { 
                        title: '使用次数', 
                        dataIndex: 'count', 
                        key: 'count', 
                        align: 'right', 
                        width: 120,
                        render: (count: number) => count.toLocaleString()
                      },
                      { 
                        title: '趋势', 
                        dataIndex: 'trend', 
                        key: 'trend', 
                        align: 'center', 
                        width: 80,
                        render: (trend: 'up' | 'down' | 'stable') => {
                          const colors = { up: '#10b981', down: '#ef4444', stable: '#6b7280' }
                          const icons = { up: '↗', down: '↘', stable: '→' }
                          return <Tag color={colors[trend]}>{icons[trend]}</Tag>
                        }
                      }
                    ]}
                    dataSource={functionRankData}
                    pagination={{ pageSize: 10 }}
                    rowKey={r => r.function}
                    onRow={() => ({ style: compactRow })}
                  />
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}


[
    {
      "appId": "game-123",
      "appName": "my-game-app",
      "groupId": 1,
      "currentVersion": 5,
      "previousVersion": 4,
      "hasChanges": true,
      "changes": [
        {
          "field": "memory",
          "oldValue": {
            "web-server": {
              "num": 512,
              "unit": "Mi"
            },
            "api-server": {
              "num": 1,
              "unit": "Gi"
            }
          },
          "newValue": {
            "web-server": {
              "num": 1024,
              "unit": "Mi"
            },
            "api-server": {
              "num": 2,
              "unit": "Gi"
            }
          }
        },
        {
          "field": "cpu",
          "oldValue": {
            "web-server": {
              "num": 0.5,
              "unit": "C"
            },
            "api-server": {
              "num": 1.0,
              "unit": "C"
            }
          },
          "newValue": {
            "web-server": {
              "num": 1.0,
              "unit": "C"
            },
            "api-server": {
              "num": 2.0,
              "unit": "C"
            }
          }
        },
        {
          "field": "images",
          "oldValue": {
            "web-server": "nginx:1.20",
            "api-server": "my-app:v1.0.0"
          },
          "newValue": {
            "web-server": "nginx:1.21",
            "api-server": "my-app:v1.1.0"
          }
        },
        {
          "field": "containers",
          "oldValue": [
            {
              "name": "web-server",
              "imageRepo": "nginx"
            },
            {
              "name": "api-server",
              "imageRepo": "my-app"
            }
          ],
          "newValue": [
            {
              "name": "web-server",
              "imageRepo": "nginx"
            },
            {
              "name": "api-server",
              "imageRepo": "my-app"
            },
            {
              "name": "cache-server",
              "imageRepo": "redis"
            }
          ]
        },
        {
          "field": "labels",
          "oldValue": {
            "environment": "staging",
            "version": "v1.0.0"
          },
          "newValue": {
            "environment": "production",
            "version": "v1.1.0",
            "team": "backend"
          }
        },
        {
          "field": "headless",
          "oldValue": false,
          "newValue": true
        },
        {
          "field": "hpa",
          "oldValue": false,
          "newValue": true
        },
        {
          "field": "replicas",
          "oldValue": 3,
          "newValue": 5
        }
      ]
    }
  ]