'use client'

import React, { useState } from 'react'
import { Form, Radio, InputNumber, Select, Table, Button, Typography, Space, Flex, Alert, Modal, Checkbox, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { type Dayjs } from 'dayjs'

const { Text } = Typography

// 开服策略类型
export type StrategyTypeValue = 'cron' | 'strategy'
// 定时模式
export type CronMode = 'daily' | 'weekly' | 'monthly' | 'interval'
// 经过时长单位
export type AfterUnit = 'hour' | 'day'

export type StrategyRow = {
  createRole?: number
  paidUsers?: number
  afterValue?: number
  afterUnit?: AfterUnit
}

export type EffectTime = { hour: number; minute: number }

export type StrategyFormValues = {
  strategyType: StrategyTypeValue
  autoLaunchCron?: {
    mode: CronMode
    hour?: number
    minute?: number
    dayOfWeek?: number
    dayOfMonth?: number
    interval?: number
    intervalUnit?: 'hour' | 'day' | 'week'
    firstTriggerTime?: Dayjs
  }
  strategies?: StrategyRow[]
  effectPeriodType?: 'all' | 'part'
  effectPeriod?: { effectStartTime: EffectTime; effectEndTime: EffectTime }
}

// 选择开服模式：定时开服 / 策略开服（带描述，对照生产 StrategyType.SimpleSelect）
// 必须接收并转发 Form.Item 注入的 value/onChange，否则模式切换不会写回表单
const StrategyTypeSelect = (props: React.ComponentProps<typeof Radio.Group>) => (
  <Radio.Group {...props}>
    <Space direction="vertical">
      <Radio value="cron">
        <Text strong>定时开服</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>特定时间触发自动开服</Text>
      </Radio>
      <Radio value="strategy">
        <Text strong>策略开服</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          可以根据创角人数，付费人数，上次开服经过时间等条件触发自动开服
        </Text>
      </Radio>
    </Space>
  </Radio.Group>
)

// 定时开服时间配置（对照生产 CronTime.FormItem，简化为四种模式）
const CronTimeFields = () => {
  const form = Form.useFormInstance<StrategyFormValues>()
  const mode = Form.useWatch(['autoLaunchCron', 'mode'], form)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Form.Item name={['autoLaunchCron', 'mode']} noStyle rules={[{ required: true }]}>
        <Select
          options={[
            { value: 'daily', label: '每天定时执行（JST）' },
            { value: 'weekly', label: '每周定时执行（JST）' },
            { value: 'monthly', label: '每月定时执行（JST）' },
            { value: 'interval', label: '间隔固定时间执行（JST）' },
          ]}
        />
      </Form.Item>

      {mode === 'daily' ? (
        <Space.Compact>
          <Form.Item name={['autoLaunchCron', 'hour']} noStyle rules={[{ required: true, message: '请输入小时' }]}>
            <InputNumber min={0} max={23} precision={0} style={{ width: 160 }} placeholder="00" addonBefore="每天" addonAfter="时" />
          </Form.Item>
          <Form.Item name={['autoLaunchCron', 'minute']} noStyle rules={[{ required: true, message: '请输入分钟' }]}>
            <InputNumber min={0} max={59} precision={0} style={{ width: 100 }} placeholder="00" addonAfter="分" />
          </Form.Item>
          <Button style={{ background: 'rgba(0,0,0,0.02)' }} disabled>执行</Button>
        </Space.Compact>
      ) : null}

      {mode === 'weekly' ? (
        <Space.Compact>
          <Button style={{ background: 'rgba(0,0,0,0.02)' }} disabled>每周</Button>
          <Form.Item name={['autoLaunchCron', 'dayOfWeek']} noStyle rules={[{ required: true, message: '请选择星期' }]}>
            <Select
              style={{ width: 110 }}
              placeholder="选择星期"
              options={[
                { value: 0, label: '星期日' },
                { value: 1, label: '星期一' },
                { value: 2, label: '星期二' },
                { value: 3, label: '星期三' },
                { value: 4, label: '星期四' },
                { value: 5, label: '星期五' },
                { value: 6, label: '星期六' },
              ]}
            />
          </Form.Item>
          <Form.Item name={['autoLaunchCron', 'hour']} noStyle rules={[{ required: true, message: '请输入小时' }]}>
            <InputNumber min={0} max={23} precision={0} style={{ width: 100 }} placeholder="00" addonAfter="时" />
          </Form.Item>
          <Form.Item name={['autoLaunchCron', 'minute']} noStyle rules={[{ required: true, message: '请输入分钟' }]}>
            <InputNumber min={0} max={59} precision={0} style={{ width: 100 }} placeholder="00" addonAfter="分" />
          </Form.Item>
          <Button style={{ background: 'rgba(0,0,0,0.02)' }} disabled>执行</Button>
        </Space.Compact>
      ) : null}

      {mode === 'monthly' ? (
        <Space.Compact>
          <Form.Item name={['autoLaunchCron', 'dayOfMonth']} noStyle rules={[{ required: true, message: '请输入日期' }]}>
            <InputNumber min={1} max={30} precision={0} style={{ width: 180 }} placeholder="00" addonBefore="每月第" addonAfter="日" />
          </Form.Item>
          <Form.Item name={['autoLaunchCron', 'hour']} noStyle rules={[{ required: true, message: '请输入小时' }]}>
            <InputNumber min={0} max={23} precision={0} style={{ width: 100 }} placeholder="00" addonAfter="时" />
          </Form.Item>
          <Form.Item name={['autoLaunchCron', 'minute']} noStyle rules={[{ required: true, message: '请输入分钟' }]}>
            <InputNumber min={0} max={59} precision={0} style={{ width: 100 }} placeholder="00" addonAfter="分" />
          </Form.Item>
          <Button style={{ background: 'rgba(0,0,0,0.02)' }} disabled>执行</Button>
        </Space.Compact>
      ) : null}

      {mode === 'interval' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Space.Compact>
            <Button style={{ background: 'rgba(0,0,0,0.02)' }} disabled>每间隔</Button>
            <Form.Item name={['autoLaunchCron', 'interval']} noStyle rules={[{ required: true, message: '请输入' }]}>
              <InputNumber min={1} precision={0} style={{ width: 120 }} placeholder="00" />
            </Form.Item>
            <Form.Item name={['autoLaunchCron', 'intervalUnit']} noStyle rules={[{ required: true }]}>
              <Select
                style={{ width: 100 }}
                options={[
                  { value: 'hour', label: '小时' },
                  { value: 'day', label: '天' },
                  { value: 'week', label: '周' },
                ]}
              />
            </Form.Item>
            <Button style={{ background: 'rgba(0,0,0,0.02)' }} disabled>执行</Button>
          </Space.Compact>
        </div>
      ) : null}
    </div>
  )
}

