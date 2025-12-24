'use client'

import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  message
} from 'antd'
import type { TableColumnsType } from 'antd'
import { EditOutlined, FileTextOutlined, CopyOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Search } = Input

interface GameFaroConfigItem {
  id: string
  gameName: string
  faroUrl: string
  updatedAt: string
}

// 这段代码实现了：游戏级别的 faro 配置列表页，支持搜索、查看详情、编辑 YAML、删除记录
export default function GameFaroConfig(): React.ReactElement {
  const [messageApi, contextHolder] = message.useMessage()

  const [configs, setConfigs] = useState<GameFaroConfigItem[]>([
    {
      id: 'faro-1',
      gameName: 'doraemon',
      updatedAt: '2024-09-01 10:00:00',
      faroUrl: 'https://faro.doraemon.g123.jp/collect?env=stg'
    },
    {
      id: 'faro-2',
      gameName: 'shinchan',
      updatedAt: '2024-09-02 11:30:00',
      faroUrl: 'https://faro.shinchan.g123.jp/collect?env=stg'
    },
    {
      id: 'faro-3',
      gameName: 'binan',
      updatedAt: '2024-09-03 12:00:00',
      faroUrl: 'https://faro.binan.g123.jp/collect?env=stg'
    },
    {
      id: 'faro-4',
      gameName: 'arifure',
      updatedAt: '2024-09-04 13:00:00',
      faroUrl: 'https://faro.arifure.g123.jp/collect?env=stg'
    },
    {
      id: 'faro-5',
      gameName: 'kumo',
      updatedAt: '2024-09-05 14:00:00',
      faroUrl: ''
    }
  ])

  const [searchKeyword, setSearchKeyword] = useState<string>('')

  const [editingConfig, setEditingConfig] = useState<GameFaroConfigItem | null>(null)
  const [editorOpen, setEditorOpen] = useState<boolean>(false)

  const [detailConfig, setDetailConfig] = useState<GameFaroConfigItem | null>(null)
  const [detailOpen, setDetailOpen] = useState<boolean>(false)

  // 列表搜索：按游戏名称模糊匹配
  const filteredConfigs = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return configs
    return configs.filter(item => item.gameName.toLowerCase().includes(keyword))
  }, [configs, searchKeyword])

  // 点击“编辑”按钮时，打开 URL 编辑弹窗
  const openEditor = (record: GameFaroConfigItem): void => {
    // 克隆一份，避免直接修改列表数据
    setEditingConfig({ ...record })
    setEditorOpen(true)
  }

  // 保存 URL 编辑结果
  const handleSaveUrl = (): void => {
    if (!editingConfig) return
    const url = editingConfig.faroUrl.trim()
    if (!url) {
      messageApi.error('请填写 faro URL')
      return
    }
    const now = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`
    setConfigs(prev =>
      prev.map(item =>
        item.id === editingConfig.id
          ? { ...item, faroUrl: url, updatedAt: ts }
          : item
      )
    )
    // 若详情抽屉当前展示同一条记录，也同步更新
    setDetailConfig(prev =>
      prev && prev.id === editingConfig.id ? { ...prev, faroUrl: url, updatedAt: ts } : prev
    )
    setEditorOpen(false)
    setEditingConfig(null)
    messageApi.success('faro 配置已保存（示例）')
  }

  const columns: TableColumnsType<GameFaroConfigItem> = [
    {
      title: '游戏名称',
      dataIndex: 'gameName',
      key: 'gameName',
      render: (_: string, record: GameFaroConfigItem) => (
        // 点击标题字段打开详情抽屉，符合“列表详情从标题进入”的规范
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => {
            setDetailConfig(record)
            setDetailOpen(true)
          }}
        >
          {record.gameName}
        </Button>
      )
    },
    {
      title: 'faro URL',
      dataIndex: 'faroUrl',
      key: 'faroUrl',
      render: (url: string) => {
        const value = url?.trim()
        return (
          <Text
            type="secondary"
            style={{ wordBreak: 'break-all' }}
          >
            {value || '--'}
          </Text>
        )
      }
    },
    {
      title: '最近更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 200
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: GameFaroConfigItem) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditor(record)}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ]

  return (
    <>
      {contextHolder}
      <Card>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              游戏配置 / faro
            </Title>
          </div>
          <Space>
            <Search
              allowClear
              placeholder="按游戏名称搜索"
              style={{ width: 260 }}
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onSearch={v => setSearchKeyword(v)}
            />
          </Space>
        </div>

        <Table<GameFaroConfigItem>
          rowKey={item => item.id}
          columns={columns}
          dataSource={filteredConfigs}
          pagination={{
            pageSize: 8,
            showSizeChanger: false
          }}
          scroll={{ x: true }}
        />

        {/* 编辑 URL 弹窗 */}
        <Modal
          title={editingConfig ? `编辑 faro URL` : '编辑 faro URL'}
          open={editorOpen}
          onCancel={() => {
            setEditorOpen(false)
            setEditingConfig(null)
          }}
          onOk={handleSaveUrl}
          okText="保存"
          cancelText="取消"
          width={520}
        >
          <Input
            value={editingConfig?.faroUrl ?? ''}
            placeholder="请输入 faro 上报 URL，例如：https://faro.xxx.g123.jp/collect?env=stg"
            onChange={e =>
              setEditingConfig(prev =>
                prev ? { ...prev, faroUrl: e.target.value } : prev
              )
            }
          />
        </Modal>

        {/* 详情抽屉：从“游戏名称”进入，查看 URL 并支持复制 */}
        <Drawer
          title={
            <Space>
              <FileTextOutlined />
              <span>faro 配置详情 - {detailConfig?.gameName}</span>
            </Space>
          }
          placement="right"
          width={720}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        >
          {detailConfig ? (
            <div>
              <div style={{ marginBottom: 8, color: '#999' }}>最近更新时间：{detailConfig.updatedAt}</div>
              <div
                style={{
                  position: 'relative',
                  borderRadius: 8,
                  background: '#0b1020',
                  color: '#e6f7ff',
                  padding: 12,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 12,
                  maxHeight: 260,
                  overflow: 'auto',
                  boxShadow: 'inset 0 0 0 1px rgba(211,220,229,0.35)'
                }}
              >
                <Button
                  size="small"
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(detailConfig.faroUrl)
                      messageApi.success('faro URL 已复制')
                    } catch {
                      messageApi.error('复制失败，请手动复制')
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    color: '#e6f7ff'
                  }}
                />
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {detailConfig.faroUrl || '（当前暂无 faro URL 配置）'}
                </pre>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (!detailConfig) return
                    openEditor(detailConfig)
                  }}
                >
                  编辑该配置
                </Button>
              </div>
            </div>
          ) : (
            <Text type="secondary">请选择一条配置查看详情</Text>
          )}
        </Drawer>
      </Card>
    </>
  )
}



