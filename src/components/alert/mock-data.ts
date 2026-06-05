// ==================== 类型定义 ====================

/** 数据源类型 */
export type DatasourceType = 'prometheus' | 'loki';

/** 告警规则状态 */
export type AlertRuleState = 'normal' | 'pending' | 'firing' | 'disabled';

/** 比较运算符 */
export type Operator = '>' | '<' | '>=' | '<=';

/** 预定义指标类型 */
export interface MetricTypeOption {
  key: string;
  label: string;
  unit: string;
  defaultThreshold: number;
  description: string;
}

/** 告警条件配置 */
export interface AlertCondition {
  operator: Operator;
  threshold: number;
  duration: string;
}

/** 监控范围配置 */
export interface MetricScope {
  metricType: string;
  keyword?: string;
}

/** 告警渠道（Contact Point） */
export interface AlertChannel {
  id: string;
  name: string;
  type: 'dingtalk' | 'feishu';
  webhookUrl?: string;
}

/** 告警规则 */
export interface GrafanaAlertRule {
  id: string;
  name: string;
  datasource: DatasourceType;
  state: AlertRuleState;
  metricScope: MetricScope;
  condition: AlertCondition;
  channelIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 创建/编辑规则的表单值 */
export interface AlertRuleFormValue {
  datasource: DatasourceType;
  metricType: string;
  keyword: string;
  operator: Operator;
  threshold: number;
  duration: string;
  timeRangeMinutes: number;  // Loki专用：时间范围（分钟）
  name: string;
  channelIds: string[];
}

// ==================== 常量：预定义指标类型 ====================

export const DATASOURCE_OPTIONS: { label: string; value: DatasourceType }[] = [
  { label: 'Prometheus（指标）', value: 'prometheus' },
  { label: 'Loki（日志）', value: 'loki' },
]

export const METRIC_TYPES: Record<DatasourceType, MetricTypeOption[]> = {
  prometheus: [
    { key: 'cpu_usage', label: 'CPU 使用率', unit: '%', defaultThreshold: 80, description: '容器 CPU 使用率百分比' },
    { key: 'memory_usage', label: '内存使用率', unit: '%', defaultThreshold: 85, description: '容器内存使用率百分比' },
    { key: 'http_5xx_rate', label: 'HTTP 5xx 错误率', unit: '%', defaultThreshold: 5, description: 'HTTP 5xx 响应占比' },
    { key: 'pod_restarts', label: 'Pod 重启次数', unit: '次', defaultThreshold: 3, description: '1 小时内 Pod 重启次数' },
  ],
  loki: [
    { key: 'keyword_match', label: '关键字匹配', unit: '次', defaultThreshold: 5, description: '匹配指定关键字的日志条数' },
  ],
}

export const OPERATOR_OPTIONS: { label: string; value: Operator }[] = [
  { label: '大于 (>)', value: '>' },
  { label: '小于 (<)', value: '<' },
  { label: '大于等于 (>=)', value: '>=' },
  { label: '小于等于 (<=)', value: '<=' },
]

export const DURATION_OPTIONS = [
  { label: '1 分钟', value: '1m' },
  { label: '5 分钟', value: '5m' },
  { label: '10 分钟', value: '10m' },
  { label: '30 分钟', value: '30m' },
  { label: '1 小时', value: '1h' },
]

export const LOKI_TIME_RANGE_OPTIONS = [
  { label: '1 分钟', value: 1 },
  { label: '5 分钟', value: 5 },
  { label: '10 分钟', value: 10 },
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
]

// ==================== 告警渠道 mock 数据 ====================

export const INITIAL_MOCK_CHANNELS: AlertChannel[] = [
  { id: 'ch-001', name: '游戏大群', type: 'dingtalk', webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' },
  { id: 'ch-002', name: '运维群', type: 'dingtalk', webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=yyy' },
  { id: 'ch-003', name: '告警飞书机器人', type: 'feishu', webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
]

/** 渠道类型选项 */
export const CHANNEL_TYPE_OPTIONS = [
  { label: '钉钉机器人', value: 'dingtalk' },
  { label: '飞书机器人', value: 'feishu' },
]

// ==================== PromQL / LogQL 翻译（前端 mock） ====================

/**
 * 根据用户选择的指标类型和条件，生成 PromQL / LogQL 查询语句。
 * 实际生产中此逻辑在后端执行，前端仅做展示预览。
 */
export function translateToQuery(
  datasource: DatasourceType,
  metricType: string,
  keyword: string | undefined,
  timeRangeMinutes?: number,
): string {
  const appId = 'gametest'

  if (datasource === 'prometheus') {
    switch (metricType) {
      case 'cpu_usage':
        return `sum(rate(container_cpu_usage_seconds_total{namespace="${appId}"}[5m])) by (pod)\n  / sum(kube_pod_container_resource_limits{resource="cpu",namespace="${appId}"}) by (pod) * 100`
      case 'memory_usage':
        return `sum(container_memory_working_set_bytes{namespace="${appId}"}) by (pod)\n  / sum(kube_pod_container_resource_limits{resource="memory",namespace="${appId}"}) by (pod) * 100`
      case 'http_5xx_rate':
        return `sum(rate(http_requests_total{namespace="${appId}",status=~"5.."}[5m])) by (pod)\n  / sum(rate(http_requests_total{namespace="${appId}"}[5m])) by (pod)`
      case 'pod_restarts':
        return `increase(kube_pod_container_status_restarts_total{namespace="${appId}"}[1h])`
      default:
        return `metric{namespace="${appId}"}`
    }
  }

  // Loki
  const timeRange = timeRangeMinutes ? `${timeRangeMinutes}m` : '5m'
  switch (metricType) {
    case 'keyword_match':
      return `sum(count_over_time({namespace="${appId}"} |~ "${keyword || 'Exception'}" [${timeRange}]))`
    default:
      return `sum(count_over_time({namespace="${appId}"} [${timeRange}]))`
  }
}

// ==================== Mock 示例规则 ====================

export const INITIAL_MOCK_RULE: GrafanaAlertRule = {
  id: 'rule-001',
  name: 'CPU 使用率 > 80%',
  datasource: 'prometheus',
  state: 'normal',
  metricScope: { metricType: 'cpu_usage' },
  condition: { operator: '>', threshold: 80, duration: '5m' },
  channelIds: ['ch-001'],
  createdAt: '2026-05-27 10:00:00',
  updatedAt: '2026-05-27 10:00:00',
}

/** 自动生成规则名称 */
export function generateRuleName(
  metricTypeKey: string,
  operator: Operator,
  threshold: number,
  keyword?: string,
): string {
  const allMetrics = [...METRIC_TYPES.prometheus, ...METRIC_TYPES.loki]
  const metricLabel = allMetrics.find(m => m.key === metricTypeKey)?.label ?? metricTypeKey
  const keywordSuffix = keyword ? ` (${keyword})` : ''
  return `${metricLabel} ${operator} ${threshold}${keywordSuffix}`
}

/** 创建空表单默认值 */
export function createDefaultFormValue(): AlertRuleFormValue {
  return {
    datasource: 'prometheus',
    metricType: 'cpu_usage',
    keyword: '',
    operator: '>',
    threshold: 80,
    duration: '5m',
    timeRangeMinutes: 5,
    name: '',
    channelIds: [],
  }
}
