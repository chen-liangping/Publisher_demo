'use client'

import React, { useMemo, useState } from 'react'
import {
  Card,
  Typography,
  Space,
  Button,
  Table,
  Badge,
  Tooltip,
  Switch,
  Dropdown,
  Drawer,
  Form,
  Input,
  Select,
  InputNumber,
  Descriptions
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  QuestionCircleOutlined,
  MoreOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

type TaskRunStatus = 'success' | 'error' | 'warning'

interface TaskItem {
  id: string
  name: string
  entrypoint: string
  imageVersion: string
  schedule: string
  statusHistory: TaskRunStatus[]
  enabled: boolean
}

interface AddTaskFormValues {
  name: string
  imageRepoName: string
  tag: string
  scheduleType: 'daily' | 'manual'
  hour: number
  minute: number
  entrypoint: string
  concurrencyPolicy: 'Forbid' | 'Allow' | 'Replace'
}

// 这段组件实现了「任务列表」的页面结构，使用了 Ant Design 的 Card、Table、Badge、Switch、Dropdown 等组件
// - 包含标题与说明文案
// - “列表”卡片内含：添加按钮（仅图标）、表格、状态点、开关和更多操作
// - 所有交互（添加、开关、更多操作）都附带注释，说明关键逻辑
export default function Task(): React.ReactElement {
  const [data, setData] = useState<TaskItem[]>([{
    id: 'demo',
    name: 'demo',
    entrypoint: 'echo "demo"',
    imageVersion: 'proxyman:v1.0.5',
    schedule: '每天 0 时 0 分',
    // 这里模拟最近 10 次执行状态历史（红点代表失败）
    statusHistory: ['error','error','success','success','success','error','error','error','error','error'],
    enabled: true
  },{
    id: 'demo2',
    name: 'demo2',
    entrypoint: 'echo "demo2"',
    imageVersion: 'proxyman:v1.0.5',
    schedule: '手动执行',
    // 这里模拟最近 10 次执行状态历史（红点代表失败）
    statusHistory: ['success','success','error','error','success','success','success','success','success','success'],
    enabled: true
  }])

  // 添加任务 Drawer 状态
  const [addOpen, setAddOpen] = useState(false)
  const [form] = Form.useForm<AddTaskFormValues>()
  const scheduleType = Form.useWatch('scheduleType', form) as 'daily' | 'manual' | undefined

  // 详情 Drawer 状态
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  // 打开添加任务 Drawer
  const handleAdd = () => {
    // 交互说明：点击添加打开 Drawer 表单
    setAddOpen(true)
  }

  // 提交添加任务
  const handleSubmitAdd = async () => {
    // 交互说明：校验表单并写入表格数据
    const values = await form.validateFields()
    const scheduleText = values.scheduleType === 'manual' ? '手动执行' : `每天 ${values.hour} 时 ${values.minute} 分`
    const newTask: TaskItem = {
      id: `${values.name}-${Date.now()}`,
      name: values.name,
      entrypoint: values.entrypoint,
      imageVersion: `${values.imageRepoName}:${values.tag}`,
      schedule: scheduleText,
      statusHistory: ['success','success','success','success','success','success','success','success','success','success'],
      enabled: true
    }
    setData(prev => [newTask, ...prev])
    setAddOpen(false)
    form.resetFields()
  }

  // 关闭添加任务 Drawer
  const handleCloseAdd = () => {
    setAddOpen(false)
  }

  // 开关启用状态：更新行数据
  const handleToggleEnabled = (recordId: string, nextEnabled: boolean) => {
    setData(prev => prev.map(item => item.id === recordId ? { ...item, enabled: nextEnabled } : item))
  }

  // 更多操作菜单项
  const moreMenuItems = useMemo(() => ([
    { key: 'view', label: '查看记录' },
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除' }
  ]), [])

  // 处理更多操作
  const handleMoreAction = (key: string, record: TaskItem) => {
    if (key === 'view') {
      // 打开任务详情 Drawer
      setDetailTask(record)
      setDetailOpen(true)
      return
    }
    if (key === 'run-once') {
      // 交互说明：执行一次，模拟在历史前端追加一个成功或失败点
      setData(prev => prev.map(item => {
        if (item.id !== record.id) return item
        const nextStatus: TaskRunStatus = Math.random() > 0.5 ? 'success' : 'error'
        const updated = [nextStatus, ...item.statusHistory]
        return { ...item, statusHistory: updated.slice(0, 10) }
      }))
      return
    }
    if (key === 'edit') {
      // 打开编辑：预填表单并进入添加 Drawer 模式
      form.setFieldsValue({
        name: record.name,
        imageRepoName: record.imageVersion.split(':')[0],
        tag: record.imageVersion.split(':')[1] || 'latest',
        scheduleType: record.schedule === '手动执行' ? 'manual' : 'daily',
        hour: record.schedule === '手动执行' ? 0 : extractHour(record.schedule),
        minute: record.schedule === '手动执行' ? 0 : extractMinute(record.schedule),
        entrypoint: record.entrypoint,
        concurrencyPolicy: 'Forbid'
      })
      setAddOpen(true)
      return
    }
    if (key === 'delete') {
      setData(prev => prev.filter(item => item.id !== record.id))
      return
    }
  }

  // 从文本提取时/分（例如："每天 0 时 0 分"）
  const extractHour = (text: string): number => {
    const match = text.match(/每天\s+(\d+)\s+时/)
    return match ? Number(match[1]) : 0
  }
  const extractMinute = (text: string): number => {
    const match = text.match(/时\s+(\d+)\s+分/)
    return match ? Number(match[1]) : 0
  }

  const columns: ColumnsType<TaskItem> = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 140 },
    {
      title: (
        <Space size={4}>
          <span>启动命令ENTRYPOINT</span>
          <Tooltip title="容器启动时执行的命令">
            <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'entrypoint',
      key: 'entrypoint',
      width: 260,
      render: (text: string) => <Text code>{text}</Text>
    },
    { title: '镜像版本', dataIndex: 'imageVersion', key: 'imageVersion', width: 200 },
    { title: '执行计划（北京时间）', dataIndex: 'schedule', key: 'schedule', width: 180 },
    {
      title: (
        <Space size={4}>
          <span>执行状态</span>
          <Tooltip title="近期多次执行的状态（绿=成功，红=失败，黄=警告）">
            <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
          </Tooltip>
        </Space>
      ),
      key: 'statusHistory',
      width: 180,
      render: (_: unknown, record: TaskItem) => (
        <Space size={4}>
          {record.statusHistory.map((s, idx) => {
            if (s === 'success') return <Badge key={idx} status="success" />
            if (s === 'warning') return <Badge key={idx} status="warning" />
            return <Badge key={idx} status="error" />
          })}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: unknown, record: TaskItem) => (
        <Space size={12}>
          {/* 当为“手动执行”时，开关替换为“执行任务”按钮；否则保留开关 */}
          {record.schedule === '手动执行' ? (
            <Button type="link" onClick={() => handleMoreAction('run-once', record)}>执行任务</Button>
          ) : (
            <Switch
              checked={record.enabled}
              onChange={(checked) => handleToggleEnabled(record.id, checked)}
            />
          )}
          {/* 仅图标按钮：更多操作（查看记录、编辑、删除） */}
          <Dropdown
            menu={{
              items: moreMenuItems,
              onClick: ({ key }) => handleMoreAction(String(key), record)
            }}
            trigger={['click']}
          >
            <Tooltip title="更多">
              <Button type="text" shape="circle" icon={<MoreOutlined />} />
            </Tooltip>
          </Dropdown>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>任务</Title>
          <Text type="secondary">
            可按设定周期或手动触发执行任务（如重启服务、备份数据、清理缓存、更新配置），支持并发控制与失败重试，保障服务稳定性并提升运维效率。
          </Text>
        </div>
      </div>
      <Card
        style={{ marginTop: 16 }}
        title={<span style={{ fontSize: 18 }}>列表</span>}
        extra={
          // 仅图标添加按钮：遵循“图标代替文字”的界面偏好
          <Tooltip title="添加">
            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              aria-label="添加任务"
            />
          </Tooltip>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: 980 }}
        />
      </Card>
      {/* 添加任务 Drawer */}
      <Drawer
        title={
          <div style={{ position: 'relative' }}>
            新增任务
          </div>
        }
        width={520}
        open={addOpen}
        onClose={handleCloseAdd}
        destroyOnClose
        extra={null}
        footer={
          <Space>
            <Button type="primary" onClick={handleSubmitAdd}>确 定</Button>
            <Button onClick={handleCloseAdd}>关 闭</Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            imageRepoName: 'proxyman',
            tag: 'v1.0.5',
          scheduleType: 'daily',
            hour: 0,
            minute: 0,
            concurrencyPolicy: 'Forbid'
          }}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-z0-9-]+$/, message: '仅支持小写英文/数字/-' }]}
          >
            <Input placeholder="请输入小写英文或数字或-" />
          </Form.Item>

          <Form.Item label="镜像" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="imageRepoName" noStyle rules={[{ required: true, message: '请选择仓库' }]}> 
                <Select
                  placeholder="请选择仓库"
                  options={[
                    { value: 'proxyman', label: 'proxyman' },
                    { value: 'publisher', label: 'publisher' },
                    { value: 'tools', label: 'tools' }
                  ]}
                  showSearch
                />
              </Form.Item>
              <Form.Item name="tag" noStyle rules={[{ required: true, message: '请选择镜像版本' }]}> 
                <Select
                  allowClear
                  placeholder="请选择镜像版本"
                  options={[
                    { value: 'v1.0.5', label: 'v1.0.5' },
                    { value: 'v1.0.6', label: 'v1.0.6' },
                    { value: 'latest', label: 'latest' }
                  ]}
                  showSearch
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="执行计划" required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <Form.Item name="scheduleType" noStyle rules={[{ required: true, message: '请选择执行计划' }]}> 
                  <Select
                    placeholder="请选择执行计划"
                    options={[
                      { value: 'daily', label: '每天定时执行（北京时间）' },
                      { value: 'manual', label: '手动执行' }
                    ]}
                    style={{ width: 240 }}
                  />
                </Form.Item>
                {scheduleType !== 'manual' && (
                  <>
                    <Space.Compact>
                      <Button disabled style={{ color: 'rgba(0,0,0,0.88)', cursor: 'default' }}>每 天</Button>
                      <Form.Item name="hour" noStyle rules={[{ required: true, message: '请输入时' }]}> 
                        <InputNumber min={0} max={23} />
                      </Form.Item>
                      <div className="g123-input-number-group-addon">时</div>
                    </Space.Compact>
                    <Space.Compact>
                      <Form.Item name="minute" noStyle rules={[{ required: true, message: '请输入分' }]}> 
                        <InputNumber min={0} max={59} />
                      </Form.Item>
                      <div className="g123-input-number-group-addon">分</div>
                      <Button disabled style={{ color: 'rgba(0,0,0,0.88)', cursor: 'default' }}>定时执行</Button>
                    </Space.Compact>
                  </>
                )}
              </div>
              {scheduleType !== 'manual' && (
                <div>
                  <a target="_blank" rel="noreferrer">预览执行时间（最近7次）</a>
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item
            label={
              <Space size={4}>
                <span>启动命令ENTRYPOINT</span>
                <Tooltip title="容器启动时执行的命令">
                  <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
                </Tooltip>
              </Space>
            }
            name="entrypoint"
            rules={[{ required: true, message: '请输入启动命令' }]}
          >
            <Input placeholder="使用空格分隔，例：executable param1 param2" />
          </Form.Item>

          {scheduleType !== 'manual' && (
            <Form.Item label="并发逻辑" name="concurrencyPolicy">
              <Select
                options={[
                  { value: 'Forbid', label: '阻止并发' },
                  { value: 'Allow', label: '允许并发' },
                  { value: 'Replace', label: '替换并发' }
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>
      {/* 任务详情 Drawer */}
      <Drawer
        title={
          <div style={{ position: 'relative' }}>
            查看记录
          </div>
        }
        width={640}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setDetailOpen(false)}>关 闭</Button>
          </Space>
        }
      >
        {detailTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="名称">{detailTask.name}</Descriptions.Item>
              <Descriptions.Item label="镜像版本">{detailTask.imageVersion}</Descriptions.Item>
              <Descriptions.Item label="执行计划">{detailTask.schedule}</Descriptions.Item>
              {detailTask.schedule !== '手动执行' && (
                <Descriptions.Item label="并发逻辑">阻止并发</Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                <Space size={4}>
                  <span>启动命令ENTRYPOINT</span>
                  <Tooltip title="容器启动时执行的命令">
                    <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
                  </Tooltip>
                </Space>
              </Typography.Title>
              <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: '16px 24px', fontSize: 13, border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Menlo, Consolas, "Courier New", monospace, system-ui' }}>
                <span style={{ color: 'rgba(0,0,0,0.45)' }}>$ </span>{detailTask.entrypoint}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>执行记录</Typography.Title>
              <Table
                size="small"
                rowKey={(r) => r.key}
                columns={[
                  { title: '开始时间（北京时间）', dataIndex: 'start', key: 'start', width: 220 },
                  { title: '结束时间（北京时间）', dataIndex: 'end', key: 'end', width: 220 },
                  { title: '运行状态', dataIndex: 'status', key: 'status', width: 120 }
                ]}
                dataSource={buildRecentRecords()}
                pagination={false}
                scroll={{ x: 580 }}
              />
            </div>

            <div>
              <Space>
                <Text>更多信息请前往</Text>
                <a href="https://publisher.grafana.net/" target="_blank" rel="noopener noreferrer">Grafana</a>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// 构建最近 7 天 00:00:00 的执行记录（示例数据，状态故障）
function buildRecentRecords(): Array<{ key: string, start: string, end: string, status: React.ReactNode }> {
  const results: Array<{ key: string, start: string, end: string, status: React.ReactNode }> = []
  const now = new Date()
  for (let i = 9; i >= 1; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - (10 - i))
    d.setHours(0, 0, 0, 0)
    const start = formatDateTime(d)
    results.push({
      key: String(d.getTime()),
      start,
      end: '1970-01-01 08:00:00',
      status: (
        <Space>
          <Badge status="error" />
          <span>故障</span>
        </Space>
      )
    })
  }
  return results
}

function formatDateTime(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

