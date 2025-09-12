'use client'

import React from 'react'
import {
  Typography,
  Card,
  Tabs,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  message,
  Tooltip,
  Popover,
  Drawer,
  Form,
  Input,
  Select,
  InputNumber,
  Checkbox,
  Radio,
  Switch
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useRouter } from 'next/navigation'

const { Title, Paragraph, Text } = Typography

// 基础信息类型
interface BaseInfo {
  id: string
  domain: string
  httpVersions: string
  accessKeyId: string
  accessKeySecretMasked: string
}

// 源站配置类型
interface OriginRow {
  id: string
  domain: string
  path: string
  httpPort: number
  httpsPort: number
  backProto: string
  backSSL: string
}

// 缓存规则类型
interface CacheRule {
  pattern: string
  sourceId: string
  accessProto: string
  httpMethods: string
  smartCompress: 'ON' | 'OFF'
  ttlSeconds: number
  // 新增：透传回源参数配置（三态）
  passHeadersMode?: 'all' | 'none' | 'whitelist'
  passHeadersWhitelist?: string[]
  passQueryStringsMode?: 'all' | 'none' | 'whitelist'
  passQueryStringsWhitelist?: string[]
  passCookiesMode?: 'all' | 'none' | 'whitelist'
  passCookiesWhitelist?: string[]
}

// 编辑表单的值类型（更贴近 UI 控件）
interface CacheRuleFormValues {
  pattern: string
  sourceId: string
  accessProto: string
  httpMethods: string[]
  smartCompress: 'ON' | 'OFF'
  ttlSeconds: number
  passHeadersMode: 'all' | 'none' | 'whitelist'
  passHeadersWhitelist: string[]
  passQueryStringsMode: 'all' | 'none' | 'whitelist'
  passQueryStringsWhitelistText: string
  passCookiesMode: 'all' | 'none' | 'whitelist'
  passCookiesWhitelistText: string
}

// 模拟数据
const baseInfo: BaseInfo = {
  id: 'E1K5ZDxxxxY4JX8',
  domain: '{appid}-cft.stg.g123-cpp.com',
  httpVersions: 'HTTP2 / HTTP3',
  accessKeyId: 'AKIA5SV6RVTG7IIZNSN4',
  accessKeySecretMasked: 'SeDHtYHp9x2oiGF5zxa4m8bPMegcp8qnaY9g...'
}

const originData: OriginRow[] = [
  {
    id: 'Default',
    domain: 'S3',
    path: '//{staging/production}-legolas-{appid}-statics',
    httpPort: 80,
    httpsPort: 443,
    backProto: '仅限HTTPS',
    backSSL: 'SSLv3'
  }
]

const cacheData: CacheRule[] = [
  { pattern: '/errors/*', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 600, passHeadersMode: 'whitelist', passHeadersWhitelist: ['Origin'], passQueryStringsMode: 'none', passCookiesMode: 'none' },
  { pattern: '*.html', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 600, passHeadersMode: 'whitelist', passHeadersWhitelist: ['Origin'], passQueryStringsMode: 'none', passCookiesMode: 'none' },
  { pattern: '/*/g123/i18n/*', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 2592000, passHeadersMode: 'whitelist', passHeadersWhitelist: ['Origin'], passQueryStringsMode: 'none', passCookiesMode: 'none' },
  { pattern: '*', sourceId: 'Default', accessProto: '仅限HTTPS', httpMethods: 'GET, HEAD, OPTIONS', smartCompress: 'ON', ttlSeconds: 600, passHeadersMode: 'whitelist', passHeadersWhitelist: ['Origin'], passQueryStringsMode: 'none', passCookiesMode: 'none' }
]

