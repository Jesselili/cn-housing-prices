# 房价趋势摘要表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在趋势图下方增加一个随住宅类型、城市和日期范围更新的“城市 × 户型”房价摘要表。

**Architecture:** 在 `src/data.ts` 增加纯函数 `getSummaryRows`，从原始 CSV 分别读取环比、同比并计算基期累计变化；`src/components/SummaryTable.tsx` 只负责语义化表格渲染和格式化；`App.tsx` 复用现有 `effectiveFilters` 接入数据流，`styles.css` 增加桌面端样式。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、原生 HTML table；不引入图表或其他运行时依赖。

## Global Constraints

- Runtime data comes from `data/house_price_index_all.csv`.
- Use `metric=环比` and `base=上月=100` for monthly compounding.
- Use `metric=同比` and `base=上年同月=100` for the year-over-year table value.
- 二手住宅 uses `size_band=全部`; 新建商品住宅 uses `90m2及以下`、`90-144m2`、`144m2以上`.
- Filter raw rows first, then calculate the selected range's base growth from its first valid month.
- Preserve internal CSV `m2` values and use `m²` only in visible copy.
- Keep the existing mobile styles unchanged and do not add mobile-specific layout or acceptance checks.
- Do not read, copy, or modify `examples/`.
- Keep the trend chart as native SVG and do not add a chart library.
- Because the current directory is not a Git worktree, do not claim commits or create a worktree.

---

### Task 1: Define the summary data contract with failing tests

**Files:**
- Modify: `tests/data.test.ts`
- Test target: `src/data.ts` via the new `getSummaryRows` import

**Interfaces:**
- Produces the required behavior for `getSummaryRows(rows, options)` before implementation.
- Expected return shape:

```ts
interface SummaryRow {
  key: string;
  city: string;
  sizeBand: SizeBand;
  latestPeriod: string | null;
  monthOverMonth: number | null;
  yearOverYear: number | null;
  baseGrowth: number | null;
}
```

- [ ] **Step 1: Add a summary fixture containing a base month, latest month, comparison months, and three new-build size bands**

Use rows equivalent to the following records in the test fixture. Keep the production CSV untouched:

```ts
const summaryRows = [
  { period: '2023-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '101' },
  { period: '2023-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '同比', base: '上年同月=100', value: '98.5' },
  { period: '2024-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99' },
  { period: '2024-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '同比', base: '上年同月=100', value: '96.5' },
  { period: '2023-08', house_type: '新建商品住宅', size_band: '90m2及以下', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90m2及以下', city: '上海', metric: '环比', base: '上月=100', value: '102' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90m2及以下', city: '上海', metric: '同比', base: '上年同月=100', value: '101.2' },
  { period: '2023-08', house_type: '新建商品住宅', size_band: '90-144m2', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90-144m2', city: '上海', metric: '环比', base: '上月=100', value: '101' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90-144m2', city: '上海', metric: '同比', base: '上年同月=100', value: '100.8' },
  { period: '2023-08', house_type: '新建商品住宅', size_band: '144m2以上', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '144m2以上', city: '上海', metric: '环比', base: '上月=100', value: '99' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '144m2以上', city: '上海', metric: '同比', base: '上年同月=100', value: '99.8' },
] as CsvRow[];
```

- [ ] **Step 2: Write the failing tests for resale values, new-build row granularity, range bounds, compounding, and missing comparisons**

Add tests with these assertions:

```ts
it('builds one resale summary row with raw latest indices and compounded base growth', () => {
  const result = getSummaryRows(summaryRows, {
    housingType: '二手住宅',
    selectedCities: ['北京'],
    startPeriod: '2023-08',
    endPeriod: '2024-09',
  });
  expect(result[0]).toMatchObject({
    key: '北京__全部',
    city: '北京',
    sizeBand: '全部',
    latestPeriod: '2024-09',
    monthOverMonth: 99,
    yearOverYear: 96.5,
  });
  expect(result[0].baseGrowth).toBeCloseTo(-0.01, 8);
});

it('builds one row for each new-build size band in selected city order', () => {
  const result = getSummaryRows(summaryRows, {
    housingType: '新建商品住宅',
    selectedCities: ['上海'],
    startPeriod: '2023-08',
    endPeriod: '2023-09',
  });
  expect(result.map(({ key, sizeBand }) => [key, sizeBand])).toEqual([
    ['上海__90m2及以下', '90m2及以下'],
    ['上海__90-144m2', '90-144m2'],
    ['上海__144m2以上', '144m2以上'],
  ]);
  expect(result.map(({ baseGrowth }) => baseGrowth)).toEqual([2, 1, -1]);
});

it('keeps the latest period inside inclusive bounds', () => {
  const result = getSummaryRows(summaryRows, {
    housingType: '二手住宅',
    selectedCities: ['北京'],
    startPeriod: '2023-08',
    endPeriod: '2023-09',
  });
  expect(result[0].latestPeriod).toBe('2023-09');
  expect(result[0].monthOverMonth).toBe(101);
});

it('returns null when the latest row has no same-month comparison', () => {
  const result = getSummaryRows(summaryRows.filter((row) => row.metric !== '同比'), {
    housingType: '二手住宅',
    selectedCities: ['北京'],
    startPeriod: '2023-08',
    endPeriod: '2024-09',
  });
  expect(result[0].yearOverYear).toBeNull();
});
```

