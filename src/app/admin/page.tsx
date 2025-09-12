'use client'

import { Layout, Typography, Button, Menu } from 'antd'
import { useState } from 'react'
import { 
  ArrowLeftOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ExperimentOutlined
} from '@ant-design/icons'
import { NotificationOutlined } from '@ant-design/icons'
import GameManagement from '../../components/Admin/GameManagement'
import ResourceConfiguration from '../../components/Admin/ResourceConfiguration'
import TestInitialization from '../../components/Admin/TestInitialization'
import Announcement from '../../components/Admin/Announcement'

const { Header, Content, Sider } = Layout
const { Title } = Typography

type AdminMenuKey = 'game-management' | 'resource-configuration' | 'test-initialization' | 'announcement'

export default function AdminPage() {
  const [selectedMenu, setSelectedMenu] = useState<AdminMenuKey>('game-management')

  // 返回主页面
  const handleBackToMain = (): void => {
    window.close() // 如果是新标签页打开的，尝试关闭
    // 如果无法关闭，则跳转到主页
    setTimeout(() => {
      window.location.href = '/'
    }, 100)
  }

  // 菜单点击处理
  const handleMenuClick = (key: AdminMenuKey): void => {
    setSelectedMenu(key)
  }

  // 渲染右侧内容区域
  const renderContent = (): React.ReactElement => {
    switch (selectedMenu) {
      case 'game-management':
        return <GameManagement />
      case 'resource-configuration':
        return <ResourceConfiguration />
      case 'test-initialization':
        return <TestInitialization />
      case 'announcement':
        return <Announcement />
      default:
        return <GameManagement />
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
          管理台
        </Title>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBackToMain}
        >
          返回主页
        </Button>
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
                key: 'game-management',
                icon: <AppstoreOutlined />,
                label: '游戏管理',
                onClick: () => handleMenuClick('game-management')
              },
              {
                key: 'resource-configuration',
                icon: <DatabaseOutlined />,
                label: '资源配置',
                onClick: () => handleMenuClick('resource-configuration')
              },
              {
                key: 'test-initialization',
                icon: <ExperimentOutlined />,
                label: '测试初始化',
                onClick: () => handleMenuClick('test-initialization')
              },
              {
                key: 'announcement',
                icon: <NotificationOutlined />,
                label: '公告管理',
                onClick: () => handleMenuClick('announcement')
              }
            ]}
          />
        </Sider>

        {/* 右侧内容区 */}
        <Layout style={{ padding: '24px', background: '#f0f2f5' }}>
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