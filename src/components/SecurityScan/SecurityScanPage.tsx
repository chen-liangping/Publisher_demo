'use client'

/**
 * 用户侧 · 监控 → 安全扫描
 *
 * 产品流程：
 * 1. 未开启：展示功能说明 + 示例数据预览，引导 CP 开启
 * 2. 开启后：平台解析各应用镜像（mock 为几秒的解析中状态）
 * 3. 完成：按应用展示 API 清单，CP 只看「入参」和「作用」；作用不准确的直接修改，
 *    也可以上传 Swagger / OpenAPI 文档或手动补充遗漏的接口。没有确认 / 撤销操作。
 * 风险等级、鉴权等信息只在管理后台展示，用户侧不展示。
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UploadOutlined
} from '@ant-design/icons'

import { scannedApps } from './mock'
import { parseApiDoc } from './apidoc'
import {
  addManualApi,
  allApis,
  disableScan,
  enableScan,
  apiKeyOf,
  assignApp,
  hydrateScanStore,
  importDoc,
  nowStamp,
  purposeOf as resolvePurpose,
  removeDoc,
  reparse,
  updatePurpose,
  useScanState
} from './store'
import type { AssignHow } from './store'
import type { ApiAsset, DocApi, HttpMethod, PurposeRecord, ScannedApp } from './types'
import { ImageTag, MethodTag, NewTag, ParamsTable, Pill, PublicTag, RISK_STYLE, formatParams } from './ui'

const { Title, Text, Paragraph } = Typography

interface SecurityScanPageProps {
  appId: string
}

/** 表格行：API + 当前作用确认记录 */
interface ApiRow {
  api: ApiAsset
  purpose: PurposeRecord
}

/** 文档导入预览行：标记是否与现有接口重复 */
/** 归属方式：自动匹配 / 路径推断 / 需确认 / 用户手动指定 */
type RowHow = AssignHow | 'manual'

type PreviewRow = DocApi & { matched: boolean; how: RowHow }

const ASSIGN_LABEL: Record<RowHow, { text: string; color: string }> = {
  manual: { text: '已手动指定', color: 'rgba(0, 0, 0, 0.45)' },
  matched: { text: '已有接口匹配', color: 'rgba(0, 0, 0, 0.45)' },
  prefix: { text: '按路径推断', color: 'rgba(0, 0, 0, 0.45)' },
  default: { text: '未能识别，请确认', color: '#d48806' }
}

interface ManualApiForm {
  appName: string
  method: HttpMethod
  path: string
  params: string
  purpose: string
}

const pageCardStyle: React.CSSProperties = {
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)'
}

