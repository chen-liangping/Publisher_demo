'use client'

import React, { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

type VmStatus = 'running' | 'stopped' | 'starting' | 'stopping'
type ProcessStatus = 'running' | 'abnormal' | 'restarting' | 'stopped'
type ProcessKind = 'business' | 'system'
type CheckType = 'process' | 'port' | 'http' | 'command'
type StatusFilter = ProcessStatus | 'all'

interface ManagedProcessPanelProps {
  vmName: string
  vmStatus: VmStatus
}

interface ManagedProcess {
  id: string
  name: string
  kind: ProcessKind
  runUser: string
  workingDir: string
  currentCommand: string
  startCommand: string
  checkType: CheckType
  checkValue: string
  logPath: string
  autoRestart: boolean
  status: ProcessStatus
  pid?: number
  cpu: number
  memory: string
  lastChecked: string
  lastEvent: string
  restartCount: number
}

interface AutoRestartFormValues {
  startCommand: string
  checkType: CheckType
  checkValue?: string
}

type ProcessAction = 'restart' | 'start'

const initialProcesses: ManagedProcess[] = [
  {
    id: 'gamesrv',
    name: 'gamesrv',
    kind: 'business',
    runUser: 'game',
    workingDir: '/data/game/server',
    currentCommand: './gamesrv --config ./config/prod.yaml',
    startCommand: 'bash /data/game/server/start.sh',
    checkType: 'port',
    checkValue: '7001',
    logPath: '/data/logs/gamesrv/server.log',
    autoRestart: true,
    status: 'abnormal',
    cpu: 0,
    memory: '0 MB',
    lastChecked: '刚刚',
    lastEvent: '异常，正在自动拉起',
    restartCount: 2,
  },
  {
    id: 'php-fpm',
    name: 'php-fpm',
    kind: 'business',
    runUser: 'www',
    workingDir: '/var/www/html',
    currentCommand: 'php-fpm -y /etc/php-fpm.d/www.conf',
    startCommand: 'systemctl restart php-fpm',
    checkType: 'process',
    checkValue: '',
    logPath: '/var/log/php-fpm/error.log',
    autoRestart: true,
    status: 'running',
    pid: 2345,
    cpu: 8,
    memory: '800 MB',
    lastChecked: '15 秒前',
    lastEvent: '运行正常',
    restartCount: 0,
  },
  {
    id: 'nginx',
    name: 'nginx',
    kind: 'business',
    runUser: 'root',
    workingDir: '/etc/nginx',
    currentCommand: 'nginx -g "daemon off;"',
    startCommand: 'systemctl restart nginx',
    checkType: 'http',
    checkValue: 'http://127.0.0.1/health',
    logPath: '/var/log/nginx/error.log',
    autoRestart: false,
    status: 'running',
    pid: 3456,
    cpu: 3,
    memory: '120 MB',
    lastChecked: '20 秒前',
    lastEvent: '运行正常',
    restartCount: 0,
  },
  {
    id: 'node-chat-api',
    name: 'node-chat-api',
    kind: 'business',
    runUser: 'game',
    workingDir: '/data/apps/chat-api',
    currentCommand: 'node dist/server.js',
    startCommand: 'bash /data/apps/chat-api/start.sh',
    checkType: 'port',
    checkValue: '9000',
    logPath: '/data/logs/chat-api/app.log',
    autoRestart: false,
    status: 'running',
    pid: 4188,
    cpu: 5,
    memory: '256 MB',
    lastChecked: '30 秒前',
    lastEvent: '运行正常',
    restartCount: 0,
  },
  {
    id: 'aliyun-service',
    name: 'aliyun-service',
    kind: 'system',
    runUser: 'root',
    workingDir: '/usr/local/share/aliyun-assist',
    currentCommand: '/usr/local/share/aliyun-assist/aliyun-service',
    startCommand: '',
    checkType: 'process',
    checkValue: '',
    logPath: '/var/log/aliyun-service.log',
    autoRestart: false,
    status: 'running',
    pid: 1063,
    cpu: 0.2,
    memory: '48 MB',
    lastChecked: '45 秒前',
    lastEvent: '系统组件',
    restartCount: 0,
  },
]

const checkTypeOptions = [
  { value: 'process', label: '进程启动即可' },
  { value: 'port', label: '端口可访问' },
  { value: 'http', label: 'HTTP 地址正常' },
  { value: 'command', label: '自定义命令成功' },
]

const checkTypeText: Record<CheckType, string> = {
  process: '进程启动即可',
  port: '端口可访问',
  http: 'HTTP 地址正常',
  command: '自定义命令成功',
}

const statusConfig: Record<
  ProcessStatus,
  { badge: 'success' | 'error' | 'processing' | 'default'; color: string; text: string }
> = {
  running: { badge: 'success', color: 'success', text: '运行中' },
  abnormal: { badge: 'error', color: 'error', text: '异常' },
  restarting: { badge: 'processing', color: 'processing', text: '拉起中' },
  stopped: { badge: 'default', color: 'default', text: '已停止' },
}

const statusFilterOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'abnormal', label: '异常' },
  { value: 'restarting', label: '拉起中' },
  { value: 'stopped', label: '已停止' },
]

