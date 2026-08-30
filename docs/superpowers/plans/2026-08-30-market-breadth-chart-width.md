# 市场广度图表自适应宽度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让市场广度趋势图在数据较少时填满卡片可用宽度，在数据较多时保持最小可读槽位并支持横向滚动。

**Architecture:** `MarketBreadthModule` 通过 `ResizeObserver` 读取现有图表滚动容器的宽度，将可用内容宽度传给纯函数，与基于数据点数量的最小图表宽度取最大值。SVG 数据计算、交互提示、颜色和坐标逻辑保持不变；CSS 只负责滚动容器和图表内容的尺寸边界。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, 原生 SVG/CSS。

## Global Constraints

- Runtime data comes from `data/house_price_index_all.csv`.
- The product scope is desktop-first. Keep existing mobile styles unchanged, but do not add new mobile-specific layout or interaction requirements, adaptations, or acceptance checks.
- The trend chart uses native SVG; do not add a chart library for this MVP.
- `examples` contains reference projects downloaded from GitHub and must not be read, copied, or modified unless the user explicitly mentions it.

---

### Task 1: 固化图表宽度规则

**Files:**
- Modify: `src/components/MarketBreadthModule.tsx`
- Test: `tests/MarketBreadthModule.test.tsx`

**Interfaces:**
- Produces: `getMarketBreadthChartWidth(pointCount: number, availableWidth: number): number`，返回数据最小宽度、容器可用宽度和固定下限三者的最大值。

- [ ] **Step 1: Write the failing test**

在 `tests/MarketBreadthModule.test.tsx` 增加以下测试：

```tsx
it('fills available width for sparse data and keeps a readable minimum for dense data', () => {
  expect(getMarketBreadthChartWidth(6, 1600)).toBe(1600);
  expect(getMarketBreadthChartWidth(70, 900)).toBe(1120);
  expect(getMarketBreadthChartWidth(1, 0)).toBe(1120);
});
```

其中 `1120` 保留现有图表的可读性下限；数据宽度公式 `74 + 70 * 9` 仍用于数据量更大时增加内容宽度；随后实现导出函数。

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/MarketBreadthModule.test.tsx`

Expected: FAIL because `getMarketBreadthChartWidth` 尚未导出。

- [ ] **Step 3: Write the minimal implementation**

在 `MarketBreadthModule.tsx` 中提取原有数据宽度公式，并实现：

```ts
export function getMarketBreadthChartWidth(pointCount: number, availableWidth: number): number {
  const dataWidth = 74 + pointCount * 9;
  return Math.max(1120, dataWidth, availableWidth);
}
```

将图表计算中的 `Math.max(1120, 74 + snapshot.points.length * 9)` 替换为该函数调用。

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/MarketBreadthModule.test.tsx`

Expected: PASS，包含原有渲染测试和新增的 3 个宽度断言。

- [ ] **Step 5: Commit**

```bash
git add src/components/MarketBreadthModule.tsx tests/MarketBreadthModule.test.tsx
git commit -m "test: define adaptive market breadth chart width"
```

### Task 2: 连接容器宽度并保持横向滚动

**Files:**
- Modify: `src/components/MarketBreadthModule.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `getMarketBreadthChartWidth` from Task 1.
- Produces: 图表滚动容器宽度变化时重新计算 SVG 宽度；容器宽度不足时继续横向滚动。

- [ ] **Step 1: Add the container measurement**

在组件中加入 `useEffect` 和 `useRef`，为 `.market-breadth-chart-scroll` 创建 ref，并在 effect 中：

1. 立即读取 `clientWidth`。
2. 使用 `ResizeObserver` 监听容器变化。
3. 当运行环境没有 `ResizeObserver` 时退回到 `window.resize` 监听。
4. 清理 observer 或事件监听器。

用 `Math.max(0, clientWidth - 44)` 将滚动容器的左右 `22px` padding 排除，得到 SVG 内容可用宽度。

- [ ] **Step 2: Use measured width in chart dimensions**

将 `chart` 的 `useMemo` 依赖增加为 `[snapshot.points, availableChartWidth]`，通过 `getMarketBreadthChartWidth(snapshot.points.length, availableChartWidth)` 计算宽度；测量值为 0 时仍使用 1120px 下限，避免初始渲染生成无尺寸图表。

- [ ] **Step 3: Keep CSS width behavior explicit**

为 `.market-breadth-chart-scroll` 增加 `min-width: 0`，为 `.market-breadth-chart` 保持相对定位并允许其按 inline width 超出滚动容器；不增加移动端媒体查询，也不改动其他模块规则。

- [ ] **Step 4: Run the full checks**

Run: `npm test`

Expected: 所有测试通过。

Run: `npm run build`

Expected: TypeScript 检查和 Vite 构建均成功。

- [ ] **Step 5: Commit**

```bash
git add src/components/MarketBreadthModule.tsx src/styles.css
git commit -m "fix: fill market breadth chart width"
```

### Task 3: 交付前核验并推送

**Files:**
- Review: `docs/superpowers/specs/2026-08-30-market-breadth-chart-width-design.md`
- Review: `src/components/MarketBreadthModule.tsx`
- Review: `src/styles.css`

- [ ] **Step 1: Verify the visual states**

在桌面浏览器中检查：

- 新建住宅、数据点较少的户型：图表内容铺满卡片，右侧不再出现与卡片等高的大块空白。
- 二手住宅、数据点较多的情况：柱宽和时间标签仍可读，内容超出卡片时可横向滚动。

- [ ] **Step 2: Verify the repository state**

Run: `git diff --check`

Expected: 无格式错误。

Run: `git status --short --branch`

Expected: 仅包含本次明确提交后的同步状态，不包含 `examples/`、`dist/` 或 `node_modules/`。

- [ ] **Step 3: Push and verify remote refs**

```bash
git push origin main
git ls-remote --heads origin main
```

Expected: 远程 `main` 指向本次最新提交；若本次属于重要可交付版本，再创建并推送对应 `vX.Y.Z` 标签。
