'use client'

import React, { useState } from 'react'
import { Typography, Tag } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { formatZoneLangLabel, type LaunchHistoryItem as LaunchHistoryItemType } from './autoLaunchMock'

dayjs.extend(utc)
dayjs.extend(timezone)

const { Text } = Typography

// AI 开服历史条目：可展开查看开服原因；当前语种导流服条目不可展开
export default function LaunchHistoryItem({ item }: { item: LaunchHistoryItemType }) {
  const [open, setOpen] = useState(false)
  const { serverId, triggeredAt, lang, reason, isOnboarding } = item
  // 时间统一格式化为 JST 展示
  const formattedTime = `${dayjs.utc(triggeredAt).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')} (JST)`
  const langLabel = formatZoneLangLabel(lang)

  // 导流服条目：禁止展开，summary 用静态箭头
  if (isOnboarding) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderRadius: 8,
          background: 'rgba(114, 46, 209, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag style={{ borderRadius: 999, border: 0, background: 'rgba(114, 46, 209, 0.12)', color: '#722ED1', margin: 0 }}>
            导流服
          </Tag>
          <Text strong>
            ID <em style={{ fontStyle: 'normal' }}>{serverId}</em>
          </Text>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {langLabel}｜{formattedTime}
        </Text>
      </div>
    )
  }

  // 普通游服条目：可展开
  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RightOutlined style={{ fontSize: 12, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }} />
          <Text>
            游服 <strong>ID</strong> <em style={{ fontStyle: 'normal' }}>{serverId}</em>
          </Text>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {langLabel}｜{formattedTime}
        </Text>
      </div>
      {open ? (
        <div style={{ padding: '4px 8px 8px 28px' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {reason}
          </Text>
        </div>
      ) : null}
    </div>
  )
}
