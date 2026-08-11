'use client'

import React, { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
  Modal,
  Input,
  Select,
  message,
  Spin,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from '@ant-design/icons'

const { Text, Title, Paragraph } = Typography

// ==================== 类型定义 ====================

type ProgramState = 'running' | 'stopped' | 'starting' | 'stopping' | 'unknown'

interface Program {
  id: string
  name: string
  desiredState: ProgramState
  actualState: ProgramState
  pid?: number
  cpuPercent: number
  memoryMB: number
  uptimeSeconds?: number
  restartCount: number
  lastEvent?: string
  command: string
}

interface RunningProcess {
  pid: number
  comm: string
  cmdline: string
  user: string
  cwd: string
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

interface InstanceDetailProps {
  instanceId: string
  onBack: () => void
  env: 'stg' | 'prod'
}

// ==================== 状态主题配置 ====================

type StatusTheme = {
  dotInner: string
  dotOuter: string
  text: string
  border: string
}

type StatusPaletteKey = 'success' | 'danger' | 'primary' | 'warning' | 'neutral' | 'error'

const STATUS_PALETTE: Record<StatusPaletteKey, StatusTheme> = {
  success: {
    dotInner: '#52C41A',
    dotOuter: '#D9F7BE',
    text: '#52C41A',
    border: '#F0F0F0',
  },
  danger: {
    dotInner: '#F5222D',
    dotOuter: '#FFF1F0',
    text: '#F5222D',
    border: '#F5222D',
  },
  primary: {
    dotInner: '#2F54EB',
    dotOuter: '#F0F5FF',
    text: '#2F54EB',
    border: '#85A5FF',
  },
  warning: {
    dotInner: '#FADB14',
    dotOuter: '#FFFFB8',
    text: '#FADB14',
    border: '#D4B106',
  },
  neutral: {
    dotInner: 'rgba(0, 0, 0, 0.65)',
    dotOuter: 'rgba(0, 0, 0, 0.15)',
    text: 'rgba(0, 0, 0, 0.65)',
    border: 'rgba(0, 0, 0, 0.15)',
  },
  error: {
    dotInner: '#F5222D',
    dotOuter: '#FFF1F0',
    text: '#F5222D',
    border: '#FFA39E',
  },
}

// 程序状态映射
const programStateThemeMap: Record<ProgramState, StatusTheme> = {
  running: STATUS_PALETTE.success,
  stopped: STATUS_PALETTE.neutral,
  starting: STATUS_PALETTE.primary,
  stopping: STATUS_PALETTE.danger,
  unknown: STATUS_PALETTE.error,
}

const programStateConfig: Record<
  ProgramState,
  { label: string }
> = {
  running: { label: '运行中' },
  stopped: { label: '已停止' },
  starting: { label: '启动中' },
  stopping: { label: '停止中' },
  unknown: { label: '未知' },
}

const isProgramProcessing = (state: ProgramState) =>
  state === 'starting' || state === 'stopping'

// ==================== 状态组件 ====================

interface StatusDotProps {
  theme: StatusTheme
}

const StatusDot = ({ theme }: StatusDotProps) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 12,
      height: 12,
      background: theme.dotOuter,
      borderRadius: '50%',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        background: theme.dotInner,
        borderRadius: '50%',
      }}
    />
  </span>
)

interface ProgramStatusBadgeProps {
  state: ProgramState
}

const ProgramStatusBadge = ({ state }: ProgramStatusBadgeProps) => {
  const theme = programStateThemeMap[state]
  const config = programStateConfig[state]
  const processing = isProgramProcessing(state)

  if (processing) {
    return (
      <Space size={4}>
        <LoadingOutlined style={{ color: theme.text }} />
        <Text style={{ color: theme.text }}>{config.label}</Text>
      </Space>
    )
  }

  return (
    <Space size={6}>
      <StatusDot theme={theme} />
      <Text style={{ color: theme.text }}>{config.label}</Text>
    </Space>
  )
}

