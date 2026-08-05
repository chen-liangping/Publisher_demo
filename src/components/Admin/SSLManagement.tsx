'use client'

import React, { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Input,
  List,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AmazonOutlined,
  ArrowLeftOutlined,
  CloseCircleOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SearchOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Dragger } = Upload

type CloudProvider = 'aliyun' | 'aws'
type ValidityStatus = 'valid' | 'expiring' | 'expired'
type OverallStatus = 'consistent' | 'partial' | 'updating' | 'idle'
type PlacementStatus = 'synced' | 'outdated' | 'permission_denied' | 'failed'
type ResourceStatus = 'synced' | 'pending' | 'failed'
type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'
type ResourceType = 'SLB' | 'ALB' | 'NLB' | 'CDN' | 'GA' | 'MSE' | 'ELB' | 'CloudFront' | 'API Gateway'

interface CloudPlacement {
  id: string
  provider: CloudProvider
  accountId: string
  accountName: string
  region: string
  cloudCertificateId: string
  boundDomains: string[]
  deployedVersion?: string
  expiryDate?: string
  resourceCount: number
  status: PlacementStatus
  error?: string
}

interface ResourceInstance {
  id: string
  name: string
  provider: CloudProvider
  accountId: string
  accountName: string
  region: string
  resourceType: ResourceType
  placementId: string
  deployedVersion?: string
  targetVersion: string
  deployedTime?: string
  status: ResourceStatus
  error?: string
}

interface Certificate {
  id: string
  domain: string
  currentVersion: string
  validFrom: string
  expiryDate: string
  issuer: string
  sans: string[]
  serialNumber: string
  signatureAlgorithm: string
  keyAlgorithm: string
  keySize: number
  fingerprint: string
  overallStatus: OverallStatus
  lastScanTime?: string
  placements: CloudPlacement[]
  resources: ResourceInstance[]
}

interface UploadData {
  pemFile: File | null
  chainFile: File | null
  keyFile: File | null
  candidate?: { version: string; validFrom: string; expiryDate: string; issuer: string; serialNumber: string; fingerprint: string }
}

interface PlacementTask extends CloudPlacement {
  taskStatus: TaskStatus
}

interface SyncPlan {
  title: string
  placementIds: string[]
  resourceIds: string[]
}

type ResourceDrawerScope = { mode: 'placement'; placementId: string } | { mode: 'abnormal' }

const providerConfig: Record<CloudProvider, { label: string; color: string; icon: React.ReactElement }> = {
  aliyun: { label: '阿里云', color: 'orange', icon: <CloudOutlined /> },
  aws: { label: 'AWS', color: 'gold', icon: <AmazonOutlined /> }
}

const placementStatusConfig: Record<PlacementStatus, { text: string; color: string }> = {
  synced: { text: '已同步', color: 'success' },
  outdated: { text: '未同步', color: 'warning' },
  permission_denied: { text: '权限不足', color: 'error' },
  failed: { text: '同步失败', color: 'error' }
}

const resourceStatusConfig: Record<ResourceStatus, { text: string; color: string }> = {
  synced: { text: '已更新', color: 'success' },
  pending: { text: '未更新', color: 'warning' },
  failed: { text: '更新失败', color: 'error' }
}

const formatNow = () => new Date().toLocaleString('zh-CN', { hour12: false })
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))
const getNextVersion = (version: string) => `cert-v${Number(version.match(/cert-v(\d+)/)?.[1] || 0) + 1}`

const getNextExpiryDate = () => {
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 1)
  return expiry.toISOString().slice(0, 10)
}

const getDaysRemaining = (expiryDate: string) => Math.ceil((new Date(`${expiryDate}T23:59:59`).getTime() - Date.now()) / 86400000)

const getValidityStatus = (expiryDate: string): ValidityStatus => {
  const days = getDaysRemaining(expiryDate)
  if (days < 0) return 'expired'
  if (days < 30) return 'expiring'
  return 'valid'
}

const primaryBoundDomains = ['*.g123.jp', 'g123.jp', 'api.g123.jp', 'admin.g123.jp', 'static.g123.jp']

