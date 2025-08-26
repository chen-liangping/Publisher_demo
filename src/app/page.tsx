'use client'

import { Layout, Menu, Typography } from 'antd'
import { useState } from 'react'
import { 
  CloudServerOutlined, 
  CodeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ContainerOutlined,
  SecurityScanOutlined,
  MobileOutlined
} from '@ant-design/icons'
import VirtualMachineList from '../components/VirtualMachineServices/VirtualMachine/VirtualMachineList'
import KeyManagement from '../components/VirtualMachineServices/KeyManagement/KeyManagement'
// 详情由组件内部自管理
import FileManagement from '../components/VirtualMachineServices/FileManagement/FileManagement'
import CommandManagement from '../components/VirtualMachineServices/CommandManagement/CommandManagement'
// 命令详情由列表组件内部自管理
import UserAvatarMenu from '../components/Common/UserAvatarMenu'
import SecurityGroupManagement from '../components/VirtualMachineServices/SecurityGroup/SecurityGroupManagement'
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

const { Header, Sider, Content } = Layout
const { Title } = Typography

type MenuKey = 'vm-management' | 'key-management' | 'file-management' | 'command-management' | 'security-group' | 'container-app' | 'container-database' | 'client-page' | 'client-version' | 'cron-job' | 'gift-management' | 'play' | 'gift-data' | 'message-push'

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
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('vm-management')
  // 命令列表/详情由组件内部自管理
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

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
  }

  // VM 列表/详情由组件内部自管理

  // 命令交互逻辑内聚到组件内部

  // 安全组列表/详情由组件内部自管理

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
      default:
        return <VirtualMachineList />
    }
  }

  return (
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
        <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
          Publisher 用户平台
        </Title>
        
        {/* 用户头像菜单 */}
        <UserAvatarMenu user={currentUser} />
      </Header>

      <Layout>
        {/* 左侧导航栏 */}
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            defaultOpenKeys={['vm-app', 'container-app']}
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
                key: 'vm-app',
                icon: <CloudServerOutlined />,
                label: '服务端',
                children: [
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
                    key: 'file-management',
                    icon: <EyeOutlined />,
                    label: '共享文件',
                    onClick: () => handleMenuClick('file-management')
                  },
                  {
                    key: 'command-management',
                    icon: <CodeOutlined />,
                    label: '命令',
                    onClick: () => handleMenuClick('command-management')
                  },
                  {
                    key: 'storage',
                    icon: <CloudServerOutlined />,
                    label: '存储',
                    onClick: () => handleMenuClick('container-database')
                  },
                  {
                    key: 'cron-job',
                    icon: <CloudServerOutlined />,
                    label: '定时任务',
                    onClick: () => handleMenuClick('cron-job')
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
                key: 'container',
                icon: <ContainerOutlined />,
                label: '容器服务',
                children: [
                  {
                    key: 'container-app',
                    icon: <AppstoreOutlined />,
                    label: '应用',
                    onClick: () => handleMenuClick('container-app')
                  },
                  {
                    key: 'container-database',
                    icon: <DatabaseOutlined />,
                    label: '数据库',
                    onClick: () => handleMenuClick('container-database')
                  }
                ]
              }
              ,
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
  )
}