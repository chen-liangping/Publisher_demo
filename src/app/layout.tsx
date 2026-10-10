import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import AntdProvider from './AntdProvider'

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
        <AntdProvider>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </AntdProvider>
      </body>
    </html>
  )
}