- [ ] **Step 3: Run the focused test and verify it fails for the missing production function**

Run: `npm test -- tests/data.test.ts`

Expected: FAIL because `getSummaryRows` is not exported/implemented yet. Do not change production code before observing this failure.

### Task 2: Implement the pure summary calculation

**Files:**
- Modify: `src/data.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Add `SummaryRow` and `SummaryOptions` exports.
- Add `getSummaryRows(rows: CsvRow[], options: SummaryOptions): SummaryRow[]`.

- [ ] **Step 1: Add the summary types and a numeric value parser**

Use nullable numeric fields in the return type. Treat blank, malformed, or non-finite CSV values as unavailable rather than coercing them to zero.

- [ ] **Step 2: Filter records by housing type, selected cities, size bands, and inclusive date bounds**

For each selected city and `sizeBandsFor(housingType)` entry, collect only the matching rows. Keep the selected city order and the existing size-band order.

- [ ] **Step 3: Build period maps for raw monthly and year-over-year indices**

Use only `metric=环比` + `base=上月=100` for the monthly map and `metric=同比` + `base=上年同月=100` for the year-over-year map. Locate the latest period from valid monthly values, then read the comparison values at that same period.

- [ ] **Step 4: Calculate base growth from the first valid in-range monthly value**

Initialize the selected series at 100 for its first valid monthly period, multiply each later monthly index divided by 100, and return `cumulative - 100` rounded only by the UI formatter. If no valid monthly record exists, do not emit a summary row.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `npm test -- tests/data.test.ts`

Expected: all existing data tests and the new summary tests pass.

### Task 3: Add the semantic summary table component

**Files:**
- Create: `src/components/SummaryTable.tsx`

**Interfaces:**
- Consume `SummaryRow` from `src/data.ts`.
- Export `SummaryTable({ rows, housingType, basePeriod }: { rows: SummaryRow[]; housingType: HousingType; basePeriod: string | null })`.

- [ ] **Step 1: Add visible size-band labels without changing internal values**

Use `90m²及以下`, `90–144m²`, and `144m²以上` only when composing new-build row labels. Show resale rows as the city name alone.

- [ ] **Step 2: Render an accessible table with the five requested columns**

Use `<section>`, `<table>`, `<caption>`, `<thead>`, `<tbody>`, and `<th scope="col">`. The final header must be `相比基期涨幅（${basePeriod ?? '—'}）`.

- [ ] **Step 3: Format display values**

Format latest periods as `YYYY年MM月`, raw indices to one decimal place, and base growth to two decimal places with `%`; use `—` for null values. Add a sign to positive base growth values while leaving zero as `0.00%`.

- [ ] **Step 4: Render a consistent empty state when rows are empty**

Keep the table section heading visible but show a short no-data message instead of an empty table body. Do not invent values or hide missing cells.

### Task 4: Integrate the table and desktop styles

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `App` computes `summaryRows` with the same raw rows and effective housing/city/date filters used by the chart.
- `SummaryTable` renders below `.chart-scroll` and above `.card-footer`.

- [ ] **Step 1: Import and compute summary rows from the existing effective filters**

Use `rangeInvalid ? [] : getSummaryRows(rows, effectiveFilters)`. Resolve the visible base period as `effectiveRange.startPeriod ?? availablePeriods[0] ?? null`, so the default full-range state has an explicit header month.

- [ ] **Step 2: Gate rendering by load and range state**

Do not render data while loading or after a load error. For a valid loaded state, render the table even when there are no selected cities so the component can show its empty state. Do not render stale summary rows for an invalid date range.

- [ ] **Step 3: Add only the required desktop table styles**

Add styles for the summary section, heading, table wrapper, table cells, numeric alignment, and base-growth badge. Reuse existing variables and do not add media queries or mobile-specific rules.

- [ ] **Step 4: Run the test suite and production build**

Run: `npm test`

Expected: all tests pass.

Run: `npm run build`

Expected: TypeScript checks and Vite production build exit successfully.

### Task 5: Final verification against the requested behavior

**Files:**
- Inspect: `src/App.tsx`, `src/data.ts`, `src/components/SummaryTable.tsx`, `src/styles.css`, `tests/data.test.ts`

- [ ] **Step 1: Verify the diff is limited to the feature**

Run: `git diff -- ...` only if Git metadata becomes available; otherwise inspect the listed files and `find` output. Confirm `examples/` was not touched.

- [ ] **Step 2: Verify the data contract manually from the implementation**

Confirm that the implementation uses raw `value` for monthly/year-over-year cells, compounds only monthly rows for base growth, dynamically includes the actual base period in the header, and keeps `m2` internal values unchanged.

- [ ] **Step 3: Re-run the full verification commands before reporting completion**

Run: `npm test && npm run build`

Expected: Vitest reports zero failed tests and Vite reports a successful production build.
