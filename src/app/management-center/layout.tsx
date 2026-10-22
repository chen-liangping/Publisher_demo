import ManagementCenterShell from '../../components/ManagementCenter/ManagementCenterShell'

/**
 * 管理中心布局：/management-center/<...> 的所有菜单共用同一个外壳。
 */
export default function ManagementCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ManagementCenterShell />
      {children}
    </>
  )
}
