This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## OpenClaw + Feishu 更新提醒

当仓库有代码或文档更新（`src/`、`docs/`、`README.md`、`AGENTS.md`）并发生提交或合并时，可自动发送飞书消息提醒。

### 1) 配置 Feishu 目标

先在本机 shell 配置目标（建议写入 `~/.zshrc`）：

```bash
export OPENCLAW_FEISHU_TARGET='your-feishu-chat-id-or-target'
export OPENCLAW_FEISHU_ACCOUNT='your-feishu-account-id' # 可选
export OPENCLAW_NOTIFY_CHANNEL='feishu' # 可选，默认 feishu
```

如需查找可用目标，可参考：

```bash
openclaw directory --help
```

### 2) 安装 Git Hooks

```bash
npm run notify:hooks:install
```

会安装以下 hook：
- `.git/hooks/post-commit`
- `.git/hooks/post-merge`

### 3) 测试发送

完成一次包含 `src/` 或 `docs/` 变更的提交后，会自动触发飞书提醒。

也可以先本地 dry-run 验证命令链路：

```bash
npm run notify:send:test
```
