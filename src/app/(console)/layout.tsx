import ConsoleShell from '../../components/Console/ConsoleShell'

/**
 * 用户侧控制台布局：外壳（顶栏 + 左侧菜单 + 内容区）挂在 layout 上，
 * 切换菜单（URL 变化）时外壳不会重新挂载，顶栏的 appId / 账号视角 / 环境等状态得以保留。
 * 菜单与 URL 的映射见 components/Console/routes.ts。
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConsoleShell />
      {children}
    </>
  )
}
