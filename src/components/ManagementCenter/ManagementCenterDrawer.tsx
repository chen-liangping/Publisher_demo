'use client'

import React, { useMemo } from 'react'
import { Button, Drawer, Layout, Menu, Typography, Empty } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppstoreOutlined,
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  CloseOutlined
} from '@ant-design/icons'
import LogPage from '../log'
import MessageNotification from '../nofication/MessageNotification'
import AlertPage from '../nofication/alert'
import AdminNotificationGate from '../nofication/AdminNotificationGate'
import PeopleManagement from '../nofication/PeopleManagement'

const { Sider, Content } = Layout
const { Title } = Typography

export type ManagementCenterKey =
  | 'operation-log'
  | 'site-notice'
  | 'notice-config'
  | 'notice-config-site-notice'
  | 'notice-owner'
  | 'notice-channel'

export default function ManagementCenterDrawer(props: {
  open: boolean
  activeKey: ManagementCenterKey
  onClose: () => void
  onChangeActiveKey: (key: ManagementCenterKey) => void
}): React.ReactElement {
  const items: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'operation-log',
        icon: <FileTextOutlined />,
        label: '操作日志'
      },
      {
        key: 'site-notice',
        icon: <BellOutlined />,
        label: '站内通知'
      },
      {
        key: 'notice-config-group',
        type: 'group',
        label: '通知配置'
      },
      {
        key: 'notice-config',
        icon: <SettingOutlined />,
        label: '通知配置',
        children: [
          {
            key: 'notice-config',
            label: '通知配置'
          },
          {
            key: 'notice-config-site-notice',
            label: '站内通知配置'
          },
          {
            key: 'notice-owner',
            label: '通知负责人配置'
          },
          {
            key: 'notice-channel',
            label: '通知方式管理'
          }
        ]
      }
    ],
    []
  )

  const renderContent = (): React.ReactElement => {
    switch (props.activeKey) {
      case 'operation-log':
        // 需求：日志页面内容不变，仅作为“管理中心”中的一个入口收拢。
        return <LogPage />
      case 'site-notice':
        // 需求：与“操作日志”在同一内容容器内对齐边距，避免组件内部 padding 造成不一致。
        return <MessageNotification containerPadding={0} />
      case 'notice-config':
        // 交互逻辑：通知配置同样受管理员“通知总开关”控制（关闭时只读且不可操作）。
        return (
          <AdminNotificationGate>
            <AlertPage />
          </AdminNotificationGate>
        )
      case 'notice-config-site-notice':
        return (
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 16 }}>站内通知配置</div>
            <Empty description="原型暂未实现站内通知规则配置（仅展示菜单结构）" />
          </div>
        )
      case 'notice-owner':
        return <PeopleManagement initialActiveTab="people" />
      case 'notice-channel':
        return <PeopleManagement initialActiveTab="webhook" />
      default:
        return <LogPage />
    }
  }

  const selectedKey: ManagementCenterKey = props.activeKey

  return (
    <Drawer
      open={props.open}
      onClose={props.onClose}
      placement="right"
      width={'100%'}
      destroyOnClose
      closable={false}
      styles={{
        body: {
          padding: 0,
          background: 'rgba(15, 23, 42, 0.04)'
        }
      }}
    >
      {/* 顶层关闭按钮（Figma：右上角独立关闭） */}
      <Button
        type="text"
        aria-label="关闭管理中心"
        icon={<CloseOutlined />}
        onClick={() => {
          // 交互逻辑：关闭“管理中心”面板，回到原页面。
          props.onClose()
        }}
        style={{
          position: 'fixed',
          right: 24,
          top: 16,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.85)',
          boxShadow: '0 10px 28px rgba(15,23,42,0.10)',
          backdropFilter: 'blur(10px)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      />

      <div style={{ maxWidth: 1240, margin: '56px auto 24px', paddingInline: 18 }}>
        <div
          className="pp-mc-panel"
          style={{
            background: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(15, 23, 42, 0.10)'
          }}
        >
          <Layout style={{ background: '#fff' }}>
            <Sider
              width={240}
              style={{
                background: 'rgba(15, 23, 42, 0.02)',
                borderRight: '1px solid rgba(148, 163, 184, 0.22)'
              }}
            >
              <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'rgba(37, 99, 235, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb'
                  }}
                >
                  <AppstoreOutlined />
                </div>
                <Title level={5} style={{ margin: 0 }}>
                  管理中心
                </Title>
              </div>

              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                defaultOpenKeys={['notice-config']}
                style={{ background: 'transparent', borderRight: 0, paddingInline: 8 }}
                items={items}
                onClick={({ key }) => {
                  // 交互逻辑：点击左侧菜单切换右侧内容区（收拢后的信息架构入口）。
                  const k = key as ManagementCenterKey
                  props.onChangeActiveKey(k)
                }}
              />
            </Sider>

            <Content style={{ padding: 16, minHeight: 720, background: '#fff' }}>
              {renderContent()}
            </Content>
          </Layout>
        </div>
      </div>

      {/* 仅在管理中心容器内，统一修正 Tag 视觉：全圆角、无描边（不改子页面内容）。 */}
      <style>{`
        .pp-mc-panel .ant-tag {
          border-radius: 999px !important;
          border: none !important;
        }
      `}</style>
    </Drawer>
  )
}

