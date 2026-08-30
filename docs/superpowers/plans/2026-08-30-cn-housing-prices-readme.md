# cn-housing-prices README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an accurate Chinese README for the current dashboard and publish the README, the approved design document, and all existing workspace changes to `origin/main`.

**Architecture:** Treat the current implementation and local CSV files as the source of truth. The README will describe the two independent data domains—70-city housing indices and LPR—then document the data flow, module boundaries, calculations, limitations, and local workflow. Git synchronization will fetch first, preserve the current worktree, commit the complete deliverable, fast-forward `main` to that commit, and verify the remote branch.

**Tech Stack:** Markdown, React 19, TypeScript, Vite, Vitest, native SVG, static CSV files, Git.

## Global Constraints

- Runtime data comes from `data/house_price_index_all.csv`; LPR data comes independently from `data/LPR.csv`.
- Use `metric=环比` and `base=上月=100`; normalize each selected series to 100 at its first valid month and compound subsequent monthly indices.
- 二手住宅 uses `size_band=全部`; 新建商品住宅 uses `90m2及以下`、`90-144m2`、`144m2以上`.
- Latest-month, market-breadth, and independent comparison modules must be described as independent from the trend chart's city/date filters.
- The product is desktop-first; do not add mobile-specific requirements or acceptance checks.
- Preserve all existing user changes; do not use destructive reset or checkout operations.
- README claims must be supported by current source files, current CSV files, or `AGENTS.md`.
- `main` must receive the complete deliverable, and success must be confirmed against `origin/main`.

---

### Task 1: Refresh the repository baseline without losing local work

**Files:**
- Read: `.git/`, `AGENTS.md`, current working tree
- Modify: none unless a merge from `origin/main` requires conflict resolution

**Interfaces:**
- Consumes: current branch `codex/dashboard-copy-layout`, current local modifications, and `origin/main`.
- Produces: a fetched remote reference and a clean understanding of whether `origin/main` is ahead; no local change is discarded.

- [ ] **Step 1: Record the current state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
git remote -v
```

Expected: the known local source/test changes remain visible, and `origin` points to `https://github.com/Jesselili/cn-housing-prices.git`.

- [ ] **Step 2: Fetch the latest remote refs**

Run:

```bash
git fetch origin
```

Expected: `origin/main` reflects GitHub's latest `main`; no working-tree file is changed by the fetch.

- [ ] **Step 3: Compare local history with the refreshed remote**

Run:

```bash
git rev-list --left-right --count origin/main...HEAD
git diff --stat origin/main...HEAD
```

Expected: any remote-ahead count is identified before integration. Do not reset, force-push, or overwrite local changes.

### Task 2: Verify the facts used by README

**Files:**
- Read: `src/App.tsx`, `src/data.ts`, `src/filterState.ts`, `src/components/*.tsx`, `data/house_price_index_all.csv`, `data/LPR.csv`, `VERSIONING.md`, `AGENTS.md`
- Modify: none

**Interfaces:**
- Consumes: the current implementation and CSV files.
- Produces: verified README facts: files, periods, city coverage, module names, commands, and calculation boundaries.

- [ ] **Step 1: Verify the actual data files and headers**

Run:

```bash
ls -lh data/house_price_index_all.csv data/LPR.csv
python3 - <<'PY'
import csv
from pathlib import Path

for name in ('data/house_price_index_all.csv', 'data/LPR.csv'):
    path = Path(name)
    with path.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    print(name)
    print('columns:', reader.fieldnames)
    print('rows:', len(rows))
    if name.endswith('house_price_index_all.csv'):
        periods = sorted({row['period'] for row in rows if row.get('period')})
        cities = sorted({row['city'] for row in rows if row.get('city')})
        print('periods:', periods[0], periods[-1])
        print('cities:', len(cities))
        print('house_types:', sorted({row['house_type'] for row in rows}))
    else:
        dates = sorted({row['发布日期'] for row in rows if row.get('发布日期')})
        print('dates:', dates[0], dates[-1])
PY
```

Expected: both files exist; README uses only the printed local facts and does not claim an unverified generated file.

- [ ] **Step 2: Trace the data-flow and module boundaries**

Read the imports and exported functions in `src/App.tsx` and `src/data.ts`, then inspect the headers and calculation functions in `src/components/CityComparisonMatrix.tsx`, `src/components/MarketBreadthModule.tsx`, `src/components/MonthOverMonthModule.tsx`, `src/components/SummaryTable.tsx`, `src/components/TrendChart.tsx`, and `src/components/LprModule.tsx`.

Expected: the README distinguishes trend-filter state from independent module state and describes LPR as a separate data domain.

- [ ] **Step 3: Verify the developer commands and release workflow**

Read `package.json` and `VERSIONING.md`.

Expected: README lists only the existing `npm install`, `npm run dev`, `npm test`, `npm run build`, and `npm run preview` commands, and links to `VERSIONING.md` instead of duplicating its rollback procedure.

