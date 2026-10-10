'use client'

// 国际化 · 多币种定价「添加档位」弹窗（原型）
// - 输入框默认留空，用户只填写需要的档位；上方切换「按 CNY / 按 JPY」，默认 CNY
// - 按 JPY 输入时，一个 JPY 对应汇率表中的全部 CNY 档位
// - 【导入档位】与【下载模版】放在币种切换同一行：模版按当前币种生成（表头 CNY / JPY + 示例），导入按当前币种解析，导入后直接进入预览
// - 预览只列 JPY / CNY档位；点击【确认添加】时若有值不在汇率表中则报错不添加，已配置的档位自动跳过

import React, { useMemo, useState } from 'react'
import { Modal, Segmented, Input, Button, Space, Typography, Table, Alert, Upload, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons'
import { PLATFORM_MASTER_TIERS, addGamePriceTiers } from './priceTierStore'
import type { PriceTier } from './priceTierStore'

const { Text } = Typography

type InputCurrency = 'CNY' | 'JPY'

interface PreviewRow {
  key: string
  cnyTier?: number
  jpy?: number
  /** 汇率表中命中的档位；未命中时为空（点击添加时报错） */
  tier?: PriceTier
}

interface ParseResult {
  values: number[]
  invalidTokens: string[]
}

/** 模版内容：首行为币种表头，其后每行一个档位示例 */
const TEMPLATE_CONTENT: Record<InputCurrency, string> = {
  CNY: 'CNY\n6\n30\n98\n',
  JPY: 'JPY\n120\n500\n1900\n'
}

const downloadTemplate = (currency: InputCurrency): void => {
  const blob = new Blob(['\ufeff' + TEMPLATE_CONTENT[currency]], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `price_tier_template_${currency.toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const HEADER_TOKENS = new Set(['cny', 'jpy'])

/** 解析文本：换行 / 逗号 / 空格分隔，去掉 ¥ ￥ 前缀；模版表头（CNY / JPY）忽略；其余非数字记为无法识别 */
const parseTierText = (raw: string): ParseResult => {
  const tokens = raw.split(/[\n\r,，\s]+/).map(t => t.trim()).filter(Boolean)
  const values: number[] = []
  const invalid = new Set<string>()
  tokens.forEach(token => {
    if (HEADER_TOKENS.has(token.replace(/^\ufeff/, '').toLowerCase())) return
    const cleaned = token.replace(/^[¥￥]/, '').trim()
    const n = Number(cleaned)
    if (cleaned !== '' && Number.isFinite(n)) values.push(n)
    else invalid.add(token)
  })
  return { values: Array.from(new Set(values)).sort((a, b) => a - b), invalidTokens: Array.from(invalid) }
}

interface AddPriceTierModalProps {
  open: boolean
  versionName: string
  onClose: () => void
}

export default function AddPriceTierModal({ open, versionName, onClose }: AddPriceTierModalProps): React.ReactElement {
  // 使用 useMessage（静态 message 在本项目中不渲染），contextHolder 放在 Modal 外，关闭弹窗后提示仍可见
  const [messageApi, contextHolder] = message.useMessage()
  const [currency, setCurrency] = useState<InputCurrency>('CNY')
  const [text, setText] = useState('')
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [parsed, setParsed] = useState<ParseResult>({ values: [], invalidTokens: [] })
  const [sourceLabel, setSourceLabel] = useState('')

  const reset = (): void => {
    setCurrency('CNY')
    setText('')
    setStep('input')
    setParsed({ values: [], invalidTokens: [] })
    setSourceLabel('')
  }

  const handleClose = (): void => {
    reset()
    onClose()
  }

  /** 根据输入值生成预览行：CNY 按主键匹配；JPY 展开为汇率表中全部对应的 CNY 档位；未命中的保留原值、另一列显示 - */
  const previewRows: PreviewRow[] = useMemo(() => (
    parsed.values.flatMap<PreviewRow>(v => {
      const matched = PLATFORM_MASTER_TIERS.filter(t => (currency === 'CNY' ? t.cnyTier === v : t.jpy === v))
      if (matched.length === 0) {
        return [currency === 'CNY' ? { key: `cny-${v}`, cnyTier: v } : { key: `jpy-${v}`, jpy: v }]
      }
      return matched.map(t => ({ key: `${v}-${t.cnyTier}`, cnyTier: t.cnyTier, jpy: t.jpy, tier: t }))
    })
  ), [parsed, currency])

  const goPreview = (raw: string, label: string): void => {
    const result = parseTierText(raw)
    if (result.values.length === 0) {
      messageApi.warning(`未识别到有效的 ${currency} 档位`)
      return
    }
    setParsed(result)
    setSourceLabel(label)
    setStep('preview')
  }

  /** 导入 CSV / TXT：读取文本后按当前币种解析并进入预览，不上传到服务器 */
  const handleImport = (file: File): boolean => {
    const reader = new FileReader()
    reader.onload = () => goPreview(String(reader.result ?? ''), `导入文件：${file.name}`)
    reader.onerror = () => messageApi.error('文件读取失败')
    reader.readAsText(file)
    return false
  }

  /** 确认添加：存在不在汇率表中的值则报错、不添加；否则添加（已配置的档位自动跳过） */
  const handleConfirm = (): void => {
    const notExists = previewRows.filter(r => !r.tier).map(r => (currency === 'CNY' ? r.cnyTier : r.jpy))
    if (notExists.length > 0) {
      messageApi.error(`${currency} ${notExists.join(', ')} 不存在于当前汇率表，请返回修改`)
      return
    }
    const added = addGamePriceTiers(previewRows.map(r => r.tier as PriceTier), false)
    if (added.length === 0) {
      messageApi.info('所选档位均已配置，无需添加')
    } else {
      messageApi.success(`已添加 ${added.length} 个价格档位`)
    }
    handleClose()
  }

  const columns: ColumnsType<PreviewRow> = [
    { title: 'JPY(¥)', dataIndex: 'jpy', key: 'jpy', render: (v?: number) => v ?? '-' },
    { title: 'CNY档位', dataIndex: 'cnyTier', key: 'cnyTier', render: (v?: number) => v ?? '-' }
  ]

  const inputFooter = [
    <Button key="cancel" onClick={handleClose}>取消</Button>,
    <Button key="preview" type="primary" disabled={text.trim() === ''} onClick={() => goPreview(text, '手动输入')}>预览</Button>
  ]
  const previewFooter = [
    <Button key="back" onClick={() => setStep('input')}>返回修改</Button>,
    <Button key="ok" type="primary" disabled={previewRows.length === 0} onClick={handleConfirm}>
      确认添加
    </Button>
  ]

  return (
    <>
    {contextHolder}
    <Modal
      title={step === 'input' ? '添加档位' : '添加档位 · 预览'}
      open={open}
      width={640}
      maskClosable={false}
      onCancel={handleClose}
      footer={step === 'input' ? inputFooter : previewFooter}
      destroyOnClose
    >
      {step === 'input' ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space size={12} wrap>
            <Text type="secondary">当前汇率版本：</Text>
            <Text strong>{versionName}</Text>
            <Button type="link" icon={<DownloadOutlined />} style={{ padding: 0 }} onClick={() => messageApi.success(`已下载汇率表 ${versionName}.csv`)}>下载汇率</Button>
          </Space>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Segmented<InputCurrency>
                options={[{ label: '按 CNY', value: 'CNY' }, { label: '按 JPY', value: 'JPY' }]}
                value={currency}
                onChange={setCurrency}
              />
              <Space size={16}>
                {/* 模版与导入均跟随当前币种 */}
                <Button type="link" icon={<FileTextOutlined />} style={{ padding: 0 }} onClick={() => downloadTemplate(currency)}>下载模版</Button>
                <Upload accept=".csv,.txt" showUploadList={false} beforeUpload={handleImport}>
                  <Button icon={<UploadOutlined />}>导入档位</Button>
                </Upload>
              </Space>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {currency === 'CNY'
                ? '输入需要的人民币档位，使用换行分隔多个档位；系统自动换算其他货币。'
                : '输入需要的日元价格，使用换行分隔多个价格；将添加该价格在汇率表中对应的全部 CNY 档位。'}
              <br />
              批量导入请先下载 {currency} 模版，按模版填写后导入。
            </Text>
            <Input.TextArea
              rows={10}
              allowClear
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={currency === 'CNY' ? 'e.g.\n6\n30\n98' : 'e.g.\n120\n500\n1900'}
            />
          </Space>
        </Space>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={`${sourceLabel}，按 ${currency} 解析，共 ${previewRows.length} 个档位，确认后添加到价位表（已配置的档位自动跳过）。`}
          />
          {parsed.invalidTokens.length > 0 && (
            <Alert type="warning" showIcon message={`以下内容无法识别，已忽略：${parsed.invalidTokens.join('、')}`} />
          )}
          <Table rowKey="key" size="small" columns={columns} dataSource={previewRows} pagination={false} scroll={{ y: 360 }} />
        </Space>
      )}
    </Modal>
    </>
  )
}