// 点击编辑单元格：默认展示值文本 + 编辑图标，点击后变为输入框，失焦回填（对照生产 StrategyConfig 列渲染）
const EditableCell = ({
  name,
  listName,
  unitName,
  suffix,
}: {
  name: (string | number)[]
  listName: string
  unitName?: (string | number)[]
  suffix?: string
}) => {
  const form = Form.useFormInstance<StrategyFormValues>()
  const [editing, setEditing] = useState(false)
  // getFieldValue 需要完整路径（含 Form.List 名），Form.Item 内部用相对路径自动补前缀
  // 路径为运行期拼接的动态数组，无法满足 AntD 对 StrategyFormValues 的强键路径约束，故在此收窄类型
  type FieldNamePath = Parameters<typeof form.getFieldValue>[0]
  const value = form.getFieldValue([listName, ...name] as FieldNamePath) as number | undefined
  const unit = unitName ? (form.getFieldValue([listName, ...unitName] as FieldNamePath) as AfterUnit | undefined) : undefined

  if (editing) {
    return (
      <Space.Compact>
        <Form.Item name={name} noStyle>
          <InputNumber
            min={1}
            precision={0}
            autoFocus
            style={{ width: 90 }}
            placeholder="请输入"
            onBlur={() => setEditing(false)}
            onPressEnter={() => setEditing(false)}
          />
        </Form.Item>
        {unitName ? (
          <Form.Item name={unitName} noStyle>
            <Select
              style={{ width: 72 }}
              options={[
                { value: 'hour', label: '小时' },
                { value: 'day', label: '天' },
              ]}
            />
          </Form.Item>
        ) : null}
      </Space.Compact>
    )
  }

  return (
    <Flex align="center" justify="space-between" style={{ height: 32, cursor: 'pointer' }} onClick={() => setEditing(true)}>
      {value ? (
        <Typography.Text>
          {value}
          {unitName ? (unit === 'day' ? '天' : '小时') : suffix ? suffix : null}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary">-</Typography.Text>
      )}
      <Button size="small" type="text" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); setEditing(true) }} />
    </Flex>
  )
}

