# 房价趋势 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + TypeScript browser dashboard that plots normalized cumulative housing-price trends from the supplied CSV, with default second-hand housing cities and switchable new-build size bands.

**Architecture:** Keep pure CSV parsing, filtering, and cumulative-series calculation in `src/data.ts`, and keep extensible filter state in `src/filterState.ts`; test both with Vitest. Use React components for semantic controls and a single responsive SVG chart, with no external chart library or backend.

**Tech Stack:** React, TypeScript, Vite, native SVG, Vitest, and CSS. Runtime data source is `data/house_price_index_all.csv`.

## Global Constraints

- Do not read, copy, import, or modify `examples` unless the user explicitly mentions it.
- Default housing type is `二手住宅`.
- Use only rows where `metric=环比` and `base=上月=100`.
- Normalize each series to 100 at its first valid month, then multiply by each following monthly index divided by 100.
- Default cities are 北京、上海、广州、深圳、长沙.
- For 二手住宅 use `size_band=全部`; for 新建商品住宅 use `90m2及以下`、`90-144m2`、`144m2以上`.
- Show the full available CSV period by default; do not add time filtering, prediction, rankings, maps, or APIs.
- Use React + TypeScript + Vite; do not add a chart library or backend.
- A successful verification claim must be based on fresh command or browser evidence.

---

### Task 1: Create the React + TypeScript project shell and typed data layer

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/data.ts`
- Create: `src/filterState.ts`
- Create: `src/styles.css`
- Create: `AGENTS.md`
- Create: `tests/data.test.ts`

**Interfaces:**
- `index.html` loads the Vite entry in `src/main.tsx`.
- `package.json` exposes `npm test` as `vitest run` and includes React, Vite, TypeScript, and Vitest dependencies.
- `src/data.ts` exports typed `parseCsv`, `filterRows`, `buildSeries`, `getVisibleSeries`, and `getPeriods`.
- `src/filterState.ts` exports typed filter state, default state, and a reducer that can be extended for future filters.
- `AGENTS.md` records the confirmed data scope, runtime commands, and the `examples` exclusion.

- [ ] **Step 1: Write the failing TypeScript data and filter-state tests**

Create `tests/data.test.ts` with Vitest tests for: UTF-8 BOM removal, quoted CSV fields, filtering to `环比` + `上月=100`, first-month normalization and monthly compounding, the three new-build size bands, and a reducer that adds/removes cities without changing existing order or creating duplicates. Import the not-yet-existing functions from `src/data` and `src/filterState`.

- [ ] **Step 2: Run the focused test to verify it fails for missing implementation**

Run: `npx vitest run tests/data.test.ts`

Expected: FAIL because the typed source modules and Vitest project configuration do not exist yet. Fix only setup mistakes if the failure is unrelated to the missing behavior.

- [ ] **Step 3: Add Vite, TypeScript, React, and Vitest configuration**

Update `package.json` with scripts `dev`, `build`, `test`, and `preview`; add `react` and `react-dom` as runtime dependencies and `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `typescript`, `vite`, `vitest`, and `jsdom` as development dependencies. Create `tsconfig.json` with strict TypeScript, DOM libs, JSX support, and `noEmit`; create `vite.config.ts` with the React plugin and Vitest test environment set to `node`.

- [ ] **Step 4: Implement typed data functions and filter reducer**

Create types for `HousingType`, `SizeBand`, `CsvRow`, `TrendPoint`, `TrendSeries`, and `FilterState`. Implement `parseCsv`, `filterRows`, `buildSeries`, `getVisibleSeries`, and `getPeriods` in `src/data.ts` with the confirmed data rules. Implement `filterReducer` in `src/filterState.ts` with actions `{ type: 'housingType/set'; housingType }` and `{ type: 'city/toggled'; city; checked }`; preserve selected-city order and allow an empty selection. Invalid numeric values become null points without blocking other series.

- [ ] **Step 5: Run the focused and full tests to verify the data layer**

Run: `npx vitest run tests/data.test.ts` and then `npm test`.

Expected: all data and reducer tests PASS. If dependencies are not installed, run `npm install` once and rerun the same commands.

- [ ] **Step 6: Add the React entry and project instructions**

Create `src/main.tsx` to mount `<App />` into `#root`. Create a minimal `src/App.tsx` that renders a page shell and a loading message, and import `src/styles.css`. Update `index.html` to contain `<div id="root"></div>` and load `/src/main.tsx`. Create `AGENTS.md` with the confirmed data rules, `npm run dev`, `npm test`, and the explicit `examples` reference-only rule.

- [ ] **Step 7: Run the TypeScript build**

Run: `npm run build`.

Expected: Vite produces a successful production build with no TypeScript errors.

