/**
 * Redis Top Key 监控：基于阿里云官方文档的类型定义与 Mock 数据
 * 参考：https://help.aliyun.com/zh/redis/user-guide/use-the-real-time-key-statistics-feature
 */

import type { ColumnsType } from 'antd/es/table'

// ========== 数据结构定义 ==========

// Redis Key 数据类型（包含 Tair 自研类型）
export type RedisKeyType =
  // Redis 原生类型
  | 'String'
  | 'List'
  | 'Hash'
  | 'Set'
  | 'Zset'
  | 'Stream'
  // Tair 自研类型
  | 'TairString'
  | 'TairHash'
  | 'TairGIS'
  | 'TairBloom'
  | 'TairDoc'
  | 'TairCpc'
  | 'TairZset'
  | 'TairRoaring'
  | 'TairTS'
  | 'TairSearch'
  | 'not-exist-key' // 热Key统计中可能出现的Key不存在的情况

// 统计类型
export type StatType = 'realtime' | 'history'

// 大Key统计类型
export type BigKeyStatType = 'element' | 'memory'

// 热Key统计类型
export type HotKeyStatType = 'qps' | 'traffic'

// ========== 大Key相关数据结构 ==========

// 大Key（子元素数量）
export interface BigKeyByElement {
  key: string                    // Key名称
  type: RedisKeyType             // 数据类型
  elementCount: number           // 元素数量
  dbIndex: number                // 数据库索引（0-15）
  nodeId?: string                // 节点ID（集群架构）
}

// 大Key（内存占用）
export interface BigKeyByMemory {
  key: string                    // Key名称
  type: RedisKeyType             // 数据类型
  totalMemory: number            // Key的总内存占用（字节）
  totalMemoryFormatted: string   // 格式化后的内存
  avgFieldMemory: number         // 平均字段内存占用（字节）
  avgFieldMemoryFormatted: string // 格式化后的平均字段内存
  dbIndex: number                // 数据库索引（0-15）
  nodeId?: string                // 节点ID（集群架构）
}

// ========== 热Key相关数据结构 ==========

// 热Key（QPS）
export interface HotKeyByQPS {
  key: string                    // Key名称
  type: RedisKeyType             // 数据类型
  qps: number                    // 每秒查询次数
  dbIndex: number                // 数据库索引（0-15）
  nodeId?: string                // 节点ID（集群架构）
}

// 热Key（流量）
export interface HotKeyByTraffic {
  key: string                    // Key名称
  type: RedisKeyType             // 数据类型
  ingressTraffic: number         // 入流量（字节/秒）
  ingressTrafficFormatted: string // 格式化后的入流量
  egressTraffic: number          // 出流量（字节/秒）
  egressTrafficFormatted: string // 格式化后的出流量
  qps: number                    // 访问频次（QPS）
  dbIndex: number                // 数据库索引（0-15）
  nodeId?: string                // 节点ID（集群架构）
}

// ========== 统计阈值配置 ==========

// 大Key统计阈值
export interface BigKeyThreshold {
  elementThreshold: number       // bigkey-threshold，默认2000
  memoryThreshold: number        // bigkey-mem-threshold，默认500MB
  fieldMemoryThreshold: number   // bigkey-field-mem-threshold，默认1MB
}

// 热Key统计阈值
export interface HotKeyThreshold {
  qpsThreshold: number           // hotkey-threshold，默认5000
  trafficThreshold: number       // #no_loose_high-cost-key-traffic-bytes-threshold，默认1MB/s
}

// ========== 查询选项 ==========

// 历史数据查询时间范围
export interface HistoryTimeRange {
  startTime: string              // ISO格式时间字符串
  endTime: string                // ISO格式时间字符串
}

// 节点信息（集群架构/读写分离架构）
export interface NodeInfo {
  nodeId: string
  nodeRole: 'master' | 'slave' | 'proxy'
  nodeIp: string
  nodePort: number
}

// ========== 格式化工具函数 ==========

