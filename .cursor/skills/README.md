# Project Skills (prototype-publisher)

本目录存放 **项目级 Skills**：用于把“经常重复的原型开发流程”沉淀成可复用的操作手册，方便在 Cursor 里反复调用。

## 约定
- Skills 必须放在 `.cursor/skills/<skill-name>/SKILL.md`
- `skill-name` 使用小写 + 连字符（kebab-case），不超过 64 字符
- 每个 `SKILL.md` 保持精简（建议 < 500 行），复杂内容放到同目录的 `reference.md / examples.md`

## Skills 列表
- `run-dev-3006`: 本项目开发服务固定跑 3006 端口（占用则先清理）
- `prototype-list-detail-crud`: 快速生成“列表 + 搜索 + 详情”的原型页面结构，并确保新增/编辑/删除都有真实业务效果
- `ui-rules-quick-check`: 快速检查并落实：Tag 圆角/无边框、字段 link 仅用于可跳转、宽表横向滚动与列 min-width
- `ls-ops`: Linux 运维常用命令清单（触发词：ls-ops），包含存储/文件/PM2/健康检查（curl 状态码）

