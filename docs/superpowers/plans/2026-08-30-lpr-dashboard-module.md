# LPR Dashboard Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 70 城住宅价格 Dashboard 中增加独立的 LPR 双折线趋势模块，并将现有标题、口径、状态和 70 城模块统一包进一个数据域大模块。

**Architecture:** 在 `src/data.ts` 增加独立的 `LprPoint` 和 `parseLprCsv`，将 LPR CSV 转换为按发布日期升序排列的有效数值点。`App` 维护与房价完全分离的 LPR 加载状态，并把现有 70 城内容包在 `housing-dashboard-module` 中；`LprModule` 只接收 LPR 状态和点位，使用原生 SVG 展示 1 年期与重点突出的 5 年期曲线及固定口径说明。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、原生 SVG、原生 CSS。

## Global Constraints

- 运行时房价数据继续来自 `data/house_price_index_all.csv`，LPR 数据来自 `data/LPR.csv`。
- LPR 独立于房价城市、住宅类型和日期范围筛选，不能与房价指数合并计算。
- 使用原生 SVG，不新增图表库、外部 API、预测或房贷计算功能。
- 解析层和计算层放在 `src/data.ts`，组件主要负责展示和交互。
- 保持现有房价筛选、数据口径、图表交互和移动端样式行为不变。
- `examples/` 不读取、不复制、不修改。
- 保留当前工作区所有已有修改，不覆盖、删除或擅自接入 `data/LPR.csv` 之外的文件。
- 每个新增行为先写失败测试并确认失败，再写最小生产代码。

---

### Task 1: 新增 LPR 数据模型与解析

**Files:**
- Modify: `src/data.ts`
- Modify: `tests/data.test.ts`

**Interfaces:**
- Consumes: LPR CSV 文本，字段名为 `发布日期`、`1年期LPR利率(%)`、`5年期LPR利率(%)`。
- Produces: `LprPoint` 和 `parseLprCsv(text: string): LprPoint[]`，供 `App` 和 `LprModule` 使用。

- [ ] **Step 1: 写解析失败测试**

在 `tests/data.test.ts` 增加以下测试，覆盖 BOM、乱序、非法值、重复日期和当前文件范围：

```ts
import { parseLprCsv } from '../src/data';

describe('parseLprCsv', () => {
  it('parses, validates, deduplicates, and sorts LPR records', () => {
    const csv = `\ufeff发布日期,1年期LPR利率(%),5年期LPR利率(%)\n2020-01-20,4.15,4.8\n2019-08-20,4.25,4.85\n2020-01-20,4.1,4.75\n2020-02-20,,4.75\n2020-03-20,not-a-number,4.75`;

    expect(parseLprCsv(csv)).toEqual([
      { publishDate: '2019-08-20', oneYearRate: 4.25, fiveYearRate: 4.85 },
      { publishDate: '2020-01-20', oneYearRate: 4.15, fiveYearRate: 4.8 },
    ]);
  });

  it('parses the current LPR file range without changing its source file', () => {
    const csv = readFileSync(new URL('../data/LPR.csv', import.meta.url), 'utf8');
    const points = parseLprCsv(csv);

    expect(points).toHaveLength(85);
    expect(points[0].publishDate).toBe('2019-08-20');
    expect(points.at(-1)?.publishDate).toBe('2026-08-20');
  });
});
```

保留当前测试文件已有 import 和测试结构；如已有 `readFileSync` 引入则复用，不重复声明。

- [ ] **Step 2: 运行失败测试**

运行：`npm test -- tests/data.test.ts`

预期：失败原因是 `parseLprCsv` 尚未导出，而不是测试语法错误。

- [ ] **Step 3: 实现最小解析器**

在 `src/data.ts` 增加：

```ts
export interface LprPoint {
  publishDate: string;
  oneYearRate: number;
  fiveYearRate: number;
}

export function parseLprCsv(text: string): LprPoint[] {
  const rows = parseCsv(text);
  const points = rows.flatMap((row) => {
    const publishDate = row['发布日期']?.trim() ?? '';
    const oneYearRate = Number(row['1年期LPR利率(%)']?.trim());
    const fiveYearRate = Number(row['5年期LPR利率(%)']?.trim());
    if (!publishDate || !Number.isFinite(oneYearRate) || !Number.isFinite(fiveYearRate)) return [];
    return [{ publishDate, oneYearRate, fiveYearRate }];
  });

  const byDate = new Map<string, LprPoint>();
  points.forEach((point) => {
    if (!byDate.has(point.publishDate)) byDate.set(point.publishDate, point);
  });
  return [...byDate.values()].sort((left, right) => left.publishDate.localeCompare(right.publishDate));
}
```

如果当前 TypeScript 对 `row['字段']` 推断不兼容，使用现有 `CsvRow` 的字符串索引能力修正类型，不改变 `parseCsv` 的行为。

