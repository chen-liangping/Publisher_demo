// ==================== 类型定义 ====================

/** 数据源类型 */
export type DatasourceType = 'prometheus' | 'loki';

/** 告警规则状态 */
export type AlertRuleState = 'normal' | 'pending' | 'firing' | 'disabled';

/** 比较运算符 */
export type Operator = '>' | '<' | '>=' | '<=';

/** Loki 日志行匹配方式 */
export type LokiMatchOperator = 'contains' | 'not_contains' | 'regex_contains' | 'regex_not_contains' | 'any_contains' | 'any_not_contains';

/** Loki 标签匹配方式 */
export type LokiLabelOperator = '=' | '!=' | '=~' | '!~';

/** Loki 统计方式 */
export type LokiAggregationMode = 'sum_by' | 'sum' | 'sum_without';

/** Loki 无数据处理 */
export type LokiZeroFillMode = 'none' | 'vector0' | 'on_vector0';

/** Loki 配置方式 */
export type LokiQueryMode = 'visual' | 'raw';

/** Loki stream selector 标签条件 */
export interface LokiLabelMatcher {
  id: string;
  label: string;
  operator: LokiLabelOperator;
  value: string;
}

/** Loki 过滤条件，多个条件按 AND 串联 */
export interface LokiFilterCondition {
  id: string;
  operator: LokiMatchOperator;
  value: string;
}

/** Loki 解析阶段 */
export interface LokiParserStage {
  id: string;
  type: 'regexp';
  expression: string;
}

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
  timeRangeMinutes?: number;
}

/** 监控范围配置 */
export interface MetricScope {
  metricType: string;
  keyword?: string;
  selectorMatchers?: LokiLabelMatcher[];
  aggregateKeywords?: string[];
  lokiConditions?: LokiFilterCondition[];
  parserStages?: LokiParserStage[];
  aggregationMode?: LokiAggregationMode;
  aggregationLabels?: string[];
  range?: string;
  zeroFill?: LokiZeroFillMode;
  queryMode?: LokiQueryMode;
  rawLogQL?: string;
  requiredKeywords?: string[];
  excludedKeywords?: string[];
  ignoreCase?: boolean;
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
  selectorMatchers: LokiLabelMatcher[];
  aggregateKeywords: string[];
  lokiConditions: LokiFilterCondition[];
  parserStages: LokiParserStage[];
  aggregationMode: LokiAggregationMode;
  aggregationLabels: string[];
  timeRangeExpression: string;
  zeroFill: LokiZeroFillMode;
  queryMode: LokiQueryMode;
  rawLogQL: string;
  requiredKeywords: string[];
  excludedKeywords: string[];
  ignoreCase: boolean;
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
  { label: '日志（应用日志）', value: 'loki' },
]

export const METRIC_TYPES: Record<DatasourceType, MetricTypeOption[]> = {
  prometheus: [
    { key: 'cpu_usage', label: 'CPU 使用率', unit: '%', defaultThreshold: 80, description: '容器 CPU 使用率百分比' },
    { key: 'memory_usage', label: '内存使用率', unit: '%', defaultThreshold: 85, description: '容器内存使用率百分比' },
    { key: 'http_5xx_rate', label: 'HTTP 5xx 错误率', unit: '%', defaultThreshold: 5, description: 'HTTP 5xx 响应占比' },
    { key: 'pod_restarts', label: 'Pod 重启次数', unit: '次', defaultThreshold: 3, description: '1 小时内 Pod 重启次数' },
  ],
  loki: [
    { key: 'keyword_match', label: '关键字匹配', unit: '次', defaultThreshold: 5, description: '按关键词聚合统计日志条数' },
  ],
}

export const OPERATOR_OPTIONS: { label: string; value: Operator }[] = [
  { label: '大于 (>)', value: '>' },
  { label: '小于 (<)', value: '<' },
  { label: '大于等于 (>=)', value: '>=' },
  { label: '小于等于 (<=)', value: '<=' },
]

export const LOKI_CONDITION_OPERATOR_OPTIONS: { label: string; value: LokiMatchOperator }[] = [
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '正则包含', value: 'regex_contains' },
  { label: '正则不包含', value: 'regex_not_contains' },
  { label: '任一包含', value: 'any_contains' },
  { label: '任一不包含', value: 'any_not_contains' },
]

export const LOKI_LABEL_OPERATOR_OPTIONS: { label: string; value: LokiLabelOperator }[] = [
  { label: '等于 (=)', value: '=' },
  { label: '不等于 (!=)', value: '!=' },
  { label: '正则匹配 (=~)', value: '=~' },
  { label: '正则不匹配 (!~)', value: '!~' },
]

