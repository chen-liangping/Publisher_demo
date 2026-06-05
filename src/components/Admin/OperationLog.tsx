'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { Card, DatePicker, Table, Tag, Space, Button, Drawer, Typography, Row, Col, message, Select, Input, Empty } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

// 操作日志数据类型（按PRD要求扩展）
interface FieldChange {
  field: string
  before: string | boolean
  after: string | boolean
}

interface LogRow {
  id: string
  module: string // 模块：平台游戏、公告管理、多币种管理等
  api: string // 完整API路径
  apiDesc: string // API描述
  resourceType?: string // 资源类型：game、announcement等
  resourceId?: string // 资源ID
  resourceName?: string // 资源名称
  status: number // HTTP状态码
  requestTime: string // 操作时间
  operator: string // 操作人邮箱
  operatorRole?: string // 操作人角色
  clientIp: string // 访问IP
  clientDevice: string // 访问设备
  requestParams: Record<string, unknown> // 请求参数
  responseBody: Record<string, unknown> // 响应Body
  changes?: FieldChange[] // 操作前后对比（仅修改操作有）
}

// Mock数据：覆盖管理台实际功能模块的操作
const mockData: LogRow[] = [
  // 游戏管理 - 查看游戏环境详情
  {
    id: '20260605-143000-001',
    module: '游戏管理',
    api: 'GET /api/v1/admin/games/kumo/env/prod',
    apiDesc: '查看游戏环境详情',
    resourceType: 'game',
    resourceId: 'kumo',
    resourceName: 'kumo',
    status: 200,
    requestTime: '2026-06-05 14:30:25',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:viewer',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: { appId: 'kumo', env: 'prod' },
    responseBody: { code: '0', message: 'success', data: { appId: 'kumo', env: 'prod', status: 'active' } }
  },
  // SA权限管理 - 配置SA权限
  {
    id: '20260605-135000-002',
    module: 'SA权限管理',
    api: 'PUT /api/v1/admin/sa/dragon/permissions',
    apiDesc: '配置SA权限',
    resourceType: 'sa',
    resourceId: 'dragon',
    resourceName: 'dragon',
    status: 200,
    requestTime: '2026-06-05 13:50:00',
    operator: 'b@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.101',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: { appId: 'dragon', hasPermission: true },
    responseBody: { code: '0', message: 'success', data: {} }
  },
  // 游戏资源配置 - 修改资源配置（成功，带操作前后对比）
  {
    id: '20260605-125000-003',
    module: '游戏资源配置',
    api: 'PUT /api/v1/admin/resource-config/prod/mysql',
    apiDesc: '修改资源配置',
    resourceType: 'resource-config',
    resourceId: 'mysql-prod',
    resourceName: 'MySQL配置',
    status: 200,
    requestTime: '2026-06-05 12:50:00',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: { mysqlSpecs: ['4核8G', '4核16G'] },
    responseBody: { code: '0', message: 'success', data: {} },
    changes: [
      { field: 'mysqlSpecs', before: '2核8G', after: '4核8G, 4核16G' }
    ]
  },
  // 公告管理 - 创建公告
  {
    id: '20260605-115000-004',
    module: '公告管理',
    api: 'POST /api/v1/admin/announcements',
    apiDesc: '创建公告',
    resourceType: 'announcement',
    resourceId: 'anno-new-001',
    resourceName: '新活动上线',
    status: 200,
    requestTime: '2026-06-05 11:50:00',
    operator: 'c@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.102',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: {
      title: '新活动上线',
      content: '参与活动可获得丰厚奖励',
      method: 'modal',
      type: '系统消息',
      gameScope: ['全部游戏']
    },
    responseBody: { code: '0', message: 'success', data: { announcementId: 'anno-new-001' } }
  },
  // 公告管理 - 发布公告
  {
    id: '20260605-113000-005',
    module: '公告管理',
    api: 'POST /api/v1/admin/announcements/anno-new-001/publish',
    apiDesc: '发布公告',
    resourceType: 'announcement',
    resourceId: 'anno-new-001',
    resourceName: '新活动上线',
    status: 200,
    requestTime: '2026-06-05 11:30:00',
    operator: 'c@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.102',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: { announcementId: 'anno-new-001', publishToDingTalk: true },
    responseBody: { code: '0', message: 'success', data: {} }
  },
  // 游戏通知配置 - 修改通知规则（成功，带操作前后对比）
  {
    id: '20260605-104500-006',
    module: '游戏通知配置',
    api: 'PUT /api/v1/admin/notification/rules/hpa',
    apiDesc: '修改通知规则',
    resourceType: 'notification-rule',
    resourceId: 'hpa-rule',
    resourceName: 'HPA通知规则',
    status: 200,
    requestTime: '2026-06-05 10:45:00',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: { channelEnabled: { 'publisher-project': true, 'GameMonitoring': false } },
    responseBody: { code: '0', message: 'success', data: {} },
    changes: [
      { field: 'GameMonitoring', before: 'true', after: 'false' }
    ]
  },
  // Game Faro配置 - 编辑Faro URL（成功，带操作前后对比）
  {
    id: '20260605-100000-007',
    module: 'Game Faro配置',
    api: 'PUT /api/v1/admin/faro/doraemon',
    apiDesc: '编辑Faro URL',
    resourceType: 'faro-config',
    resourceId: 'doraemon',
    resourceName: 'doraemon',
    status: 200,
    requestTime: '2026-06-05 10:00:00',
    operator: 'b@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.101',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: { faroUrl: 'https://faro.doraemon.g123.jp/collect?env=stg' },
    responseBody: { code: '0', message: 'success', data: {} },
    changes: [
      { field: 'faroUrl', before: 'https://faro.doraemon.g123.jp/collect?env=prod', after: 'https://faro.doraemon.g123.jp/collect?env=stg' }
    ]
  },
  // YAML备份 - 编辑YAML
  {
    id: '20260605-093000-008',
    module: 'YAML备份',
    api: 'PUT /api/v1/admin/yaml/kumo/values',
    apiDesc: '编辑YAML配置',
    resourceType: 'yaml',
    resourceId: 'kumo-values',
    resourceName: 'kumo',
    status: 200,
    requestTime: '2026-06-05 09:30:00',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: {
      yaml: 'game:\n  appId: kumo\n  env: prod\n  replicaCount: 3'
    },
    responseBody: { code: '0', message: 'success', data: {} }
  },
  // 公告管理 - 编辑公告（成功，带操作前后对比）
  {
    id: '20260604-163000-009',
    module: '公告管理',
    api: 'PUT /api/v1/admin/announcements/anno-001',
    apiDesc: '编辑公告',
    resourceType: 'announcement',
    resourceId: 'anno-001',
    resourceName: '系统维护通知',
    status: 200,
    requestTime: '2026-06-04 16:30:00',
    operator: 'c@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.102',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: { title: '系统维护通知（更新）', content: '维护时间调整至明天凌晨' },
    responseBody: { code: '0', message: 'success', data: {} },
    changes: [
      { field: 'content', before: '系统将于今晚进行维护', after: '维护时间调整至明天凌晨' }
    ]
  },
  // 游戏资源配置 - 查看资源配置
  {
    id: '20260604-150000-010',
    module: '游戏资源配置',
    api: 'GET /api/v1/admin/resource-config/prod',
    apiDesc: '查看资源配置',
    resourceType: 'resource-config',
    resourceId: 'prod-config',
    resourceName: '生产环境配置',
    status: 200,
    requestTime: '2026-06-04 15:00:00',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:viewer',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: { env: 'prod' },
    responseBody: { code: '0', message: 'success', data: { storageInstancesLimit: 5, mysqlSpecs: ['4核8G'] } }
  },
  // SA权限管理 - 查看SA详情
  {
    id: '20260604-140000-011',
    module: 'SA权限管理',
    api: 'GET /api/v1/admin/sa/dragon/detail',
    apiDesc: '查看SA详情',
    resourceType: 'sa',
    resourceId: 'dragon',
    resourceName: 'dragon',
    status: 200,
    requestTime: '2026-06-04 14:00:00',
    operator: 'b@xxx.com',
    operatorRole: 'publisher:admin:viewer',
    clientIp: '192.168.1.101',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: { appId: 'dragon' },
    responseBody: { code: '0', message: 'success', data: { serviceAccount: 'publisher-dragon-sa', hasPermission: true } }
  },
  // 公告管理 - 删除公告
  {
    id: '20260604-130000-012',
    module: '公告管理',
    api: 'DELETE /api/v1/admin/announcements/anno-002',
    apiDesc: '删除公告',
    resourceType: 'announcement',
    resourceId: 'anno-002',
    resourceName: '过期公告',
    status: 200,
    requestTime: '2026-06-04 13:00:00',
    operator: 'c@xxx.com',
    operatorRole: 'publisher:admin:editor',
    clientIp: '192.168.1.102',
    clientDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestParams: { announcementId: 'anno-002' },
    responseBody: { code: '0', message: 'success', data: {} }
  },
  // 游戏通知配置 - 查看通知规则
  {
    id: '20260604-120000-013',
    module: '游戏通知配置',
    api: 'GET /api/v1/admin/notification/rules',
    apiDesc: '查看通知规则',
    resourceType: 'notification-rule',
    resourceId: 'all-rules',
    resourceName: '全部规则',
    status: 200,
    requestTime: '2026-06-04 12:00:00',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:viewer',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: {},
    responseBody: { code: '0', message: 'success', data: { rules: [] } }
  },
  // 游戏管理 - 查看游戏列表
  {
    id: '20260604-110000-014',
    module: '游戏管理',
    api: 'GET /api/v1/admin/games',
    apiDesc: '查看游戏列表',
    resourceType: 'game',
    resourceId: 'all-games',
    resourceName: '全部游戏',
    status: 200,
    requestTime: '2026-06-04 11:00:00',
    operator: 'a@xxx.com',
    operatorRole: 'publisher:admin:viewer',
    clientIp: '192.168.1.100',
    clientDevice: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    requestParams: { page: 1, pageSize: 20 },
    responseBody: { code: '0', message: 'success', data: { games: [] } }
  }
]

