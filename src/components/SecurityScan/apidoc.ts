/**
 * 上传文档的统一入口：识别格式后转换为 DocApi[]。
 *
 * 支持两种格式（JSON）：
 * 1. Swagger 2.0 / OpenAPI 3.x
 * 2. 平台 API 文档格式（game-cloud apidoc：Category > Tag > Endpoint）
 *
 * 平台文档格式 → 我们的字段：
 *   method / path              → 方法 / 路径（合并主键，HEAD 忽略）
 *   name（中文标题）           → 作用；为空时用 summary
 *   description                → 详细说明
 *   auth[]                     → 鉴权类型（见 AUTH_MAP）
 *   pathParams / queryParams   → 入参（location = path / query）
 *   requestBody（含 children） → 入参（location = body，嵌套字段展开为 a.b）
 *   Category = ADMIN API       → 管理类接口（参与「管理接口暴露公网」判定）
 *   响应字段、错误码、示例、isAsync 等与风险判定无关，不导入。
 */

import { arr, isObj, isOpenApi, parseOpenApi, str } from './openapi'
import type { Json, JsonObject } from './openapi'
import type { ApiParam, AuthType, DocApi, HttpMethod } from './types'

const AUTH_MAP: Record<string, AuthType> = {
  'Auth0 JWT': 'jwt',
  'Admin Whitelist': 'ip_whitelist',
  'Basic Token': 'static_token',
  'CP Basic Auth': 'basic',
  'Callback Token': 'static_token',
  'Webhook Signature (HMAC)': 'signature'
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const toParams = (list: Json | undefined, location: string, prefix = ''): ApiParam[] =>
  arr(list).flatMap(raw => {
    if (!isObj(raw)) return []
    const name = prefix + str(raw.name)
    const self: ApiParam = {
      name,
      type: str(raw.type) || 'string',
      required: raw.required === true,
      location,
      description: str(raw.description) || undefined
    }
    // 嵌套字段只展开一层，避免入参列表过长
    const children = prefix ? [] : toParams(raw.children, location, `${name}.`)
    return [self, ...children]
  })

const endpointToDoc = (ep: JsonObject, isAdmin: boolean): DocApi | null => {
  const method = str(ep.method).toUpperCase() as HttpMethod
  if (!METHODS.includes(method) || !str(ep.path)) return null
  const auths = Array.from(new Set(arr(ep.auth).map(a => AUTH_MAP[str(a)] ?? 'unknown')))
  return {
    appName: '',
    method,
    path: str(ep.path),
    params: [...toParams(ep.pathParams, 'path'), ...toParams(ep.queryParams, 'query'), ...toParams(ep.requestBody, 'body')],
    summary: str(ep.name) || str(ep.summary),
    detail: str(ep.description),
    auths,
    isAdmin
  }
}

/** 递归收集：兼容整份 categories、单个 Category / Tag、或 Endpoint 数组 */
const collect = (node: Json | undefined, isAdmin: boolean, out: DocApi[]): void => {
  if (Array.isArray(node)) {
    node.forEach(n => collect(n, isAdmin, out))
    return
  }
  if (!isObj(node)) return
  if (str(node.method) && str(node.path)) {
    const doc = endpointToDoc(node, isAdmin)
    if (doc) out.push(doc)
    return
  }
  const admin = isAdmin || /admin/i.test(str(node.name))
  collect(node.categories, admin, out)
  collect(node.tags, admin, out)
  collect(node.endpoints, admin, out)
}

export const parseApiDoc = (text: string): DocApi[] => {
  let parsed: Json
  try {
    parsed = JSON.parse(text) as Json
  } catch {
    throw new Error('文件不是合法的 JSON，原型暂只支持 JSON 格式')
  }
  if (isOpenApi(parsed)) return parseOpenApi(parsed)
  const apis: DocApi[] = []
  collect(parsed, false, apis)
  if (apis.length === 0) {
    throw new Error('没有识别到接口：请上传 Swagger / OpenAPI 文档，或平台 API 文档格式（categories / tags / endpoints）')
  }
  return apis
}
