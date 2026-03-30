'use client'

import { Layout, Menu, Typography, Segmented, Button, Tooltip, Drawer, Dropdown, Modal, Switch } from 'antd'
import { Suspense, useEffect, useState } from 'react'
import { 
  CloudServerOutlined, 
  CodeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ContainerOutlined,
  SecurityScanOutlined,
  MobileOutlined,
  BellOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  TeamOutlined,
  MessageOutlined,
  MonitorOutlined,
  DownOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import PlausibleLikeDashboard from '../components/Analytics/PlausibleLikeDashboard'
import VirtualMachineList, { type SystemServerGroup, type SystemForwardingPolicy } from '../components/VirtualMachineServices/VirtualMachine/VirtualMachineList'
import KeyManagement from '../components/VirtualMachineServices/KeyManagement/KeyManagement'
// 详情由组件内部自管理
import FileManagement from '../components/VirtualMachineServices/FileManagement/FileManagement'
import CommandManagement from '../components/VirtualMachineServices/CommandManagement/CommandManagement'
// 命令详情由列表组件内部自管理
import UserAvatarMenu from '../components/Common/UserAvatarMenu'
import SecurityGroupManagement from '../components/VirtualMachineServices/SecurityGroup/SecurityGroupManagement'
import LoadBalancerManagement from '../components/VirtualMachineServices/LoadBalancer/LoadBalancerManagement'
import AlertSystem from '../components/alert/AlertSystem'
// 详情由组件内部自管理
import ContainerApplication from '../components/ContainerServices/Application/ContainerApplication'
import { apps as demoApps } from '../components/ContainerServices/Application/apps'
import Deployment from '../components/ContainerServices/Application/deployment'
import DeploymentOther from '../components/ContainerServices/Application/deployment_other'
import ContainerDatabase from '../components/ContainerServices/Database/ContainerDatabase'
import DatabaseDetails from '../components/ContainerServices/Database/DatabaseDetails'
import ClientPage from '../components/Client/ClientPage'
import ClientVersionPage from '../components/Client/ClientVersionPage'
import Task from '../components/task/task'
import GiftManagment from '../components/tool/gift_managment'
import MessagePush from '../components/message/MessagePush'
import ActivityPage from '../components/tool/activity'
import GiftDataPage from '../components/tool/gift'
import I18nPage from '../components/tool/i18n'
import AlertPage from '../components/nofication/alert'
import AlertHistory from '../components/nofication/alert_history'
import AdminNotificationGate from '../components/nofication/AdminNotificationGate'
import LogPage from '../components/log'
import PeopleManagement from '../components/nofication/PeopleManagement'
import MessageNotification from '../components/nofication/MessageNotification'
import CdnAlert from '../components/alert/CdnAlert'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const { Header, Sider, Content } = Layout
const { Title } = Typography

type MenuKey = 'vm-management' | 'key-management' | 'file-management' | 'command-management' | 'security-group' | 'load-balancer' | 'container-app' | 'container-database' | 'client-page' | 'client-version' | 'cron-job' | 'gift-management' | 'play' | 'gift-data' | 'message-push' | 'i18n' | 'alert' | 'alert-history' | 'log' | 'people-config' | 'message-notification' | 'cdn-alert' | 'alert-system' | 'Monitor'


// 组件内自管理，无需在页面声明 VM 类型/状态

// 命令数据类型定义
interface Command {
  id: string
  name: string
  template: string
  tags: string[]
  description?: string
  createTime: string
  hasFileParam: boolean
}

// 组件内自管理，无需在页面声明 SecurityGroup 类型/状态

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  type Mode = 'container' | 'vm'
  const initialMode: Mode = ((): Mode => {
    const m = (searchParams.get('mode') as Mode | null)
    return m ?? 'vm'
  })()

  const initialMenu = ((): MenuKey => {
    const m = searchParams.get('menu') as MenuKey | null
    return m ?? 'vm-management'
  })()
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(initialMenu)
  const [mode, setMode] = useState<Mode>(initialMode)
  // 命令列表/详情由组件内部自管理
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  // 开启公网时生成的系统托管虚拟机组，同步到负载均衡的虚拟机组列表
  const [systemManagedServerGroups, setSystemManagedServerGroups] = useState<SystemServerGroup[]>([])
  // 开启公网时生成的系统托管转发策略
  const [systemManagedPolicies, setSystemManagedPolicies] = useState<SystemForwardingPolicy[]>([])
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false)
  // 顶栏：项目选择（原型中用于模拟多项目切换）
  const [selectedProject, setSelectedProject] = useState<'Publisher' | 'Omni' | 'Doraemon' | 'core' | 'Shinchan'>('Publisher')
  // 顶栏：环境开关（默认必须有值，避免空状态；仅区分测试/正式，符合原型常见入口）
  const [isProdEnv, setIsProdEnv] = useState<boolean>(false)
  // 顶栏：主导航的抽屉（用于“打开游戏/帮助文档”等交互，不仅仅弹 message）
  const [topNavPanel, setTopNavPanel] = useState<null | 'open-game' | 'help'>(null)
  
  const envLabel: '测试环境' | '正式环境' = isProdEnv ? '正式环境' : '测试环境'

  // 模拟当前用户信息
  const currentUser = {
    name: 'fuyu',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=fuyu&backgroundColor=f0f0f0',
    role: '管理员'
  }

  const headerPillStyle: React.CSSProperties = {
    height: 40,
    borderRadius: 999,
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(15, 23, 42, 0.03)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease'
  }

  const headerIconBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15, 23, 42, 0.04)',
    transition: 'transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease'
  }

  // 菜单点击处理：切换页面内容
  const handleMenuClick = (key: MenuKey): void => {
    setSelectedMenu(key)
    // 命令列表/详情由组件内部自管理
    setSelectedAppId(null)
    // 将菜单写入 URL 的查询参数，避免新建路由文件
    const params = new URLSearchParams(searchParams.toString())
    params.set('menu', key)
    params.set('mode', mode)
    router.push(`${pathname}?${params.toString()}`)
  }


  // VM 列表/详情由组件内部自管理

  // 命令交互逻辑内聚到组件内部

  // 安全组列表/详情由组件内部自管理

  // 监听 URL 变化（前进/后退）以同步选中菜单
  useEffect(() => {
    const m = searchParams.get('menu') as MenuKey | null
    if (m && m !== selectedMenu) setSelectedMenu(m)
    const mm = searchParams.get('mode') as Mode | null
    if (mm && mm !== mode) setMode(mm)
  }, [searchParams])

  // 渲染右侧内容区域
  const renderContent = (): React.ReactElement => {
    switch (selectedMenu) {
      case 'vm-management':
        return (
          <VirtualMachineList
            onNavigateToLoadBalancer={() => setSelectedMenu('load-balancer')}
            onServerGroupCreatedFromPublic={(g) => setSystemManagedServerGroups((prev) => [...prev, g])}
            onForwardingPolicyCreatedFromPublic={(p) => setSystemManagedPolicies((prev) => [...prev, p])}
          />
        )
      case 'cron-job':
        return <Task />
      case 'key-management':
        return <KeyManagement />
      case 'file-management':
        return <FileManagement />
      case 'command-management':
        return <CommandManagement />
      case 'security-group':
        return <SecurityGroupManagement />
      case 'load-balancer':
        return (
          <LoadBalancerManagement
            systemManagedServerGroups={systemManagedServerGroups}
            systemManagedPolicies={systemManagedPolicies}
            onReleaseSystemManaged={(g) => {
              setSystemManagedServerGroups((prev) => prev.filter((x) => x.id !== g.id))
              setSystemManagedPolicies((prev) => prev.filter((p) => p.serverGroup !== g.name))
            }}
          />
        )
      case 'container-app':
        // 如果有选中的应用 id，展示 Deployment 页面，否则展示应用卡片列表
        if (selectedAppId) {
          // 在 demo 环境中，从 demoApps 中查找 name/tags，如果找到则传入
          const found = demoApps.find(a => a.id === selectedAppId)
          if (found) {
            // 根据 tag 决定渲染哪个详情组件
            if (found.tags && found.tags.includes('游服')) {
              return <Deployment appId={selectedAppId} appName={found.name} tags={found.tags} />
            }
            return <DeploymentOther appId={selectedAppId} appName={found.name} tags={found.tags} />
          }
          return <Deployment appId={selectedAppId} />
        }
        // 恢复原有行为：当 selectedAppId 存在时展示 Deployment，否则展示应用卡片列表
        return <ContainerApplication onOpenDeployment={(id: string) => { setSelectedAppId(id); setSelectedMenu('container-app') }} />
      case 'container-database':
        return <ContainerDatabase />
      case 'client-page':
        return <ClientPage />
      case 'client-version':
        return <ClientVersionPage />
      case 'gift-management':
        return <GiftManagment />
      case 'message-push':
        return <MessagePush />
      case 'play':
        return <ActivityPage />
      case 'gift-data':
        return <GiftDataPage />
      case 'i18n':
        return <I18nPage />
      case 'alert':
        // 交互逻辑：通知配置页由管理员统一总开关控制；关闭时用户侧只读（不改 alert.tsx 本体）。
        return (
          <AdminNotificationGate>
            <AlertPage />
          </AdminNotificationGate>
        )
      case 'alert-history':
        return <AlertHistory />
      case 'log':
        return <LogPage />
      case 'people-config':
        return <PeopleManagement initialActiveTab={searchParams.get('tab') ?? undefined} />
      case 'message-notification':
        {
          const tab = searchParams.get('tab')
          const initialActiveTab =
            tab === 'all' || tab === 'alert' || tab === 'announcement' || tab === 'ai' ? tab : undefined
          return <MessageNotification initialActiveTab={initialActiveTab} />
        }
      case 'cdn-alert':
        return <CdnAlert />
      case 'alert-system':
        return <AlertSystem />
      default:
        return (
          <VirtualMachineList
            onNavigateToLoadBalancer={() => setSelectedMenu('load-balancer')}
            onServerGroupCreatedFromPublic={(g) => setSystemManagedServerGroups((prev) => [...prev, g])}
            onForwardingPolicyCreatedFromPublic={(p) => setSystemManagedPolicies((prev) => [...prev, p])}
          />
        )
    }
  }

  return (
    <Suspense fallback={null}>
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* 顶部导航：按截图样式（白底、胶囊、圆形 icon），同时保留原型内的真实路由/状态切换 */}
      <Header
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          padding: '0 16px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.28)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* 左侧：项目选择 + 模式切换（容器/虚机） + 主导航 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          {/* 交互：切换项目（模拟多项目） */}
          <Dropdown
            trigger={['click']}
            menu={{
              items: ([
                { key: 'Publisher', label: 'Publisher' },
                { key: 'Omni', label: 'Omni' },
                { key: 'Doraemon', label: 'Doraemon' },
                { key: 'core', label: 'core' },
                { key: 'Shinchan', label: 'Shinchan' }
              ] as const).map((p) => ({
                key: p.key,
                label: p.label,
                onClick: () => setSelectedProject(p.key)
              }))
            }}
          >
            <button
              type="button"
              className="interactive-soft"
              style={{
                ...headerPillStyle,
                background: 'rgba(15, 23, 42, 0.04)',
                cursor: 'pointer',
                border: 'none'
              }}
              aria-label="选择项目"
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              }}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>{selectedProject}</span>
              <DownOutlined style={{ fontSize: 12, color: 'rgba(17, 24, 39, 0.45)' }} />
            </button>
          </Dropdown>

          {/* 交互：切换资源模式（影响左侧菜单与内容） */}
          <div style={{ ...headerPillStyle, padding: '0 6px' }}>
            <Segmented
              value={mode}
              options={[
                { label: '容器', value: 'container' },
                { label: '虚机', value: 'vm' }
              ]}
              onChange={(val) => {
                // 产品意图：用同一页面承载两套资源形态（容器/虚机），减少路由与文件数量。
                const v = val as Mode
                setMode(v)
                const params = new URLSearchParams(searchParams.toString())
                params.set('mode', v)
                // 保持当前菜单不变，仅写入模式
                router.push(`${pathname}?${params.toString()}`)
              }}
            />
          </div>

          {/* 主导航：视觉为“普通文字按钮”，避免 link 视觉误导 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
            <Button
              type="text"
              style={{ borderRadius: 999, height: 36, padding: '0 10px', fontWeight: 600, color: '#111827' }}
              onClick={() => {
                // 交互：打开“打开游戏”面板（真实业务效果：打开抽屉）
                setTopNavPanel('open-game')
              }}
              icon={<PlayCircleOutlined />}
            >
              打开游戏
            </Button>
            <Button
              type="text"
              style={{ borderRadius: 999, height: 36, padding: '0 10px', fontWeight: 600, color: '#111827' }}
              onClick={() => {
                // 交互：跳转到工具页（真实业务效果：导航到 /api-test）
                router.push('/api-test')
              }}
              icon={<AppstoreOutlined />}
            >
              G123相关工具
            </Button>
            <Button
              type="text"
              style={{ borderRadius: 999, height: 36, padding: '0 10px', fontWeight: 600, color: '#111827' }}
              onClick={() => {
                // 交互：打开“帮助文档”面板（真实业务效果：打开抽屉）
                setTopNavPanel('help')
              }}
              icon={<QuestionCircleOutlined />}
            >
              帮助文档
            </Button>
          </div>
        </div>
        
        {/* 右侧功能区域：环境胶囊 + icon 组 + 用户 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 交互：切换环境（Switch：测试/正式） */}
          <div
            style={{
              ...headerPillStyle,
              padding: '0 10px',
              background: 'rgba(15, 23, 42, 0.035)',
              gap: 10
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(17, 24, 39, 0.65)' }}>
              {envLabel}
            </span>
            <Switch
              checked={isProdEnv}
              onChange={(checked) => {
                // 产品意图：用一个显式开关，快速在“测试/正式”之间切换，方便演示不同环境入口。
                setIsProdEnv(checked)
              }}
              aria-label="切换测试/正式环境"
            />
          </div>

          {/* icon 组（≥4 个时使用 icon-only + tooltip；点击区域 ≥ 32px） */}
          <div
            style={{
              ...headerPillStyle,
              padding: '0 8px',
              background: 'rgba(15, 23, 42, 0.03)',
              gap: 8
            }}
          >
            <Tooltip title="日志">
              <Button
                type="text"
                icon={<FileSearchOutlined />}
                onClick={() => {
                  // 交互：跳转到“管理中心”全页，并定位到“操作日志”
                  router.push('/management-center?key=operation-log')
                }}
                aria-label="日志"
                style={headerIconBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.12)'
                  e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)'
                }}
              />
            </Tooltip>
            <Tooltip title="数据看板">
              <Button
                type="text"
                icon={<BarChartOutlined />}
                onClick={() => {
                  // 交互：打开数据看板（真实业务效果：打开 Drawer）
                  setAnalyticsOpen(true)
                }}
                aria-label="数据看板"
                style={headerIconBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.12)'
                  e.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)'
                }}
              />
            </Tooltip>
            <Tooltip title="消息通知">
              <Button
                type="text"
                icon={<MessageOutlined />}
                onClick={() => {
                  // 交互：跳转到“管理中心”全页，并定位到“站内通知”
                  router.push('/management-center?key=site-notice')
                }}
                aria-label="消息通知"
                style={headerIconBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.12)'
                  e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.10)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)'
                }}
              />
            </Tooltip>
          </div>

          {/* 独立 icon：人员配置 */}
          <Tooltip title="人员配置">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={() => {
                // 交互：进入人员配置（真实业务效果：切换右侧内容）
                handleMenuClick('people-config')
              }}
              aria-label="人员配置"
              style={headerIconBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.12)'
                e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)'
              }}
            />
          </Tooltip>

          {/* 用户头像菜单（紧凑版，固定在最右侧） */}
          <UserAvatarMenu user={currentUser} variant="compact" />
        </div>
      </Header>

      {/* 顶栏主导航：打开游戏 / 帮助文档（抽屉承载内容，避免仅 message 提示） */}
      <Drawer
        title={topNavPanel === 'open-game' ? '打开游戏' : topNavPanel === 'help' ? '帮助文档' : ''}
        placement="right"
        width={520}
        open={topNavPanel !== null}
        onClose={() => setTopNavPanel(null)}
        destroyOnClose
      >
        {topNavPanel === 'open-game' ? (
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>启动方式（Prototype）</div>
            <div style={{ color: '#64748b', marginBottom: 12 }}>
              这里模拟“从管理后台一键打开游戏”的入口。原型不接后端，因此用弹窗/抽屉承载流程与信息。
            </div>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                // 交互：启动游戏（真实业务效果：打开确认弹窗）
                Modal.confirm({
                  title: '启动游戏（示例）',
                  content: `项目：${selectedProject}；环境：${envLabel}。确认后将模拟打开新标签页启动游戏。`,
                  okText: '确认启动',
                  cancelText: '取消',
                  onOk: () => {
                    // 交互：确认后打开新标签页（真实业务效果：window.open）
                    window.open('/', '_blank')
                  }
                })
              }}
            >
              立即启动
            </Button>
          </div>
        ) : topNavPanel === 'help' ? (
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>快速指引</div>
            <ul style={{ paddingLeft: 18, marginTop: 0 }}>
              <li>左侧菜单：按“虚机/容器”模式切换不同资源形态。</li>
              <li>右上角：可切换环境（测试/预发/生产），用于模拟不同环境入口。</li>
              <li>“G123相关工具”：跳转到接口测试工具页（Prototype）。</li>
            </ul>
          </div>
        ) : null}
      </Drawer>

      {/* 数据看板 Drawer */}
      <Drawer
        title={<span>埋点数据仪表盘</span>}
        placement="left"
        width={'100%'}
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        destroyOnClose
      >
        <PlausibleLikeDashboard />
      </Drawer>

      {/* “管理中心”已改为全页路由：/management-center */}


      <Layout style={{ background: 'transparent' }}>
        {/* 左侧导航栏：背景与主题保持一致，具体配色在 globals.css 中控制 */}
        <Sider width={200} style={{ background: 'transparent' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            defaultOpenKeys={['service', 'command']}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'client',
                icon: <MobileOutlined />,
                label: '客户端',
                children: [
                  {
                    key: 'client-version',
                    icon: <MobileOutlined />,
                    label: '版本',
                    onClick: () => handleMenuClick('client-version')
                  },
                  {
                    key: 'client-page',
                    icon: <MobileOutlined />,
                    label: 'CDN',
                    onClick: () => handleMenuClick('client-page')
                  }
                ]
              },
              {
                key: 'service',
                icon: <CloudServerOutlined />,
                label: '服务端',
                children: [
                  ...(mode === 'vm' ? [
                    {
                      key: 'vm-management',
                      icon: <CloudServerOutlined />,
                      label: '虚机',
                      onClick: () => handleMenuClick('vm-management')
                    },
                    {
                      key: 'security-group',
                      icon: <SecurityScanOutlined />,
                      label: '安全组',
                      onClick: () => handleMenuClick('security-group')
                    },
                    {
                      key: 'load-balancer',
                      icon: <CloudServerOutlined />,
                      label: '负载均衡',
                      onClick: () => handleMenuClick('load-balancer')
                    },
                    {
                      key: 'command-management',
                      icon: <CodeOutlined />,
                      label: '命令',
                      onClick: () => handleMenuClick('command-management')
                    }
                  ] : []),
                  ...(mode === 'container' ? [
                    {
                      key: 'container-app',
                      icon: <AppstoreOutlined />,
                      label: '应用',
                      onClick: () => handleMenuClick('container-app')
                    },
                    {
                      key: 'file-management',
                      icon: <CloudServerOutlined />,
                      label: '共享文件',
                      onClick: () => handleMenuClick('file-management')
                    },
                    {
                      key: 'cron-job',
                      icon: <CloudServerOutlined />,
                      label: '定时任务',
                      onClick: () => handleMenuClick('cron-job')
                    },
                  ] : []),
                  {
                    key: 'storage',
                    icon: <CloudServerOutlined />,
                    label: '存储',
                    onClick: () => handleMenuClick('container-database')
                  },
                  /*注释秘钥，因为秘钥管理功能未开发
                  {
                    key: 'key-management',
                    icon: <KeyOutlined />,
                    label: '秘钥',
                    onClick: () => handleMenuClick('key-management')
                  },
                  */
              
                ]
              },
              {
              key: 'Monitor',
              icon: <MonitorOutlined />,
              label: '监控',
              children: [
                  {
                    key: 'cdn-alert',
                    icon: <BellOutlined />,
                    label: '客户端告警',
                    onClick: () => handleMenuClick('cdn-alert')
                  },
                  {
                    key: 'alert-system',
                    icon: <BellOutlined />,
                    label: '服务端监控',
                    onClick: () => handleMenuClick('alert-system')
                  }
                ],
              },
                {
                key: 'Integration',
                icon: <CodeOutlined />,
                label: '接入',
                children: [
                  {
                    key: 'gift-management',
                    icon: <AppstoreOutlined />,
                    label: '数据推送',
                    onClick: () => handleMenuClick('gift-management')
                  },
                  {
                    key: 'message-push',
                    icon: <AppstoreOutlined />,
                    label: '消息推送',
                    onClick: () => handleMenuClick('message-push')
                  },
                  {
                    key: 'i18n',
                    icon: <AppstoreOutlined />,
                    label: '国际化',
                    onClick: () => handleMenuClick('i18n')
                  }
                ]
              },
              {
                key: 'Operations',
                icon: <AppstoreOutlined />,
                label: '运营',
                children: [
                  {
                    key: 'play',
                    icon: <AppstoreOutlined />,
                    label: '活动数据',
                    onClick: () => handleMenuClick('play')
                  },
                  {
                    key: 'gift-data',
                    icon: <AppstoreOutlined />,
                    label: '礼包道具',
                    onClick: () => handleMenuClick('gift-data')
                  }
                ]
              }
            ]}
          />
        </Sider>

        {/* 右侧内容区 */}
        <Layout style={{ padding: '24px', background: 'transparent' }}>
          <Content
            style={{
              background: 'transparent',
              padding: 0,
              margin: 0,
              minHeight: 280,
              borderRadius: 0
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
    </Suspense>
  )
}