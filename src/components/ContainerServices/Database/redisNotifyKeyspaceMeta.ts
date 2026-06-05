/**
 * Redis notify-keyspace-events：原型用场景预设与存储映射（非运行时校验 Redis 合法性）。
 */

export type RedisNotifyKeyspaceTemplateChoice =
  | 'off'
  | 'key-expire'
  | 'eviction'
  | 'all'
  | 'custom'

export interface RedisNotifyKeyspacePresetRow {
  id: Exclude<RedisNotifyKeyspaceTemplateChoice, 'custom'>
  name: string
  /** 下发给 Redis 的参数值；关闭通知在存储层用「不下发」表示，不设此字符串 */
  param: string
  scenario: string
}

/** 内置模板（不含「自定义」选项）；`name` 为界面展示的场景文案，参数仅后端映射 */
export const REDIS_NOTIFY_KEYSPACE_PRESETS: RedisNotifyKeyspacePresetRow[] = [
  { id: 'off', name: '关闭通知', param: '', scenario: '默认' },
  { id: 'key-expire', name: 'Key 过期通知', param: 'xE', scenario: '延迟任务/落盘' },
  { id: 'eviction', name: '缓存淘汰监控', param: 'eE', scenario: 'Redis 内存监控' },
  { id: 'all', name: '全量事件通知', param: 'AKE', scenario: '调试/开发' }
]

export interface RedisNotifyFormShape {
  redisNotifyKeyspaceTemplate: RedisNotifyKeyspaceTemplateChoice
  redisNotifyKeyspaceCustomValue?: string
}

/** 表单取值 → 写入实例 mock 字段 */
export function redisNotifyFormToStorage(values: RedisNotifyFormShape): {
  redisNotifyKeyspaceEventsEnabled: boolean
  redisNotifyKeyspaceEvents?: string
} {
  const { redisNotifyKeyspaceTemplate: tid, redisNotifyKeyspaceCustomValue: raw } = values
  if (tid === 'off') {
    return { redisNotifyKeyspaceEventsEnabled: false, redisNotifyKeyspaceEvents: undefined }
  }
  if (tid === 'custom') {
    const v = String(raw ?? '').trim()
    return { redisNotifyKeyspaceEventsEnabled: true, redisNotifyKeyspaceEvents: v }
  }
  const preset = REDIS_NOTIFY_KEYSPACE_PRESETS.find((p) => p.id === tid)
  const param = preset?.param ?? ''
  return { redisNotifyKeyspaceEventsEnabled: true, redisNotifyKeyspaceEvents: param }
}

/** 实例 mock 字段 → 回填表单 */
export function redisNotifyStorageToForm(inst: {
  redisNotifyKeyspaceEventsEnabled?: boolean
  redisNotifyKeyspaceEvents?: string
}): RedisNotifyFormShape {
  if (!inst.redisNotifyKeyspaceEventsEnabled) {
    return { redisNotifyKeyspaceTemplate: 'off', redisNotifyKeyspaceCustomValue: '' }
  }
  const v = String(inst.redisNotifyKeyspaceEvents ?? '').trim()
  const preset = REDIS_NOTIFY_KEYSPACE_PRESETS.find((p) => p.id !== 'off' && p.param === v)
  if (preset) {
    return { redisNotifyKeyspaceTemplate: preset.id, redisNotifyKeyspaceCustomValue: '' }
  }
  return { redisNotifyKeyspaceTemplate: 'custom', redisNotifyKeyspaceCustomValue: v }
}

/** 列表/详情一行文案（仅场景名，不暴露底层参数字符串） */
export function formatRedisNotifySummary(inst: {
  redisNotifyKeyspaceEventsEnabled?: boolean
  redisNotifyKeyspaceEvents?: string
}): string {
  if (!inst.redisNotifyKeyspaceEventsEnabled) {
    return '关闭通知'
  }
  const v = String(inst.redisNotifyKeyspaceEvents ?? '').trim()
  const preset = REDIS_NOTIFY_KEYSPACE_PRESETS.find((p) => p.id !== 'off' && p.param === v)
  if (preset) {
    return preset.name
  }
  return v ? '其他（自定义）' : '其他（未填写）'
}
