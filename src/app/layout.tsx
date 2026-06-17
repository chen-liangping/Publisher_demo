import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'publisher_demo',
  description: '使用 Next.js 和 Ant Design 构建的产品原型',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
