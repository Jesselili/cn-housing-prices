# 70 城价格指数环比模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有趋势看板之后增加独立的 70 城最新月份环比模块，支持二手住宅和新建住宅户型切换。

**Architecture:** `src/data.ts` 提供纯函数，按住宅类型和户型从原始 CSV 找到最新月份并计算城市排序与概览统计；`src/components/MonthOverMonthModule.tsx` 管理模块内部切换状态并使用原生 SVG 渲染柱状图；`App.tsx` 只传入原始数据和加载状态。模块不读取现有趋势看板的城市或日期筛选。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、原生 HTML/CSS/SVG；不引入图表库或外部依赖。

## Global Constraints

- Runtime data comes from `data/house_price_index_all.csv`.
- Use only `metric=环比` and `base=上月=100` for this module.
- 二手住宅 uses `size_band=全部`; 新建住宅 defaults to `90m2及以下` and switches to `90-144m2` or `144m2以上`.
- The latest period is derived from the selected module type and size band, independent of the upper trend filters.
- Change is `value - 100`; classify `> 0` as上涨, `= 0` as持平, `< 0` as下降.
- Keep internal CSV `m2` values unchanged; use `m²` only in visible copy.
- Do not add one-/two-/three-tier city classifications or median statistics.
- Keep the existing mobile styles unchanged and do not add mobile-specific layout or acceptance checks.
- Do not read, copy, or modify `examples/`.
- Use native SVG; do not add a chart library.
- Update `AGENTS.md` if the architecture changes.

---

### Task 1: Define the latest-month snapshot contract with failing tests

**Files:**
- Modify: `tests/data.test.ts`
- Test target: `src/data.ts` via `getLatestMonthOverMonthSnapshot`

**Interfaces:**

```ts
interface MonthOverMonthPoint {
  city: string;
  indexValue: number;
  change: number;
}

interface MonthOverMonthOverview {
  coverageCities: number;
  rising: number;
  unchanged: number;
  falling: number;
  mean: number | null;
  min: number | null;
  max: number | null;
}

interface MonthOverMonthSnapshot {
  period: string | null;
  points: MonthOverMonthPoint[];
  overview: MonthOverMonthOverview;
}
```

- [ ] **Step 1: Add a focused fixture with latest, older, wrong-metric, invalid-value, and new-build size-band rows**

Keep the fixture in `tests/data.test.ts` and include at least three resale cities and two new-build size bands. Include an older period and a `同比` row with the same value so the test proves the snapshot filters by metric/base.

- [ ] **Step 2: Write failing tests for latest period, ordering, classifications, mean, range, and new-build band selection**

The resale assertion must prove that points are sorted by `change` descending and city name ascending for ties; the overview must verify coverage, rising, unchanged, falling, mean, min, and max. The new-build assertion must verify that selecting `90-144m2` excludes `90m2及以下` rows.

- [ ] **Step 3: Run the focused test and verify it fails because the function is missing**

Run: `npm test -- tests/data.test.ts`

Expected: new snapshot tests fail with `getLatestMonthOverMonthSnapshot` missing while the existing tests remain green.

### Task 2: Implement the pure latest-month snapshot calculation