export const LOKI_AGGREGATION_OPTIONS: { label: string; value: LokiAggregationMode }[] = [
  { label: '按标签聚合 sum by', value: 'sum_by' },
  { label: '总数统计 sum', value: 'sum' },
  { label: '排除标签统计 sum without', value: 'sum_without' },
]

export const LOKI_VISUAL_AGGREGATION_OPTIONS: { label: string; value: LokiAggregationMode }[] = [
  { label: '按关键词统计', value: 'sum_by' },
  { label: '总数统计', value: 'sum' },
]

export const LOKI_ZERO_FILL_OPTIONS: { label: string; value: LokiZeroFillMode }[] = [
  { label: '不补 0', value: 'none' },
  { label: 'or vector(0)', value: 'vector0' },
  { label: 'or on() vector(0)', value: 'on_vector0' },
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

export interface LokiKeywordQueryConfig {
  queryMode?: LokiQueryMode;
  rawLogQL?: string;
  selectorMatchers?: LokiLabelMatcher[];
  aggregateKeywords: string[];
  lokiConditions?: LokiFilterCondition[];
  parserStages?: LokiParserStage[];
  aggregationMode?: LokiAggregationMode;
  aggregationLabels?: string[];
  range?: string;
  zeroFill?: LokiZeroFillMode;
  requiredKeywords: string[];
  excludedKeywords: string[];
  ignoreCase: boolean;
}

export function createDefaultLokiLabelMatcher(index = 0): LokiLabelMatcher {
  return {
    id: `selector-${index + 1}`,
    label: index === 0 ? 'namespace' : '',
    operator: '=',
    value: index === 0 ? 'gametest' : '',
  }
}

export function createDefaultLokiCondition(index = 0): LokiFilterCondition {
  return {
    id: `condition-${index + 1}`,
    operator: 'contains',
    value: '',
  }
}

export function createDefaultLokiParserStage(index = 0): LokiParserStage {
  return {
    id: `parser-${index + 1}`,
    type: 'regexp',
    expression: '',
  }
}

export function normalizeKeywordList(keywords: string[]): string[] {
  return Array.from(
    new Set(
      keywords
        .map(keyword => keyword.trim())
        .filter(Boolean),
    ),
  )
}

export function normalizeLabelList(labels: string[]): string[] {
  return normalizeKeywordList(labels.map(label => label.replace(/\s+/g, '')))
}

export function parseListInput(value: string): string[] {
  return normalizeKeywordList(value.split(/[\n,，]/))
}

export function normalizeLokiLabelMatchers(matchers: LokiLabelMatcher[]): LokiLabelMatcher[] {
  return matchers
    .map(matcher => ({
      ...matcher,
      label: matcher.label.trim(),
      value: matcher.value.trim(),
    }))
    .filter(matcher => matcher.label !== '' && matcher.value !== '')
}

export function normalizeLokiConditions(conditions: LokiFilterCondition[]): LokiFilterCondition[] {
  return conditions
    .map(condition => ({
      ...condition,
      value: condition.value.trim(),
    }))
    .filter(condition => condition.value !== '')
}

export function normalizeLokiParserStages(stages: LokiParserStage[]): LokiParserStage[] {
  return stages
    .map(stage => ({
      ...stage,
      expression: stage.expression.trim(),
    }))
    .filter(stage => stage.expression !== '')
}

function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
}

function quoteLabelValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function quoteLogQLString(value: string): string {
  if (!value.includes('`')) {
    return `\`${value}\``
  }
  return quoteLabelValue(value)
}

