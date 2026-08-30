# Responsive Chart Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让少量数据图表填满卡片宽度，并让长期月份与 70 城图表在需要时保留舒适间距和横向滚动。

**Architecture:** 新增一个纯函数宽度工具，根据数据点数量、可用宽度、每点最小槽宽和边距计算 SVG 宽度。趋势图、市场广度图、最新环比图各自用 `ResizeObserver` 测量滚动视口并调用该工具；70 城横向比较表格保持现有布局。

**Tech Stack:** React、TypeScript、Vite、Vitest、原生 SVG、原生 CSS。

## Global Constraints

- 运行时数据来自 `data/house_price_index_all.csv`。
- 产品范围是桌面优先，不新增移动端布局或交互要求。
- 不改变现有数据口径、图表指标、排序、颜色、提示框或表格行为。
- 图表超出卡片可用宽度时，沿用现有横向滚动容器。
- `examples` 目录不读取、不复制、不修改。

---

### Task 1: 新增宽度计算的失败测试

**Files:**
- Create: `src/chartSizing.ts`
- Create: `tests/chartSizing.test.ts`

**Interfaces:**
- Consumes: 数据点数量、可用宽度、单点最小槽宽、左右边距。
- Produces: `getResponsiveChartWidth(pointCount, availableWidth, minPointWidth, horizontalPadding)`，返回不小于可用宽度和数据密度所需宽度的整数。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { getResponsiveChartWidth } from '../src/chartSizing';

describe('getResponsiveChartWidth', () => {
  it('fills the card when the data fits comfortably', () => {
    expect(getResponsiveChartWidth(6, 1600, 42, 96)).toBe(1600);
  });

  it('keeps the minimum data width when many points need more room', () => {
    expect(getResponsiveChartWidth(70, 900, 42, 96)).toBe(3036);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test -- tests/chartSizing.test.ts`

预期：因 `src/chartSizing.ts` 尚不存在而失败。

### Task 2: 实现纯函数并接入三个图表

**Files:**
- Modify: `src/chartSizing.ts`
- Modify: `src/components/TrendChart.tsx`
- Modify: `src/components/MarketBreadthModule.tsx`
- Modify: `src/components/MonthOverMonthModule.tsx`

**Interfaces:**
- Consumes: Task 1 的 `getResponsiveChartWidth`。
- Produces: 三个 SVG 图表根据视口宽度和数据点密度自适应，外层滚动容器保留。

- [ ] **Step 1: 实现最小宽度函数**

```ts
export function getResponsiveChartWidth(
  pointCount: number,
  availableWidth: number,
  minPointWidth: number,
  horizontalPadding: number,
): number {
  return Math.max(
    0,
    Math.ceil(Math.max(availableWidth, horizontalPadding + Math.max(pointCount, 0) * minPointWidth)),
  );
}
```

- [ ] **Step 2: 为趋势图增加测量宽度**

保留现有 `ResizeObserver`，将尺寸计算中的 `Math.max(viewportWidth, 960)` 替换为 `getResponsiveChartWidth(periods.length, viewportWidth, 42, 90)`，让少量月份填满视口、长期月份产生可滚动的最小宽度。

- [ ] **Step 3: 为市场广度图复用测量宽度**

保留现有 `chartScrollRef` 和 `availableChartWidth`，将市场广度宽度函数改为调用通用函数，使用每点 `9px` 和现有 `74px` 边距；移除会导致少量数据固定占据 `1120px` 的下限。

- [ ] **Step 4: 为最新环比图增加测量宽度**

新增滚动容器 ref、宽度状态和 `ResizeObserver`，将现有 `Math.max(1180, 74 + snapshot.points.length * 42)` 替换为通用函数，使用每城 `42px` 和 `74px` 边距。

- [ ] **Step 5: 运行针对性测试确认通过**

运行：`npm test -- tests/chartSizing.test.ts tests/TrendChart.test.tsx tests/MarketBreadthModule.test.tsx tests/MonthOverMonthModule.test.tsx`

预期：全部通过。

### Task 3: 更新架构说明并完成验证

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 2 的共享宽度计算和三个组件的容器测量职责。
- Produces: 与实现一致的项目说明和验证证据。

- [ ] **Step 1: 更新架构说明**

记录三个 SVG 图表使用容器宽度与数据点最小槽宽的较大值，数据密集时沿用横向滚动；注明 70 城矩阵表格不在本次宽度计算范围内。

- [ ] **Step 2: 运行完整验证**

运行：`npm test`

预期：全部测试通过。

运行：`npm run build`

预期：TypeScript 检查和 Vite 生产构建退出码均为 0。

运行：`git diff --check`

预期：无空白错误。
