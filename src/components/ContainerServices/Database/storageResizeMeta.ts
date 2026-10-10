/**
 * 存储实例升配 / 降配（原型）
 *
 * 规则来源：《存储规格调整》+ 阿里云变配能力
 * - PolarDB：只调规格；存储按实际用量自动扩展，无需变配
 * - Mongo 副本集：规格 + 存储（20–16000GB）
 * - Mongo 分片集：mongos 规格；shard 规格 + 存储（≤16000GB）；config 规格 + 存储（≤1270GB）
 * - Redis 标准（主从）：规格
 * - Redis 分片：分片规格、分片数量、带宽
 * - Zookeeper（MSE）：规格、公网带宽（0–5000Mbps）
 * - 存储只能扩、不能缩：降配时存储只读展示当前值
 * - 降配提交前按当前内存 / 磁盘用量校验，超出目标规格时拦截
 */

export type ResizeDirection = 'upgrade' | 'downgrade'
export type ResizeEffectiveTime = 'Immediately' | 'MaintainTime'

export type StorageResizeKind =
  | 'polardb'
  | 'mongoReplica'
  | 'mongoSharded'
  | 'redisStandard'
  | 'redisSharded'
  | 'zookeeper'

export interface ResizeComponent {
  key: string
  /** 组件名称，如 Mongos / Shard / ConfigServer */
  label: string
  /** 节点数量描述（仅展示） */
  nodesText: string
  spec: string
  specOptions: string[]
  /** 存储（GB）；undefined 表示该组件无独立存储 */
  storageGB?: number
  storageMinGB?: number
  storageMaxGB?: number
  /** 无存储变配能力时的说明（如 PolarDB 自动扩展） */
  storageNote?: string
  /** 当前内存用量（GB；Redis 分片集群为全部分片合计），用于降配校验 */
  memUsedGB?: number
  /** 当前磁盘用量（GB），用于降配校验 */
  diskUsedGB?: number
}

export type NumberFieldKey = 'shardCount' | 'nodesPerShard' | 'bandwidth'

/** 每分片节点数的展示文案：如 2 → 每分片 2 个（1 主 1 备） */
export function formatNodesPerShard(n: number): string {
  return `每分片 ${n} 个（1 主 ${n - 1} 备）`
}

export interface NumberField {
  value: number
  min: number
  max: number
  step: number
  unit: string
}

export interface InstanceSpecConfig {
  kind: StorageResizeKind
  /** 实例在云厂商设置的可运维时间段 */
  maintainWindow: string
  components: ResizeComponent[]
  /** Redis 分片集群：分片数量 */
  shardCount?: NumberField
  /** Redis 分片集群：每个分片的节点数（1 主 + N 备 / 副本），只增加读能力与可用性，不增加容量 */
  nodesPerShard?: NumberField
  /** Redis 分片 / Zookeeper：带宽 */
  bandwidth?: NumberField
}

/**
 * 变配单流转：
 * 用户提交申请 → approving（发起审批）→ approved（管理员审批通过）/ rejected（管理员拒绝，用户点【确定】后清除）
 * → 用户在页面确认生效时间 → resizing（立即生效）/ scheduled（可运维时间段）→ 完成后回写规格
 */
export type ResizeTicketStage = 'approving' | 'approved' | 'rejected' | 'resizing' | 'scheduled'

export interface ResizeTicket {
  instId: string
  /** 被调整的组件 key（如 mongos / shard / config），各组件独立申请 */
  compKey: string
  direction: ResizeDirection
  stage: ResizeTicketStage
  /** 申请提交时该组件的配置快照，用于确认时检测云厂商侧是否已被变配 */
  base: InstanceSpecConfig
  target: InstanceSpecConfig
  submittedAt: string
  effectiveTime?: ResizeEffectiveTime
}

export const STORAGE_STEP_GB = 10

const MONGO_SPECS = ['1核2G', '2核4G', '2核8G', '4核8G', '4核16G', '8核16G', '8核32G', '16核32G', '16核64G']
const POLARDB_SPECS = ['2核4G', '2核8G', '4核16G', '8核32G', '16核64G', '32核128G']
const REDIS_STANDARD_SPECS = ['1GB', '2GB', '4GB', '8GB', '16GB', '32GB', '64GB']
const REDIS_SHARD_SPECS = ['1GB', '2GB', '4GB', '8GB', '16GB', '32GB']
const ZK_SPECS = ['1核2G', '2核4G', '4核8G', '8核16G', '16核32G']

