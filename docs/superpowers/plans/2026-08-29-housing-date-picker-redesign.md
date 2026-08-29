# 房价趋势日期筛选器重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将原生月份下拉替换为与 dashboard 风格一致的自绘日期范围筛选器，并按住宅类型使用正确的可用日期边界。

**Architecture:** 保持 React + TypeScript + Vite 和原生 SVG 图表不变。日期范围计算、住宅类型口径边界、快捷范围和范围规范化放在纯函数中；`DateRangeFilter` 只负责弹层、快捷按钮和月份滑杆，`App` 负责把当前住宅类型与城市选择映射为可用月份并同步状态。

**Tech Stack:** React, TypeScript, Vite, Vitest, native CSS, native `input[type="range"]`.

## Global Constraints

- 使用 `metric=环比` 和 `base=上月=100`，趋势先过滤原始行，再以当前区间首个有效月份归一为 100。
- 二手住宅使用 `size_band=全部`；新建住宅使用 `90m2及以下`、`90-144m2`、`144m2以上`。
- 新建住宅页面的三个户型分组首个有效月份是 `2018-03`；CSV 中新建住宅 `size_band=全部` 的 `2011-02` 不得作为该页面边界。
- 默认日期范围仍为当前住宅类型的完整有效周期，不新增“全量”或“重置”按钮。
- `examples` 仅是参考项目，实施过程中不得读取、复制或修改。
- 不引入第三方日期选择器或图表库。

---

### Task 1: 为日期口径与快捷范围补充失败测试

**Files:**
- Modify: `tests/data.test.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Test `getAvailablePeriods(rows, { housingType, cities })` returns only periods from the active housing-type display bands and monthly-over-month rows.
- Test `getQuickRange(periods, months)` returns a natural-month range ending at the latest available month and snaps the start to the first available month at or after the target.
- Test `normalizePeriodRange(range, periods)` preserves in-range bounds, clamps partially overlapping bounds, and returns the full effective range when there is no overlap.
- Test the housing-type reducer action can update the type and an already-normalized range in one action.

- [x] **Step 1: Extend the fixture with representative resale and new-build rows.**

Include new-build `全部` rows from `2011-02`, new-build size-band rows from `2018-03`, a later period, and at least one irrelevant metric/base row. Keep the existing fixture assertions intact.

- [x] **Step 2: Add failing assertions for filtered periods.**

```ts
expect(getAvailablePeriods(rows, { housingType: NEW_BUILD_HOUSING, cities: ['北京'] })).toEqual([
  '2018-03',
  '2020-01',
]);
```

Also assert the resale `size_band=全部` periods remain based on the resale display口径.

- [x] **Step 3: Add failing assertions for quick ranges and range normalization.**

```ts
expect(getQuickRange(['2020-01', '2020-02', '2020-05', '2021-01'], 12)).toEqual({
  startPeriod: '2020-02',
  endPeriod: '2021-01',
});
expect(normalizePeriodRange({ startPeriod: '2017-01', endPeriod: '2020-05' }, ['2018-03', '2019-01', '2020-05'])).toEqual({
  startPeriod: '2018-03',
  endPeriod: '2020-05',
});
expect(normalizePeriodRange({ startPeriod: '2017-01', endPeriod: '2018-01' }, ['2018-03', '2019-01'])).toEqual({
  startPeriod: null,
  endPeriod: null,
});
```

- [x] **Step 4: Add a failing reducer assertion for atomic housing-type/range changes.**

```ts
expect(filterReducer(initial, {
  type: 'housingType/set',
  housingType: NEW_BUILD_HOUSING,
  range: { startPeriod: '2018-03', endPeriod: null },
})).toMatchObject({
  housingType: NEW_BUILD_HOUSING,
  startPeriod: '2018-03',
  endPeriod: null,
});
```

- [x] **Step 5: Run the focused test and confirm the new assertions fail for the expected missing APIs.**

Run: `npx vitest run tests/data.test.ts`

Expected: FAIL because filtered `getAvailablePeriods`, `getQuickRange`, `normalizePeriodRange`, and the reducer range payload are not implemented yet.

### Task 2: 实现日期纯函数与筛选状态边界

**Files:**
- Modify: `src/data.ts`
- Modify: `src/filterState.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- `getAvailablePeriods(rows: CsvRow[], options?: { housingType?: HousingType; cities?: string[] }): string[]`
- `getQuickRange(periods: string[], months: number): { startPeriod: string; endPeriod: string } | null`
- `normalizePeriodRange(range: PeriodRange, periods: string[]): { startPeriod: string | null; endPeriod: string | null }`
- `FilterAction` housing type branch accepts `range?: { startPeriod: string | null; endPeriod: string | null }` and updates both fields atomically when provided.

- [x] **Step 1: Implement type-aware `getAvailablePeriods`.**

When `housingType` is provided, include only rows matching that type, `metric=环比`, `base=上月=100`, and the bands returned by `sizeBandsFor`. Apply the city filter only when `cities` contains at least one city. Preserve the existing unfiltered behavior for callers that omit options.

- [x] **Step 2: Implement natural-month arithmetic and `getQuickRange`.**

Convert `YYYY-MM` to a zero-based month index, subtract `months - 1` from the latest period, and select the first available period not earlier than that target. Return `null` for an empty list or a non-positive month count.

- [x] **Step 3: Implement `normalizePeriodRange`.**

