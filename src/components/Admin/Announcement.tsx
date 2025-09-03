import React, { useState } from 'react'
import { Button, Form, Input, Select, Modal, message, Card, Table, Space } from 'antd'

const { TextArea } = Input

interface AnnouncementItem {
  id: string
  title: string
  content: string
  method: string
  type: string
  status: '已发布' | '未发布'
  publishAt?: string
}

// 这段代码实现了：公告列表 + 新建公告表单 + Markdown 预览与发布，全部为前端本地演示
export default function Announcement() {
  const [items, setItems] = useState<AnnouncementItem[]>([
    { id: '1', title: '系统维护通知', content: '# 系统维护\n\n我们将于 **今晚 23:00-01:00** 进行系统维护，期间可能影响服务。', method: 'modal', type: 'system', status: '未发布' },
    { id: '2', title: '新活动上线', content: '# 新活动\n\n参与活动可获得丰厚奖励，详见 [活动页](https://example.com)。', method: 'bottom', type: 'system', status: '已发布', publishAt: '2024/09/01 10:00:00' },
    { id: '3', title: '小规模优化', content: '本次版本包含若干性能优化，提升启动速度。', method: 'modal', type: 'system', status: '未发布' }
  ])
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [previewOnConfirm, setPreviewOnConfirm] = useState<(() => void) | null>(null)

  const openCreate = () => {
    setCreating(true)
    form.resetFields()
  }

  const cancelCreate = () => {
    setCreating(false)
  }

  const handlePreview = async () => {
    try {
      const values = await form.validateFields()
      // 在预览时同时带上标题一起预览（仅预览，不触发发布）
      setPreviewTitle(values.title)
      setPreviewContent(values.content)
      setPreviewOnConfirm(null)
      setPreviewVisible(true)
    } catch {
      // ignore
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const id = String(Date.now())
      setItems(prev => [{ id, title: values.title, content: values.content, method: values.method, type: values.type, status: '未发布' }, ...prev])
      message.success('保存成功（示例）')
      setCreating(false)
    } catch {
      // ignore
    }
  }

  // 格式化当前时间
  const formatNow = (): string => {
    const now = new Date()
    return `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
  }

  // 通过预览弹窗进行发布：如果传入 row，则对该行发布；否则对当前表单数据发布
  const openPublishPreviewForRow = (row: AnnouncementItem) => {
    setPreviewTitle(row.title)
    setPreviewContent(row.content)
    setPreviewOnConfirm(() => () => {
      const now = formatNow()
      setItems(prev => prev.map(it => it.id === row.id ? { ...it, status: '已发布', publishAt: now } : it))
      message.success('发布成功（示例）')
      setPreviewVisible(false)
    })
    setPreviewVisible(true)
  }

  const openPublishPreviewForForm = async () => {
    try {
      const values = await form.validateFields()
      setPreviewTitle(values.title)
      setPreviewContent(values.content)
      setPreviewOnConfirm(() => () => {
        const id = String(Date.now())
        const now = formatNow()
        setItems(prev => [{ id, title: values.title, content: values.content, method: values.method, type: values.type, status: '已发布', publishAt: now }, ...prev])
        message.success('发布成功（示例）')
        form.resetFields()
        setCreating(false)
        setPreviewVisible(false)
      })
      setPreviewVisible(true)
    } catch {
      // ignore
    }
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '通知方式', dataIndex: 'method', key: 'method', width: 120 },
    { title: '通知类型', dataIndex: 'type', key: 'type', width: 120 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    { title: '发布时间', dataIndex: 'publishAt', key: 'publishAt', width: 180 },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: unknown, record: AnnouncementItem) => (
        <Space>
          <Button type="link" onClick={() => {
            // 打开仅用于预览的弹窗（无发布确认）
            setPreviewTitle(record.title)
            setPreviewContent(record.content)
            setPreviewOnConfirm(null)
            setPreviewVisible(true)
          }}>预览</Button>
          <Button type="link" onClick={() => {
            // 进入编辑（示例：把内容加载到表单）
            setCreating(true)
            form.setFieldsValue({ title: record.title, content: record.content, method: record.method, type: record.type })
          }} disabled={record.status === '已发布'}>编辑</Button>
          <Button type="link" onClick={() => openPublishPreviewForRow(record)} disabled={record.status === '已发布'}>发布</Button>
        </Space>
      )
    }
  ]

  return (
    <Card title="公告管理（示例）">
      {!creating && (
        <div style={{ marginBottom: 12 }}>
          <Button type="primary" onClick={openCreate}>新建公告</Button>
        </div>
      )}

      {creating ? (
        <Card size="small">
          <Form form={form} layout="vertical">
            <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }, { max: 24, message: '最多 24 字' }] }>
              <Input />
            </Form.Item>
            <Form.Item label="通知方式" name="method" initialValue="modal">
              <Select>
                <Select.Option value="modal">中间弹窗</Select.Option>
                <Select.Option value="banner">顶部横幅</Select.Option>
                <Select.Option value="bottom">右下角弹窗</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="通知类型" name="type" initialValue="system">
              <Select>
                <Select.Option value="system">系统公告</Select.Option>
                <Select.Option value="alarm">告警</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="内容（支持 Markdown）" name="content" rules={[{ required: true }, { max: 2560 }] }>
              <TextArea rows={6} />
            </Form.Item>
            <Form.Item>
              <Button style={{ marginRight: 8 }} onClick={handlePreview}>预览</Button>
              <Button type="default" style={{ marginRight: 8 }} onClick={handleSave}>保存</Button>
              <Button type="primary" style={{ marginRight: 8 }} onClick={() => openPublishPreviewForForm()}>发布</Button>
              <Button onClick={cancelCreate}>取消</Button>
            </Form.Item>
          </Form>
        </Card>
      ) : (
        <Table dataSource={items} columns={columns} rowKey={(r: AnnouncementItem) => r.id} pagination={{ pageSize: 6 }} />
      )}

      <Modal
        title={previewTitle ? `预览：${previewTitle}` : '预览'}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={previewOnConfirm ? [
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>取消</Button>,
          <Button key="confirm" type="primary" onClick={() => { previewOnConfirm && previewOnConfirm() }}>发布</Button>
        ] : [<Button key="close" onClick={() => setPreviewVisible(false)}>关闭</Button>]}
      >
        <div style={{ padding: 12 }}>
          {/* 使用简单的 Markdown -> HTML 转换器进行渲染（原型用，非完全兼容） */}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(previewContent) }} />
        </div>
      </Modal>
    </Card>
  )
}

// 简易 Markdown 渲染器：支持标题、粗体、斜体、链接、行内代码、段落与无序列表
function renderMarkdown(md: string): string {
  if (!md) return ''
  // 转义 HTML
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = md.split(/\r?\n/)
  let inList = false
  const out: string[] = []
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') {
      if (inList) { out.push('</ul>'); inList = false }
      out.push('<p></p>')
      continue
    }
    // list
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      const item = line.replace(/^[-*]\s+/, '')
      out.push(`<li>${formatInline(esc(item))}</li>`)
      continue
    }
    if (inList) { out.push('</ul>'); inList = false }
    // headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (hMatch) {
      const level = hMatch[1].length
      out.push(`<h${level}>${formatInline(esc(hMatch[2]))}</h${level}>`)
      continue
    }
    out.push(`<div>${formatInline(esc(line))}</div>`)
  }
  if (inList) out.push('</ul>')
  return out.join('\n')
}

function formatInline(s: string): string {
  // bold **text**
  let r = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // italic *text*
  r = r.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // inline code `code`
  r = r.replace(/`(.+?)`/g, '<code>$1</code>')
  // links [text](url)
  r = r.replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  return r
}