### Task 2: Implement filter controls, SVG trend chart, and responsive styling

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/HousingTypeToggle.tsx`
- Create: `src/components/CityPicker.tsx`
- Create: `src/components/TrendChart.tsx`
- Modify: `src/styles.css`
- Create: `tests/components.test.tsx` only if a component behavior regression needs an automated test.

**Interfaces:**
- `App` owns loaded rows and `FilterState`, dispatches `FilterAction`, and derives visible series through `getVisibleSeries`.
- `HousingTypeToggle` accepts `{ value: HousingType; onChange: (value: HousingType) => void }`.
- `CityPicker` accepts `{ cities: string[]; selectedCities: string[]; onToggle: (city: string, checked: boolean) => void }`.
- `TrendChart` accepts `{ series: TrendSeries[]; periods: string[]; housingType: HousingType }` and owns only chart hover state.

- [ ] **Step 1: Build the semantic page layout and housing-type toggle**

In `App.tsx`, render one trend card with title “房价趋势”, a top-right controls area, chart status, scrollable chart region, and data-method footer. Add `HousingTypeToggle` with accessible buttons and `aria-pressed`; dispatch `housingType/set` on change. Render loading, error, and empty states without assuming data exists.

- [ ] **Step 2: Build the city picker with add/remove interactions**

Implement `CityPicker` as selected removable chips plus a button-controlled checkbox menu. Use accessible labels, `aria-expanded`, `aria-label`, keyboard focus styles, Escape-to-close, and outside-click close. Dispatch `city/toggled` for every checkbox and chip removal. Do not impose a maximum city count.

- [ ] **Step 3: Build the responsive SVG trend chart**

Implement `TrendChart` with a minimum inner width of 960px, horizontal scroll on narrow viewports, y-axis bounds calculated only from numeric points with 5% padding, sparse rotated month labels, light grid lines, one path per series, and no fake values. Use deterministic city colors; for new-build housing use the same city color with line dashes for the three size bands. Add an HTML tooltip and SVG hover guide/dots showing month, city, size band, and cumulative value.

- [ ] **Step 4: Connect CSV loading and derived status in App**

Fetch `/data/house_price_index_all.csv` once on mount, parse it, derive the available city list, initialize selected cities to the five defaults present in the file, and derive series/periods from the reducer state. Show “二手住宅 · 5 条趋势线” for the initial state and update the count/range when toggles change. Show a clear error if fetch fails or required fields are missing.

- [ ] **Step 5: Add the reference-aligned visual styling**

In `src/styles.css`, style the warm off-white page, white rounded card, compact header, right-side controls, selected city chips, picker menu, chart legend, tooltip, loading/error/empty states, focus rings, and restrained line palette. At `max-width: 760px`, stack controls, keep the picker full width, preserve touch-sized controls, and keep the chart horizontally viewable. Use a consistent 12px card/control radius scale.

- [ ] **Step 6: Run automated build and tests**

Run: `npm test` and `npm run build`.

Expected: all tests PASS and the production build completes with no TypeScript errors.

### Task 3: Verify all requested interactions and correct defects

**Files:**
- Modify `src/App.tsx`, `src/components/*.tsx`, or `src/styles.css` only when a fresh browser check finds a defect.
- Add a regression test in `tests/` before changing production logic for any behavior defect.

**Interfaces:**
- The delivered behavior remains the data and UI contract from Tasks 1–2.

- [ ] **Step 1: Start the local development server**

Run: `npm run dev -- --host 127.0.0.1`.

Open the reported local URL in a browser and check the page loads without a console error.

- [ ] **Step 2: Verify default resale state**

Confirm the chart shows exactly five resale series for 北京、上海、广州、深圳、长沙, selected-city chips match those cities, and the status shows the full available period.

- [ ] **Step 3: Verify add/remove city behavior**

Open the picker, add 杭州, confirm its chip, line, legend, and tooltip entry appear, then remove 杭州 and confirm all disappear. Remove all cities and confirm the empty state; re-add 北京 and confirm recovery.

- [ ] **Step 4: Verify new-build size-band behavior**

Switch to 新建住宅 and confirm five cities produce 15 series: each city has exactly `90m2及以下`, `90-144m2`, and `144m2以上`. Confirm color identifies city, line style identifies size band, and tooltip labels include both.

- [ ] **Step 5: Verify narrow layout and keyboard access**

Check a narrow viewport. Confirm controls wrap without clipping, chart remains horizontally viewable, picker checkboxes and tag buttons are keyboard reachable, and focus indication is visible.

- [ ] **Step 6: Run final verification and inspect scope**

Run: `npm test`, `npm run build`, and `rg --files -g '!examples/**'`. Confirm no file under `examples` was read or modified and do not claim a Git commit because this directory is not a repository.
