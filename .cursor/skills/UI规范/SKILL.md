---
name: ui-rules-quick-check
description: Enforce quick UI rules in this prototype: fully-rounded Tag style with no borders and color by value, link style only for real navigation fields, table horizontal scroll for wide lists with min-width columns, and correct action button style/count rules. Use when building or reviewing list/detail pages.
---

# UI 规范快速自检与落地（原型项目）

## 目标
把常见的“视觉规范 + 交互规范”在实现阶段一次性落地，避免返工。

---

## 1) Tag（标签）样式
### 规则
- **必须 fully rounded**（最大圆角）
- **不同值用不同颜色**
- **禁止描边（border）**
- 如需层次：只允许用**低透明度背景色**区分

### 落地建议（Ant Design）
- 优先用 `Tag`，并通过 `color` + 自定义 `style` 实现：
  - `border: 0`
  - `borderRadius: 999`
  - 背景色用低透明度（或使用 AntD 预置色并配合 `style={{ opacity: ... }}`）

---

## 2) 字段“link”视觉只用于可跳转字段
### 规则
- **只有字段具备真实跳转/导航行为**时，才允许使用 link 样式（蓝色、下划线、`type="link"`）
- **无跳转行为**的字段必须用黑/灰文本（不要伪装成可点击）

### 自检点
- 表格列里如果用了 `Button type="link"` / `Typography.Link`：
  - 必须绑定 `onClick` 并产生真实跳转（`router.push(...)`）或打开详情抽屉/弹窗（可视为“导航”）
- 若只是展示：改用 `Typography.Text`（灰阶）或普通 `span`

---

## 3) 列表：操作按钮数量与样式
### 规则
1. 操作数量 **< 3**：
   - 使用“**文字 + 图标**”的 **text button**
   - 禁止只用 icon

2. 操作数量 **>= 4**：
   - 使用 **icon-only** 按钮
   - hover 必须有 tooltip（包含操作名称）

3. 点击区域足够大：
   - 统一保证 **≥ 32px**

### 自检点
- 如果操作列塞了很多按钮，优先收敛动作，或把次要动作放到 `Dropdown` 菜单里（菜单项仍要清晰命名）
- 删除/编辑/新增等操作必须产生**真实业务效果**：更新 state / 打开编辑弹窗并保存 / 实际删除数据

---

## 4) 宽列表：横向滚动 + 列最小宽度
### 规则
- 字段多导致超宽：表格必须支持**横向滚动**（horizontal scroll）
- `volume`（如果作为列名/关键列）必须有 **min-width**，避免被挤压

### 落地建议（Ant Design Table）
- 开启横向滚动：
  - `scroll={{ x: 1200 }}`（给一个大于总列宽的值，或用 `x: "max-content"`）
- 给关键列设置 `width`（或在自定义渲染里确保容器有 min width）
- 对内容很长的列：
  - 用 `ellipsis: true` 或 `Typography.Text ellipsis`

---

## 5) 卡片样式（层次不要靠粗边框）
### 规则
- 禁止 heavy border
- 用轻阴影/浅背景层次替代

---

## 一次性检查清单（建议每个列表页都跑一遍）
- [ ] Tag：圆角 999、无 border、按值分色、背景低透明度
- [ ] Link：只有可跳转字段才是 link；否则用黑/灰文本
- [ ] 操作列：按钮数量匹配样式规则；hover tooltip（当 icon-only）
- [ ] 宽表：`scroll.x` 已开；关键列有 width/min-width；`volume` 列不被挤压
- [ ] 卡片：无粗边框，层次靠 shadow/背景

