# Todo

> 每个任务开始前，在此写下计划（含可检查项）。实施中标记完成状态，完成后添加审查小结。

---

## 进行中

### [2026-06-04] 创建项目 AGENTS.md（多 agent 协作规范）

**目标**：按照 AGENTS.md 开放标准，为项目撰写一份指导多 agent 协作的规范文件，置于仓库根目录。

**计划**：
- [x] 研读 agents.md / augmentcode / asdlc.io 等官方规范文档
- [x] 在仓库根目录创建 `AGENTS.md`，包含：Mission、Toolchain、Judgment Boundaries、Agent Roles、非显然领域规则、Context Map
- [ ] 提交并推送至 GitHub

---

## 待办

*（暂无待办任务。）*

---

## 已完成

### [2026-06-04] 初始化 GitHub 远程仓库并合并前后端

**目标**：将本地前端代码同步到团队共用的 GitHub 仓库，并与后端代码合并为统一仓库结构。

**计划**：
- [x] 检查本地 git 状态与远程配置
- [x] 添加 `origin` remote（`https://github.com/bzhang533-blip/Smart-Farming-.git`）
- [x] 拉取远程（已有后端 commits）
- [x] 解决 `.gitignore` 合并冲突（保留更完整的前端版本）
- [x] 推送合并结果至 `main`

**审查**：仓库现结构为 `frontend/`（Next.js）+ `backend/`（Dart），两套代码共存于同一 `main` 分支。合并冲突仅出现在 `.gitignore`，已取本地更完整版本。

---

### [2026-06-04] 编写双语 README

**目标**：为 GitHub 仓库写一份面向用户的项目介绍，中英文双版本。

**计划**：
- [x] 梳理项目结构、功能模块、技术栈
- [x] 编写英文版（功能、技术栈、快速开始、设计原则）
- [x] 编写中文版（与英文内容对应，非直译）
- [x] 提交并推送至 GitHub

**审查**：README 覆盖项目定位、MVP 范围（IA/IL/IN × 玉米/大豆）、四大功能模块、技术栈、快速开始、设计原则。已推送至 `main`。

---

### [2026-06-04] 项目初始化

- [x] 创建 `CLAUDE.md`（项目规范与工作流编排）
- [x] 创建 `tasks/api-contracts.md`（前后端接口契约草稿）
- [x] 创建 `tasks/lessons.md`（经验教训记录）
- [x] 创建 `tasks/todo.md`（任务跟踪）

**审查**：项目骨架建立完毕。所有 API 契约均标注 `TODO: 待后端确认`，前端开发将以 mock 数据推进，直至后端对齐。

---

## 模板

```markdown
### [YYYY-MM-DD] 任务标题

**目标**：一句话说明要做什么。

**计划**：
- [ ] 步骤 1
- [ ] 步骤 2
- [ ] 步骤 3

**审查**：完成后填写——实际做了什么，有无偏差，后续跟进。
```
