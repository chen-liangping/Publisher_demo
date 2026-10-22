# AGENTS.md

## Cursor Cloud specific instructions

This is a **pure frontend prototype** (no backend, no database, no Docker) for a game publishing infrastructure management platform, built with Next.js 15 (App Router + Turbopack), React 18, Ant Design 5, and Tailwind CSS 4.

### Running the dev server

- The dev server **must run on port 3006** (per workspace rules): `PORT=3006 npm run dev`
- If port 3006 is occupied, find the PID with `lsof -nP -iTCP:3006 -sTCP:LISTEN` and kill it before starting.
- The dev server uses Turbopack for fast HMR.

### Lint / Build / Test

- **Lint**: `npm run lint` — runs `next lint`. The existing codebase has many pre-existing warnings (unused imports, missing hook deps) and 2 `react/display-name` errors. These are expected for this prototype.
- **Build**: `npm run build` — runs `next build`. Compiles and generates static pages successfully.
- **No automated test suite** exists. There is no `test` script in `package.json`.

### Key routes

每个菜单都有独立路由，直接打开/分享 URL 会自动定位到对应菜单并展开所在分组。路由表统一维护在 `src/components/Console/routes.ts`（新增菜单时在这里加一行）。

| Route | Description |
|-------|-------------|
| `/`、`/workbench` | 我的工作台 |
| `/client/version`、`/client/cdn` | 客户端 · 版本 / CDN |
| `/server/vm`、`/server/security-group`、`/server/load-balancer`、`/server/command` | 服务端（虚机模式，打开时自动切到虚机） |
| `/server/app`、`/server/app/<appId>`、`/server/shared-files`、`/server/task` | 服务端（容器模式，打开时自动切到容器；`/server/app/<appId>` 为应用详情） |
| `/server/storage` | 存储（两种模式通用，容器模式带 `?mode=container`） |
| `/monitor/client-alert`、`/monitor/server`、`/monitor/security-scan` | 监控 |
| `/integration/data-push`、`/integration/message-push`、`/integration/i18n` | 接入 |
| `/operations/activity`、`/operations/gift` | 运营 |
| `/people-config`、`/message-notification`（支持 `?tab=`） | 顶栏入口 |
| `/admin/<key>` | 管理台，如 `/admin/ssl-management`；`/admin` 默认游戏管理 |
| `/management-center/<...>` | 管理中心：`operation-log`、`site-notice`、`notice-config/site-notice`、`notice-config/owner`、`notice-config/channel` |
| `/api-test` | API testing tool (Postman-like prototype, calls external staging URLs — optional) |

- 旧链接 `/?menu=xxx&mode=yyy`、`/management-center?key=xxx` 会自动跳转到新路由。
- 外壳（顶栏 + 菜单）挂在 layout 上（`src/app/(console)/layout.tsx`、`src/app/admin/layout.tsx`），切换菜单不会丢失顶栏状态。

### Notes

- All data is **mocked/hardcoded** in React components. No API calls are required for the app to function.
- The `deploy.sh` script in the repo root is a convenience deployment script; it is not needed for development. Use `npm install` + `PORT=3006 npm run dev` directly.

### AI workflow docs (prototype meta)

- Constraints: `AIdocs/ai_constraints.md`
- Prompt + templates + work items: `AIdocs/ai/`
- Minimal checks: `npm run ai:check` / `npm run ai:check:full`
