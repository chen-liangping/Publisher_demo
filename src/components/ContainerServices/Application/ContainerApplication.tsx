'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Row, Col, Card, Button, Input, Typography, Space, Tag, Progress, Drawer } from 'antd'
import Deployment from './deployment'
import DeploymentOther from './deployment_other'
import { MoreOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons'
import { apps, AppItem as AppItemType } from './apps'

const { Title, Text } = Typography

// apps 数据从 ./apps.ts 导出并复用

const statusColor = (s: AppItemType['status']) => {
  if (s === 'running') return '#52c41a'
  if (s === 'failed') return '#ff4d4f'
  return '#9CA3AF'
}

export default function ContainerApplication({ onOpenDeployment }: { onOpenDeployment?: (id: string) => void }) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const [selectedApp, setSelectedApp] = useState<AppItemType | null>(null)

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
  return (
    <div className="container mx-auto p-6">
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: '28px' }}>
          应用
        </Title>
        <Text style={{ color: '#666', fontSize: 14, marginTop: 8, display: 'block' }}>
          应用是用来承载游戏内的功能模块。应用内可配置多个Pod（容器）来分别对应不同的服务功能。每个Pod对应一个镜像及其镜像仓库启动方式。
        </Text>
      </div>

      {/* 搜索 & 添加 区 */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <Button type="primary" style={{ width: 100, height: 32, marginRight: 12 }}>
          + 添加应用
        </Button>
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
                  <Button style={{ height: 32, borderColor: '#d9d9d9' }}>更新部署</Button>
                  <Button style={{ height: 32, borderColor: '#d9d9d9' }}>登录 Pod</Button>
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
      </div>
    </div>
  )
}