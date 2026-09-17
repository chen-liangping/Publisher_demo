'use client'

/**
 * 已封禁 appId 的常驻红色横幅（PRD 五、封禁后的控制台表现 规则 3）。
 * 只在管理后台展示：封禁的事实与依据不对 CP 暴露，用户侧只表现为操作不可用。
 */

import React from 'react'
import { Alert, Button, Space, Typography } from 'antd'

import type { BanInfo } from './types'

const { Text } = Typography

interface BannedBannerProps {
  banInfo: BanInfo
  /** 点击「查看扫描差异」：跳到详情页的凭证与封禁 Tab */
  onViewLog: () => void
}

export default function BannedBanner({ banInfo, onViewLog }: BannedBannerProps): React.ReactElement {
  return (
    <Alert
      type="error"
      banner
      showIcon
      closable={false}
      style={{ marginBottom: 16, borderRadius: 8 }}
      message={
        <Space size={16} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
          <Text strong>
            {`该游戏已于 ${banInfo.bannedAt} 被封禁（操作人：${banInfo.operator}）`}
          </Text>
          {/* 交互意图：封禁横幅提供唯一的排查入口，避免用户以为系统故障 */}
          <Button type="link" size="small" onClick={onViewLog} style={{ padding: 0 }}>
            查看扫描差异
          </Button>
        </Space>
      }
    />
  )
}
