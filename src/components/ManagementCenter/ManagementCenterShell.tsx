'use client'

import React, { useEffect, useMemo } from 'react'
import { Button, Layout, Menu, Typography, Empty, Result } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppstoreOutlined,
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import LogPage from '../log'
import MessageNotification from '../nofication/MessageNotification'
import PeopleManagement from '../nofication/PeopleManagement'
import SiteNoticeConfig from '../nofication/SiteNoticeConfig'
import {
  MANAGEMENT_CENTER_ROUTES,
  type ManagementCenterKey,
  isManagementCenterKey,
  resolveManagementCenterPath
} from '../Console/routes'

const { Sider, Content } = Layout
const { Title } = Typography

/**
 * 管理中心外壳：挂在 app/management-center/layout.tsx 上，每个菜单对应独立路由。
 */
export default function ManagementCenterShell(): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 当前菜单由 URL 决定：/management-center/<...>，见 components/Console/routes.ts
  const resolvedKey = resolveManagementCenterPath(pathname)
  const activeKey: ManagementCenterKey = resolvedKey ?? 'site-notice'

  // 兼容旧链接：/management-center?key=xxx → 新路由
  useEffect(() => {
    const k = searchParams.get('key')
    if (!k) return
    // 历史 key=notice-config（旧"通知配置"页面）已移除菜单入口，落到"站内通知配置"
    const target = k === 'notice-config' ? 'notice-config-site-notice' : k
    if (isManagementCenterKey(target)) router.replace(MANAGEMENT_CENTER_ROUTES[target])
  }, [searchParams, router])

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
        // 注意：Menu 的 key 必须全局唯一；这里用 parent key 避免与子项 notice-config 冲突
        key: 'notice-config-parent',
        icon: <SettingOutlined />,
        label: '通知配置',
        children: [
          { key: 'notice-config-site-notice', label: '站内通知配置' },
          { key: 'notice-owner', label: '通知负责人配置' },
          { key: 'notice-channel', label: '通知方式管理' }
        ]
      }
    ],
    []
  )

  const renderContent = (): React.ReactElement => {
    if (resolvedKey === null) {
      return (
        <Result
          status="404"
          title="页面不存在"
          subTitle={`没有与 ${pathname} 对应的管理中心菜单`}
          extra={<Button type="primary" onClick={() => syncUrl('site-notice')}>返回站内通知</Button>}
        />
      )
    }
    switch (activeKey) {
      case 'operation-log':
        // 需求：日志页面内容不变，仅作为"管理中心"中的一个入口收拢。
        return <LogPage />
      case 'site-notice':
        // 需求：站内通知为"整页内容"，不再包一层弹窗容器。
        return <MessageNotification containerPadding={0} />
      case 'notice-config-site-notice':
        return <SiteNoticeConfig />
      case 'notice-owner':
        return <PeopleManagement initialActiveTab="people" />
      case 'notice-channel':
        return <PeopleManagement initialActiveTab="webhook" />
      default:
        return <MessageNotification containerPadding={0} />
    }
  }

  const syncUrl = (k: ManagementCenterKey): void => {
    router.push(MANAGEMENT_CENTER_ROUTES[k])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(15, 23, 42, 0.04)' }}>
      {/* 右上角关闭：全页模式下返回上一页（或回到首页） */}
      <Button
        type="text"
        aria-label="关闭管理中心"
        icon={<CloseOutlined />}
        onClick={() => {
          // 交互逻辑：从"管理中心"返回用户之前所在页面，尽量贴近"关闭"体验。
          router.back()
          // 若没有历史记录，back 可能无效；这里补一个轻量兜底。
          setTimeout(() => {
            // 简单判断：如果仍在本页，则跳回首页
            if (window.location.pathname.includes('/management-center')) router.push('/')
          }, 50)
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

      {/* 全页模式：主容器铺满宽度，避免左右留白过大 */}
      <div style={{ margin: '56px 0 0', paddingInline: 0 }}>
        <div
          className="pp-mc-panel"
          style={{
            background: '#fff',
            borderRadius: 0,
            overflow: 'hidden',
            boxShadow: 'none',
            borderTop: '1px solid rgba(148, 163, 184, 0.22)'
          }}
        >
          <Layout style={{ background: '#fff' }}>
            <Sider
              width={240}
              theme="light"
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
                theme="light"
                selectedKeys={[activeKey]}
                defaultOpenKeys={['notice-config-parent']}
                style={{ background: 'transparent', borderRight: 0, paddingInline: 8 }}
                items={items}
                onClick={({ key }) => {
                  // 交互逻辑：点击左侧菜单切换右侧内容区（收拢后的信息架构入口）。
                  if (!isManagementCenterKey(key)) return
                  syncUrl(key)
                }}
              />
            </Sider>

            <Content style={{ padding: 16, minHeight: 'calc(100vh - 56px)', background: '#fff' }}>
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
    </div>
  )
}

