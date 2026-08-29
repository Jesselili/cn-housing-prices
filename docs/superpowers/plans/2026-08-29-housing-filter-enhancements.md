# 房价趋势日期与城市筛选增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inclusive month-range filtering with range-relative normalization and searchable city selection to the existing React + TypeScript housing trend dashboard.

**Architecture:** Extend the existing typed `FilterState` and reducer with optional start/end months. Filter raw monthly rows before building cumulative series, so every selected range starts at 100. Keep city matching as a pure selector used by `CityPicker`; keep the chart unaware of filter controls.

**Tech Stack:** React, TypeScript, Vite, Vitest, native `input type="month"`, and native SVG.

## Global Constraints

- Do not read, copy, import, or modify `examples` unless the user explicitly mentions it.
- Default date range is the complete available CSV period; do not add a reset button.
- Start and end months are inclusive.
- Filter rows before cumulative calculation; the first valid month in the selected range is 100.
- City search uses substring matching; input `上` must show `上海`.
- Search only filters the menu options and never removes existing selected cities.
- Preserve the existing housing-type, size-band, city, and monthly-index rules.

---

### Task 1: Extend the typed data and filter state contracts

**Files:**
- Modify: `src/data.ts`
- Modify: `src/filterState.ts`
- Modify: `tests/data.test.ts`

**Interfaces:**
- `FilterState` becomes `{ housingType: HousingType; selectedCities: string[]; startPeriod: string | null; endPeriod: string | null }`.
- `getVisibleSeries(rows, state)` accepts the extended state.
- `getAvailablePeriods(rows: CsvRow[]): string[]` returns sorted unique CSV periods.
- `filterCityOptions(cities: string[], query: string): string[]` returns all cities for a blank query and substring matches otherwise.
- `filterReducer` adds `{ type: 'period/set'; boundary: 'start' | 'end'; period: string | null }` and preserves existing actions.

- [ ] **Step 1: Add failing tests for date range, normalization, city matching, and reducer actions**

Extend `tests/data.test.ts` with assertions that `getAvailablePeriods` returns sorted unique periods, `getVisibleSeries` with `startPeriod='2024-02'` and `endPeriod='2024-02'` includes that boundary and normalizes its first point to 100, `filterCityOptions(['北京', '上海', '长沙'], '上')` returns `['上海']`, and `filterReducer` stores start/end period actions without changing the selected city list.

- [ ] **Step 2: Run the focused tests and verify the new behavior fails**

Run: `npx vitest run tests/data.test.ts`.

Expected: FAIL because the new selector, date arguments, and reducer action are not implemented. The existing tests may continue to pass; the new assertions must be the failing part.

- [ ] **Step 3: Implement the smallest typed data/state changes**

Update `filterRows` to accept optional `startPeriod` and `endPeriod` and keep rows where `period >= startPeriod` and `period <= endPeriod`. Pass those bounds from `getVisibleSeries` before `buildSeries`. Add `getAvailablePeriods` and `filterCityOptions`. Extend `DEFAULT_FILTER_STATE` with null bounds and add the `period/set` reducer branch. When both bounds are null, retain all rows exactly as before.

- [ ] **Step 4: Run the focused and full tests**

Run: `npx vitest run tests/data.test.ts` and `npm test`.

Expected: all tests PASS, including the selected-range first point equal to 100 and the `上` → `上海` match.

### Task 2: Add date controls and searchable city picker

**Files:**
- Create: `src/components/DateRangeFilter.tsx`
- Modify: `src/components/CityPicker.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `DateRangeFilter` accepts `{ minPeriod: string; maxPeriod: string; startPeriod: string | null; endPeriod: string | null; onChange: (boundary: 'start' | 'end', period: string) => void; disabled?: boolean }`.
- `CityPicker` keeps `{ cities, selectedCities, onToggle, disabled }` and adds an internal controlled search query.
- `App` derives `availablePeriods`, displays boundary values when state is null, and dispatches `period/set` without adding a reset action.

- [ ] **Step 1: Implement the controlled month-range component**

Render two labeled `input type="month"` controls with `min`/`max` bounds, visible labels “起始月份” and “结束月份”, and `aria-label` values. Use the earliest/latest available period as the displayed value when the corresponding state value is null. Emit the selected value through `onChange`; do not render a reset button.

- [ ] **Step 2: Add search input and substring filtering to CityPicker**

Add an `input type="search"` inside the open menu with placeholder `输入城市搜索` and accessible label `搜索城市`. Use `filterCityOptions(cities, query)` for menu options. Keep the menu open after checkbox changes; display `没有匹配的城市` when the filtered list is empty; keep selected chips visible even if the current query hides them.

- [ ] **Step 3: Connect date state and range validation in App**

Derive `availablePeriods` from all loaded rows. Pass the effective earliest/latest values to `DateRangeFilter`; dispatch `period/set` for changes. Treat `startPeriod > endPeriod` as invalid: show `起始月份不能晚于结束月份`, render no trend lines, and keep controls usable so the user can correct the range. For valid ranges, pass the stored bounds to `getVisibleSeries`, with null representing the full default range.

- [ ] **Step 4: Place and style the new controls**

Keep the city picker in the upper-right control area. Add the date range alongside the housing toggle without causing desktop overflow; at narrow widths stack date fields and controls. Style the search input, month fields, option empty state, focus rings, and compact labels using the existing visual system and 12px radius.

- [ ] **Step 5: Run build and tests**

Run: `npm test` and `npm run build`.

Expected: all tests PASS and the TypeScript/Vite production build succeeds.

### Task 3: Browser verification and regression correction

**Files:**
- Modify only the component or stylesheet file that contains a verified defect.
- Add a regression test before changing data/state behavior for a verified defect.

- [ ] **Step 1: Verify full-range defaults in resale and new-build views**

Open the local Vite app. Confirm both housing-type views initially use the earliest and latest available month values and preserve the existing full-range series counts.

- [ ] **Step 2: Verify range filtering and range-relative normalization**

Choose a narrow month range in each housing-type view. Confirm the status range changes, the first visible month is included, and tooltip/line data starts at 100 for each visible series.

- [ ] **Step 3: Verify city substring search**

Open the city picker, type `上`, confirm `上海` is shown, click it, and confirm its chip, line, and legend entry appear. Clear the query and confirm all cities return; confirm existing selections remain selected while searching.

- [ ] **Step 4: Verify invalid date range and responsive layout**

Attempt a reverse range and confirm the explicit validation message with no chart. Check a 390px viewport and confirm date controls, search input, and city menu remain usable without body-level horizontal overflow.

- [ ] **Step 5: Run final verification**

Run: `npm test` and `npm run build`.

Expected: all tests PASS and the production build succeeds. Confirm no files under `examples` were accessed or modified.