export default function SecurityScanPage({ appId }: SecurityScanPageProps): React.ReactElement {
  useEffect(() => {
    hydrateScanStore()
  }, [])

  const scan = useScanState(appId)
  const [keyword, setKeyword] = useState<string>('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [enableOpen, setEnableOpen] = useState<boolean>(false)
  const [addOpen, setAddOpen] = useState<boolean>(false)
  const [form] = Form.useForm<ManualApiForm>()
  // 上传 API 文档：先解析预览，确认后再与扫描结果合并
  const [uploadOpen, setUploadOpen] = useState<boolean>(false)
  // 每条接口的归属方式（自动匹配 / 路径推断 / 需确认），key = 方法 + 路径
  const [uploadHow, setUploadHow] = useState<Record<string, RowHow>>({})
  const [uploadFile, setUploadFile] = useState<string>('')
  const [uploadApis, setUploadApis] = useState<DocApi[]>([])
  const [uploadError, setUploadError] = useState<string>('')

  const apis = useMemo(() => allApis(scan), [scan])
  const purposeOf = (api: ApiAsset): PurposeRecord => resolvePurpose(scan, api)

  const detailApi = apis.find(a => a.id === detailId) ?? null

  // ---------- 表格列：用户侧只展示入参与作用 ----------
  const buildColumns = (editable: boolean): ColumnsType<ApiRow> => [
    {
      title: '方法',
      dataIndex: ['api', 'method'],
      width: 90,
      render: (_: unknown, row: ApiRow) => <MethodTag method={row.api.method} />
    },
    {
      title: '路径',
      width: 260,
      render: (_: unknown, row: ApiRow) => (
        <Space size={4} wrap>
          {editable ? (
            // 交互：点击路径（标题字段）打开接口详情
            <Typography.Link style={{ fontFamily: 'ui-monospace, Menlo, monospace' }} onClick={() => setDetailId(row.api.id)}>
              {row.api.path}
            </Typography.Link>
          ) : (
            <Text style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{row.api.path}</Text>
          )}
          {row.api.isNew && <NewTag />}
          {row.api.docFile && (
            <Pill bg="rgba(19, 194, 194, 0.12)" color="#08979c">
              文档
            </Pill>
          )}
          {row.api.source === 'manual' && (
            <Pill bg="rgba(0, 0, 0, 0.05)" color="rgba(0, 0, 0, 0.65)">
              手动补充
            </Pill>
          )}
        </Space>
      )
    },
    {
      title: '入参',
      width: 260,
      render: (_: unknown, row: ApiRow) => (
        <Text type="secondary" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
          {formatParams(row.api.params.map(p => p.name))}
        </Text>
      )
    },
    {
      title: '作用',
      width: 340,
      render: (_: unknown, row: ApiRow) =>
        editable ? (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            {/* 交互：直接修改作用，修改后以 CP 填写的为准 */}
            <Text
              editable={{
                tooltip: '修改作用',
                onChange: (value: string) => {
                  const text = value.trim()
                  if (!text || text === row.purpose.text) return
                  updatePurpose(appId, row.api.id, text)
                  message.success('作用已更新')
                }
              }}
            >
              {row.purpose.text}
            </Text>
            {row.api.docPurpose && row.purpose.text === row.api.docPurpose && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                来自 {row.api.docFile}
              </Text>
            )}
          </Space>
        ) : (
          <Text>{row.purpose.text}</Text>
        )
    },
  ]

  const matchKeyword = (api: ApiAsset, text: string): boolean => {
    const k = keyword.trim().toLowerCase()
    if (!k) return true
    return (api.path + text + api.appName).toLowerCase().includes(k)
  }

  // ---------- 状态一：未开启，引导页（从 CP 视角：帮你找出容易被攻击的接口） ----------
  if (scan.status === 'disabled') {
    const sampleIssues: { level: 'high' | 'mid'; api: string; problem: string; fix: string }[] = [
      { level: 'high', api: 'GET /gm/api/player/info', problem: 'GM 接口在公网可直接访问，且没有鉴权', fix: 'GM 应用关闭公网入口，或只放行办公网 IP' },
      { level: 'high', api: 'GET /debug/pprof/*', problem: '性能调试接口暴露在公网，可能泄露内存与运行信息', fix: '生产环境关闭 pprof 路由' },
      { level: 'mid', api: 'POST /api/pay/notify', problem: '支付回调签名没有校验时间戳，请求可被重放', fix: '签名加入 timestamp + nonce 并校验有效期' }
    ]
    const promises = ['不影响线上服务', '每次部署自动更新', '一键开启，几分钟出结果']
    return (
      <Card style={{ ...pageCardStyle, borderRadius: 16 }} styles={{ body: { padding: 40 } }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Title level={2} style={{ margin: 0, fontSize: 30, lineHeight: 1.35 }}>
              上线前，先找出容易被攻击的接口
            </Title>
            <Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#4b5563' }}>
              自动梳理你每个应用对外开放的接口，帮你发现没加鉴权的接口、暴露在公网的 GM 和调试入口、写死在配置里的密钥，并给出具体怎么修。
            </Paragraph>
            <div style={{ marginTop: 8 }}>
              {/* 交互：开启后进入报告生成中，完成后展示应用 API */}
              <Button type="primary" size="large" style={{ height: 44, padding: '0 24px' }} onClick={() => setEnableOpen(true)}>
                开始安全扫描
              </Button>
            </div>
            <Space size={20} wrap style={{ fontSize: 13, color: '#6b7280' }}>
              {promises.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckOutlined style={{ color: '#389e0d' }} />
                  {t}
                </span>
              ))}
            </Space>
          </div>

          <div style={{ flex: '1 1 400px', minWidth: 0, background: '#f8fafc', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>安全体检报告</Text>
              <Pill bg="rgba(0, 0, 0, 0.06)" color="#4b5563">
                示例
              </Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {[
                { label: '需要尽快处理', value: 3, color: RISK_STYLE.high.color },
                { label: '建议加固', value: 4, color: RISK_STYLE.mid.color },
                { label: '接口总数', value: 12, color: '#1f2329' }
              ].map(item => (
                <div key={item.label} style={{ background: '#ffffff', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {sampleIssues.map(issue => (
              <div key={issue.api} style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Space size={8}>
                  <Pill bg={RISK_STYLE[issue.level].bg} color={RISK_STYLE[issue.level].color}>
                    {issue.level === 'high' ? '高' : '中'}
                  </Pill>
                  <Text style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>{issue.api}</Text>
                </Space>
                <Text style={{ fontSize: 13, color: '#374151' }}>{issue.problem}</Text>
                <Text style={{ fontSize: 12, color: '#0958d9' }}>修复建议：{issue.fix}</Text>
              </div>
            ))}
          </div>
        </div>

        <Modal
          open={enableOpen}
          title="开始安全扫描"
          okText="开始"
          onCancel={() => setEnableOpen(false)}
          onOk={() => {
            enableScan(appId)
            setEnableOpen(false)
          }}
        >
          <Paragraph>将为当前已部署的 {scannedApps.length} 个应用生成安全报告，之后每次部署自动更新。</Paragraph>
          <Text type="secondary">不会向你的服务发送请求，不影响线上运行。</Text>
        </Modal>
      </Card>
    )
  }

  // ---------- 状态二：解析中 ----------
  if (scan.status === 'scanning') {
    return (
      <Card style={pageCardStyle} styles={{ body: { padding: 48 } }}>
        <Space direction="vertical" align="center" style={{ width: '100%' }} size={16}>
          <SafetyCertificateOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            正在生成安全报告…
          </Title>
          <Text type="secondary">
            正在检查 {scannedApps.map(a => a.name).join('、')}，通常需要几分钟，可以先离开本页
          </Text>
          <Progress percent={66} status="active" style={{ width: 360 }} showInfo={false} />
        </Space>
      </Card>
    )
  }

  // ---------- 状态三：已开启，展示应用 API ----------
  const renderApp = (app: ScannedApp): React.ReactElement | null => {
    const appApis = apis.filter(a => a.appName === app.name)
    const rows: ApiRow[] = appApis
      .map(api => ({ api, purpose: purposeOf(api) }))
      .filter(row => matchKeyword(row.api, row.purpose.text))
    if (keyword && rows.length === 0) return null
    return (
      <Card
        key={app.name}
        style={pageCardStyle}
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
          <Space size={16}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {appApis.length} 个接口
            </Text>
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={() => {
                form.setFieldsValue({ appName: app.name, method: 'GET', path: '', params: '', purpose: '' })
                setAddOpen(true)
              }}
            >
              补充接口
            </Button>
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<ApiRow>
          rowKey={row => row.api.id}
          size="middle"
          columns={buildColumns(true)}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>
    )
  }

  const visibleApps = scannedApps.map(renderApp).filter((n): n is React.ReactElement => n !== null)

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card style={pageCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Space size={8}>
              <Title level={4} style={{ margin: 0 }}>
                安全扫描
              </Title>
              <Pill bg="rgba(82, 196, 26, 0.12)" color="#389e0d">
                已开启
              </Pill>
            </Space>
            <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
              以下是你各应用对外提供的接口。「作用」为系统推断，不准确的可以直接修改；也可以上传 Swagger / OpenAPI 文档，相同接口以文档为准。
              <br />
              最近更新：{scan.lastParsedAt || '—'}
            </Paragraph>
          </div>
          <Space wrap>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                setUploadFile('')
                setUploadApis([])
                setUploadError('')
                setUploadOpen(true)
              }}
            >
              上传 API 文档
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => reparse(appId)}>
              重新扫描
            </Button>
          </Space>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索应用 / 路径 / 作用"
            style={{ width: 260 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
      </Card>

      {scan.uploadedDocs.length > 0 && (
        <Card style={pageCardStyle} title="已上传的 API 文档" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {scan.uploadedDocs.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Space size={8} wrap>
                  <FileTextOutlined style={{ color: '#08979c' }} />
                  <Text>{doc.fileName}</Text>
                  <Pill bg="rgba(0, 0, 0, 0.05)" color="rgba(0, 0, 0, 0.65)">
                    {Array.from(new Set(doc.apis.map(a => a.appName)))
                      .map(name => `${name} ${doc.apis.filter(a => a.appName === name).length}`)
                      .join(' · ')}
                  </Pill>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    共 {doc.apis.length} 个接口 · {doc.uploadedAt}
                  </Text>
                </Space>
                {/* 交互：删除文档后，文档带来的接口与覆盖一并撤回 */}
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  style={{ minHeight: 32 }}
                  onClick={() =>
                    Modal.confirm({
                      title: `删除 ${doc.fileName}？`,
                      content: '文档新增的接口会被移除，被文档覆盖的接口恢复为扫描结果。',
                      okText: '删除',
                      okButtonProps: { danger: true },
                      onOk: () => removeDoc(appId, doc.id)
                    })
                  }
                >
                  删除
                </Button>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {visibleApps.length > 0 ? (
        visibleApps
      ) : (
        <Card style={pageCardStyle}>
          <Empty description="没有匹配的接口" />
        </Card>
      )}

      <div style={{ textAlign: 'right' }}>
        <Button
          type="text"
          danger
          onClick={() =>
            Modal.confirm({
              title: '关闭安全扫描？',
              content: '关闭后将清空解析结果与作用确认记录，之后部署不再自动解析。',
              okText: '关闭',
              okButtonProps: { danger: true },
              onOk: () => disableScan(appId)
            })
          }
        >
          关闭安全扫描
        </Button>
      </div>

      {/* 接口详情：入参明细 + 作用 */}
      <Drawer
        open={detailApi !== null}
        width={520}
        title={detailApi ? <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{detailApi.path}</span> : ''}
        onClose={() => setDetailId(null)}
      >
        {detailApi && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="应用">{detailApi.appName}</Descriptions.Item>
              <Descriptions.Item label="方法">
                <MethodTag method={detailApi.method} />
              </Descriptions.Item>
              <Descriptions.Item label="作用">
                <Text
                  editable={{
                    tooltip: '修改作用',
                    onChange: (value: string) => {
                      const text = value.trim()
                      if (!text) return
                      updatePurpose(appId, detailApi.id, text)
                    }
                  }}
                >
                  {purposeOf(detailApi).text}
                </Text>
              </Descriptions.Item>
              {detailApi.docDetail && <Descriptions.Item label="说明">{detailApi.docDetail}</Descriptions.Item>}
              {detailApi.docFile && <Descriptions.Item label="API 文档">{detailApi.docFile}</Descriptions.Item>}
            </Descriptions>
            <div>
              <Text strong>入参</Text>
              <ParamsTable params={detailApi.params} />
            </div>
          </Space>
        )}
      </Drawer>

      {/* 上传 Swagger / OpenAPI 文档：解析预览 → 确认导入，与扫描结果取并集 */}
      <Modal
        open={uploadOpen}
        title="上传 API 文档"
        okText={uploadApis.length > 0 ? `导入 ${uploadApis.length} 个接口` : '导入'}
        okButtonProps={{ disabled: uploadApis.length === 0 }}
        width={880}
        onCancel={() => setUploadOpen(false)}
        onOk={() => {
          const stamp = nowStamp()
          importDoc(appId, { id: `doc-${Date.now()}`, fileName: uploadFile, uploadedAt: stamp, apis: uploadApis })
          setUploadOpen(false)
          message.success(`已导入 ${uploadFile}`)
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Upload.Dragger
            accept=".json"
            maxCount={1}
            showUploadList={false}
            beforeUpload={file => {
              // 交互：在浏览器内读取并解析文件，不上传到任何地方
              file.text().then(text => {
                setUploadFile(file.name)
                try {
                  // 一份文档可包含多个应用的接口：逐条自动归属，预览中可调整
                  const how: Record<string, RowHow> = {}
                  const assigned = parseApiDoc(text).map(d => {
                    const r = assignApp(d, apis)
                    how[`${d.method}|${d.path}`] = r.how
                    return { ...d, appName: r.appName }
                  })
                  setUploadHow(how)
                  setUploadApis(assigned)
                  setUploadError('')
                } catch (e) {
                  setUploadApis([])
                  setUploadError(e instanceof Error ? e.message : '解析失败')
                }
              })
              return false
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{uploadFile || '点击或拖拽 Swagger / OpenAPI 文档到这里'}</p>
            <p className="ant-upload-hint">
              支持 Swagger 2.0、OpenAPI 3.x、平台 API 文档格式（JSON）。示例：
              <a href="/samples/kumo-openapi.json" download onClick={e => e.stopPropagation()}>
                OpenAPI
              </a>
              {' / '}
              <a href="/samples/demo-apidoc.json" download onClick={e => e.stopPropagation()}>
                平台格式
              </a>
            </p>
          </Upload.Dragger>
          {uploadError && <Text type="danger">{uploadError}</Text>}
          {uploadApis.length > 0 && (() => {
            const existing = new Set(apis.map(a => apiKeyOf(a.appName, a.method, a.path)))
            const previewRows: PreviewRow[] = uploadApis.map(d => ({
              ...d,
              matched: existing.has(apiKeyOf(d.appName, d.method, d.path)),
              how: uploadHow[`${d.method}|${d.path}`] ?? 'default'
            }))
            const matchedCount = previewRows.filter(r => r.matched).length
            const appCount = new Set(previewRows.map(r => r.appName)).size
            const needConfirm = previewRows.filter(r => r.how === 'default').length
            return (
              <div>
                <Paragraph style={{ marginBottom: 8 }}>
                  识别到 <Text strong>{uploadApis.length}</Text> 个接口，已自动归属到 <Text strong>{appCount}</Text> 个应用：
                  <Text strong>{matchedCount}</Text> 个与现有接口相同，将以文档为准；<Text strong>{uploadApis.length - matchedCount}</Text> 个为新增接口。
                  {needConfirm > 0 && <Text type="warning"> 有 {needConfirm} 个接口未能识别归属，请确认所属应用。</Text>}
                </Paragraph>
                <Table<PreviewRow>
                  size="small"
                  pagination={false}
                  scroll={{ y: 300, x: 820 }}
                  rowKey={r => `${r.method}-${r.path}`}
                  dataSource={previewRows}
                  columns={[
                    { title: '方法', width: 80, render: (_: unknown, r: PreviewRow) => <MethodTag method={r.method} /> },
                    { title: '路径', width: 200, render: (_: unknown, r: PreviewRow) => <Text style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>{r.path}</Text> },
                    { title: '说明', render: (_: unknown, r: PreviewRow) => <Text>{r.summary || '—'}</Text> },
                    {
                      title: '所属应用',
                      width: 180,
                      render: (_: unknown, r: PreviewRow) => (
                        <Space direction="vertical" size={2}>
                          {/* 交互：调整归属后，合并结果按新应用重新计算 */}
                          <Select
                            size="small"
                            style={{ width: 150 }}
                            value={r.appName}
                            onChange={v => {
                              setUploadApis(prev => prev.map(x => (x.method === r.method && x.path === r.path ? { ...x, appName: v } : x)))
                              setUploadHow(prev => ({ ...prev, [`${r.method}|${r.path}`]: 'manual' }))
                            }}
                            options={scannedApps.map(a => ({ label: a.name, value: a.name }))}
                          />
                          <Text style={{ fontSize: 12, color: ASSIGN_LABEL[r.how].color }}>{ASSIGN_LABEL[r.how].text}</Text>
                        </Space>
                      )
                    },
                    {
                      title: '合并结果',
                      width: 110,
                      render: (_: unknown, r: PreviewRow) =>
                        r.matched ? (
                          <Pill bg="rgba(19, 194, 194, 0.12)" color="#08979c">
                            以文档为准
                          </Pill>
                        ) : (
                          <Pill bg="rgba(114, 46, 209, 0.10)" color="#531dab">
                            新增
                          </Pill>
                        )
                    }
                  ]}
                />
              </div>
            )
          })()}
        </Space>
      </Modal>

      {/* 补充解析遗漏的接口 */}
      <Modal
        open={addOpen}
        title="补充接口"
        okText="添加"
        onCancel={() => setAddOpen(false)}
        onOk={async () => {
          const values = await form.validateFields()
          const app = scannedApps.find(a => a.name === values.appName)
          const names = values.params
            .split(/[,，\s]+/)
            .map(s => s.trim())
            .filter(Boolean)
          // 真实效果：写入 store，用户侧与管理后台都能看到；鉴权未知，管理后台按「未识别」评估风险
          addManualApi(appId, {
            id: `manual-${Date.now()}`,
            appName: values.appName,
            method: values.method,
            path: values.path.trim(),
            params: names.map(name => ({ name, type: 'string', required: true, location: values.method === 'GET' ? 'query' : 'body' })),
            aiPurpose: values.purpose.trim(),
            auths: ['unknown'],
            authDetail: null,
            exposure: app?.isPublic ? 'public' : 'internal',
            kind: 'normal',
            credentialId: null,
            isNew: false,
            source: 'manual'
          })
          setAddOpen(false)
          message.success('接口已添加')
        }}
      >
        <Form<ManualApiForm> form={form} layout="vertical" initialValues={{ method: 'GET' }}>
          <Form.Item label="应用" name="appName" rules={[{ required: true }]}>
            <Select options={scannedApps.map(a => ({ label: a.name, value: a.name }))} />
          </Form.Item>
          <Form.Item label="方法" name="method" rules={[{ required: true }]}>
            <Select options={(['GET', 'POST', 'PUT', 'DELETE'] as HttpMethod[]).map(m => ({ label: m, value: m }))} />
          </Form.Item>
          <Form.Item label="路径" name="path" rules={[{ required: true, message: '请输入路径' }, { pattern: /^\//, message: '以 / 开头' }]}>
            <Input placeholder="/api/xxx" />
          </Form.Item>
          <Form.Item label="入参" name="params" extra="多个参数用逗号分隔">
            <Input placeholder="uid, item_id" />
          </Form.Item>
          <Form.Item label="作用" name="purpose" rules={[{ required: true, message: '请填写作用' }]}>
            <Input placeholder="这个接口是做什么的" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
