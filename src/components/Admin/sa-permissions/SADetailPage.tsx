'use client'

import React, { useState } from 'react'
import { Button, Typography, Descriptions, message, Space, Divider, Select, Modal, Tag } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

type SyncStatus = 'synced' | 'syncing' | 'failed' | 'unsynced' | 'orphan'

// 同步状态 Tag 渲染（详情页 inline 展示）
const renderSyncTag = (status: SyncStatus, env: string, onRetry: () => void) => {
  const config: Record<SyncStatus, { color: string; label: string }> = {
    synced: { color: 'success', label: '已同步' },
    syncing: { color: 'processing', label: '同步中' },
    failed: { color: 'error', label: '同步失败' },
    unsynced: { color: 'default', label: '无配置' },
    orphan: { color: 'warning', label: '错误资源' }
  }
  const { color, label } = config[status]

  return (
    <Space size={6}>
      <Tag color={color}>{label}</Tag>
      {status === 'failed' && (
        <Button type="text" size="small" icon={<ReloadOutlined />} onClick={onRetry} style={{ padding: '0 4px' }}>
          重试
        </Button>
      )}
    </Space>
  )
}

// YAML 模板定义
const yamlTemplates: Record<string, { label: string; yaml: string }> = {
  'pod-read': {
    label: 'Pod 只读',
    yaml: `rules:
  - apiGroups: [""]
    resources:
      - pods
    verbs:
      - get
      - list
      - watch
      - logs`
  },
  'pod-rs-read': {
    label: 'Pod+RS 只读',
    yaml: `rules:
  - apiGroups: [""]
    resources:
      - pods
    verbs:
      - get
      - list
      - watch
      - logs
  - apiGroups: ["apps"]
    resources:
      - replicasets
    verbs:
      - get
      - list
      - watch`
  },
  'pod-deploy-rw': {
    label: 'Pod+Deploy 读写',
    yaml: `rules:
  - apiGroups: [""]
    resources:
      - pods
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
  - apiGroups: ["apps"]
    resources:
      - deployments
      - replicasets
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete`
  },
  'pod-exec': {
    label: 'Pod+Exec',
    yaml: `rules:
  - apiGroups: [""]
    resources:
      - pods
      - pods/log
    verbs:
      - get
      - list
      - watch
  - apiGroups: [""]
    resources:
      - pods/exec
    verbs:
      - create`
  }
}

// 模拟详情数据
const mockAppData: Record<string, {
  stgSyncStatus: SyncStatus
  prodSyncStatus: SyncStatus
  updatedAt: string
  updatedBy: string
}> = {
  dragon: { stgSyncStatus: 'synced', prodSyncStatus: 'synced', updatedAt: '2026-06-03 14:20:00', updatedBy: 'chen.lp@ctw.inc' },
  hotd: { stgSyncStatus: 'synced', prodSyncStatus: 'synced', updatedAt: '2026-06-02 10:15:00', updatedBy: 'lin.y@ctw.inc' },
  doraemon: { stgSyncStatus: 'failed', prodSyncStatus: 'synced', updatedAt: '2026-06-01 09:30:00', updatedBy: 'yu.t@ctw.inc' },
  kakegurui: { stgSyncStatus: 'failed', prodSyncStatus: 'synced', updatedAt: '2026-05-28 16:45:00', updatedBy: 'wu.yuni@ctw.inc' },
  shinchan: { stgSyncStatus: 'synced', prodSyncStatus: 'syncing', updatedAt: '2026-05-20 11:30:00', updatedBy: 'chen.lp@ctw.inc' },
  kabaneri: { stgSyncStatus: 'orphan', prodSyncStatus: 'unsynced', updatedAt: '-', updatedBy: '-' }
}

const defaultYAML = `rules:
  - apiGroups: [""]
    resources:
      - pods
    verbs:
      - get
      - list
      - watch`

interface SADetailPageProps {
  appId: string
  onBack: () => void
}

