'use client'

import { Layout, Typography, Button, Menu } from 'antd'
import { useState } from 'react'
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  BellOutlined
} from '@ant-design/icons'
import { NotificationOutlined } from '@ant-design/icons'
import GameManagement from '../../components/Admin/GameManagement'
import ResourceConfiguration from '../../components/Admin/ResourceConfiguration'
import TestInitialization from '../../components/Admin/TestInitialization'
import Announcement from '../../components/Admin/Announcement'
import YamlViewer from '../../components/Admin/yaml'
import NotificationControl from '../../components/Admin/NotificationControl'
import GlobalNoticeConfig from '../../components/Admin/GlobalNoticeConfig'

const { Header, Content, Sider } = Layout
const { Title } = Typography

type AdminMenuKey =
  | 'game-management'
  | 'resource-configuration'
  | 'test-initialization'
  | 'announcement'
  | 'global-notice-config'
  | 'yaml'
  | 'notification-control'

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
      case 'global-notice-config':
        return <GlobalNoticeConfig />
      case 'yaml':
        // YAML 备份页面
        return <YamlViewer />
      case 'notification-control':
        return <NotificationControl />
      default:
        return <GameManagement />
    }
  }



  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* 顶部导航：背景与整体主题保持一致，具体配色在 globals.css 中统一控制 */}
      <Header
        style={{
          background: 'transparent',
          padding: '0 24px',
          borderBottom: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
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

      <Layout style={{ background: 'transparent' }}>
        {/* 左侧导航栏：背景与主题保持一致，具体配色在 globals.css 中控制 */}
        <Sider width={200} style={{ background: 'transparent' }}>
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
                label: '游戏资源配置',
                onClick: () => handleMenuClick('resource-configuration')
              },
             /* {
                key: 'test-initialization',
                icon: <ExperimentOutlined />,
                label: '测试初始化',
                onClick: () => handleMenuClick('test-initialization')
              },*/
              {
                key: 'announcement',
                icon: <NotificationOutlined />,
                label: '公告管理',
                onClick: () => handleMenuClick('announcement')
              },
              {
                key: 'global-notice-config',
                icon: <BellOutlined />,
                label: '游戏通知配置',
                onClick: () => handleMenuClick('global-notice-config')
              },
              /*{
                key: 'notification-control',
                icon: <BellOutlined />,
                label: '通知总开关',
                onClick: () => handleMenuClick('notification-control')
              },*/
              {
                key: 'yaml',
                icon: <FileTextOutlined />,
                label: 'YAML 备份',
                onClick: () => handleMenuClick('yaml')
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
  )
}