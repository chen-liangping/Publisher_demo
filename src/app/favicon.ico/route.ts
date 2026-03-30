export function GET(): Response {
  // 产品意图：原型不强调品牌视觉，但需要一个稳定的 /favicon.ico 响应，避免 dev 模式下因构建产物抖动导致 500。
  // 这里返回 204（无内容），浏览器不会因为 favicon 请求影响主页面渲染流程。
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  })
}

