# 房价数据状态与指标显示切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有房价趋势 dashboard 增加动态数据状态卡，并让主趋势图与摘要表支持指数/变化率显示切换。

**Architecture:** 在 `src/data.ts` 增加纯函数 `getDataStatus` 和展示格式化函数；`App` 在 CSV 解析成功后记录页面读取时间并持有显示模式。`DataStatusCard` 和 `MetricDisplayToggle` 为独立组件，`TrendChart` 与 `SummaryTable` 只接收显示模式并负责渲染，不改变数据计算。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、原生 SVG/CSS。

## Global Constraints

- 继续使用 `data/house_price_index_all.csv`，不新增外部依赖或图表库。
- 继续使用 `metric=环比`、`base=上月=100` 计算趋势，首个有效月归一为 100。
- 变化率显示由指数减 100 得到；不将指数误标为每平方米价格。
- 指标切换不影响独立的 `MonthOverMonthModule`。
- 保持现有桌面优先范围，不增加新的移动端布局或交互验收要求。
- 保留工作区已有修改，只提交本计划涉及的文件。

---

### Task 1: Add tested data-status and display-format helpers

**Files:**
- Modify: `src/data.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Produces `MetricDisplayMode`, `DataStatus`, `getDataStatus(rows, loadedAt)`, and `formatDisplayValue(value, mode)` for the UI components.

- [ ] **Step 1: Write failing tests for status aggregation and formatting**

Add tests that construct a small CSV fixture with one missing full month for one housing type, then assert:

```ts
expect(getDataStatus(rows, loadedAt)).toEqual({
  latestPeriod: '2026-02',
  cityCount: 2,
  expectedCityCount: 70,
  housingTypes: {
    二手住宅: {
      firstPeriod: '2026-01',
      latestPeriod: '2026-02',
      missingPeriods: [],
    },
    新建商品住宅: {
      firstPeriod: '2026-01',
      latestPeriod: '2026-01',
      missingPeriods: ['2026-02'],
    },
  },
  sourceUrl: 'https://example.com/latest',
  loadedAt,
});
expect(formatDisplayValue(99.2, 'index')).toBe('99.20');
expect(formatDisplayValue(99.2, 'change')).toBe('-0.80%');
expect(formatDisplayValue(null, 'change')).toBe('—');
```

- [ ] **Step 2: Run the focused test and verify it fails for missing exports**

Run: `npm test -- tests/data.test.ts`

Expected: FAIL because `getDataStatus` and `formatDisplayValue` are not implemented yet.

- [ ] **Step 3: Implement the minimal pure helpers**

In `src/data.ts`, define the new types and implement `getDataStatus` using valid monthly rows (`metric === '环比'`, `base === '上月=100'`, finite `value`). Use the union of valid periods as the reference timeline, use the first/last valid period for each housing type, count missing reference periods with no valid row for that type, and choose the latest valid row's non-empty `source_url`. Implement `formatDisplayValue` with two decimals, a plus sign for positive changes, and `—` for null/non-finite values.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/data.test.ts`

Expected: PASS, including all pre-existing data tests.

### Task 2: Add the dynamic data status card

**Files:**
- Create: `src/components/DataStatusCard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `tests/DataStatusCard.test.tsx`

**Interfaces:**
- Consumes `DataStatus` and `LoadState`.
- Produces a status card with the latest period, coverage, type ranges, missing-month counts, source link, and page load time.

- [ ] **Step 1: Write failing component tests**

Create a fixture `DataStatus` and assert the component renders the latest month, `2 / 70 个城市`, both housing ranges, the missing-month count, an anchor with the source URL, and the “页面读取时间” label. Add a loading/error assertion that the unavailable state does not render a source link.

- [ ] **Step 2: Run the focused component test and verify it fails**

Run: `npm test -- tests/DataStatusCard.test.tsx`

Expected: FAIL because `DataStatusCard` does not exist.

- [ ] **Step 3: Implement the card and wire it into `App`**

Add `loadedAt` state initialized to `null`; set it to `new Date()` only after CSV parsing and field validation succeed. Compute `dataStatus` with `useMemo`. Render `DataStatusCard` between `DashboardIntro` and the main trend card. For loading/error states render a concise unavailable message without invented metadata. Format dates using the browser locale and keep source links external with `target="_blank"` and `rel="noreferrer"`.

- [ ] **Step 4: Add focused styles matching the existing visual language**

Use a bordered, light card with compact metric cells, a two-column housing-type detail area, and a subtle metadata footer. Keep the card readable at desktop widths without adding mobile-specific rules.

- [ ] **Step 5: Run the focused component test and verify it passes**

Run: `npm test -- tests/DataStatusCard.test.tsx`

Expected: PASS.

### Task 3: Add the index/change display mode

**Files:**
- Create: `src/components/MetricDisplayToggle.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/TrendChart.tsx`
- Modify: `src/components/SummaryTable.tsx`
- Modify: `src/styles.css`
- Create: `tests/MetricDisplayToggle.test.tsx`
- Modify: `tests/SummaryTable.test.tsx`

**Interfaces:**
- `MetricDisplayToggle` consumes `MetricDisplayMode` and `onChange`.
- `TrendChart` consumes `displayMode` and renders either cumulative index or cumulative change rate.
- `SummaryTable` consumes `displayMode` and renders raw indices or percentage changes.

- [ ] **Step 1: Write failing component tests for toggle and display output**

Test that the toggle marks “指数” pressed by default and calls `onChange('change')` when “变化率” is clicked. Extend the summary table fixture to assert that change mode renders `-0.80%` for a `99.2` month-over-month index and preserves the existing cumulative growth percentage. Add a trend chart assertion that the SVG title/description and y-axis labels identify change-rate mode.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- tests/MetricDisplayToggle.test.tsx tests/SummaryTable.test.tsx`

Expected: FAIL because the toggle and `displayMode` props do not exist.

- [ ] **Step 3: Implement the toggle and pass state from `App`**

Add `displayMode` state initialized to `'index'`. Render the toggle beside the existing housing/date/city controls and pass the mode to `TrendChart` and `SummaryTable`. Keep `MonthOverMonthModule` unchanged.

- [ ] **Step 4: Implement mode-aware chart and table formatting**

In `TrendChart`, transform only the rendered y-values, ticks, tooltip values, title, and description: index mode keeps the existing cumulative index; change mode renders `value - 100` as a percentage while retaining the same data points and paths. Add a visible 0% reference line in change mode if it can be done within the existing SVG structure without changing index mode. In `SummaryTable`, use `formatDisplayValue` for month-over-month and year-over-year cells in change mode; leave the existing `baseGrowth` calculation and heading semantics intact, changing only its display label to match the selected mode.

- [ ] **Step 5: Style the toggle and run focused tests**

Match the existing segmented controls and run: `npm test -- tests/MetricDisplayToggle.test.tsx tests/SummaryTable.test.tsx`

Expected: PASS.

### Task 4: Full verification and scope review

**Files:**
- Modify: `src/components/DataStatusCard.tsx` or `src/data.ts` only if verification identifies a defect in this feature.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all test files pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript check and Vite production build complete successfully.

- [ ] **Step 3: Review the diff for scope and stale copy**

Run: `git diff --check` and `git diff --stat`

Confirm no unrelated files changed, all labels distinguish index from percentage change, and the static data-range copy in `DashboardIntro` is not contradicted by the new dynamic card.
