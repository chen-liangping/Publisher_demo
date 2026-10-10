'use client'

/**
 * CP 账号访问已封禁 appId 时的整页遮罩（PRD 四·4.1 规则 4-5）。
 *
 * 封禁是把 CP 账号在该 appId 下的权限整体撤销，不是把按钮置灰——
 * 所以这里遮的是整个内容区，底下的资源内容不渲染、不可见、不可交互。
 * 遮罩不暴露封禁时间、操作人等任何封禁信息。
 */

import React from 'react'
import { LockOutlined } from '@ant-design/icons'
import { Typography } from 'antd'

const { Text, Title } = Typography

export default function BlockedOverlay(): React.ReactElement {
  return (
    <div
      style={{
        minHeight: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.04)',
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.28)'
      }}
    >
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 420 }}>
        <LockOutlined style={{ fontSize: 40, color: 'rgba(15, 23, 42, 0.35)' }} />
        <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
          当前游戏暂不可访问
        </Title>
        <Text type="secondary">请联系平台对接人</Text>
      </div>
    </div>
  )
}
