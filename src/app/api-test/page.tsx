'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  Typography,
  Space,
  Button,
  Input,
  Select,
  Tag,
  message
} from 'antd'

const { Title, Text } = Typography
const { TextArea } = Input

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface HeaderRow {
  id: string
  keyName: string
  value: string
}

interface ApiPreset {
  id: string
  name: string
  method: HttpMethod
  url: string
  bizTag: '礼包接口' | '道具接口'
}

const API_PRESETS: ApiPreset[] = [
  {
    id: 'biz-1',
    name: 'https://broadcast-api.stg.g123.jp/external/api/v1/cp/messages/push',
    method: 'POST',
    url: 'https://broadcast-api.stg.g123.jp/external/api/v1/cp/messages/push',
    bizTag: '礼包接口'
  },
  {
    id: 'biz-2',
    name: 'https://game-cloud.dev.g123.jp/internal/api/v1/translate/games/gamedemo/sync',
    method: 'POST',
    url: 'https://game-cloud.dev.g123.jp/internal/api/v1/translate/games/gamedemo/sync',
    bizTag: '道具接口'
  }
]

export default function ApiTestPage(): React.ReactElement {
  const router = useRouter()

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    API_PRESETS[0]?.id ?? 'biz-1'
  )

  const [method, setMethod] = useState<HttpMethod>(
    API_PRESETS[0]?.method ?? 'POST'
  )
  const [url, setUrl] = useState<string>(
    API_PRESETS[0]?.url ??
      'https://broadcast-api.stg.g123.jp/external/api/v1/cp/messages/push'
  )

  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: 'content-type', keyName: 'Content-Type', value: 'application/json' },
    { id: 'x-idempotency-key', keyName: 'x-idempotency-key', value: '{uuid}' },
    { id: 'authorization', keyName: 'Authorization', value: 'Basic ZZFtZXRlc3Q6dW5kZWZpbmVk' },
    { id: 'blank-1', keyName: '', value: '' }
  ])

  const [body, setBody] = useState<string>('{\n  "example": true\n}')
  const [loading, setLoading] = useState<boolean>(false)
  const [responseStatus, setResponseStatus] = useState<number | undefined>()
  const [responseBody, setResponseBody] = useState<string>('')

  // 发送请求的核心逻辑：根据选择的 method / url / headers / body 发送 fetch 请求
  const handleSendRequest = async (): Promise<void> => {
    if (!url) {
      message.warning('请输入请求 URL')
      return
    }

    setLoading(true)
    setResponseStatus(undefined)
    setResponseBody('')

    try {
      const headersObject: Record<string, string> = {}
      headers
        .filter((h) => h.keyName.trim() !== '')
        .forEach((h) => {
          headersObject[h.keyName] = h.value
        })

      const init: RequestInit = {
        method,
        headers: headersObject
      }

      if (method !== 'GET' && body.trim() !== '') {
        init.body = body
      }

      const res = await fetch(url, init)
      const text = await res.text()

      setResponseStatus(res.status)
      setResponseBody(text)
    } catch (error) {
      // 为了便于调试，把错误信息直接展示在响应区域
      setResponseStatus(0)
      setResponseBody(String(error))
    } finally {
      setLoading(false)
    }
  }

  // 更新某一行 Header
  const updateHeader = (id: string, patch: Partial<HeaderRow>): void => {
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch } : h))
    )
  }

  // 删除某一行 Header
  const removeHeader = (id: string): void => {
    setHeaders((prev) => prev.filter((h) => h.id !== id))
  }

  // 新增一个空白 Header 行
  const addHeader = (): void => {
    setHeaders((prev) => [
      ...prev,
      {
        id: `blank-${Date.now()}`,
        keyName: '',
        value: ''
      }
    ])
  }

  // 选择左侧的「业务」预设，自动填充 method 与 url，模拟 Postman 的历史/收藏行为
  const applyPreset = (preset: ApiPreset): void => {
    setSelectedPresetId(preset.id)
    setMethod(preset.method)
    setUrl(preset.url)
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ display: 'flex' }}>
        <Space
          align="center"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <Title level={3} style={{ margin: 0 }}>
            接口测试（Prototype）
          </Title>
          {/* 返回到上一页，方便在礼包道具配置与接口测试之间切换 */}
          <Button onClick={() => router.back()}>返回</Button>
        </Space>

        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start'
          }}
        >
          {/* 左侧：业务历史 / 收藏列表，模拟 Postman 的 Collection 区域 */}
          <Card
            size="small"
            style={{ width: 360, borderRadius: 16 }}
            bodyStyle={{ padding: 12 }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>业务</Text>
              {API_PRESETS.map((preset) => {
                const isActive = preset.id === selectedPresetId
                return (
                  <Button
                    key={preset.id}
                    type={isActive ? 'primary' : 'text'}
                    block
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left'
                    }}
                    onClick={() => applyPreset(preset)}
                  >
                    <Space size={8}>
                      <Tag
                        color={preset.method === 'GET' ? 'green' : 'blue'}
                        style={{
                          borderRadius: 999,
                          border: 'none',
                          padding: '0 8px',
                          lineHeight: '20px',
                          height: 22
                        }}
                      >
                        {preset.method}
                      </Tag>
                      <Tag
                        color={preset.bizTag === '礼包接口' ? 'magenta' : 'purple'}
                        style={{
                          borderRadius: 999,
                          border: 'none',
                          padding: '0 8px',
                          lineHeight: '20px',
                          height: 22
                        }}
                      >
                        {preset.bizTag}
                      </Tag>
                      <span>{preset.name}</span>
                    </Space>
                  </Button>
                )
              })}
            </Space>
          </Card>

          {/* 右侧：请求配置 + Body + Response 三个卡片区域 */}
          <Space
            direction="vertical"
            size={16}
            style={{ flex: 1, minWidth: 0 }}
          >
            {/* 卡片一：请求行 + Headers，模拟 Postman 顶部区域与 Headers 标签页 */}
            <Card style={{ borderRadius: 16 }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Space size={12} style={{ width: '100%' }}>
                  <Select<HttpMethod>
                    value={method}
                    style={{ width: 120 }}
                    onChange={(value) => setMethod(value)}
                    options={[
                      { value: 'GET', label: 'GET' },
                      { value: 'POST', label: 'POST' },
                      { value: 'PUT', label: 'PUT' },
                      { value: 'DELETE', label: 'DELETE' }
                    ]}
                  />
                  <Input
                    placeholder="请求 URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    // URL 输入框尽量占满剩余空间，方便完整展示长地址
                    style={{ flex: 1, minWidth: 460 }}
                  />
                  {/* 触发真实请求，验证接口配置是否正确 */}
                  <Button
                    type="primary"
                    onClick={handleSendRequest}
                    loading={loading}
                  >
                    发起调用
                  </Button>
                </Space>

                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary">Headers</Text>
                  {headers.map((header, index) => (
                    <Space
                      key={header.id}
                      style={{ display: 'flex', width: '100%' }}
                      size={12}
                    >
                      <Input
                        placeholder="Key"
                        value={header.keyName}
                        onChange={(e) =>
                          updateHeader(header.id, {
                            keyName: e.target.value
                          })
                        }
                        // Key 字段稍窄一些，主要用于短文本
                        style={{ flex: '0 0 260px' }}
                      />
                      <Input
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) =>
                          updateHeader(header.id, { value: e.target.value })
                        }
                        // Value 区域尽量占满剩余宽度，方便展示长 token 等
                        style={{ flex: 1, minWidth: 460 }}
                      />
                      <Button
                        type="link"
                        danger
                        // 只允许删除中间已填写的行，预留最后一行空白方便继续输入
                        disabled={
                          headers.length <= 1 || index >= headers.length - 1
                        }
                        onClick={() => removeHeader(header.id)}
                      >
                        删除
                      </Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={addHeader}>
                    新增一行
                  </Button>
                </Space>
              </Space>
            </Card>

            {/* 卡片二：Body 输入区域，对应 Postman 的 Body 标签页 */}
            <Card style={{ borderRadius: 16 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text type="secondary">Body</Text>
                <TextArea
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="请求体（JSON 或其他格式）"
                />
              </Space>
            </Card>

            {/* 卡片三：Response 展示区域，对应 Postman 的 Response 区域 */}
            <Card style={{ borderRadius: 16 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text type="secondary">Response</Text>
                <Text type="secondary">
                  {responseStatus === undefined
                    ? '尚未发起请求'
                    : `响应状态码：${responseStatus}`}
                </Text>
                <TextArea
                  rows={12}
                  value={responseBody}
                  readOnly
                  placeholder="响应内容将在这里展示"
                />
              </Space>
            </Card>
          </Space>
        </div>
      </Space>
    </div>
  )
}