- [ ] **Step 4: 运行解析测试确认通过**

运行：`npm test -- tests/data.test.ts`

预期：新增 LPR 测试和该文件原有测试全部通过。

- [ ] **Step 5: 提交数据层变更**

```bash
git add src/data.ts tests/data.test.ts
git commit -m "feat: parse LPR history data"
```

提交前确认暂存区只包含本任务的两个文件。

### Task 2: 新增 LPR 模块与 SVG 图表

**Files:**
- Create: `src/components/LprModule.tsx`
- Create: `tests/LprModule.test.tsx`

**Interfaces:**
- Consumes: `LprPoint[]`、独立加载状态和错误信息。
- Produces: `<LprModule loadState points error />`，渲染 LPR 标题、动态范围、双折线 SVG、图例、悬停详情和固定口径说明。

- [ ] **Step 1: 写组件失败测试**

创建 `tests/LprModule.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LprModule } from '../src/components/LprModule';

const points = [
  { publishDate: '2019-08-20', oneYearRate: 4.25, fiveYearRate: 4.85 },
  { publishDate: '2020-01-20', oneYearRate: 4.15, fiveYearRate: 4.8 },
];

describe('LprModule', () => {
  it('renders both rates and explains why five-year LPR matters', () => {
    const markup = renderToStaticMarkup(<LprModule loadState="ready" points={points} error="" />);

    expect(markup).toContain('LPR 利率趋势');
    expect(markup).toContain('4.25%');
    expect(markup).toContain('4.85%');
    expect(markup).toContain('5 年期 LPR');
    expect(markup).toContain('不是房价');
    expect(markup).toContain('房价预期');
    expect(markup).toContain('lpr-line-five-year');
    expect(markup).toContain('lpr-line-one-year');
  });

  it('keeps LPR states independent and renders an error without chart data', () => {
    const markup = renderToStaticMarkup(<LprModule loadState="error" points={[]} error="HTTP 503" />);

    expect(markup).toContain('LPR 数据加载失败');
    expect(markup).toContain('HTTP 503');
    expect(markup).not.toContain('<svg');
  });
});
```

- [ ] **Step 2: 运行失败测试**

运行：`npm test -- tests/LprModule.test.tsx`

预期：失败原因是组件文件尚不存在，而不是缺少 DOM 环境。

- [ ] **Step 3: 实现最小 LPR 模块**

组件接口固定为：

```ts
type LoadState = 'loading' | 'ready' | 'error';

interface LprModuleProps {
  loadState: LoadState;
  points: LprPoint[];
  error: string;
}
```

实现要求：

- 从 `points` 计算动态首尾日期、最小值和最大值；不在组件中重新解析 CSV。
- SVG 视图包含两条 `<path>`，5 年期使用 `lpr-line-five-year`，1 年期使用 `lpr-line-one-year`。
- 5 年期线更粗、颜色更醒目；图例文本明确“5 年期 LPR（重点关注）”。
- 横轴只显示不超过 8 个等距日期标签；点位仍按完整历史绘制。
- 纵轴使用百分比格式，所有有效点保持在绘图区内。
- 图表容器接入 `ResizeObserver` 和 `getResponsiveChartWidth`，使用每点最小槽宽 `24px`、水平边距 `90px`；超出视口沿用横向滚动。
- 在 SVG 上提供 `title` 和 `desc`；每条线的点位使用 `<title>` 或悬停层提供日期和两期利率。
- 口径说明直接渲染在图表下方，包含已确认的主说明和四点关系解释，保留“可能”“通常”“部分人”等限定词。
- `loading`、`error`、`ready + 空数组` 分别显示清晰状态；错误文本通过 `error` 展示。

- [ ] **Step 4: 运行组件测试确认通过**

运行：`npm test -- tests/LprModule.test.tsx`

预期：组件测试全部通过。

- [ ] **Step 5: 提交 LPR 组件变更**

```bash
git add src/components/LprModule.tsx tests/LprModule.test.tsx
git commit -m "feat: add LPR trend module"
```

### Task 3: 独立加载 LPR 并重组页面数据域

**Files:**
- Modify: `src/App.tsx`
- Create: `tests/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `parseLprCsv` 和 Task 2 的 `LprModule`。
- Produces: 房价和 LPR 两套互不阻断的加载流程；`housing-dashboard-module` 外层包含全部 70 城内容，LPR 模块位于其外部。

- [ ] **Step 1: 写页面分组和独立状态失败测试**

在 `tests/App.test.tsx` 增加 SSR 初始状态测试：

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('App data domains', () => {
  it('groups the 70-city dashboard separately from the LPR module', () => {
    const markup = renderToStaticMarkup(<App />);
    const housingStart = markup.indexOf('housing-dashboard-module');
    const lprStart = markup.indexOf('lpr-module');

    expect(housingStart).toBeGreaterThanOrEqual(0);
    expect(lprStart).toBeGreaterThan(housingStart);
    expect(markup).toContain('中国房产价格指数趋势');
    expect(markup).toContain('LPR 利率趋势');
    expect(markup).toContain('正在加载 LPR 数据');
  });
});
```

