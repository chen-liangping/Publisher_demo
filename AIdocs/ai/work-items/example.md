# Work Item: 引入 AI 自驱动闭环最小工作流

## 背景/目标
- 背景：当前流程依赖人工大量 review/验证，容易遗漏约束与自测步骤。
- 目标（可量化/可验证）：仓库内具备一套可复制的 Prompt + 约束文件 + Work Item 模板 + 校验脚本，并通过 `npm run ai:check` 一键自检。

## 方案设计（Designer）
- 涉及路由：无（文档与脚本层）
- 涉及组件/目录：
  - `AIdocs/ai_constraints.md`
  - `AIdocs/ai/*`
  - `scripts/ai/validate-work-item.mjs`
  - `package.json`（新增脚本）
  - `.cursor/rules/*`（可选：新增工作流规则）
- Mock 数据与状态设计：无
- 交互流：无
- 复用点：复用现有 `AGENTS.md` 的端口/命令约束与 `.cursor/skills/*` 的规范内容
- 冲突检查：不影响现有页面运行；只新增文档/脚本与 npm scripts

## 约束对齐（Constraints）
- [x] REPO.SCOPE.NO_BACKEND：仅新增文档与 node 脚本
- [x] TS.NO_ANY：脚本使用原生 Node，不引入 TS 编译链
- [x] CHANGE.SAFETY.NO_BREAKING：不改运行时页面逻辑

## 测试用例（最小自测）
- Case 1
  - Input: 仓库存在 `AIdocs/ai/work-items/example.md`
  - Expected: `npm run ai:validate` 返回通过

- Case 2
  - Input: 把 example.md 的某个必填 section 清空
  - Expected: `npm run ai:validate` 失败并指出缺失的 section

## Review 清单（Reviewer）
Reviewer Gate: PASS

- [x] 是否违反 `AIdocs/ai_constraints.md` 的 MUST 规则
- [x] 是否复用已有模块/类型（避免重复造轮子）
- [x] 是否提供最小自测用例模板（Input/Expected）

Reviewer Notes: 该 Work Item 主要是“工具链与规范落盘”，不涉及 UI/交互页面，但能显著降低后续人工参与度。

## 实施记录（Builder）
- 实际改动：新增 AIdocs + 校验脚本 + npm scripts
- 遇到的坑/权衡：校验脚本只做“结构完整性”检查，不替代真实业务测试
- 自测结果：
  - `npm run ai:check`：待执行
  - `npm run ai:check:full`（如执行）：待执行

## 交付物
- 变更文件清单：见 git diff
