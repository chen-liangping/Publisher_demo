/**
 * 控制台路由表：每个左侧菜单对应一个独立 URL，直接打开/分享 URL 即可定位到对应菜单。
 *
 * - `path`：菜单对应的路由（不含 query）
 * - `parent`：所属的一级菜单 key，用于自动展开左侧菜单
 * - `mode`：该菜单只在某种资源形态下出现（vm/container）；打开该 URL 时会自动切到对应模式。
 *   未声明 mode 的菜单两种模式都可见，模式通过 `?mode=container` 保留在 URL 上（默认 vm）。
 */

export type Mode = 'container' | 'vm'

export type MenuKey =
  | 'workbench'
  | 'vm-management'
  | 'key-management'
  | 'file-management'
  | 'command-management'
  | 'security-group'
  | 'load-balancer'
  | 'container-app'
  | 'container-database'
  | 'client-page'
  | 'client-version'
  | 'cron-job'
  | 'gift-management'
  | 'play'
  | 'gift-data'
  | 'message-push'
  | 'i18n'
  | 'alert'
  | 'alert-history'
  | 'log'
  | 'people-config'
  | 'message-notification'
  | 'cdn-alert'
  | 'alert-system'
  | 'security-scan'

export interface MenuRoute {
  key: MenuKey
  path: string
  label: string
  parent?: 'client' | 'service' | 'Monitor' | 'Integration' | 'Operations'
  mode?: Mode
}

export const MENU_ROUTES: MenuRoute[] = [
  { key: 'workbench', path: '/workbench', label: '我的工作台' },

  // 客户端
  { key: 'client-version', path: '/client/version', label: '客户端 · 版本', parent: 'client' },
  { key: 'client-page', path: '/client/cdn', label: '客户端 · CDN', parent: 'client' },

  // 服务端（虚机）
  { key: 'vm-management', path: '/server/vm', label: '虚机', parent: 'service', mode: 'vm' },
  { key: 'security-group', path: '/server/security-group', label: '安全组', parent: 'service', mode: 'vm' },
  { key: 'load-balancer', path: '/server/load-balancer', label: '负载均衡', parent: 'service', mode: 'vm' },
  { key: 'command-management', path: '/server/command', label: '命令', parent: 'service', mode: 'vm' },
  // 服务端（容器）
  { key: 'container-app', path: '/server/app', label: '应用', parent: 'service', mode: 'container' },
  { key: 'file-management', path: '/server/shared-files', label: '共享文件', parent: 'service', mode: 'container' },
  { key: 'cron-job', path: '/server/task', label: '任务', parent: 'service', mode: 'container' },
  // 服务端（通用）
  { key: 'container-database', path: '/server/storage', label: '存储', parent: 'service' },
  { key: 'key-management', path: '/server/key', label: '秘钥', parent: 'service' },

  // 监控
  { key: 'cdn-alert', path: '/monitor/client-alert', label: '客户端告警', parent: 'Monitor' },
  { key: 'alert-system', path: '/monitor/server', label: '服务端监控', parent: 'Monitor' },
  { key: 'security-scan', path: '/monitor/security-scan', label: '安全扫描', parent: 'Monitor' },

  // 接入
  { key: 'gift-management', path: '/integration/data-push', label: '数据推送', parent: 'Integration' },
  { key: 'message-push', path: '/integration/message-push', label: '消息推送', parent: 'Integration' },
  { key: 'i18n', path: '/integration/i18n', label: '国际化', parent: 'Integration' },

  // 运营
  { key: 'play', path: '/operations/activity', label: '活动数据', parent: 'Operations' },
  { key: 'gift-data', path: '/operations/gift', label: '礼包道具', parent: 'Operations' },

  // 不在左侧菜单中、但可从顶栏或页面内跳转的页面
  { key: 'people-config', path: '/people-config', label: '人员配置' },
  { key: 'message-notification', path: '/message-notification', label: '消息通知' },
  { key: 'alert', path: '/alert', label: '通知配置' },
  { key: 'alert-history', path: '/alert-history', label: '告警历史' },
  { key: 'log', path: '/log', label: '日志' }
]

const ROUTE_BY_KEY = new Map<MenuKey, MenuRoute>(MENU_ROUTES.map((r) => [r.key, r]))

export function isMenuKey(v: string | null | undefined): v is MenuKey {
  return !!v && ROUTE_BY_KEY.has(v as MenuKey)
}

export function getMenuRoute(key: MenuKey): MenuRoute {
  return ROUTE_BY_KEY.get(key) as MenuRoute
}

/** 容器应用详情页：/server/app/<appId> */
export function containerAppPath(appId: string): string {
  return `${getMenuRoute('container-app').path}/${encodeURIComponent(appId)}`
}