// ==================== Mock 数据 ====================

const mockPrograms: Program[] = [
  {
    id: 'gamesrv',
    name: 'gamesrv',
    desiredState: 'running',
    actualState: 'running',
    pid: 12345,
    cpuPercent: 12.5,
    memoryMB: 512,
    uptimeSeconds: 86400 * 2 + 3600,
    restartCount: 0,
    lastEvent: '运行正常',
    command: './gamesrv --config ./config/prod.yaml',
  },
  {
    id: 'nginx',
    name: 'nginx',
    desiredState: 'running',
    actualState: 'running',
    pid: 6789,
    cpuPercent: 0.5,
    memoryMB: 64,
    uptimeSeconds: 86400 * 7,
    restartCount: 0,
    lastEvent: '运行正常',
    command: 'nginx -g "daemon off;"',
  },
  {
    id: 'redis',
    name: 'redis',
    desiredState: 'running',
    actualState: 'running',
    pid: 7890,
    cpuPercent: 2.3,
    memoryMB: 128,
    uptimeSeconds: 3600 * 48,
    restartCount: 1,
    lastEvent: '已重启1次',
    command: 'redis-server /etc/redis.conf',
  },
  {
    id: 'backup-job',
    name: 'backup-job',
    desiredState: 'stopped',
    actualState: 'stopped',
    cpuPercent: 0,
    memoryMB: 0,
    uptimeSeconds: 0,
    restartCount: 0,
    lastEvent: '已停止',
    command: '/usr/local/bin/backup.sh',
  },
]

const mockRunningProcesses: RunningProcess[] = [
  {
    pid: 12345,
    comm: 'gamesrv',
    cmdline: './gamesrv --config ./config/prod.yaml',
    user: 'game',
    cwd: '/data/game/server',
  },
  {
    pid: 6789,
    comm: 'nginx',
    cmdline: 'nginx: master process',
    user: 'root',
    cwd: '/etc/nginx',
  },
  {
    pid: 6790,
    comm: 'nginx',
    cmdline: 'nginx: worker process',
    user: 'nginx',
    cwd: '/etc/nginx',
  },
  {
    pid: 7890,
    comm: 'redis-server',
    cmdline: 'redis-server *:6379',
    user: 'redis',
    cwd: '/var/lib/redis',
  },
  {
    pid: 1001,
    comm: 'sshd',
    cmdline: 'sshd: /usr/sbin/sshd -D [listener] 0.0.0.0:22',
    user: 'root',
    cwd: '/var/run/sshd',
  },
  {
    pid: 1002,
    comm: 'systemd',
    cmdline: '/sbin/init',
    user: 'root',
    cwd: '/',
  },
]

const mockLogs: LogEntry[] = [
  { timestamp: '2026-08-11 10:30:00', level: 'info', message: 'Server started on port 7001' },
  { timestamp: '2026-08-11 10:30:01', level: 'info', message: 'Connected to database' },
  { timestamp: '2026-08-11 10:30:02', level: 'info', message: 'Loading game configuration...' },
  { timestamp: '2026-08-11 10:30:03', level: 'info', message: 'Configuration loaded successfully' },
  { timestamp: '2026-08-11 10:30:04', level: 'info', message: 'Game server is ready' },
  { timestamp: '2026-08-11 10:35:12', level: 'warn', message: 'High memory usage detected: 85%' },
  { timestamp: '2026-08-11 10:40:25', level: 'info', message: 'Player joined: player_12345' },
  { timestamp: '2026-08-11 10:45:30', level: 'error', message: 'Connection timeout: db-server-01' },
  { timestamp: '2026-08-11 10:45:31', level: 'info', message: 'Retrying database connection...' },
  { timestamp: '2026-08-11 10:45:32', level: 'info', message: 'Database connection restored' },
]

// ==================== 工具函数 ====================