测试只验证首屏结构和独立加载占位，不伪造 `fetch` 成功结果；数据层和组件层已经分别覆盖成功数据。

- [ ] **Step 2: 运行失败测试**

运行：`npm test -- tests/App.test.tsx`

预期：失败原因是 `App` 尚未渲染 `housing-dashboard-module` 和 LPR 模块。

- [ ] **Step 3: 实现独立 LPR 加载和页面包裹**

在 `App.tsx`：

- 增加 `lprPoints`、`lprLoadState`、`lprLoadError`、`lprLoadedAt` 状态；房价状态变量保持不变。
- 增加第二个 `useEffect` 请求 `/data/LPR.csv`，用 `parseLprCsv` 处理；HTTP 非成功响应进入 LPR 错误状态，成功但无有效点进入 ready + 空数组。
- 清理函数使用 `active` 标记，避免组件卸载后写入状态。
- 将 `DashboardIntro`、`DataStatusCard`、趋势卡、`CityComparisonMatrix`、`MarketBreadthModule`、`MonthOverMonthModule` 放入：

```tsx
<section className="housing-dashboard-module" aria-labelledby="dashboard-title">
  ...
</section>
```

- 将 `<LprModule loadState={lprLoadState} points={lprPoints} error={lprLoadError} />` 放在 70 城大模块之后、仍位于 `main.page-shell` 内。
- 不把 `filters`、`displayMode`、`availablePeriods` 或 `rows` 传入 `LprModule`。

- [ ] **Step 4: 运行页面测试确认通过**

运行：`npm test -- tests/App.test.tsx tests/LprModule.test.tsx tests/data.test.ts`

预期：页面分组、LPR 模块和数据解析测试全部通过。

- [ ] **Step 5: 提交页面集成变更**

```bash
git add src/App.tsx tests/App.test.tsx
git commit -m "feat: separate LPR and housing data domains"
```

### Task 4: 完成桌面样式、架构文档和全量验证

**Files:**
- Modify: `src/styles.css`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 3 的页面结构和 Task 2 的 LPR class names。
- Produces: 两个视觉边界清晰的大模块，现有 70 城子模块行为保持不变，项目规范与实现一致。

- [ ] **Step 1: 为外层数据域和 LPR 图表写样式**

在 `src/styles.css` 增加与现有视觉系统一致的样式：

```css
.housing-dashboard-module,
.lpr-module {
  border: 1px solid rgba(211, 207, 200, 0.74);
  border-radius: var(--radius);
  background: var(--card);
  box-shadow: 0 20px 50px rgba(101, 91, 74, 0.06);
}

.housing-dashboard-module { padding: 0 20px 20px; }
.housing-dashboard-module > .dashboard-intro { margin: 0 -20px; padding: 28px 28px 20px; }
.housing-dashboard-module > .data-status-card { margin: 18px 0; }
.lpr-module { margin-top: 18px; overflow: visible; }
.lpr-line-one-year { fill: none; stroke: #9aa7b5; stroke-width: 2; }
.lpr-line-five-year { fill: none; stroke: #d87958; stroke-width: 3; }
```

补充图例、坐标轴、tooltip、状态和口径说明样式，沿用现有颜色、圆角、字体和滚动容器。不要修改现有移动端媒体查询；如外层包裹造成桌面间距重复，只移除本次直接造成的重复边距。

- [ ] **Step 2: 更新架构说明**

在 `AGENTS.md` 增加：

- LPR 数据从 `data/LPR.csv` 独立加载，`LprModule` 不受房价筛选影响。
- 页面包含 70 城住宅价格大模块和独立 LPR 模块。
- LPR 解析位于 `src/data.ts`，LPR 图表使用原生 SVG，5 年期为重点展示线。

- [ ] **Step 3: 运行完整测试和构建**

运行：`npm test`

预期：所有测试通过，包含新增 LPR 和页面结构测试。

运行：`npm run build`

预期：TypeScript 检查和 Vite 生产构建均退出码为 0。

- [ ] **Step 4: 检查差异和受保护文件**

运行：`git diff --check`，预期无空白错误。

运行：`git status --short --branch`，确认 `data/LPR.csv` 仍存在且没有被修改，`examples/` 没有出现在改动列表；确认所有本次修改都能对应到本计划任务。

- [ ] **Step 5: 提交样式和文档变更**

```bash
git add src/styles.css AGENTS.md
git commit -m "feat: organize housing and LPR dashboard sections"
```

提交前确认暂存区不包含其他已有未提交文件。
