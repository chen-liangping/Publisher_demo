"use client"

import React from 'react'
import { Drawer, Button, Tag, Typography, Space, Tooltip, message, Row, Col } from 'antd'
import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons'

const { Title } = Typography

interface DBInstance {
  id: string
  type: string
  alias: string
  spec?: string
  arch?: string
  username?: string
  password?: string
  gameId?: string
  version?: string
  connectionCount?: number
  defaultPort?: number
  capacity?: string
  qos?: string
  bandwidth?: string
  evictionPolicy?: string
  mangoSpec?: string
  shardSpec?: string
  mangoCount?: number
  shardCount?: number
}

const typeColorMap: Record<string, string> = {
  MySQL: 'magenta',
  Redis: 'red',
  Mango: 'gold',
  Zookeeper: 'blue'
}

interface Props {
  instance: DBInstance
  onBack?: () => void
}

export default function DatabaseDetails({ instance, onBack }: Props) {
  const [messageApi, contextHolder] = message.useMessage()

  // 通用复制文字到剪贴板并提示
  const copyText = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea') as HTMLTextAreaElement
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      messageApi.success('已复制')
    } catch {
      messageApi.error('复制失败')
    }
  }

  const gameId = instance.gameId || 'gamedemo'
  const internalEndpoint = `${instance.alias}.${gameId}.internal`
  const publicEndpoint = `${instance.alias}.${gameId}.com`

  return (
    <Drawer
      open={true}
      onClose={() => onBack && onBack()}
      width={720}
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Title level={5} style={{ margin: 0 }}>{instance.alias}</Title><Tag color={typeColorMap[instance.type] || 'blue'}>{instance.type}</Tag></div>}
    >
      {contextHolder}
      <div style={{ background: '#fafafa', padding: 20, borderRadius: 8, border: '1px solid #f0f0f0' }}>
        {/* 公网 & 内网 放前面 */}
        <div style={{ display: 'flex', padding: '12px 0', alignItems: 'center', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ width: 160, color: '#666', fontSize: 14 }}>公网 endpoint</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14 }}>{publicEndpoint}</div>
            <div>
              <Tooltip title="复制公网 endpoint">
                <Button type="text" icon={<CopyOutlined />} onClick={() => copyText(publicEndpoint)} />
              </Tooltip>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', padding: '12px 0', alignItems: 'center', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ width: 160, color: '#666', fontSize: 14 }}>内网 endpoint</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14 }}>{internalEndpoint}</div>
            <div>
              <Tooltip title="复制内网 endpoint">
                <Button type="text" icon={<CopyOutlined />} onClick={() => copyText(internalEndpoint)} />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 其它字段，左标签右值 */}
        {[
          ['版本', instance.version || '-'],
          ['实例规格', instance.spec || '-'],
          ['架构类型', instance.arch || '-'],
          ['容量', instance.capacity || '-'],
          ['默认端口', instance.defaultPort ?? '-'],
          ['连接数', instance.connectionCount ?? '-'],
          ['参考QOS', instance.qos || '-'],
          ['最大带宽', instance.bandwidth || '-'],
          ['内存淘汰策略', instance.evictionPolicy || '-'],
          ['登录用户名', instance.username || '-'],
        ].map(([label, val]) => (
          <div key={String(label)} style={{ display: 'flex', padding: '12px 0', alignItems: 'center', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ width: 160, color: '#666', fontSize: 14 }}>{label}</div>
            <div style={{ flex: 1, fontSize: 14 }}>{val}</div>
          </div>
        ))}

        <div style={{ display: 'flex', padding: '12px 0', alignItems: 'center' }}>
          <div style={{ width: 160, color: '#666', fontSize: 14 }}>登录密码</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14 }}>****</div>
            <div>
              <Tooltip title="复制密码">
                <Button type="text" icon={<CopyOutlined />} onClick={() => copyText(instance.password || '')} />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

