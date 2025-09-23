import React, { useMemo, useState } from 'react'
import { Tree, Table, Input, Drawer, Space, Button, Tooltip, Typography, message, Card, Select } from 'antd'
import type { DataNode } from 'antd/es/tree'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, CopyOutlined, FolderOpenOutlined, ClusterOutlined, DeploymentUnitOutlined } from '@ant-design/icons'
import { HistoryOutlined } from '@ant-design/icons'
import Link from 'next/link'

const { Search } = Input

export interface DeploymentItem {
  key: string
  name: string
  createdAt: string
  version: string
  namespace: string
  cluster: string
  yaml: string
}

// ---------------- Mock Data ----------------

export const mockDeployments: DeploymentItem[] = [
  {
    key: 'dep-1',
    name: 'web-frontend',
    createdAt: '2025-09-01 10:20:00',
    version: '1',
    namespace: 'default',
    cluster: 'k8s-io',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80`
  },
  {
    key: 'dep-1',
    name: 'web-frontend',
    createdAt: '2025-09-01 10:20:00',
    version: '2',
    namespace: 'default',
    cluster: 'k8s-io',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80`
  },
  {
    key: 'dep-1',
    name: 'web-frontend',
    createdAt: '2025-09-02 09:00:00',
    version: '3',
    namespace: 'default',
    cluster: 'k8s-io',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: default
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: web
          image: nginx:1.26
          ports:
            - containerPort: 80`
  },
  {
    key: 'dep-2',
    name: 'game-service',
    createdAt: '2025-09-10 08:05:00',
    version: '1',
    namespace: 'game',
    cluster: 'k8s-io',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-service
  namespace: game
spec:
  replicas: 2
  selector:
    matchLabels:
      app: game-service
  template:
    metadata:
      labels:
        app: game-service
    spec:
      containers:
        - name: game
          image: node:20-alpine
          ports:
            - containerPort: 3000`
  },
  {
    key: 'dep-2',
    name: 'game-service',
    createdAt: '2025-09-12 08:05:00',
    version: '2',
    namespace: 'game',
    cluster: 'k8s-io',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-service
  namespace: game
spec:
  replicas: 3
  selector:
    matchLabels:
      app: game-service
  template:
    metadata:
      labels:
        app: game-service
    spec:
      containers:
        - name: game
          image: node:20-alpine
          ports:
            - containerPort: 3000`
  },
  {
    key: 'dep-3',
    name: 'data-collector',
    createdAt: '2025-09-15 12:30:00',
    version: '1',
    namespace: 'ops',
    cluster: 'k8s-io',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-collector
  namespace: ops
spec:
  replicas: 1
  selector:
    matchLabels:
      app: data-collector
  template:
    metadata:
      labels:
        app: data-collector
    spec:
      containers:
        - name: collector
          image: busybox
          command: ["/bin/sh", "-c", "while true; do echo collecting; sleep 10; done"]`
  }
]

// -------------- Component --------------

