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
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Checkbox,
  Radio,
  Switch,
  Badge,
  Alert
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
// 图标按需引入；当前交互为 1-2 个操作使用文字按钮，无需图标

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
  passQueryStringsWhitelist: string[]
  passCookiesMode: 'all' | 'none' | 'whitelist'
  passCookiesWhitelist: string[]
}

// 缓存检测结果-表格行类型
interface DetectedFileTypeRow {
  ext: string
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
  // 新增：缓存检测抽屉开关与检测出的文件类型
  const [detectVisible, setDetectVisible] = React.useState<boolean>(false)
  const [detectedFileTypes, setDetectedFileTypes] = React.useState<string[]>([])
  const [detectedSelected, setDetectedSelected] = React.useState<string[]>([])
  const [ignoredFileTypes, setIgnoredFileTypes] = React.useState<string[]>([])
  const [ignoredSelected, setIgnoredSelected] = React.useState<string[]>([])
  // 新增：最佳实践弹窗开关
  const [bestPracticeVisible, setBestPracticeVisible] = React.useState<boolean>(false)
  // 表格列定义（方案B：上下分区，各自支持移动）
  const detectedColumns: TableColumnsType<DetectedFileTypeRow> = [
    { title: '缓存类型', dataIndex: 'ext', key: 'ext' },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: DetectedFileTypeRow) => (
        <Space size={8}>
          {/* 忽略（文字按钮，便于明确含义） */}
          <Button type="link" onClick={() => moveToIgnored(record.ext)}>忽略</Button>
        </Space>
      )
    }
  ]
  const ignoredColumns: TableColumnsType<DetectedFileTypeRow> = [
    { title: '缓存类型', dataIndex: 'ext', key: 'ext' },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: DetectedFileTypeRow) => (
        <Space size={8}>
          {/* 恢复（文字按钮） */}
          <Button type="link" onClick={() => restoreFromIgnored(record.ext)}>恢复</Button>
          {/* 删除（文字按钮） */}
          <Button type="link" danger onClick={() => deleteIgnored(record.ext)}>删除</Button>
        </Space>
      )
    }
  ]
  // 交互：添加源站
  const handleAddOrigin = (): void => {
    message.info('点击了添加源站（示例）')
  }

  // 交互：缓存检测（示例）
  // 点击后模拟检测静态资源常见后缀，并打开结果抽屉
  const handleDetectCache = (): void => {
    const types: string[] = ['.png', '.gif', '.jpg', '.jpeg', '.webp', '.svg', '.ico']
    setDetectedFileTypes(types)
    setDetectedSelected([])
    setDetectVisible(true)
  }
  // 交互：Toast 忽略 / 查看
  const handleIgnoreDetectedToast = (): void => {
    // 忽略后清空已检测提示来源
    setDetectedFileTypes([])
    setDetectedSelected([])
  }
  const handleViewDetectedToast = (): void => {
    setDetectVisible(true)
  }
  // 交互：忽略一个类型（移到“已忽略”）
  const moveToIgnored = (ext: string): void => {
    setDetectedFileTypes((prev) => prev.filter((e) => e !== ext))
    setDetectedSelected((prev) => prev.filter((e) => e !== ext))
    setIgnoredFileTypes((prev) => (prev.includes(ext) ? prev : [...prev, ext]))
  }
  // 交互：从“已忽略”恢复
  const restoreFromIgnored = (ext: string): void => {
    setIgnoredFileTypes((prev) => prev.filter((e) => e !== ext))
    setDetectedFileTypes((prev) => (prev.includes(ext) ? prev : [...prev, ext]))
  }
  // 交互：从“已忽略”删除该类型
  const deleteIgnored = (ext: string): void => {
    setIgnoredFileTypes((prev) => prev.filter((e) => e !== ext))
  }
  // 交互：根据勾选的类型批量新增缓存配置（示例实现，避免重复 pattern）
  const handleAddCacheForSelected = (): void => {
    if (detectedSelected.length === 0) {
      message.warning('请先勾选类型')
      return
    }
    const newRules: CacheRule[] = detectedSelected.map((ext) => ({
      // 使用 *.ext 作为匹配模式
      pattern: `*${ext}`,
      sourceId: 'Default',
      accessProto: '仅限HTTPS',
      httpMethods: 'GET, HEAD, OPTIONS',
      smartCompress: 'ON',
      ttlSeconds: 600,
      passHeadersMode: 'whitelist',
      passHeadersWhitelist: ['Origin'],
      passQueryStringsMode: 'none',
      passCookiesMode: 'none'
    }))
    setCacheList((prev) => {
      const exist = new Set(prev.map((r) => r.pattern))
      const merged = [...prev]
      for (const r of newRules) {
        if (!exist.has(r.pattern)) {
          merged.push(r)
          exist.add(r.pattern)
        }
      }
      return merged
    })
    // 从“已检测类型”中移除已添加的类型
    setDetectedFileTypes((prev) => prev.filter((ext) => !detectedSelected.includes(ext)))
    // 关闭抽屉并清空勾选
    setDetectVisible(false)
    setDetectedSelected([])
    message.success(`已添加 ${detectedSelected.length} 条缓存配置（示例）`)
  }

  // 交互：从“已忽略类型”分区批量新增缓存配置
  const handleAddCacheFromIgnored = (): void => {
    if (ignoredSelected.length === 0) {
      message.warning('请先勾选忽略类型')
      return
    }
    const newRules: CacheRule[] = ignoredSelected.map((ext) => ({
      // 使用 *.ext 作为匹配模式
      pattern: `*${ext}`,
      sourceId: 'Default',
      accessProto: '仅限HTTPS',
      httpMethods: 'GET, HEAD, OPTIONS',
      smartCompress: 'ON',
      ttlSeconds: 600,
      passHeadersMode: 'whitelist',
      passHeadersWhitelist: ['Origin'],
      passQueryStringsMode: 'none',
      passCookiesMode: 'none'
    }))
    setCacheList((prev) => {
      const exist = new Set(prev.map((r) => r.pattern))
      const merged = [...prev]
      for (const r of newRules) {
        if (!exist.has(r.pattern)) {
          merged.push(r)
          exist.add(r.pattern)
        }
      }
      return merged
    })
    // 关闭抽屉并清空勾选
    setDetectVisible(false)
    setIgnoredSelected([])
    message.success(`已添加 ${ignoredSelected.length} 条缓存配置（示例）`)
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
    passHeadersWhitelist: row.passHeadersWhitelist || [],
    passQueryStringsMode: row.passQueryStringsMode || 'none',
    passQueryStringsWhitelist: row.passQueryStringsWhitelist || [],
    passCookiesMode: row.passCookiesMode || 'none',
    passCookiesWhitelist: row.passCookiesWhitelist || []
    })
  }

  // 交互：保存编辑后的缓存规则
  const handleSaveCache = async (): Promise<void> => {
    try {
      const values = await editForm.validateFields()
      if (!editingKey) return
      // 映射表单值 -> 数据结构
      const httpMethods = Array.isArray(values.httpMethods) ? (values.httpMethods as string[]).join(', ') : String(values.httpMethods)
      const passQueryStringsWhitelist = (values.passQueryStringsWhitelist || [])
        .map((s: string) => (s || '').trim())
        .filter((s: string) => s.length > 0)
      const passCookiesWhitelist = (values.passCookiesWhitelist || [])
        .map((s: string) => (s || '').trim())
        .filter((s: string) => s.length > 0)

      const passHeadersWhitelist = (values.passHeadersWhitelist || [])
        .map((s: string) => (s || '').trim())
        .filter((s: string) => s.length > 0)

      const nextRow: CacheRule = {
        pattern: values.pattern,
        sourceId: values.sourceId,
        accessProto: values.accessProto,
        httpMethods,
        smartCompress: values.smartCompress,
        ttlSeconds: values.ttlSeconds,
        passHeadersMode: values.passHeadersMode,
        passHeadersWhitelist,
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

      {/* Toast：检测到新的缓存配置（位于 Tabs 与 基础信息之间） */}
      {detectedFileTypes.length > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="检测到新的缓存配置"
          action={(
            <Space size={8}>
              <Button type="link" onClick={handleIgnoreDetectedToast}>忽略</Button>
              <Button type="link" onClick={handleViewDetectedToast}>查看</Button>
            </Space>
          )}
        />
      )}

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
            <Badge dot={detectedFileTypes.length > 0} offset={[ -2, 2 ]}>
              <Button onClick={handleDetectCache}>缓存检测</Button>
            </Badge>
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
      {/* 缓存检测结果抽屉 */}
      <Drawer
        title="缓存检测"
        open={detectVisible}
        onClose={() => setDetectVisible(false)}
        width={520}
        footer={
          <Space>
            {/* 添加（已检测选中） */}
            <Button type="primary" onClick={handleAddCacheForSelected} disabled={detectedSelected.length === 0}>添加缓存配置</Button>
            {/* 仅允许从“已检测类型”添加，移除忽略区添加入口 */}
            {/* 关闭 */}
              <Button type="text"  onClick={() => setDetectVisible(false)} >关闭</Button>
          </Space>
        }
        styles={{ footer: { textAlign: 'left' } }}
        destroyOnClose
      >
        {/* 方案B：上下两个分区 */}
        <Card size="small" title="已检测类型" style={{ marginBottom: 12 }}>
          <Table<DetectedFileTypeRow>
            size="small"
            columns={detectedColumns}
            dataSource={detectedFileTypes.map((ext) => ({ ext }))}
            rowKey={(r) => r.ext}
            rowSelection={{
              selectedRowKeys: detectedSelected,
              onChange: (keys) => setDetectedSelected(keys as string[])
            }}
            pagination={false}
          />
        </Card>
        <Card size="small" title="已忽略类型">
          <Table<DetectedFileTypeRow>
            size="small"
            columns={ignoredColumns}
            dataSource={ignoredFileTypes.map((ext) => ({ ext }))}
            rowKey={(r) => r.ext}
            pagination={false}
          />
        </Card>
      </Drawer>  
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
        {/* 顶部 Toast：快捷提示 TTL 推荐值；点击“最佳实践”打开说明弹窗 */}
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message={(
            <div>
              <Text strong>缓存时间（TTL）填写。</Text> 翻译文本：<Text code>TTL = 0</Text>；图片、静态资源：<Text code>TTL = 2592000</Text>
            </div>
          )}
          action={(
            // 交互：点击打开最佳实践说明弹窗
            <Button type="link" onClick={() => setBestPracticeVisible(true)} aria-label="查看缓存时间最佳实践">最佳实践</Button>
          )}
        />

        {/* 最佳实践说明弹窗（可关闭） */}
        <Modal
          title="缓存时间最佳实践"
          open={bestPracticeVisible}
          onCancel={() => setBestPracticeVisible(false)}
          footer={<Button type="primary" onClick={() => setBestPracticeVisible(false)}>关闭</Button>}
        >
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>会变动的资源（html、config、i18n 等）</div>
            <ul style={{ paddingLeft: 18, marginTop: 0 }}>
              <li>缓存时间：<Text code>0</Text></li>
              <li>行为：每次都回源拉取最新文件，客户端无需加上 query string</li>
              <li>若文件未变动：返回 304，不会重新下载</li>
              <li>Headers: <Text code>Origin</Text></li>
              <li>Query string: <Text code>None</Text></li>
              <li>Cookies: <Text code>None</Text></li>
            </ul>
            <div style={{ borderTop: '1px dashed #eaeaea', margin: '12px 0' }} />
            <div style={{ fontWeight: 600, marginBottom: 6 }}>不会变动的静态资源</div>
            <ul style={{ paddingLeft: 18, marginTop: 0 }}>
              <li>缓存时间：<Text code>2592000</Text></li>
              <li>行为：因不会变动，缓存时间设为最长以充分利用，本地缓存优先</li>
              <li>若发生变动：可通过 query string 强制刷新缓存</li>
              <li>Headers: <Text code>Origin</Text></li>
              <li>Query string: <Text code>All</Text></li>
              <li>Cookies: <Text code>None</Text></li>
            </ul>
          </div>
        </Modal>

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
                  <Button type="link" size="small" style={{ marginLeft: 6, padding: 0 }} aria-label="?">?</Button>
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
            {/* Headers：与单选项同行显示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 96, color: '#595959' }}>Headers</div>
              <Form.Item name="passHeadersMode" initialValue="whitelist" style={{ marginBottom: 0 }}>
                <Radio.Group>
                  <Radio value="all">All</Radio>
                  <Radio value="none">None</Radio>
                  <Radio value="whitelist">Whitelist</Radio>
                </Radio.Group>
              </Form.Item>
            </div>
            {editForm.getFieldValue('passHeadersMode') === 'whitelist' && (
              <Form.List name="passHeadersWhitelist">
                {(fields, { add, remove }) => (
                  <div>
                    {fields.map((field) => (
                      <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Form.Item {...field} name={[field.name]} style={{ flex: 1, marginBottom: 0 }}>
                          <Input placeholder="输入一个值" />
                        </Form.Item>
                        <Button danger type="text" aria-label="删除该值" onClick={() => remove(field.name)} icon={<MinusCircleOutlined />} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加一项</Button>
                  </div>
                )}
              </Form.List>
            )}

            {/* Query strings：与单选项同行显示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 96, color: '#595959' }}>Query strings</div>
              <Form.Item name="passQueryStringsMode" initialValue="none" style={{ marginBottom: 0 }}>
                <Radio.Group>
                  <Radio value="all">All</Radio>
                  <Radio value="none">None</Radio>
                  <Radio value="whitelist">Whitelist</Radio>
                </Radio.Group>
              </Form.Item>
            </div>
            {editForm.getFieldValue('passQueryStringsMode') === 'whitelist' && (
              <Form.List name="passQueryStringsWhitelist">
                {(fields, { add, remove }) => (
                  <div>
                    {fields.map((field) => (
                      <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Form.Item {...field} name={[field.name]} style={{ flex: 1, marginBottom: 0 }}>
                          <Input placeholder="输入一个值" />
                        </Form.Item>
                        <Button danger type="text" aria-label="删除该值" onClick={() => remove(field.name)} icon={<MinusCircleOutlined />} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加一项</Button>
                  </div>
                )}
              </Form.List>
            )}

            {/* Cookies：与单选项同行显示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 96, color: '#595959' }}>Cookies</div>
              <Form.Item name="passCookiesMode" initialValue="none" style={{ marginBottom: 0 }}>
                <Radio.Group>
                  <Radio value="all">All</Radio>
                  <Radio value="none">None</Radio>
                  <Radio value="whitelist">Whitelist</Radio>
                </Radio.Group>
              </Form.Item>
            </div>
            {editForm.getFieldValue('passCookiesMode') === 'whitelist' && (
              <Form.List name="passCookiesWhitelist">
                {(fields, { add, remove }) => (
                  <div>
                    {fields.map((field) => (
                      <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Form.Item {...field} name={[field.name]} style={{ flex: 1, marginBottom: 0 }}>
                          <Input placeholder="输入一个值" />
                        </Form.Item>
                        <Button danger type="text" aria-label="删除该值" onClick={() => remove(field.name)} icon={<MinusCircleOutlined />} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加一项</Button>
                  </div>
                )}
              </Form.List>
            )}
          </Card>
        </Form>
      </Drawer>
    </div>
  )
}