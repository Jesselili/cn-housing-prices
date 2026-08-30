# cn-housing-prices

## Scope

- Runtime data comes from `data/house_price_index_all.csv`.
- Use `metric=环比` and `base=上月=100`; normalize each series to 100 at its first valid month and compound subsequent monthly indices.
- Default view is 二手住宅 for 北京、上海、广州、深圳、长沙.
- 二手住宅 uses `size_band=全部`; 新建商品住宅 uses `90m2及以下`、`90-144m2`、`144m2以上`.
- Both housing views support inclusive start/end month filters; filter raw rows first, then normalize the selected range's first valid month to 100. The default range is the full CSV period and has no reset button.
- The city picker supports substring search and keeps selected city chips visible while filtering options.
- The product scope is desktop-first. Keep existing mobile styles unchanged, but do not add new mobile-specific layout or interaction requirements, adaptations, or acceptance checks.
- `examples` contains reference projects downloaded from GitHub and must not be read, copied, or modified unless the user explicitly mentions it.

## Architecture

- The UI uses React + TypeScript + Vite.
- Pure CSV parsing, filtering, and trend calculations live in `src/data.ts`.
- The summary table also derives raw monthly/year-over-year indices and base-period cumulative growth in `src/data.ts`; `src/components/SummaryTable.tsx` only renders the semantic table.
- Extensible filter state lives in `src/filterState.ts`.
- `DateRangeFilter` is a custom popover with quick ranges and two month sliders; it derives its available period bounds from the active housing type and selected cities, so new-build size-band data starts at 2018-03 in the UI.
- The trend chart uses native SVG; do not add a chart library for this MVP.
- The summary table is rendered below the trend chart and follows the active housing type, selected cities, and date range.
- The independent `MonthOverMonthModule` uses raw latest-month `环比` rows for all available cities, owns its housing/size controls, and is not affected by the trend chart's city/date filters.
- The page-level `DashboardIntro` renders the title, data source description, and always-visible index-vs-price methodology note above the dashboards; it has no modal or popover behavior.
- `getHousingDataCoverage` derives the `DashboardIntro` data range and missing-month notes from qualifying CSV rows; the intro receives loaded rows from `App`.

## Development

- Install dependencies with `npm install`.
- Run the dashboard locally with `npm run dev`.
- Run tests with `npm test`.
- Build for production with `npm run build`.
- Git workflow and rollback instructions live in `VERSIONING.md`.
- Keep `main` stable; use `feature/*` or `fix/*` branches for changes and create `vX.Y.Z` tags for important deliverables.
