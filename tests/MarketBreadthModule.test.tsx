import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMarketBreadthChartWidth, MarketBreadthModule } from '../src/components/MarketBreadthModule';
import type { CsvRow } from '../src/data';

const rows: CsvRow[] = [
  { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100.2' },
  { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '环比', base: '上月=100', value: '99.8' },
  { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.7' },
  { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '环比', base: '上月=100', value: '100.1' },
];

describe('MarketBreadthModule', () => {
  it('fills available width for sparse data and keeps a readable minimum for dense data', () => {
    expect(getMarketBreadthChartWidth(6, 1600)).toBe(1600);
    expect(getMarketBreadthChartWidth(70, 900)).toBe(900);
    expect(getMarketBreadthChartWidth(1, 0)).toBe(83);
  });

  it('renders the three market-breadth categories and latest month', () => {
    const markup = renderToStaticMarkup(
      <MarketBreadthModule loadState="ready" rows={rows} />,
    );

    expect(markup).toContain('市场广度趋势');
    expect(markup).toContain('二手住宅');
    expect(markup).toContain('新建住宅');
    expect(markup).toContain('aria-label="住宅类型"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('上涨城市');
    expect(markup).toContain('持平城市');
    expect(markup).toContain('下降城市');
    expect(markup).toContain('最新数据：2026-02');
    expect(markup).toContain('2026-01');
    expect(markup).toContain('2026-02');
  });
});
