# cn-housing-prices

## Scope

- Runtime data comes from `data/house_price_index_all.csv`.
- LPR background data comes from `data/LPR.csv` and is loaded independently from the 70-city housing data.
- Use `metric=环比` and `base=上月=100`; normalize each series to 100 at its first valid month and compound subsequent monthly indices.
- Default view is 二手住宅 for 北京、上海、广州、深圳、长沙.
- 二手住宅 uses `size_band=全部`; 新建商品住宅 uses `90m2及以下`、`90-144m2`、`144m2以上`.
- Both housing views support inclusive start/end month filters; filter raw rows first, then normalize the selected range's first valid month to 100. The default range is the full CSV period and has no reset button.
- The city picker supports substring search and keeps selected city chips visible while filtering options.
- The product scope is desktop-first. Keep existing mobile styles unchanged, but do not add new mobile-specific layout or interaction requirements, adaptations, or acceptance checks.

## Architecture

- The UI uses React + TypeScript + Vite.
- Pure CSV parsing, filtering, and trend calculations live in `src/data.ts`.
- The summary table also derives raw monthly/year-over-year indices and base-period cumulative growth in `src/data.ts`; `src/components/SummaryTable.tsx` only renders the semantic table.
- Extensible filter state lives in `src/filterState.ts`.
- `DateRangeFilter` is a custom popover with quick ranges and two month sliders; it derives its available period bounds from the active housing type and selected cities, so new-build size-band data starts at 2018-03 in the UI.
- The trend chart uses native SVG; do not add a chart library for this MVP.
- Trend, market-breadth, and latest-month charts use `getResponsiveChartWidth` plus `ResizeObserver`: sparse data fills the card's available width, while dense data preserves a minimum per-point slot and uses the existing horizontal scroll container.
- The summary table is rendered below the trend chart and follows the active housing type, selected cities, and date range.
- `CityComparisonMatrix` owns its housing type, compares all available cities using latest month-over-month, year-over-year, 1-year, 3-year, and 5-year compounded changes, and owns its table sorting and new-build size-band control; it is independent of the trend chart's housing type, city, and date filters.
- `MarketBreadthModule` owns its housing type, counts monthly rising/unchanged/falling cities across all available cities using raw latest-month `环比` rows, and owns its new-build size-band control; it is independent of the trend chart's housing type, city, and date filters.
- The independent `MonthOverMonthModule` uses raw latest-month `环比` rows for all available cities, owns its housing/size controls, and is not affected by the trend chart's city/date filters.
- The trend chart's housing type state controls only the trend chart, its summary table, and their date-range/status context.
- The page-level `DashboardIntro` renders the title, data source description, and always-visible index-vs-price methodology note above the dashboards; it has no modal or popover behavior.
- `getHousingDataCoverage` derives the `DataStatusCard` data range and missing-month notes from qualifying CSV rows; the status card receives loaded rows from `App`.
- The page groups the title, subtitle, housing methodology, data status, and all 70-city modules inside `housing-dashboard-module`; `LprModule` is a separate data-domain module and does not receive housing filters.
- LPR parsing lives in `src/data.ts` as `parseLprCsv`; `LprModule` uses native SVG, displays 1-year and 5-year rates, and visually prioritizes the 5-year rate.

## Development

- Install dependencies with `npm install`.
- Run the dashboard locally with `npm run dev`.
- Run tests with `npm test`.
- Build for production with `npm run build`.
- Git workflow and rollback instructions live in `VERSIONING.md`.
- Keep `main` stable; use `feature/*` or `fix/*` branches for changes and create `vX.Y.Z` tags for important deliverables.
