'use client'

import { Layout, Menu, Typography } from 'antd'
import { useState } from 'react'
import { CloudServerOutlined, KeyOutlined, FileOutlined, CodeOutlined } from '@ant-design/icons'
import VirtualMachineList from '../components/VirtualMachineList'
import KeyManagement from '../components/KeyManagement'
import VirtualMachineDetails from '../components/VirtualMachineDetails'
import FileManagement from '../components/FileManagement'
import CommandManagement from '../components/CommandManagement'
import PromptManager from '../components/PromptManager'

const { Header, Sider, Content } = Layout
const { Title } = Typography

type MenuKey = 'vm-management' | 'key-management' | 'file-management' | 'command-management'

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

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('vm-management')
  const [selectedVM, setSelectedVM] = useState<VirtualMachine | null>(null)
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null)

  // 菜单点击处理：切换页面内容
  const handleMenuClick = (key: MenuKey): void => {
    setSelectedMenu(key)
    setSelectedVM(null) // 切换菜单时清除选中的虚拟机
    setSelectedCommand(null) // 切换菜单时清除选中的命令
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
      default:
        return <VirtualMachineList />
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
          虚拟机管理平台
        </Title>
      </Header>

      <Layout>
        {/* 左侧导航栏 */}
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'vm-management',
                icon: <CloudServerOutlined />,
                label: '虚拟机管理',
                onClick: () => handleMenuClick('vm-management')
              },
              {
                key: 'file-management',
                icon: <FileOutlined />,
                label: '文件管理',
                onClick: () => handleMenuClick('file-management')
              },
              {
                key: 'command-management',
                icon: <CodeOutlined />,
                label: '命令管理',
                onClick: () => handleMenuClick('command-management')
              },
              {
                key: 'key-management',
                icon: <KeyOutlined />,
                label: '秘钥管理',
                onClick: () => handleMenuClick('key-management')
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