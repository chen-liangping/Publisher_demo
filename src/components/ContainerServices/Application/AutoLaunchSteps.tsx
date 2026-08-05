'use client'

import React from 'react'
import { Typography, Tag, Button, Tooltip, Modal } from 'antd'
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  LinkOutlined,
  RightOutlined,
} from '@ant-design/icons'
import type { ActionStep, ActionStepStatus } from './autoLaunchMock'

const { Text } = Typography

// 步骤状态 → 展示配置（标题 / 图标 / 颜色）
const STATUS_META: Record<ActionStepStatus, { title: string; icon: React.ReactNode; color: string | undefined }> = {
  need_execute: { title: '等待执行', icon: <ArrowRightOutlined />, color: undefined },
  executing: { title: '执行中', icon: <LoadingOutlined spin />, color: '#1677ff' },
  wait_callback: { title: '等待回调', icon: <LoadingOutlined spin />, color: '#faad14' },
  ok: { title: '', icon: <CheckCircleFilled />, color: '#52c41a' },
  failed: { title: '失败', icon: <CloseCircleFilled />, color: '#ff4d4f' },
}

// 开服步骤列表：按后端状态直接展示（不做延迟动画）
// 含：文档外链、错误详情弹窗、等待回调可手动触发回调
export default function AutoLaunchSteps({
  steps,
  onTriggerCallback,
}: {
  steps: ActionStep[]
  onTriggerCallback?: (step: ActionStep) => void
}) {
  const [errorStep, setErrorStep] = React.useState<ActionStep | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map(step => {
        const meta = STATUS_META[step.status]
        return (
          <div key={step.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 步骤标题 + 文档外链 */}
            <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Text>{step.title}</Text>
              {step.docLink ? (
                <Tooltip title="打开新页面查看文档">
                  <Button
                    type="text"
                    size="small"
                    href={step.docLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<LinkOutlined />}
                    style={{ color: 'rgba(0,0,0,0.45)' }}
                  />
                </Tooltip>
              ) : null}
            </div>

            {/* 状态标签：有错误时渲染为可点击按钮，弹出错误详情 */}
            {step.errMsg ? (
              <Button
                size="small"
                type="text"
                icon={meta.icon}
                style={{ color: meta.color, paddingInline: 4 }}
                onClick={() => setErrorStep(step)}
              >
                {meta.title}
                <RightOutlined style={{ fontSize: 12 }} />
              </Button>
            ) : (
              <Tag
                style={{
                  borderRadius: 999,
                  border: 0,
                  background: 'transparent',
                  color: meta.color ?? 'rgba(0,0,0,0.25)',
                  margin: 0,
                  paddingInline: 4,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {meta.icon}
                  {meta.title}
                  {/* 等待回调：允许手动触发回调 */}
                  {step.status === 'wait_callback' && onTriggerCallback ? (
                    <Button
                      size="small"
                      type="link"
                      style={{ paddingInline: 0, height: 'auto' }}
                      onClick={() => onTriggerCallback(step)}
                    >
                      触发回调
                    </Button>
                  ) : null}
                </span>
              </Tag>
            )}
          </div>
        )
      })}

      {/* 错误详情弹窗：受控声明式，挂在 React 树内 */}
      <Modal
        title={errorStep?.title}
        open={errorStep != null}
        onCancel={() => setErrorStep(null)}
        footer={<Button onClick={() => setErrorStep(null)}>关闭</Button>}
        width={640}
      >
        <pre
          style={{
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#ff4d4f',
            fontFamily: 'Menlo, Consolas, "Courier New", monospace',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            margin: 0,
            fontSize: 13,
          }}
        >
          {errorStep?.errMsg}
        </pre>
      </Modal>
    </div>
  )
}
