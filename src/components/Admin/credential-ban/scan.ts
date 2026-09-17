/**
 * 封禁前的旁路授权扫描 —— 前端 mock。
 *
 * 只产出「与平台基线存在差异」的项；每项用左右对比呈现：
 * 左列是平台基线（预期），右列是扫描到的实际配置。
 * 三个 mock appId 覆盖三种典型结果：多项可绕过 / 含扫描失败 / 无可绕过项。
 */

import type { DiffRow, ScanFinding } from './types'

const bucketFinding = (appId: string): ScanFinding => ({
  id: `${appId}-oss`,
  category: '桶策略 / PAB',
  target: `${appId}-prod-assets`,
  summary: '实际多出一条匿名读语句，且 RestrictPublicBuckets 被关闭、SourceVpc 条件被去掉',
  bypassable: true,
  failed: false,
  failReason: '',
  diff: [
    { type: 'meta', left: 'Bucket Policy', right: 'Bucket Policy' },
    { type: 'same', left: 'Sid: platform-readonly', right: 'Sid: platform-readonly' },
    {
      type: 'same',
      left: '  Principal: ["acs:ram::1824****:role/g123-platform"]',
      right: '  Principal: ["acs:ram::1824****:role/g123-platform"]'
    },
    { type: 'same', left: '  Action:    ["oss:GetObject"]', right: '  Action:    ["oss:GetObject"]' },
    { type: 'added', left: '', right: 'Sid: (无)' },
    { type: 'added', left: '', right: '  Principal: "*"' },
    { type: 'added', left: '', right: '  Action:    ["oss:GetObject"]' },
    { type: 'added', left: '', right: `  Resource:  "acs:oss:*:*:${appId}-prod-assets/*"` },
    { type: 'same', left: 'Sid: platform-rw', right: 'Sid: platform-rw' },
    {
      type: 'changed',
      left: '  Action:    ["oss:GetObject", "oss:PutObject"]',
      right: '  Action:    ["oss:*"]'
    },
    { type: 'removed', left: '  Condition: acs:SourceVpc = vpc-bp1****', right: '' },
    { type: 'meta', left: 'PublicAccessBlock', right: 'PublicAccessBlock' },
    { type: 'same', left: 'BlockPublicAcls:       true', right: 'BlockPublicAcls:       true' },
    { type: 'same', left: 'IgnorePublicAcls:      true', right: 'IgnorePublicAcls:      true' },
    { type: 'same', left: 'BlockPublicPolicy:     true', right: 'BlockPublicPolicy:     true' },
    { type: 'changed', left: 'RestrictPublicBuckets: true', right: 'RestrictPublicBuckets: false' }
  ]
})

const ramFinding = (appId: string): ScanFinding => ({
  id: `${appId}-ram`,
  category: 'RAM 额外授权',
  target: `${appId}-prod-oss-user`,
  summary: '实际存在 3 把 AccessKey（平台只记录 1 把），并多挂了系统策略与一个基线外用户',
  bypassable: true,
  failed: false,
  failReason: '',
  diff: [
    { type: 'meta', left: `RAM User · ${appId}-prod-oss-user`, right: `RAM User · ${appId}-prod-oss-user` },
    { type: 'same', left: `挂载策略: g123-oss-${appId}-prod`, right: `挂载策略: g123-oss-${appId}-prod` },
    { type: 'added', left: '', right: '挂载策略: AliyunOSSFullAccess' },
    { type: 'added', left: '', right: '内联策略: 1 条' },
    { type: 'meta', left: 'AccessKey 清单', right: 'AccessKey 清单' },
    {
      type: 'same',
      left: 'LTAI****A1  Active  最近使用 2026-09-16',
      right: 'LTAI****A1  Active  最近使用 2026-09-16'
    },
    { type: 'added', left: '', right: 'LTAI****7F  Active  最近使用 2026-09-16' },
    { type: 'added', left: '', right: 'LTAI****2C  Active  从未使用' },
    { type: 'meta', left: '基线外主体', right: '基线外主体' },
    { type: 'added', left: '', right: `RAM User  ${appId}-debug-temp  创建 2026-06-08` }
  ]
})

const kubeFinding = (appId: string): ScanFinding => ({
  id: `${appId}-kube`,
  category: 'kubeconfig',
  target: `namespace: ${appId}-prod`,
  summary: '实际存在 2 个长期 ServiceAccount Token，且 ci-deployer 绑定了 cluster-admin',
  bypassable: true,
  failed: false,
  failReason: '',
  diff: [
    { type: 'meta', left: `namespace ${appId}-prod · Secret`, right: `namespace ${appId}-prod · Secret` },
    { type: 'added', left: '', right: `Secret  ${appId}-kubeconfig       Opaque` },
    { type: 'added', left: '', right: 'Secret  default-token-x8k2p       无过期时间' },
    { type: 'meta', left: 'ServiceAccount 绑定', right: 'ServiceAccount 绑定' },
    {
      type: 'same',
      left: `SA default      → RoleBinding ${appId}-rw`,
      right: `SA default      → RoleBinding ${appId}-rw`
    },
    { type: 'added', left: '', right: 'SA ci-deployer  → ClusterRoleBinding cluster-admin' }
  ]
})

const vmFinding = (appId: string): ScanFinding => ({
  id: `${appId}-vm`,
  category: 'VM 残留授权',
  target: 'i-bp1****xyz',
  summary: '实际存在已释放虚拟机的终端会话授权残留 3 条',
  bypassable: false,
  failed: false,
  failReason: '',
  diff: [
    { type: 'meta', left: '终端会话授权', right: '终端会话授权' },
    { type: 'added', left: '', right: 'i-bp1****xyz  实例 Released(2026-08-03)  残留 3 条' }
  ]
})

const kubeScanFailed = (appId: string): ScanFinding => ({
  id: `${appId}-kube-failed`,
  category: 'kubeconfig',
  target: `namespace: ${appId}-prod`,
  summary: '',
  bypassable: false,
  failed: true,
  failReason: '集群 API 调用超时（30s）',
  diff: [] as DiffRow[]
})

/**
 * 执行扫描。原型内按 appId 返回固定结果，覆盖三种典型场景：
 * - gamedemo：3 项可绕过 + 1 项噪音
 * - testgame：1 项可绕过 + 1 项扫描失败 + 1 项噪音
 * - rpgworld：0 项可绕过，只有噪音
 */
export const runScan = (appId: string): ScanFinding[] => {
  if (appId === 'testgame') {
    return [ramFinding(appId), kubeScanFailed(appId), vmFinding(appId)]
  }
  if (appId === 'rpgworld') {
    return [vmFinding(appId)]
  }
  return [bucketFinding(appId), ramFinding(appId), kubeFinding(appId), vmFinding(appId)]
}

/** 顶部提示里的 N：可绕过封禁且未失败的差异项数量 */
export const countBypassable = (findings: ScanFinding[]): number =>
  findings.filter(finding => finding.bypassable && !finding.failed).length