const buildLogPreview = (process: ManagedProcess) => {
  const lines = [
    `[2026-07-09 09:25:01] ${process.name} attached, pid=${process.pid ?? '-'}`,
    `[2026-07-09 09:25:02] user=${process.runUser}, cwd=${process.workingDir}`,
    `[2026-07-09 10:12:20] ${process.lastEvent}`,
  ]

  if (process.status === 'abnormal') {
    return [
      ...lines,
      `[2026-07-09 10:12:21] check failed: ${formatRecoveryCheck(process)}`,
      '[2026-07-09 10:12:22] process marked abnormal',
    ].join('\n')
  }

  if (process.status === 'restarting') {
    return [
      ...lines,
      `[2026-07-09 10:12:21] start command: ${process.startCommand}`,
      '[2026-07-09 10:12:22] waiting for process ready',
    ].join('\n')
  }

  return [...lines, `[2026-07-09 10:12:35] check passed: ${formatRecoveryCheck(process)}`].join('\n')
}

const formatRecoveryCheck = (process: ManagedProcess) => {
  if (process.checkType === 'process') return checkTypeText.process
  return `${checkTypeText[process.checkType]}：${process.checkValue}`
}

const getCheckValueLabel = (checkType?: CheckType) => {
  if (checkType === 'port') return '端口'
  if (checkType === 'http') return 'HTTP 地址'
  if (checkType === 'command') return '检查命令'
  return ''
}

const getCheckValuePlaceholder = (checkType?: CheckType) => {
  if (checkType === 'port') return '7001'
  if (checkType === 'http') return 'http://127.0.0.1:8080/health'
  if (checkType === 'command') return 'bash /data/game/server/check.sh'
  return ''
}

