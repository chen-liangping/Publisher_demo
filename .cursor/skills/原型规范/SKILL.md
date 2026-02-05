---
name: prototype-list-detail-crud
description: Scaffold a Next.js (App Router) + Ant Design prototype with a list page that includes search, a title field that navigates to a detail page, and CRUD actions with real state changes (not just messages). Use when creating new admin/client list pages or validating interaction flows.
---

# Prototype: List + Search + Detail + CRUD (Next.js App Router + Ant Design)

## Goal
快速落地一个**可运行**的前端交互原型页面，满足这些产品约束：
- 列表页必须有**搜索框**（包含重要字段：名称、ID 等）
- 列表必须有**详情页**
- 进入详情页方式：点击**标题字段**（不是“详情”操作按钮）
- 删除/编辑/新增等操作必须产生**真实业务效果**（更新 state / mock 数据 / 跳转 / 弹窗保存）
- TypeScript：**不使用 any**
- 所有关键交互必须加**注释**，说明产品意图

## Recommended file layout (colocated)
在一个 feature 目录里放齐页面、mock 数据、组件，便于原型整体查看：

```
src/app/<feature>/page.tsx
src/app/<feature>/[id]/page.tsx
src/components/<feature>/<Feature>ListPage.tsx
src/components/<feature>/<Feature>DetailPage.tsx
src/components/<feature>/mock.ts
src/components/<feature>/types.ts
```

> 如果项目已有目录约定（比如 `src/components/Admin/*`），优先跟随现有风格。

## Step-by-step workflow
### 1) Define types (no `any`)
- 建 `types.ts`：定义列表项、搜索条件、表单字段类型（必要时区分 ViewModel 和 FormValue）。

### 2) Create mock data + helpers
- 建 `mock.ts`：提供初始数组与 ID 生成方法（保证新增/删除后列表真实变化）。
- CRUD 直接操作 React state（或用 `useMemo` 派生过滤结果）。

### 3) Implement list page
列表页必须包含：
- 顶部搜索区（`Input` / `Select` / `Form`）
  - **必须有默认值**（select/radio/searchable select）
- 列表（`Table`）
  - 标题列：用 `Button type="link"` 或 `Typography.Link` 实现点击跳转到详情页
  - 宽列多：开启横向滚动 `scroll={{ x: ... }}`，并给关键列 `width/minWidth`
- 操作列：
  - 操作少于 3：用 “文字 + 图标” 的 **text button**（禁止 icon-only）
  - 删除/编辑/新增：必须打开弹窗或真正更新 state

### 4) Implement detail page
详情页至少包含：
- Header：标题 + 关键字段（ID、状态等）
- 编辑入口（按钮）→ 打开编辑弹窗 → 保存后更新对应记录并回显
- 返回列表（或面包屑）

### 5) Interaction comments (required)
为以下事件加注释（写清产品意图）：
- 搜索提交/重置
- 点击标题跳转详情
- 新增/编辑弹窗打开/提交/取消
- 删除确认与删除后的列表刷新

## Implementation checklist
- [ ] 列表页有搜索框，且包含“名称/ID”等重要字段
- [ ] 点击标题进入详情页（无“详情”按钮）
- [ ] 新增/编辑/删除都会改变页面数据（state 更新），不是只弹 message
- [ ] select/radio/searchable select 有默认值
- [ ] TS 无 any；props/state 类型清晰
- [ ] 宽表支持横向滚动，列有合理 min width
- [ ] 关键交互都有注释

## Optional: UI polish suggestions (lightweight)
- hover/active 反馈：按钮、卡片、表格行保持明显反馈（优先用 AntD 自带 + CSS transition）
- 卡片不要重描边：用轻背景/阴影拉层次