// 添加策略弹窗：勾选需要的条件并填值（对照生产 AddStrategyFormPanel）
const AddStrategyModal = ({ open, onOk, onCancel }: { open: boolean; onOk: (row: StrategyRow) => void; onCancel: () => void }) => {
  const [inner] = Form.useForm()
  const createRoleSelected = Form.useWatch('createRoleSelected', inner)
  const paidUsersSelected = Form.useWatch('paidUsersSelected', inner)
  const afterValueSelected = Form.useWatch('afterValueSelected', inner)

  return (
    <Modal
      title="添加策略"
      open={open}
      onCancel={onCancel}
      onOk={async () => {
        const v = await inner.validateFields().catch(() => null)
        if (!v) return
        if (!v.createRoleSelected && !v.paidUsersSelected && !v.afterValueSelected) {
          return
        }
        onOk({
          createRole: v.createRoleSelected ? v.createRole : undefined,
          paidUsers: v.paidUsersSelected ? v.paidUsers : undefined,
          afterValue: v.afterValueSelected ? v.afterValue : undefined,
          afterUnit: v.afterValueSelected ? v.afterUnit : undefined,
        })
        inner.resetFields()
      }}
      okText="添加"
      cancelText="取消"
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message="创角人数基于游戏客户端上报的 [g_createrole] 埋点统计，区别于服务端创角数据。"
        style={{ marginBottom: 12 }}
      />
      <Form form={inner} layout="vertical" initialValues={{ createRoleSelected: true, afterUnit: 'hour' }}>
        <Typography.Text>开服策略（满足其一触发）</Typography.Text>
        <Form.Item name="createRoleSelected" valuePropName="checked" noStyle>
          <Checkbox onChange={() => {}}>创角人数</Checkbox>
        </Form.Item>
        {createRoleSelected ? (
          <Form.Item name="createRole" rules={[{ required: true, message: '请输入创角人数' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入创角人数" addonAfter="人" />
          </Form.Item>
        ) : null}

        <Form.Item name="paidUsersSelected" valuePropName="checked" noStyle>
          <Checkbox>付费人数</Checkbox>
        </Form.Item>
        {paidUsersSelected ? (
          <Form.Item name="paidUsers" rules={[{ required: true, message: '请输入付费人数' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入付费人数" addonAfter="人" />
          </Form.Item>
        ) : null}

        <Form.Item name="afterValueSelected" valuePropName="checked" noStyle>
          <Checkbox>前次开服经过时间</Checkbox>
        </Form.Item>
        {afterValueSelected ? (
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="afterValue" rules={[{ required: true, message: '请输入' }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入" />
            </Form.Item>
            <Form.Item name="afterUnit" noStyle initialValue="hour">
              <Select
                style={{ width: 80 }}
                options={[
                  { value: 'hour', label: '小时' },
                  { value: 'day', label: '天' },
                ]}
              />
            </Form.Item>
          </Space.Compact>
        ) : null}
      </Form>
    </Modal>
  )
}

// 策略表：循环排序（上移/下移）/ 创角人数 / 付费人数 / 前次开服经过时间 / 操作（对照生产 StrategyConfig.FormTable）
const StrategyTable = () => {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <Form.List name="strategies">
      {(fields, actions) => (
        <Flex vertical gap={8}>
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={fields.map(f => ({ ...f, key: f.key }))}
            columns={[
              {
                title: '循环排序',
                dataIndex: 'name',
                key: 'strategyCycle',
                width: 130,
                render: (_, __, idx) => (
                  <Flex align="center" gap={4}>
                    <span>{idx + 1}</span>
                    {idx === 0 ? <Tag style={{ margin: 0 }}>当前策略</Tag> : null}
                    <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => actions.move(idx, idx - 1)} />
                    <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === fields.length - 1} onClick={() => actions.move(idx, idx + 1)} />
                  </Flex>
                ),
              },
              {
                title: '创角人数',
                key: 'createRole',
                width: 120,
                render: ({ name }) => <EditableCell listName="strategies" name={[name, 'createRole']} suffix="人" />,
              },
              {
                title: '付费人数',
                key: 'paidUsers',
                width: 120,
                render: ({ name }) => <EditableCell listName="strategies" name={[name, 'paidUsers']} suffix="人" />,
              },
              {
                title: '前次开服经过时间',
                key: 'afterValue',
                width: 180,
                render: ({ name }) => <EditableCell listName="strategies" name={[name, 'afterValue']} unitName={[name, 'afterUnit']} />,
              },
              {
                title: '操作',
                key: 'action',
                width: 70,
                align: 'center',
                render: ({ name }) => (
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => actions.remove(name)}>
                    删除
                  </Button>
                ),
              },
            ]}
          />
          <div>
            <Button type="link" icon={<PlusOutlined />} style={{ paddingInline: 0 }} onClick={() => setAddOpen(true)}>
              添加策略
            </Button>
            <AddStrategyModal
              open={addOpen}
              onOk={row => {
                actions.add({ ...row, afterUnit: row.afterUnit ?? 'hour' })
                setAddOpen(false)
              }}
              onCancel={() => setAddOpen(false)}
            />
          </div>
        </Flex>
      )}
    </Form.List>
  )
}

// 更新开服策略表单（对照生产 AutoLaunchStrategy）
export const AutoLaunchStrategyForm = () => {
  const form = Form.useFormInstance<StrategyFormValues>()
  const strategyType = Form.useWatch('strategyType', form)
  const effectPeriodType = Form.useWatch('effectPeriodType', form)

  return (
    <Flex vertical gap={16}>
      <Form.Item label="选择开服模式" name="strategyType" required rules={[{ required: true, message: '请选择开服模式' }]}>
        <StrategyTypeSelect />
      </Form.Item>

      {strategyType === 'cron' ? (
        <Form.Item label="配置定时开服时间" required>
          <CronTimeFields />
        </Form.Item>
      ) : null}

      {strategyType === 'strategy' ? (
        <Flex vertical gap={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            开服策略将按自上而下的顺序依次应用并循环，图表仅展示一次循环过程
          </Text>

          <Form.Item label="开服策略" required name="strategies" rules={[{ required: true, type: 'array', message: '请至少设置一个策略' }]}>
            <StrategyTable />
          </Form.Item>

          <Form.Item required label="设置允许开服时间段">
            <Flex vertical>
              <Form.Item name="effectPeriodType" noStyle>
                <Radio.Group
                  options={[
                    { value: 'all', label: '全时段' },
                    { value: 'part', label: '指定时段' },
                  ]}
                />
              </Form.Item>
              {effectPeriodType === 'part' ? (
                <Form.Item name="effectPeriod" noStyle rules={[{ required: true, message: '请输入开始时间和结束时间' }]}>
                  <EffectPeriodInput />
                </Form.Item>
              ) : null}
            </Flex>
          </Form.Item>
        </Flex>
      ) : null}
    </Flex>
  )
}

// 允许开服时间段输入（对照生产 EffectPeriod.Input：JST 起始时/分 ~ 结束时/分）
const EffectPeriodInput = ({ value, onChange }: { value?: StrategyFormValues['effectPeriod']; onChange?: (v: StrategyFormValues['effectPeriod']) => void }) => {
  const [inner] = Form.useForm<{ effectStartTime: EffectTime; effectEndTime: EffectTime }>()
  return (
    <Form
      form={inner}
      initialValues={value}
      component={false}
      onValuesChange={(_, allValues) => onChange?.(allValues)}
    >
      <Flex align="center" gap={8} style={{ marginTop: 8 }}>
        <Text>JST</Text>
        <Space.Compact>
          <Form.Item name={['effectStartTime', 'hour']} noStyle>
            <InputNumber min={0} max={23} style={{ width: 90 }} placeholder="00" addonAfter="时" />
          </Form.Item>
          <Form.Item name={['effectStartTime', 'minute']} noStyle>
            <InputNumber min={0} max={59} style={{ width: 90 }} placeholder="00" addonAfter="分" />
          </Form.Item>
        </Space.Compact>
        <Text>~</Text>
        <Space.Compact>
          <Form.Item name={['effectEndTime', 'hour']} noStyle>
            <InputNumber min={0} max={23} style={{ width: 90 }} placeholder="00" addonAfter="时" />
          </Form.Item>
          <Form.Item name={['effectEndTime', 'minute']} noStyle>
            <InputNumber min={0} max={59} style={{ width: 90 }} placeholder="00" addonAfter="分" />
          </Form.Item>
        </Space.Compact>
      </Flex>
    </Form>
  )
}
