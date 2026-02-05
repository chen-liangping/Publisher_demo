---
name: run-dev-3006
description: Start the dev server on port 3006; if port 3006 is occupied, identify and terminate the occupying process, then start again. Use when starting local dev, debugging "port already in use", or when the project must run on port 3006.
---

# Run dev server on port 3006

## Goal
- 本项目**每次都跑在 3006 端口**；如果 3006 被占用，先清理再启动。

## Instructions
1. 检查 3006 是否被占用（macOS）：

```bash
lsof -nP -iTCP:3006 -sTCP:LISTEN
```

2. 如果有占用进程，记录 PID 并终止（温和 → 强制）：

```bash
kill <PID>
# 若仍未退出
kill -9 <PID>
```

3. 启动开发服务，并显式绑定 3006（按项目实际命令二选一）：

```bash
# 常见 Next.js
PORT=3006 npm run dev
```

```bash
# 如果项目脚本已支持 -p/--port
npm run dev -- -p 3006
```

4. 验证：浏览器访问 `http://localhost:3006`，并在终端确认监听端口是 3006。

## Notes
- 如果你发现项目不是 Next.js 或启动命令不同，以 `package.json` 的 `scripts.dev` 为准，但**端口必须固定 3006**。
- 清理端口占用属于“真实业务效果”的基础保障：避免同机多个原型互相抢端口导致假失败。