export default function SADetailPage({ appId, onBack }: SADetailPageProps): React.ReactElement {
  const appInfo = mockAppData[appId] ?? { stgSyncStatus: 'unsynced' as SyncStatus, prodSyncStatus: 'unsynced' as SyncStatus, updatedAt: '-', updatedBy: '-' }
  const roleName = `publisher-${appId}-role`

  const [yaml, setYaml] = useState(defaultYAML)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none')

  // 弹窗状态：用 useState 控制显隐，替代 Modal.confirm 静态方法（静态方法在 App Router 下可能不显示）
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey)
    if (templateKey !== 'none' && yamlTemplates[templateKey]) {
      setYaml(yamlTemplates[templateKey].yaml)
    }
  }

  // 保存权限配置
  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setIsEditing(false)
      setSelectedTemplate('none')
      message.success(`${appId} 权限配置已保存，正在同步到 STG 和 PROD 集群`)
    }, 1000)
  }

  // 删除权限：清除 YAML 配置和 Role/RoleBinding
  const handleDelete = () => {
    setYaml(`rules: []`)
    setDeleteModalOpen(false)
    message.success(`${appId} 权限配置已删除，K8s Role/RoleBinding 将被清理`)
  }

  const handleCancel = () => {
    setYaml(defaultYAML)
    setSelectedTemplate('none')
    setIsEditing(false)
  }

  const handleRetry = (env: string) => {
    message.loading({ content: `${appId} ${env} 正在重试同步...`, key: `${appId}-${env}` })
    setTimeout(() => {
      message.success({ content: `${appId} ${env} 同步重试成功`, key: `${appId}-${env}` })
    }, 2000)
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
            {appId} - 权限配置
          </Title>
        </Space>
        {!isEditing ? (
          <Space>
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteModalOpen(true)}>
              删除权限
            </Button>
            <Button type="primary" onClick={() => setIsEditing(true)}>
              编辑权限
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => setSaveModalOpen(true)}>
              保存
            </Button>
          </Space>
        )}
      </div>

      {/* 基本信息 */}
      <div style={{ marginBottom: 16, background: '#fafafa', padding: 16, borderRadius: 8 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="App ID">{appId}</Descriptions.Item>
          <Descriptions.Item label="Role 名称">
            <Text code>{roleName}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="RoleBinding">
            <Text code>{roleName}</Text> → <Text code>SA default</Text>
          </Descriptions.Item>
          <Descriptions.Item label="STG 同步状态">
            {renderSyncTag(appInfo.stgSyncStatus, 'STG', () => handleRetry('STG'))}
          </Descriptions.Item>
          <Descriptions.Item label="PROD 同步状态">
            {renderSyncTag(appInfo.prodSyncStatus, 'PROD', () => handleRetry('PROD'))}
          </Descriptions.Item>
          <Descriptions.Item label="最后修改时间">{appInfo.updatedAt}</Descriptions.Item>
          <Descriptions.Item label="修改人" span={3}>{appInfo.updatedBy}</Descriptions.Item>
        </Descriptions>
      </div>

      {/* YAML 编辑区 */}
      <div>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>RBAC 权限配置（YAML）</Text>
          {isEditing && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              修改后点击保存，权限将即时生效，无需重启 Pod
            </Text>
          )}
        </div>

        {isEditing && (
          <div style={{ marginBottom: 12 }}>
            <Space align="center" size={8}>
              <Text style={{ fontSize: 13 }}>快速填入模板：</Text>
              <Select
                value={selectedTemplate}
                onChange={handleTemplateChange}
                style={{ width: 200 }}
                options={[
                  { value: 'none', label: '自定义' },
                  ...Object.entries(yamlTemplates).map(([key, tpl]) => ({
                    value: key,
                    label: tpl.label
                  }))
                ]}
              />
            </Space>
          </div>
        )}

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
            onChange={(e) => {
              setYaml(e.target.value)
              if (selectedTemplate !== 'none') {
                setSelectedTemplate('none')
              }
            }}
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

      <Divider />
      <div style={{ marginTop: 16 }}>
        <Paragraph type="secondary">
          <Text strong>说明：</Text>
        </Paragraph>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
          <li>权限变更通过 Role 动态控制，无需重新部署或重启 Pod</li>
          <li>保存后由 RBAC Controller 自动同步到 STG 和 PROD 集群</li>
          <li>删除权限只清除 YAML 配置和 K8s 中的 Role/RoleBinding，SA default 不受影响</li>
          <li>Role 名称格式：{roleName}，RoleBinding 绑定到 SA default</li>
          <li>rules 数组：支持多个 apiGroups/resources/verbs 组合</li>
        </ul>
      </div>

      {/* 删除确认弹窗：用 useState 控制显隐 */}
      <Modal
        title="确认删除权限配置"
        open={deleteModalOpen}
        onOk={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        okText="确认删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        destroyOnClose
      >
        <p>将删除 {appId} 的权限配置（YAML）以及 K8s 中的 Role 和 RoleBinding。</p>
        <p><Text type="secondary">SA default 不受影响，Pod 正常运行但无 K8s API 权限。</Text></p>
      </Modal>

      {/* 保存确认弹窗：用 useState 控制显隐 */}
      <Modal
        title="确认保存权限配置"
        open={saveModalOpen}
        onOk={() => {
          setSaveModalOpen(false)
          handleSave()
        }}
        onCancel={() => setSaveModalOpen(false)}
        okText="确认保存"
        cancelText="取消"
        confirmLoading={loading}
        destroyOnClose
      >
        <p>即将保存 {appId} 的权限配置，变更将同步到 STG 和 PROD 集群。</p>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Role 名称：{roleName} → SA default
        </Text>
      </Modal>
    </div>
  )
}
