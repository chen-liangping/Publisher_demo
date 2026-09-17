'use client'

/**
 * 扫描差异展示（PRD 三、封禁前资源扫描 规则 2-6）。
 *
 * 左右对比：左列是平台基线（预期），右列是扫描到的实际配置。
 * 实际多出的行右侧绿底、基线要求但实际缺失的行左侧红底、同项取值不同的两侧都标色。
 */

import React from 'react'
import { Alert, Collapse, Empty, Tag, Typography } from 'antd'

import { countBypassable } from './scan'
import type { DiffRow, ScanFinding } from './types'

const { Text } = Typography

const ADDED_BG = '#e6ffec'
const ADDED_FG = '#1a7f37'
const REMOVED_BG = '#ffebe9'
const REMOVED_FG = '#cf222e'

/** 一侧单元格的底色与字色：没有内容的一侧用中性占位，不上色 */
function cellStyle(row: DiffRow, side: 'left' | 'right'): React.CSSProperties {
  const base: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '0 10px',
    whiteSpace: 'pre',
    overflowX: 'auto',
    color: '#57606a'
  }
  if (row.type === 'added') {
    return side === 'right'
      ? { ...base, background: ADDED_BG, color: ADDED_FG }
      : { ...base, background: '#fafbfc' }
  }
  if (row.type === 'removed') {
    return side === 'left'
      ? { ...base, background: REMOVED_BG, color: REMOVED_FG }
      : { ...base, background: '#fafbfc' }
  }
  if (row.type === 'changed') {
    return side === 'left'
      ? { ...base, background: REMOVED_BG, color: REMOVED_FG }
      : { ...base, background: ADDED_BG, color: ADDED_FG }
  }
  return base
}

function SplitDiff({ rows }: { rows: DiffRow[] }): React.ReactElement {
  return (
    <div
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 12,
        lineHeight: '20px',
        border: '1px solid #d0d7de',
        borderRadius: 6,
        overflow: 'hidden'
      }}
    >
      {/* 表头：明确左边是预期、右边是实际 */}
      <div style={{ display: 'flex', background: '#f6f8fa', borderBottom: '1px solid #d0d7de', fontWeight: 600 }}>
        <div style={{ flex: 1, minWidth: 0, padding: '4px 10px', color: '#24292f' }}>预期 · 平台基线</div>
        <div style={{ width: 1, background: '#d0d7de' }} />
        <div style={{ flex: 1, minWidth: 0, padding: '4px 10px', color: '#24292f' }}>实际 · 当前配置</div>
      </div>
      {rows.map((row, index) =>
        row.type === 'meta' ? (
          <div
            key={`meta-${index}`}
            style={{ background: '#ddf4ff', color: '#0969da', padding: '2px 10px', whiteSpace: 'pre' }}
          >
            {row.left}
          </div>
        ) : (
          <div key={`${row.type}-${index}`} style={{ display: 'flex' }}>
            <div style={cellStyle(row, 'left')}>{row.left || ' '}</div>
            <div style={{ width: 1, background: '#d0d7de' }} />
            <div style={cellStyle(row, 'right')}>{row.right || ' '}</div>
          </div>
        )
      )}
    </div>
  )
}

interface ScanDiffViewProps {
  findings: ScanFinding[]
}

export default function ScanDiffView({ findings }: ScanDiffViewProps): React.ReactElement {
  const bypassCount = countBypassable(findings)

  if (findings.length === 0) {
    return <Empty description="未扫描到与平台基线的差异" />
  }

  // 可绕过的排前面并默认展开，噪音与失败项排末尾
  const ordered = [...findings].sort((a, b) => Number(b.bypassable) - Number(a.bypassable))
  const defaultActive = ordered.filter(f => f.bypassable && !f.failed).map(f => f.id)

  return (
    <div>
      <Alert
        type={bypassCount > 0 ? 'error' : 'success'}
        showIcon
        style={{ marginBottom: 12 }}
        message={
          bypassCount > 0
            ? `该 appId 存在 ${bypassCount} 项可绕过封禁的授权，封禁后仍可访问资源`
            : '未发现可绕过封禁的旁路授权'
        }
      />
      <Collapse
        defaultActiveKey={defaultActive}
        items={ordered.map(finding => ({
          key: finding.id,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text strong>{finding.category}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {finding.target}
              </Text>
              {finding.failed ? (
                <Tag style={{ border: 0, borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: '#595959' }}>
                  扫描失败
                </Tag>
              ) : (
                <Tag
                  style={{
                    border: 0,
                    borderRadius: 999,
                    background: finding.bypassable ? 'rgba(255,77,79,0.14)' : 'rgba(0,0,0,0.06)',
                    color: finding.bypassable ? '#cf1322' : '#595959'
                  }}
                >
                  {finding.bypassable ? '可绕过封禁' : '不可绕过'}
                </Tag>
              )}
            </div>
          ),
          children: finding.failed ? (
            <Text type="secondary">{`扫描失败：${finding.failReason}`}</Text>
          ) : (
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                {finding.summary}
              </Text>
              <SplitDiff rows={finding.diff} />
            </div>
          )
        }))}
      />
    </div>
  )
}
