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

| Route | Description |
|-------|-------------|
| `/` | Main dashboard — toggle between VM mode (`mode=vm`) and Container mode (`mode=container`) via the top nav |
| `/admin` | Admin console — game management, resources, announcements, YAML backup |
| `/api-test` | API testing tool (Postman-like prototype, calls external staging URLs — optional) |

### Notes

- All data is **mocked/hardcoded** in React components. No API calls are required for the app to function.
- The `deploy.sh` script in the repo root is a convenience deployment script; it is not needed for development. Use `npm install` + `PORT=3006 npm run dev` directly.

### AI workflow docs (prototype meta)

- Constraints: `AIdocs/ai_constraints.md`
- Prompt + templates + work items: `AIdocs/ai/`
- Minimal checks: `npm run ai:check` / `npm run ai:check:full`
