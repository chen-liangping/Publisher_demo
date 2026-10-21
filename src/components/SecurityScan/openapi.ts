/**
 * Swagger 2.0 / OpenAPI 3.x 文档解析（原型内支持 JSON 格式）。
 * 只取合并需要的信息：方法、路径、入参、说明、声明的鉴权。
 */

import type { ApiParam, AuthType, DocApi, HttpMethod } from './types'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const isObj = (v: Json | undefined): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: Json | undefined): string => (typeof v === 'string' ? v : '')
const arr = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : [])

/** 解析 #/components/schemas/X 或 #/definitions/X 形式的引用 */
const resolveRef = (root: JsonObject, node: Json | undefined): JsonObject | null => {
  if (!isObj(node)) return null
  const ref = str(node.$ref)
  if (!ref) return node
  const parts = ref.replace(/^#\//, '').split('/')
  let cur: Json | undefined = root
  for (const part of parts) {
    if (!isObj(cur)) return null
    cur = cur[part]
  }
  return isObj(cur) ? cur : null
}

const schemaType = (root: JsonObject, schema: Json | undefined): string => {
  const s = resolveRef(root, schema)
  if (!s) return 'string'
  const t = str(s.type)
  if (t === 'integer') return 'int'
  return t || 'object'
}

/** 请求体 schema 的顶层字段展开为入参 */
const bodyParams = (root: JsonObject, schema: Json | undefined): ApiParam[] => {
  const s = resolveRef(root, schema)
  if (!s || !isObj(s.properties)) return []
  const required = arr(s.required).map(str)
  return Object.entries(s.properties).map(([name, prop]) => ({
    name,
    type: schemaType(root, prop),
    required: required.includes(name),
    location: 'body',
    description: isObj(prop) ? str(prop.description) || undefined : undefined
  }))
}

const SCHEME_TO_AUTH = (scheme: JsonObject): AuthType => {
  const type = str(scheme.type).toLowerCase()
  const httpScheme = str(scheme.scheme).toLowerCase()
  if (type === 'basic' || (type === 'http' && httpScheme === 'basic')) return 'basic'
  if (type === 'http' && httpScheme === 'bearer') return 'jwt'
  if (type === 'apikey') return 'static_token'
  if (type === 'oauth2' || type === 'openidconnect') return 'jwt'
  return 'unknown'
}

export type { Json, JsonObject }
export { isObj, str, arr }

export const isOpenApi = (parsed: Json): boolean => isObj(parsed) && (!!str(parsed.swagger) || !!str(parsed.openapi))

export const parseOpenApi = (parsed: Json): DocApi[] => {
  if (!isObj(parsed) || !isOpenApi(parsed)) {
    throw new Error('没有识别到 swagger / openapi 版本字段，请确认是 Swagger 2.0 或 OpenAPI 3.x 文档')
  }
  const root = parsed
  if (!isObj(root.paths)) throw new Error('文档中没有 paths')

  const schemes: JsonObject = isObj(root.securityDefinitions)
    ? root.securityDefinitions
    : isObj(root.components) && isObj(root.components.securitySchemes)
      ? root.components.securitySchemes
      : {}
  const authsOf = (security: Json | undefined): AuthType[] => {
    const list = arr(security)
    const result = new Set<AuthType>()
    list.forEach(req => {
      if (!isObj(req)) return
      Object.keys(req).forEach(name => {
        const scheme = schemes[name]
        if (isObj(scheme)) result.add(SCHEME_TO_AUTH(scheme))
      })
    })
    return Array.from(result)
  }
  const globalAuths = authsOf(root.security)

  const apis: DocApi[] = []
  Object.entries(root.paths).forEach(([path, item]) => {
    if (!isObj(item)) return
    const sharedParams = arr(item.parameters)
    METHODS.forEach(method => {
      const op = item[method.toLowerCase()]
      if (!isObj(op)) return
      const params: ApiParam[] = []
      ;[...sharedParams, ...arr(op.parameters)].forEach(raw => {
        const prm = resolveRef(root, raw)
        if (!prm) return
        const location = str(prm.in)
        if (location === 'body') {
          params.push(...bodyParams(root, prm.schema))
          return
        }
        if (location === 'header') return // header 多为鉴权信息，不计入业务入参
        params.push({
          name: str(prm.name),
          type: prm.schema ? schemaType(root, prm.schema) : str(prm.type) || 'string',
          required: prm.required === true,
          location,
          description: str(prm.description) || undefined
        })
      })
      // OpenAPI 3：requestBody
      const body = resolveRef(root, op.requestBody)
      if (body && isObj(body.content)) {
        const media = body.content['application/json'] ?? Object.values(body.content)[0]
        if (isObj(media)) params.push(...bodyParams(root, media.schema))
      }
      const opAuths = op.security !== undefined ? authsOf(op.security) : globalAuths
      apis.push({
        appName: '',
        method,
        path,
        params,
        summary: str(op.summary) || str(op.description),
        detail: str(op.summary) ? str(op.description) : '',
        isAdmin: arr(op.tags).some(t => /admin|gm|manage/i.test(str(t))),
        auths: op.security !== undefined && arr(op.security).length === 0 ? ['none'] : opAuths
      })
    })
  })
  if (apis.length === 0) throw new Error('文档中没有可识别的 GET / POST / PUT / DELETE 接口')
  return apis
}
