"use client"
//非游服
import React, { useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Table,
  Tabs,
  Progress,
  Dropdown,
  Descriptions,
  Collapse,
  Drawer,
  Form,
  InputNumber,
  Select,
  Input,
  Modal,
  message,
  Slider,
  Switch
} from 'antd'
import { MoreOutlined, EditOutlined, ReloadOutlined, CopyOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import HPAConfigModal, { type HPAFormValues } from './HPAConfigModal'
import DeploymentRecords, { 
  type DeployGroup as CommonDeployGroup, 
  type DeployConfig as CommonDeployConfig 
} from './DeploymentRecords'
import FileDownload, { type ServerItem, type DownloadInfo } from './FileDownload'

const { Title, Text } = Typography

export default function DeploymentOther({ appId, appName, tags }: { appId?: string; appName?: string; tags?: string[] }) {
  const id = appId ?? 'unknown'
  const [activeKey, setActiveKey] = useState<string>('overview')
  const name = appName ?? 'kumo游服'
  const appTags = tags ?? ['平台']

  // ==================== 基本信息相关 ====================
  // 基本信息数据在组件内直接使用，无需额外状态

  // ==================== 高级配置相关 ====================
  // HPA 配置
  const [hpaVisible, setHpaVisible] = useState<boolean>(false)
  const [hpaForm] = Form.useForm<HPAFormValues>()

  // 高级配置卡片展开/收起状态
  const [advancedConfigExpanded, setAdvancedConfigExpanded] = useState<boolean>(true)

  // ==================== 资源变配相关 ====================
  // 资源类型定义
  interface ResourceItem {
    key: string
    container: string
    image: string
    // cpu 存为字符串展示（例如 "0.1C 可突发至0.4")
    cpu: string
    // memory 存为字符串（例如 "128 Mi")
    memory: string
  }

  // 资源变配数据（从常量改为 state，便于更新）
  const [resources, setResources] = useState<ResourceItem[]>([
    { key: '1', container: 'platform', image: 'platform:v0.1', cpu: '0.1C 可突发至0.4', memory: '128 Mi' },
    { key: '2', container: 'center', image: 'center:v0.2', cpu: '0.3C 可突发至1.2', memory: '768 Mi' }
  ])

  // 资源变配编辑抽屉状态
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)
  const [editForm] = Form.useForm()
  // 镜像/容器管理弹窗状态
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false)
  const [addingContainer, setAddingContainer] = useState<boolean>(false)
  const [newContainerName, setNewContainerName] = useState<string>('')
  const [newContainerImage, setNewContainerImage] = useState<string>('')
  // 新增容器后配置 CPU/内存 的独立弹窗
  const [cpuModalVisible, setCpuModalVisible] = useState<boolean>(false)
  const [pendingContainerKey, setPendingContainerKey] = useState<string | null>(null)
  const [cpuForm] = Form.useForm()
  // refs for resource rows inside Drawer to reliably scroll/focus
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  // 当打开抽屉时需要聚焦的新增资源 key
  const [, setFocusResourceKey] = useState<string | null>(null)

  // 资源变配卡片展开/收起状态
  const [resourceConfigExpanded, setResourceConfigExpanded] = useState<boolean>(true)

  // ==================== 服务相关 ====================
  // Mock pod info data，pod数据
  const pods = [
    {
      key: 'p1',
      service: 'game1',
      updatedTime: '2025-02-05 12:00:00',
      resources: '0.5C/1538Mi 推荐值：0.1C/448Mi',
      status: '正常'
    },
    {
      key: 'p2',
      service: 'game2',
      updatedTime: '2025-02-04 10:00:00',
      resources: '0.3C/768Mi 推荐值：0.2C/512Mi',
      status: '故障'
    }
  ]

  interface Pod {
    key: string
    service: string
    updatedTime: string
    resources: string
    status: string
  }

  // ==================== 部署管理相关 ====================
  // 部署分组（用于展示分组列表）
  interface DeployGroup {
    key: string
    groupName: string
    note: string
    services: string[] | string
    imageVersion: string
    // 可选的分组层面配置，可能来自不同数据源
    graceful?: string
    exposePort?: number | string
  }

  const [deployGroups, _setDeployGroups] = useState<DeployGroup[]>([
    { key: 'g1', groupName: '默认', note: '基础分组', services: '1~3', imageVersion: 'integration-server:7.8.0-amd64', graceful: '5s', exposePort: 8080 },
    { key: 'g2', groupName: '灰度', note: '小流量灰度', services: '4~6', imageVersion: 'integration-server:7.6.0-amd64', graceful: '60s', exposePort: 8090 }
  ])

  const [deployDrawerVisible, setDeployDrawerVisible] = useState<boolean>(false)
  const [selectedGroup, setSelectedGroup] = useState<DeployGroup | null>(null)

  // 部署管理表格的 mock 数据与列定义
  const deployConfigs = [
    {
      key: 'd1',
      image: 'integration-server:7.8.0-amd64',
      envCount: 1,
      cmd: '未配置',
      ports: '8080',
      health: { type: 'httpGet', path: '/test', port: 8080, initialDelay: 300 },
      protocol: 'HTTP',
      mounts: 1,
      preStop: '未配置',
      graceful: '5s',
      externalPort: 8080
    }
  ]

  interface DeployConfig {
    key: string
    image: string
    envCount: number
    cmd: string
    ports: string
    health: { type: string; path: string; port: number; initialDelay: number }
    protocol: string
    mounts: number
    preStop: string
    graceful: string
    externalPort: number
  }


  // ==================== 文件下载相关 ====================
  const downloadInfo: DownloadInfo = {
    accessKeyId: 'LTAI5tEL*********U7dKm9R',
    secret: '6pwC81vC0F***********LV78KG2d0'
  }

  const servers: ServerItem[] = [
    { key: '2', name: 'Server2', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/2/' },
    { key: '3', name: 'Server3', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/3/' },
    { key: '4', name: 'Server4', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/4/' },
    { key: '5', name: 'Server5', cliCommand: 'aliyun --profile gamedemo oss ls oss://staging-legolas-gamedemo-system/game/5/' }
  ]

  // ==================== 函数定义区域 ====================
  
  // 基本信息相关函数
  // (基本信息主要是静态展示，无需特殊函数)

  // 高级配置相关函数
  const handleHpaSubmit = (values: HPAFormValues) => {
    console.log('HPA配置:', values)
    setHpaVisible(false)
  }


  // 资源变配相关函数
  // 将资源字符串解析为表单友好结构
  const parseResourcesForForm = (items: ResourceItem[]) => {
    return items.map(item => {
      // memory: e.g. "128 Mi"
      const memMatch = String(item.memory || '').match(/([\d.]+)\s*(\w+)/)
      const memoryNum = memMatch ? Number(memMatch[1]) : undefined
      const memoryUnit = memMatch ? memMatch[2] : 'Mi'

      // cpu: e.g. "0.1C" (只需要 base)，单位固定为 C
      const cpuMatch = String(item.cpu || '').match(/([\d.]+)C/)
      const cpuBase = cpuMatch ? Number(cpuMatch[1]) : undefined
      const cpuUnit = 'C'

      return {
        key: item.key,
        container: item.container,
        image: item.image,
        memoryNum,
        memoryUnit,
        cpuBase,
        cpuUnit
      }
    });
  }

  // 表单中每一项的类型描述（用于从 Form.List 中读取值）
  interface ResourceFormItem {
    key: string
    container: string
    image: string
    memoryNum: number
    memoryUnit: string
    cpuBase: number
    cpuUnit: string
  }

  // 将表单值转换回资源字符串
  const buildResourcesFromForm = (vals: ResourceFormItem[]) : ResourceItem[] => {
    return vals.map(v => ({
      key: v.key,
      container: v.container,
      image: v.image,
      memory: `${v.memoryNum} ${v.memoryUnit}`,
      // 仅保留 base 值，单位为 C
      cpu: `${v.cpuBase}C`
    }))
  }

  // 打开编辑抽屉并填充表单
  const openEditDrawer = (focusKey?: string | null) => {
    // 填充表单并且确保容器名与镜像显示信息被设置为文本
    const initial = parseResourcesForForm(resources).map(item => ({
      ...item,
      // 将 container, image 直接放入对应字段以便只读展示
      container: item.container,
      image: item.image,
      // cpuUnit 固定为 C
      cpuUnit: item.cpuUnit || 'C'
    }))
    editForm.setFieldsValue({ resources: initial })
    // 记录需要聚焦的资源 key（可能为 undefined）
    setFocusResourceKey(focusKey || null)
    setDrawerVisible(true)

    // 延迟使用 refs 滚动并聚焦（等 Drawer 与表单渲染完成）
    if (focusKey) {
      setTimeout(() => {
        const el = rowRefs.current[focusKey]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // 尝试聚焦第一个可编辑 input（内存输入）
          const input = el.querySelector('input') as HTMLInputElement | null
          if (input) input.focus()
        }
        // 清理 focus key
        setFocusResourceKey(null)
      }, 400)
    }
  }

  // 打开镜像/容器管理弹窗
  const openImageModal = () => {
    // 可选镜像固定为业务需要的三类
    const availableImages = ['game', 'center', 'login']
    // 默认选择 game
    setNewContainerImage(availableImages[0])
    setNewContainerName('')
    setAddingContainer(false)
    setImageModalVisible(true)
  }

  // 在弹窗中新增容器并打开资源变配抽屉进行编辑
  const handleAddContainerConfirm = () => {
    if (!newContainerName || !newContainerImage) {
      Modal.warning({ title: '请填写容器名称并选择镜像' })
      return
    }
    const key = `c-${Date.now()}`
    const newItem: ResourceItem = {
      key,
      container: newContainerName,
      image: newContainerImage,
      cpu: '0.1C',
      memory: '128 Mi'
    }
    setResources(prev => [newItem, ...prev])
    setImageModalVisible(false)
    // 打开专用的 CPU/内存 配置弹窗（独立于资源变配抽屉）
    setPendingContainerKey(key)
    // 预填默认值在 cpuForm
    cpuForm.setFieldsValue({ cpuBase: 0.1, memoryNum: 128, memoryUnit: 'Mi' })
    setTimeout(() => setCpuModalVisible(true), 120)
  }

  // 保存编辑后的资源配置
  const handleSaveResources = async () => {
    try {
      const values = await editForm.validateFields()
      const list = values.resources || []
      const updated = buildResourcesFromForm(list)
      setResources(updated)
      setDrawerVisible(false)
    } catch {
      // 表单校验失败时不关闭抽屉
    }
  }

  // 服务相关函数
  // (服务相关的函数主要是表格操作，在表格定义中内联)

  // 部署管理相关函数
  // (部署管理相关的函数在需要时定义)

  // 文件相关函数
  // (文件相关的函数在需要时定义)

  // ==================== 表格列定义区域 ====================
  
  // 资源变配表格列定义
  const resourceColumns: ColumnsType<ResourceItem> = [
    { title: '容器', dataIndex: 'container', key: 'container' },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
      render: (val: string) => {
        if (!val) return null
        const m = String(val).match(/(.*?)(可突发至.*)/)
        if (m) {
          const base = (m[1] || '').trim()
          const burst = (m[2] || '').trim()
          return (
            <div>
              <span>{base} <span style={{ color: '#f1c40f' }}>{burst}</span></span>
            </div>
          )
        }
        return <div>{val}</div>
      }
    },
    { title: '内存', dataIndex: 'memory', key: 'memory' }
  ]

  // 服务表格列定义
  const podColumns: ColumnsType<Pod> = [
    { title: 'pod名称', dataIndex: 'service', key: 'service' },
    { title: '更新时间', dataIndex: 'updatedTime', key: 'updatedTime' },
    { 
      title: '资源', 
      dataIndex: 'resources', 
      key: 'resources',
      render: (val: string) => {
        if (!val) return null
        // 尝试按"推荐值"分割，优先展示推荐值在下，实际值在上
        const m = val.match(/(.*?)\s*推荐值[:：]\s*(.*)/)
        if (m) {
          const actual = (m[1] || '').trim()
          const rec = (m[2] || '').trim()
          return (
            <div>
              <div style={{ marginTop: 6 }}>{actual}</div>
              <div style={{ color: '#74b9ff', fontSize: 12 }}>推荐值：{rec}</div>
            </div>
          )
        }
        // 如果没有匹配到推荐值关键字，按空格拆分换行展示
        const parts = String(val).split(/\s+/)
        if (parts.length > 1) {
          return (
            <div>
              {parts.map((p, i) => (
                <div key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>{p}</div>
              ))}
            </div>
          )
        }
        return <div>{val}</div>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (_: unknown, record: Pod) => {
        const val = record.status
        const color = val === '正常' ? 'green' : val === '故障' ? 'red' : 'orange'
          return (
            <div>
              <Tag color={color} bordered={false}>{val}</Tag>
              {val === '故障' && (
                <div style={{ marginTop: 4 }}>
                  <Button 
                    type="link" 
                    size="small" 
                    style={{ padding: 0, height: 'auto', fontSize: 12 }}
                    onClick={() => window.alert('原型：查看日志功能')}
                  >
                    查看日志
                  </Button>
                </div>
              )}
            </div>
          )
      }
    },
    {
      title: '操作',
      key: '登入pod',
      render: (_: unknown, record: Pod) => {
        return (
          <Space>
          <Button type="link">登入pod</Button>
            <Button 
              type="link" 
              danger 
              disabled={record.status === '正常'}
            >
              删除
            </Button>
          </Space>
        )
      }
    }
  ]

  // 部署分组表格列定义
  const groupColumns: ColumnsType<DeployGroup> = [
    { title: '分组名称', dataIndex: 'groupName', key: 'groupName' },
    { title: '备注', dataIndex: 'note', key: 'note' },
    { title: '服务', dataIndex: 'services', key: 'services' },
    { title: '镜像版本', dataIndex: 'imageVersion', key: 'imageVersion' },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: DeployGroup) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => {
              setSelectedGroup(record)
              setDeployDrawerVisible(true)
            }}
          >
            详情
          </Button>
          <Button type="link">编辑</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      )
    }
  ]

  // 部署配置表格列定义
  const deployColumns: ColumnsType<DeployConfig> = [
    { title: '镜像', dataIndex: 'image', key: 'image' },
    { title: '环境变量', dataIndex: 'envCount', key: 'envCount', render: (val: number) => `${val}个` },
    { title: '启动命令', dataIndex: 'cmd', key: 'cmd' },
    { title: '端口', dataIndex: 'ports', key: 'ports' },
    { 
      title: '健康检查', 
      dataIndex: 'health', 
      key: 'health',
      render: (val: { type: string; path: string; port: number; initialDelay: number }) => `${val.type}:${val.path}:${val.port}` 
    },
    { title: '协议', dataIndex: 'protocol', key: 'protocol' },
    { title: '挂载', dataIndex: 'mounts', key: 'mounts', render: (val: number) => `${val}个` },
    { title: '停止前命令', dataIndex: 'preStop', key: 'preStop' },
    { title: '优雅停机', dataIndex: 'graceful', key: 'graceful' },
    { title: '对外端口', dataIndex: 'externalPort', key: 'externalPort' }
  ]


  // ==================== 页面渲染区域 ====================
  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作按钮 */}
          <div style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Title level={3} style={{ margin: 0 }}>{name}</Title>
              {appTags.map(t => (
            <Tag key={t} color={t === '游服' ? '#fa8c16' : '#1890ff'} bordered={false} style={{ marginLeft: 0 }}>{t}</Tag>
              ))}
            </div>

            <Space wrap>
              <Button>登入pod</Button>
              <Button type="primary">更新部署</Button>
            </Space>
          </div>

      {/* 标签页 */}
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'overview', label: '总览' },
          { key: 'deploy', label: '部署管理' },
          { key: 'download', label: '文件下载' }
        ]}
      />

      {/* 标签页内容 */}
      {activeKey === 'overview' ? (
        <div>
          {/* 基本信息 Card */}
          <Card>
            <Row gutter={[48, 24]}>
              <Col xs={24} sm={12} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>别名</div>
                  <div style={{ fontSize: 14 }}>测试</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>规格</div>
                  <div style={{ fontSize: 14 }}>多服务APP</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>容器</div>
                  <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {resources.map(r => {
                      const parts = String(r.image || '').split(':')
                      const version = parts.length > 1 ? parts[1] : 'latest'
                      return (
                        <Tag key={r.key} color="green" bordered={false} style={{ marginBottom: 4 }}>{`${r.container}:${version}`}</Tag>
                      )
                    })}
                    <Button type="text" icon={<EditOutlined />} onClick={openImageModal} title="管理容器" />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>标签</div>
                  <div style={{fontSize: 14, overflow: 'hidden' }}>
                    <Tag color="blue" bordered={false} style={{ marginRight: 4 }}>gamedemo_efwe:wef</Tag>
                    <Tag color="blue" bordered={false} style={{ marginRight: 4 }}>key:value</Tag>
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>名称</div>
                  <div style={{ fontSize: 14 }}>{name}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>部署方式</div>
                  <div style={{ fontSize: 14 }}>停服更新</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>私网</div>
                  <div style={{ fontSize: 14, fontFamily: 'Monaco, monospace' }}>http://master$SERVER_ID:[$PORT]</div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
              <div style={{ marginBottom: 16 }}>                              
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>状态</div>
                  <div><Tag color="green" bordered={false}>operable</Tag></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>日志</div>
                  <div style={{ fontSize: 14, fontFamily: 'Monaco, monospace' }}>前往grafana查看</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>公网</div>
                  <div style={{ fontSize: 14 }}>未配置</div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* 高级配置 Card */}
          <Card 
            title="高级配置" 
            style={{ marginBottom: 24, marginTop: 24 }}
            styles={{ body: { padding: advancedConfigExpanded ? 24 : 0 } }}
            extra={
              <Button 
                type="text" 
                icon={advancedConfigExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setAdvancedConfigExpanded(!advancedConfigExpanded)}
                size="small"
              />
            }
          >
            {advancedConfigExpanded && (
              <div style={{ fontSize: 14, color: '#333' }}>
                <strong>HPA 弹性伸缩：</strong>
                <Button 
                  type="text" 
                  icon={<EditOutlined />}
                  size="small" 
                  style={{ padding: 0, height: 'auto', fontSize: 14 }}
                  onClick={() => setHpaVisible(true)}
                >
                </Button>
            </div>
            )}
              </Card>

          {/* 资源变配 Card */}
          <Card 
            title="应用资源配置" 
            extra={
              <Space>
                <Button size="small" style={{ fontSize: 14 }} icon={<EditOutlined />} onClick={() => openEditDrawer()}>编辑</Button>
                <Button 
                  type="text" 
                  icon={resourceConfigExpanded ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setResourceConfigExpanded(!resourceConfigExpanded)}
                  size="small"
                />
              </Space>
            }
            style={{ marginBottom: 24 }}
            styles={{ body: { padding: resourceConfigExpanded ? 24 : 0 } }}
          >
            {resourceConfigExpanded && (
              <Table columns={resourceColumns} dataSource={resources} pagination={false} />
            )}
            </Card>

          {/* 服务 Card */}
          <Card title="Pod">
            <Table columns={podColumns} dataSource={pods} pagination={false} />
    </Card>
          </div>
      ) : activeKey === 'deploy' ? (
        <DeploymentRecords
          deployGroups={deployGroups}
          deployConfigs={deployConfigs}
          onCreateGroup={() => console.log('创建新分组')}
        />
      ) : activeKey === 'download' ? (
        <FileDownload
          downloadInfo={downloadInfo}
          servers={servers}
          onViewCLI={() => console.log('查看CLI参考')}
          onCopyText={(text) => console.log('复制文本:', text)}
        />
      ) : null}

      {/* ==================== 弹窗和抽屉区域 ==================== */}
      
      {/* HPA 配置弹窗 */}
      <HPAConfigModal
        open={hpaVisible}
        onCancel={() => setHpaVisible(false)}
        onOk={handleHpaSubmit}
        form={hpaForm}
        initialValues={{
          enabled: false,
          defaultReplicas: 1,
          minReplicas: 1,
          maxReplicas: 10,
          cpuEnabled: false,
          cpuTargetValue: 70,
          memEnabled: false,
          memTargetValue: 70,
          scaleInWait: 300,
          scaleOutWait: 60
        }}
      />

      {/* 资源变配编辑抽屉 */}
            <Drawer
              title="配置pod资源"
              placement="right"
              width={480}
              open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
              footer={
          <div style={{ textAlign: 'left' }}>
                  <Space>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleSaveResources}>保存</Button>
                  </Space>
                </div>
              }
            >
              <Form form={editForm} layout="vertical">
                <Form.List name="resources">
            {(fields) => (
                    <div>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ marginBottom: 24, padding: 16, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                    <div style={{ marginBottom: 16 }}>
                      <Form.Item noStyle name={[name, 'container']}>
                        <Input style={{ display: 'none' }} />
                            </Form.Item>
                      <div style={{ fontSize: 14, color: '#333' }}>
                        <strong>容器名称：</strong>
                        <span>{editForm.getFieldValue(['resources', name, 'container'])}</span>
                          </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <Form.Item noStyle name={[name, 'image']}>
                        <Input style={{ display: 'none' }} />
                            </Form.Item>
                      <div style={{ fontSize: 14, color: '#333' }}>
                        <strong>镜像：</strong>
                        <span>{editForm.getFieldValue(['resources', name, 'image'])}</span>
                          </div>
                    </div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'cpuBase']}
                          label="CPU (C)"
                          rules={[{ required: true, message: '请输入CPU配置' }]}
                        >
                          <InputNumber min={0.001} step={0.001} style={{ width: '100%' }} />
                            </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Row gutter={8}>
                          <Col span={16}>
                            <Form.Item
                              {...restField}
                              name={[name, 'memoryNum']}
                              label="内存"
                              rules={[{ required: true, message: '请输入内存大小' }]}
                            >
                              <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              {...restField}
                              name={[name, 'memoryUnit']}
                              label="单位"
                            >
                              <Select>
                                <Select.Option value="Mi">Mi</Select.Option>
                                <Select.Option value="Gi">Gi</Select.Option>
                              </Select>
                          </Form.Item>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </Form>
            </Drawer>

      {/* 镜像/容器管理弹窗 */}
            <Modal
              title="管理容器"
              open={imageModalVisible}
              onCancel={() => setImageModalVisible(false)}
              onOk={handleAddContainerConfirm}
              okText="新增并编辑"
            >
              <div>
                <div style={{ color: '#666', marginBottom: 8 }}>当前容器列表</div>
                <div style={{ marginTop: 8 }}>
                  {resources.map(r => (
                    <div key={r.key} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 14 }}>{`${r.container}:${r.image}`}</div>
                    </div>
                  ))}

                  {/* inline 新增输入行（当 addingContainer 为 true 时显示，位于现有项之后） */}
                  {addingContainer && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, padding: '6px 0' }}>
                      <Input placeholder="容器名称" value={newContainerName} onChange={(e) => setNewContainerName(e.target.value)} style={{ flex: 1 }} />
                      <Select
                        value={newContainerImage}
                        onChange={(v) => setNewContainerImage(v)}
                        style={{ width: 160 }}
                        options={['game','center','login'].map(img => ({ value: img, label: img }))}
                      />
                    </div>
                  )}

                  {/* 新增容器操作行：始终在列表末尾 */}
                  <div style={{ marginTop: 8 }}>
                    <Tag onClick={() => setAddingContainer(true)} style={{ cursor: 'pointer', background: '#fafafa' }}>+ 新增容器</Tag>
                  </div>
                </div>
              </div>
            </Modal>

            {/* 新增容器后的独立 CPU/内存 配置弹窗 */}
            <Modal
              title="配置新容器资源"
              open={cpuModalVisible}
              onCancel={() => { setCpuModalVisible(false); setPendingContainerKey(null) }}
              onOk={() => {
                cpuForm
                  .validateFields()
                  .then(vals => {
                    if (!pendingContainerKey) return
                    setResources(prev => prev.map(r => r.key === pendingContainerKey ? { ...r, cpu: `${vals.cpuBase}C`, memory: `${vals.memoryNum} ${vals.memoryUnit}` } : r))
                    setCpuModalVisible(false)
                    setPendingContainerKey(null)
                  })
                  .catch(() => {})
              }}
            >
              <Form form={cpuForm} layout="vertical">
                <Form.Item label="CPU (C)" name="cpuBase" rules={[{ required: true, type: 'number', min: 0.001, message: '请输入 CPU 值' }]}>
                  <InputNumber min={0.001} step={0.001} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="内存" required>
                  <Form.Item noStyle name="memoryNum" rules={[{ required: true, type: 'number', min: 1, message: '请输入内存数值' }]}> 
                    <InputNumber style={{ width: '70%' }} min={1} />
                  </Form.Item>
                  <Form.Item noStyle name="memoryUnit">
                    <Select style={{ width: '28%', marginLeft: '2%' }} options={[{ label: 'Mi', value: 'Mi' }, { label: 'Gi', value: 'Gi' }]} />
                  </Form.Item>
                </Form.Item>
              </Form>
            </Modal>

      {/* 部署分组详情 Drawer */}
      <Drawer
        title={`分组详情 - ${selectedGroup?.groupName}`}
        width={800}
        open={deployDrawerVisible}
        onClose={() => {
          setDeployDrawerVisible(false)
          setSelectedGroup(null)
        }}
        destroyOnClose
      >
        {selectedGroup && (
          <div>
            <Card title="分组信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>分组名称:</strong> {selectedGroup.groupName}</div>
                  <div><strong>备注:</strong> {selectedGroup.note}</div>
                </Col>
                <Col span={12}>
                  <div><strong>服务:</strong> {selectedGroup.services}</div>
                  <div><strong>镜像版本:</strong> {selectedGroup.imageVersion}</div>
                </Col>
              </Row>
            </Card>
            <Card title="部署配置">
              <Table
                columns={deployColumns}
                dataSource={deployConfigs}
                pagination={false}
              />
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  )
}