Use the sorted period list as the valid bounds. Preserve `null` for an unbounded side, clamp a partially overlapping explicit bound to the nearest valid endpoint, and return `{ startPeriod: null, endPeriod: null }` when the requested range is completely outside the valid period window or reversed.

- [x] **Step 4: Extend the reducer housing-type action with an optional normalized range.**

Merge `range.startPeriod` and `range.endPeriod` when the payload is present; keep the old behavior for existing callers without `range`.

- [x] **Step 5: Run all data tests and confirm green.**

Run: `npm test`

Expected: all existing and new data/reducer tests pass.

### Task 3: 重写自绘日期范围组件

**Files:**
- Modify: `src/components/DateRangeFilter.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `DateRangeFilter` consumes `periods: string[]`, `startPeriod: string | null`, `endPeriod: string | null`, `onChange(startPeriod: string | null, endPeriod: string | null)`, and `disabled?: boolean`.
- The component produces one trigger button, a `role="dialog"` popover, four shortcut buttons, two accessible `input[type="range"]` controls, and evenly distributed year labels.

- [x] **Step 1: Replace native month inputs with a styled trigger button.**

Display `YYYY.MM — YYYY.MM` using the first and last available periods when state is `null`. Expose `aria-expanded`, `aria-haspopup="dialog"`, and an accessible label. Use an inline calendar mark/CSS icon instead of a browser calendar icon.

- [x] **Step 2: Add popover lifecycle behavior.**

Open on trigger click, close on outside mouse down or `Escape`, and keep it open while the user changes shortcuts or sliders so comparisons can be made without reopening the menu.

- [x] **Step 3: Add quick range buttons.**

Render `近 12 个月`, `近 3 年`, `近 5 年`, and `近 10 年`, call `getQuickRange`, and apply the resulting start/end periods immediately. Mark an exact current match with `aria-pressed`; do not render a full-range/reset action.

- [x] **Step 4: Add two constrained month sliders.**

Map slider values to indexes in `periods`. The start slider has `max=endIndex`; the end slider has `min=startIndex`. Each change calls `onChange` immediately with both effective endpoints. Add `aria-valuetext` containing the formatted current month. Add keyboard-friendly native range behavior and year tick labels below the controls.

- [x] **Step 5: Add matching CSS for desktop and mobile.**

Use the existing warm-white surface, gray border, rounded corners, muted text and blue accent. Make the popover right-aligned on desktop, bounded by the picker width, and vertically organized below 760px. Avoid page-level horizontal overflow at 390px.

### Task 4: 按住宅类型计算日期边界并接入应用

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/filterState.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- `App` derives `availablePeriods` with `getAvailablePeriods(rows, { housingType: filters.housingType, cities: filters.selectedCities })`, falling back to all cities for date context when no city is selected.
- Housing-type changes dispatch `{ type: 'housingType/set', housingType, range }` where `range` is computed against the next type's period list.
- `getVisibleSeries` receives normalized effective bounds, while `DateRangeFilter` receives the same effective range for display.

- [x] **Step 1: Derive current-view period bounds.**

Replace the all-row period list with a list filtered to the active display口径. This makes the default second-hand boundary `2011-02` and the new-build size-band boundary `2018-03`.

- [x] **Step 2: Normalize the effective range before rendering the chart.**

Use `normalizePeriodRange(filters, availablePeriods)` and pass its values to `getVisibleSeries` and `DateRangeFilter`. Keep the existing invalid-range status fallback for externally impossible state, but normal slider interactions must never create it.

- [x] **Step 3: Make housing-type switching atomic.**

Before dispatching, derive the next type's periods and call `normalizePeriodRange(filters, nextPeriods)`. Dispatch the type and normalized range together, so the date button and chart update with the new type in the same state transition.

- [x] **Step 4: Remove the old native date component wiring.**

Pass the period list and range callback to the new component. The callback dispatches a `period/set` action for each endpoint or an equivalent two-field range update without adding a reset action.

- [x] **Step 5: Run tests and TypeScript build.**

Run: `npm test`

Run: `npm run build`

Expected: all tests pass and Vite production build exits with code 0.

### Task 5: 浏览器验收与最终回归

**Files:**
- No new files.
- Verify: `src/App.tsx`, `src/components/DateRangeFilter.tsx`, `src/styles.css`, `src/data.ts`

**Interfaces:**
- Browser-visible acceptance is the source of truth for the trigger/popover interaction, responsive layout, and housing-type boundary transition.

- [x] **Step 1: Verify default and type-specific ranges.**

Start the app with `npm run dev -- --host 127.0.0.1`, confirm second-hand shows `2011-02`, switch to new-build, confirm the button shows `2018-03`, and confirm 15 trend lines remain visible for five cities and three size bands.

- [x] **Step 2: Verify shortcut interaction.**

Open the date popover, click `近 3 年`, confirm the chart status and x-axis update immediately, and verify no browser-native month picker appears.

- [x] **Step 3: Verify slider and keyboard interaction.**

Move the start/end sliders, confirm the displayed months and chart range change, use arrow keys for a one-step adjustment, and verify the start slider cannot pass the end slider.

- [x] **Step 4: Verify city search remains intact.**

Open the city picker, type `上`, confirm only `上海` is listed, select it after removing it, and confirm the city chip and trend line return.

- [x] **Step 5: Verify narrow layout and console.**

At a 390px viewport, confirm the popover and controls remain within the page width, the chart remains horizontally scrollable only inside its chart container, and the console has no runtime errors.

- [x] **Step 6: Run final verification commands.**

Run: `npm test && npm run build`

Expected: 0 test failures and a successful production build.
