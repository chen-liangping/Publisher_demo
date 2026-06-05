'use client'

import React, { useState } from 'react'
import { Button, Typography, Descriptions, message, Space, Divider } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

// 模拟 YAML 数据
const mockYAML = `rules:
  - apiGroups: [""]
    resources:
      - pods
      - services
      - endpoints
    verbs:
      - get
      - list
      - watch
  - apiGroups: ["apps"]
    resources:
      - deployments
      - statefulsets
    verbs:
      - get
      - list
  - apiGroups: [""]
    resources:
      - configmaps
    verbs:
      - get
      - list
`

interface SADetailPageProps {
  appId: string
  onBack: () => void
}

export default function SADetailPage({ appId, onBack }: SADetailPageProps): React.ReactElement {
  const [yaml, setYaml] = useState(mockYAML)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const serviceAccount = `publisher-${appId}-sa`

  const handleSave = () => {
    setLoading(true)
    // 模拟保存
    setTimeout(() => {
      setLoading(false)
      setIsEditing(false)
      message.success('权限配置已保存并同步到 Kubernetes')
    }, 1000)
  }

  const handleReset = () => {
    setYaml(mockYAML)
    message.info('已重置为上次保存的配置')
  }

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回列表
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {appId} - SA 权限配置
          </Title>
        </Space>
        {!isEditing ? (
          <Button type="primary" onClick={() => setIsEditing(true)}>
            编辑权限
          </Button>
        ) : (
          <Space>
            <Button onClick={handleReset}>取消</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSave}
            >
              保存
            </Button>
          </Space>
        )}
      </div>

      {/* 基本信息 */}
      <div style={{ marginBottom: 16, background: '#fafafa', padding: 16, borderRadius: 8 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="App ID">{appId}</Descriptions.Item>
          <Descriptions.Item label="ServiceAccount">
            <Text code>{serviceAccount}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="最后修改时间">2026-06-03 14:20:00</Descriptions.Item>
          <Descriptions.Item label="修改人" span={3}>
            a@example.com
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* YAML 编辑区 */}
      <div>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>RBAC 权限配置（YAML）</Text>
          {isEditing && (
            <Text type="secondary">
              修改后点击保存，权限将即时生效，无需重启 Pod
            </Text>
          )}
        </div>
        <div
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            overflow: 'hidden',
            background: isEditing ? '#fff' : '#fafafa'
          }}
        >
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            disabled={!isEditing}
            style={{
              width: '100%',
              minHeight: 400,
              padding: 16,
              border: 'none',
              borderRadius: 6,
              fontFamily: 'Monaco, "Menlo", "Ubuntu Mono", monospace',
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
              background: isEditing ? '#fff' : '#fafafa',
              color: isEditing ? '#000' : '#666'
            }}
          />
        </div>
      </div>

      {/* 说明信息 */}
      <Divider />
      <div style={{ marginTop: 16 }}>
        <Paragraph type="secondary">
          <Text strong>说明：</Text>
        </Paragraph>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
          <li>权限变更通过 Role 动态控制，无需重新部署或重启 Pod</li>
          <li>保存后由 RBAC Controller 自动同步到 Kubernetes 集群</li>
          <li>rules 数组：支持多个 apiGroups/resources/verbs 组合</li>
          <li>常用 verbs：get, list, watch, create, update, patch, delete</li>
        </ul>
      </div>
    </div>
  )
}
