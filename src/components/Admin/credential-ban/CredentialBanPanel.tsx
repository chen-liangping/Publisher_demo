'use client'

/**
 * 游戏详情页 ·【凭证与封禁】区块。
 *
 * 封禁（填写信息 → 资源扫描 → 完成封禁 两步流程），以及封禁的两条恢复路径：
 * - 解封：原 AK/SK 重新生效，完全恢复
 * - 轮转：原 AK/SK 永久失效并换发新密钥，恢复编辑权限，但轮转前已创建的资源转为只读
 *
 * 区块内不展示任何形式的 AK/SK（含掩码），新密钥明文只在轮转成功时展示一次。
 */

import React, { useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Input, Modal, Space, Spin, Typography, message } from 'antd'

import ScanDiffView from './ScanDiffView'
import { countBypassable, runScan } from './scan'
import { banApp, rotateKeys, unbanApp, useCredential } from './mock'
import type { ScanFinding } from './types'

const { Text, Paragraph } = Typography

type BanStep = 'form' | 'scanning' | 'result'

interface CredentialBanPanelProps {
  appId: string
}

export default function CredentialBanPanel({ appId }: CredentialBanPanelProps): React.ReactElement {
  const credential = useCredential(appId)
  const banned = credential.status === 'BANNED'
  const restricted = credential.status === 'RESTRICTED'

  // 封禁弹窗：两步流程
  const [banOpen, setBanOpen] = useState(false)
  const [banStep, setBanStep] = useState<BanStep>('form')
  const [banConfirmText, setBanConfirmText] = useState('')
  const [scanResult, setScanResult] = useState<ScanFinding[]>([])
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 解封弹窗
  const [unbanOpen, setUnbanOpen] = useState(false)
  const [unbanConfirmText, setUnbanConfirmText] = useState('')

  // 轮转弹窗 + 新密钥明文一次性展示
  const [rotateOpen, setRotateOpen] = useState(false)
  const [plainOpen, setPlainOpen] = useState(false)
  const [plainAk, setPlainAk] = useState('')
  const [plainSk, setPlainSk] = useState('')
  const [plainSaved, setPlainSaved] = useState(false)

  const closeBanModal = (): void => {
    if (scanTimer.current) clearTimeout(scanTimer.current)
    setBanOpen(false)
    setBanStep('form')
    setBanConfirmText('')
    setScanResult([])
  }

  // 强确认：App ID 输入完全一致才点亮「开始资源扫描」，封禁不需要填写理由
  const banFormValid = banConfirmText === appId
  const unbanSubmitEnabled = unbanConfirmText === appId

  const handleStartScan = (): void => {
    // 交互意图：封禁状态在扫描完成、点击【完成封禁】后才写入，扫描期间什么都没改
    setBanStep('scanning')
    scanTimer.current = setTimeout(() => {
      setScanResult(runScan(appId))
      setBanStep('result')
    }, 1500)
  }

  const handleFinishBan = (): void => {
    banApp({ appId, scan: scanResult })
    const bypass = countBypassable(scanResult)
    closeBanModal()
    message.success(
      bypass > 0
        ? `已封禁；仍有 ${bypass} 项可绕过封禁的授权待人工处置`
        : '已封禁，控制台写操作已锁定'
    )
  }

  const handleUnban = (): void => {
    unbanApp({ appId })
    setUnbanOpen(false)
    setUnbanConfirmText('')
    message.success('已解封，原 AK/SK 重新生效')
  }

  const handleRotate = (): void => {
    // 交互意图：新密钥明文只展示这一次，关闭后平台不再提供任何查看入口
    const next = rotateKeys(appId)
    setPlainAk(next.ak)
    setPlainSk(next.sk)
    setPlainSaved(false)
    setRotateOpen(false)
    setPlainOpen(true)
  }

  const banBypassCount = countBypassable(scanResult)

  return (
    // data-ban-exempt：封禁后整页写操作被锁，但本区块的解封 / 轮转入口必须保持可用
    <div data-ban-exempt="true" style={{ marginTop: 12 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 状态本身在平台游戏列表的【状态】列展示，这里不重复；只在轮转后补一条后果说明 */}
        {restricted && (
          <Alert
            type="warning"
            showIcon
            message={`该 appId 已于 ${credential.rotatedAt} 完成密钥轮转：原 AK/SK 与云厂商旧密钥已永久失效并换发新密钥，镜像与挂载页面已恢复查看与复制；此时间点之前创建的资源只能查看或删除，不能编辑，之后新建的资源不受限制。`}
          />
        )}

        {/* 危险操作区：GitHub Danger Zone 风格，与常规配置在视觉上明确隔离 */}
        <Card
          title={<Text style={{ color: '#cf1322' }}>危险操作</Text>}
          size="small"
          style={{ borderColor: 'rgba(255,77,79,0.45)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, paddingBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Text strong>{banned ? '解封（完全恢复）' : '封禁该游戏'}</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                {banned
                  ? '原 AK 与 SK 重新生效，全部写操作恢复可用，不遗留任何只读限制。'
                  : '封禁后该 appId 在测试与正式环境的全部控制台写操作立即不可用，AK/SK 调用 OpenAPI 返回 403；封禁前会先扫描一次旁路授权。'}
              </Paragraph>
            </div>
            {banned ? (
              <Button type="primary" onClick={() => setUnbanOpen(true)}>
                解封
              </Button>
            ) : (
              <Button danger type="primary" onClick={() => setBanOpen(true)}>
                封禁此游戏
              </Button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 24,
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong>轮转密钥（换钥匙恢复）</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                原 AK/SK 永久失效并换发新密钥，该游戏恢复编辑权限、可以新建资源；但轮转前已创建的资源转为只读，只能查看或删除。
              </Paragraph>
            </div>
            <Button
              danger
              onClick={() => setRotateOpen(true)}
              disabled={!banned}
              title={!banned ? '仅已封禁的游戏可执行密钥轮转' : undefined}
            >
              轮转密钥
            </Button>
          </div>
        </Card>

        <Card title="扫描差异" size="small">
          {/* 只保留最近一次封禁的扫描快照，解封与轮转都不清除 */}
          {credential.lastScan.length > 0 ? (
            <ScanDiffView findings={credential.lastScan} />
          ) : (
            <Text type="secondary">暂无扫描差异</Text>
          )}
        </Card>
      </Space>

      {/* 封禁：第一步填写信息 → 第二步资源扫描结果 → 完成封禁 */}
      <Modal
        title={banStep === 'form' ? '封禁此游戏 · 1/2 填写封禁信息' : '封禁此游戏 · 2/2 资源扫描结果'}
        open={banOpen}
        onCancel={closeBanModal}
        destroyOnHidden
        width={banStep === 'form' ? 660 : 900}
        footer={
          banStep === 'form' ? (
            <Space>
              <Button onClick={closeBanModal}>取消</Button>
              <Button danger type="primary" disabled={!banFormValid} onClick={handleStartScan}>
                开始资源扫描
              </Button>
            </Space>
          ) : (
            <Space>
              {/* 返回修改后需重新扫描，不复用上一次结果 */}
              <Button
                onClick={() => {
                  setScanResult([])
                  setBanStep('form')
                }}
                disabled={banStep === 'scanning'}
              >
                返回修改
              </Button>
              <Button
                danger
                type="primary"
                disabled={banStep === 'scanning'}
                loading={banStep === 'scanning'}
                onClick={handleFinishBan}
              >
                完成封禁
              </Button>
            </Space>
          )
        }
      >
        {banStep === 'form' && (
          <>
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message="封禁后将立即发生以下变化"
              description={
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  <li>该 appId 在测试环境与正式环境的全部控制台写操作立即不可用</li>
                  <li>该 appId 的 AK/SK 调用平台 OpenAPI 立即失败</li>
                  <li>已运行的容器应用、虚拟机、存储实例继续运行，不会被停止或删除</li>
                  <li>不影响同一 CP 下的其他 appId</li>
                  <li>封禁可随时解除</li>
                </ul>
              }
            />
            <div style={{ marginBottom: 6, fontSize: 12, color: '#666' }}>
              请输入 App ID <Text code>{appId}</Text> 以确认
            </div>
            <Input
              value={banConfirmText}
              onChange={e => setBanConfirmText(e.target.value)}
              placeholder="请输入完整 App ID"
              status={banConfirmText && banConfirmText !== appId ? 'error' : undefined}
            />
            {banConfirmText && banConfirmText !== appId && (
              <Text type="danger" style={{ fontSize: 12 }}>
                App ID 不一致
              </Text>
            )}
          </>
        )}

        {banStep === 'scanning' && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">正在扫描该 appId 的旁路授权…</Text>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                桶策略 / PAB · RAM 额外授权 · kubeconfig · VM 残留授权
              </Text>
            </div>
          </div>
        )}

        {banStep === 'result' && (
          <>
            <ScanDiffView findings={scanResult} />
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              message={
                banBypassCount > 0
                  ? '扫描结果不阻断封禁，可直接完成封禁；上述差异需人工另行处置，本次结果会随封禁记录保存。'
                  : '本次扫描结果会随封禁记录保存，后续可在封禁记录里回看。'
              }
            />
          </>
        )}
      </Modal>

      {/* 解封二次确认 */}
      <Modal
        title="解封"
        open={unbanOpen}
        onCancel={() => {
          setUnbanOpen(false)
          setUnbanConfirmText('')
        }}
        onOk={handleUnban}
        okText="确认解封"
        cancelText="取消"
        okButtonProps={{ disabled: !unbanSubmitEnabled }}
        destroyOnHidden
        width={560}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="解封后原 AK 与 SK 重新生效，全部写操作恢复可用，恢复范围为封禁前的权限配置，不遗留任何只读限制；封禁期间被拦截的操作不会被追溯执行，需要重新提交。"
        />
        <div style={{ marginBottom: 6, fontSize: 12, color: '#666' }}>
          请输入 App ID <Text code>{appId}</Text> 以确认
        </div>
        <Input
          value={unbanConfirmText}
          onChange={e => setUnbanConfirmText(e.target.value)}
          placeholder="请输入完整 App ID"
          status={unbanConfirmText && unbanConfirmText !== appId ? 'error' : undefined}
        />
        {unbanConfirmText && unbanConfirmText !== appId && (
          <Text type="danger" style={{ fontSize: 12 }}>
            App ID 不一致
          </Text>
        )}
      </Modal>

      {/* 轮转二次确认：逐项说明后果 */}
      <Modal
        title="轮转密钥"
        open={rotateOpen}
        onCancel={() => setRotateOpen(false)}
        onOk={handleRotate}
        okText="确认轮转"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnHidden
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          message="轮转后将立即发生以下变化"
          description={
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>原 AK 与 SK 立即永久失效，不保留宽限期，使用原密钥的调用全部鉴权失败</li>
              <li>平台换发一组新的 AK 与 SK，CP 需改代码替换后才能恢复调用</li>
              <li>AWS 与阿里云侧被禁用的密钥一并永久失效并换发新密钥，镜像与挂载页面恢复查看与复制</li>
              <li>该游戏恢复编辑权限，可以新建资源</li>
              <li>轮转前已创建的资源转为只读：可以查看、可以删除，不能编辑</li>
            </ul>
          }
        />
      </Modal>

      {/* 新密钥明文：只展示这一次，未勾选「我已保存」不可关闭 */}
      <Modal
        title="新密钥已生成"
        open={plainOpen}
        closable={plainSaved}
        maskClosable={false}
        keyboard={false}
        onCancel={() => setPlainOpen(false)}
        footer={
          <Button type="primary" disabled={!plainSaved} onClick={() => setPlainOpen(false)}>
            关闭
          </Button>
        }
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="新 AK / SK 仅展示这一次，关闭后平台不再提供任何查看入口；遗失只能重新轮转。"
        />
        <div style={{ marginBottom: 6, fontSize: 12, color: '#666' }}>AccessKey ID</div>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={plainAk} readOnly />
          <Button
            onClick={() => {
              void navigator.clipboard?.writeText(plainAk)
              message.success('已复制 AK')
            }}
          >
            复制
          </Button>
        </Space.Compact>
        <div style={{ height: 12 }} />
        <div style={{ marginBottom: 6, fontSize: 12, color: '#666' }}>AccessKey Secret</div>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={plainSk} readOnly />
          <Button
            onClick={() => {
              void navigator.clipboard?.writeText(plainSk)
              message.success('已复制 SK')
            }}
          >
            复制
          </Button>
        </Space.Compact>
        <div style={{ height: 12 }} />
        <Checkbox checked={plainSaved} onChange={e => setPlainSaved(e.target.checked)}>
          我已保存这组密钥
        </Checkbox>
      </Modal>
    </div>
  )
}
