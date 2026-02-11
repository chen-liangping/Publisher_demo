import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 原型项目：为了避免“演示构建”被大量 ESLint 警告阻断，
   * 这里关闭 build 阶段的 ESLint 检查（本地开发仍可手动运行 eslint）。
   */
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