**Files:**
- Modify: `src/data.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Export `MonthOverMonthPoint`, `MonthOverMonthOverview`, `MonthOverMonthSnapshot`, and `MonthOverMonthOptions`.
- Export `getLatestMonthOverMonthSnapshot(rows: CsvRow[], options: MonthOverMonthOptions): MonthOverMonthSnapshot`.

- [ ] **Step 1: Add the snapshot types and resolve the selected size band**

Default resale to `全部`; default new-build to `90m2及以下`. Do not mutate or rename CSV values.

- [ ] **Step 2: Filter valid monthly rows and find the latest period**

Filter by housing type, size band, `metric=环比`, `base=上月=100`, and finite numeric `value`. Use the maximum `period` from the remaining rows. If none remain, return a null period, empty points, and zero/null overview fields.

- [ ] **Step 3: Create one point per city and sort deterministically**

Use only rows from the latest period. Map `indexValue` to `value` and `change` to `value - 100`; deduplicate by city and sort descending by change, then ascending by city name.

- [ ] **Step 4: Calculate overview statistics**

Count each classification from the sorted points, compute the arithmetic mean, minimum, and maximum of `change`, and return the points with the overview.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `npm test -- tests/data.test.ts`

Expected: all data tests pass.

### Task 3: Add the module component with a failing render test

**Files:**
- Create: `tests/MonthOverMonthModule.test.tsx`
- Test target: `src/components/MonthOverMonthModule.tsx`

**Interfaces:**
- Render `MonthOverMonthModule` with `{ rows: CsvRow[]; loadState: 'loading' | 'ready' | 'error' }`.

- [ ] **Step 1: Write a static-render test for the ready state**

Use `renderToStaticMarkup` and assert that the markup contains the dynamic title `70 城价格指数环比-二手住宅-202607`, the six overview labels, one city label, a signed bar value, and an SVG role/name.

- [ ] **Step 2: Write a static-render test for new-build default copy**

Assert that the default ready state exposes `新建住宅` and `90m²及以下` controls/copy, without requiring a browser interaction harness.

- [ ] **Step 3: Run the component test and verify it fails because the component is missing**

Run: `npm test -- tests/MonthOverMonthModule.test.tsx`

Expected: the suite fails because `src/components/MonthOverMonthModule.tsx` does not exist.

### Task 4: Implement the module UI and native SVG chart

**Files:**
- Create: `src/components/MonthOverMonthModule.tsx`
- Test: `tests/MonthOverMonthModule.test.tsx`

**Interfaces:**
- Consume `getLatestMonthOverMonthSnapshot` and the snapshot types from `src/data.ts`.
- Keep module state local: housing type defaults to二手住宅; size band defaults to `90m2及以下` and is shown only for new-build.

- [ ] **Step 1: Implement loading and error states**

Render a separate card with a loading message or module-level error message when `loadState` is not `ready`; do not render fabricated statistics.

- [ ] **Step 2: Implement the title, housing-type control, and new-build size control**

Format the latest period `YYYY-MM` as compact `YYYYMM` for the title. Add the active new-build visible label with `m²` while passing the internal `m2` value to the data function.

- [ ] **Step 3: Implement the six-item overview row**

Render coverage, rising, unchanged, falling, mean, and range from the snapshot. Format change values with one decimal and a leading `+` for positive values.

- [ ] **Step 4: Implement the horizontally scrollable native SVG bar chart**

Sort order comes from the data function. Give each city a fixed SVG slot, draw a zero line, render positive bars above zero and negative bars below zero, show each signed change value, and rotate city labels. Use an internal width that grows with city count so 70 cities remain readable within a horizontal scroll container.

- [ ] **Step 5: Run the focused component test and verify it passes**

Run: `npm test -- tests/MonthOverMonthModule.test.tsx`

Expected: both ready-state render tests pass.

### Task 5: Integrate the module and add desktop styles

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `AGENTS.md`

- [ ] **Step 1: Render the independent module after the existing trend card**

Pass the raw `rows` and current `loadState`; do not pass `filters.selectedCities`, `filters.startPeriod`, or `filters.endPeriod` as module inputs.

- [ ] **Step 2: Add desktop styles for the separate card, overview row, controls, chart scroll, bars, labels, and empty states**

Use existing color variables and spacing conventions. Do not add media queries or new mobile-specific rules.

- [ ] **Step 3: Update `AGENTS.md` architecture notes**

Document that the independent module derives latest-month all-city snapshots from raw monthly indices and owns its housing/size controls.

- [ ] **Step 4: Run the full test suite and production build**

Run: `npm test`

Expected: all tests pass.

Run: `npm run build`

Expected: TypeScript and Vite production build exit successfully.

### Task 6: Final requirement verification

**Files:**
- Inspect: `src/data.ts`, `src/components/MonthOverMonthModule.tsx`, `src/App.tsx`, `src/styles.css`, `tests/data.test.ts`, `tests/MonthOverMonthModule.test.tsx`, `AGENTS.md`

- [ ] **Step 1: Verify the implementation against the approved design**

Confirm the module is independent, uses the latest period, covers all valid cities, supports the requested new-build bands, excludes tier classification and median, and keeps the existing trend chart/date/city behavior unchanged.

- [ ] **Step 2: Confirm `examples/` was not touched**

Inspect only the project paths above and confirm no command read or modified `examples/`.

- [ ] **Step 3: Run final verification before reporting completion**

Run: `npm test && npm run build`

Expected: Vitest reports zero failures and Vite reports a successful production build.
