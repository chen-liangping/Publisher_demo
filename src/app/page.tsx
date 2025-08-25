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
import VirtualMachineDetails from '../components/VirtualMachineServices/VirtualMachine/VirtualMachineDetails'
import FileManagement from '../components/VirtualMachineServices/FileManagement/FileManagement'
import CommandManagement from '../components/VirtualMachineServices/CommandManagement/CommandManagement'
import PromptManager from '../components/VirtualMachineServices/CommandManagement/PromptManager'
import UserAvatarMenu from '../components/Common/UserAvatarMenu'
import SecurityGroupManagement from '../components/VirtualMachineServices/SecurityGroup/SecurityGroupManagement'
import SecurityGroupDetails from '../components/VirtualMachineServices/SecurityGroup/SecurityGroupDetails'
import ContainerApplication from '../components/ContainerServices/Application/ContainerApplication'
import { apps as demoApps } from '../components/ContainerServices/Application/apps'
import Deployment from '../components/ContainerServices/Application/deployment'
import DeploymentOther from '../components/ContainerServices/Application/deployment_other'
import ContainerDatabase from '../components/ContainerServices/Database/ContainerDatabase'
import DatabaseDetails from '../components/ContainerServices/Database/DatabaseDetails'
import ClientPage from '../components/Client/ClientPage'
import ClientVersionPage from '../components/Client/ClientVersionPage'
import Task from '../components/task/task'
import GiftManagment from '../components/gift_managment/gift_managment'
import MessagePush from '../components/message/MessagePush'
import PlayPage from '../components/play/play'
import GiftDataPage from '../components/giftdata/giftdata'

const { Header, Sider, Content } = Layout
const { Title } = Typography

type MenuKey = 'vm-management' | 'key-management' | 'file-management' | 'command-management' | 'security-group' | 'container-app' | 'container-database' | 'client-page' | 'client-version' | 'cron-job' | 'gift-management' | 'play' | 'gift-data' | 'message-push'

// 虚拟机数据类型定义
interface VirtualMachine {
  id: string
  name: string
  alias: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  spec: string
  systemImage: string
  privateIp: string
  publicIp?: string
  createTime: string
  domain: string
  sslCertName?: string
  systemDiskSize?: number
  dataDiskSize?: number
  keyPair?: string
  loginUser?: string
  securityGroup?: string
  securityGroupName?: string
}

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

// 安全组数据类型定义
interface SecurityGroup {
  id: string
  name: string
  description: string
  inboundRules: number
  outboundRules: number
  createTime: string
  rules: SecurityRule[]
  boundInstances?: string[]
}

