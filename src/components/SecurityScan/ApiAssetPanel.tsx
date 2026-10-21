'use client'

/**
 * 管理后台 · 平台游戏详情 →【API 资产】（只读）
 *
 * 平台在每次部署时自动解析，管理后台始终可见，不依赖 CP 是否开启；
 * CP 在用户侧「监控 → 安全扫描」开启，只是让 CP 也能看到并确认作用、上传 API 文档。
 * 按应用展示每个 API 的作用、入参、鉴权、暴露、风险等级与命中原因，用于封禁决策。
 * 管理员不编辑作用；作用优先级：CP 修改 > CP 上传文档 > 系统推断。
 * 列表只放判断用的核心字段，暴露与命中原因放在详情。
 * 另有「应用调用关系」视图：应用间如何调用，每条调用落到哪些 API。
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Card, Col, Collapse, Descriptions, Drawer, Empty, Input, Row, Segmented, Select, Space, Statistic, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'

import { PLATFORM_PARSED_AT, credentials, scannedApps } from './mock'
import CallGraph from './CallGraph'
import { evaluateRisk, suggestAction } from './risk'
import { allApis, hydrateScanStore, purposeOf, useScanState } from './store'
import type { ApiAsset, AuthType, Credential, Exposure, PurposeRecord, RiskLevel, RiskResult } from './types'
import { AuthTags, ImageTag, MethodTag, NewTag, ParamsTable, Pill, PublicTag, RISK_STYLE, RiskTag, authLabel, formatParams } from './ui'

const { Text, Paragraph } = Typography

interface ApiAssetPanelProps {
  appId: string
}

interface AssetRow {
  api: ApiAsset
  purpose: PurposeRecord
  risk: RiskResult
}

type RiskFilter = 'all' | RiskLevel
type AuthFilter = 'all' | AuthType
type ExpoFilter = 'all' | Exposure
type AssetView = 'list' | 'graph'

const cardStyle: React.CSSProperties = { borderRadius: 12, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' }
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }

const purposeSource = (api: ApiAsset, p: PurposeRecord): { text: string; bg: string; color: string } => {
  if (api.source === 'manual') return { text: 'CP 补充', bg: 'rgba(114, 46, 209, 0.10)', color: '#531dab' }
  if (p.confirmed && api.docPurpose && p.text === api.docPurpose) return { text: 'API 文档', bg: 'rgba(19, 194, 194, 0.12)', color: '#08979c' }
  if (p.confirmed) return { text: 'CP 修改', bg: 'rgba(82, 196, 26, 0.12)', color: '#389e0d' }
  return { text: 'AI 推断', bg: 'rgba(250, 173, 20, 0.16)', color: '#d48806' }
}

export default function ApiAssetPanel({ appId }: ApiAssetPanelProps): React.ReactElement {
  useEffect(() => {
    hydrateScanStore()
  }, [])

  const scan = useScanState(appId)
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [authFilter, setAuthFilter] = useState<AuthFilter>('all')
  const [expoFilter, setExpoFilter] = useState<ExpoFilter>('all')
  const [keyword, setKeyword] = useState<string>('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [view, setView] = useState<AssetView>('list')

  const rows: AssetRow[] = useMemo(
    () =>
      allApis(scan).map(api => ({
        api,
        purpose: purposeOf(scan, api),
        risk: evaluateRisk(api, credentials)
      })),
    [scan]
  )

  const count = (level: RiskLevel): number => rows.filter(r => r.risk.level === level).length

  const filtered = rows.filter(r => {
    if (riskFilter !== 'all' && r.risk.level !== riskFilter) return false
    if (authFilter !== 'all' && !r.api.auths.includes(authFilter)) return false
    if (expoFilter !== 'all' && r.api.exposure !== expoFilter) return false
    const k = keyword.trim().toLowerCase()
    if (k && !(r.api.path + r.purpose.text + r.api.appName).toLowerCase().includes(k)) return false
    return true
  })

  const columns: ColumnsType<AssetRow> = [
    { title: '方法', width: 80, render: (_: unknown, r: AssetRow) => <MethodTag method={r.api.method} /> },
    {
      title: '路径',
      width: 220,
      render: (_: unknown, r: AssetRow) => (
        <Space size={4} wrap>
          {/* 交互：点击路径打开只读详情 */}
          <Typography.Link style={mono} onClick={() => setDetailId(r.api.id)}>
            {r.api.path}
          </Typography.Link>
          {r.api.isNew && <NewTag />}
          {r.api.source === 'doc' && (
            <Pill bg="rgba(19, 194, 194, 0.12)" color="#08979c">
              仅文档
            </Pill>
          )}
        </Space>
      )
    },
    { title: '作用', width: 220, render: (_: unknown, r: AssetRow) => <Text>{r.purpose.text}</Text> },
    {
      title: '入参',
      width: 180,
      render: (_: unknown, r: AssetRow) => <Text type="secondary" style={mono}>{formatParams(r.api.params.map(p => p.name))}</Text>
    },
    {
      title: '鉴权',
      width: 180,
      render: (_: unknown, r: AssetRow) => <AuthTags auths={r.api.auths} replayProtect={r.api.authDetail?.replayProtect ?? true} />
    },
    { title: '风险', width: 70, render: (_: unknown, r: AssetRow) => <RiskTag level={r.risk.level} /> },
    {
      title: '作用来源',
      width: 100,
      render: (_: unknown, r: AssetRow) => {
        const s = purposeSource(r.api, r.purpose)
        return (
          <Pill bg={s.bg} color={s.color}>
            {s.text}
          </Pill>
        )
      }
    }
  ]

  const credColumns: ColumnsType<Credential> = [
    { title: '凭证', dataIndex: 'name', width: 130, render: (v: string) => <Text strong>{v}</Text> },
    { title: '应用', dataIndex: 'appName', width: 120 },
    { title: '位置', dataIndex: 'location', width: 160, render: (v: string) => <Text style={mono}>{v}</Text> },
    { title: '风险', width: 80, render: (_: unknown, c: Credential) => <RiskTag level={c.platformHit ? 'high' : 'mid'} /> },
    { title: '关联', dataIndex: 'linkedDesc', width: 240, render: (v: string) => <Text type="secondary">{v}</Text> },
    { title: '命中原因', dataIndex: 'reason', width: 260 },
    { title: '处置建议', dataIndex: 'suggestion', width: 260 }
  ]

  const detail = rows.find(r => r.api.id === detailId) ?? null

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space size={8} wrap>
        <Text type="secondary">平台在部署时自动解析 · 最近一次 {PLATFORM_PARSED_AT}</Text>
        {scan.status === 'disabled' ? (
          <Pill bg="rgba(0, 0, 0, 0.05)" color="rgba(0, 0, 0, 0.55)">
            CP 侧未开启（作用均为系统推断）
          </Pill>
        ) : (
          <Pill bg="rgba(82, 196, 26, 0.12)" color="#389e0d">
            CP 侧已开启 · {scan.enabledAt}
          </Pill>
        )}
        {scan.uploadedDocs.length > 0 && (
          <Pill bg="rgba(19, 194, 194, 0.12)" color="#08979c">
            CP 已上传 {scan.uploadedDocs.length} 份 API 文档
          </Pill>
        )}
      </Space>

      <Row gutter={12}>
        {(
          [
            { title: 'API 总数', value: rows.length, color: 'rgba(0, 0, 0, 0.88)' },
            { title: '高风险', value: count('high'), color: RISK_STYLE.high.color },
            { title: '中风险', value: count('mid'), color: RISK_STYLE.mid.color },
            { title: '低风险', value: count('low'), color: RISK_STYLE.low.color }
          ] as const
        ).map(item => (
          <Col key={item.title} xs={12} md={6}>
            <Card style={cardStyle} styles={{ body: { padding: 16 } }}>
              <Statistic title={item.title} value={item.value} valueStyle={{ color: item.color, fontWeight: 600 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 交互：切换「API 清单」与「应用调用关系」两种视图 */}
      <Segmented<AssetView>
        value={view}
        onChange={setView}
        options={[
          { label: 'API 清单', value: 'list' },
          { label: '应用调用关系', value: 'graph' }
        ]}
      />

      {view === 'graph' && (
        <CallGraph
          apiBrief={Object.fromEntries(rows.map(r => [r.api.id, { purpose: r.purpose.text, risk: r.risk.level }]))}
          onOpenApi={setDetailId}
        />
      )}

      {view === 'list' && (
        <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Segmented<RiskFilter>
          value={riskFilter}
          onChange={setRiskFilter}
          options={[
            { label: `全部 ${rows.length}`, value: 'all' },
            { label: `高风险 ${count('high')}`, value: 'high' },
            { label: `中风险 ${count('mid')}`, value: 'mid' },
            { label: `低风险 ${count('low')}`, value: 'low' }
          ]}
        />
        <Space wrap>
          <Select<AuthFilter>
            style={{ width: 150 }}
            value={authFilter}
            onChange={setAuthFilter}
            options={[
              { label: '鉴权：全部', value: 'all' },
              ...(Object.keys(authLabel) as AuthType[]).map(a => ({ label: authLabel[a], value: a }))
            ]}
          />
          <Select<ExpoFilter>
            style={{ width: 130 }}
            value={expoFilter}
            onChange={setExpoFilter}
            options={[
              { label: '暴露：全部', value: 'all' },
              { label: '公网', value: 'public' },
              { label: '内网', value: 'internal' }
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索应用 / 路径 / 作用"
            style={{ width: 220 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </Space>
      </div>

      {scannedApps.map(app => {
        const all = rows.filter(r => r.api.appName === app.name)
        const list = filtered.filter(r => r.api.appName === app.name)
        if (list.length === 0) return null
        const c = (level: RiskLevel): number => all.filter(r => r.risk.level === level).length
        return (
          <Card
            key={app.name}
            style={cardStyle}
            styles={{ body: { padding: 0 } }}
            title={
              <Space size={8} wrap>
                <span style={{ fontWeight: 600 }}>{app.name}</span>
                <Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
                  {app.kind}
                </Text>
                <ImageTag image={app.image} />
                {app.isPublic && <PublicTag />}
              </Space>
            }
            extra={
              <Space size={4}>
                <Text type="secondary" style={{ fontSize: 13, marginRight: 4 }}>
                  {all.length} 个接口
                </Text>
                {(['high', 'mid', 'low'] as RiskLevel[]).map(level => (
                  <RiskTag key={level} level={level} prefix={`${c(level)} `} />
                ))}
              </Space>
            }
          >
            <Table<AssetRow> rowKey={r => r.api.id} size="middle" columns={columns} dataSource={list} pagination={false} scroll={{ x: 1060 }} />
          </Card>
        )
      })}

      {filtered.length === 0 && (
        <Card style={cardStyle}>
          <Empty description="没有符合筛选条件的接口" />
        </Card>
      )}

      <Card style={cardStyle} title="凭证发现" styles={{ body: { padding: 0 } }}>
        <Table<Credential> rowKey="id" size="middle" columns={credColumns} dataSource={credentials} pagination={false} scroll={{ x: 1250 }} />
      </Card>

      <Collapse
        items={[
          {
            key: 'rules',
            label: '鉴权类型与风险判定规则',
            children: (
              <Row gutter={32}>
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={8}>
                    <span><AuthTags auths={['none']} />路由链上没有鉴权中间件</span>
                    <span><AuthTags auths={['static_token', 'basic']} />固定凭证，易泄露、易硬编码</span>
                    <span><AuthTags auths={['unknown']} />有自定义中间件但无法判断</span>
                    <span><AuthTags auths={['ip_whitelist']} />单独使用不算强鉴权</span>
                    <span><AuthTags auths={['signature', 'jwt', 'session', 'platform_token']} />强鉴权</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>多种鉴权叠加时全部展示，按最强的一种参与判定。</Text>
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={6}>
                    {[
                      ['high', '公网 + 无鉴权'],
                      ['high', '公网 + 调试接口（/debug、/pprof、/actuator…）'],
                      ['high', '公网 + GM / 管理类接口'],
                      ['high', '公网 + 鉴权凭证命中平台指纹'],
                      ['mid', '公网 + 最强鉴权为静态 Token / Basic Auth'],
                      ['mid', '公网 + 仅 IP 白名单'],
                      ['mid', '签名无时间戳 / nonce（可重放）'],
                      ['mid', '鉴权未识别 · 凭证硬编码 · 写操作且入参含 uid'],
                      ['low', '其他']
                    ].map(([level, text]) => (
                      <span key={text}>
                        <RiskTag level={level as RiskLevel} />
                        {text}
                      </span>
                    ))}
                  </Space>
                </Col>
              </Row>
            )
          }
        ]}
      />

        </>
      )}

      {/* 只读详情 */}
      <Drawer
        open={detail !== null}
        width={560}
        onClose={() => setDetailId(null)}
        title={detail ? <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{detail.api.path}</span> : ''}
      >
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Space size={4} wrap>
              <MethodTag method={detail.api.method} />
              <RiskTag level={detail.risk.level} prefix="风险 " />
              <Text type="secondary">
                {detail.api.appName} · {detail.api.exposure === 'public' ? '公网' : '内网'}
              </Text>
            </Space>

            <div>
              <Text strong>作用</Text>
              <Paragraph style={{ margin: '6px 0 0' }}>{detail.purpose.text}</Paragraph>
              {detail.api.docDetail && <Paragraph type="secondary" style={{ margin: '0 0 4px' }}>{detail.api.docDetail}</Paragraph>}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {purposeSource(detail.api, detail.purpose).text}
                {detail.purpose.confirmedAt ? ` · ${detail.purpose.confirmedAt}` : ''}
                {detail.api.docFile ? ` · 文档 ${detail.api.docFile}` : ''}
              </Text>
            </div>

            <div>
              <Text strong>入参</Text>
              <ParamsTable params={detail.api.params} />
            </div>

            <div>
              <Text strong>鉴权</Text>
              <div style={{ margin: '6px 0 8px' }}>
                <AuthTags auths={detail.api.auths} replayProtect={detail.api.authDetail?.replayProtect ?? true} />
              </div>
              {detail.api.authDetail ? (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="携带方式">{detail.api.authDetail.carrier}</Descriptions.Item>
                  <Descriptions.Item label="校验方式">{detail.api.authDetail.verify}</Descriptions.Item>
                  <Descriptions.Item label="值来源">
                    <Text style={mono}>{detail.api.authDetail.valueSource}</Text>
                  </Descriptions.Item>
                  {detail.api.credentialId && (
                    <Descriptions.Item label="关联凭证">
                      {(() => {
                        const cred = credentials.find(c => c.id === detail.api.credentialId)
                        return cred ? <RiskTag level={cred.platformHit ? 'high' : 'mid'} prefix={`${cred.name} · `} /> : '—'
                      })()}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="识别依据">{detail.api.authDetail.evidence}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">
                  {detail.api.source === 'manual'
                    ? 'CP 手动补充的接口，未经扫描'
                    : detail.api.source === 'doc'
                      ? '仅出现在 CP 上传的文档中，扫描未覆盖，鉴权以文档声明为准'
                      : '路由链上未发现鉴权中间件'}
                </Text>
              )}
            </div>

            <div>
              <Text strong>命中原因</Text>
              {/* 风险等级只有一个；只列出决定该等级的原因，不混排其他等级 */}
              <div
                style={{
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: RISK_STYLE[detail.risk.level].bg.replace(/0\.1\d\)/, '0.06)')
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <RiskTag level={detail.risk.level} prefix="风险 " />
                </div>
                {(() => {
                  const reasons = detail.risk.hits.filter(h => h.level === detail.risk.level).map(h => h.reason)
                  return reasons.length === 0 ? (
                    <Text type="secondary">未命中风险规则</Text>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {reasons.map(r => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            </div>

            <div>
              <Text strong>处置建议</Text>
              <Paragraph style={{ margin: '6px 0 0' }}>{suggestAction(detail.api, detail.risk)}</Paragraph>
            </div>
          </Space>
        )}
      </Drawer>
    </Space>
  )
}