export default function ManagedProcessPanel({ vmName, vmStatus }: ManagedProcessPanelProps) {
  const [processes, setProcesses] = useState<ManagedProcess[]>(initialProcesses)
  const [drawerProcess, setDrawerProcess] = useState<ManagedProcess | null>(null)
  const [pendingAction, setPendingAction] = useState<{ process: ManagedProcess; action: ProcessAction } | null>(null)
  const [autoRestartProcess, setAutoRestartProcess] = useState<ManagedProcess | null>(null)
  const [autoRestartForm] = Form.useForm<AutoRestartFormValues>()
  const [processKeyword, setProcessKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const selectedCheckType = Form.useWatch('checkType', autoRestartForm)

  const vmAvailable = vmStatus === 'running'
  const businessProcesses = useMemo(() => processes.filter((item) => item.kind === 'business'), [processes])
  const filteredProcesses = useMemo(() => {
    const keyword = processKeyword.trim().toLowerCase()
    return businessProcesses.filter((item) => {
      const matchName = !keyword || item.name.toLowerCase().includes(keyword)
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      return matchName && matchStatus
    })
  }, [businessProcesses, processKeyword, statusFilter])

  const summary = useMemo(() => {
    const running = businessProcesses.filter((item) => item.status === 'running').length
    const abnormal = businessProcesses.filter((item) => item.status === 'abnormal').length
    return {
      total: businessProcesses.length,
      running,
      abnormal,
    }
  }, [businessProcesses])

  const openAutoRestart = (process: ManagedProcess) => {
    setAutoRestartProcess(process)
    autoRestartForm.setFieldsValue({
      startCommand: process.startCommand || process.currentCommand,
      checkType: process.checkType,
      checkValue: process.checkValue,
    })
  }

  const closeAutoRestart = () => {
    setAutoRestartProcess(null)
    autoRestartForm.resetFields()
  }

  const handleEnableAutoRestart = async () => {
    if (!autoRestartProcess) return

    const values = await autoRestartForm.validateFields()
    setProcesses((current) =>
      current.map((item) =>
        item.id === autoRestartProcess.id
          ? {
              ...item,
              startCommand: values.startCommand,
              checkType: values.checkType,
              checkValue: values.checkType === 'process' ? '' : values.checkValue || '',
              autoRestart: true,
              lastChecked: '刚刚',
              lastEvent: '已开启托管',
            }
          : item,
      ),
    )
    message.success(`${autoRestartProcess.name} 已开启托管`)
    closeAutoRestart()
  }

  const applyProcessAction = (process: ManagedProcess, action: ProcessAction) => {
    setProcesses((current) =>
      current.map((item) =>
        item.id === process.id
          ? {
              ...item,
              status: 'restarting',
              pid: undefined,
              cpu: 0,
              memory: '0 MB',
              lastChecked: '刚刚',
              lastEvent: action === 'restart' ? '正在重启' : '正在自动拉起',
            }
          : item,
      ),
    )

    window.setTimeout(() => {
      setProcesses((current) =>
        current.map((item) =>
          item.id === process.id
            ? {
                ...item,
                status: 'running',
                pid: Math.floor(4000 + Math.random() * 5000),
                cpu: item.name === 'gamesrv' ? 12 : 4,
                memory: item.name === 'gamesrv' ? '1.2 GB' : item.memory === '0 MB' ? '128 MB' : item.memory,
                lastChecked: '刚刚',
                lastEvent: '运行正常',
                restartCount: item.restartCount + 1,
              }
            : item,
        ),
      )
      message.success(`${process.name} 已恢复运行`)
    }, 900)
  }

  const handleConfirmAction = () => {
    if (!pendingAction) return
    applyProcessAction(pendingAction.process, pendingAction.action)
    setPendingAction(null)
  }

  const columns: TableColumnsType<ManagedProcess> = [
    {
      title: '进程',
      dataIndex: 'name',
      width: 180,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: ProcessStatus) => {
        const config = statusConfig[status]
        return <Badge status={config.badge} text={<Tag color={config.color}>{config.text}</Tag>} />
      },
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      width: 100,
      render: (pid?: number) => pid ?? '-',
    },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      width: 90,
      render: (cpu: number) => `${cpu}%`,
      sorter: (a, b) => a.cpu - b.cpu,
    },
    {
      title: '内存',
      dataIndex: 'memory',
      width: 110,
    },
    {
      title: '最后检测',
      dataIndex: 'lastChecked',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      align: 'right',
      render: (_, record) => {
        if (!record.autoRestart) {
          return (
            <Space size={8}>
              <Button
                size="small"
                type="link"
                disabled={!vmAvailable}
                onClick={() => openAutoRestart(record)}
              >
                托管
              </Button>
              <Button size="small" type="link" onClick={() => setDrawerProcess(record)}>
                日志
              </Button>
            </Space>
          )
        }

        if (record.status === 'restarting') {
          return (
            <Space size={8}>
              <Text type="secondary">拉起中</Text>
              <Button size="small" type="link" onClick={() => setDrawerProcess(record)}>
                日志
              </Button>
            </Space>
          )
        }

        if (record.status === 'abnormal' || record.status === 'stopped') {
          return (
            <Space size={8}>
              <Button
                size="small"
                type="link"
                disabled={!vmAvailable}
                onClick={() => setPendingAction({ process: record, action: 'start' })}
              >
                拉起
              </Button>
              <Button size="small" type="link" onClick={() => setDrawerProcess(record)}>
                日志
              </Button>
            </Space>
          )
        }

        return (
          <Space size={8}>
            <Button
              size="small"
              type="link"
              disabled={!vmAvailable}
              onClick={() => setPendingAction({ process: record, action: 'restart' })}
            >
              重启
            </Button>
            <Button size="small" type="link" onClick={() => setDrawerProcess(record)}>
              日志
            </Button>
          </Space>
        )
      },
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">业务进程</Text>
              <Title level={3} style={{ margin: 0 }}>
                {summary.total}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">运行中</Text>
              <Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                {summary.running}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Space direction="vertical" size={2}>
              <Text type="secondary">异常</Text>
              <Title level={3} style={{ margin: 0, color: summary.abnormal > 0 ? '#cf1322' : '#389e0d' }}>
                {summary.abnormal}
              </Title>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={
          <Space>
            <CheckCircleOutlined />
            <span>业务进程</span>
          </Space>
        }
        extra={
          <Space size={8}>
            <Input
              allowClear
              placeholder="搜索进程名称"
              value={processKeyword}
              onChange={(event) => setProcessKeyword(event.target.value)}
              style={{ width: 180 }}
            />
            <Select
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              style={{ width: 120 }}
            />
          </Space>
        }
      >
        {/* 系统进程在后端过滤，页面只展示业务进程和自动获取到的运行指标。 */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredProcesses}
          pagination={false}
          scroll={{ x: 960 }}
          size="middle"
        />
      </Card>

      <Modal
        title={autoRestartProcess ? `开启托管：${autoRestartProcess.name}` : ''}
        open={Boolean(autoRestartProcess)}
        onOk={handleEnableAutoRestart}
        onCancel={closeAutoRestart}
        okText="开启"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        {autoRestartProcess && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="启动用户">{autoRestartProcess.runUser}</Descriptions.Item>
              <Descriptions.Item label="工作目录">{autoRestartProcess.workingDir}</Descriptions.Item>
              <Descriptions.Item label="当前命令">{autoRestartProcess.currentCommand}</Descriptions.Item>
            </Descriptions>

            <Form form={autoRestartForm} layout="vertical">
              <Form.Item
                name="startCommand"
                label="启动命令"
                rules={[{ required: true, message: '请输入启动命令' }]}
              >
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item
                name="checkType"
                label="恢复判断"
                rules={[{ required: true, message: '请选择恢复判断' }]}
              >
                <Select options={checkTypeOptions} />
              </Form.Item>
              {selectedCheckType && selectedCheckType !== 'process' && (
                <Form.Item
                  name="checkValue"
                  label={getCheckValueLabel(selectedCheckType)}
                  rules={[{ required: true, message: `请输入${getCheckValueLabel(selectedCheckType)}` }]}
                >
                  <Input placeholder={getCheckValuePlaceholder(selectedCheckType)} />
                </Form.Item>
              )}
            </Form>
          </Space>
        )}
      </Modal>

      <Modal
        title={pendingAction ? `${pendingAction.action === 'start' ? '拉起' : '重启'} ${pendingAction.process.name}` : ''}
        open={Boolean(pendingAction)}
        onOk={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
        okText="确认"
        cancelText="取消"
      >
        {pendingAction && (
          <Text>
            确认{pendingAction.action === 'start' ? '拉起' : '重启'}{' '}
            <Text strong>{pendingAction.process.name}</Text>？
          </Text>
        )}
      </Modal>

      <Drawer
        title={drawerProcess ? `${drawerProcess.name} 日志` : ''}
        open={Boolean(drawerProcess)}
        onClose={() => setDrawerProcess(null)}
        width={560}
      >
        {drawerProcess && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="状态">
                <Badge status={statusConfig[drawerProcess.status].badge} text={statusConfig[drawerProcess.status].text} />
              </Descriptions.Item>
              <Descriptions.Item label="启动用户">{drawerProcess.runUser}</Descriptions.Item>
              <Descriptions.Item label="工作目录">{drawerProcess.workingDir}</Descriptions.Item>
              <Descriptions.Item label="启动命令">
                {drawerProcess.autoRestart ? drawerProcess.startCommand : '未开启托管'}
              </Descriptions.Item>
              <Descriptions.Item label="恢复判断">{formatRecoveryCheck(drawerProcess)}</Descriptions.Item>
              <Descriptions.Item label="日志">{drawerProcess.logPath}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="最近日志">
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  background: '#111827',
                  color: '#e5e7eb',
                  borderRadius: 6,
                  minHeight: 160,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {buildLogPreview(drawerProcess)}
              </pre>
            </Card>
          </Space>
        )}
      </Drawer>
    </Space>
  )
}