/**
 * 生成菜单 URL。
 * - 通用菜单在容器模式下带上 `?mode=container`，保证分享出去的链接打开后模式一致
 * - query 中的其他参数（如 tab）原样拼接
 */
export function menuPath(
  key: MenuKey,
  opts: { mode?: Mode; query?: Record<string, string | undefined> } = {}
): string {
  const route = getMenuRoute(key)
  const params = new URLSearchParams()
  if (!route.mode && opts.mode === 'container') params.set('mode', 'container')
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, v)
  })
  const qs = params.toString()
  return qs ? `${route.path}?${qs}` : route.path
}

export interface ResolvedRoute {
  menu: MenuKey
  /** 容器应用详情页的 appId */
  appId?: string
}

/** 根据 pathname 解析当前菜单；无法识别时返回 null（展示 404） */
export function resolvePathname(pathname: string | null): ResolvedRoute | null {
  const p = (pathname ?? '/').replace(/\/+$/, '') || '/'
  if (p === '/') return { menu: 'workbench' }

  const appBase = getMenuRoute('container-app').path + '/'
  if (p.startsWith(appBase)) {
    const rest = p.slice(appBase.length)
    if (rest && !rest.includes('/')) return { menu: 'container-app', appId: decodeURIComponent(rest) }
    return null
  }

  const found = MENU_ROUTES.find((r) => r.path === p)
  return found ? { menu: found.key } : null
}

/** 在另一种模式下与当前菜单对应的入口（切换容器/虚机时使用） */
export function counterpartMenu(key: MenuKey, nextMode: Mode): MenuKey {
  const route = getMenuRoute(key)
  if (!route.mode || route.mode === nextMode) return key
  return nextMode === 'container' ? 'container-app' : 'vm-management'
}

/* ---------------------------- 管理中心 ---------------------------- */

export type ManagementCenterKey =
  | 'operation-log'
  | 'site-notice'
  | 'notice-config-site-notice'
  | 'notice-owner'
  | 'notice-channel'

export const MANAGEMENT_CENTER_ROUTES: Record<ManagementCenterKey, string> = {
  'operation-log': '/management-center/operation-log',
  'site-notice': '/management-center/site-notice',
  'notice-config-site-notice': '/management-center/notice-config/site-notice',
  'notice-owner': '/management-center/notice-config/owner',
  'notice-channel': '/management-center/notice-config/channel'
}

export function isManagementCenterKey(v: string | null | undefined): v is ManagementCenterKey {
  return !!v && v in MANAGEMENT_CENTER_ROUTES
}

export function resolveManagementCenterPath(pathname: string | null): ManagementCenterKey | null {
  const p = (pathname ?? '').replace(/\/+$/, '')
  if (p === '/management-center') return 'site-notice'
  const hit = (Object.entries(MANAGEMENT_CENTER_ROUTES) as [ManagementCenterKey, string][]).find(([, path]) => path === p)
  return hit ? hit[0] : null
}

/* ------------------------------ 管理台 ------------------------------ */

export type AdminMenuKey =
  | 'game-management'
  | 'resource-configuration'
  | 'test-initialization'
  | 'announcement'
  | 'global-notice-config'
  | 'yaml'
  | 'notification-control'
  | 'sa-permissions'
  | 'operation-log'
  | 'game-faro-config'
  | 'ssl-management'
  | 'process-manager-monitor'
  | 'platform-resource-monitor'

/** 管理台菜单 → 所属分组（用于自动展开） */
export const ADMIN_MENU_PARENT: Record<AdminMenuKey, string | undefined> = {
  'game-management': 'game-env',
  'resource-configuration': 'game-env',
  'test-initialization': 'game-env',
  'ssl-management': undefined,
  'sa-permissions': 'permission-config',
  'game-faro-config': 'permission-config',
  announcement: 'message-notice',
  'global-notice-config': 'message-notice',
  'notification-control': 'message-notice',
  'platform-resource-monitor': 'monitor',
  'process-manager-monitor': 'monitor',
  'operation-log': 'audit',
  yaml: 'audit'
}

export function isAdminMenuKey(v: string | null | undefined): v is AdminMenuKey {
  return !!v && v in ADMIN_MENU_PARENT
}

/** 管理台路由：/admin/<key>，/admin 默认游戏管理 */
export function adminPath(key: AdminMenuKey): string {
  return `/admin/${key}`
}

export function resolveAdminPath(pathname: string | null): AdminMenuKey | null {
  const p = (pathname ?? '').replace(/\/+$/, '')
  if (p === '/admin') return 'game-management'
  const seg = p.startsWith('/admin/') ? p.slice('/admin/'.length) : ''
  return isAdminMenuKey(seg) ? seg : null
}
