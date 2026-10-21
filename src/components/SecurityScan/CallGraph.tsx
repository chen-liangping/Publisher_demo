'use client'

/**
 * 管理后台 · API 资产 →【应用调用关系】
 *
 * 一张图看应用之间如何调用：节点是应用 / 外部调用方 / 平台服务 / 数据存储，边是调用关系。
 * 点击一条边，右侧列出这条调用落到的具体 API（作用、风险），以及凭证与判断依据；
 * 点击一个节点，列出它被谁调用、调用了谁。
 */

import React, { useMemo, useState } from 'react'
import { Card, Empty, Segmented, Space, Typography } from 'antd'

import { NODE_H, NODE_W, graphEdges, graphNodes } from './callGraphData'
import type { GraphEdge, GraphNode, GraphNodeKind } from './callGraphData'
import type { HttpMethod, RiskLevel } from './types'
import { MethodTag, Pill, RISK_STYLE, RiskTag } from './ui'

const { Text, Paragraph } = Typography

export interface ApiBrief {
  purpose: string
  risk: RiskLevel
}

interface CallGraphProps {
  /** API 清单里的作用与风险，key = ApiAsset.id */
  apiBrief: Record<string, ApiBrief>
  /** 打开 API 详情抽屉 */
  onOpenApi: (apiId: string) => void
}

type Selected = { type: 'edge'; id: string } | { type: 'node'; id: string } | null
type EdgeFilter = 'all' | 'risky'

const VIEW_W = 1100
const VIEW_H = 520

const EDGE_COLOR: Record<RiskLevel, string> = {
  high: '#cf1322',
  mid: '#d46b08',
  low: '#a3a9b3'
}

const NODE_STYLE: Record<GraphNodeKind, { fill: string; stroke: string; tag: string }> = {
  external: { fill: '#ffffff', stroke: '#d9d9d9', tag: '外部' },
  app: { fill: '#ffffff', stroke: '#1677ff', tag: '本游戏应用' },
  platform: { fill: '#f6f0ff', stroke: '#b37feb', tag: '平台服务' },
  data: { fill: '#f5f5f5', stroke: '#d9d9d9', tag: '数据' }
}

const cardStyle: React.CSSProperties = { borderRadius: 12, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' }
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }
const HTTP_METHODS: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/** 从节点中心沿方向延伸到矩形边框 */
const clipToRect = (cx: number, cy: number, dx: number, dy: number): [number, number] => {
  const hw = NODE_W / 2 + 4
  const hh = NODE_H / 2 + 4
  const t = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy))
  return [cx + dx * t, cy + dy * t]
}

interface EdgeGeom {
  edge: GraphEdge
  x1: number
  y1: number
  x2: number
  y2: number
  lx: number
  ly: number
}

const layoutEdges = (edges: GraphEdge[], nodes: GraphNode[]): EdgeGeom[] => {
  const byId = new Map(nodes.map(n => [n.id, n]))
  return edges.flatMap(edge => {
    const a = byId.get(edge.from)
    const b = byId.get(edge.to)
    if (!a || !b) return []
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    // 双向调用的两条边沿法线错开，避免重叠
    const hasReverse = edges.some(e => e.from === edge.to && e.to === edge.from)
    const off = hasReverse ? 9 : 0
    const ox = (-dy / len) * off
    const oy = (dx / len) * off
    const [x1, y1] = clipToRect(a.x + ox, a.y + oy, dx, dy)
    const [x2, y2] = clipToRect(b.x + ox, b.y + oy, -dx, -dy)
    const lift = hasReverse ? 14 : 0
    const t = edge.labelAt ?? 0.5
    return [{ edge, x1, y1, x2, y2, lx: x1 + (x2 - x1) * t + (-dy / len) * lift, ly: y1 + (y2 - y1) * t + (dx / len) * lift }]
  })
}

