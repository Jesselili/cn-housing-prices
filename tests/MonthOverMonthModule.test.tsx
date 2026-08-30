import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MonthOverMonthModule, formatMonthOverMonthTitle } from '../src/components/MonthOverMonthModule';
import { NEW_BUILD_HOUSING, type CsvRow } from '../src/data';

const rows: CsvRow[] = [
  { period: '2026-06', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.8' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.7' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100.4' },
] as CsvRow[];

describe('MonthOverMonthModule', () => {
  it('wraps the new-build size band in parentheses in the title', () => {
    expect(formatMonthOverMonthTitle(NEW_BUILD_HOUSING, '90-144m2', '2026-07'))
      .toBe('70 城价格指数环比-新建住宅（90–144m²）-202607');
  });

  it('renders the latest title, overview labels, signed values, and native SVG chart', () => {
    const markup = renderToStaticMarkup(<MonthOverMonthModule rows={rows} loadState="ready" />);

    expect(markup).toContain('70 城价格指数环比-二手住宅-202607');
    expect(markup).toContain('覆盖城市');
    expect(markup).toContain('上涨');
    expect(markup).toContain('持平');
    expect(markup).toContain('下降');
    expect(markup).toContain('均值');
    expect(markup).toContain('区间');
    expect(markup).toContain('上海');
    expect(markup).toContain('+0.4');
    expect(markup).toContain('<svg');
  });

  it('exposes the new-build control and size-band options', () => {
    const markup = renderToStaticMarkup(<MonthOverMonthModule rows={rows} loadState="ready" />);

    expect(markup).toContain('新建住宅');
    expect(markup).toContain('90m²及以下');
    expect(markup).toContain('90–144m²');
    expect(markup).toContain('144m²以上');
  });
});
