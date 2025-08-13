// 使用JS风格导出以避免类型不匹配导致的校验失败
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1890ff',
          hover: '#40a9ff',
        },
      },
    },
  },
  plugins: [],
  // 关闭预设的preflight，避免覆盖Ant Design样式（Tailwind v4写法改为在CSS中控制）
}
export default config