// 安全规则数据类型定义
interface SecurityRule {
  id: string
  direction: 'inbound' | 'outbound'
  protocol: 'TCP' | 'UDP' | 'ICMPv4' | 'ICMPv6' | 'ALL'
  portRange: string | string[] // 支持单个端口或多个端口
  action: 'allow' | 'deny'
  source: string
  priority: number
  description?: string
}

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('vm-management')
  const [selectedVM, setSelectedVM] = useState<VirtualMachine | null>(null)
  // 将虚拟机列表状态上提到父组件，方便从详情页同步更新
  const [vmList, setVmList] = useState<VirtualMachine[]>([
    {
      id: 'i-bp1234567890abcdef',
      name: 'web-server-01',
      alias: 'Web服务器1',
      status: 'running',
      spec: '4c.8G',
      systemImage: 'CentOS 7.9 64位',
      privateIp: '172.16.0.10',
      publicIp: '47.96.123.45',
      createTime: '2024-01-15 10:30:00',
      domain: 'g123-web01.com',
      systemDiskSize: 40,
      dataDiskSize: 100,
      loginUser: 'appid',
      securityGroup: 'sg-001',
      securityGroupName: 'default-web',
      sslCertName: 'letsencrypt'
    },
    {
      id: 'i-bp0987654321fedcba',
      name: 'db-server-01',
      alias: '数据库服务器',
      status: 'stopped',
      spec: '8c.16G',
      systemImage: 'Ubuntu 18.04 64位',
      privateIp: '172.16.0.11',
      createTime: '2024-01-14 15:20:00',
      domain: 'g123-db01.com',
      systemDiskSize: 60,
      loginUser: 'appid',
      securityGroup: 'sg-002',
      securityGroupName: 'database-group',
      sslCertName: 'db-cert'
    }
  ])
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null)
  const [selectedSecurityGroup, setSelectedSecurityGroup] = useState<SecurityGroup | null>(null)
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
    setSelectedVM(null) // 切换菜单时清除选中的虚拟机
    setSelectedCommand(null) // 切换菜单时清除选中的命令
    setSelectedSecurityGroup(null) // 切换菜单时清除选中的安全组
    setSelectedAppId(null)
  }

  // 查看虚拟机详情
  const handleViewVMDetails = (vm: VirtualMachine): void => {
    setSelectedVM(vm)
  }

  // 从详情页或其它子组件接收操作通知（例如更新 publicIp）
  const handleVMOperationFromDetails = (vmId: string, operation: string, payload?: string | undefined) => {
    if (operation === 'updatePublicIp') {
      const updated = vmList.map(v => v.id === vmId ? { ...v, publicIp: payload } : v)
      setVmList(updated)
      // 如果当前正在查看的虚机是被修改的那一台，也同步更新 selectedVM
      if (selectedVM && selectedVM.id === vmId) {
        setSelectedVM({ ...(selectedVM as VirtualMachine), publicIp: payload })
      }
    }
  }

  // 返回虚拟机列表
  const handleBackToList = (): void => {
    setSelectedVM(null)
  }

  // 查看命令详情
  const handleViewCommandDetails = (command: Command): void => {
    setSelectedCommand(command)
  }

  // 返回命令列表
  const handleBackToCommandList = (): void => {
    setSelectedCommand(null)
  }

  // 编辑命令（占位函数）
  const handleEditCommand = (command: Command): void => {
    // TODO: 实现编辑命令功能
    console.log('Edit command:', command)
  }

  // 执行命令（占位函数）
  const handleExecuteCommand = (command: Command): void => {
    // TODO: 实现执行命令功能
    console.log('Execute command:', command)
  }

  // 查看安全组详情
  const handleViewSecurityGroupDetails = (group: SecurityGroup): void => {
    setSelectedSecurityGroup(group)
  }

  // 返回安全组列表
  const handleBackToSecurityGroupList = (): void => {
    setSelectedSecurityGroup(null)
  }

  // 渲染右侧内容区域
  const renderContent = (): React.ReactElement => {
    switch (selectedMenu) {
      case 'vm-management':
        if (selectedVM) {
          // 显示虚拟机详情页
          return (
            <VirtualMachineDetails 
              vm={selectedVM} 
              onBack={handleBackToList}
              onOperation={handleVMOperationFromDetails}
            />
          )
        } else {
          // 显示虚拟机列表
          return (
            <VirtualMachineList 
              onViewDetails={handleViewVMDetails} 
              vmList={vmList}
              setVmList={setVmList}
            />
          )
        }
      case 'cron-job':
        return <Task />
      case 'key-management':
        return <KeyManagement />
      case 'file-management':
        return <FileManagement />
      case 'command-management':
        if (selectedCommand) {
          // 显示命令详情页（prompt-manager）
          return (
            <PromptManager
              command={selectedCommand}
              onBack={handleBackToCommandList}
              onEdit={handleEditCommand}
              onExecute={handleExecuteCommand}
            />
          )
        } else {
          // 显示命令列表
          return (
            <CommandManagement 
              onViewDetails={handleViewCommandDetails}
            />
          )
        }
      case 'security-group':
        if (selectedSecurityGroup) {
          // 显示安全组详情页
          return (
            <SecurityGroupDetails 
              group={selectedSecurityGroup} 
              onBack={handleBackToSecurityGroupList}
            />
          )
        } else {
          // 显示安全组列表
          return (
            <SecurityGroupManagement 
              onViewDetails={handleViewSecurityGroupDetails}
            />
          )
        }
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
        return <PlayPage />
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
              /*
              {
                key: 'gift-management',
                icon: <AppstoreOutlined />,
                label: '运营数据',
                onClick: () => handleMenuClick('gift-management')
              }
              ,
              {
                key: 'message-push',
                icon: <AppstoreOutlined />,
                label: '消息推送',
                onClick: () => handleMenuClick('message-push')
              }
              ,
              {
                key: 'play',
                icon: <AppstoreOutlined />,
                label: '活动数据',
                onClick: () => handleMenuClick('play')
              }
              ,
              {
                key: 'gift-data',
                icon: <AppstoreOutlined />,
                label: '礼包道具',
                onClick: () => handleMenuClick('gift-data')
              }
              */
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