function ApiLine({ api, brief, onOpen }: { api: GraphEdge['apis'][number]; brief: ApiBrief | null; onOpen: () => void }): React.ReactElement {
  const isHttp = HTTP_METHODS.includes(api.method)
  return (
    <div style={{ padding: '8px 10px', borderRadius: 8, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Space size={4} wrap>
        {isHttp ? (
          <MethodTag method={api.method as HttpMethod} />
        ) : (
          <Pill bg="rgba(0, 0, 0, 0.06)" color="rgba(0, 0, 0, 0.65)" mono>
            {api.method}
          </Pill>
        )}
        {api.apiId ? (
          // 交互：已登记的接口可打开 API 详情
          <Typography.Link style={mono} onClick={onOpen}>
            {api.path}
          </Typography.Link>
        ) : (
          <Text style={mono}>{api.path}</Text>
        )}
        {brief && <RiskTag level={brief.risk} />}
        {!api.apiId && isHttp && (
          <Pill bg="rgba(250, 173, 20, 0.16)" color="#d48806">
            未在清单中
          </Pill>
        )}
      </Space>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {brief?.purpose || api.desc || '—'}
      </Text>
    </div>
  )
}

export default function CallGraph({ apiBrief, onOpenApi }: CallGraphProps): React.ReactElement {
  const [filter, setFilter] = useState<EdgeFilter>('all')
  const [selected, setSelected] = useState<Selected>(null)

  const edges = useMemo(
    () => (filter === 'risky' ? graphEdges.filter(e => e.risk !== 'low') : graphEdges),
    [filter]
  )
  const geoms = useMemo(() => layoutEdges(edges, graphNodes), [edges])
  const nodeName = (id: string): string => graphNodes.find(n => n.id === id)?.name ?? id

  const isEdgeActive = (e: GraphEdge): boolean => {
    if (!selected) return true
    if (selected.type === 'edge') return selected.id === e.id
    return e.from === selected.id || e.to === selected.id
  }

  const riskyEdges = graphEdges
    .filter(e => e.risk !== 'low')
    .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === 'high' ? -1 : 1))

  const edgeButton = (e: GraphEdge): React.ReactElement => (
    <button
      key={e.id}
      type="button"
      onClick={() => setSelected({ type: 'edge', id: e.id })}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: '8px 10px',
        borderRadius: 8,
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: 32
      }}
    >
      <Space size={6}>
        <RiskTag level={e.risk} />
        <Text strong>
          {nodeName(e.from)} → {nodeName(e.to)}
        </Text>
        <Text type="secondary">{e.label}</Text>
      </Space>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {e.riskReason}
      </Text>
    </button>
  )

  const renderPanel = (): React.ReactElement => {
    if (selected?.type === 'edge') {
      const e = graphEdges.find(x => x.id === selected.id)
      if (!e) return <Empty />
      return (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {nodeName(e.from)} → {nodeName(e.to)}
            </Text>
            <div style={{ marginTop: 6 }}>
              <RiskTag level={e.risk} prefix="调用风险 " />
              <Pill bg="rgba(0, 0, 0, 0.05)" color="rgba(0, 0, 0, 0.65)">
                {e.via}
              </Pill>
              {e.credential && (
                <Pill bg={RISK_STYLE.mid.bg} color={RISK_STYLE.mid.color}>
                  凭证 {e.credential}
                </Pill>
              )}
            </div>
          </div>
          <div>
            <Text strong>说明</Text>
            <Paragraph style={{ margin: '4px 0 0' }}>{e.riskReason}</Paragraph>
          </div>
          <div>
            <Text strong>调用的接口（{e.apis.length}）</Text>
            <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
              {e.apis.map(api => (
                <ApiLine
                  key={api.path}
                  api={api}
                  brief={api.apiId ? apiBrief[api.apiId] ?? null : null}
                  onOpen={() => api.apiId && onOpenApi(api.apiId)}
                />
              ))}
            </Space>
          </div>
          <div>
            <Text strong>判断依据</Text>
            <Paragraph type="secondary" style={{ margin: '4px 0 0', ...mono }}>
              {e.evidence}
            </Paragraph>
          </div>
        </Space>
      )
    }
    if (selected?.type === 'node') {
      const n = graphNodes.find(x => x.id === selected.id)
      if (!n) return <Empty />
      const inbound = graphEdges.filter(e => e.to === n.id)
      const outbound = graphEdges.filter(e => e.from === n.id)
      return (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {n.name}
            </Text>
            <div>
              <Text type="secondary">
                {NODE_STYLE[n.kind].tag} · {n.desc}
              </Text>
            </div>
          </div>
          <div>
            <Text strong>被谁调用（{inbound.length}）</Text>
            <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
              {inbound.length === 0 ? <Text type="secondary">—</Text> : inbound.map(edgeButton)}
            </Space>
          </div>
          <div>
            <Text strong>调用了谁（{outbound.length}）</Text>
            <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
              {outbound.length === 0 ? <Text type="secondary">—</Text> : outbound.map(edgeButton)}
            </Space>
          </div>
        </Space>
      )
    }
    return (
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Text strong>需要关注的调用（{riskyEdges.length}）</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          点击图中的连线查看调用了哪些接口，点击节点查看它的上下游。
        </Text>
        {riskyEdges.map(edgeButton)}
      </Space>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Card
        style={{ ...cardStyle, flex: '999 1 640px', minWidth: 0 }}
        styles={{ body: { padding: 16 } }}
        title="应用调用关系"
        extra={
          <Segmented<EdgeFilter>
            value={filter}
            onChange={v => {
              setFilter(v)
              setSelected(null)
            }}
            options={[
              { label: '全部调用', value: 'all' },
              { label: '只看有风险的', value: 'risky' }
            ]}
          />
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            style={{ width: '100%', minWidth: 760, display: 'block' }}
            role="img"
            aria-label="应用调用关系图"
            onClick={() => setSelected(null)}
          >
            <defs>
              {(Object.keys(EDGE_COLOR) as RiskLevel[]).map(level => (
                <marker key={level} id={`arrow-${level}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLOR[level]} />
                </marker>
              ))}
            </defs>

            {/* 分层标注 */}
            {[
              { y: 70, text: '外部' },
              { y: 260, text: '本游戏应用' },
              { y: 450, text: '平台 / 数据' }
            ].map(l => (
              <text key={l.text} x={8} y={l.y - NODE_H / 2 - 14} fontSize={12} fill="rgba(0,0,0,0.45)">
                {l.text}
              </text>
            ))}

            {geoms.map(g => {
              const active = isEdgeActive(g.edge)
              const color = EDGE_COLOR[g.edge.risk]
              const labelW = g.edge.label.length * 13 + 16
              return (
                <g
                  key={g.edge.id}
                  style={{ cursor: 'pointer', opacity: active ? 1 : 0.18 }}
                  onClick={ev => {
                    ev.stopPropagation()
                    setSelected({ type: 'edge', id: g.edge.id })
                  }}
                >
                  <title>{`${nodeName(g.edge.from)} → ${nodeName(g.edge.to)}：${g.edge.label}`}</title>
                  {/* 加宽的透明命中区域，方便点击 */}
                  <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="transparent" strokeWidth={16} />
                  <line
                    x1={g.x1}
                    y1={g.y1}
                    x2={g.x2}
                    y2={g.y2}
                    stroke={color}
                    strokeWidth={g.edge.risk === 'low' ? 1.5 : 2}
                    strokeDasharray={g.edge.credential ? '6 4' : undefined}
                    markerEnd={`url(#arrow-${g.edge.risk})`}
                  />
                  <rect x={g.lx - labelW / 2} y={g.ly - 11} width={labelW} height={22} rx={11} fill="#ffffff" stroke={g.edge.risk === 'low' ? '#e5e7eb' : color} />
                  <text x={g.lx} y={g.ly + 4} fontSize={12} textAnchor="middle" fill={g.edge.risk === 'low' ? 'rgba(0,0,0,0.65)' : color}>
                    {g.edge.label}
                  </text>
                </g>
              )
            })}

            {graphNodes.map(n => {
              const s = NODE_STYLE[n.kind]
              const isSel = selected?.type === 'node' && selected.id === n.id
              const dim = selected !== null && !isSel && !(selected.type === 'edge' && graphEdges.some(e => e.id === selected.id && (e.from === n.id || e.to === n.id))) && !(selected.type === 'node' && graphEdges.some(e => (e.from === selected.id && e.to === n.id) || (e.to === selected.id && e.from === n.id)))
              return (
                <g
                  key={n.id}
                  style={{ cursor: 'pointer', opacity: dim ? 0.35 : 1 }}
                  onClick={ev => {
                    ev.stopPropagation()
                    setSelected({ type: 'node', id: n.id })
                  }}
                >
                  <title>{`${n.name}：${n.desc}`}</title>
                  <rect
                    x={n.x - NODE_W / 2}
                    y={n.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill={s.fill}
                    stroke={isSel ? '#1677ff' : s.stroke}
                    strokeWidth={n.kind === 'app' || isSel ? 2 : 1}
                  />
                  <text x={n.x} y={n.y - 4} fontSize={15} fontWeight={600} textAnchor="middle" fill="#1f2329">
                    {n.name}
                  </text>
                  <text x={n.x} y={n.y + 16} fontSize={12} textAnchor="middle" fill="rgba(0,0,0,0.5)">
                    {n.desc}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <Space size={16} wrap style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
          <span>
            <span style={{ display: 'inline-block', width: 20, borderTop: `2px solid ${EDGE_COLOR.high}`, verticalAlign: 'middle', marginRight: 6 }} />
            高风险调用
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 20, borderTop: `2px solid ${EDGE_COLOR.mid}`, verticalAlign: 'middle', marginRight: 6 }} />
            中风险调用
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 20, borderTop: `2px dashed ${EDGE_COLOR.low}`, verticalAlign: 'middle', marginRight: 6 }} />
            虚线：携带凭证（key / token）
          </span>
          <span>蓝框：本游戏应用</span>
        </Space>
      </Card>

      <Card style={{ ...cardStyle, flex: '1 1 340px', minWidth: 0 }} styles={{ body: { padding: 16 } }}>
        {renderPanel()}
      </Card>
    </div>
  )
}