export default function OperationLog(): React.ReactElement {
  const [data, setData] = useState<LogRow[]>(mockData)
  const [open, setOpen] = useState<boolean>(false)
  const [current, setCurrent] = useState<LogRow | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number>(-1)

  // 筛选条件状态
  const [searchDesc, setSearchDesc] = useState<string | undefined>(undefined)
  const [searchOperator, setSearchOperator] = useState<string | undefined>(undefined)
  const [searchModule, setSearchModule] = useState<string | undefined>(undefined)
  const [searchResourceId, setSearchResourceId] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // 获取筛选后的数据列表（用于导航）
  const filteredList = useMemo(() => {
    return data.filter(item => {
      if (searchDesc && !item.apiDesc.includes(searchDesc)) return false
      if (searchOperator && item.operator !== searchOperator) return false
      if (searchModule && item.module !== searchModule) return false
      if (searchResourceId && item.resourceId !== searchResourceId) return false
      if (dateRange) {
        const [start, end] = dateRange
        const itemDate = dayjs(item.requestTime)
        if (itemDate.isBefore(start.startOf('day')) || itemDate.isAfter(end.endOf('day'))) return false
      }
      return true
    })
  }, [data, searchDesc, searchOperator, searchModule, searchResourceId, dateRange])

  // 交互：筛选日期
  const onRangeChange = (dates: null | [dayjs.Dayjs | null, dayjs.Dayjs | null]): void => {
    setDateRange(dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null)
  }

  // 交互：重置筛选条件
  const onReset = (): void => {
    setSearchDesc(undefined)
    setSearchOperator(undefined)
    setSearchModule(undefined)
    setSearchResourceId('')
    setDateRange(null)
    setData(mockData)
    message.info('已重置筛选条件')
  }

  // 交互：应用筛选
  const onApplyFilter = useCallback(() => {
    const filtered = mockData.filter(item => {
      if (searchDesc && !item.apiDesc.includes(searchDesc)) return false
      if (searchOperator && item.operator !== searchOperator) return false
      if (searchModule && item.module !== searchModule) return false
      if (searchResourceId && item.resourceId !== searchResourceId) return false
      if (dateRange) {
        const [start, end] = dateRange
        const itemDate = dayjs(item.requestTime)
        if (itemDate.isBefore(start.startOf('day')) || itemDate.isAfter(end.endOf('day'))) return false
      }
      return true
    })
    setData(filtered)
  }, [searchDesc, searchOperator, searchModule, searchResourceId, dateRange])

  // 下拉选项：从所有日志中提取
  const filterOptions = useMemo(() => {
    const apiDescSet = new Set<string>()
    const operatorSet = new Set<string>()
    const moduleSet = new Set<string>()

    mockData.forEach(r => {
      apiDescSet.add(r.apiDesc)
      operatorSet.add(r.operator)
      moduleSet.add(r.module)
    })

    return {
      apiDesc: Array.from(apiDescSet).map(v => ({ label: v, value: v })),
      operator: Array.from(operatorSet).map(v => ({ label: v, value: v })),
      module: Array.from(moduleSet).map(v => ({ label: v, value: v }))
    }
  }, [])

  // 格式化时间为 MM-DD HH:mm
  const formatTime = (timeStr: string): string => {
    return dayjs(timeStr).format('MM-DD HH:mm')
  }

  // 交互：查看详情
  const onViewDetail = (record: LogRow): void => {
    const idx = filteredList.findIndex(item => item.id === record.id)
    setCurrentIndex(idx)
    setCurrent(record)
    setOpen(true)
  }

  // 交互：上一条
  const onPrevious = (): void => {
    if (currentIndex > 0) {
      const prevRecord = filteredList[currentIndex - 1]
      setCurrentIndex(currentIndex - 1)
      setCurrent(prevRecord)
    }
  }

  // 交互：下一条
  const onNext = (): void => {
    if (currentIndex < filteredList.length - 1) {
      const nextRecord = filteredList[currentIndex + 1]
      setCurrentIndex(currentIndex + 1)
      setCurrent(nextRecord)
    }
  }

  const columns: TableColumnsType<LogRow> = [
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 140
    },
    {
      title: 'API描述',
      dataIndex: 'apiDesc',
      key: 'apiDesc',
      width: 200,
      render: (text: string, record: LogRow) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto', textAlign: 'left' }}
          onClick={() => onViewDetail(record)}
        >
          {text}
        </Button>
      )
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 180
    },
    {
      title: '操作时间',
      key: 'requestTime',
      width: 110,
      render: (_: unknown, record: LogRow) => formatTime(record.requestTime)
    },
    {
      title: '状态',
      key: 'status',
      width: 70,
      align: 'center',
      render: (_: unknown, record: LogRow) => (
        record.status >= 400 ? '❌' : '✅'
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: LogRow) => (
        <Button type="link" size="small" onClick={() => onViewDetail(record)}>
          详情
        </Button>
      )
    }
  ]

  return (
    <div>
      {/* 筛选条件卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Title level={4} style={{ margin: 0 }}>操作日志</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <Select
              allowClear
              showSearch
              placeholder="API描述"
              optionFilterProp="label"
              style={{ width: 200 }}
              options={filterOptions.apiDesc}
              value={searchDesc}
              onChange={setSearchDesc}
            />
            <Select
              allowClear
              showSearch
              placeholder="操作人"
              optionFilterProp="label"
              style={{ width: 180 }}
              options={filterOptions.operator}
              value={searchOperator}
              onChange={setSearchOperator}
            />
            <Select
              allowClear
              placeholder="模块"
              style={{ width: 140 }}
              options={filterOptions.module}
              value={searchModule}
              onChange={setSearchModule}
            />
            <Input
              placeholder="资源ID"
              style={{ width: 140 }}
              value={searchResourceId}
              onChange={(e) => setSearchResourceId(e.target.value)}
              allowClear
            />
            <RangePicker
              value={dateRange}
              style={{ width: 280 }}
              onChange={onRangeChange}
              placeholder={['开始时间', '结束时间']}
            />
            <Button type="primary" onClick={onApplyFilter}>查询</Button>
            <Button onClick={onReset}>重置</Button>
          </div>
        </div>
      </Card>

      {/* 数据列表 */}
      <Card>
        {data.length === 0 ? (
          <Empty description="暂无操作日志" />
        ) : (
          <Table<LogRow>
            columns={columns}
            dataSource={data}
            rowKey={(r) => r.id}
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
          />
        )}
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>操作日志详情</span>
            <Space>
              <Button
                type="text"
                size="small"
                disabled={currentIndex <= 0}
                onClick={onPrevious}
                title="上一条"
              >
                ↑ 上一条
              </Button>
              <Button
                type="text"
                size="small"
                disabled={currentIndex >= filteredList.length - 1 || currentIndex < 0}
                onClick={onNext}
                title="下一条"
              >
                ↓ 下一条
              </Button>
            </Space>
          </div>
        }
        open={open}
        onClose={() => setOpen(false)}
        width={800}
      >
        {current && (
          <div>
            {/* 基本信息 */}
            <Title level={5} style={{ marginTop: 0 }}>基本信息</Title>
            <div style={{ background: 'rgba(15, 23, 42, 0.02)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">API：</Text></Col>
                <Col span={16}><Text code>{current.api}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">API描述：</Text></Col>
                <Col span={16}><Text>{current.apiDesc}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">响应状态：</Text></Col>
                <Col span={16}>
                  {current.status >= 400 ? (
                    <Tag color="error">❌ {current.status}</Tag>
                  ) : (
                    <Tag color="success">✅ {current.status}</Tag>
                  )}
                </Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">操作时间：</Text></Col>
                <Col span={16}><Text>{current.requestTime}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">操作人：</Text></Col>
                <Col span={16}><Text>{current.operator}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">操作人角色：</Text></Col>
                <Col span={16}><Text>{current.operatorRole || '-'}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">访问IP：</Text></Col>
                <Col span={16}><Text>{current.clientIp}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">访问设备：</Text></Col>
                <Col span={16}><Text style={{ fontSize: 12 }}>{current.clientDevice}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">资源类型：</Text></Col>
                <Col span={16}><Text>{current.resourceType || '-'}</Text></Col>
              </Row>
              <Row style={{ marginBottom: 8 }} gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">资源ID：</Text></Col>
                <Col span={16}><Text code>{current.resourceId || '-'}</Text></Col>
              </Row>
              <Row gutter={[8, 8]}>
                <Col span={8}><Text type="secondary">资源名称：</Text></Col>
                <Col span={16}><Text>{current.resourceName || '-'}</Text></Col>
              </Row>
            </div>

            {/* 操作前后对比（仅修改操作显示） */}
            {current.changes && current.changes.length > 0 && (
              <>
                <Title level={5}>操作前后对比</Title>
                <div style={{ marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.04)' }}>
                        <th style={{ padding: 8, textAlign: 'left', border: '1px solid rgba(148, 163, 184, 0.22)' }}>字段</th>
                        <th style={{ padding: 8, textAlign: 'left', border: '1px solid rgba(148, 163, 184, 0.22)' }}>操作前</th>
                        <th style={{ padding: 8, textAlign: 'left', border: '1px solid rgba(148, 163, 184, 0.22)' }}>操作后</th>
                        <th style={{ padding: 8, textAlign: 'center', border: '1px solid rgba(148, 163, 184, 0.22)' }}>变更</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.changes.map((change, idx) => {
                        const hasChange = String(change.before) !== String(change.after)
                        return (
                          <tr key={idx}>
                            <td style={{ padding: 8, border: '1px solid rgba(148, 163, 184, 0.22)' }}>{change.field}</td>
                            <td style={{ padding: 8, border: '1px solid rgba(148, 163, 184, 0.22)' }}>{String(change.before)}</td>
                            <td style={{ padding: 8, border: '1px solid rgba(148, 163, 184, 0.22)' }}>{String(change.after)}</td>
                            <td style={{ padding: 8, textAlign: 'center', border: '1px solid rgba(148, 163, 184, 0.22)' }}>
                              {hasChange ? '✨' : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 接口请求参数 */}
            <Title level={5}>接口请求参数</Title>
            <div style={{ marginBottom: 16 }}>
              <pre style={{
                background: '#1c2023',
                color: '#f3f4f5',
                padding: 12,
                borderRadius: 6,
                overflow: 'auto',
                fontSize: 13,
                maxHeight: 200
              }}>
                {JSON.stringify(current.requestParams, null, 2)}
              </pre>
            </div>

            {/* 接口响应Body */}
            <Title level={5}>接口响应Body</Title>
            <div>
              <pre style={{
                background: '#1c2023',
                color: '#f3f4f5',
                padding: 12,
                borderRadius: 6,
                overflow: 'auto',
                fontSize: 13,
                maxHeight: 200
              }}>
                {JSON.stringify(current.responseBody, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
