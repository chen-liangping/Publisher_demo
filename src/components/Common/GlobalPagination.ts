import type { TablePaginationConfig } from 'antd/es/table/interface'

// 统一的表格分页工具：可在任意表格处直接复用
export function getTablePagination(
  pageSize: number = 10,
  pageSizeOptions: number[] = [10, 20, 50, 100]
): TablePaginationConfig {
  const stringOptions: string[] = pageSizeOptions.map(v => String(v))
  return {
    pageSize,
    showSizeChanger: true,
    pageSizeOptions: stringOptions
  }
}

// 常用预设（可直接 import 使用）
export const BUSINESS_DEFAULT_PAGINATION: TablePaginationConfig = getTablePagination(5, [5, 10, 20, 50])
export const CDN_DEFAULT_PAGINATION: TablePaginationConfig = getTablePagination(10, [10, 20, 50, 100])

