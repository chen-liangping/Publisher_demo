'use client'

import { Layout, Menu, Typography } from 'antd'
import { useState } from 'react'
import { 
  CloudServerOutlined, 
  KeyOutlined, 
  FileOutlined, 
  CodeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ContainerOutlined,
  SecurityScanOutlined
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
import ContainerDatabase from '../components/ContainerServices/Database/ContainerDatabase'

const { Header, Sider, Content } = Layout
const { Title } = Typography

type MenuKey = 'vm-management' | 'key-management' | 'file-management' | 'command-management' | 'security-group' | 'container-app' | 'container-database'

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
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null)
  const [selectedSecurityGroup, setSelectedSecurityGroup] = useState<SecurityGroup | null>(null)

  // 模拟当前用户信息
  const currentUser = {
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    role: '管理员'
  }

  // 菜单点击处理：切换页面内容
  const handleMenuClick = (key: MenuKey): void => {
    setSelectedMenu(key)
    setSelectedVM(null) // 切换菜单时清除选中的虚拟机
    setSelectedCommand(null) // 切换菜单时清除选中的命令
    setSelectedSecurityGroup(null) // 切换菜单时清除选中的安全组
  }

  // 查看虚拟机详情
  const handleViewVMDetails = (vm: VirtualMachine): void => {
    setSelectedVM(vm)
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
              onOperation={(vmId: string, operation: string) => {
                console.log('VM Operation:', vmId, operation)
              }}
            />
          )
        } else {
          // 显示虚拟机列表
          return (
            <VirtualMachineList 
              onViewDetails={handleViewVMDetails} 
            />
          )
        }
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
        return <ContainerApplication />
      case 'container-database':
        return <ContainerDatabase />
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
                key: 'vm-app',
                icon: <CloudServerOutlined />,
                label: '虚机服务',
                children: [
                  {
                    key: 'vm-management',
                    icon: <CloudServerOutlined />,
                    label: '虚机',
                    onClick: () => handleMenuClick('vm-management')
                  },
                  {
                    key: 'file-management',
                    icon: <EyeOutlined />,
                    label: '文件',
                    onClick: () => handleMenuClick('file-management')
                  },
                  {
                    key: 'command-management',
                    icon: <CodeOutlined />,
                    label: '命令',
                    onClick: () => handleMenuClick('command-management')
                  },
                  /*注释秘钥，因为秘钥管理功能未开发
                  {
                    key: 'key-management',
                    icon: <KeyOutlined />,
                    label: '秘钥',
                    onClick: () => handleMenuClick('key-management')
                  },
                  */
                  {
                    key: 'security-group',
                    icon: <SecurityScanOutlined />,
                    label: '安全组',
                    onClick: () => handleMenuClick('security-group')
                  },
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