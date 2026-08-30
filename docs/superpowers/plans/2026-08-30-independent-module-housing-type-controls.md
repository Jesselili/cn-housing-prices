# Independent Module Housing Type Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让房价趋势、70 城横向比较、市场广度趋势分别控制自己的住宅类型展示。

**Architecture:** 保留 `App` 中现有的住宅类型状态，仅供趋势图和最新数据摘要使用。`CityComparisonMatrix` 与 `MarketBreadthModule` 各自在组件内维护住宅类型状态，并继续在组件内维护新建住宅面积段筛选，避免引入新的全局状态。

**Tech Stack:** React、TypeScript、Vite、Vitest、原生 CSS。

## Global Constraints

- 运行时数据来自 `data/house_price_index_all.csv`。
- 保持现有桌面优先布局，不新增移动端布局或交互要求。
- 不改变两个模块既有的数据计算口径、排序、热力颜色或图表行为。
- 最新环比模块不纳入本次改动。

---

### Task 1: 为两个模块增加独立住宅类型控件测试

**Files:**
- Modify: `tests/CityComparisonMatrix.test.tsx`
- Modify: `tests/MarketBreadthModule.test.tsx`

**Interfaces:**
- Consumes: 当前两个组件的静态渲染接口。
- Produces: 对组件不依赖 `App` 传入住宅类型、且默认显示二手住宅控件的回归约束。

- [ ] **Step 1: 写失败测试**

在两个组件测试中改为不传 `housingType`，并分别断言渲染结果包含 `二手住宅`、`新建住宅`、`aria-label="住宅类型"` 和二手住宅按钮的 `aria-pressed="true"`。保留现有模块内容断言。

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test -- tests/CityComparisonMatrix.test.tsx tests/MarketBreadthModule.test.tsx`

预期：测试因组件仍要求 `housingType` 属性而失败，证明测试覆盖了新的独立接口。

### Task 2: 实现两个模块的本地住宅类型状态

**Files:**
- Modify: `src/components/CityComparisonMatrix.tsx`
- Modify: `src/components/MarketBreadthModule.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1 的组件接口约束；现有 `getCityComparisonSnapshot`、`getMarketBreadthSnapshot` 数据函数；现有住宅类型常量。
- Produces: 两个模块无 `housingType` 属性即可独立渲染，并各自响应住宅类型按钮点击。

- [ ] **Step 1: 在两个组件中新增本地状态**

使用 `useState<HousingType>(RESALE_HOUSING)` 保存各自的 `housingType`，将快照计算依赖、标题文本、空状态文本和新建住宅面积段显示条件改用本地状态。

- [ ] **Step 2: 在两个模块标题栏增加住宅类型切换**

在各自标题栏控制区域增加 `role="group"`、`aria-label="住宅类型"` 的两个按钮：`二手住宅` 和 `新建住宅`。点击时只更新本组件的本地状态；保留现有新建住宅面积段按钮。

- [ ] **Step 3: 移除 App 到两个模块的状态传递**

将 `App.tsx` 中两个模块的调用改为只传 `rows` 和 `loadState`，不再传 `filters.housingType`。

- [ ] **Step 4: 运行针对性测试确认通过**

运行：`npm test -- tests/CityComparisonMatrix.test.tsx tests/MarketBreadthModule.test.tsx`

预期：两个组件测试全部通过。

### Task 3: 更新架构说明并验证交付范围

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 2 的组件职责变化。
- Produces: 与代码一致的项目架构说明和可复核的验证结果。

- [ ] **Step 1: 更新架构说明**

明确 `CityComparisonMatrix` 和 `MarketBreadthModule` 各自拥有住宅类型和新建住宅面积段控制，且独立于趋势图筛选；明确趋势图住宅类型状态只作用于趋势图和最新数据摘要。

- [ ] **Step 2: 运行完整验证**

运行：`npm test`

预期：全部测试通过。

运行：`npm run build`

预期：Vite 生产构建以退出码 0 完成。

运行：`git diff --check`

预期：无空白错误。