### Task 3: Write the complete project README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: verified facts from Tasks 1–2 and the README design at `docs/superpowers/specs/2026-08-30-cn-housing-prices-readme-design.md`.
- Produces: a self-contained Chinese project README for GitHub readers.

- [ ] **Step 1: Add the project overview and feature map**

Write a concise opening that identifies the project as a desktop-first Chinese housing trend dashboard. Include a feature list covering the trend chart, city/date controls, index/change display, summary table, city comparison, market breadth, latest-month snapshot, data status, and LPR trend.

Expected: the introduction describes what the dashboard helps users observe without implying absolute transaction prices.

- [ ] **Step 2: Add the technical solution and data flow**

Document React + TypeScript + Vite, native SVG charts, browser-side static CSV loading, `src/data.ts` as the pure parsing/filtering/calculation layer, `App` as the trend-domain state owner, independent module controls, and `ResizeObserver` chart sizing.

Expected: a reader can understand which layer owns data logic and which modules share or isolate filters.

- [ ] **Step 3: Add the data sources and exact data口径**

Document both data files, the housing filters (`metric=环比`, `base=上月=100`), the housing types and size bands, first-valid-month normalization, monthly-index compounding, raw latest-month statistics, summary/comparison windows, market-breadth categories, missing-period behavior, and the distinction between an index and an absolute price.

Expected: the README explicitly explains that `100` means unchanged relative to the relevant comparison/base context, that `96.7` can mean a 3.3% decrease in the applicable index comparison, and that cumulative trend values must not be read as that month's raw环比.

- [ ] **Step 4: Add scope, limitations, local development, and release links**

Document that coverage follows the current CSV, missing data is surfaced in the UI, LPR is a financing-cost reference rather than a direct housing-price determinant, and provide the existing npm commands. Link to `VERSIONING.md` for branch, tag, and rollback conventions.

Expected: no unsupported freshness claim, absolute-price claim, or causal claim appears in the README.

- [ ] **Step 5: Review the README for consistency and Markdown hygiene**

Run:

```bash
rg -n -- '价格指数|成交单价|环比|累计|LPR|VERSIONING' README.md
git diff --check -- README.md
```

Expected: required concepts are present, no placeholders are present, and `git diff --check` returns no whitespace errors.

### Task 4: Verify the complete current implementation

**Files:**
- Read: all files changed in the worktree
- Modify: none

**Interfaces:**
- Consumes: README plus the existing source, tests, design document, and plan.
- Produces: passing automated tests, a successful production build, and a reviewed diff.

- [ ] **Step 1: Run the test suite**

Run:

```bash
npm test
```

Expected: Vitest exits successfully with all tests passing.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript validation and Vite production build both complete successfully.

- [ ] **Step 3: Review the complete diff**

Run:

```bash
git diff --stat
git diff --check
git status --short
```

Expected: only the approved design/documentation work and the already-present source/test changes are included; no generated dependency or unrelated file is added.

### Task 5: Commit the deliverable and publish it on `main`

**Files:**
- Modify: Git history and remote `origin/main`
- Include: `README.md`, `docs/superpowers/specs/2026-08-30-cn-housing-prices-readme-design.md`, `docs/superpowers/plans/2026-08-30-cn-housing-prices-readme.md`, and all existing intended source/test/`AGENTS.md` changes

**Interfaces:**
- Consumes: passing verification from Task 4 and the refreshed `origin/main` from Task 1.
- Produces: a pushed `origin/main` containing the complete deliverable, with no uncommitted work left behind.

- [ ] **Step 1: Stage the complete intended change set**

Run:

```bash
git add AGENTS.md README.md docs/superpowers/specs/2026-08-30-cn-housing-prices-readme-design.md docs/superpowers/plans/2026-08-30-cn-housing-prices-readme.md src tests
git status --short
```

Expected: the status lists the README, documentation, intended source, and intended test changes; review this list before committing.

- [ ] **Step 2: Commit the complete deliverable**

Run:

```bash
git commit -m "docs: add project README and publish dashboard updates"
```

Expected: one commit is created on `codex/dashboard-copy-layout`; the working tree is clean.

- [ ] **Step 3: Integrate the latest remote main**

Run:

```bash
git fetch origin
git merge origin/main
```

Expected: if `origin/main` has not advanced, the merge is already up to date; if it has advanced, Git creates a normal merge commit or reports conflicts for manual resolution. Never force-reset local work.

- [ ] **Step 4: Move the complete history to local main**

Run:

```bash
git switch main
git merge --ff-only codex/dashboard-copy-layout
```

Expected: local `main` points to the complete verified history without rewriting commits.

- [ ] **Step 5: Push and verify GitHub state**

Run:

```bash
git push origin main
git ls-remote --heads origin main
git status --short --branch
```

Expected: push succeeds, the remote `main` hash matches local `main`, and the working tree is clean.