/** 规格排序权重：先比 CPU，再比内存；纯内存规格（Redis）只比内存 */
export function specRank(spec: string): number {
  const cpu = Number((spec.match(/(\d+)\s*核/) || [])[1] || 0)
  const mem = Number((spec.match(/(\d+)\s*G/i) || [])[1] || 0)
  return cpu * 100000 + mem
}

export function normalizeSpec(spec: string | undefined): string {
  return (spec || '').replace(/\*/g, '').replace(/GB$/i, 'G')
}

/** 当前规格不在候选列表时插入并排序，保证下拉里一定能看到“当前” */
function withCurrent(options: string[], current: string): string[] {
  const list = options.includes(current) ? [...options] : [...options, current]
  return list.sort((a, b) => specRank(a) - specRank(b))
}

interface InstanceLike {
  type: string
  arch?: string
  spec: string
}

export function resolveResizeKind(inst: InstanceLike): StorageResizeKind | null {
  const t = (inst.type || '').toLowerCase()
  if (t === 'mysql') return 'polardb'
  if (t === 'mongo' || t === 'mongodb') return inst.arch === '分片集群实例' ? 'mongoSharded' : 'mongoReplica'
  if (t === 'redis') return inst.arch === '分片集群' ? 'redisSharded' : 'redisStandard'
  if (t === 'zookeeper') return 'zookeeper'
  return null
}

/** 默认配置：与「查看规格」弹窗原有 mock 保持一致 */
export function buildDefaultSpecConfig(inst: InstanceLike): InstanceSpecConfig | null {
  const kind = resolveResizeKind(inst)
  if (!kind) return null
  // maintainWindow：实际读取实例在云厂商设置的运维窗口；memUsedGB / diskUsedGB：实际读取监控用量（以下为原型 mock）
  if (kind === 'polardb') {
    const spec = normalizeSpec(inst.spec) || '2核8G'
    return {
      kind,
      maintainWindow: '02:00-03:00',
      components: [{
        key: 'polardb', label: '集群节点', nodesText: '1 主 2 只读', spec,
        specOptions: withCurrent(POLARDB_SPECS, spec),
        storageNote: '按实际用量自动扩展，无需变配',
        memUsedGB: 5
      }]
    }
  }
  if (kind === 'mongoReplica') {
    return {
      kind,
      maintainWindow: '02:00-06:00',
      components: [{
        key: 'replica', label: '副本集节点', nodesText: '1 主 2 从', spec: '4核8G',
        specOptions: MONGO_SPECS, storageGB: 20, storageMinGB: 20, storageMaxGB: 16000, memUsedGB: 3, diskUsedGB: 12
      }]
    }
  }
  if (kind === 'mongoSharded') {
    return {
      kind,
      maintainWindow: '02:00-06:00',
      components: [
        { key: 'mongos', label: 'Mongos', nodesText: '2', spec: '2核8G', specOptions: MONGO_SPECS, memUsedGB: 2 },
        { key: 'shard', label: 'Shard', nodesText: '3', spec: '4核16G', specOptions: MONGO_SPECS, storageGB: 20, storageMinGB: 20, storageMaxGB: 16000, memUsedGB: 10, diskUsedGB: 15 },
        { key: 'config', label: 'ConfigServer', nodesText: '3', spec: '2核8G', specOptions: MONGO_SPECS, storageGB: 20, storageMinGB: 20, storageMaxGB: 1270, memUsedGB: 3, diskUsedGB: 4 }
      ]
    }
  }
  if (kind === 'redisStandard') {
    return {
      kind,
      maintainWindow: '03:00-04:00',
      components: [{ key: 'redis', label: '主备节点', nodesText: '1 主 1 备', spec: '8GB', specOptions: REDIS_STANDARD_SPECS, memUsedGB: 5 }]
    }
  }
  if (kind === 'redisSharded') {
    return {
      kind,
      maintainWindow: '03:00-04:00',
      components: [{ key: 'redisShard', label: '单分片规格', nodesText: '每分片 1 主 1 备', spec: '1GB', specOptions: REDIS_SHARD_SPECS, memUsedGB: 1.2 }],
      shardCount: { value: 2, min: 2, max: 256, step: 1, unit: '个' },
      // 原型示意：上限以接口返回为准
      nodesPerShard: { value: 2, min: 2, max: 5, step: 1, unit: '个/分片' },
      bandwidth: { value: 96, min: 96, max: 2048, step: 8, unit: 'MB/s' }
    }
  }
  const spec = normalizeSpec(inst.spec) || '2核4G'
  return {
    kind,
    maintainWindow: '04:00-05:00',
    components: [{ key: 'zk', label: 'Zookeeper 节点', nodesText: '3', spec, specOptions: withCurrent(ZK_SPECS, spec), memUsedGB: 1 }],
    bandwidth: { value: 0, min: 0, max: 5000, step: 1, unit: 'Mbps' }
  }
}

