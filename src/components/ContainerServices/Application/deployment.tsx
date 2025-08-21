"use client"

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
  Modal
} from 'antd'
import { MoreOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function Deployment({ appId }: { appId?: string }) {
  const id = appId ?? 'unknown'
  const [activeKey, setActiveKey] = useState<string>('overview')

  // 资源类型定义
  interface ResourceItem {
    key: string
    container: string
    image: string
    // cpu 存为字符串展示（例如 "0.1C 可突发至0.4"）
    cpu: string
    // memory 存为字符串（例如 "128 Mi"）
    memory: string
  }

  // 资源变配数据（从常量改为 state，便于更新）
  const [resources, setResources] = useState<ResourceItem[]>([
    { key: '1', container: 'platform', image: 'platform:v0.1', cpu: '0.1C 可突发至0.4', memory: '128 Mi' },
    { key: '2', container: 'center', image: 'center:v0.2', cpu: '0.3C 可突发至1.2', memory: '768 Mi' }
  ])

  // 编辑抽屉状态
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
  const [focusResourceKey, setFocusResourceKey] = useState<string | null>(null)

  // 将资源字符串解析为表单友好结构
  const parseResourcesForForm = (items: ResourceItem[]) => {
    return items.map(item => {
      // memory: e.g. "128 Mi"
      const memMatch = String(item.memory || '').match(/(\d+)\s*(\w+)/)
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
    })
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
    } catch (err) {
      // 表单校验失败时不关闭抽屉
    }
  }

  const resourceColumns: ColumnsType<ResourceItem> = [
    { title: '容器', dataIndex: 'container', key: 'container' },
    { title: '镜像版本', dataIndex: 'image', key: 'image' },
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

  // Mock pod info data，pod数据
  const pods = [
    {
      key: 'p1',
      service: 'game1',
      group: '默认',
      startTime: '2025-02-05 14:14:41',
      updatedTime: '-',
      policy: '手动开服',
      resources: '0.5C/1538Mi 推荐值：0.1C/448Mi',
      status: '故障'
    },
    {
      key: 'p2',
      service: 'game2',
      group: '默认',
      startTime: '2025-02-04 10:00:00',
      updatedTime: '2025-02-05 12:00:00',
      policy: '自动开服',
      resources: '0.3C/768Mi',
      status: '正常'
    }
  ]

  interface Pod {
    key: string
    service: string
    group: string
    startTime: string
    updatedTime: string
    policy: string
    resources: string
    status: string
  }

  const podColumns: ColumnsType<Pod> = [
    { title: '服务名称', dataIndex: 'service', key: 'service' },
    { title: '分组名称', dataIndex: 'group', key: 'group' },
    { title: '开服时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '更新时间', dataIndex: 'updatedTime', key: 'updatedTime' },
    { title: '策略', dataIndex: 'policy', key: 'policy' },
    { 
      title: '资源', 
      dataIndex: 'resources', 
      key: 'resources',
      render: (val: string) => {
        if (!val) return null
        // 尝试按“推荐值”分割，优先展示推荐值在上，实际值在下
        const m = val.match(/(.*?)\s*推荐值[:：]\s*(.*)/)
        if (m) {
          const actual = (m[1] || '').trim()
          const rec = (m[2] || '').trim()
          return (
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>推荐值：{rec}</div>
              <div style={{ marginTop: 6 }}>{actual}</div>
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
      render: (val: string) => {
        const color = val === '正常' ? 'green' : val === '故障' ? 'red' : 'orange'
        return <Tag color={color}>{val}</Tag>
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, _record: Pod) => {
        return (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => openEditDrawer()}>编辑</Button>
            <Button icon={<ReloadOutlined />}>重启</Button>
            <Dropdown
              menu={{
                items: [
                  { key: '1', label: '更多操作' }
                ]
              }}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      }
    }
  ]

  return (
    <div className="container mx-auto p-6">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={3} style={{ margin: 0 }}>
            应用
          </Title>
          <Text style={{ color: '#fa8c16', fontSize: 18, fontWeight: 700 }}>kumo游服</Text>
          <Tag color="#fa8c16">游服</Tag>
        </div>

        <div style={{ marginTop: 12 }}>
          <Tabs activeKey={activeKey} onChange={(k) => setActiveKey(String(k))} items={[
            { key: 'overview', label: '总览' },
            { key: 'pod', label: '服务' },
            { key: 'file', label: '文件' },
            { key: 'plugin', label: '插件' }
          ]} />
        </div>
      </div>
      {activeKey === 'overview' ? (
        <div>
          <div style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Title level={3} style={{ margin: 0 }}>kumo游服</Title>
              <Tag color="#fa8c16">游服</Tag>
            </div>

            <Space wrap>
              <Button>登入pod</Button>
              <Button type="primary">更新部署</Button>
            </Space>
          </div>

          <div style={{ background: '#fafafa', padding: 24, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 24 }}>
            <Row gutter={[48, 24]}>
              <Col xs={24} sm={12} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>别名</div>
                  <div style={{ fontSize: 14 }}>单服务APP</div>
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
                        <Tag key={r.key} color="green" style={{ marginBottom: 4 }}>{`${r.container}:${version}`}</Tag>
                      )
                    })}
                    <Button type="text" icon={<EditOutlined />} onClick={openImageModal} title="管理容器" />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>公网</div>
                  <div style={{ fontSize: 14 }}>未配置</div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>名称</div>
                  <div style={{ fontSize: 14 }}>kumo游服</div>
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
                  <div><Tag color="green">operable</Tag></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>日志</div>
                  <div style={{ fontSize: 14, fontFamily: 'Monaco, monospace' }}>前往grafana查看</div>

                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>标签</div>
                  <div style={{fontSize: 14, overflow: 'hidden' }}>
                    <Tag color="blue" style={{ marginRight: 4 }}>gamedemo_efwe:wef</Tag>
                    <Tag color="blue" style={{ marginRight: 4 }}>key:value</Tag>
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 12 }}>
              <Collapse
                ghost
                items={[
                  {
                    key: '1',
                    label: <span style={{ color: '#2f54eb', fontWeight: 500 }}>更多高级配置</span>,
                    children: <div style={{ color: '#666' }}>高级配置项（示意）</div>
                  }
                ]}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 资源变配 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>资源变配</Title>
              <Button size="small" style={{ fontSize: 14 }} icon={<EditOutlined />} onClick={() => openEditDrawer()}>编辑</Button>
            </div>
            <div style={{ marginTop: 8 }}>
              <Card>
                <Table columns={resourceColumns} dataSource={resources} pagination={false} />
              </Card>
            </div>

            {/* 镜像/容器管理弹窗已移动至组件顶层以确保在任意 tab 下都可打开 */}

            <Drawer
              title="配置pod资源"
              placement="right"
              width={480}
              onClose={() => setDrawerVisible(false)}
              open={drawerVisible}
              footer={
                <div style={{ textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
                    <Button type="default" onClick={handleSaveResources}>立即生效</Button>
                    <Button type="primary" onClick={handleSaveResources}>下次部署生效</Button>
                  </Space>
                </div>
              }
            >
              <Form form={editForm} layout="vertical">
                <Form.List name="resources">
                  {(fields, { add, remove }) => (
                    <div>
                      {fields.map((field, idx) => (
                        <div key={field.key} data-resource-key={field.key} ref={(el) => { rowRefs.current[field.key] = el }} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed #f0f0f0' }}>
                          {/* 容器名（只读，显著展示，行间距缩小） */}
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>容器</div>
                            <Form.Item noStyle name={[field.name, 'container']}>
                              <Input readOnly style={{ fontSize: 15, fontWeight: 600, border: 'none', padding: 0 }} />
                            </Form.Item>
                          </div>

                          {/* 镜像名和版本（只读，显著展示，行间距缩小） */}
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>镜像名称/版本</div>
                            <Form.Item noStyle name={[field.name, 'image']}>
                              <Input readOnly style={{ fontSize: 14, color: '#333', border: 'none', padding: 0 }} />
                            </Form.Item>
                          </div>

                          {/* 内存：与文档格式一致，数字 + 单位选择 */}
                          <Form.Item label="内存" required>
                            <Form.Item noStyle name={[field.name, 'memoryNum']} rules={[{ required: true, type: 'number', min: 1, message: '请输入合法内存值' }]}>
                              <InputNumber style={{ width: '70%' }} min={1} />
                            </Form.Item>
                            <Form.Item noStyle name={[field.name, 'memoryUnit']}>
                              <Select style={{ width: '28%', marginLeft: '2%' }} options={[{ label: 'Mi', value: 'Mi' }, { label: 'Gi', value: 'Gi' }]} />
                            </Form.Item>
                          </Form.Item>

                          {/* CPU：单位为 C，基础值可编辑并校验，单位列为只读文本 C */}
                          <Form.Item label="CPU" required>
                            <Form.Item name={[field.name, 'cpuBase']} noStyle rules={[{ required: true, type: 'number', min: 0.001, message: 'CPU 必须大于等于 0.001' }]}>
                              <InputNumber style={{ width: '70%' }} min={0.001} step={0.001} />
                            </Form.Item>
                            <Form.Item noStyle name={[field.name, 'cpuUnit']}>
                              <Input readOnly style={{ width: '28%', marginLeft: '2%', border: 'none', padding: 0, color: '#333' }} />
                            </Form.Item>
                          </Form.Item>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </Form>
            </Drawer>
          </div>

          {/* Pod 信息 */}
          <div>
            <Title level={4}>Pod</Title>
            <Card>
              <Table columns={podColumns} dataSource={pods} pagination={false} />
            </Card>
          </div>
        </>
      )}
            {/* 镜像/容器管理弹窗（组件顶层渲染，确保任意 tab 下可见） */}
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
                      <Select value={newContainerImage} onChange={(v) => setNewContainerImage(v)} style={{ width: 160 }}>
                        {['game','center','login'].map(img => (
                          <Select.Option key={img} value={img}>{img}</Select.Option>
                        ))}
                      </Select>
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
    </div>
  )
}

