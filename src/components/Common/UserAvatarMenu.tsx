'use client'

import React, { useState } from 'react'
import { Dropdown, Avatar, message } from 'antd'
import { 
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DownOutlined,
  SyncOutlined
} from '@ant-design/icons'
import DataSyncModal from './DataSyncModal'

interface UserInfo {
  name: string
  avatar: string
  role: string
}

interface UserAvatarMenuProps {
  user: UserInfo
}

export default function UserAvatarMenu({ user }: UserAvatarMenuProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false)
  const [syncModalVisible, setSyncModalVisible] = useState<boolean>(false)

  // 处理管理台跳转
  const handleGoToAdmin = (): void => {
    // 在新标签页打开管理台页面
    window.open('/admin', '_blank')
    message.success('正在跳转到管理台...')
  }

  // 处理同步数据
  const handleSyncData = (): void => {
    setSyncModalVisible(true)
    message.info('正在打开同步数据界面...')
  }

  // 处理退出登录
  const handleLogout = (): void => {
    // 模拟退出登录逻辑
    message.success('已安全退出登录')
    // 这里可以添加实际的登出逻辑，比如清除token、跳转到登录页等
    // window.location.href = '/login'
  }

  // 用户下拉菜单配置
  const userMenuItems = [
    {
      key: 'admin',
      label: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px 16px',
          transition: 'all 0.2s ease'
        }}>
          <SettingOutlined style={{ 
            marginRight: 12, 
            fontSize: '16px',
            color: '#1890ff'
          }} />
          <span style={{ fontSize: '14px' }}>管理台</span>
        </div>
      ),
      onClick: handleGoToAdmin
    },
    {
      key: 'sync-data',
      label: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px 16px',
          transition: 'all 0.2s ease'
        }}>
          <SyncOutlined style={{ 
            marginRight: 12, 
            fontSize: '16px',
            color: '#52c41a'
          }} />
          <span style={{ fontSize: '14px' }}>同步数据</span>
        </div>
      ),
      onClick: handleSyncData
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      label: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px 16px',
          transition: 'all 0.2s ease'
        }}>
          <LogoutOutlined style={{ 
            marginRight: 12, 
            fontSize: '16px',
            color: '#ff4d4f'
          }} />
          <span style={{ fontSize: '14px', color: '#ff4d4f' }}>退出登录</span>
        </div>
      ),
      onClick: handleLogout
    }
  ]

  return (
    <>
      <Dropdown
      menu={{ items: userMenuItems }}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
      trigger={['click']}
      overlayStyle={{
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        borderRadius: '8px'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '8px 16px',
          borderRadius: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: isHovered ? '#f5f5f5' : 'transparent',
          transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
          boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Avatar 
          size={36}
          src={user.avatar}
          icon={<UserOutlined />}
          style={{ 
            marginRight: 12,
            border: '2px solid #f0f0f0',
            transition: 'all 0.3s ease'
          }}
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start',
          minWidth: 0 // 防止文字溢出
        }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            lineHeight: '20px',
            color: '#262626',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '120px'
          }}>
            {user.name}
          </span>
          <span style={{ 
            fontSize: '12px', 
            color: '#8c8c8c', 
            lineHeight: '16px',
            whiteSpace: 'nowrap'
          }}>
            {user.role}
          </span>
        </div>
        <DownOutlined 
          style={{ 
            marginLeft: 12, 
            fontSize: '12px', 
            color: '#bfbfbf',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </div>
      </Dropdown>
      
      {/* 数据同步弹窗 */}
      <DataSyncModal
        open={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
      />
    </>
  )
}