const primaryPlacements: CloudPlacement[] = [
  { id: 'ali-cn-prod', provider: 'aliyun', accountId: 'ali-10001', accountName: 'prod-cn', region: 'cn-hangzhou', cloudCertificateId: 'cas-cn-8f3a', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v2', expiryDate: '2026-08-20', resourceCount: 20, status: 'synced' },
  { id: 'ali-sg-prod', provider: 'aliyun', accountId: 'ali-10002', accountName: 'prod-sg', region: 'ap-southeast-1', cloudCertificateId: 'cas-sg-72bc', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v2', expiryDate: '2026-08-20', resourceCount: 16, status: 'synced' },
  { id: 'ali-jp-edge', provider: 'aliyun', accountId: 'ali-10003', accountName: 'edge-global', region: 'ap-northeast-1', cloudCertificateId: 'cas-jp-61de', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v2', expiryDate: '2026-08-20', resourceCount: 18, status: 'synced' },
  { id: 'ali-global', provider: 'aliyun', accountId: 'ali-10003', accountName: 'edge-global', region: 'global', cloudCertificateId: 'cas-global-a821', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v2', expiryDate: '2026-08-20', resourceCount: 12, status: 'synced' },
  { id: 'aws-jp-prod', provider: 'aws', accountId: '123456789012', accountName: 'game-prod', region: 'ap-northeast-1', cloudCertificateId: 'arn:aws:acm:ap-northeast-1:1234:certificate/4b8f', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v2', expiryDate: '2026-08-20', resourceCount: 18, status: 'synced' },
  { id: 'aws-us-cloudfront', provider: 'aws', accountId: '123456789012', accountName: 'game-prod', region: 'us-east-1', cloudCertificateId: 'arn:aws:acm:us-east-1:1234:certificate/19ce', boundDomains: ['*.g123.jp', 'g123.jp', 'api.g123.jp'], deployedVersion: 'cert-v1', expiryDate: '2026-06-30', resourceCount: 14, status: 'outdated' },
  { id: 'aws-sg-test', provider: 'aws', accountId: '210987654321', accountName: 'game-test', region: 'ap-southeast-1', cloudCertificateId: 'arn:aws:acm:ap-southeast-1:2109:certificate/78ad', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v2', expiryDate: '2026-08-20', resourceCount: 16, status: 'synced' },
  { id: 'aws-eu-ops', provider: 'aws', accountId: '345678901234', accountName: 'game-ops', region: 'eu-central-1', cloudCertificateId: 'arn:aws:acm:eu-central-1:3456:certificate/f391', boundDomains: primaryBoundDomains, deployedVersion: 'cert-v1', expiryDate: '2026-06-30', resourceCount: 14, status: 'permission_denied', error: 'AssumeRole 权限不足' }
]

const apiCertificatePlacements: CloudPlacement[] = [
  ...primaryPlacements.slice(0, 3).map((placement, index) => ({ ...placement, id: `api-${placement.id}`, boundDomains: ['*.api.g123.jp', 'api.g123.jp'], resourceCount: 4 + index, deployedVersion: 'cert-v3', expiryDate: '2026-12-15', status: 'synced' as PlacementStatus }))
]

const aliyunResourceTypes: ResourceType[] = ['SLB', 'ALB', 'NLB', 'CDN', 'GA', 'MSE']
const awsResourceTypes: ResourceType[] = ['ELB', 'CloudFront', 'API Gateway']

function buildResources(placements: CloudPlacement[], targetVersion: string): ResourceInstance[] {
  return placements.flatMap(placement => {
    const types = placement.provider === 'aliyun' ? aliyunResourceTypes : awsResourceTypes
    return Array.from({ length: placement.resourceCount }, (_, index) => {
      const isOutdated = placement.status !== 'synced'
      const isFailure = ['permission_denied', 'failed'].includes(placement.status) && index === 0
      const status: ResourceStatus = isFailure ? 'failed' : isOutdated ? 'pending' : 'synced'
      const resourceType = types[index % types.length]
      return {
        id: `${placement.id}-${String(index + 1).padStart(3, '0')}`,
        name: `${placement.accountName}-${resourceType.toLowerCase()}-${String(index + 1).padStart(2, '0')}`,
        provider: placement.provider,
        accountId: placement.accountId,
        accountName: placement.accountName,
        region: placement.region,
        resourceType,
        placementId: placement.id,
        deployedVersion: status === 'synced' ? targetVersion : 'cert-v1',
        targetVersion,
        deployedTime: status === 'synced' ? '2026-07-31 10:30:00' : undefined,
        status,
        error: isFailure ? '当前账号缺少资源更新权限' : undefined
      }
    })
  })
}

const mockCertificates: Certificate[] = [
  {
    id: 'cert-001', domain: '*.g123.jp', currentVersion: 'cert-v2', validFrom: '2025-08-20', expiryDate: '2026-08-20', issuer: 'Sectigo', sans: ['*.g123.jp', 'g123.jp', 'api.g123.jp', 'admin.g123.jp', 'static.g123.jp'], serialNumber: '03:A7:91:2C:84:DE:11', signatureAlgorithm: 'SHA256-RSA', keyAlgorithm: 'RSA', keySize: 2048, fingerprint: 'SHA256:9D:41:82:AF', overallStatus: 'partial', lastScanTime: '2026-08-03 10:30:00',
    placements: primaryPlacements,
    resources: buildResources(primaryPlacements, 'cert-v2')
  },
  {
    id: 'cert-002', domain: '*.api.g123.jp', currentVersion: 'cert-v3', validFrom: '2025-12-15', expiryDate: '2026-12-15', issuer: 'DigiCert', sans: ['*.api.g123.jp', 'api.g123.jp'], serialNumber: '08:4E:B2:76:10:9A:F3', signatureAlgorithm: 'SHA256-RSA', keyAlgorithm: 'RSA', keySize: 2048, fingerprint: 'SHA256:7A:14:E8:62', overallStatus: 'consistent', lastScanTime: '2026-08-02 15:20:00',
    placements: apiCertificatePlacements,
    resources: []
  }
]
mockCertificates[1].resources = buildResources(mockCertificates[1].placements, 'cert-v3')

function ProviderTag({ provider }: { provider: CloudProvider }) {
  const config = providerConfig[provider]
  return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>
}

function ValidityTag({ expiryDate }: { expiryDate: string }) {
  const config = {
    valid: { color: 'success', text: '生效中' },
    expiring: { color: 'warning', text: '即将到期' },
    expired: { color: 'error', text: '已过期' }
  } as const
  const item = config[getValidityStatus(expiryDate)]
  return <Tag color={item.color}>{item.text}</Tag>
}

function OverallTag({ status }: { status: OverallStatus }) {
  const config: Record<OverallStatus, { color: string; text: string }> = {
    consistent: { color: 'success', text: '全部已同步' },
    partial: { color: 'warning', text: '部分未同步' },
    updating: { color: 'processing', text: '更新中' },
    idle: { color: 'default', text: '待扫描' }
  }
  return <Tag color={config[status].color}>{config[status].text}</Tag>
}

export default function SSLManagement() {
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates)
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null)
  const selectedCert = useMemo(() => certificates.find(item => item.id === selectedCertId) || null, [certificates, selectedCertId])

  const [importVisible, setImportVisible] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set())

  const [scanning, setScanning] = useState(false)
  const [resourceKeyword, setResourceKeyword] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType | undefined>()
  const [resourceStatus, setResourceStatus] = useState<ResourceStatus | undefined>()
  const [placementProvider, setPlacementProvider] = useState<CloudProvider | undefined>()
  const [placementStatus, setPlacementStatus] = useState<PlacementStatus | undefined>()
  const [resourceDrawerScope, setResourceDrawerScope] = useState<ResourceDrawerScope | null>(null)
  const [showAllSans, setShowAllSans] = useState(false)
  const [syncPlan, setSyncPlan] = useState<SyncPlan | null>(null)
  const [syncingRepair, setSyncingRepair] = useState(false)

  const [updateVisible, setUpdateVisible] = useState(false)
  const [updateStep, setUpdateStep] = useState(0)
  const [validating, setValidating] = useState(false)
  const [uploadData, setUploadData] = useState<UploadData>({ pemFile: null, chainFile: null, keyFile: null })
  const [placementTasks, setPlacementTasks] = useState<PlacementTask[]>([])
  const [resourceCompleted, setResourceCompleted] = useState(0)
  const [resourceTotal, setResourceTotal] = useState(0)

  const updateCertificate = (id: string, updater: (certificate: Certificate) => Certificate) => {
    setCertificates(previous => previous.map(certificate => certificate.id === id ? updater(certificate) : certificate))
  }

  const cloudSummary = (certificate: Certificate) => {
    const providers = new Set(certificate.placements.map(item => item.provider)).size
    const accounts = new Set(certificate.placements.map(item => `${item.provider}-${item.accountId}`)).size
    const regions = new Set(certificate.placements.map(item => `${item.provider}-${item.region}`)).size
    return { providers, accounts, regions }
  }

  const openImport = async () => {
    setImportVisible(true)
    setImportLoading(true)
    setSelectedImportIds(new Set())
    await wait(600)
    setImportLoading(false)
  }

  const importCandidates = [
    { id: 'candidate-new', domain: '*.new-example.com', fingerprint: 'SHA256:62:81:0A:CC', providers: '阿里云 + AWS', accounts: 4, regions: 6, resources: 46, expiryDate: '2026-11-20' },
    { id: 'candidate-test', domain: '*.test.example.com', fingerprint: 'SHA256:19:72:D4:31', providers: 'AWS', accounts: 2, regions: 3, resources: 18, expiryDate: '2026-10-12' }
  ]

  const toggleImport = (id: string) => {
    setSelectedImportIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmImport = () => {
    if (!selectedImportIds.size) return
    message.success(`已接入 ${selectedImportIds.size} 个证书更新组`)
    setImportVisible(false)
  }

  const refreshAssets = async () => {
    if (!selectedCert) return
    setScanning(true)
    await wait(1200)
    updateCertificate(selectedCert.id, certificate => ({ ...certificate, lastScanTime: formatNow() }))
    setScanning(false)
    message.success(`资产刷新完成，共发现 ${selectedCert.placements.length} 个证书落点和 ${selectedCert.resources.length} 个关联资源`)
  }

  const openResourceDrawer = (scope: ResourceDrawerScope) => {
    setResourceKeyword('')
    setResourceType(undefined)
    setResourceStatus(undefined)
    setResourceDrawerScope(scope)
  }

  const openPlacementSync = (placement: CloudPlacement) => {
    if (!selectedCert) return
    const resourceIds = selectedCert.resources.filter(resource => resource.placementId === placement.id && resource.status !== 'synced').map(resource => resource.id)
    setSyncPlan({
      title: placement.status === 'synced' ? '同步关联资源' : '同步证书并更新资源',
      placementIds: placement.status === 'synced' ? [] : [placement.id],
      resourceIds
    })
  }

  const openResourceSync = (resource: ResourceInstance) => {
    if (!selectedCert) return
    const placement = selectedCert.placements.find(item => item.id === resource.placementId)
    if (!placement) return
    if (placement.status === 'permission_denied') {
      message.warning(placement.error || '当前云账号权限不足，请修复权限后重试')
      return
    }
    setSyncPlan({
      title: placement.status === 'synced' ? '同步资源' : '同步证书并更新资源',
      placementIds: placement.status === 'synced' ? [] : [placement.id],
      resourceIds: [resource.id]
    })
  }

  const openBatchSync = () => {
    if (!selectedCert) return
    const placements = selectedCert.placements.filter(placement => placement.status !== 'permission_denied')
    const placementIds = placements.filter(placement => placement.status !== 'synced').map(placement => placement.id)
    const placementIdSet = new Set(placements.map(placement => placement.id))
    const resourceIds = selectedCert.resources.filter(resource => placementIdSet.has(resource.placementId) && resource.status !== 'synced').map(resource => resource.id)
    setSyncPlan({ title: '同步全部异常项', placementIds, resourceIds })
  }

  const runRepairSync = async () => {
    if (!selectedCert || !syncPlan) return
    setSyncingRepair(true)
    await wait(1200)
    const placementIdSet = new Set(syncPlan.placementIds)
    const resourceIdSet = new Set(syncPlan.resourceIds)
    const timestamp = formatNow()
    updateCertificate(selectedCert.id, certificate => {
      const placements = certificate.placements.map(placement => {
        if (!placementIdSet.has(placement.id)) return placement
        return { ...placement, boundDomains: certificate.sans, deployedVersion: certificate.currentVersion, expiryDate: certificate.expiryDate, status: 'synced' as PlacementStatus, error: undefined }
      })
      const resources = certificate.resources.map(resource => resourceIdSet.has(resource.id)
        ? { ...resource, deployedVersion: certificate.currentVersion, targetVersion: certificate.currentVersion, deployedTime: timestamp, status: 'synced' as ResourceStatus, error: undefined }
        : resource)
      const hasAbnormal = placements.some(placement => placement.status !== 'synced') || resources.some(resource => resource.status !== 'synced')
      return { ...certificate, placements, resources, overallStatus: hasAbnormal ? 'partial' : 'consistent' }
    })
    setSyncingRepair(false)
    setSyncPlan(null)
    message.success('同步完成，已更新云端证书和资源引用')
  }

  const openUpdate = (certificate: Certificate) => {
    setSelectedCertId(certificate.id)
    setUpdateStep(0)
    setUploadData({ pemFile: null, chainFile: null, keyFile: null })
    setPlacementTasks([])
    setResourceCompleted(0)
    setResourceTotal(certificate.resources.length)
    setUpdateVisible(true)
  }

  const validateCertificate = async () => {
    if (!selectedCert || !uploadData.pemFile || !uploadData.keyFile) {
      message.warning('请上传证书 PEM 和私钥 KEY')
      return
    }
    setValidating(true)
    await wait(800)
    setUploadData(previous => ({
      ...previous,
      candidate: { version: getNextVersion(selectedCert.currentVersion), validFrom: new Date().toISOString().slice(0, 10), expiryDate: getNextExpiryDate(), issuer: 'Sectigo（Mock 解析）', serialNumber: '0A:92:ED:72:91:4B:37', fingerprint: 'SHA256:ED:72:91:4B' }
    }))
    setPlacementTasks(selectedCert.placements.map(placement => ({ ...placement, taskStatus: 'pending' })))
    setValidating(false)
    setUpdateStep(1)
  }

  const runUpdate = async () => {
    if (!selectedCert || !uploadData.candidate) return
    setUpdateStep(2)
    updateCertificate(selectedCert.id, certificate => ({ ...certificate, overallStatus: 'updating' }))
    let tasks = selectedCert.placements.map(placement => ({ ...placement, taskStatus: 'pending' as TaskStatus }))
    setPlacementTasks(tasks)

    for (let index = 0; index < tasks.length; index++) {
      tasks = tasks.map((task, taskIndex) => taskIndex === index ? { ...task, taskStatus: 'running' } : task)
      setPlacementTasks(tasks)
      await wait(280)
      const shouldFail = tasks[index].status === 'permission_denied'
      tasks = tasks.map((task, taskIndex) => taskIndex === index ? { ...task, taskStatus: shouldFail ? 'failed' : 'success', error: shouldFail ? 'AssumeRole 权限不足' : undefined } : task)
      setPlacementTasks(tasks)
    }

    const failedPlacementIds = new Set(tasks.filter(task => task.taskStatus === 'failed').map(task => task.id))
    let completed = 0
    for (const resource of selectedCert.resources) {
      if (!failedPlacementIds.has(resource.placementId)) completed++
      if (completed % 8 === 0 || completed === selectedCert.resources.length - failedPlacementIds.size) {
        setResourceCompleted(completed)
        await wait(30)
      }
    }

    const timestamp = formatNow()
    const candidate = uploadData.candidate
    updateCertificate(selectedCert.id, certificate => ({
      ...certificate,
      currentVersion: candidate.version,
      validFrom: candidate.validFrom,
      expiryDate: candidate.expiryDate,
      issuer: candidate.issuer,
      serialNumber: candidate.serialNumber,
      fingerprint: candidate.fingerprint,
      overallStatus: failedPlacementIds.size ? 'partial' : 'consistent',
      placements: certificate.placements.map(placement => failedPlacementIds.has(placement.id) ? placement : { ...placement, boundDomains: certificate.sans, deployedVersion: candidate.version, expiryDate: candidate.expiryDate, status: 'synced', error: undefined }),
      resources: certificate.resources.map(resource => failedPlacementIds.has(resource.placementId) ? { ...resource, targetVersion: candidate.version, status: 'pending' } : { ...resource, targetVersion: candidate.version, deployedVersion: candidate.version, deployedTime: timestamp, status: 'synced', error: undefined })
    }))
    setResourceCompleted(selectedCert.resources.filter(resource => !failedPlacementIds.has(resource.placementId)).length)
    setUpdateStep(3)
  }

  const retryFailedTargets = async () => {
    if (!selectedCert || !uploadData.candidate) return
    setUpdateStep(2)
    let tasks = placementTasks.map(task => task.taskStatus === 'failed' ? { ...task, taskStatus: 'running' as TaskStatus, error: undefined } : task)
    setPlacementTasks(tasks)
    await wait(800)
    tasks = tasks.map(task => ({ ...task, taskStatus: 'success' as TaskStatus, error: undefined }))
    setPlacementTasks(tasks)
    const timestamp = formatNow()
    updateCertificate(selectedCert.id, certificate => ({
      ...certificate,
      overallStatus: 'consistent',
      placements: certificate.placements.map(placement => ({ ...placement, boundDomains: certificate.sans, deployedVersion: uploadData.candidate!.version, expiryDate: uploadData.candidate!.expiryDate, status: 'synced', error: undefined })),
      resources: certificate.resources.map(resource => ({ ...resource, targetVersion: uploadData.candidate!.version, deployedVersion: uploadData.candidate!.version, deployedTime: timestamp, status: 'synced', error: undefined }))
    }))
    setResourceCompleted(selectedCert.resources.length)
    setUpdateStep(3)
    message.success('失败目标已全部更新')
  }

  const listColumns: ColumnsType<Certificate> = [
    { title: '域名', dataIndex: 'domain', render: value => <Space><SafetyOutlined style={{ color: '#1677ff' }} /><Text strong>{value}</Text></Space> },
    { title: '平台版本', dataIndex: 'currentVersion', render: value => <Tag color="blue">{value}</Tag> },
    { title: '到期时间', dataIndex: 'expiryDate', render: value => <Space direction="vertical" size={0}><Text>{value}</Text><Text type={getDaysRemaining(value) < 30 ? 'warning' : 'secondary'}>{getDaysRemaining(value) < 0 ? `已过期 ${Math.abs(getDaysRemaining(value))} 天` : `剩余 ${getDaysRemaining(value)} 天`}</Text></Space> },
    {
      title: '云端覆盖', render: (_, record) => {
        const summary = cloudSummary(record)
        return <Tooltip title={`阿里云 ${record.placements.filter(item => item.provider === 'aliyun').length} 个落点；AWS ${record.placements.filter(item => item.provider === 'aws').length} 个落点`}><Space direction="vertical" size={0}><Text>{summary.providers} 云 / {summary.accounts} 账号</Text><Text type="secondary">{summary.regions} 个区域</Text></Space></Tooltip>
      }
    },
    { title: '关联资源', render: (_, record) => { const abnormal = record.resources.filter(item => item.status !== 'synced').length; return <Space direction="vertical" size={0}><Text>{record.resources.length} 个</Text>{abnormal > 0 && <Text type="danger">{abnormal} 个异常</Text>}</Space> } },
    { title: '证书状态', dataIndex: 'expiryDate', render: value => <ValidityTag expiryDate={value} /> },
    { title: '更新状态', dataIndex: 'overallStatus', render: value => <OverallTag status={value} /> },
    { title: '操作', width: 250, render: (_, record) => <Space size={4}><Button type="link" size="small" onClick={() => message.info(`将从 SSL 平台获取 ${record.domain} 的新证书`)}>获取新证书</Button><Button type="link" size="small" onClick={() => openUpdate(record)}>更新证书</Button><Button type="link" size="small" onClick={() => setSelectedCertId(record.id)}>详情</Button></Space> }
  ]

  const placementColumns: ColumnsType<CloudPlacement> = [
    { title: '云厂商', dataIndex: 'provider', render: value => <ProviderTag provider={value} /> },
    { title: '账号', render: (_, record) => <Space direction="vertical" size={0}><Text>{record.accountName}</Text><Text type="secondary" style={{ fontSize: 12 }}>{record.accountId}</Text></Space> },
    { title: '区域 / 范围', dataIndex: 'region', render: value => <Tag>{value}</Tag> },
    { title: '云证书 ID', dataIndex: 'cloudCertificateId', ellipsis: true, width: 240, render: value => <Tooltip title={value}><Text code>{value}</Text></Tooltip> },
    {
      title: '证书覆盖域名', dataIndex: 'boundDomains', width: 230, render: (domains: string[]) => {
        return <Tooltip title={<div>{domains.map(domain => <div key={domain}>{domain}</div>)}</div>}>
          <Space wrap size={[4, 4]}>
            {domains.slice(0, 2).map(domain => <Tag key={domain}>{domain}</Tag>)}
            {domains.length > 2 && <Tag>+{domains.length - 2}</Tag>}
          </Space>
        </Tooltip>
      }
    },
    { title: '到期时间', dataIndex: 'expiryDate', render: value => value || '-' },
    {
      title: '关联资源', dataIndex: 'resourceCount', render: (value, record) => {
        const abnormal = selectedCert?.resources.filter(resource => resource.placementId === record.id && resource.status !== 'synced').length || 0
        return <Space direction="vertical" size={0}><Button type="link" size="small" style={{ padding: 0 }} onClick={() => openResourceDrawer({ mode: 'placement', placementId: record.id })}>{value} 个资源</Button>{abnormal > 0 && <Text type="danger">{abnormal} 个未更新</Text>}</Space>
      }
    },
    { title: '云证书状态', dataIndex: 'status', render: (value: PlacementStatus, record) => <Tooltip title={record.error}><Tag color={placementStatusConfig[value].color}>{placementStatusConfig[value].text}</Tag></Tooltip> },
    {
      title: '操作', width: 190, render: (_, record) => {
        const abnormalResources = selectedCert?.resources.some(resource => resource.placementId === record.id && resource.status !== 'synced')
        return <Space size={4}>
          <Button type="link" size="small" onClick={() => openResourceDrawer({ mode: 'placement', placementId: record.id })}>查看资源</Button>
          {record.status === 'permission_denied'
            ? <Button type="link" size="small" onClick={() => message.warning(record.error || '当前云账号权限不足')}>查看原因</Button>
            : (record.status !== 'synced' || abnormalResources) && <Button type="link" size="small" onClick={() => openPlacementSync(record)}>同步</Button>}
        </Space>
      }
    }
  ]

  const resourceColumns: ColumnsType<ResourceInstance> = [
    { title: '类型', dataIndex: 'resourceType', width: 110, render: value => <Text strong>{value}</Text> },
    { title: '实例名称 / ID', render: (_, record) => <Space direction="vertical" size={0}><Text>{record.name}</Text><Text type="secondary" style={{ fontSize: 12 }}>{record.id}</Text></Space> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: ResourceStatus, record) => <Tooltip title={record.error}><Tag color={resourceStatusConfig[value].color}>{resourceStatusConfig[value].text}</Tag></Tooltip> },
    { title: '操作', width: 90, render: (_, record) => record.status === 'synced' ? '-' : <Button type="link" size="small" onClick={() => openResourceSync(record)}>同步</Button> }
  ]

  const filteredPlacements = selectedCert?.placements.filter(item => {
    return (!placementProvider || item.provider === placementProvider)
      && (!placementStatus || item.status === placementStatus)
  }) || []

  const renderImportModal = () => <Modal title="接入现有证书" open={importVisible} width={760} onCancel={() => setImportVisible(false)} onOk={confirmImport} okText="确认接入" okButtonProps={{ disabled: !selectedImportIds.size }}>
    <Alert type="info" showIcon message="从已授权的阿里云和 AWS 账号中发现相同证书" description="接入只同步证书、账号、区域及关联资源信息，不读取云端私钥。" style={{ marginBottom: 16 }} />
    {importLoading ? <div style={{ textAlign: 'center', padding: 48 }}><LoadingOutlined style={{ fontSize: 32, color: '#1677ff' }} /><div style={{ marginTop: 12 }}>正在扫描云账号...</div></div> : <List dataSource={importCandidates} renderItem={item => {
      const selected = selectedImportIds.has(item.id)
      return <List.Item onClick={() => toggleImport(item.id)} style={{ border: `1px solid ${selected ? '#1677ff' : '#f0f0f0'}`, background: selected ? '#f0f7ff' : '#fff', padding: 16, borderRadius: 8, marginBottom: 10, cursor: 'pointer' }}>
        <List.Item.Meta avatar={<Checkbox checked={selected} onClick={event => event.stopPropagation()} onChange={() => toggleImport(item.id)} />} title={<Space><Text strong>{item.domain}</Text><ValidityTag expiryDate={item.expiryDate} /></Space>} description={<Space split={<Divider type="vertical" />}><Text>{item.providers}</Text><Text>{item.accounts} 个账号</Text><Text>{item.regions} 个区域</Text><Text>{item.resources} 个资源</Text><Text type="secondary">{item.fingerprint}</Text></Space>} />
      </List.Item>
    }} />}
  </Modal>

  const renderSyncModal = () => {
    if (!selectedCert || !syncPlan) return null
    const directPlacementIds = new Set(syncPlan.placementIds)
    const resourceIdSet = new Set(syncPlan.resourceIds)
    const affectedPlacementIds = new Set(syncPlan.placementIds)
    selectedCert.resources.filter(resource => resourceIdSet.has(resource.id)).forEach(resource => affectedPlacementIds.add(resource.placementId))
    const affectedPlacements = selectedCert.placements.filter(placement => affectedPlacementIds.has(placement.id))

    return <Modal
      title={syncPlan.title}
      open
      width={760}
      confirmLoading={syncingRepair}
      closable={!syncingRepair}
      maskClosable={!syncingRepair}
      okText="确认同步"
      cancelText="取消"
      onOk={runRepairSync}
      onCancel={() => setSyncPlan(null)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="使用当前平台证书修复同步状态"
          description="本操作不会产生新的平台版本，只会把扫描到的云端证书和关联资源更新到当前证书。"
        />
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="平台版本"><Tag color="blue">{selectedCert.currentVersion}</Tag></Descriptions.Item>
          <Descriptions.Item label="证书落点">{affectedPlacements.length} 个</Descriptions.Item>
          <Descriptions.Item label="关联资源">{syncPlan.resourceIds.length} 个</Descriptions.Item>
        </Descriptions>
        <Table<CloudPlacement>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={affectedPlacements}
          columns={[
            { title: '云厂商', dataIndex: 'provider', render: value => <ProviderTag provider={value} /> },
            { title: '账号', dataIndex: 'accountName' },
            { title: '区域', dataIndex: 'region', render: value => <Tag>{value}</Tag> },
            { title: '当前状态', dataIndex: 'status', render: value => <Tag color={placementStatusConfig[value as PlacementStatus].color}>{placementStatusConfig[value as PlacementStatus].text}</Tag> },
            {
              title: '本次处理', render: (_, placement) => {
                const resourceCount = selectedCert.resources.filter(resource => resource.placementId === placement.id && resourceIdSet.has(resource.id)).length
                const certificateAction = directPlacementIds.has(placement.id) ? '同步云证书' : null
                return <Space direction="vertical" size={0}>{certificateAction && <Text>{certificateAction}</Text>}<Text type="secondary">更新 {resourceCount} 个资源</Text></Space>
              }
            }
          ]}
        />
      </Space>
    </Modal>
  }

  const renderResourceDrawer = () => {
    if (!selectedCert || !resourceDrawerScope) return null
    const placement = resourceDrawerScope.mode === 'placement'
      ? selectedCert.placements.find(item => item.id === resourceDrawerScope.placementId)
      : null
    const scopeResources = resourceDrawerScope.mode === 'abnormal'
      ? selectedCert.resources.filter(resource => resource.status !== 'synced')
      : selectedCert.resources.filter(resource => resource.placementId === resourceDrawerScope.placementId)
    const keyword = resourceKeyword.trim().toLowerCase()
    const filteredResources = scopeResources.filter(resource => (!keyword || resource.name.toLowerCase().includes(keyword) || resource.id.toLowerCase().includes(keyword))
      && (!resourceType || resource.resourceType === resourceType)
      && (!resourceStatus || resource.status === resourceStatus))
      .sort((left, right) => Number(left.status === 'synced') - Number(right.status === 'synced'))
    const abnormalCount = scopeResources.filter(resource => resource.status !== 'synced').length
    const drawerColumns: ColumnsType<ResourceInstance> = resourceDrawerScope.mode === 'abnormal'
      ? [
          { title: '云厂商', dataIndex: 'provider', width: 100, render: value => <ProviderTag provider={value} /> },
          { title: '账号 / 区域', width: 190, render: (_, resource) => <Space direction="vertical" size={0}><Text>{resource.accountName}</Text><Text type="secondary" style={{ fontSize: 12 }}>{resource.region}</Text></Space> },
          ...resourceColumns
        ]
      : resourceColumns

    return <Drawer
      title={resourceDrawerScope.mode === 'abnormal' ? `未更新资源 · ${abnormalCount} 个` : `关联资源 · ${placement?.accountName || '-'}`}
      open
      width="72%"
      destroyOnHidden
      onClose={() => setResourceDrawerScope(null)}
      extra={resourceDrawerScope.mode === 'abnormal'
        ? <Button type="primary" disabled={!abnormalCount} onClick={() => openBatchSync()}>同步全部异常项</Button>
        : <Button type="primary" disabled={!placement || placement.status === 'permission_denied' || !abnormalCount} onClick={() => placement && openPlacementSync(placement)}>同步当前落点</Button>}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {placement ? <Descriptions bordered size="small" column={4}>
          <Descriptions.Item label="云厂商"><ProviderTag provider={placement.provider} /></Descriptions.Item>
          <Descriptions.Item label="账号">{placement.accountName}</Descriptions.Item>
          <Descriptions.Item label="区域"><Tag>{placement.region}</Tag></Descriptions.Item>
          <Descriptions.Item label="云证书状态"><Tag color={placementStatusConfig[placement.status].color}>{placementStatusConfig[placement.status].text}</Tag></Descriptions.Item>
          <Descriptions.Item label="云证书 ID" span={4}><Text code copyable={{ text: placement.cloudCertificateId }}>{placement.cloudCertificateId}</Text></Descriptions.Item>
        </Descriptions> : <Alert type="warning" showIcon message="跨落点未更新资源" description="这里汇总所有实际扫描到但尚未使用当前证书的资源，账号权限异常的资源不会进入批量同步。" />}
        <Space wrap>
          <Input allowClear prefix={<SearchOutlined />} placeholder="资源名称或 ID" style={{ width: 240 }} value={resourceKeyword} onChange={event => setResourceKeyword(event.target.value)} />
          <Select allowClear placeholder="资源类型" style={{ width: 160 }} value={resourceType} onChange={setResourceType} options={[...new Set(scopeResources.map(item => item.resourceType))].map(value => ({ value, label: value }))} />
          <Select allowClear placeholder="资源状态" style={{ width: 150 }} value={resourceStatus} onChange={setResourceStatus} options={Object.entries(resourceStatusConfig).map(([value, item]) => ({ value, label: item.text }))} />
          <Text type="secondary">共 {scopeResources.length} 个，{abnormalCount} 个未更新</Text>
        </Space>
        <Table
          columns={drawerColumns}
          dataSource={filteredResources}
          rowKey="id"
          size="small"
          pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: total => `共 ${total} 个资源` }}
        />
      </Space>
    </Drawer>
  }

  const renderUpdateModal = () => {
    if (!selectedCert) return null
    const completedPlacements = placementTasks.filter(item => ['success', 'failed'].includes(item.taskStatus)).length
    const failedTasks = placementTasks.filter(item => item.taskStatus === 'failed')
    const candidate = uploadData.candidate
    return <Modal title={`更新证书 · ${selectedCert.domain}`} open={updateVisible} width={860} footer={null} closable={updateStep !== 2} onCancel={() => setUpdateVisible(false)}>
      <Steps current={updateStep} items={[{ title: '上传并校验' }, { title: '更新前检查' }, { title: '执行更新' }, { title: '完成' }]} style={{ marginBottom: 28 }} />
      {updateStep === 0 && <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={8}><Text strong>证书 PEM</Text><Dragger accept=".pem,.crt,.cer" showUploadList={false} beforeUpload={file => { setUploadData(previous => ({ ...previous, pemFile: file })); return false }} style={{ marginTop: 8 }}><p className="ant-upload-drag-icon"><CloudUploadOutlined /></p><p>{uploadData.pemFile?.name || '上传证书'}</p></Dragger></Col>
          <Col span={8}><Text strong>证书链（可选）</Text><Dragger accept=".pem,.crt,.cer" showUploadList={false} beforeUpload={file => { setUploadData(previous => ({ ...previous, chainFile: file })); return false }} style={{ marginTop: 8 }}><p className="ant-upload-drag-icon"><CloudUploadOutlined /></p><p>{uploadData.chainFile?.name || '上传证书链'}</p></Dragger></Col>
          <Col span={8}><Text strong>私钥 KEY</Text><Dragger accept=".key,.pem" showUploadList={false} beforeUpload={file => { setUploadData(previous => ({ ...previous, keyFile: file })); return false }} style={{ marginTop: 8 }}><p className="ant-upload-drag-icon"><SafetyOutlined /></p><p>{uploadData.keyFile?.name || '上传私钥'}</p></Dragger></Col>
        </Row>
        <Alert type="info" showIcon message="私钥由平台加密托管" description="私钥使用 KMS 加密，仅用于后续多云证书分发；控制台不提供查看或下载，可在证书停用时主动清除。" />
        <Button type="primary" block loading={validating} onClick={validateCertificate}>上传并校验</Button>
      </Space>}
      {updateStep === 1 && candidate && <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert type="success" showIcon message="证书校验通过" description="域名匹配、证书与私钥匹配、证书链有效。" />
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="版本">{selectedCert.currentVersion} → <Tag color="blue">{candidate.version}</Tag></Descriptions.Item>
          <Descriptions.Item label="到期时间">{selectedCert.expiryDate} → {candidate.expiryDate}</Descriptions.Item>
          <Descriptions.Item label="目标范围">{cloudSummary(selectedCert).accounts} 账号 / {selectedCert.placements.length} 落点</Descriptions.Item>
        </Descriptions>
        <Table<PlacementTask>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={placementTasks}
          columns={[
            { title: '云厂商', dataIndex: 'provider', render: value => <ProviderTag provider={value} /> },
            { title: '账号', dataIndex: 'accountName' },
            { title: '区域 / 范围', dataIndex: 'region' },
            { title: '处理方式', render: () => '同步当前证书并更新资源' },
            { title: '资源数', dataIndex: 'resourceCount' },
            { title: '预检查', render: (_, record) => record.status === 'permission_denied' ? <Tooltip title={record.error}><Tag color="error">权限不足</Tag></Tooltip> : <Tag color="success">通过</Tag> }
          ]}
          expandable={{
            rowExpandable: placement => placement.resourceCount > 0,
            expandedRowRender: placement => <div style={{ paddingLeft: 36 }}>
              <Text type="secondary">此证书落点将更新以下资源：</Text>
              <Table<ResourceInstance>
                rowKey="id"
                size="small"
                style={{ marginTop: 8 }}
                dataSource={selectedCert.resources.filter(resource => resource.placementId === placement.id)}
                pagination={{ pageSize: 5, showSizeChanger: false, showTotal: total => `共 ${total} 个资源` }}
                columns={[
                  { title: '类型', dataIndex: 'resourceType' },
                  { title: '实例名称 / ID', render: (_, resource) => <Space direction="vertical" size={0}><Text>{resource.name}</Text><Text type="secondary" style={{ fontSize: 12 }}>{resource.id}</Text></Space> },
                  { title: '当前版本', dataIndex: 'deployedVersion', render: value => value ? <Tag color="blue">{value}</Tag> : '-' },
                  { title: '更新后版本', render: () => <Tag>{candidate.version}</Tag> }
                ]}
              />
            </div>
          }}
        />
        {placementTasks.some(item => item.status === 'permission_denied') && <Alert type="warning" showIcon message="存在异常落点" description="本次将继续更新其他目标，异常账号保留旧证书，可修复权限后单独重试。" />}
        <Button type="primary" block size="large" onClick={runUpdate}>确认并开始更新</Button>
      </Space>}
      {updateStep === 2 && <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div><Space style={{ marginBottom: 8 }}><Text strong>阶段 1：分发云端证书</Text><Text type="secondary">{completedPlacements}/{placementTasks.length}</Text></Space><Progress percent={placementTasks.length ? Math.round(completedPlacements / placementTasks.length * 100) : 0} status="active" /></div>
        <div><Space style={{ marginBottom: 8 }}><Text strong>阶段 2：更新关联资源</Text><Text type="secondary">{resourceCompleted}/{resourceTotal}</Text></Space><Progress percent={resourceTotal ? Math.round(resourceCompleted / resourceTotal * 100) : 0} status="active" /></div>
        <Divider>当前任务</Divider>
        <List dataSource={placementTasks.filter(item => item.taskStatus !== 'success')} renderItem={item => <List.Item><List.Item.Meta avatar={item.taskStatus === 'running' ? <LoadingOutlined style={{ color: '#1677ff' }} /> : item.taskStatus === 'failed' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> : <span style={{ display: 'inline-block', width: 14 }} />} title={<Space><ProviderTag provider={item.provider} /><Text>{item.accountName}</Text><Tag>{item.region}</Tag></Space>} description={item.error || (item.taskStatus === 'running' ? '正在上传证书并更新资源引用' : '等待执行')} /></List.Item>} />
      </Space>}
      {updateStep === 3 && <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert type={failedTasks.length ? 'warning' : 'success'} showIcon message={failedTasks.length ? '证书更新部分完成' : '证书更新完成'} description={`云端证书：${placementTasks.length - failedTasks.length}/${placementTasks.length} 成功；关联资源：${resourceCompleted}/${resourceTotal} 成功。`} />
        {failedTasks.length > 0 && <><Divider>需要处理的目标</Divider><List dataSource={failedTasks} renderItem={item => <List.Item><List.Item.Meta avatar={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} title={<Space><ProviderTag provider={item.provider} /><Text>{item.accountName}</Text><Tag>{item.region}</Tag></Space>} description={item.error} /></List.Item>} /><Button type="primary" block icon={<ReloadOutlined />} onClick={retryFailedTargets}>重试失败目标</Button></>}
        <Button type={failedTasks.length ? 'default' : 'primary'} block onClick={() => setUpdateVisible(false)}>关闭</Button>
      </Space>}
    </Modal>
  }

  if (selectedCert) {
    const summary = cloudSummary(selectedCert)
    const abnormalResources = selectedCert.resources.filter(item => item.status !== 'synced').length
    const hasRepairableAbnormality = selectedCert.placements.some(placement => placement.status !== 'synced' && placement.status !== 'permission_denied')
      || selectedCert.resources.some(resource => resource.status !== 'synced' && selectedCert.placements.find(placement => placement.id === resource.placementId)?.status !== 'permission_denied')

    return <>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <Space align="center"><Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedCertId(null)}>返回列表</Button><Title level={4} style={{ margin: 0 }}>{selectedCert.domain}</Title><ValidityTag expiryDate={selectedCert.expiryDate} /><OverallTag status={selectedCert.overallStatus} /></Space>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => openUpdate(selectedCert)}>更新证书</Button>
        </div>
        <Card title="证书信息" size="small" style={{ marginBottom: 20 }}>
          <Descriptions column={4} size="small">
            <Descriptions.Item label="平台版本"><Tag color="blue">{selectedCert.currentVersion}</Tag></Descriptions.Item>
            <Descriptions.Item label="签发机构">{selectedCert.issuer}</Descriptions.Item>
            <Descriptions.Item label="签名算法">{selectedCert.signatureAlgorithm}</Descriptions.Item>
            <Descriptions.Item label="密钥">{selectedCert.keyAlgorithm} {selectedCert.keySize}</Descriptions.Item>
            <Descriptions.Item label="生效时间">{selectedCert.validFrom}</Descriptions.Item>
            <Descriptions.Item label="到期时间">{selectedCert.expiryDate}</Descriptions.Item>
            <Descriptions.Item label="剩余天数">
              <Text type={getDaysRemaining(selectedCert.expiryDate) < 30 ? 'danger' : 'success'}>
                {getDaysRemaining(selectedCert.expiryDate) < 0 ? `已过期 ${Math.abs(getDaysRemaining(selectedCert.expiryDate))} 天` : `${getDaysRemaining(selectedCert.expiryDate)} 天`}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="更新状态"><OverallTag status={selectedCert.overallStatus} /></Descriptions.Item>
            <Descriptions.Item label="主域名 / CN" span={2}><Text strong>{selectedCert.domain}</Text></Descriptions.Item>
            <Descriptions.Item label="最近资产扫描" span={2}>{selectedCert.lastScanTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="SAN 域名" span={4}>
              <Space wrap>
                {(showAllSans ? selectedCert.sans : selectedCert.sans.slice(0, 3)).map(domain => <Tag key={domain}>{domain}</Tag>)}
                {selectedCert.sans.length > 3 && <Button type="link" size="small" onClick={() => setShowAllSans(previous => !previous)}>{showAllSans ? '收起' : `查看全部（${selectedCert.sans.length}）`}</Button>}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="序列号" span={2}><Text code>{selectedCert.serialNumber}</Text></Descriptions.Item>
            <Descriptions.Item label="SHA-256 指纹" span={2}><Text code copyable={{ text: selectedCert.fingerprint }}>{selectedCert.fingerprint}</Text></Descriptions.Item>
          </Descriptions>
        </Card>
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={6}><Card size="small"><Statistic title="云账号" value={summary.accounts} suffix="个" /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="证书落点" value={selectedCert.placements.length} suffix="个" /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="关联资源" value={selectedCert.resources.length} suffix="个" /></Card></Col>
          <Col span={6}><Card size="small" hoverable onClick={() => abnormalResources && openResourceDrawer({ mode: 'abnormal' })} style={{ cursor: abnormalResources ? 'pointer' : 'default', borderColor: abnormalResources ? '#ffccc7' : undefined }}><Statistic title="未更新资源（点击查看）" value={abnormalResources} suffix="个" valueStyle={{ color: abnormalResources ? '#cf1322' : '#3f8600' }} /></Card></Col>
        </Row>
        <Card
          title={<Space><CloudOutlined /><span>云端证书与关联资源</span><Tag color="blue">{selectedCert.placements.length} 个证书落点</Tag></Space>}
          extra={<Space><Button icon={<ReloadOutlined />} loading={scanning} onClick={refreshAssets}>刷新资产</Button><Button type="primary" disabled={!hasRepairableAbnormality} onClick={() => openBatchSync()}>同步异常项</Button></Space>}
        >
          <Alert type="info" showIcon message="仅展示云端实际扫描到的证书和资源" description="点击资源数量或“查看资源”可在右侧面板处理关联资源；刷新后云端已不存在的资产会从列表移除。" style={{ marginBottom: 16 }} />
          <Space wrap style={{ marginBottom: 16 }}>
            <Select allowClear placeholder="云厂商" style={{ width: 130 }} value={placementProvider} onChange={setPlacementProvider} options={[{ value: 'aliyun', label: '阿里云' }, { value: 'aws', label: 'AWS' }]} />
            <Select allowClear placeholder="证书状态" style={{ width: 140 }} value={placementStatus} onChange={setPlacementStatus} options={Object.entries(placementStatusConfig).map(([value, item]) => ({ value, label: item.text }))} />
          </Space>
          <Table
            columns={placementColumns}
            dataSource={filteredPlacements}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      </Card>
      {renderUpdateModal()}{renderSyncModal()}{renderResourceDrawer()}
    </>
  }

  return <>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><div><Title level={4} style={{ margin: 0 }}>SSL 证书</Title><Text type="secondary">统一接入并更新多云、多账号证书</Text></div><Button type="primary" icon={<CloudOutlined />} onClick={openImport}>接入现有证书</Button></div>
      <Table columns={listColumns} dataSource={certificates} rowKey="id" pagination={false} />
    </Card>
    {renderImportModal()}{renderUpdateModal()}
  </>
}