export function cloneSpecConfig(cfg: InstanceSpecConfig): InstanceSpecConfig {
  return {
    ...cfg,
    components: cfg.components.map((c) => ({ ...c, specOptions: [...c.specOptions] })),
    shardCount: cfg.shardCount ? { ...cfg.shardCount } : undefined,
    nodesPerShard: cfg.nodesPerShard ? { ...cfg.nodesPerShard } : undefined,
    bandwidth: cfg.bandwidth ? { ...cfg.bandwidth } : undefined
  }
}

/** 按方向过滤可选规格：升配只能选 ≥ 当前，降配只能选 ≤ 当前 */
export function filterSpecOptions(options: string[], current: string, direction: ResizeDirection): string[] {
  const cur = specRank(current)
  return options.filter((o) => (direction === 'upgrade' ? specRank(o) >= cur : specRank(o) <= cur))
}

export interface ResizeChange {
  label: string
  from: string
  to: string
}

export function diffSpecConfig(current: InstanceSpecConfig, target: InstanceSpecConfig): ResizeChange[] {
  const changes: ResizeChange[] = []
  current.components.forEach((c, i) => {
    const t = target.components[i]
    if (!t) return
    if (c.spec !== t.spec) changes.push({ label: `${c.label} 规格`, from: c.spec, to: t.spec })
    if (c.storageGB != null && t.storageGB != null && c.storageGB !== t.storageGB) {
      changes.push({ label: `${c.label} 存储`, from: `${c.storageGB}GB`, to: `${t.storageGB}GB` })
    }
  })
  if (current.shardCount && target.shardCount && current.shardCount.value !== target.shardCount.value) {
    changes.push({ label: '分片数量', from: `${current.shardCount.value}`, to: `${target.shardCount.value}` })
  }
  if (current.nodesPerShard && target.nodesPerShard && current.nodesPerShard.value !== target.nodesPerShard.value) {
    changes.push({ label: '每分片节点数', from: `${current.nodesPerShard.value}`, to: `${target.nodesPerShard.value}` })
  }
  if (current.bandwidth && target.bandwidth && current.bandwidth.value !== target.bandwidth.value) {
    const u = current.bandwidth.unit
    changes.push({ label: '带宽', from: `${current.bandwidth.value}${u}`, to: `${target.bandwidth.value}${u}` })
  }
  return changes
}

/** 降配时是否还有可以往下调的项（全部已是最低则入口仍可点，但弹窗提示无可降项） */
export function hasDowngradeRoom(cfg: InstanceSpecConfig): boolean {
  const specRoom = cfg.components.some((c) => filterSpecOptions(c.specOptions, c.spec, 'downgrade').length > 1)
  const shardRoom = !!cfg.shardCount && cfg.shardCount.value > cfg.shardCount.min
  const nodeRoom = !!cfg.nodesPerShard && cfg.nodesPerShard.value > cfg.nodesPerShard.min
  const bwRoom = !!cfg.bandwidth && cfg.bandwidth.value > cfg.bandwidth.min
  return specRoom || shardRoom || nodeRoom || bwRoom
}

export interface SpecCompareRow {
  key: string
  item: string
  from: string
  to: string
  changed: boolean
}

/** 规格比对：列出所有可变配项（含未变化项），供审批通过后的确认弹窗展示 */
export function compareSpecConfig(current: InstanceSpecConfig, target: InstanceSpecConfig): SpecCompareRow[] {
  const rows: SpecCompareRow[] = []
  current.components.forEach((c, i) => {
    const t = target.components[i]
    if (!t) return
    const prefix = current.components.length > 1 ? `${c.label} ` : ''
    rows.push({ key: `${c.key}-spec`, item: `${prefix}规格`, from: c.spec, to: t.spec, changed: c.spec !== t.spec })
    if (c.storageGB != null && t.storageGB != null) {
      rows.push({
        key: `${c.key}-storage`, item: `${prefix}存储`,
        from: `${c.storageGB}GB`, to: `${t.storageGB}GB`, changed: c.storageGB !== t.storageGB
      })
    }
  })
  if (current.shardCount && target.shardCount) {
    rows.push({
      key: 'shardCount', item: '分片数量',
      from: `${current.shardCount.value}`, to: `${target.shardCount.value}`,
      changed: current.shardCount.value !== target.shardCount.value
    })
  }
  if (current.nodesPerShard && target.nodesPerShard) {
    rows.push({
      key: 'nodesPerShard', item: '每分片节点数',
      from: `${current.nodesPerShard.value}`, to: `${target.nodesPerShard.value}`,
      changed: current.nodesPerShard.value !== target.nodesPerShard.value
    })
  }
  if (current.bandwidth && target.bandwidth) {
    const u = current.bandwidth.unit
    rows.push({
      key: 'bandwidth', item: current.kind === 'zookeeper' ? '公网带宽' : '带宽',
      from: `${current.bandwidth.value}${u}`, to: `${target.bandwidth.value}${u}`,
      changed: current.bandwidth.value !== target.bandwidth.value
    })
  }
  return rows
}