export default function ClientPage() {
  const router = useRouter()
  // 新增：缓存规则本地状态，用于支持行内编辑后的刷新
  const [cacheList, setCacheList] = React.useState<CacheRule[]>(cacheData)
  // 新增：编辑弹窗开关与键值（使用 pattern 作为唯一键）
  const [editVisible, setEditVisible] = React.useState<boolean>(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  // 新增：编辑表单实例
  const [editForm] = Form.useForm<CacheRuleFormValues>()
  // 交互：添加源站
  const handleAddOrigin = (): void => {
    message.info('点击了添加源站（示例）')
  }

  // 交互：缓存检测
  const handleDetectCache = (): void => {
    message.info('正在执行缓存检测（示例）')
  }

  // 交互：添加缓存配置
  const handleAddCache = (): void => {
    message.info('点击了添加缓存配置（示例）')
  }

  // 交互：打开编辑缓存规则弹窗
  const openEditCache = (row: CacheRule): void => {
    // 打开编辑弹窗：填充当前行数据
    setEditingKey(row.pattern)
    setEditVisible(true)
    const httpMethodsArray = row.httpMethods.split(',').map(s => s.trim())
    editForm.setFieldsValue({
      pattern: row.pattern,
      sourceId: row.sourceId,
      accessProto: row.accessProto,
      httpMethods: httpMethodsArray,
      smartCompress: row.smartCompress,
      ttlSeconds: row.ttlSeconds,
      passHeadersMode: row.passHeadersMode || 'whitelist',
      passHeadersWhitelist: row.passHeadersWhitelist || ['Origin'],
      passQueryStringsMode: row.passQueryStringsMode || 'none',
      passQueryStringsWhitelistText: (row.passQueryStringsWhitelist || []).join(', '),
      passCookiesMode: row.passCookiesMode || 'none',
      passCookiesWhitelistText: (row.passCookiesWhitelist || []).join(', ')
    })
  }

  // 交互：保存编辑后的缓存规则
  const handleSaveCache = async (): Promise<void> => {
    try {
      const values = await editForm.validateFields()
      if (!editingKey) return
      // 映射表单值 -> 数据结构
      const httpMethods = Array.isArray(values.httpMethods) ? (values.httpMethods as string[]).join(', ') : String(values.httpMethods)
      const passQueryStringsWhitelist = (values.passQueryStringsWhitelistText || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
      const passCookiesWhitelist = (values.passCookiesWhitelistText || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)

      const nextRow: CacheRule = {
        pattern: values.pattern,
        sourceId: values.sourceId,
        accessProto: values.accessProto,
        httpMethods,
        smartCompress: values.smartCompress,
        ttlSeconds: values.ttlSeconds,
        passHeadersMode: values.passHeadersMode,
        passHeadersWhitelist: values.passHeadersWhitelist || [],
        passQueryStringsMode: values.passQueryStringsMode,
        passQueryStringsWhitelist,
        passCookiesMode: values.passCookiesMode,
        passCookiesWhitelist
      }

      // 根据原始键（editingKey）定位并替换为新值
      setCacheList(prev => prev.map(it => it.pattern === editingKey ? nextRow : it))
      setEditVisible(false)
      setEditingKey(null)
      message.success('保存成功（示例）')
    } catch {
      // ignore
    }
  }

  // 交互：取消编辑
  const handleCancelEdit = (): void => {
    setEditVisible(false)
    setEditingKey(null)
  }

  // 源站表头
  const originColumns: TableColumnsType<OriginRow> = [
    { title: '源站ID', dataIndex: 'id', key: 'id' },
    { title: '域名', dataIndex: 'domain', key: 'domain' },
    { title: '访问路径', dataIndex: 'path', key: 'path' },
    { title: 'HTTP端口', dataIndex: 'httpPort', key: 'httpPort', width: 100 },
    { title: 'HTTPS端口', dataIndex: 'httpsPort', key: 'httpsPort', width: 100 },
    { title: '回源协议', dataIndex: 'backProto', key: 'backProto', width: 140 },
    { title: '回源SSL协议', dataIndex: 'backSSL', key: 'backSSL', width: 140 },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space size={8}>
          <Button type="link" onClick={() => message.info('编辑（示例）')}>编辑</Button>
          <Button type="link" danger onClick={() => message.warning('删除（示例）')}>删除</Button>
        </Space>
      ),
      width: 180
    }
  ]

  // 缓存表头
  const cacheColumns: TableColumnsType<CacheRule> = [
    { title: '访问路径', dataIndex: 'pattern', key: 'pattern' },
    { title: '源站ID', dataIndex: 'sourceId', key: 'sourceId', width: 120 },
    { title: '访问协议', dataIndex: 'accessProto', key: 'accessProto', width: 140 },
    { title: 'HTTP方法', dataIndex: 'httpMethods', key: 'httpMethods', width: 180 },
    {
      title: '智能压缩',
      dataIndex: 'smartCompress',
      key: 'smartCompress',
      width: 120,
      render: (v: 'ON' | 'OFF') => (
        <Tag color={v === 'ON' ? 'green' : 'default'}>{v}</Tag>
      )
    },
    { title: '缓存时间（秒）', dataIndex: 'ttlSeconds', key: 'ttlSeconds', width: 160 },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: CacheRule) => {
        const isI18n = record.pattern === '/*/g123/i18n/*'
        const editBtn = (
          <Button type="link" onClick={() => openEditCache(record)}>编辑</Button>
        )
        return (
          <Space size={8}>
            {isI18n ? (
              <Tooltip title="此处修改的 CDN 缓存配置不会影响游戏内翻译文本的实时更新。在执行“翻译同步”时，系统已自动清理并刷新相关缓存，无需额外手动处理">
                {editBtn}
              </Tooltip>
            ) : editBtn}
            <Button type="link" onClick={() => message.info('排序（示例）')}>排序</Button>
            <Button type="link" danger onClick={() => message.warning('删除（示例）')}>删除</Button>
          </Space>
        )
      },
      width: 220
    }
  ]

  return (
    <div>
      {/* 顶部信息与导航 */}
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 16 } }}
      >
        <Title level={3} style={{ margin: 0 }}>客户端</Title>
        <Paragraph style={{ color: '#666', marginTop: 8, marginBottom: 0 }}>
          客户端用于存储不同游戏版本的图片以及文本等静态资源进行配置信息，您可以在此页面进行版本管理。
          <Button type="link" style={{ paddingLeft: 4 }} onClick={() => message.info('打开帮助（示例）')}>了解更多</Button>
        </Paragraph>
      </Card>

      {/* 顶部 Tabs */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey="cdn"
          onChange={(key) => {
            if (key === 'version') router.push('/client/version')
            if (key === 'cdn') router.push('/client/cdn')
          }}
          items={[
            { key: 'version', label: '版本' },
            { key: 'config', label: '配置文件' },
            { key: 'cdn', label: 'CDN' },
            { key: 'cors', label: '跨域配置' }
          ]}
        />
      </Card>

      {/* 基础信息 */}
      <Card title="基础信息" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>ID</div>
            <Text code>{baseInfo.id}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>域名</div>
            <Text code>{baseInfo.domain}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>HTTP版本</div>
            <Text>{baseInfo.httpVersions}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>凭证ID</div>
            <Text copyable>{baseInfo.accessKeyId}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>凭证Secret</div>
            <Text copyable>{baseInfo.accessKeySecretMasked}</Text>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: '#999' }}>CLI</div>
            <Button type="link" onClick={() => message.info('查看 CLI（示例）')}>查看</Button>
          </Col>
        </Row>
      </Card>

      {/* 源站配置 */}
      <Card
        title="源站配置"
        extra={
          <Button type="primary" onClick={handleAddOrigin}>添加源站</Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table<OriginRow>
          columns={originColumns}
          dataSource={originData}
          rowKey={(r) => r.id}
          pagination={false}
        />
      </Card>

      {/* 缓存配置 */}
      <Card
        title="缓存配置"
        extra={
          <Space>
            <Button onClick={handleDetectCache}>缓存检测</Button>
            <Button type="primary" onClick={handleAddCache}>添加缓存配置</Button>
          </Space>
        }
      >
        <Table<CacheRule>
          columns={cacheColumns}
          dataSource={cacheList}
          rowKey={(r) => r.pattern}
          pagination={false}
        />
      </Card>
      {/* 编辑缓存规则抽屉 */}
      <Drawer
        title="编辑缓存规则"
        open={editVisible}
        onClose={handleCancelEdit}
        width={520}
        extra={
          <Space>
            <Button onClick={handleCancelEdit}>取消</Button>
            <Button type="primary" onClick={handleSaveCache}>保存</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          {/* 访问路径 */}
          <Form.Item label="访问路径" name="pattern" rules={[{ required: true, message: '请输入访问路径' }]}>
            <Input placeholder="例如：/errors/* 或 *.html" />
          </Form.Item>
          {/* 源站ID */}
          <Form.Item label="源站ID" name="sourceId" rules={[{ required: true, message: '请输入源站ID' }]}>
            <Input placeholder="例如：Default" />
          </Form.Item>
          {/* 访问协议 */}
          <Form.Item label="访问协议" name="accessProto" rules={[{ required: true, message: '请选择访问协议' }]}>
            <Select options={[{ label: '仅限HTTPS', value: '仅限HTTPS' }]} />
          </Form.Item>
          {/* HTTP方法（多选） */}
          <Form.Item label="HTTP方法" name="httpMethods" rules={[{ required: true, message: '请选择HTTP方法' }]}>
            <Select
              mode="multiple"
              placeholder="选择允许的HTTP方法"
              options={[
                { label: 'GET', value: 'GET' },
                { label: 'HEAD', value: 'HEAD' },
                { label: 'OPTIONS', value: 'OPTIONS' }
              ]}
            />
          </Form.Item>
          {/* 智能压缩（Switch） */}
          <Form.Item label="智能压缩" shouldUpdate>
            {() => {
              const current = editForm.getFieldValue('smartCompress') as 'ON' | 'OFF'
              const checked = current === 'ON'
              return (
                <Switch
                  checked={checked}
                  onChange={(v) => editForm.setFieldsValue({ smartCompress: v ? 'ON' : 'OFF' })}
                />
              )
            }}
          </Form.Item>
          {/* 缓存时间（秒） + 最佳实践浮窗图标（点击触发） */}
          <Form.Item 
            label={
              <span>
                缓存时间（秒）
                <Popover 
                  content={(
                    <div style={{ maxWidth: 420, lineHeight: 1.6 }}>
                      <div style={{ marginBottom: 4 }}><strong>高时效性内容</strong>（如翻译文本）：</div>
                      <div style={{ paddingLeft: 12 }}>TTL = 0 → 强制实时回源。</div>
                      <div style={{ marginTop: 8, marginBottom: 4 }}><strong>低时效性内容</strong>（如图片、静态资源）：</div>
                      <div style={{ paddingLeft: 12 }}>TTL ≥ 10 分钟 → 提升缓存命中率，减少回源压力。</div>
                    </div>
                  )}
                  trigger="click"
                >
                  <Button type="link" size="small" style={{ marginLeft: 6, padding: 0 }} aria-label="最佳实践">最佳实践</Button>
                </Popover>
              </span>
            }
            name="ttlSeconds"
            rules={[{ required: true, message: '请输入缓存时间' }]}
          > 
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* 分割：透传回源参数 */}
          <div style={{ height: 8 }} />
          <Card size="small" title="透传回源参数" styles={{ body: { padding: 12 } }}>
            {/* Headers：All / None / Whitelist */}
            <Form.Item label="Headers" name="passHeadersMode" initialValue="whitelist">
              <Radio.Group>
                <Radio value="all">All</Radio>
                <Radio value="none">None</Radio>
                <Radio value="whitelist">Whitelist</Radio>
              </Radio.Group>
            </Form.Item>
            {editForm.getFieldValue('passHeadersMode') === 'whitelist' && (
              <Form.Item name="passHeadersWhitelist" rules={[{ type: 'array' }] }>
                <Checkbox.Group options={[{ label: 'Origin（需加入 Header 白名单）', value: 'Origin' }]} />
              </Form.Item>
            )}

            {/* Query strings：All / None / Whitelist */}
            <Form.Item label="Query strings" name="passQueryStringsMode" initialValue="none">
              <Radio.Group>
                <Radio value="all">All</Radio>
                <Radio value="none">None</Radio>
                <Radio value="whitelist">Whitelist</Radio>
              </Radio.Group>
            </Form.Item>
            {editForm.getFieldValue('passQueryStringsMode') === 'whitelist' && (
              <Form.Item name="passQueryStringsWhitelistText">
                <Input placeholder="白名单（逗号分隔）" />
              </Form.Item>
            )}

            {/* Cookies：All / None / Whitelist */}
            <Form.Item label="Cookies" name="passCookiesMode" initialValue="none">
              <Radio.Group>
                <Radio value="all">All</Radio>
                <Radio value="none">None</Radio>
                <Radio value="whitelist">Whitelist</Radio>
              </Radio.Group>
            </Form.Item>
            {editForm.getFieldValue('passCookiesMode') === 'whitelist' && (
              <Form.Item name="passCookiesWhitelistText">
                <Input placeholder="白名单（逗号分隔）" />
              </Form.Item>
            )}
          </Card>
        </Form>
        {/* 底部注释说明：缓存时间与透传回源参数的最佳实践 */}
        <div style={{ marginTop: 12, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>缓存时间（TTL）</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <strong>高时效性内容</strong>（如翻译文本）：
              <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                <li><code>TTL = 0</code> → 强制实时回源。</li>
              </ul>
            </li>
            <li>
              <strong>低时效性内容</strong>（如图片、静态资源）：
              <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                <li><code>TTL ≥ 10 分钟</code> → 提升缓存命中率，减少回源压力。</li>
              </ul>
            </li>
            <li>
              <strong>特殊规则</strong>：
              <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                <li>当 <strong>源站返回 <code>no-cache</code> 且控制台 TTL=0</strong> 时，CDN 将强制实时回源（0 秒）。</li>
              </ul>
            </li>
          </ul>

          <div style={{ margin: '12px 0', borderTop: '1px dashed #eaeaea' }} />

          <div style={{ fontWeight: 600, marginBottom: 8 }}>透传回源参数</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <strong>Headers</strong>：<code>Origin</code>（需加入 Header 白名单）
            </li>
            <li>
              <strong>Query strings</strong>：不透传
            </li>
            <li>
              <strong>Cookies</strong>：不透传
            </li>
          </ul>
        </div>
      </Drawer>
    </div>
  )
}

