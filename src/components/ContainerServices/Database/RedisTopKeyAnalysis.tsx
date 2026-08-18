'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import {
  Drawer,
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Switch,
  Row,
  Col,
  Tabs,
  Radio,
  DatePicker,
  Alert,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TabsProps } from 'antd'
import {
  ReloadOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  FireOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import {
  generateMockBigKeysByElement,
  generateMockBigKeysByMemory,
  generateMockHotKeysByQPS,
  formatQPS,
  formatElements,
  formatMemory,
  KEY_TYPE_COLOR_MAP,
  KEY_TYPE_LABEL_MAP,
  type BigKeyByElement,
  type BigKeyByMemory,
  type HotKeyByQPS,
  type StatType,
  type DBInstance
} from './redisTopKeyMeta'

const { Title, Text } = Typography
const { Group: RadioGroup } = Radio
const { RangePicker } = DatePicker

interface Props {
  open: boolean
  instance: DBInstance | null
  onClose: () => void
}

export default function RedisTopKeyAnalysis({ open, instance, onClose }: Props) {
  const [messageApi, contextHolder] = message.useMessage()

  // 状态管理
  const [statType, setStatType] = useState<StatType>('realtime')        // 实时/历史
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [bigKeyStatType, setBigKeyStatType] = useState<'element' | 'memory'>('element')  // 大Key统计类型：元素数量/内存占用

  // 历史数据时间范围
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(1, 'hour'),
    dayjs()
  ])

  // 时间范围验证
  const disabledDate = (current: dayjs.Dayjs) => {
    // 限制选择最近5天内的日期
    const now = dayjs()
    const fiveDaysAgo = now.subtract(5, 'day')
    return current && (current.isBefore(fiveDaysAgo, 'day') || current.isAfter(now, 'day'))
  }

  const handleTimeRangeChange = (dates: any) => {
    if (!dates || !dates[0] || !dates[1]) return

    const [start, end] = dates
    const durationHours = end.diff(start, 'hour', true)

    // 检查时间跨度是否超过3小时
    if (durationHours > 3) {
      messageApi?.error('时间跨度不能超过3小时')
      return
    }

    // 检查是否超出最近5天
    const now = dayjs()
    const fiveDaysAgo = now.subtract(5, 'day')
    if (start.isBefore(fiveDaysAgo) || end.isAfter(now)) {
      messageApi?.error('查询范围：最近5天')
      return
    }

    setTimeRange(dates)
  }

  // 数据状态
  const [bigKeysByElement, setBigKeysByElement] = useState<BigKeyByElement[]>([])
  const [bigKeysByMemory, setBigKeysByMemory] = useState<BigKeyByMemory[]>([])
  const [hotKeysByQPS, setHotKeysByQPS] = useState<HotKeyByQPS[]>([])

  // 获取实例信息
  const instanceName = instance?.alias || '未知实例'
  const instanceType = instance?.type || 'Redis'
  const instanceId = instance?.id || ''

  // 加载数据
  const loadData = useCallback(async () => {
    if (!instanceId) return

    setLoading(true)

    // 模拟API请求延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 生成Mock数据
    setBigKeysByElement(generateMockBigKeysByElement(instanceId, 12))
    setBigKeysByMemory(generateMockBigKeysByMemory(instanceId, 12))
    setHotKeysByQPS(generateMockHotKeysByQPS(instanceId, 50))

    setLoading(false)
  }, [instanceId])

  // 初始加载
  useEffect(() => {
    if (open && instanceId) {
      loadData()
    }
  }, [open, instanceId, loadData])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !open) return

    const interval = setInterval(() => {
      loadData()
    }, 5000) // 5秒刷新

    return () => clearInterval(interval)
  }, [autoRefresh, open, loadData])

  // 大Key（子元素数量）表格列定义
  const bigKeyByElementColumns: ColumnsType<BigKeyByElement> = useMemo(() => [
    {
      title: '实例/节点名称',
      key: 'instanceNode',
      width: 150,
      fixed: 'left',
      render: (_: unknown, record: BigKeyByElement) => (
        <Text style={{ fontSize: 12 }}>{record.nodeId || instanceName}</Text>
      )
    },
    {
      title: 'Key名称',
      dataIndex: 'key',
      key: 'key',
      width: 250,
      render: (key: string) => (
        <Text code style={{ fontSize: 12 }}>{key}</Text>
      )
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={KEY_TYPE_COLOR_MAP[type as keyof typeof KEY_TYPE_COLOR_MAP]}>
          {KEY_TYPE_LABEL_MAP[type as keyof typeof KEY_TYPE_LABEL_MAP] || type}
        </Tag>
      )
    },
    {
      title: '元素数量',
      dataIndex: 'elementCount',
      key: 'elementCount',
      width: 120,
      sorter: (a, b) => a.elementCount - b.elementCount,
      render: (count: number) => (
        <Text strong>
          {formatElements(count)}
        </Text>
      )
    },
    {
      title: '数据库',
      dataIndex: 'dbIndex',
      key: 'dbIndex',
      width: 80,
      render: (dbIndex: number) => <Tag>DB{dbIndex}</Tag>
    }
  ], [instanceName])

  // 大Key（按内存占用）表格列定义
  const bigKeyByMemoryColumns: ColumnsType<BigKeyByMemory> = useMemo(() => [
    {
      title: '实例/节点名称',
      key: 'instanceNode',
      width: 150,
      fixed: 'left',
      render: (_: unknown, record: BigKeyByMemory) => (
        <Text style={{ fontSize: 12 }}>{record.nodeId || instanceName}</Text>
      )
    },
    {
      title: 'Key名称',
      dataIndex: 'key',
      key: 'key',
      width: 250,
      render: (key: string) => (
        <Text code style={{ fontSize: 12 }}>{key}</Text>
      )
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={KEY_TYPE_COLOR_MAP[type as keyof typeof KEY_TYPE_COLOR_MAP]}>
          {KEY_TYPE_LABEL_MAP[type as keyof typeof KEY_TYPE_LABEL_MAP] || type}
        </Tag>
      )
    },
    {
      title: '内存占用',
      dataIndex: 'totalMemoryFormatted',
      key: 'totalMemoryFormatted',
      width: 120,
      sorter: (a, b) => a.totalMemory - b.totalMemory,
      render: (formatted: string, record: BigKeyByMemory) => (
        <Text strong style={{ color: record.totalMemory > 500 * 1024 * 1024 ? '#ff4d4f' : '#666' }}>
          {formatted}
        </Text>
      )
    },
    {
      title: '数据库',
      dataIndex: 'dbIndex',
      key: 'dbIndex',
      width: 80,
      render: (dbIndex: number) => <Tag>DB{dbIndex}</Tag>
    }
  ], [instanceName])

  // 热Key（按QPS）表格列定义
  const hotKeyByQPSColumns: ColumnsType<HotKeyByQPS> = useMemo(() => [
    {
      title: '实例/节点名称',
      key: 'instanceNode',
      width: 150,
      fixed: 'left',
      render: (_: unknown, record: HotKeyByQPS) => (
        <Text style={{ fontSize: 12 }}>{record.nodeId || instanceName}</Text>
      )
    },
    {
      title: 'Key名称',
      dataIndex: 'key',
      key: 'key',
      width: 250,
      render: (key: string) => (
        <Text code style={{ fontSize: 12 }}>{key}</Text>
      )
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={KEY_TYPE_COLOR_MAP[type as keyof typeof KEY_TYPE_COLOR_MAP]}>
          {KEY_TYPE_LABEL_MAP[type as keyof typeof KEY_TYPE_LABEL_MAP] || type}
        </Tag>
      )
    },
    {
      title: 'QPS',
      dataIndex: 'qps',
      key: 'qps',
      width: 100,
      sorter: (a, b) => a.qps - b.qps,
      render: (qps: number) => (
        <Text strong style={{ color: qps > 10000 ? '#ff4d4f' : qps > 5000 ? '#faad14' : '#52c41a' }}>
          {formatQPS(qps)}
        </Text>
      )
    },
    {
      title: '数据库',
      dataIndex: 'dbIndex',
      key: 'dbIndex',
      width: 80,
      render: (dbIndex: number) => <Tag>DB{dbIndex}</Tag>
    }
  ], [instanceName])

  // Tab内容配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'hotkey',
      label: (
        <Space size="small" style={{ fontSize: 14 }}>
          <FireOutlined />
          热Key统计
        </Space>
      ),
      children: (
        <Card
          title={
            <Space style={{ fontSize: 14 }}>
              <span>热Key统计</span>
              <Tooltip title="当Redis内存使用率升高或CPU使用率升高时，使用该功能快速找到热Key">
                <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
              </Tooltip>
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              刷新
            </Button>
          }
        >
          {/* 说明信息 */}
          <Alert
            message="统计每秒查询次数（QPS）超过阈值的Key，默认阈值为5000"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 数据表格 */}
          <Table<HotKeyByQPS>
            rowKey="key"
            columns={hotKeyByQPSColumns}
            dataSource={hotKeysByQPS}
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`
            }}
            scroll={{ x: 1050 }}
          />
        </Card>
      )
    },
    {
      key: 'bigkey',
      label: (
        <Space size="small" style={{ fontSize: 14 }}>
          <DatabaseOutlined />
          大Key统计
        </Space>
      ),
      children: (
        <Card
          title={
            <Space style={{ fontSize: 14 }}>
              <span>大Key统计</span>
              <Tooltip title="当Redis内存使用率升高或CPU使用率升高时，使用该功能快速找到大Key">
                <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
              </Tooltip>
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              刷新
            </Button>
          }
        >
          {/* 大Key统计类型切换 */}
          <RadioGroup
            value={bigKeyStatType}
            onChange={(e) => setBigKeyStatType(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <Radio.Button value="element">按元素数量</Radio.Button>
            <Radio.Button value="memory">按内存占用</Radio.Button>
          </RadioGroup>

          {/* 大Key统计说明 */}
          <Alert
            message={
              bigKeyStatType === 'element'
                ? '统计元素数量超过阈值的Key，默认阈值为2000'
                : '统计内存占用超过阈值的Key，默认总内存阈值为500MB，字段内存阈值为1MB'
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 数据表格 */}
          {bigKeyStatType === 'element' ? (
            <Table<BigKeyByElement>
              rowKey="key"
              columns={bigKeyByElementColumns}
              dataSource={bigKeysByElement}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`
              }}
              scroll={{ x: 1050 }}
            />
          ) : (
            <Table<BigKeyByMemory>
              rowKey="key"
              columns={bigKeyByMemoryColumns}
              dataSource={bigKeysByMemory}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`
              }}
              scroll={{ x: 1000 }}
            />
          )}
        </Card>
      )
    }
  ]

  return (
    <>
      {contextHolder}

      <Drawer
        title={
          <Space size="middle">
            <LineChartOutlined style={{ color: '#1890ff', fontSize: 18 }} />
            <span>Top Key 统计 - {instanceName}</span>
            <Tag color="blue">{instanceType}</Tag>
          </Space>
        }
        placement="right"
        width="90%"
        open={open}
        onClose={onClose}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 控制区 */}
          <Card styles={{ body: { padding: 12 } }}>
            <Row gutter={[16, 12]} align="middle">
              <Col>
                <Space align="center">
                  <Text type="secondary">统计类型：</Text>
                  <RadioGroup
                    value={statType}
                    onChange={(e) => setStatType(e.target.value)}
                    size="small"
                  >
                    <Radio.Button value="realtime">实时数据</Radio.Button>
                    <Radio.Button value="history">历史数据</Radio.Button>
                  </RadioGroup>
                </Space>
              </Col>
              {statType === 'history' && (
                <Col>
                  <Space align="center">
                    <Text type="secondary">查询时间：</Text>
                    <RangePicker
                      showTime={{ format: 'HH:mm:ss' }}
                      format="YYYY-MM-DD HH:mm:ss"
                      value={timeRange}
                      onChange={handleTimeRangeChange}
                      disabledDate={disabledDate}
                      placeholder={['开始时间', '结束时间']}
                      style={{ width: 380 }}
                    />
                    <Tooltip title="查询范围：最近5天，单次查询不超过3小时">
                      <QuestionCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  </Space>
                </Col>
              )}
              <Col flex="auto" />
              <Col>
                <Space align="center">
                  <Text type="secondary">自动刷新：</Text>
                  <Switch
                    checked={autoRefresh}
                    onChange={setAutoRefresh}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                    disabled={statType === 'history'}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 主要统计内容 */}
          <Tabs
            defaultActiveKey="bigkey"
            items={tabItems}
            size="large"
          />
        </Space>
      </Drawer>
    </>
  )
}
