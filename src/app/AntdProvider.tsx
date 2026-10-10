'use client'
import React from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

// 全站 Ant Design 组件使用中文（弹窗「取消/确定」、分页、日期选择器等）
dayjs.locale('zh-cn')

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
}