// 格式化内存大小
export function formatMemory(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 格式化流量
export function formatTraffic(bytesPerSecond: number): string {
  return formatMemory(bytesPerSecond) + '/s'
}

// 格式化QPS
export function formatQPS(qps: number): string {
  if (qps >= 1000000) return `${(qps / 1000000).toFixed(2)}M`
  if (qps >= 1000) return `${(qps / 1000).toFixed(2)}K`
  return `${qps.toFixed(2)}`
}

// 格式化元素数量
export function formatElements(count: number): string {
  return `${count}`
}

// ========== Key类型映射 ==========

// Key类型颜色映射
export const KEY_TYPE_COLOR_MAP: Record<RedisKeyType, string> = {
  'String': 'blue',
  'List': 'green',
  'Hash': 'orange',
  'Set': 'purple',
  'Zset': 'red',
  'Stream': 'cyan',
  'TairString': 'lime',
  'TairHash': 'gold',
  'TairGIS': 'magenta',
  'TairBloom': 'volcano',
  'TairDoc': 'geekblue',
  'TairCpc': 'purple',
  'TairZset': 'red',
  'TairRoaring': 'orange',
  'TairTS': 'cyan',
  'TairSearch': 'blue',
  'not-exist-key': 'default'
}

// Key类型中文标签
export const KEY_TYPE_LABEL_MAP: Record<RedisKeyType, string> = {
  'String': 'String',
  'List': 'List',
  'Hash': 'Hash',
  'Set': 'Set',
  'Zset': 'Zset',
  'Stream': 'Stream',
  'TairString': 'TairString',
  'TairHash': 'TairHash',
  'TairGIS': 'TairGIS',
  'TairBloom': 'TairBloom',
  'TairDoc': 'TairDoc',
  'TairCpc': 'TairCpc',
  'TairZset': 'TairZset',
  'TairRoaring': 'TairRoaring',
  'TairTS': 'TairTS',
  'TairSearch': 'TairSearch',
  'not-exist-key': '不存在的Key'
}

// ========== Mock数据生成函数 ==========

// Redis原生数据类型
const REDIS_NATIVE_TYPES: RedisKeyType[] = ['String', 'List', 'Hash', 'Set', 'Zset', 'Stream']

// 生成随机Key名称
function generateRandomKey(prefix: string, index: number): string {
  const suffixes = ['user', 'session', 'cache', 'inventory', 'order', 'product', 'rank', 'leaderboard', 'chat', 'log', 'data', 'config', 'stats', 'metric', 'trace']
  const suffix = suffixes[index % suffixes.length]
  return `${prefix}:${suffix}:${String(index + 1).padStart(4, '0')}`
}

// 生成大Key（子元素数量）Mock数据
export function generateMockBigKeysByElement(instanceId: string, count: number = 18): BigKeyByElement[] {
  const result: BigKeyByElement[] = []
  const types: RedisKeyType[] = ['Hash', 'Set', 'Zset', 'List', 'TairHash']

  // 每种类型最多3个
  types.forEach(type => {
    for (let i = 0; i < 3; i++) {
      const elementCount = Math.floor(Math.random() * 3000) + 2000 // 2000-5000
      result.push({
        key: generateRandomKey('bigkey', result.length),
        type,
        elementCount,
        dbIndex: Math.floor(Math.random() * 16),
        nodeId: `node-${Math.floor(Math.random() * 3)}`
      })
    }
  })

  // 按元素数量降序排序
  return result.sort((a, b) => b.elementCount - a.elementCount)
}

// 生成大Key（内存占用）Mock数据
export function generateMockBigKeysByMemory(instanceId: string, count: number = 12): BigKeyByMemory[] {
  const result: BigKeyByMemory[] = []
  const types: RedisKeyType[] = ['String', 'Hash', 'TairString', 'TairHash']

  // 每种类型最多3个
  types.forEach(type => {
    for (let i = 0; i < 3; i++) {
      const totalMemory = Math.floor(Math.random() * 1024 * 1024 * 500) + 1024 * 1024 // 1MB - 501MB
      const avgFieldMemory = Math.floor(Math.random() * 1024 * 1024 * 10) + 1024 * 1024 // 1MB - 11MB

      result.push({
        key: generateRandomKey('bigkey', result.length),
        type,
        totalMemory,
        totalMemoryFormatted: formatMemory(totalMemory),
        avgFieldMemory,
        avgFieldMemoryFormatted: formatMemory(avgFieldMemory),
        dbIndex: Math.floor(Math.random() * 16),
        nodeId: `node-${Math.floor(Math.random() * 3)}`
      })
    }
  })

  // 按数据类型分组，组内按内存降序排序（这样同一类型的key会连续出现）
  return result.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type)
    }
    return b.totalMemory - a.totalMemory
  })
}

// 生成热Key（QPS）Mock数据
export function generateMockHotKeysByQPS(instanceId: string, count: number = 50): HotKeyByQPS[] {
  const result: HotKeyByQPS[] = []
  const types: RedisKeyType[] = [...REDIS_NATIVE_TYPES, 'not-exist-key']

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const qps = Math.floor(Math.random() * 50000) + 5000 // 5000-55000 QPS

    result.push({
      key: type === 'not-exist-key' ? `not-exist-key-${i}` : generateRandomKey('hotkey', i),
      type,
      qps,
      dbIndex: Math.floor(Math.random() * 16),
      nodeId: `node-${Math.floor(Math.random() * 3)}`
    })
  }

  // 按QPS降序排序
  return result.sort((a, b) => b.qps - a.qps)
}

// 生成热Key（流量）Mock数据
export function generateMockHotKeysByTraffic(instanceId: string, count: number = 50): HotKeyByTraffic[] {
  const result: HotKeyByTraffic[] = []
  const types: RedisKeyType[] = [...REDIS_NATIVE_TYPES]

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const ingressTraffic = Math.floor(Math.random() * 1024 * 1024 * 10) + 1024 * 1024 // 1MB/s - 11MB/s
    const egressTraffic = Math.floor(Math.random() * 1024 * 1024 * 8) + 1024 * 512 // 512KB/s - 8.5MB/s
    const qps = Math.floor(Math.random() * 20000) + 1000 // 1000-21000 QPS

    result.push({
      key: generateRandomKey('hotkey', i),
      type,
      ingressTraffic,
      ingressTrafficFormatted: formatTraffic(ingressTraffic),
      egressTraffic,
      egressTrafficFormatted: formatTraffic(egressTraffic),
      qps,
      dbIndex: Math.floor(Math.random() * 16),
      nodeId: `node-${Math.floor(Math.random() * 3)}`
    })
  }

  // 按总流量降序排序
  return result.sort((a, b) => (b.ingressTraffic + b.egressTraffic) - (a.ingressTraffic + a.egressTraffic))
}

// 生成节点信息Mock数据
export function generateMockNodes(): NodeInfo[] {
  return [
    { nodeId: 'node-0', nodeRole: 'master', nodeIp: '192.168.1.10', nodePort: 6379 },
    { nodeId: 'node-1', nodeRole: 'slave', nodeIp: '192.168.1.11', nodePort: 6379 },
    { nodeId: 'node-2', nodeRole: 'slave', nodeIp: '192.168.1.12', nodePort: 6379 }
  ]
}

// ========== DBInstance 类型（从原文件导入避免循环依赖）==========
export interface DBInstance {
  id: string
  type: string
  alias: string
  spec?: string
  arch?: string
  version?: string
  // ... 其他字段
}
