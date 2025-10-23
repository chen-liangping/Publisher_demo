'use client'

import { Layout, Menu, Typography, Segmented, Button, Tooltip, Drawer } from 'antd'
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
  MessageOutlined
} from '@ant-design/icons'
import PlausibleLikeDashboard from '../components/Analytics/PlausibleLikeDashboard'
import VirtualMachineList from '../components/VirtualMachineServices/VirtualMachine/VirtualMachineList'
import KeyManagement from '../components/VirtualMachineServices/KeyManagement/KeyManagement'
// 详情由组件内部自管理
import FileManagement from '../components/VirtualMachineServices/FileManagement/FileManagement'
import CommandManagement from '../components/VirtualMachineServices/CommandManagement/CommandManagement'
// 命令详情由列表组件内部自管理
import UserAvatarMenu from '../components/Common/UserAvatarMenu'
import SecurityGroupManagement from '../components/VirtualMachineServices/SecurityGroup/SecurityGroupManagement'
import LoadBalancerManagement from '../components/VirtualMachineServices/LoadBalancer/LoadBalancerManagement'
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
import AlertPage from '../components/alert/alert'
import AlertHistory from '../components/alert/alert_history'
import LogPage from '../components/log'
import PeopleManagement from '../components/Common/PeopleManagement'
import MessageNotification from '../components/Common/MessageNotification'
import CdnAlert from '../components/alert/CdnAlert'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const { Header, Sider, Content } = Layout
const { Title } = Typography

type MenuKey = 'vm-management' | 'key-management' | 'file-management' | 'command-management' | 'security-group' | 'load-balancer' | 'container-app' | 'container-database' | 'client-page' | 'client-version' | 'cron-job' | 'gift-management' | 'play' | 'gift-data' | 'message-push' | 'i18n' | 'alert' | 'alert-history' | 'log' | 'people-config' | 'message-notification' | 'cdn-alert'


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
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false)
  

  // 模拟当前用户信息
  const currentUser = {
    name: 'fuyu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    role: '管理员'
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
        return <VirtualMachineList />
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
        return <LoadBalancerManagement />
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
        return <AlertPage />
      case 'alert-history':
        return <AlertHistory />
      case 'log':
        return <LogPage />
      case 'people-config':
        return <PeopleManagement />
      case 'message-notification':
        return <MessageNotification />
      case 'cdn-alert':
        return <CdnAlert />
      default:
        return <VirtualMachineList />
    }
  }

  return (
    <Suspense fallback={null}>
    <Layout style={{ minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
            Publisher 用户平台
          </Title>
          <Segmented
            value={mode}
            options={[
              { label: '容器', value: 'container' },
              { label: '虚机', value: 'vm' }
            ]}
            onChange={(val) => {
              const v = val as Mode
              setMode(v)
              const params = new URLSearchParams(searchParams.toString())
              params.set('mode', v)
              // 保持当前菜单不变，仅写入模式
              router.push(`${pathname}?${params.toString()}`)
            }}
          />
        </div>
        
        {/* 右侧功能区域 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 日志图标，仅图标不显示文字：点击后路由到日志页 */}
          <Tooltip title="日志">
            <Button
              type="text"
              icon={<FileSearchOutlined />}
              onClick={() => handleMenuClick('log')}
              aria-label="日志"
            />
          </Tooltip>
          {/* Analytics 图表入口 */}
          <Tooltip title="数据看板">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              onClick={() => setAnalyticsOpen(true)}
              aria-label="数据看板"
            />
          </Tooltip>
          {/* 消息通知入口 */}
          <Tooltip title="消息通知">
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={() => handleMenuClick('message-notification')}
              aria-label="消息通知"
            />
          </Tooltip>
          {/* 人员配置入口 */}
          <Tooltip title="人员配置">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={() => handleMenuClick('people-config')}
              aria-label="人员配置"
            />
          </Tooltip>
          {/* 用户头像菜单 */}
          <UserAvatarMenu user={currentUser} />
        </div>
      </Header>

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


      <Layout>
        {/* 左侧导航栏 */}
        <Sider width={200} style={{ background: '#fff' }}>
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
                      key: 'command-management',
                      icon: <CodeOutlined />,
                      label: '命令',
                      onClick: () => handleMenuClick('command-management')
                    },
                    {
                      key: 'load-balancer',
                      icon: <CloudServerOutlined />,
                      label: '负载均衡',
                      onClick: () => handleMenuClick('load-balancer')
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
                key: 'cdn-alert',
                icon: <BellOutlined />,
                label: 'CDN告警',
                onClick: () => handleMenuClick('cdn-alert')
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
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
              borderRadius: 8
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