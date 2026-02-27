'use client'

import React, { useState } from 'react'
import { Row, Col, Card, Button, Input, Typography, Space, Tag, Progress, Drawer, Form, Select, Radio, InputNumber, Alert, Collapse, Tooltip, Modal, Table } from 'antd'
import Deployment from './deployment'
import DeploymentOther from './deployment_other'
import { QuestionCircleOutlined, CaretUpOutlined, DeleteOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { apps, AppItem as AppItemType } from './apps'
import DeployPlan from './DeployPlan'

const { Title, Text } = Typography

// apps 数据从 ./apps.ts 导出并复用

const statusColor = (s: AppItemType['status']) => {
  if (s === 'running') return '#52c41a'
  if (s === 'failed') return '#ff4d4f'
  return '#9CA3AF'
}

export default function ContainerApplication({ onOpenDeployment }: { onOpenDeployment?: (id: string) => void }) {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const [selectedApp, setSelectedApp] = useState<AppItemType | null>(null)
  const [updateDrawerOpen, setUpdateDrawerOpen] = useState<boolean>(false)
  const [updateForm] = Form.useForm()
  const [changeDetailModalOpen, setChangeDetailModalOpen] = useState<boolean>(false)
  // 部署计划视图状态：点击"部署计划"按钮后切换到流水线视图
  const [deployPlanOpen, setDeployPlanOpen] = useState<boolean>(false)

  const openAppDetail = (app: AppItemType) => {
    if (onOpenDeployment) {
      onOpenDeployment(app.id)
      return
    }
    setSelectedApp(app)
    setDrawerOpen(true)
  }
  // wrapper width: 3 * max card width (340) + 2 * gutter (24) = 1068
  const wrapperMaxWidth = 1432
  // layout widths (adjustable)
  const labelColumnWidth = 108 // 左侧标签列宽，可调整
  const stepDescWidth = 200 // 开服步骤中描述列宽，可调整
  const rightColumnWidth = 440 // 右侧列（流量策略 / 右侧小卡）宽度，可调整

  // 当部署计划视图打开时，全屏渲染流水线编辑器
  if (deployPlanOpen) {
    return <DeployPlan onBack={() => setDeployPlanOpen(false)} />
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部说明卡片：与其他菜单页保持一致样式 */}
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 2,
            paddingBottom: 2
          }}
        >
          <Title level={1} style={{ marginBottom: 4, fontSize: 22 }}>
            应用
          </Title>
          <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
            应用是用来承载游戏内的功能模块。应用内可配置多个 Pod（容器）来分别对应不同的服务功能。每个 Pod 对应一个镜像及其镜像仓库启动方式。
          </Text>
        </div>
      </Card>

      {/* 搜索 & 添加 区 */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button type="primary" style={{ height: 32 }}>
            + 添加应用
          </Button>
          {/* 部署计划：点击后进入类似阿里云流水线的批量部署界面，支持拖拽编排并行/串行部署顺序 */}
          <Button
            icon={<SendOutlined />}
            onClick={() => setDeployPlanOpen(true)}
            style={{
              height: 32,
              borderColor: '#1677ff',
              color: '#1677ff'
            }}
          >
            部署计划
          </Button>
        </div>
        <Input placeholder="请输入应用名称或关键字" style={{ width: 240, height: 32 }} />
      </div>

      {/* 中间 wrapper，宽度与三列卡片总宽对齐 */}
      <div style={{ maxWidth: wrapperMaxWidth, margin: '0 auto', width: '100%' }}>
        {/* 自动开服模块（自适应高度） */}
        <Card style={{ borderRadius: 8, borderColor: '#E5E7EB' }} styles={{ body: { padding: 0 } }}>
          {/* header with actions */}
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>自动开服 (3)</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="default">更新应用配置</Button>
              <Button type="default">Webhook配置</Button>
              <Button type="default">更新开服策略</Button>
              <Button type="primary">手动开服</Button>
            </div>
          </div>

          {/* body: two columns with vertical divider */}
          <div style={{ display: 'flex', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.06)' }} />

            <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Current policy */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>当前开服策略</div>
                <div style={{ flex: 1 }}>
                  <div>满足以下任一条件后自动开服</div>
                  <div style={{ marginTop: 8 }}>
                    <div>
                      <div>付费人数 100人</div>
                      <div style={{ position: 'relative', width: '60%' }}>
                        <Progress percent={0} size="default" showInfo={false} />
                        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>
                          <span style={{ color: '#2f54eb' }}>0</span>
                          <span style={{ color: '#888', marginLeft: 6 }}>/100 人</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next policy */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>下次开服策略</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#888' }}>满足“付费人数 100 人”任一条件后自动开服</div>
                </div>
              </div>

              {/* Next resources */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>下次开服资源</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ color: '#888' }}>应用 单一服，内存 64Mi，<span style={{ color: '#f1c40f' }}>可突发至0.4C</span></div>
                    <div style={{ color: '#888' }}>应用 多活服2，内存 64Mi，<span style={{ color: '#f1c40f' }}>可突发至0.4C</span></div>
                    <div style={{ color: '#888' }}>应用 多活服1，内存 64Mi，<span style={{ color: '#f1c40f' }}>可突发至0.4C</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: rightColumnWidth, padding: '16px 24px', marginLeft: -60 }}>
              <div style={{ transform: 'translateX(-100px)' }}>
                {/* App list */}
                <div style={{ display: 'flex', marginBottom: 8 }}>
                  <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>应用列表</div>
                  <div style={{ flex: 1 }}>master, worker-2, worker-1</div>
                </div>

                {/* Service status */}
                <div style={{ display: 'flex', marginBottom: 8 }}>
                  <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>服务状态</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>导流服ID</div>
                    <div style={{ color: '#389e0d', fontWeight: 700 }}>1</div>
                    <Button type="link" danger style={{ padding: 0 }}>回退开服</Button>
                  </div>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex' }}>
                  <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>开服步骤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: stepDescWidth }}>调用游戏的开服通知API</div>
                        <Tag style={{ background: 'transparent', color: 'rgba(0,0,0,0.25)' }}>等待执行</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: stepDescWidth }}>配置新游服监控</div>
                        <Tag style={{ background: 'transparent', color: 'rgba(0,0,0,0.25)' }}>等待执行</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: stepDescWidth }}>调用游戏的部署通知API</div>
                        <Tag style={{ background: 'transparent', color: 'rgba(0,0,0,0.25)' }}>等待执行</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: stepDescWidth }}>部署启动预备服</div>
                        <Tag style={{ background: 'transparent', color: 'rgba(0,0,0,0.25)' }}>等待执行</Tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 与上方模块间距 */}
        <div style={{ height: 24 }} />

        {/* 三列卡片区域（放在同一 wrapper 内，使宽度对齐） */}
        <Row gutter={[12, 12]}>
          {apps.map(app => (
            <Col key={app.id} xs={24} sm={12} md={12} lg={8} xl={6}>
              <Card
                hoverable
                style={{ borderRadius: 8, width: '100%', maxWidth: 340 }}
                styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 220 } }}
                actions={[]}
                onClick={() => openAppDetail(app)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{app.name}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {app.tags.map(t => {
                        const color = t === '游服' ? '#fa8c16' : '#1890ff'
                        return (
                          <Tag color={color} key={t} style={{ marginLeft: 0 }}>
                            {t}
                          </Tag>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ height: 12 }} />

                {/* 主体 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text>
                      <strong style={{ marginRight: 6 }}>状态</strong>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(app.status), display: 'inline-block', margin: '0 8px' }} />
                      {app.status === 'running' ? '运行中' : app.status === 'failed' ? '故障中' : '未启动'}
                    </Text>
                  </div>

                  <div>
                    <Text>Pod：{app.pods}</Text>
                  </div>

                  <div>
                    <Text type="secondary">容器：{app.containers.join(' | ')}</Text>
                  </div>
                </div>

                {/* 底部操作区 */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button 
                    style={{ height: 32, borderColor: '#d9d9d9' }}
                    onClick={(e) => {
                      e.stopPropagation() // 阻止事件冒泡到卡片
                      setSelectedApp(app)
                      setUpdateDrawerOpen(true)
                      // 初始化表单数据
                      updateForm.setFieldsValue({
                        operation: '更新',
                        deployScope: 'all',
                        isRollbackable: 'true',
                        gracePeriodSeconds: 5,
                        publicPort: '8080',
                        containers: [{
                          name: 'aaa',
                          imageRepo: 'game-server',
                          imageTag: '4.0.0-amd64',
                          imageSize: 0
                        }]
                      })
                    }}
                  >
                    更新部署
                  </Button>
                  <Button 
                    style={{ height: 32, borderColor: '#d9d9d9' }}
                    onClick={(e) => {
                      e.stopPropagation() // 阻止事件冒泡到卡片
                    }}
                  >
                    登录 Pod
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        <Drawer width={1000} placement="right" onClose={() => setDrawerOpen(false)} open={drawerOpen} destroyOnClose>
          {selectedApp && (
            selectedApp.tags.includes('游服') ? (
              <Deployment appId={selectedApp.id} appName={selectedApp.name} tags={selectedApp.tags} />
            ) : (
              <DeploymentOther appId={selectedApp.id} appName={selectedApp.name} tags={selectedApp.tags} />
            )
          )}
        </Drawer>

        {/* 更新部署 Drawer */}
        <Drawer
          title="创建部署"
          width={600}
          onClose={() => {
            setUpdateDrawerOpen(false)
            updateForm.resetFields()
          }}
          open={updateDrawerOpen}
          styles={{
            body: { paddingBottom: 80 },
            header: { borderRadius: '6px 6px 0 0' }
          }}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', height: 64 }}>
              <Space>
                <Button 
                  type="primary" 
                  onClick={() => {
                    updateForm.validateFields().then(() => {
                      // 提交逻辑
                      setUpdateDrawerOpen(false)
                    })
                  }}
                >
                  确 定
                </Button>
                <Button onClick={() => setUpdateDrawerOpen(false)}>关 闭</Button>
              </Space>
            </div>
          }
        >
          <Alert
            type="warning"
            showIcon
            closable
            message="部分配置修改不会立即生效，请重新部署以应用最新设置"
            action={
              <Button
                size="small"
                type="link"
                onClick={() => setChangeDetailModalOpen(true)}
              >
                变更详情
              </Button>
            }
            style={{ marginBottom: 16 }}
          />

          <Form
            form={updateForm}
            layout="vertical"
            initialValues={{
              operation: '更新',
              deployScope: 'all',
              isRollbackable: 'true',
              gracePeriodSeconds: 5,
              publicPort: '8080'
            }}
          >
            {/* 操作类型 */}
            <Form.Item
              name="operation"
              label="操作类型"
              rules={[{ required: true, message: '请选择操作类型' }]}
            >
              <Select>
                <Select.Option value="更新">更新</Select.Option>
                <Select.Option value="创建">创建</Select.Option>
              </Select>
            </Form.Item>

            {/* 分组 */}
            <Form.Item
              name="groupId"
              label="分组"
              rules={[{ required: true, message: '请选择分组' }]}
            >
              <Select placeholder="请选择分组">
                <Select.Option value="group1">分组1</Select.Option>
                <Select.Option value="group2">分组2</Select.Option>
              </Select>
            </Form.Item>

            {/* 游服ID */}
            <Form.Item
              label="游服ID"
              required
            >
              <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                <Form.Item name="deployScope" noStyle>
                  <Radio.Group>
                    <Radio value="all">自动开服的游服</Radio>
                    <Radio value="range">特定游服（灰度发布）</Radio>
                  </Radio.Group>
                </Form.Item>
                <div style={{ position: 'relative', width: '100%' }}>
                  <pre style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '8px',
                    padding: '4px 11px',
                    fontSize: '13px',
                    border: '1px solid #f9fafb',
                    fontFamily: 'Menlo, Consolas, "Courier New", monospace, system-ui',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    margin: 0
                  }}>
                    <Text type="secondary">暂无游服</Text>
                  </pre>
                </div>
              </Space>
            </Form.Item>

            {/* 部署详情 */}
            <Form.Item
              label="部署详情"
              required
            >
              <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                <Form.Item name="detail" noStyle>
                  <Input.TextArea
                    placeholder="请填写此次部署主要范围和内容"
                    rows={3}
                  />
                </Form.Item>
              </Space>
            </Form.Item>

            {/* 此版本是否能回滚 */}
            <Form.Item
              name="isRollbackable"
              label="此版本是否能回滚"
              rules={[{ required: true }]}
            >
              <Radio.Group style={{ display: 'flex', width: 160, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Radio value="true">是</Radio>
                <Radio value="false">
                  <span>
                    否
                    <Tooltip title='选择"否"后，此版本将无法回滚，请谨慎操作'>
                      <QuestionCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)', cursor: 'help', marginLeft: 4 }} />
                    </Tooltip>
                  </span>
                </Radio>
              </Radio.Group>
            </Form.Item>

            {/* 镜像版本 */}
            <Form.Item label="镜像版本" required>
              <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                <Form.Item name={['containers', 0, 'imageSize']} noStyle hidden>
                  <Input disabled value={0} />
                </Form.Item>

                <Input.Group compact>
                  <Form.Item name={['containers', 0, 'name']} noStyle>
                    <Input disabled style={{ width: '25%' }} value="aaa" />
                  </Form.Item>
                  <Form.Item name={['containers', 0, 'imageRepo']} noStyle>
                    <Input disabled style={{ width: '40%' }} value="game-server" />
                  </Form.Item>
                  <Form.Item name={['containers', 0, 'imageTag']} noStyle rules={[{ required: true }]}>
                    <Select style={{ width: '35%' }} showSearch>
                      <Select.Option value="4.0.0-amd64">4.0.0-amd64</Select.Option>
                      <Select.Option value="3.9.0-amd64">3.9.0-amd64</Select.Option>
                      <Select.Option value="3.8.0-amd64">3.8.0-amd64</Select.Option>
                    </Select>
                  </Form.Item>
                </Input.Group>

                <Collapse
                  items={[
                    {
                      key: '1',
                      label: 'server',
                      extra: (
                        <Button
                          type="link"
                          size="small"
                          icon={<CaretUpOutlined />}
                          style={{ fontSize: 14, padding: 0, color: 'rgba(0, 0, 0, 0.65)' }}
                        >
                          展开
                        </Button>
                      ),
                      children: (
                        <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                          {/* 环境变量 */}
                          <Form.Item label="环境变量">
                            <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                              <Space style={{ width: '100%', gap: 8 }}>
                                <Input.Group compact style={{ flex: 1 }}>
                                  <Input disabled value="SPRING_PROFILES_ACTIVE" style={{ width: '40%' }} />
                                  <Button disabled style={{ paddingLeft: 8, paddingRight: 8 }}>=</Button>
                                  <Input disabled value="test" style={{ width: 'calc(60% - 32px)' }} />
                                </Input.Group>
                                <Button icon={<DeleteOutlined />} disabled style={{ visibility: 'hidden' }} />
                              </Space>
                              <Button icon={<PlusOutlined />}>环境变量</Button>
                            </Space>
                          </Form.Item>

                          {/* 启动命令ENTRYPOINT */}
                          <Form.Item 
                            name={['containers', 0, 'command']} 
                            label={
                              <span>
                                启动命令ENTRYPOINT
                                <Tooltip title="容器启动时执行的命令">
                                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                </Tooltip>
                              </span>
                            }
                            extra={
                              <span>
                                使用&ldquo;,&rdquo;分隔，例：executable,param1,param2
                              </span>
                            }
                          >
                            <Input placeholder='使用","分隔，例：executable,param1,param2' />
                          </Form.Item>

                          {/* 端口 */}
                          <Form.Item label="端口" required>
                            <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                              <Space style={{ gap: 8 }}>
                                <Form.Item 
                                  name={['containers', 0, 'ports', 0]} 
                                  noStyle 
                                  rules={[{ required: true }]}
                                  initialValue={8080}
                                >
                                  <InputNumber min={1} max={65535} placeholder="请输入" style={{ width: 160 }} />
                                </Form.Item>
                                <Button icon={<DeleteOutlined />} disabled />
                              </Space>
                              <Button icon={<PlusOutlined />}>端口</Button>
                            </Space>
                          </Form.Item>

                          {/* 健康检查类型和启动最长等待时间 */}
                          <Row gutter={8}>
                            <Col span={12}>
                              <Form.Item
                                name={['containers', 0, 'healthCheck', 'type']}
                                label={
                                  <span>
                                    健康检查类型
                                    <Tooltip title="选择健康检查方式">
                                      <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                  </span>
                                }
                                rules={[{ required: true }]}
                                initialValue="httpGet"
                              >
                                <Select>
                                  <Select.Option value="httpGet">httpGet</Select.Option>
                                  <Select.Option value="tcpSocket">tcpSocket</Select.Option>
                                  <Select.Option value="exec">exec</Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name={['containers', 0, 'healthCheck', 'initializeDelaySeconds']}
                                label={
                                  <span>
                                    启动最长等待时间
                                    <Tooltip title="容器启动后等待多久开始健康检查">
                                      <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                  </span>
                                }
                                rules={[{ required: true }]}
                                initialValue={300}
                              >
                                <InputNumber min={0} max={3600} addonAfter="秒" placeholder="请输入" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>

                          {/* 健康检查路径 */}
                          <Form.Item label="健康检查路径" required>
                            <Space.Compact style={{ width: '100%' }}>
                              <Form.Item 
                                name={['containers', 0, 'healthCheck', 'httpGet', 'path']} 
                                noStyle 
                                rules={[{ required: true }]}
                                initialValue="/test"
                              >
                                <Input placeholder="例：/ping" style={{ flex: 1 }} />
                              </Form.Item>
                              <Button disabled style={{ paddingLeft: 8, paddingRight: 8 }}>:</Button>
                              <Form.Item 
                                name={['containers', 0, 'healthCheck', 'httpGet', 'port']} 
                                noStyle 
                                rules={[{ required: true }]}
                                initialValue={8080}
                              >
                                <InputNumber min={1} max={65535} placeholder="端口" style={{ width: 160 }} />
                              </Form.Item>
                            </Space.Compact>
                          </Form.Item>

                          {/* 文件挂载 */}
                          <Form.Item label="文件挂载">
                            <Button icon={<PlusOutlined />}>挂载文件</Button>
                          </Form.Item>

                          {/* preStop类型 */}
                          <Form.Item
                            name={['containers', 0, 'preStop', 'type']}
                            label={
                              <span>
                                preStop类型
                                <Tooltip title="容器停止前执行的钩子">
                                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                </Tooltip>
                              </span>
                            }
                            extra="在该容器停止前调用"
                          >
                            <Select placeholder="请选择" allowClear>
                              <Select.Option value="exec">exec</Select.Option>
                              <Select.Option value="httpGet">httpGet</Select.Option>
                            </Select>
                          </Form.Item>
                        </Space>
                      )
                    }
                  ]}
                  expandIcon={() => null}
                  style={{ backgroundColor: 'transparent', border: 'none' }}
                />
              </Space>
            </Form.Item>

            {/* 优雅中止等待时间 */}
            <Form.Item
              name="gracePeriodSeconds"
              label="优雅中止等待时间"
              rules={[{ required: true, message: '请输入等待时间' }]}
            >
              <InputNumber
                min={0}
                max={300}
                addonAfter="秒"
                placeholder="请输入"
                style={{ width: 160 }}
              />
            </Form.Item>

            {/* 对外端口 */}
            <Form.Item
              name="publicPort"
              label="对外端口"
              rules={[{ required: true, message: '请选择对外端口' }]}
            >
              <Select>
                <Select.Option value="8080">8080</Select.Option>
                <Select.Option value="8081">8081</Select.Option>
                <Select.Option value="9090">9090</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Drawer>

        {/* 变更详情 Modal */}
        <Modal
          title="变更详情"
          open={changeDetailModalOpen}
          onCancel={() => setChangeDetailModalOpen(false)}
          onOk={() => {
            setChangeDetailModalOpen(false)
            // 执行变更逻辑
          }}
          okText="关闭"
          width={1000}
          zIndex={1001}
        >
          <Space direction="vertical" style={{ width: '100%', marginBottom: 24, gap: 16 }}>
            <Text>请确认变更内容。如需修改，请前往应用详情进行调整：</Text>
            
            <Table
              dataSource={[
                {
                  key: '1',
                  app: 'test-delete-pods',
                  changeItem: '资源配置CPU',
                  before: 'game-server:0.003 C',
                  after: 'game-server:0.001 C'
                }
              ]}
              columns={[
                {
                  title: '应用',
                  dataIndex: 'app',
                  key: 'app',
                  width: 140,
                  render: (text: string) => (
                    <div style={{ width: 140 }}>
                      <Text strong>{text}</Text>
                    </div>
                  )
                },
                {
                  title: '变更项目',
                  dataIndex: 'changeItem',
                  key: 'changeItem',
                  width: 120
                },
                {
                  title: '变更前',
                  dataIndex: 'before',
                  key: 'before',
                  width: 360,
                  render: (text: string) => (
                    <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 2 }}>
                      <Text>{text}</Text>
                    </div>
                  )
                },
                {
                  title: '变更后',
                  dataIndex: 'after',
                  key: 'after',
                  width: 360,
                  render: (text: string) => (
                    <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 2 }}>
                      <Text style={{ color: '#389e0d' }}>{text}</Text>
                    </div>
                  )
                }
              ]}
              pagination={false}
              size="small"
            />
          </Space>
        </Modal>
      </div>
    </div>
  )
}