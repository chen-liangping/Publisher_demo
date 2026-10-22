import AdminShell from '../../components/Admin/AdminShell'

/**
 * 管理台布局：外壳挂在 layout 上，切换菜单（/admin/<key>）时不会整页重新挂载。
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminShell />
      {children}
    </>
  )
}
