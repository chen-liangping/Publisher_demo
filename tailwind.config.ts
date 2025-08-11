import type { Config } from 'tailwindcss'

const config: Config = {
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
  // 确保 Tailwind 的样式不会覆盖 Ant Design Vue 的样式
  corePlugins: {
    preflight: false,
  },
}
export default config