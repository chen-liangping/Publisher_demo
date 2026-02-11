/**
 * 通知/告警分类目录（仅用于原型页面渲染）。
 *
 * 说明：
 * - 由于需求要求 `alert.tsx` 内容不变，这里单独维护一份“分类-条目”常量给管理台使用。
 * - 未来如果允许改动 `alert.tsx`，建议将其内部常量迁移到此文件并复用，避免重复维护。
 */

export type NoticeCategory = '告警' | '通知'

export interface NoticeItem {
  key: string
  name: string
}

export interface NoticeGroup {
  key: string
  name: string
  category: NoticeCategory
  items: NoticeItem[]
}

export type NoticeTreeLevel = 1 | 2 | 3
export interface NoticeTreeNode {
  key: string
  name: string
  level: NoticeTreeLevel
  children?: NoticeTreeNode[]
}

// 告警类 - 自动开服
const alertAutoOpenNoticeList: NoticeItem[] = [
  { key: 'autoOpenServerSuccess', name: '自动开服成功' },
  { key: 'autoOpenServerFail', name: '自动开服失败' },
  { key: 'notifyCPFail', name: '通知CP新预备服失败' },
  { key: 'prepareDeployFail', name: '预备服部署失败' },
  { key: 'scheduleFetchFail', name: '自动开服执行计划获取失败' }
]

// 告警类 - 静态资源与 CDN
const alertStaticCdnNoticeList: NoticeItem[] = [
  { key: 'translateSyncCdnFail', name: '翻译文本同步CDN失败' },
  { key: 's3UnzipFail', name: 'S3 zip解压失败' },
  { key: 'flashlaunchBlocked', name: 'flashlaunch静态资源计算阻塞' },
  { key: 'CDNDeployFail', name: 'CDN部署失败' },
  { key: 'CDNDeploySuccess', name: 'CDN部署成功' }
]

// 告警类 - 运行时健康
const alertRuntimeHealthNoticeList: NoticeItem[] = [
  { key: 'podHealthCheckFail', name: 'pod健康检查失败' },
  { key: 'podFailure', name: 'Pod故障' },
  { key: 'podUpdateAbnormal', name: 'Pod更新异常' }
]

// 通知类 - 客户端版本
const notificationClientVersionNoticeList: NoticeItem[] = [
  { key: 'clientNewVersion', name: '客户端创建新版本' },
  { key: 'clientVersionSwitch', name: '客户端版本切换' },
  { key: 's3UnzipSuccess', name: 'S3 zip解压成功' }
]

// 通知类 - 配置变更
const notificationConfigChangeNoticeList: NoticeItem[] = [
  { key: 'ossConfigChange', name: 'oss配置文件变更' },
  { key: 'autoOpenPolicyChange', name: '自动开服策略变更' }
]

// 通知类 - 发布过程
const notificationReleaseProcessNoticeList: NoticeItem[] = [
  { key: 'serverDeployFail', name: '服务端部署失败' },
  { key: 'serverDeploySuccess', name: '服务端部署成功' },
  { key: 'grayRollback', name: '灰度回滚' },
  { key: 'grayRollbackDone', name: '灰度回滚完成' },
  { key: 'grayAppend', name: '追加灰度' },
  { key: 'grayAppendDone', name: '灰度追加完成' },
  { key: 'grayFullDeploy', name: '灰度全量部署' }
]

export const noticeGroups: NoticeGroup[] = [
  {
    key: 'alert-auto-open',
    name: '自动开服',
    category: '告警',
    items: alertAutoOpenNoticeList
  },
  {
    key: 'alert-static-cdn',
    name: '静态资源与 CDN',
    category: '告警',
    items: alertStaticCdnNoticeList
  },
  {
    // key 与用户侧 alert.tsx 的树节点保持一致，方便用户侧按“父级行”做禁用联动
    key: 'alert-runtime',
    name: '运行时健康',
    category: '告警',
    items: alertRuntimeHealthNoticeList
  },
  {
    key: 'notification-client-version',
    name: '客户端版本',
    category: '通知',
    items: notificationClientVersionNoticeList
  },
  {
    // key 与用户侧 alert.tsx 的树节点保持一致
    key: 'notification-config',
    name: '配置变更',
    category: '通知',
    items: notificationConfigChangeNoticeList
  },
  {
    // key 与用户侧 alert.tsx 的树节点保持一致
    key: 'notification-release',
    name: '发布过程',
    category: '通知',
    items: notificationReleaseProcessNoticeList
  }
]

/**
 * 构建与用户侧一致的树结构（key 命名也对齐 alert.tsx）
 * - Level1：告警/通知 root
 * - Level2：业务场景
 * - Level3：具体通知项
 */
export function buildNoticeTreeRoots(): NoticeTreeNode[] {
  const alertGroups = noticeGroups.filter(g => g.category === '告警')
  const notificationGroups = noticeGroups.filter(g => g.category === '通知')

  const toGroupNode = (g: NoticeGroup): NoticeTreeNode => ({
    key: g.key,
    name: g.name,
    level: 2,
    children: g.items.map(it => ({ key: it.key, name: it.name, level: 3 }))
  })

  return [
    {
      key: 'alert-root',
      name: '告警',
      level: 1,
      children: alertGroups.map(toGroupNode)
    },
    {
      key: 'notification-root',
      name: '通知',
      level: 1,
      children: notificationGroups.map(toGroupNode)
    }
  ]
}

export type NoticeTreeMaps = {
  nodeByKey: Record<string, NoticeTreeNode>
  parentByKey: Record<string, string | null>
  childrenByKey: Record<string, string[]>
  leafKeys: string[]
}

export function buildNoticeTreeMaps(roots: NoticeTreeNode[]): NoticeTreeMaps {
  const nodeByKey: Record<string, NoticeTreeNode> = {}
  const parentByKey: Record<string, string | null> = {}
  const childrenByKey: Record<string, string[]> = {}
  const leafKeys: string[] = []

  const walk = (nodes: NoticeTreeNode[], parent: string | null) => {
    nodes.forEach(n => {
      nodeByKey[n.key] = n
      parentByKey[n.key] = parent
      const kids = n.children ?? []
      childrenByKey[n.key] = kids.map(k => k.key)
      if (kids.length === 0 && n.level === 3) leafKeys.push(n.key)
      if (kids.length > 0) walk(kids, n.key)
    })
  }
  walk(roots, null)
  return { nodeByKey, parentByKey, childrenByKey, leafKeys }
}