function formatUptime(seconds?: number): string {
  if (seconds === undefined || seconds === 0) return '-'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分钟`)

  return parts.join('') || '0分钟'
}

function formatMemory(mb: number): string {
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

// ==================== 主组件 ====================

export default function ProcessAgentInstanceDetail({
  instanceId,
  onBack,
  env,
}: InstanceDetailProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>(mockPrograms)
  const [runningProcesses, setRunningProcesses] = useState<RunningProcess[]>([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'stg' | 'prod'>(env || 'stg')

  const instanceInfo = {
    instanceId,
    appId: 'gamedemo',
    instanceName: 'web-server-01',
    privateIp: '172.16.0.10',
    online: true,
    lastSeenAt: '2024-01-15 10:30:00',
    agentVersion: 'v1.2.3',
    targetVersion: 'v1.2.3',
  }

  const handleRefresh = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setLoading(false)
    message.success('刷新成功')
  }

  const handleFetchSnapshot = async () => {
    setSnapshotLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setRunningProcesses(mockRunningProcesses)
    setSnapshotLoading(false)
    message.success('进程快照已更新')
  }

  const handleViewLogs = async (program: Program) => {
    setSelectedProgram(program)
    setLogsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setLogs(mockLogs)
    setLogsLoading(false)
  }

  const programColumns: TableColumnsType<Program> = [
    {
      title: 'Program',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '期望状态',
      dataIndex: 'desiredState',
      key: 'desiredState',
      width: 140,
      render: (state: ProgramState) => <ProgramStatusBadge state={state} />,
    },
    {
      title: '实际状态',
      dataIndex: 'actualState',
      key: 'actualState',
      width: 140,
      render: (state: ProgramState, record) => {
        const isMatch = state === record.desiredState
        const mismatchTag = !isMatch ? (
          <Tag color="warning" style={{ marginLeft: 8 }}>不匹配</Tag>
        ) : null
        return (
          <Space>
            <ProgramStatusBadge state={state} />
            {mismatchTag}
          </Space>
        )
      },
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 100,
      render: (pid?: number) => pid ?? '-',
    },
    {
      title: 'CPU',
      dataIndex: 'cpuPercent',
      key: 'cpuPercent',
      width: 100,
      render: (cpu: number, record) => {
        if (record.actualState !== 'running') return '-'
        return `${cpu.toFixed(1)}%`
      },
      sorter: (a, b) => a.cpuPercent - b.cpuPercent,
    },
    {
      title: '内存',
      dataIndex: 'memoryMB',
      key: 'memoryMB',
      width: 100,
      render: (memory: number, record) => {
        if (record.actualState !== 'running') return '-'
        return formatMemory(memory)
      },
      sorter: (a, b) => a.memoryMB - b.memoryMB,
    },
    {
      title: '存活时长',
      dataIndex: 'uptimeSeconds',
      key: 'uptimeSeconds',
      width: 140,
      render: (uptime?: number) => formatUptime(uptime),
      sorter: (a, b) => (a.uptimeSeconds ?? 0) - (b.uptimeSeconds ?? 0),
    },
    {
      title: '重启次数',
      dataIndex: 'restartCount',
      key: 'restartCount',
      width: 100,
      render: (count: number) => {
        if (count === 0) return <Text type="secondary">0</Text>
        return <Text type={count > 3 ? 'danger' : 'warning'}>{count}</Text>
      },
      sorter: (a, b) => a.restartCount - b.restartCount,
    },
    {
      title: '命令',
      dataIndex: 'command',
      key: 'command',
      ellipsis: true,
      render: (command: string) => (
        <Text code style={{ fontSize: 12 }}>{command}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => handleViewLogs(record)}
        >
          日志
        </Button>
      ),
    },
  ]

  const processColumns: TableColumnsType<RunningProcess> = [
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 100,
      render: (pid: number) => <Text code>{pid}</Text>,
    },
    {
      title: '名称',
      dataIndex: 'comm',
      key: 'comm',
      width: 140,
      render: (comm: string) => <Text strong>{comm}</Text>,
    },
    {
      title: '命令行',
      dataIndex: 'cmdline',
      key: 'cmdline',
      ellipsis: true,
      render: (cmdline: string) => (
        <Text code style={{ fontSize: 12 }}>{cmdline}</Text>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 100,
    },
    {
      title: '工作目录',
      dataIndex: 'cwd',
      key: 'cwd',
      width: 200,
      ellipsis: true,
    },
  ]

  const renderInstanceContent = () => (
    <>
      <Card size="small" title="实例信息">
        <Descriptions column={3} size="small">
          <Descriptions.Item label="实例 ID">
            <Text code>{instanceInfo.instanceId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="App ID">
            <Tag>{instanceInfo.appId}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="实例名称">
            {instanceInfo.instanceName}
          </Descriptions.Item>
          <Descriptions.Item label="内网 IP">
            {instanceInfo.privateIp}
          </Descriptions.Item>
          <Descriptions.Item label="在线状态">
            {instanceInfo.online ? (
              <Space size={4}>
                <StatusDot theme={STATUS_PALETTE.success} />
                <Text style={{ color: STATUS_PALETTE.success.text }}>在线</Text>
              </Space>
            ) : (
              <Space size={4}>
                <StatusDot theme={STATUS_PALETTE.neutral} />
                <Text style={{ color: STATUS_PALETTE.neutral.text }}>离线</Text>
              </Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="最后上报">
            <Space size={4}>
              <ClockCircleOutlined style={{ fontSize: 12 }} />
              <Text>{instanceInfo.lastSeenAt}</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Agent 版本">
            <Text code>{instanceInfo.agentVersion}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="目标版本">
            <Text code>{instanceInfo.targetVersion}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        size="small"
        title={
          <Space>
            <PlayCircleOutlined />
            <span>Programs 实时态</span>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={programColumns}
          dataSource={programs}
          pagination={false}
          scroll={{ x: 1400 }}
          size="middle"
          loading={loading}
        />
      </Card>

      <Card
        size="small"
        title={
          <Space>
            <span>主机进程快照</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              （即时请求 agent，约 1-2 秒等待）
            </Text>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleFetchSnapshot}
            loading={snapshotLoading}
          >
            拉取快照
          </Button>
        }
      >
        {runningProcesses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Paragraph type="secondary">
              点击"拉取快照"按钮获取主机进程列表
            </Paragraph>
          </div>
        ) : (
          <Table
            rowKey="pid"
            columns={processColumns}
            dataSource={runningProcesses}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
            size="middle"
          />
        )}
      </Card>

      {selectedProgram && (
        <Card
          size="small"
          title={
            <Space>
              <FileTextOutlined />
              <span>{selectedProgram.name} 日志</span>
            </Space>
          }
          extra={
            <Button onClick={() => setSelectedProgram(null)}>关闭</Button>
          }
        >
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin />
            </div>
          ) : (
            <div
              style={{
                background: '#1e1e1e',
                borderRadius: 6,
                padding: 12,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                    marginBottom: 4,
                    color: log.level === 'error' ? '#f5222d' : '#d4d4d4',
                  }}
                >
                  <span style={{ color: '#858585' }}>[{log.timestamp}]</span>{' '}
                  <Tag
                    color={log.level === 'error' ? 'red' : log.level === 'warn' ? 'orange' : 'blue'}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {log.level.toUpperCase()}
                  </Tag>{' '}
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                返回
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                实例详情
              </Title>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'stg' | 'prod')}
        items={[
          {
            key: 'stg',
            label: '测试环境',
            children: renderInstanceContent(),
          },
          {
            key: 'prod',
            label: '正式环境',
            children: renderInstanceContent(),
          },
        ]}
      />
    </Space>
  )
}