/** 取出单个组件的可调配置（单组件实例连带分片数 / 带宽一起调整） */
export function buildComponentConfig(full: InstanceSpecConfig, compKey: string): InstanceSpecConfig {
  const comp = full.components.find((c) => c.key === compKey)
  const single = full.components.length === 1
  return {
    kind: full.kind,
    maintainWindow: full.maintainWindow,
    components: comp ? [{ ...comp, specOptions: [...comp.specOptions] }] : [],
    shardCount: single && full.shardCount ? { ...full.shardCount } : undefined,
    nodesPerShard: single && full.nodesPerShard ? { ...full.nodesPerShard } : undefined,
    bandwidth: single && full.bandwidth ? { ...full.bandwidth } : undefined
  }
}

/** 把单组件变配结果合并回实例整体配置（不影响其他组件） */
export function mergeComponentConfig(full: InstanceSpecConfig, sub: InstanceSpecConfig): InstanceSpecConfig {
  const next = cloneSpecConfig(full)
  sub.components.forEach((sc) => {
    const i = next.components.findIndex((c) => c.key === sc.key)
    if (i >= 0) next.components[i] = { ...sc, specOptions: [...sc.specOptions] }
  })
  if (sub.shardCount) next.shardCount = { ...sub.shardCount }
  if (sub.nodesPerShard) next.nodesPerShard = { ...sub.nodesPerShard }
  if (sub.bandwidth) next.bandwidth = { ...sub.bandwidth }
  return next
}

/** 规格中的内存容量（GB）：「4核8G」→ 8，「8GB」→ 8 */
export function specMemGB(spec: string): number {
  const nums = spec.match(/\d+(?:\.\d+)?\s*G/gi) || []
  const last = nums[nums.length - 1]
  return last ? Number(last.replace(/[^\d.]/g, '')) : 0
}

/**
 * 降配提交前的用量校验：内存用量 > 目标规格内存，或磁盘用量 > 目标存储时拦截
 * Redis 分片集群的目标内存 = 单分片内存 × 目标分片数
 * @returns 不通过时返回拦截提示，通过返回 null
 */
export function checkDowngradeUsage(target: InstanceSpecConfig): string | null {
  for (const c of target.components) {
    const shards = target.kind === 'redisSharded' ? (target.shardCount?.value ?? 1) : 1
    const memCap = specMemGB(c.spec) * shards
    if (c.memUsedGB != null && memCap > 0 && c.memUsedGB > memCap) {
      return `当前内存用量 ${c.memUsedGB}GB，超过目标规格内存 ${memCap}GB，无法降配`
    }
    if (c.diskUsedGB != null && c.storageGB != null && c.diskUsedGB > c.storageGB) {
      return `当前磁盘用量 ${c.diskUsedGB}GB，超过目标存储 ${c.storageGB}GB，无法降配`
    }
  }
  return null
}

/** 冲突检测：确认时该组件的实际配置与申请时快照不一致（如云厂商侧已被变配），返回各项比对；无冲突返回 null */
export function detectConfigConflict(base: InstanceSpecConfig, actual: InstanceSpecConfig): SpecCompareRow[] | null {
  const rows = compareSpecConfig(base, actual)
  return rows.some((r) => r.changed) ? rows : null
}

/** 原型演示：模拟云厂商侧对某组件做了变配（规格上调一档，已是最高档则下调一档） */
export function simulateCloudChange(full: InstanceSpecConfig, compKey: string): InstanceSpecConfig {
  const next = cloneSpecConfig(full)
  const c = next.components.find((x) => x.key === compKey)
  if (!c) return next
  const sorted = [...c.specOptions].sort((a, b) => specRank(a) - specRank(b))
  const i = sorted.indexOf(c.spec)
  c.spec = i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : sorted[Math.max(0, i - 1)]
  return next
}
