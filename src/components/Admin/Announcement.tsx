import React, { useState } from 'react'
import { Button, Form, Input, Select, Modal, message, Card, Table, Space, Checkbox, Descriptions, Badge, Timeline } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface AnnouncementItem {
  id: string
  title: string
  content: string
  method: string
  type: string
  status: '已发布' | '未发布'
  publishAt?: string
  gameScope: string[]  // 新增：发送范围（游戏列表）
  publishHistory?: string[]  // 新增：发布历史记录
}

// 历史版本详细记录
interface HistoryVersion {
  publishTime: string      // 发布时间
  content: string          // 发布内容
  appIds: string[]         // 发送的appid（游戏范围）
  receiverCount: number    // 接收人数量
  readCount: number        // 已读数量
  unreadCount: number      // 未读数量
}

// 这段代码实现了：公告列表 + 新建公告表单 + Markdown 预览与发布，全部为前端本地演示
export default function Announcement() {
  const [items, setItems] = useState<AnnouncementItem[]>([
    { id: '1', title: '系统维护通知', content: '# 系统维护\n\n我们将于 **今晚 23:00-01:00** 进行系统维护，期间可能影响服务。', method: 'modal', type: '系统消息', status: '未发布', publishAt: '2024/09/01 10:00:00', gameScope: ['全部游戏'] },
    { id: '2', title: '新活动上线', content: '# 新活动\n\n参与活动可获得丰厚奖励，详见 [活动页](https://example.com)。', method: 'bottom', type: '系统消息', status: '已发布', publishAt: '2024/09/01 10:00:00', publishHistory: ['2024/09/01 10:00:00'], gameScope: ['gamedemo', 'kumo'] },
    { id: '3', title: '小规模优化', content: '本次版本包含若干性能优化，提升启动速度。', method: 'modal', type: '系统消息', status: '未发布', publishAt: '2024/09/01 10:00:00', gameScope: ['yu.b'] }
  ])
  
  // 模拟历史版本数据（实际应从后端获取）
  const [historyVersions] = useState<Record<string, HistoryVersion[]>>({
    '2': [ // 对应公告ID
      {
        publishTime: '2024/09/01 10:00:00',
        content: '# 新活动\n\n参与活动可获得丰厚奖励，详见 [活动页](https://example.com)。',
        appIds: ['gamedemo', 'kumo'],
        receiverCount: 15000,
        readCount: 12500,
        unreadCount: 2500
      },
      {
        publishTime: '2024/08/25 14:30:00',
        content: '# 新活动预告\n\n即将上线全新活动，敬请期待！',
        appIds: ['gamedemo'],
        receiverCount: 8000,
        readCount: 7800,
        unreadCount: 200
      }
    ]
  })
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)  // 新增：记录正在编辑的公告ID
  const [form] = Form.useForm()
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [previewGameScope, setPreviewGameScope] = useState<string[]>([])  // 新增：预览时显示发送范围
  const [previewOnConfirm, setPreviewOnConfirm] = useState<(() => void) | null>(null)
  // 新增：是否同时发布到钉钉群（仅在发布弹窗中使用）
  const [publishToDingTalk, setPublishToDingTalk] = useState<boolean>(false)
  // 历史版本弹窗
  const [historyVisible, setHistoryVisible] = useState(false)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)

  // 游戏选项列表
  const gameOptions = [
    { label: '全部游戏', value: '全部游戏' },
    { label: 'gamedemo', value: 'gamedemo' },
    { label: 'kumo', value: 'kumo' },
    { label: 'yu.b', value: 'yu.b' }
  ]

  // 处理游戏范围选择的互斥逻辑：选择"全部游戏"时清除其他选项，选择其他游戏时移除"全部游戏"
  const handleGameScopeChange = (values: string[]) => {
    const hasAllGames = values.includes('全部游戏')
    const otherGames = values.filter(v => v !== '全部游戏')
    
    if (hasAllGames && otherGames.length > 0) {
      // 如果同时选择了"全部游戏"和其他游戏，判断最后选择的是哪个
      const currentValues = form.getFieldValue('gameScope') || []
      const wasAllGamesSelected = currentValues.includes('全部游戏')
      
      if (wasAllGamesSelected) {
        // 之前已选择"全部游戏"，现在选择了其他游戏，移除"全部游戏"
        form.setFieldsValue({ gameScope: otherGames })
      } else {
        // 之前选择了其他游戏，现在选择"全部游戏"，只保留"全部游戏"
        form.setFieldsValue({ gameScope: ['全部游戏'] })
      }
    } else {
      // 正常情况，直接设置值
      form.setFieldsValue({ gameScope: values })
    }
  }

  const openCreate = () => {
    setCreating(true)
    setEditingId(null)
    form.resetFields()
  }

  const cancelCreate = () => {
    setCreating(false)
    setEditingId(null)
  }

  // 编辑公告（包括已发布的）
  const openEdit = (record: AnnouncementItem) => {
    setCreating(true)
    setEditingId(record.id)
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      method: record.method,
      type: record.type,
      gameScope: record.gameScope
    })
  }

  const handlePreview = async () => {
    try {
      const values = await form.validateFields()
      // 在预览时同时带上标题和发送范围一起预览（仅预览，不触发发布）
      setPreviewTitle(values.title)
      setPreviewContent(values.content)
      setPreviewGameScope(values.gameScope || [])
      setPreviewOnConfirm(null)
      setPreviewVisible(true)
    } catch {
      // ignore
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingId) {
        // 编辑现有公告
        setItems(prev => prev.map(item => 
          item.id === editingId 
            ? { ...item, title: values.title, content: values.content, method: values.method, type: values.type, gameScope: values.gameScope }
            : item
        ))
        message.success('编辑保存成功（冲突展示）')
      } else {
        // 新建公告
        const id = String(Date.now())
        setItems(prev => [{ 
          id, 
          title: values.title, 
          content: values.content, 
          method: values.method, 
          type: values.type, 
          gameScope: values.gameScope || ['全部游戏'],
          status: '未发布',
        } as AnnouncementItem, ...prev])
        message.success('保存成功（示例）')
      }
      setCreating(false)
      setEditingId(null)
    } catch {}
  }
  // 通过预览弹窗进行发布：支持多次发布
  const openPublishPreviewForRow = (row: AnnouncementItem) => {
    setPreviewTitle(row.title)
    setPreviewContent(row.content)
    setPreviewGameScope(row.gameScope)
    // 打开发布弹窗时，重置钉钉选择为“否”
    setPublishToDingTalk(false)
    setPreviewOnConfirm(() => () => {
      const now = new Date().toISOString()
      setItems(prev => prev.map(it => it.id === row.id ? { 
        ...it, 
        publishAt: now,
        publishHistory: [...(it.publishHistory || []), now]
      } : it))
      message.success('发布成功（示例）')
      // 如果选择了同时发布到钉钉群，这里仅做示例提示
      if (publishToDingTalk) {
        message.success('已同步到钉钉群（示例）')
      }
      setPreviewVisible(false)
    })
    setPreviewVisible(true)
  }

  const openPublishPreviewForForm = async () => {
    try {
      const values = await form.validateFields()
      setPreviewTitle(values.title)
      setPreviewContent(values.content)
      setPreviewGameScope(values.gameScope || [])
      // 打开发布弹窗时，重置钉钉选择为“否”
      setPublishToDingTalk(false)
      setPreviewOnConfirm(() => () => {
        const now = new Date().toISOString()
        
        if (editingId) {
          // 编辑中的公告发布
          setItems(prev => prev.map(item => 
            item.id === editingId 
              ? { 
                  ...item, 
                  title: values.title, 
                  content: values.content, 
                  method: values.method, 
                  type: values.type, 
                  gameScope: values.gameScope,
                  publishAt: now,
                  publishHistory: [...(item.publishHistory || []), now]
                }
              : item
          ))
        } else {
          // 新建公告发布
          const id = String(Date.now())
          setItems(prev => [{ 
            id, 
            title: values.title, 
            content: values.content, 
            method: values.method, 
            type: values.type, 
            gameScope: values.gameScope || ['全部游戏'],
            publishAt: now,
            publishHistory: [now],
            status: '未发布',
          }, ...prev])
        }
        
        message.success('发布成功（示例）')
        // 如果选择了同时发布到钉钉群，这里仅做示例提示
        if (publishToDingTalk) {
          message.success('已同步到钉钉群')
        }
        form.resetFields()
        setCreating(false)
        setEditingId(null)
        setPreviewVisible(false)
      })
      setPreviewVisible(true)
    } catch {
      // ignore
    }
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { 
      title: '公告范围', 
      dataIndex: 'gameScope', 
      key: 'gameScope', 
      width: 150,
      render: (gameScope: string[]) => gameScope?.join(', ') || '-'
    },
    { 
      title: '内容', 
      dataIndex: 'content', 
      key: 'content', 
      width: 150,
      render: (content: string) => content || '-'
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
    { title: '通知类型', dataIndex: 'type', key: 'type', width: 120 },
    { title: '最近发布时间', dataIndex: 'publishAt', key: 'publishAt', width: 180 },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: AnnouncementItem) => (
        <Space>
          <Button type="link" onClick={() => {
            // 打开仅用于预览的弹窗（无发布确认）
            setPreviewTitle(record.title)
            setPreviewContent(record.content)
            setPreviewGameScope(record.gameScope)
            setPreviewOnConfirm(null)
            setPreviewVisible(true)
          }}>预览</Button>
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
          <Button type="link" onClick={() => openPublishPreviewForRow(record)}>发布</Button>
          {/* 历史版本按钮：只有已发布过的公告才显示 */}
          {record.publishHistory && record.publishHistory.length > 0 && (
            <Button 
              type="link" 
              icon={<HistoryOutlined />}
              onClick={() => {
                setCurrentHistoryId(record.id)
                setHistoryVisible(true)
              }}
            >
              历史
            </Button>
          )}
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
        <Card size="small" title={editingId ? "编辑公告" : "新建公告"}>
          <Form form={form} layout="vertical">
            <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }, { max: 24, message: '最多 24 字' }] }>
              <Input />
            </Form.Item>
            <Form.Item label="发送范围" name="gameScope" initialValue={['全部游戏']} rules={[{ required: true, message: '请选择发送范围' }]}>
              <Select mode="multiple" placeholder="请选择游戏范围" options={gameOptions} onChange={handleGameScopeChange} />
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
          {/* 显示发送范围信息 */}
          {previewGameScope.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <strong>发送范围：</strong>{previewGameScope.join(', ')}
            </div>
          )}
          {/* 使用简单的 Markdown -> HTML 转换器进行渲染（原型用，非完全兼容） */}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(previewContent) }} />
          {/* 勾选框放在内容最下方，类似"我已知晓风险"的呈现风格 */}
          {previewOnConfirm && (
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              {/* 交互：勾选后会在发布时同步到钉钉群（仅示例提示） */}
              <Checkbox
                checked={publishToDingTalk}
                onChange={(e) => setPublishToDingTalk(e.target.checked)}
              >
                同时发布到钉钉群
              </Checkbox>
            </div>
          )}
        </div>
      </Modal>

      {/* 历史版本弹窗 */}
      <Modal
        title="发布历史版本"
        open={historyVisible}
        onCancel={() => {
          setHistoryVisible(false)
          setCurrentHistoryId(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setHistoryVisible(false)
            setCurrentHistoryId(null)
          }}>
            关闭
          </Button>
        ]}
        width={900}
      >
        {currentHistoryId && historyVersions[currentHistoryId] && historyVersions[currentHistoryId].length > 0 ? (
          <Timeline
            style={{ marginTop: 20 }}
            items={historyVersions[currentHistoryId].map((version, index) => ({
              color: index === 0 ? 'green' : 'gray',
              children: (
                <Card 
                  size="small" 
                  style={{ marginBottom: 16 }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Descriptions 
                    column={2} 
                    bordered
                    size="small"
                    labelStyle={{ fontWeight: 600, width: 120 }}
                  >
                    <Descriptions.Item label="发布时间" span={2}>
                      {version.publishTime}
                      {index === 0 && (
                        <Badge 
                          count="最新" 
                          style={{ marginLeft: 12, backgroundColor: '#52c41a' }} 
                        />
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="发送范围">
                      {version.appIds.join(', ')}
                    </Descriptions.Item>
                    <Descriptions.Item label="接收人数">
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
                        {version.receiverCount.toLocaleString()}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="已读">
                      <span style={{ color: '#52c41a', fontWeight: 600 }}>
                        {version.readCount.toLocaleString()}
                      </span>
                      <span style={{ marginLeft: 8, color: '#999' }}>
                        ({((version.readCount / version.receiverCount) * 100).toFixed(1)}%)
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="未读">
                      <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                        {version.unreadCount.toLocaleString()}
                      </span>
                      <span style={{ marginLeft: 8, color: '#999' }}>
                        ({((version.unreadCount / version.receiverCount) * 100).toFixed(1)}%)
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="发布内容" span={2}>
                      <div 
                        style={{ 
                          marginTop: 8,
                          padding: 12,
                          backgroundColor: '#fafafa',
                          borderRadius: 4,
                          maxHeight: 200,
                          overflow: 'auto'
                        }}
                      >
                        {/* 缩小标题字号，使内容更紧凑 */}
                        <div 
                          dangerouslySetInnerHTML={{ __html: renderMarkdownCompact(version.content) }}
                          style={{
                            fontSize: '13px',
                            lineHeight: '1.6'
                          }}
                        />
                      </div>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )
            }))}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无发布历史
          </div>
        )}
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

// 紧凑版 Markdown 渲染器：用于历史版本内容，标题字号更小
function renderMarkdownCompact(md: string): string {
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
    // headings - 使用更小的字号
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (hMatch) {
      const level = hMatch[1].length
      // 为历史内容的标题添加内联样式，缩小字号
      const fontSize = level === 1 ? '16px' : level === 2 ? '15px' : '14px'
      const margin = '6px 0 4px 0'
      out.push(`<h${level} style="font-size: ${fontSize}; margin: ${margin}; font-weight: 600;">${formatInline(esc(hMatch[2]))}</h${level}>`)
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