export default function YamlViewer() {
  // 使用 mock 数据；后续可替换为后端接口
  const allItems = mockDeployments

  // 资源类型列表
  const resourceTypes: Array<{ label: string; key: string; isFolder?: boolean }> = [
    { label: 'ConfigMap', key: 'configMap' },
    { label: 'cronjob', key: 'cronjob' },
    { label: 'deployment', key: 'deployment' },
    { label: 'HorizontalPodAutoscaler', key: 'hpa' },
    { label: 'Ingress', key: 'ingress' },
    { label: 'IngressClass', key: 'ingressClass' },
    { label: 'job', key: 'job' },
    { label: 'MseIngressConfig', key: 'mseIngressConfig' },
    { label: 'Namespace', key: 'namespace' },
    { label: 'NetworkPolicy', key: 'networkPolicy' },
    { label: 'PersistentVolume', key: 'pv' },
    { label: 'PersistentVolumeClaim', key: 'pvc' },
    { label: 'service', key: 'service', isFolder: true }
  ]

  const treeData: DataNode[] = resourceTypes
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(rt => ({
      title: (
        <Space>
          {rt.isFolder ? <FolderOpenOutlined /> : <DeploymentUnitOutlined />}
          <span>{rt.label}</span>
        </Space>
      ),
      key: rt.key
    }))

  const [activeTreeKey, setActiveTreeKey] = useState<string>('deployment')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const [currentYaml, setCurrentYaml] = useState<string>('')
  const [currentTitle, setCurrentTitle] = useState<string>('')

  // 历史版本抽屉状态
  const [historyOpen, setHistoryOpen] = useState<boolean>(false)
  const [historyTitle, setHistoryTitle] = useState<string>('')
  const [historyList, setHistoryList] = useState<DeploymentItem[]>([])

  // 全量命名空间下拉选项
  const namespaceOptions = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach(i => set.add(i.namespace))
    return Array.from(set).map(ns => ({ label: ns, value: ns }))
  }, [])

  // 右侧表格数据：根据 Tree 选择与搜索进行过滤
  const filteredItems = useMemo(() => {
    // 仅当选择 deployment 分类时展示（示例逻辑，可扩展）
    const inScope = activeTreeKey === 'deployment' ? allItems : []
    const byName = (() => {
      const kw = searchKeyword.trim().toLowerCase()
      if (!kw) return inScope
      return inScope.filter(item => item.name.toLowerCase().includes(kw))
    })()
    const byNs = selectedNamespace
      ? byName.filter(item => item.namespace === selectedNamespace)
      : byName
    // 取最新版本：按 name 分组，取 version 最大或 createdAt 最新
    const latestMap = new Map<string, DeploymentItem>()
    byNs.forEach(item => {
      const existing = latestMap.get(item.name)
      if (!existing) {
        latestMap.set(item.name, item)
      } else {
        // 简单按 version 字符比较；若需改可用日期
        if (Number(item.version) > Number(existing.version)) {
          latestMap.set(item.name, item)
        }
      }
    })
    return Array.from(latestMap.values())
  }, [activeTreeKey, searchKeyword, selectedNamespace])

  const columns: ColumnsType<DeploymentItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 320
    },
    {
      title: 'appid',
      dataIndex: 'namespace',
      key: 'namespace',
      width: 160
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 160
    },
    {
      title: '更新时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 320
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看 YAML">
            <Button type="link" onClick={() => {
              setCurrentYaml(record.yaml)
              setCurrentTitle(record.name)
              setDrawerOpen(true)
            }}>查看yaml</Button>
          </Tooltip>
          <Tooltip title="历史版本">
            <Button type="link" onClick={() => {
              // 收集同名历史版本并打开历史抽屉
              const history = allItems.filter(i => i.name === record.name && i.version !== record.version)
              setHistoryList(history.sort((a,b)=> Number(b.version)-Number(a.version)))
              setHistoryTitle(record.name)
              setHistoryOpen(true)
            }}>历史版本</Button>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <Space align="start" size={16} style={{ width: '100%' }}>
      <Card style={{ width: 280, flexShrink: 0 }} bodyStyle={{ padding: 12 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Yaml列表</div>
        <Tree
          showIcon
          defaultExpandAll
          selectedKeys={[activeTreeKey]}
          treeData={treeData}
          onSelect={(keys) => {
            // 切换分类：更新 activeTreeKey，并重置搜索关键词（更贴近真实使用场景）
            if (keys.length > 0 && typeof keys[0] === 'string') {
              setActiveTreeKey(keys[0])
              setSearchKeyword('')
              setSelectedNamespace(undefined)
            }
          }}
        />
      </Card>

      <Card style={{ flex: 1, minWidth: 0 }} bodyStyle={{ padding: 12 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
          <Select
              allowClear
              placeholder="按appid筛选"
              style={{ minWidth: 180 }}
              options={namespaceOptions}
              value={selectedNamespace}
              onChange={(val) => setSelectedNamespace(val)}
            />
            <Search
              allowClear
              placeholder="按名称搜索 deployment"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={(v) => setSearchKeyword(v)}
              enterButton
            />
          </Space>
          <Table
            rowKey="key"
            columns={columns}
            dataSource={filteredItems}
            // 开启横向自适应，在列内容较多或容器变窄时可横向滚动
            scroll={{ x: true }}
            pagination={{
              pageSize: 5,
              showSizeChanger: false
            }}
          />
        </Space>
      </Card>

      <Drawer
        title={
          <Space>
            <DeploymentUnitOutlined />
            <span>YAML - {currentTitle}</span>
          </Space>
        }
        placement="right"
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          // 图标按钮：CopyOutlined 表示“复制全部 YAML”
          <Tooltip title="复制 YAML">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={async () => {
                // 一键复制：将 YAML 文本写入剪贴板，给出反馈
                try {
                  await navigator.clipboard.writeText(currentYaml)
                  message.success('已复制到剪贴板')
                } catch {
                  message.error('复制失败，请手动复制')
                }
              }}
            />
          </Tooltip>
        }
      >
        {/* 使用等宽字体与轻微动效增强可读性与质感 */}
        <Typography.Paragraph style={{
          background: 'rgba(197, 216, 235, 0.35)',
          color: '#2d3436',
          borderRadius: 8,
          padding: 16,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: 'inset 0 0 0 1px rgba(211, 220, 229, 0.55)',
          transition: 'box-shadow 0.25s ease',
        }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(197, 216, 235, 0.81)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(211, 220, 229, 0.66)')}
        >
{currentYaml}
        </Typography.Paragraph>
      </Drawer>

      {/* 历史版本 Drawer */}
      <Drawer
        title={<Space><HistoryOutlined /><span>{`历史版本 - ${historyTitle}`}</span></Space>}
        placement="right"
        width={560}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <Table
          rowKey="key"
          size="small"
          columns={[
            { title: '版本', dataIndex: 'version', key: 'version', width: 120 },
            { title: '更新时间', dataIndex: 'createdAt', key: 'createdAt', width: 200 },
            {
              title: '操作', key: 'op', width: 120, render: (_, r) => (
                <Button type="link" onClick={() => {
                  setCurrentYaml(r.yaml)
                  setCurrentTitle(`${r.name} v${r.version}`)
                  setDrawerOpen(true)
                }}>查看</Button>
              )
            }
          ]}
          dataSource={historyList}
          pagination={false}
        />
      </Drawer>
    </Space>
  )
}

