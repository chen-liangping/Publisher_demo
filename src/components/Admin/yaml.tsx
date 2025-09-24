import React, { useMemo, useState } from 'react'
import { Tree, Table, Input, Drawer, Space, Button, Tooltip, Typography, message, Card, Select, Modal, Checkbox, Tag } from 'antd'
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
    version: '3',
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
    version: '2',
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
    version: '4',
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
    version: '5',
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
  const [items, setItems] = useState<DeploymentItem[]>(mockDeployments)

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
  const [currentRecord, setCurrentRecord] = useState<DeploymentItem | null>(null)
  const [compareVersion, setCompareVersion] = useState<string | undefined>(undefined)
  const [compareYaml, setCompareYaml] = useState<string>('')
  // 编辑 YAML 抽屉
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editYaml, setEditYaml] = useState<string>('')
  const [editBase, setEditBase] = useState<DeploymentItem | null>(null)
  // 更新确认弹窗（受控）
  const [publishOpen, setPublishOpen] = useState<boolean>(false)
  const [publishChecked, setPublishChecked] = useState<boolean>(false)

  // 历史版本抽屉状态
  const [historyOpen, setHistoryOpen] = useState<boolean>(false)
  const [historyTitle, setHistoryTitle] = useState<string>('')
  const [historyList, setHistoryList] = useState<DeploymentItem[]>([])
  // 回滚确认弹窗（受控）
  const [rollbackOpen, setRollbackOpen] = useState<boolean>(false)
  const [rollbackTarget, setRollbackTarget] = useState<DeploymentItem | null>(null)
  const [rollbackChecked, setRollbackChecked] = useState<boolean>(false)
  // 每个服务当前“生效”的版本号（默认取最大版本）
  const computeMaxVersionMap = (list: DeploymentItem[]): Record<string, string> => {
    const map: Record<string, string> = {}
    list.forEach(i => {
      const cur = map[i.name]
      if (!cur || Number(i.version) > Number(cur)) map[i.name] = i.version
    })
    return map
  }
  const [currentVersionByName, setCurrentVersionByName] = useState<Record<string, string>>(
    () => computeMaxVersionMap(items)
  )

  // 全量命名空间下拉选项
  const namespaceOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => set.add(i.namespace))
    return Array.from(set).map(ns => ({ label: ns, value: ns }))
  }, [items])

  // 小工具：时间/版本与 Diff
  const formatNow = (): string => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  const nextVersionFor = (name: string): string => {
    const versions = items.filter(i => i.name === name).map(i => Number(i.version))
    const maxv = versions.length ? Math.max(...versions) : 0
    return String(maxv + 1)
  }
  const computeUnifiedDiff = (a: string, b: string): Array<{ type: 'same' | 'add' | 'del'; text: string }> => {
    const A = a.split('\n')
    const B = b.split('\n')
    const n = A.length, m = B.length
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    const out: Array<{ type: 'same' | 'add' | 'del'; text: string }> = []
    let i = 0, j = 0
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ type: 'same', text: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: A[i++] }) }
      else { out.push({ type: 'add', text: B[j++] }) }
    }
    while (i < n) out.push({ type: 'del', text: A[i++] })
    while (j < m) out.push({ type: 'add', text: B[j++] })
    return out
  }

  // 复制工具
  const copyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败，请手动复制')
    }
  }

  // 模拟应用到 K8s 集群（示例：真实实现需调用后端 API）
  const applyYamlToCluster = async (name: string, namespace: string, yaml: string): Promise<void> => {
    // 这里可替换为实际的 API 请求
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 侧边并排 Diff 行对齐：左=当前，右=对比
  const sideBySide = useMemo(() => {
    if (!compareYaml) return [] as Array<{ left?: { t: string; k: 'same' | 'add' | 'del' }, right?: { t: string; k: 'same' | 'add' | 'del' } }>
    const ops = computeUnifiedDiff(currentYaml, compareYaml)
    const rows: Array<{ left?: { t: string; k: 'same' | 'add' | 'del' }, right?: { t: string; k: 'same' | 'add' | 'del' } }> = []
    ops.forEach(o => {
      if (o.type === 'same') {
        rows.push({ left: { t: o.text, k: 'same' }, right: { t: o.text, k: 'same' } })
      } else if (o.type === 'del') {
        rows.push({ left: { t: o.text, k: 'del' }, right: undefined })
      } else {
        rows.push({ left: undefined, right: { t: o.text, k: 'add' } })
      }
    })
    return rows
  }, [currentYaml, compareYaml])

  // 当前服务所有版本选项
  const compareOptions = useMemo(() => {
    if (!currentRecord) return [] as { label: string; value: string }[]
    return items
      .filter(i => i.name === currentRecord.name)
      .sort((a,b)=> Number(b.version)-Number(a.version))
      .map(v => ({ label: `v${v.version}`, value: v.version }))
  }, [items, currentRecord])

  const initCompareFor = (record: DeploymentItem): void => {
    const versions = items
      .filter(i => i.name === record.name)
      .sort((a,b)=> Number(b.version)-Number(a.version))
    if (versions.length <= 1) {
      setCompareVersion(undefined)
      setCompareYaml('')
      return
    }
    const latest = versions[0]
    const candidate = latest.version === record.version ? versions[1] : latest
    setCompareVersion(candidate.version)
    setCompareYaml(candidate.yaml)
  }

  // 右侧表格数据：根据 Tree 选择与搜索进行过滤
  const filteredItems = useMemo(() => {
    // 仅当选择 deployment 分类时展示（示例逻辑，可扩展）
    const inScope = activeTreeKey === 'deployment' ? items : []
    const byName = (() => {
      const kw = searchKeyword.trim().toLowerCase()
      if (!kw) return inScope
      return inScope.filter(item => item.name.toLowerCase().includes(kw))
    })()
    const byNs = selectedNamespace
      ? byName.filter(item => item.namespace === selectedNamespace)
      : byName
    // 选择“当前生效版本”：若存在 currentVersionByName 指定则优先，否则取最大版本
    const selectedMap = new Map<string, DeploymentItem>()
    byNs.forEach(item => {
      const preferred = currentVersionByName[item.name]
      if (preferred) {
        if (item.version === preferred) selectedMap.set(item.name, item)
        else if (!selectedMap.get(item.name)) {
          // 先占位，后续若遇到指定版本会覆盖
          selectedMap.set(item.name, item)
        }
      } else {
        const existing = selectedMap.get(item.name)
        if (!existing || Number(item.version) > Number(existing.version)) {
          selectedMap.set(item.name, item)
        }
      }
    })
    return Array.from(selectedMap.values()).filter(i => i && currentVersionByName[i.name] ? i.version === currentVersionByName[i.name] : true)
  }, [activeTreeKey, searchKeyword, selectedNamespace, items, currentVersionByName])

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
      width: 160,
      render: (v: string, r) => (
        <Space>
          <span>v{v}</span>
          {currentVersionByName[r.name] === v && <Tag color="processing">当前生效</Tag>}
        </Space>
      )
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
      width: 300,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看 YAML">
            <Button type="link" onClick={() => {
              setCurrentYaml(record.yaml)
              setCurrentTitle(record.name)
              setCurrentRecord(record)
              initCompareFor(record)
              setDrawerOpen(true)
            }}>查看</Button>
          </Tooltip>
          {/* 移除单独“对比”弹窗入口，保留并排查看中的对比 */}
          <Tooltip title="编辑 YAML">
            <Button type="link" onClick={() => {
              setEditOpen(true)
              setEditTitle(`${record.name} v${record.version}`)
              setEditYaml(record.yaml)
              setEditBase(record)
            }}>编辑</Button>
          </Tooltip>
          <Tooltip title="历史版本">
            <Button type="link" onClick={() => {
              // 收集同名历史版本并打开历史抽屉
              const history = items.filter(i => i.name === record.name && i.version !== record.version)
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
      <Card style={{ width: 280, flexShrink: 0 }} styles={{ body: { padding: 12 } }}>
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

      <Card style={{ flex: 1, minWidth: 0 }} styles={{ body: { padding: 12 } }}>
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
            rowKey={(r) => `${r.key}-${r.version}`}
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
        width={980}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        // Drawer 级别复制按钮移除，改到右侧 YAML 卡片的右上角
      >
        {/* 顶部选择对比版本 */}
        <Space style={{ marginBottom: 12 }}>
          <span style={{ color: '#697b8c' }}>对比版本：</span>
          <Select
            style={{ minWidth: 160 }}
            placeholder="选择版本"
            value={compareVersion}
            options={compareOptions}
            onChange={(v) => {
              setCompareVersion(v)
              const found = items.find(i => i.name === currentRecord?.name && i.version === v)
              setCompareYaml(found?.yaml || '')
            }}
          />
        </Space>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* 左：当前版本 */}
          <div>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>当前版本 {currentRecord ? `v${currentRecord.version}` : ''}</div>
            <div style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              background: '#0b1020', color: '#e6f7ff', borderRadius: 8, padding: 12,
              maxHeight: 520, overflow: 'auto', boxShadow: 'inset 0 0 0 1px rgba(211,220,229,0.35)', position: 'relative'
            }}>
              <Tooltip title="复制左侧 YAML">
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyText(currentYaml)}
                  style={{ position: 'absolute', top: 6, right: 6, color: '#fff', background: 'transparent' }}
                />
              </Tooltip>
              {sideBySide.map((row, idx) => (
                <div key={idx} style={{
                  whiteSpace: 'pre-wrap',
                  background: row.left?.k === 'del' ? 'rgba(245,34,45,0.18)' : 'transparent',
                  color: row.left?.k === 'del' ? '#ffccc7' : '#e6f7ff'
                }}>
                  {(row.left?.k === 'del' ? '- ' : '  ') + (row.left?.t ?? '')}
                </div>
              ))}
            </div>
          </div>
          {/* 右：对比版本 */}
          <div>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>对比版本 {compareVersion ? `v${compareVersion}` : ''}</div>
            <div style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
              fontSize: 12,
              background: '#0b1020', color: '#e6f7ff', borderRadius: 8, padding: 12,
              maxHeight: 520, overflow: 'auto', boxShadow: 'inset 0 0 0 1px rgba(211,220,229,0.35)', position: 'relative'
            }}>
              <Tooltip title="复制右侧 YAML">
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyText(compareYaml)}
                  style={{ position: 'absolute', top: 6, right: 6, color: '#fff', background: 'transparent' }}
                />
              </Tooltip>
              {sideBySide.map((row, idx) => (
                <div key={idx} style={{
                  whiteSpace: 'pre-wrap',
                  background: row.right?.k === 'add' ? 'rgba(209, 228, 236, 0.37)' : 'transparent',
                  color: row.right?.k === 'add' ? '#b7eb8f' : '#e6f7ff'
                }}>
                  {(row.right?.k === 'add' ? '+ ' : '  ') + (row.right?.t ?? '')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {/* 历史版本 Drawer（样式与查看 Drawer 保持一致） */}
      <Drawer
        title={<Space><HistoryOutlined /><span>{`历史版本 - ${historyTitle}`}</span></Space>}
        placement="right"
        width={980}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <Table
          rowKey={(r) => `${r.key}-${r.version}`}
          size="small"
          columns={[
            { title: '版本', dataIndex: 'version', key: 'version', width: 160, render: (v: string, r: DeploymentItem) => (
              <Space>
                <span>v{v}</span>
                {currentVersionByName[r.name] === v && <Tag color="processing">当前生效</Tag>}
              </Space>
            ) },
            { title: '更新时间', dataIndex: 'createdAt', key: 'createdAt', width: 200 },
            {
              title: '操作', key: 'op', width: 220, render: (_, r) => (
                <Space>
                  <Button type="link" onClick={() => {
                    setHistoryOpen(false)
                    setCurrentYaml(r.yaml)
                    setCurrentTitle(`${r.name} v${r.version}`)
                    setCurrentRecord(r)
                    initCompareFor(r)
                    setDrawerOpen(true)
                  }}>查看</Button>
                  <Button type="link" onClick={() => {
                    setRollbackTarget(r)
                    setRollbackChecked(false)
                    setRollbackOpen(true)
                  }}>回滚</Button>
                </Space>
              )
            }
          ]}
          dataSource={historyList}
          pagination={false}
        />
      </Drawer>

      {/* 回滚确认 Modal（使用受控方式，避免被 Drawer 遮挡） */}
      <Modal
        open={rollbackOpen}
        onCancel={() => setRollbackOpen(false)}
        title={rollbackTarget ? `确认回滚至 v${rollbackTarget.version}？` : '确认回滚'}
        okText="确认回滚"
        cancelText="取消"
        centered
        maskClosable={false}
        zIndex={2000}
        onOk={() => {
          if (!rollbackTarget) return
          if (!rollbackChecked) { message.warning('请先勾选确认复选框'); return }
          const serviceName = rollbackTarget.name
          const toVersion = rollbackTarget.version
          setCurrentVersionByName(prev => ({ ...prev, [serviceName]: toVersion }))
          setRollbackOpen(false)
          message.success(`已将 ${serviceName} 回滚至 v${toVersion}`)
          // 回滚后：若查看抽屉处于打开状态且当前记录为此服务，则刷新默认对比目标为最新版本或上一个版本
          if (drawerOpen && currentRecord && currentRecord.name === serviceName) {
            const cur = items.find(i => i.name === serviceName && i.version === (currentRecord?.version || ''))
            if (cur) {
              initCompareFor(cur)
            }
          }
        }}
      >
        <div>
          <div>
            本次将把「{rollbackTarget?.name}」在「{rollbackTarget?.namespace}」环境的当前生效版本切换为 v{rollbackTarget?.version}。
          </div>
          <div style={{ marginTop: 8 }}>
            回滚会立即生效，可能引发短时不可用或功能回退，请确认业务已评估风险。
          </div>
          <div style={{ marginTop: 12 }}>
            <Checkbox checked={rollbackChecked} onChange={(e)=> setRollbackChecked(e.target.checked)}>
              我已评估影响并确认业务可回滚
            </Checkbox>
          </div>
        </div>
      </Modal>

      {/* 编辑 Drawer */}
      <Drawer
        title={<span>编辑 YAML - {editTitle}</span>}
        placement="right"
        width={720}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={() => { setPublishChecked(false); setPublishOpen(true) }}>更新</Button>
          </Space>
        }
      >
        <Input.TextArea
          value={editYaml}
          onChange={(e) => setEditYaml(e.target.value)}
          rows={22}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
          placeholder="在此编辑 YAML 内容..."
        />
      </Drawer>

      {/* 更新确认 Modal（发布并生效） */}
      <Modal
        open={publishOpen}
        onCancel={() => setPublishOpen(false)}
        title={editBase ? `确认更新至 v${nextVersionFor(editBase.name)}？` : '确认更新'}
        okText="确认更新"
        cancelText="取消"
        centered
        maskClosable={false}
        zIndex={2000}
        onOk={async () => {
          if (!editBase) { setPublishOpen(false); return }
          if (!publishChecked) { message.warning('请先勾选确认复选框'); return }
          const newItem: DeploymentItem = {
            ...editBase,
            yaml: editYaml,
            version: nextVersionFor(editBase.name),
            createdAt: formatNow()
          }
          // 写入新版本并切换生效版本
          setItems(prev => [newItem, ...prev])
          setCurrentVersionByName(prev => ({ ...prev, [newItem.name]: newItem.version }))
          await applyYamlToCluster(newItem.name, newItem.namespace, newItem.yaml)
          if (drawerOpen && currentRecord && currentRecord.name === newItem.name) {
            setCurrentRecord(newItem)
            setCurrentYaml(newItem.yaml)
            initCompareFor(newItem)
          }
          setEditOpen(false)
          setPublishOpen(false)
          message.success(`已更新至 v${newItem.version} 并应用到 K8s（示例）`)
        }}
      >
        <div>
          <div>
            将更新「{editBase?.name}」（{editBase?.namespace}），更新会立即生效，可能影响业务，请确认风险已评估。
          </div>
          <div style={{ marginTop: 12 }}>
            <Checkbox checked={publishChecked} onChange={(e)=> setPublishChecked(e.target.checked)}>我已评估影响并确认更新</Checkbox>
          </div>
        </div>
      </Modal>

      {/* 独立 Diff 弹窗已去除，保留在查看 Drawer 中的并排对比 */}
    </Space>
  )
}

