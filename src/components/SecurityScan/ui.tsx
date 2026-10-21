'use client'

/**
 * 安全扫描共用的展示组件。
 * Tag 规范：全圆角、无描边、按值分色、低透明度背景（见 .cursor/skills/UI规范）。
 */

import React from 'react'
import { Table, Tag, Typography } from 'antd'

import type { ApiParam, AuthType, HttpMethod, RiskLevel } from './types'

interface PillProps {
  bg: string
  color: string
  children: React.ReactNode
  mono?: boolean
}

export function Pill({ bg, color, children, mono = false }: PillProps): React.ReactElement {
  return (
    <Tag
      bordered={false}
      style={{
        border: 0,
        borderRadius: 999,
        background: bg,
        color,
        marginInlineEnd: 4,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined
      }}
    >
      {children}
    </Tag>
  )
}

const METHOD_STYLE: Record<HttpMethod, { bg: string; color: string }> = {
  GET: { bg: 'rgba(22, 119, 255, 0.10)', color: '#0958d9' },
  POST: { bg: 'rgba(82, 196, 26, 0.12)', color: '#389e0d' },
  PUT: { bg: 'rgba(250, 173, 20, 0.16)', color: '#d48806' },
  PATCH: { bg: 'rgba(114, 46, 209, 0.10)', color: '#531dab' },
  DELETE: { bg: 'rgba(255, 77, 79, 0.14)', color: '#cf1322' }
}

export function MethodTag({ method }: { method: HttpMethod }): React.ReactElement {
  const s = METHOD_STYLE[method]
  return (
    <Pill bg={s.bg} color={s.color} mono>
      {method}
    </Pill>
  )
}

export const riskLabel: Record<RiskLevel, string> = { high: '高', mid: '中', low: '低' }

export const RISK_STYLE: Record<RiskLevel, { bg: string; color: string }> = {
  high: { bg: 'rgba(255, 77, 79, 0.14)', color: '#cf1322' },
  mid: { bg: 'rgba(250, 140, 22, 0.16)', color: '#d46b08' },
  low: { bg: 'rgba(82, 196, 26, 0.12)', color: '#389e0d' }
}

export function RiskTag({ level, prefix = '' }: { level: RiskLevel; prefix?: string }): React.ReactElement {
  const s = RISK_STYLE[level]
  return (
    <Pill bg={s.bg} color={s.color}>
      {prefix}
      {riskLabel[level]}
    </Pill>
  )
}

export const authLabel: Record<AuthType, string> = {
  none: '无鉴权',
  static_token: '静态 Token',
  basic: 'Basic Auth',
  ip_whitelist: 'IP 白名单',
  signature: '签名校验',
  jwt: 'JWT',
  session: 'Session',
  platform_token: '平台 Token',
  unknown: '未识别'
}

/** 鉴权按强度分色：无=红，弱/未识别=橙，IP 白名单=灰，强=蓝 */
const AUTH_STYLE: Record<AuthType, { bg: string; color: string }> = {
  none: RISK_STYLE.high,
  static_token: RISK_STYLE.mid,
  basic: RISK_STYLE.mid,
  unknown: RISK_STYLE.mid,
  ip_whitelist: { bg: 'rgba(0, 0, 0, 0.06)', color: 'rgba(0, 0, 0, 0.65)' },
  signature: { bg: 'rgba(22, 119, 255, 0.10)', color: '#0958d9' },
  jwt: { bg: 'rgba(22, 119, 255, 0.10)', color: '#0958d9' },
  session: { bg: 'rgba(22, 119, 255, 0.10)', color: '#0958d9' },
  platform_token: { bg: 'rgba(22, 119, 255, 0.10)', color: '#0958d9' }
}

export function AuthTags({ auths, replayProtect = true }: { auths: AuthType[]; replayProtect?: boolean }): React.ReactElement {
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', rowGap: 4 }}>
      {auths.map(a => {
        // 签名无防重放时按弱鉴权上色
        const s = a === 'signature' && !replayProtect ? RISK_STYLE.mid : AUTH_STYLE[a]
        return (
          <Pill key={a} bg={s.bg} color={s.color}>
            {a === 'signature' && !replayProtect ? '签名（无防重放）' : authLabel[a]}
          </Pill>
        )
      })}
    </span>
  )
}

export function ImageTag({ image }: { image: string }): React.ReactElement {
  return (
    <Pill bg="rgba(0, 0, 0, 0.05)" color="rgba(0, 0, 0, 0.70)" mono>
      {image}
    </Pill>
  )
}

export function PublicTag(): React.ReactElement {
  return (
    <Pill bg="rgba(22, 119, 255, 0.10)" color="#0958d9">
      公网
    </Pill>
  )
}

export function NewTag(): React.ReactElement {
  return (
    <Pill bg="rgba(114, 46, 209, 0.10)" color="#531dab">
      本次新增
    </Pill>
  )
}

export const formatParams = (names: string[]): string => (names.length > 0 ? names.join(', ') : '—')

/** 入参明细表：用户侧与管理后台详情共用同一格式 */
export function ParamsTable({ params }: { params: ApiParam[] }): React.ReactElement {
  return (
    <Table<ApiParam>
      style={{ marginTop: 8 }}
      size="small"
      rowKey="name"
      pagination={false}
      dataSource={params}
      locale={{ emptyText: '无入参' }}
      columns={[
        { title: '字段', dataIndex: 'name', render: (v: string) => <Typography.Text code>{v}</Typography.Text> },
        { title: '类型', dataIndex: 'type' },
        { title: '必填', dataIndex: 'required', render: (v: boolean) => (v ? '是' : '否') },
        { title: '位置', dataIndex: 'location' },
        { title: '说明', dataIndex: 'description', render: (v: string | undefined) => v ?? '—' }
      ]}
    />
  )
}