function quoteLogQLRegex(pattern: string): string {
  if (!pattern.includes('`')) {
    return `\`${pattern}\``
  }
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function buildMatchRegex(keyword: string, ignoreCase: boolean): string {
  return `${ignoreCase ? '(?i)' : ''}${escapeRegex(keyword)}`
}

function buildKeywordCaptureRegex(keywords: string[], ignoreCase: boolean): string {
  const body = normalizeKeywordList(keywords).map(escapeRegex).join('|')
  return `${ignoreCase ? '(?i)' : ''}(?P<keyword>${body})`
}

function buildAnyLiteralRegex(value: string, ignoreCase: boolean): string {
  const body = parseListInput(value).map(escapeRegex).join('|')
  return `${ignoreCase ? '(?i)' : ''}(${body})`
}

function getRegexPattern(value: string, ignoreCase: boolean): string {
  return `${ignoreCase ? '(?i)' : ''}${value}`
}

function buildLokiConditionFilter(condition: LokiFilterCondition, ignoreCase: boolean): string | null {
  const value = condition.value.trim()
  if (!value) return null

  switch (condition.operator) {
    case 'contains':
      return ignoreCase
        ? `    |~ ${quoteLogQLRegex(buildMatchRegex(value, true))}`
        : `    |= ${quoteLogQLString(value)}`
    case 'not_contains':
      return ignoreCase
        ? `    !~ ${quoteLogQLRegex(buildMatchRegex(value, true))}`
        : `    != ${quoteLogQLString(value)}`
    case 'regex_contains':
      return `    |~ ${quoteLogQLRegex(getRegexPattern(value, ignoreCase))}`
    case 'regex_not_contains':
      return `    !~ ${quoteLogQLRegex(getRegexPattern(value, ignoreCase))}`
    case 'any_contains':
      return `    |~ ${quoteLogQLRegex(buildAnyLiteralRegex(value, ignoreCase))}`
    case 'any_not_contains':
      return `    !~ ${quoteLogQLRegex(buildAnyLiteralRegex(value, ignoreCase))}`
    default:
      return null
  }
}

function buildLokiSelector(matchers: LokiLabelMatcher[]): string {
  const normalized = normalizeLokiLabelMatchers(matchers)
  if (normalized.length === 0) {
    return '{}'
  }

  const selectorBody = normalized
    .map(matcher => `${matcher.label}${matcher.operator}${quoteLabelValue(matcher.value)}`)
    .join(', ')
  return `{${selectorBody}}`
}

function buildAggregation(innerQuery: string, mode: LokiAggregationMode, labels: string[]): string {
  const aggregationLabels = normalizeLabelList(labels)

  if (mode === 'sum_by' && aggregationLabels.length > 0) {
    return `sum by(${aggregationLabels.join(', ')}) (
  ${innerQuery}
)`
  }

  if (mode === 'sum_without' && aggregationLabels.length > 0) {
    return `sum(
  ${innerQuery}
) without(${aggregationLabels.join(', ')})`
  }

  return `sum(
  ${innerQuery}
)`
}

function appendZeroFill(query: string, zeroFill: LokiZeroFillMode): string {
  switch (zeroFill) {
    case 'vector0':
      return `${query} or vector(0)`
    case 'on_vector0':
      return `${query} or on() vector(0)`
    default:
      return query
  }
}

function getLokiConfig(keywordOrConfig: string | LokiKeywordQueryConfig | undefined): LokiKeywordQueryConfig {
  if (typeof keywordOrConfig === 'object' && keywordOrConfig !== null) {
    const legacyRequiredConditions = normalizeKeywordList(keywordOrConfig.requiredKeywords).map((value, index) => ({
      id: `legacy-required-${index}`,
      operator: 'contains' as LokiMatchOperator,
      value,
    }))
    const legacyExcludedConditions = normalizeKeywordList(keywordOrConfig.excludedKeywords).map((value, index) => ({
      id: `legacy-excluded-${index}`,
      operator: 'not_contains' as LokiMatchOperator,
      value,
    }))
    const lokiConditions = normalizeLokiConditions(keywordOrConfig.lokiConditions ?? [])

    return {
      queryMode: keywordOrConfig.queryMode ?? 'visual',
      rawLogQL: keywordOrConfig.rawLogQL ?? '',
      selectorMatchers: normalizeLokiLabelMatchers(keywordOrConfig.selectorMatchers ?? [createDefaultLokiLabelMatcher()]),
      aggregateKeywords: normalizeKeywordList(keywordOrConfig.aggregateKeywords),
      lokiConditions: lokiConditions.length > 0
        ? lokiConditions
        : [...legacyRequiredConditions, ...legacyExcludedConditions],
      parserStages: normalizeLokiParserStages(keywordOrConfig.parserStages ?? []),
      aggregationMode: keywordOrConfig.aggregationMode ?? 'sum_by',
      aggregationLabels: normalizeLabelList(keywordOrConfig.aggregationLabels ?? ['keyword']),
      range: keywordOrConfig.range?.trim() || '5m',
      zeroFill: keywordOrConfig.zeroFill ?? 'none',
      requiredKeywords: normalizeKeywordList(keywordOrConfig.requiredKeywords),
      excludedKeywords: normalizeKeywordList(keywordOrConfig.excludedKeywords),
      ignoreCase: keywordOrConfig.ignoreCase,
    }
  }

  return {
    queryMode: 'visual',
    rawLogQL: '',
    selectorMatchers: [createDefaultLokiLabelMatcher()],
    aggregateKeywords: normalizeKeywordList([keywordOrConfig || 'Exception']),
    lokiConditions: [],
    parserStages: [],
    aggregationMode: 'sum_by',
    aggregationLabels: ['keyword'],
    range: '5m',
    zeroFill: 'none',
    requiredKeywords: [],
    excludedKeywords: [],
    ignoreCase: true,
  }
}

/**
 * 根据用户选择的指标类型和条件，生成 PromQL / LogQL 查询语句。
 * 实际生产中此逻辑在后端执行，前端仅做展示预览。
 */
export function translateToQuery(
  datasource: DatasourceType,
  metricType: string,
  keywordOrConfig: string | LokiKeywordQueryConfig | undefined,
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
  switch (metricType) {
    case 'keyword_match': {
      const config = getLokiConfig(keywordOrConfig)
      if (config.queryMode === 'raw') {
        return config.rawLogQL?.trim() || '# 在这里输入 LogQL'
      }

      const timeRange = config.range || (timeRangeMinutes ? `${timeRangeMinutes}m` : '5m')
      const selector = buildLokiSelector(config.selectorMatchers?.length ? config.selectorMatchers : [createDefaultLokiLabelMatcher()])
      const conditionFilters = normalizeLokiConditions(config.lokiConditions ?? [])
        .map(condition => buildLokiConditionFilter(condition, config.ignoreCase))
        .filter(Boolean)
        .join('\n')
      const keywordParser = config.aggregateKeywords.length > 0
        ? `    | regexp ${quoteLogQLRegex(buildKeywordCaptureRegex(config.aggregateKeywords, config.ignoreCase))}`
        : ''
      const customParsers = normalizeLokiParserStages(config.parserStages ?? [])
        .map(stage => `    | regexp ${quoteLogQLRegex(stage.expression)}`)
        .join('\n')
      const aggregationLabels = normalizeLabelList(config.aggregationLabels ?? ['keyword'])
      const shouldFilterKeyword = config.aggregateKeywords.length > 0 && aggregationLabels.includes('keyword')
      const keywordFilter = shouldFilterKeyword ? '    | keyword != ""' : ''
      const keywordFormatter = config.ignoreCase
        && config.aggregateKeywords.length > 0
        && aggregationLabels.includes('keyword')
        ? '    | label_format keyword=`{{ .keyword | lower }}`'
        : ''
      const pipeline = [conditionFilters, keywordParser, customParsers, keywordFilter, keywordFormatter]
        .filter(Boolean)
        .join('\n')
      const pipelineBlock = pipeline ? `\n${pipeline}` : ''
      const innerQuery = `count_over_time(
    ${selector}${pipelineBlock}
    [${timeRange}]
  )`
      const aggregatedQuery = buildAggregation(
        innerQuery,
        config.aggregationMode ?? 'sum_by',
        aggregationLabels,
      )

      return appendZeroFill(aggregatedQuery, config.zeroFill ?? 'none')
    }
    default:
      return `sum(count_over_time({namespace="${appId}"} [5m]))`
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
  keyword?: string | string[],
): string {
  const allMetrics = [...METRIC_TYPES.prometheus, ...METRIC_TYPES.loki]
  const metricLabel = allMetrics.find(m => m.key === metricTypeKey)?.label ?? metricTypeKey
  const keywordText = Array.isArray(keyword)
    ? normalizeKeywordList(keyword).slice(0, 3).join('、')
    : keyword
  const keywordSuffix = keywordText ? ` (${keywordText})` : ''
  return `${metricLabel} ${operator} ${threshold}${keywordSuffix}`
}

/** 创建空表单默认值 */
export function createDefaultFormValue(): AlertRuleFormValue {
  return {
    datasource: 'prometheus',
    metricType: 'cpu_usage',
    keyword: '',
    selectorMatchers: [createDefaultLokiLabelMatcher()],
    aggregateKeywords: [],
    lokiConditions: [createDefaultLokiCondition()],
    parserStages: [],
    aggregationMode: 'sum_by',
    aggregationLabels: ['keyword'],
    timeRangeExpression: '5m',
    zeroFill: 'none',
    queryMode: 'visual',
    rawLogQL: '',
    requiredKeywords: [],
    excludedKeywords: [],
    ignoreCase: true,
    operator: '>',
    threshold: 80,
    duration: '5m',
    timeRangeMinutes: 5,
    name: '',
    channelIds: [],
  }
}
