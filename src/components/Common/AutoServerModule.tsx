'use client'

import React from 'react'
import { Card, Button, Progress, Tag } from 'antd'

const labelColumnWidth = 120
const rightColumnWidth = 380
const stepDescWidth = 180

export default function AutoServerModule() {
  return (
    <Card style={{ borderRadius: 8, borderColor: '#E5E7EB', marginBottom: 24 }} styles={{ body: { padding: 0 } }}>
      {/* header with actions */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>自动开服</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button type="default">更新开服配置</Button>
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
                  <div style={{ position: 'relative', width: '50%' }}>
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
              <div style={{ color: '#888' }}>满足"付费人数 100 人"任一条件后自动开服</div>
            </div>
          </div>

          {/* Next resources */}
          {/* <div style={{ display: 'flex' }}>
            <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>下次开服资源</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: '#888' }}>应用 单一服，内存 64Mi，<span style={{ color: '#f1c40f' }}>可突发至0.4C</span></div>
                <div style={{ color: '#888' }}>应用 多活服2，内存 64Mi，<span style={{ color: '#f1c40f' }}>可突发至0.4C</span></div>
                <div style={{ color: '#888' }}>应用 多活服1，内存 64Mi，<span style={{ color: '#f1c40f' }}>可突发至0.4C</span></div>
              </div>
            </div>
          </div> */}
        </div>

        <div style={{ width: rightColumnWidth, padding: '16px 24px', marginLeft: -60 }}>
          <div style={{ transform: 'translateX(-300px)' }}>
            {/* App list */}
            {/* <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: labelColumnWidth, fontWeight: 700, whiteSpace: 'nowrap' }}>应用列表</div>
              <div style={{ flex: 1 }}>master, worker-2, worker-1</div>
            </div> */}

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
                 {/* <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: stepDescWidth }}>部署启动预备服</div>
                    <Tag style={{ background: 'transparent', color: 'rgba(0,0,0,0.25)' }}>等待执行</Tag>
                  </div>*/}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
